import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { buildLinkedInAuthUrl } from "@/utils/linkedin.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getRedirectUri(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/api/public/oauth/linkedin/callback`;
}

/**
 * Mints a LinkedIn OAuth authorize URL for the signed-in user.
 *
 * SECURITY: We accept POST and read the Supabase JWT from the
 * `Authorization: Bearer <token>` header — never from the URL — so the token
 * does not appear in server logs, browser history, or Referer headers.
 *
 * Response: { authorizeUrl: string }
 * The browser then opens `authorizeUrl` in a popup. The httpOnly state cookie
 * we set here is sent automatically when LinkedIn redirects back to our
 * callback route.
 */
export const Route = createFileRoute("/api/public/oauth/linkedin/start")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const accessToken = authHeader.toLowerCase().startsWith("bearer ")
            ? authHeader.slice(7).trim()
            : "";
          if (!accessToken) {
            return Response.json(
              { error: "Missing auth token" },
              { status: 401 },
            );
          }

          // Verify the user via Supabase
          const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
          if (error || !data?.user) {
            return Response.json(
              { error: "Invalid auth token" },
              { status: 401 },
            );
          }
          const userId = data.user.id;

          // Random state — bind to user via httpOnly cookie
          const state = crypto.randomUUID();
          setCookie("li_oauth_state", `${state}.${userId}`, {
            httpOnly: true,
            secure: true,
            sameSite: "lax",
            path: "/",
            maxAge: 600, // 10 minutes
          });

          const authorizeUrl = buildLinkedInAuthUrl({
            redirectUri: getRedirectUri(request),
            state,
          });

          return Response.json({ authorizeUrl });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error";
          console.error("LinkedIn OAuth start error:", message);
          return Response.json(
            { error: `LinkedIn OAuth start failed: ${message}` },
            { status: 500 },
          );
        }
      },
    },
  },
});

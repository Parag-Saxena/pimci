import { createFileRoute } from "@tanstack/react-router";
import { setCookie } from "@tanstack/react-start/server";
import { buildLinkedInAuthUrl } from "@/utils/linkedin.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getRedirectUri(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/api/public/oauth/linkedin/callback`;
}

export const Route = createFileRoute("/api/public/oauth/linkedin/start")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const accessToken = url.searchParams.get("token");
        if (!accessToken) {
          return new Response("Missing auth token", { status: 401 });
        }

        // Verify the user via Supabase
        const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
        if (error || !data?.user) {
          return new Response("Invalid auth token", { status: 401 });
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

        return Response.redirect(authorizeUrl, 302);
      },
    },
  },
});

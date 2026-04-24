import { createFileRoute } from "@tanstack/react-router";
import { getCookie, deleteCookie } from "@tanstack/react-start/server";
import {
  exchangeLinkedInCode,
  fetchLinkedInUserInfo,
} from "@/utils/linkedin.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function getRedirectUri(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/api/public/oauth/linkedin/callback`;
}

function htmlResult(opts: { ok: boolean; message: string }) {
  // Simple page that closes itself if opened in a popup, otherwise redirects to settings.
  const safeMsg = opts.message.replace(/</g, "&lt;");
  const status = opts.ok ? "success" : "error";
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${opts.ok ? "Connected" : "Connection failed"}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;background:#0b1220;color:#e6edf3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:24px}
    .card{max-width:420px;width:100%;background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:28px;text-align:center}
    h1{font-size:18px;margin:0 0 8px;font-weight:600}
    p{color:#94a3b8;font-size:14px;margin:0 0 20px;line-height:1.5}
    a{display:inline-block;background:${opts.ok ? "#3b7e9b" : "#f76e6e"};color:white;text-decoration:none;padding:9px 16px;border-radius:8px;font-size:14px;font-weight:500}
    .icon{font-size:36px;margin-bottom:12px}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${opts.ok ? "✓" : "✕"}</div>
    <h1>${opts.ok ? "LinkedIn connected" : "Connection failed"}</h1>
    <p>${safeMsg}</p>
    <a href="/app/settings">Back to Settings</a>
  </div>
  <script>
    try {
      if (window.opener) {
        window.opener.postMessage({ type: "linkedin-oauth", status: "${status}" }, window.location.origin);
        setTimeout(() => window.close(), 600);
      } else {
        setTimeout(() => { window.location.href = "/app/settings"; }, 1200);
      }
    } catch (e) {}
  </script>
</body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/oauth/linkedin/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        if (errorParam) {
          return htmlResult({
            ok: false,
            message: errorDesc || errorParam,
          });
        }
        if (!code || !state) {
          return htmlResult({ ok: false, message: "Missing code or state." });
        }

        const cookieValue = getCookie("li_oauth_state");
        if (!cookieValue) {
          return htmlResult({
            ok: false,
            message: "Session expired. Please try connecting again.",
          });
        }
        const [cookieState, userId] = cookieValue.split(".");
        if (cookieState !== state || !userId) {
          return htmlResult({
            ok: false,
            message: "Invalid state. Please try again.",
          });
        }
        deleteCookie("li_oauth_state");

        try {
          const tokens = await exchangeLinkedInCode({
            code,
            redirectUri: getRedirectUri(request),
          });
          const userinfo = await fetchLinkedInUserInfo(tokens.access_token);
          const expiresAt = new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString();

          // Upsert connected account (unique on user_id+platform)
          const { error: upsertErr } = await supabaseAdmin
            .from("connected_accounts")
            .upsert(
              {
                user_id: userId,
                platform: "linkedin",
                platform_user_id: userinfo.sub,
                handle: userinfo.email ?? null,
                display_name: userinfo.name ?? null,
                avatar_url: userinfo.picture ?? null,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token ?? null,
                expires_at: expiresAt,
                scope: tokens.scope ?? null,
              },
              { onConflict: "user_id,platform" },
            );
          if (upsertErr) throw new Error(upsertErr.message);

          return htmlResult({
            ok: true,
            message: `Connected as ${userinfo.name ?? userinfo.email ?? "your account"}.`,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error.";
          console.error("LinkedIn OAuth callback error", message);
          return htmlResult({ ok: false, message });
        }
      },
    },
  },
});

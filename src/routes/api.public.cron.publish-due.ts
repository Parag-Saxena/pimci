import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getValidLinkedInToken,
  publishLinkedInText,
} from "@/utils/linkedin.server";
import { stripMarkdown } from "@/lib/preflight";

/**
 * Cron endpoint — finds posts whose scheduled_at <= now() and publishes them
 * if a connected account exists. Otherwise marks them as "ready" so the user
 * can publish manually from the queue.
 *
 * Called by pg_cron every minute.
 */
export const Route = createFileRoute("/api/public/cron/publish-due")({
  server: {
    handlers: {
      POST: async () => {
        const now = new Date().toISOString();

        const { data: due, error } = await supabaseAdmin
          .from("posts")
          .select("id, user_id, platform, content")
          .eq("status", "scheduled")
          .lte("scheduled_at", now)
          .limit(50);

        if (error) {
          console.error("cron publish-due query error", error);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const results: Array<{
          id: string;
          outcome: "published" | "ready" | "failed";
          error?: string;
        }> = [];

        for (const post of due ?? []) {
          try {
            const { data: account } = await supabaseAdmin
              .from("connected_accounts")
              .select("id")
              .eq("user_id", post.user_id)
              .eq("platform", post.platform)
              .maybeSingle();

            if (!account || post.platform !== "linkedin") {
              // No connected account (or platform not yet supported) → ready for manual publish
              await supabaseAdmin
                .from("posts")
                .update({ status: "ready" })
                .eq("id", post.id);
              results.push({ id: post.id, outcome: "ready" });
              continue;
            }

            const { accessToken, platformUserId } = await getValidLinkedInToken(post.user_id);
            const text = stripMarkdown(post.content).trim();
            if (!text) {
              await supabaseAdmin.from("posts").update({ status: "failed" }).eq("id", post.id);
              results.push({ id: post.id, outcome: "failed", error: "Empty content" });
              continue;
            }
            await publishLinkedInText({ accessToken, platformUserId, text });
            await supabaseAdmin
              .from("posts")
              .update({
                status: "published",
                published_at: new Date().toISOString(),
              })
              .eq("id", post.id);
            results.push({ id: post.id, outcome: "published" });
          } catch (e) {
            const message = e instanceof Error ? e.message : "Unknown error";
            console.error("cron publish-due item failed", post.id, message);
            await supabaseAdmin
              .from("posts")
              .update({ status: "failed" })
              .eq("id", post.id);
            results.push({ id: post.id, outcome: "failed", error: message });
          }
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});

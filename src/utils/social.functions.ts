import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getValidLinkedInToken, publishLinkedInText } from "@/utils/linkedin.server";
import { stripMarkdown } from "@/lib/preflight";

type Platform = "linkedin" | "x";

export type ConnectedAccountSummary = {
  platform: Platform;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  connected_at: string;
};

export const listConnectedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("connected_accounts")
      .select("platform, handle, display_name, avatar_url, created_at")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listConnectedAccounts error", error);
      return { accounts: [] as ConnectedAccountSummary[], error: "Failed to load connections." };
    }
    return {
      accounts: (data ?? []).map((a) => ({
        platform: a.platform as Platform,
        handle: a.handle,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
        connected_at: a.created_at,
      })),
      error: null as string | null,
    };
  });

export const disconnectAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { platform: Platform }) => {
    if (input?.platform !== "linkedin" && input?.platform !== "x") {
      throw new Error("Invalid platform");
    }
    return { platform: input.platform };
  })
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("platform", data.platform);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Publishes a post via the connected platform API.
 * - If the user has a connected account for the post's platform, publishes via API.
 * - Otherwise returns { published: false, manualFallback: true } so the UI can fall back to copy & open.
 */
export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string }) => {
    if (!input?.postId || typeof input.postId !== "string") {
      throw new Error("postId required");
    }
    return { postId: input.postId };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load post (RLS-scoped to current user)
    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("id, platform, content, status")
      .eq("id", data.postId)
      .maybeSingle();
    if (postErr) throw new Error(postErr.message);
    if (!post) throw new Error("Post not found");

    // Check connected account
    const { data: account } = await supabase
      .from("connected_accounts")
      .select("platform")
      .eq("platform", post.platform)
      .maybeSingle();

    if (!account) {
      return {
        published: false as const,
        manualFallback: true as const,
        message: `No ${post.platform === "linkedin" ? "LinkedIn" : "X"} account connected. Use Copy & open instead, or connect in Settings.`,
      };
    }

    if (post.platform === "x") {
      return {
        published: false as const,
        manualFallback: true as const,
        message: "X publishing isn't wired up yet. Use Copy & open for now.",
      };
    }

    // LinkedIn — strip markdown for plain-text rendering
    try {
      const { accessToken, platformUserId } = await getValidLinkedInToken(userId);
      const text = stripMarkdown(post.content).trim();
      if (!text) throw new Error("Post is empty");

      const { urn } = await publishLinkedInText({
        accessToken,
        platformUserId,
        text,
      });

      // Use admin client to bypass RLS for the post update with metadata.
      await supabaseAdmin
        .from("posts")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .eq("user_id", userId);

      return { published: true as const, urn };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Publish failed";
      console.error("publishPost LinkedIn error", message);
      await supabaseAdmin
        .from("posts")
        .update({ status: "failed" })
        .eq("id", post.id)
        .eq("user_id", userId);
      throw new Error(message);
    }
  });

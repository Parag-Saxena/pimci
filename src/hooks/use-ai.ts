import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generatePosts, generateTrendIdeas, rewritePost } from "@/utils/ai.functions";

/**
 * Wrap server-function calls so we attach the current user's auth header
 * (required by the requireSupabaseAuth middleware).
 */
function useAuthedServerFn<TFn extends (...a: never[]) => Promise<unknown>>(fn: TFn) {
  const sf = useServerFn(fn);
  return useCallback(
    async (...args: Parameters<TFn>) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be signed in.");
      // useServerFn supports a second options arg with headers
      // @ts-expect-error - server-fn typing for headers option is loose
      return sf(...args, { headers: { Authorization: `Bearer ${token}` } }) as ReturnType<TFn>;
    },
    [sf],
  );
}

export const useGeneratePosts = () => useAuthedServerFn(generatePosts);
export const useGenerateTrendIdeas = () => useAuthedServerFn(generateTrendIdeas);
export const useRewritePost = () => useAuthedServerFn(rewritePost);

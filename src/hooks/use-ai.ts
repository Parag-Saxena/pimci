import { useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generatePosts, generateTrendIdeas, rewritePost } from "@/utils/ai.functions";

/**
 * Wrap server-function calls so we attach the current user's auth header
 * (required by the requireSupabaseAuth middleware).
 */
function useAuthedServerFn<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
): (args: TArgs) => Promise<TResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sf = useServerFn(fn as any);
  return useCallback(
    async (args: TArgs) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You must be signed in.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (await (sf as any)(args, {
        headers: { Authorization: `Bearer ${token}` },
      })) as TResult;
    },
    [sf],
  );
}

export const useGeneratePosts = () => useAuthedServerFn(generatePosts);
export const useGenerateTrendIdeas = () => useAuthedServerFn(generateTrendIdeas);
export const useRewritePost = () => useAuthedServerFn(rewritePost);

import { useServerFn } from "@tanstack/react-start";
import { generatePosts, generateTrendIdeas, rewritePost } from "@/utils/ai.functions";

/**
 * Server-function callers. Auth header is attached globally by the fetch
 * interceptor installed in AuthProvider — see installServerFnAuth().
 */
export const useGeneratePosts = () => useServerFn(generatePosts);
export const useGenerateTrendIdeas = () => useServerFn(generateTrendIdeas);
export const useRewritePost = () => useServerFn(rewritePost);

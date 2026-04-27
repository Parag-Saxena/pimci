import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DEFAULT_WRITING_STYLE,
  normalizeWritingStyle,
  renderStylePrompt,
  type WritingStyle,
} from "@/lib/writing-style";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

type Platform = "linkedin" | "x";

type GenInput = {
  brief: string;
  tone: string;
  platform: Platform;
  count?: number;
};

async function loadWritingStyle(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<WritingStyle> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("writing_style")
      .eq("id", userId)
      .maybeSingle();
    return normalizeWritingStyle(data?.writing_style ?? {});
  } catch {
    return DEFAULT_WRITING_STYLE;
  }
}

async function callGateway(body: Record<string, unknown>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY missing");
  }
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: DEFAULT_MODEL, ...body }),
  });
  if (res.status === 429) {
    throw new Error("Rate limit reached. Please wait a moment and try again.");
  }
  if (res.status === 402) {
    throw new Error("AI credits required. Add credits in Settings → Workspace → Usage.");
  }
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    throw new Error("AI service error. Please retry.");
  }
  return res.json();
}

const platformGuidance: Record<Platform, string> = {
  linkedin:
    "LinkedIn: long-form (150-1500 chars), professional yet personable, opens with a hook line, uses short paragraphs separated by line breaks, ends with a soft CTA or question, 0-3 hashtags max.",
  x: "X (Twitter): under 280 characters, punchy, scannable, no fluff, optionally 1-2 hashtags, may use emojis sparingly.",
};

export const generatePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: GenInput) => {
    if (!input?.brief || typeof input.brief !== "string") {
      throw new Error("Brief required");
    }
    if (input.platform !== "linkedin" && input.platform !== "x") {
      throw new Error("Invalid platform");
    }
    const rawCount = input.count;
    return {
      brief: input.brief.slice(0, 2000),
      tone: (input.tone || "professional").slice(0, 60),
      platform: input.platform,
      // undefined → fall back to the user's saved style.variant_count
      count:
        typeof rawCount === "number"
          ? Math.min(Math.max(rawCount, 1), 5)
          : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const style = await loadWritingStyle(supabase, userId);
    const count = data.count ?? style.variant_count;
    const stylePrompt = renderStylePrompt(style);
    const sys = `You are a senior social media writer. Write ${count} distinct ${data.platform} post variants in a ${data.tone} tone, based on the user's brief. ${platformGuidance[data.platform]} Each variant must be standalone and complete. Do not number variants or add labels — return only the post text via the function call.\n\n${stylePrompt}`;

    const result = await callGateway({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: data.brief },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_variants",
            description: "Return the post variants",
            parameters: {
              type: "object",
              properties: {
                variants: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 5,
                },
              },
              required: ["variants"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_variants" } },
    });

    const call = result.choices?.[0]?.message?.tool_calls?.[0];
    let variants: string[] = [];
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      variants = Array.isArray(args.variants) ? args.variants : [];
    } catch {
      variants = [];
    }
    if (variants.length === 0) {
      throw new Error("AI returned no usable variants. Try rephrasing your brief.");
    }

    const { data: group } = await supabase
      .from("post_variants")
      .insert({ user_id: userId, brief: data.brief, tone: data.tone, platform: data.platform })
      .select("id")
      .single();

    await supabase.from("ai_generations").insert({
      user_id: userId,
      kind: "brief_to_posts",
      prompt: data.brief,
      output: { variants } as never,
      model: DEFAULT_MODEL,
    });

    return { variants, variantGroupId: group?.id ?? null };
  });

export const generateTrendIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { niche: string; platform: Platform }) => {
    if (!input?.niche) throw new Error("Niche required");
    if (input.platform !== "linkedin" && input.platform !== "x") throw new Error("Invalid platform");
    return { niche: input.niche.slice(0, 200), platform: input.platform };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sys = `You are a content strategist. Suggest 5 fresh, specific ${data.platform} post angles for the given niche. Each angle should include a hook idea and a one-line "why it works". Avoid generic advice. Note: angles are based on general patterns, not real-time trend data.`;

    const result = await callGateway({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Niche: ${data.niche}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_ideas",
            description: "Return 5 post angle ideas",
            parameters: {
              type: "object",
              properties: {
                ideas: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      hook: { type: "string" },
                      angle: { type: "string" },
                      why: { type: "string" },
                    },
                    required: ["hook", "angle", "why"],
                    additionalProperties: false,
                  },
                  minItems: 3,
                  maxItems: 6,
                },
              },
              required: ["ideas"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_ideas" } },
    });

    const call = result.choices?.[0]?.message?.tool_calls?.[0];
    let ideas: { hook: string; angle: string; why: string }[] = [];
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      ideas = Array.isArray(args.ideas) ? args.ideas : [];
    } catch {
      ideas = [];
    }
    if (!ideas.length) throw new Error("AI returned no ideas. Try a more specific niche.");

    await supabase.from("ai_generations").insert({
      user_id: userId,
      kind: "trend_ideation",
      prompt: data.niche,
      output: { ideas } as never,
      model: DEFAULT_MODEL,
    });

    return { ideas };
  });

export const rewritePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      content: string;
      platform: Platform;
      action: "shorten" | "lengthen" | "casual" | "punchy" | "thread" | "hook_body";
    }) => {
      if (!input?.content) throw new Error("Content required");
      if (input.platform !== "linkedin" && input.platform !== "x") throw new Error("Invalid platform");
      const allowed = ["shorten", "lengthen", "casual", "punchy", "thread", "hook_body"] as const;
      if (!allowed.includes(input.action)) throw new Error("Invalid action");
      return {
        content: input.content.slice(0, 5000),
        platform: input.platform,
        action: input.action,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const actionInstr: Record<string, string> = {
      shorten: "Make it ~40% shorter while keeping the strongest idea.",
      lengthen: "Expand it with one concrete example or detail.",
      casual: "Rewrite in a more casual, conversational tone.",
      punchy: "Make it punchier — short sentences, strong verbs.",
      thread: "Convert into a 3–5 tweet X thread, each tweet under 280 chars, separated by '---'.",
      hook_body:
        "Restructure as a strong one-line hook on the first line, blank line, then the body.",
    };

    const sys = `You are a senior ${data.platform} copywriter. ${actionInstr[data.action]} Return only the rewritten post text via the function call.`;

    const result = await callGateway({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: data.content },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_rewrite",
            description: "Return rewritten content",
            parameters: {
              type: "object",
              properties: { content: { type: "string" } },
              required: ["content"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_rewrite" } },
    });

    const call = result.choices?.[0]?.message?.tool_calls?.[0];
    let content = "";
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      content = typeof args.content === "string" ? args.content : "";
    } catch {
      content = "";
    }
    if (!content) throw new Error("AI returned no content. Please retry.");

    await supabase.from("ai_generations").insert({
      user_id: userId,
      kind: `rewrite_${data.action}`,
      prompt: data.content,
      output: { content } as never,
      model: DEFAULT_MODEL,
    });

    return { content };
  });

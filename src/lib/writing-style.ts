/**
 * Writing-style preferences applied automatically to every AI post generation.
 * Stored as a single JSONB column on `profiles.writing_style`.
 */

export type Length = "short" | "medium" | "long" | "blog";
export type ListStyle = "none" | "bullets" | "dashes" | "numbered";
export type EmojiUsage = "none" | "minimal" | "moderate" | "heavy";
export type Voice = "first_person" | "third_person" | "we_team";
export type ReadingLevel = "simple" | "everyday" | "advanced";
export type CtaStyle = "none" | "soft_question" | "explicit_cta";

export type WritingStyle = {
  length: Length;
  paragraphs: number; // 1–8
  list_style: ListStyle;
  emoji: EmojiUsage;
  voice: Voice;
  reading_level: ReadingLevel;
  hashtag_count: number; // 0–5
  cta: CtaStyle;
  variant_count: number; // 1–5
  custom_notes?: string;
};

export const DEFAULT_WRITING_STYLE: WritingStyle = {
  length: "medium",
  paragraphs: 3,
  list_style: "none",
  emoji: "minimal",
  voice: "first_person",
  reading_level: "everyday",
  hashtag_count: 2,
  cta: "soft_question",
  variant_count: 3,
  custom_notes: "",
};

const LENGTH_HINT: Record<Length, string> = {
  short: "Keep it under ~80 words. One tight idea, no filler.",
  medium: "Aim for ~120–200 words. Clear arc: hook, insight, takeaway.",
  long: "Aim for ~250–400 words. Develop the idea with detail and a concrete example.",
  blog: "Write a blog-style post (~500–900 words) with subheads/sections if useful, a strong intro, body, and conclusion.",
};

const LIST_HINT: Record<ListStyle, string> = {
  none: "Use flowing paragraphs — no bullet or dash lists.",
  bullets: "Where it helps clarity, format key points as a short bulleted list (•).",
  dashes: "Where it helps clarity, format key points as a short list using dashes (–).",
  numbered: "Where it helps clarity, format key points as a short numbered list (1., 2., 3.).",
};

const EMOJI_HINT: Record<EmojiUsage, string> = {
  none: "Do not use any emojis.",
  minimal: "Use at most 1 tasteful emoji, only if it adds meaning.",
  moderate: "Use 2–3 emojis sparingly to add warmth and scannability.",
  heavy: "Use emojis liberally (5+) for visual rhythm and personality, without becoming noisy.",
};

const VOICE_HINT: Record<Voice, string> = {
  first_person: "Write in first person singular (I, my).",
  third_person: "Write in third person — no I/we; describe the topic directly.",
  we_team: "Write in first person plural (we, our team).",
};

const READING_LEVEL_HINT: Record<ReadingLevel, string> = {
  simple: "Use very simple language (≈grade 6). Short sentences. Avoid jargon.",
  everyday: "Use clear, everyday language. Plain English over jargon.",
  advanced: "You may use industry-specific terminology and longer sentences where appropriate.",
};

const CTA_HINT: Record<CtaStyle, string> = {
  none: "Do not include a call-to-action.",
  soft_question: "End with a soft, open-ended question that invites discussion.",
  explicit_cta: "End with a clear, explicit call-to-action (comment, share, follow, click, etc.).",
};

/**
 * Coerce arbitrary JSON (possibly empty) from the DB into a complete WritingStyle.
 */
export function normalizeWritingStyle(input: unknown): WritingStyle {
  const v = (input ?? {}) as Partial<WritingStyle>;
  const clamp = (n: unknown, min: number, max: number, fallback: number) => {
    const x = typeof n === "number" ? n : Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.min(max, Math.max(min, Math.round(x)));
  };
  const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
    (allowed as readonly string[]).includes(String(value)) ? (value as T) : fallback;

  return {
    length: oneOf(v.length, ["short", "medium", "long", "blog"] as const, DEFAULT_WRITING_STYLE.length),
    paragraphs: clamp(v.paragraphs, 1, 8, DEFAULT_WRITING_STYLE.paragraphs),
    list_style: oneOf(
      v.list_style,
      ["none", "bullets", "dashes", "numbered"] as const,
      DEFAULT_WRITING_STYLE.list_style,
    ),
    emoji: oneOf(
      v.emoji,
      ["none", "minimal", "moderate", "heavy"] as const,
      DEFAULT_WRITING_STYLE.emoji,
    ),
    voice: oneOf(
      v.voice,
      ["first_person", "third_person", "we_team"] as const,
      DEFAULT_WRITING_STYLE.voice,
    ),
    reading_level: oneOf(
      v.reading_level,
      ["simple", "everyday", "advanced"] as const,
      DEFAULT_WRITING_STYLE.reading_level,
    ),
    hashtag_count: clamp(v.hashtag_count, 0, 5, DEFAULT_WRITING_STYLE.hashtag_count),
    cta: oneOf(
      v.cta,
      ["none", "soft_question", "explicit_cta"] as const,
      DEFAULT_WRITING_STYLE.cta,
    ),
    variant_count: clamp(v.variant_count, 1, 5, DEFAULT_WRITING_STYLE.variant_count),
    custom_notes: typeof v.custom_notes === "string" ? v.custom_notes.slice(0, 500) : "",
  };
}

/**
 * Render the WritingStyle as a compact instruction block for the AI system prompt.
 */
export function renderStylePrompt(style: WritingStyle): string {
  const lines = [
    `- Length: ${LENGTH_HINT[style.length]}`,
    `- Structure: roughly ${style.paragraphs} paragraph${style.paragraphs === 1 ? "" : "s"}.`,
    `- Lists: ${LIST_HINT[style.list_style]}`,
    `- Emoji: ${EMOJI_HINT[style.emoji]}`,
    `- Voice: ${VOICE_HINT[style.voice]}`,
    `- Reading level: ${READING_LEVEL_HINT[style.reading_level]}`,
    `- Hashtags: include exactly ${style.hashtag_count} relevant hashtag${
      style.hashtag_count === 1 ? "" : "s"
    } at the end${style.hashtag_count === 0 ? "." : " (lowercase, no spaces)."}`,
    `- CTA: ${CTA_HINT[style.cta]}`,
  ];
  if (style.custom_notes && style.custom_notes.trim()) {
    lines.push(`- Extra author notes: ${style.custom_notes.trim()}`);
  }
  return `User's writing style — follow these rules strictly:\n${lines.join("\n")}`;
}

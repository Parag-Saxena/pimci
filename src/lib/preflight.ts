import { PLATFORM_LIMITS, PLATFORM_LABEL, type Platform } from "@/lib/platform";

export type PreflightSeverity = "error" | "warning";

export type PreflightFix = {
  label: string;
  /** Returns the new content. */
  apply: (content: string) => string;
};

export type PreflightIssue = {
  id: string;
  severity: PreflightSeverity;
  message: string;
  hint?: string;
  fix?: PreflightFix;
};

export type PreflightResult = {
  ok: boolean; // true when there are zero errors (warnings allowed)
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
};

const URL_RE = /\bhttps?:\/\/[^\s)]+/gi;
const HASHTAG_RE = /(?:^|\s)#([\p{L}\p{N}_]{1,100})/gu;
const MENTION_RE = /(?:^|\s)@([A-Za-z0-9_]{1,30})/g;
// X counts every URL as 23 chars (t.co wrap)
const X_URL_WEIGHT = 23;
const MAX_HASHTAGS_LINKEDIN = 5;
const MAX_HASHTAGS_X = 3;

/* ------------ Fix helpers (exported for tests + reuse) ------------ */

/** Truncate to `max` code points, trying not to cut a word in half, append ellipsis. */
export function truncateToCodePoints(content: string, max: number): string {
  const cps = Array.from(content);
  if (cps.length <= max) return content;
  const room = Math.max(1, max - 1); // leave room for "…"
  let out = cps.slice(0, room).join("");
  // Don't cut a word: backtrack to last whitespace if recent.
  const lastSpace = out.lastIndexOf(" ");
  if (lastSpace > out.length - 20 && lastSpace > 0) {
    out = out.slice(0, lastSpace).replace(/[\s,;:.\-]+$/, "");
  }
  return `${out.replace(/\s+$/, "")}…`;
}

/** Shorten so X effective length (links = 23 chars) fits the limit. */
export function shortenForX(content: string, limit = PLATFORM_LIMITS.x): string {
  const linkPad = "x".repeat(X_URL_WEIGHT);
  let out = content;
  // Iterate: replace links with the 23-char weight, see effective length, trim plain text accordingly.
  for (let i = 0; i < 4; i++) {
    const weighted = out.replace(URL_RE, linkPad);
    const eff = Array.from(weighted).length;
    if (eff <= limit) return out;
    const overflow = eff - limit;
    // Trim that many code points from the end of the actual text.
    const cps = Array.from(out);
    out = cps.slice(0, Math.max(0, cps.length - overflow - 1)).join("") + "…";
  }
  return out;
}

/** Keep only the first `max` hashtags; remove the rest (and their leading whitespace). */
export function limitHashtags(content: string, max: number): string {
  let kept = 0;
  return content.replace(HASHTAG_RE, (match) => {
    kept += 1;
    if (kept <= max) return match;
    return ""; // drop tag and its leading whitespace captured by the regex
  });
}

/** Keep only the first URL; remove subsequent ones. */
export function keepFirstLink(content: string): string {
  let seen = 0;
  return content.replace(URL_RE, (m) => {
    seen += 1;
    return seen === 1 ? m : "";
  }).replace(/[ \t]{2,}/g, " ");
}

/** Strip markdown formatting → plain text suitable for LinkedIn / X. */
export function stripMarkdown(content: string): string {
  let out = content;
  // [text](url) → text (url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  // ![alt](url) → alt
  out = out.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  // Headings: "## Title" → "Title"
  out = out.replace(/^#{1,6}\s+/gm, "");
  // Blockquotes: "> text" → "text"
  out = out.replace(/^>\s?/gm, "");
  // List markers: "- " or "* " or "1. " at line start
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");
  // Bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  // Italic: *text* or _text_  (avoid matching ** that we just unwrapped)
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1$2");
  // Inline code: `text`
  out = out.replace(/`([^`\n]+)`/g, "$1");
  // Code fences ```lang\n...\n```
  out = out.replace(/```[\w-]*\n?([\s\S]*?)```/g, "$1");
  return out;
}

/** Collapse runs of 3+ blank lines into a single blank line. */
export function collapseBlankLines(content: string): string {
  return content.replace(/\n{3,}/g, "\n\n");
}


function effectiveLengthForX(content: string): number {
  // Replace each URL with a 23-char placeholder for counting.
  const replaced = content.replace(URL_RE, "x".repeat(X_URL_WEIGHT));
  // X counts characters by code points, not UTF-16 units.
  return Array.from(replaced).length;
}

function countMatches(content: string, re: RegExp): number {
  let n = 0;
  for (const _ of content.matchAll(re)) n++;
  return n;
}

export function runPreflight(content: string, platform: Platform): PreflightResult {
  const errors: PreflightIssue[] = [];
  const warnings: PreflightIssue[] = [];
  const trimmed = content.trim();

  if (!trimmed) {
    errors.push({
      id: "empty",
      severity: "error",
      message: "Post is empty",
      hint: "Write something before publishing.",
    });
    return { ok: false, errors, warnings };
  }

  const limit = PLATFORM_LIMITS[platform];
  const label = PLATFORM_LABEL[platform];

  if (platform === "x") {
    const len = effectiveLengthForX(content);
    if (len > limit) {
      errors.push({
        id: "x-too-long",
        severity: "error",
        message: `Too long for X — ${len.toLocaleString()} / ${limit} characters`,
        hint: "Each link counts as 23 characters on X. Shorten the body or remove a link.",
        fix: {
          label: `Shorten to ${limit}`,
          apply: (c) => shortenForX(c, limit),
        },
      });
    } else if (len > limit * 0.95) {
      warnings.push({
        id: "x-near-limit",
        severity: "warning",
        message: `Close to the X limit (${len} / ${limit})`,
      });
    }

    const hashtags = countMatches(content, HASHTAG_RE);
    if (hashtags > MAX_HASHTAGS_X) {
      warnings.push({
        id: "x-hashtags",
        severity: "warning",
        message: `${hashtags} hashtags — X posts perform best with ≤ ${MAX_HASHTAGS_X}.`,
        fix: {
          label: `Keep first ${MAX_HASHTAGS_X}`,
          apply: (c) => limitHashtags(c, MAX_HASHTAGS_X),
        },
      });
    }

    const urls = (content.match(URL_RE) ?? []).length;
    if (urls > 1) {
      warnings.push({
        id: "x-multi-link",
        severity: "warning",
        message: "Multiple links — X usually surfaces only the first link preview.",
        fix: { label: "Keep first link", apply: keepFirstLink },
      });
    }

    // Markdown-style formatting that won't render natively on X
    const mdMarkers: { id: string; re: RegExp; label: string }[] = [
      { id: "x-md-bold", re: /\*\*[^*]+\*\*/, label: "**bold**" },
      { id: "x-md-italic", re: /(^|\s)\*[^*\n]+\*/, label: "*italic*" },
      { id: "x-md-heading", re: /^#{1,6}\s/m, label: "# heading" },
      { id: "x-md-link", re: /\[[^\]]+\]\([^)]+\)/, label: "[text](url)" },
      { id: "x-md-quote", re: /^>\s/m, label: "> quote" },
      { id: "x-md-code", re: /`[^`\n]+`/, label: "`code`" },
    ];
    const found = mdMarkers.filter((m) => m.re.test(content)).map((m) => m.label);
    if (found.length) {
      warnings.push({
        id: "x-md",
        severity: "warning",
        message: "Markdown won't render on X",
        hint: `Will post as raw text: ${found.join(", ")}`,
        fix: { label: "Strip markdown", apply: stripMarkdown },
      });
    }

    if (/\n{3,}/.test(content)) {
      warnings.push({
        id: "x-blank-lines",
        severity: "warning",
        message: "Multiple blank lines waste characters on X.",
        fix: { label: "Collapse blank lines", apply: collapseBlankLines },
      });
    }
  } else {
    // LinkedIn
    const len = Array.from(content).length;
    if (len > limit) {
      errors.push({
        id: "li-too-long",
        severity: "error",
        message: `Too long for ${label} — ${len.toLocaleString()} / ${limit.toLocaleString()} characters`,
        hint: "Trim the body or split into a follow-up post.",
        fix: {
          label: `Shorten to ${limit.toLocaleString()}`,
          apply: (c) => truncateToCodePoints(c, limit),
        },
      });
    } else if (len > limit * 0.95) {
      warnings.push({
        id: "li-near-limit",
        severity: "warning",
        message: `Close to the ${label} limit (${len.toLocaleString()} / ${limit.toLocaleString()})`,
      });
    }

    const hashtags = countMatches(content, HASHTAG_RE);
    if (hashtags > MAX_HASHTAGS_LINKEDIN) {
      warnings.push({
        id: "li-hashtags",
        severity: "warning",
        message: `${hashtags} hashtags — LinkedIn favors ≤ ${MAX_HASHTAGS_LINKEDIN} relevant tags.`,
        fix: {
          label: `Keep first ${MAX_HASHTAGS_LINKEDIN}`,
          apply: (c) => limitHashtags(c, MAX_HASHTAGS_LINKEDIN),
        },
      });
    }

    const firstLine = content.split("\n", 1)[0] ?? "";
    if (firstLine.length > 210) {
      warnings.push({
        id: "li-hook",
        severity: "warning",
        message: "Opening line is long — LinkedIn truncates around ~210 characters in the feed.",
        hint: "Lead with a tight hook so readers click 'see more'.",
      });
    }

    // Markdown-style formatting that LinkedIn doesn't render
    const mdMarkers: { id: string; re: RegExp; label: string }[] = [
      { id: "li-md-bold", re: /\*\*[^*]+\*\*/, label: "**bold**" },
      { id: "li-md-italic", re: /(^|\s)\*[^*\n]+\*/, label: "*italic*" },
      { id: "li-md-heading", re: /^#{1,6}\s/m, label: "# heading" },
      { id: "li-md-link", re: /\[[^\]]+\]\([^)]+\)/, label: "[text](url)" },
      { id: "li-md-code", re: /`[^`\n]+`/, label: "`code`" },
    ];
    const found = mdMarkers.filter((m) => m.re.test(content)).map((m) => m.label);
    if (found.length) {
      warnings.push({
        id: "li-md",
        severity: "warning",
        message: "Markdown won't render on LinkedIn",
        hint: `Posts as raw text: ${found.join(", ")}. Use line breaks and emoji for emphasis instead.`,
        fix: { label: "Strip markdown", apply: stripMarkdown },
      });
    }

    if (countMatches(content, MENTION_RE) > 0 && /(^|\s)@\w/.test(content)) {
      warnings.push({
        id: "li-mentions",
        severity: "warning",
        message: "@mentions need to be re-typed on LinkedIn for tagging to work.",
      });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

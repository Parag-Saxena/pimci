import { PLATFORM_LIMITS, PLATFORM_LABEL, type Platform } from "@/lib/platform";

export type PreflightSeverity = "error" | "warning";

export type PreflightIssue = {
  id: string;
  severity: PreflightSeverity;
  message: string;
  hint?: string;
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
      });
    }

    const urls = (content.match(URL_RE) ?? []).length;
    if (urls > 1) {
      warnings.push({
        id: "x-multi-link",
        severity: "warning",
        message: "Multiple links — X usually surfaces only the first link preview.",
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
      });
    }

    if (/\n{3,}/.test(content)) {
      warnings.push({
        id: "x-blank-lines",
        severity: "warning",
        message: "Multiple blank lines waste characters on X.",
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

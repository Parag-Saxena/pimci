// Client-side history of LinkedIn OAuth connection attempts.
// Stored in localStorage purely as a debugging aid — no server schema involved.

export type LinkedInAttemptStage =
  | "start"          // pre-flight to /api/public/oauth/linkedin/start
  | "popup_closed"   // popup closed without sending a result
  | "callback";      // result received from the OAuth callback page

export type LinkedInAttempt = {
  id: string;
  ts: string;        // ISO timestamp
  status: "success" | "error";
  stage: LinkedInAttemptStage;
  message: string;
};

const KEY = "linkedin-oauth-history";
const MAX = 10;

function safeParse(raw: string | null): LinkedInAttempt[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is LinkedInAttempt =>
        a &&
        typeof a.id === "string" &&
        typeof a.ts === "string" &&
        (a.status === "success" || a.status === "error") &&
        (a.stage === "start" || a.stage === "popup_closed" || a.stage === "callback") &&
        typeof a.message === "string",
    );
  } catch {
    return [];
  }
}

export function getLinkedInHistory(): LinkedInAttempt[] {
  if (typeof window === "undefined") return [];
  try {
    return safeParse(localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function recordLinkedInAttempt(
  entry: Omit<LinkedInAttempt, "id" | "ts"> & { ts?: string },
): LinkedInAttempt[] {
  if (typeof window === "undefined") return [];
  const newEntry: LinkedInAttempt = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: entry.ts ?? new Date().toISOString(),
    status: entry.status,
    stage: entry.stage,
    message: entry.message.slice(0, 500), // cap length
  };
  const next = [newEntry, ...getLinkedInHistory()].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full / disabled — ignore
  }
  return next;
}

export function clearLinkedInHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

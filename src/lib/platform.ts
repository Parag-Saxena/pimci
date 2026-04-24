export type Platform = "linkedin" | "x";

export const PLATFORM_LIMITS: Record<Platform, number> = {
  linkedin: 3000,
  x: 280,
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: "LinkedIn",
  x: "X",
};

export const platformColor = (p: Platform) =>
  p === "linkedin" ? "text-linkedin" : "text-x-platform";

export const platformBg = (p: Platform) =>
  p === "linkedin" ? "bg-linkedin/10 text-linkedin" : "bg-x-platform/10 text-x-platform";

export const platformOpenUrl = (p: Platform) =>
  p === "linkedin" ? "https://www.linkedin.com/feed/?shareActive=true" : "https://x.com/compose/post";

// Server-only LinkedIn API helpers.
// Do NOT import this from client code.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const LINKEDIN_SCOPES = "openid profile email w_member_social";

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const UGC_URL = "https://api.linkedin.com/v2/ugcPosts";

export function getLinkedInClientCreds() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LinkedIn credentials are not configured.");
  }
  return { clientId, clientSecret };
}

export function buildLinkedInAuthUrl(opts: {
  redirectUri: string;
  state: string;
}) {
  const { clientId } = getLinkedInClientCreds();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    scope: LINKEDIN_SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type LinkedInTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
};

export async function exchangeLinkedInCode(opts: {
  code: string;
  redirectUri: string;
}): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getLinkedInClientCreds();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LinkedIn token exchange failed [${res.status}]: ${t}`);
  }
  return (await res.json()) as LinkedInTokenResponse;
}

export async function refreshLinkedInToken(opts: {
  refreshToken: string;
}): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getLinkedInClientCreds();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: opts.refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LinkedIn token refresh failed [${res.status}]: ${t}`);
  }
  return (await res.json()) as LinkedInTokenResponse;
}

export type LinkedInUserInfo = {
  sub: string; // platform_user_id (also used as person URN suffix)
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
};

export async function fetchLinkedInUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LinkedIn userinfo failed [${res.status}]: ${t}`);
  }
  return (await res.json()) as LinkedInUserInfo;
}

/** Returns a usable access token for the given user, refreshing if needed. */
export async function getValidLinkedInToken(userId: string): Promise<{
  accessToken: string;
  platformUserId: string;
}> {
  const { data: account, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("access_token, refresh_token, expires_at, platform_user_id")
    .eq("user_id", userId)
    .eq("platform", "linkedin")
    .maybeSingle();
  if (error) throw new Error(`Could not load LinkedIn account: ${error.message}`);
  if (!account) throw new Error("LinkedIn account not connected.");

  const expiresSoon =
    !account.expires_at ||
    new Date(account.expires_at).getTime() - Date.now() < 60_000;

  if (!expiresSoon) {
    return {
      accessToken: account.access_token,
      platformUserId: account.platform_user_id,
    };
  }

  if (!account.refresh_token) {
    // Token expired and no refresh token — force reconnect.
    throw new Error("LinkedIn session expired. Please reconnect your account.");
  }

  const refreshed = await refreshLinkedInToken({ refreshToken: account.refresh_token });
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("connected_accounts")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? account.refresh_token,
      expires_at: expiresAt,
      scope: refreshed.scope ?? undefined,
    })
    .eq("user_id", userId)
    .eq("platform", "linkedin");

  return {
    accessToken: refreshed.access_token,
    platformUserId: account.platform_user_id,
  };
}

/** Posts plain text to LinkedIn as the given member. Returns the LinkedIn URN. */
export async function publishLinkedInText(opts: {
  accessToken: string;
  platformUserId: string;
  text: string;
}): Promise<{ urn: string }> {
  const authorUrn = `urn:li:person:${opts.platformUserId}`;
  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: opts.text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const res = await fetch(UGC_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LinkedIn publish failed [${res.status}]: ${t}`);
  }
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  const urn = json.id ?? res.headers.get("x-restli-id") ?? "";
  return { urn };
}

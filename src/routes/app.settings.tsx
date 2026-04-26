import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, Plug, Unplug, ExternalLink, History, Trash2, CheckCircle2, XCircle, Camera } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getLinkedInHistory,
  recordLinkedInAttempt,
  clearLinkedInHistory,
  type LinkedInAttempt,
} from "@/lib/linkedin-oauth-history";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  listConnectedAccounts,
  disconnectAccount,
  type ConnectedAccountSummary,
} from "@/utils/social.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      }
    })();
  }, [user]);

  const username = user?.email?.split("@")[0] ?? "";

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error("Save failed");
    else toast.success("Profile updated");
  };

  const handleAvatarPick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updErr) throw updErr;

      setAvatarUrl(publicUrl);
      toast.success("Avatar updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const initials = (displayName || user?.email || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-0.5 text-xs text-muted-foreground">Profile and preferences.</p>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Profile</h2>

        <div className="mt-5 flex items-center gap-5">
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={uploading}
            aria-label="Change profile photo"
            className="group relative h-20 w-20 overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} alt="" />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
              aria-hidden="true"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Change</span>
                </>
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarChange}
          />
          <div className="text-xs text-muted-foreground">
            Hover the photo to upload a new image. PNG or JPG, up to 4MB.
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name" className="text-xs">
              Name
            </Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Username</Label>
            <Input value={username} disabled readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={user?.email ?? ""} disabled readOnly />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>

      <ConnectedAccountsSection />
    </div>
  );
}

function ConnectedAccountsSection() {
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<null | "linkedin" | "x">(null);
  const [linkedinError, setLinkedinError] = useState<string | null>(null);
  const [linkedinHistory, setLinkedinHistory] = useState<LinkedInAttempt[]>([]);
  const listFn = useServerFn(listConnectedAccounts);
  const disconnectFn = useServerFn(disconnectAccount);

  const logAttempt = useCallback(
    (entry: Parameters<typeof recordLinkedInAttempt>[0]) => {
      const next = recordLinkedInAttempt(entry);
      setLinkedinHistory(next);
    },
    [],
  );

  const clearHistory = useCallback(() => {
    clearLinkedInHistory();
    setLinkedinHistory([]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { accounts: data, error } = await listFn();
      if (error) toast.error(error);
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  // Load last persisted LinkedIn error + history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("linkedin-oauth-last-error");
      if (stored) setLinkedinError(stored);
    } catch (_e) {
      // ignore
    }
    setLinkedinHistory(getLinkedInHistory());
  }, []);

  // If the popup wrote a result to sessionStorage (popup-blocked fallback), pick it up.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("linkedin-oauth-result");
      if (!raw) return;
      sessionStorage.removeItem("linkedin-oauth-result");
      const parsed = JSON.parse(raw) as { status?: string; message?: string };
      if (parsed.status === "success") {
        setLinkedinError(null);
        localStorage.removeItem("linkedin-oauth-last-error");
        toast.success(parsed.message || "LinkedIn connected");
        logAttempt({
          status: "success",
          stage: "callback",
          message: parsed.message || "Connected.",
        });
      } else if (parsed.message) {
        setLinkedinError(parsed.message);
        localStorage.setItem("linkedin-oauth-last-error", parsed.message);
        toast.error(parsed.message, { duration: 8000 });
        logAttempt({
          status: "error",
          stage: "callback",
          message: parsed.message,
        });
      }
    } catch (_e) {
      // ignore
    }
  }, [logAttempt]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for OAuth popup completion
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data as { type?: string; status?: string; message?: string } | null;
      if (msg?.type === "linkedin-oauth") {
        setPending(null);
        if (msg.status === "success") {
          setLinkedinError(null);
          try { localStorage.removeItem("linkedin-oauth-last-error"); } catch (_e) { /* ignore */ }
          toast.success(msg.message || "LinkedIn connected");
          logAttempt({
            status: "success",
            stage: "callback",
            message: msg.message || "Connected.",
          });
          refresh();
        } else {
          const errMsg = msg.message || "LinkedIn connection failed";
          setLinkedinError(errMsg);
          try { localStorage.setItem("linkedin-oauth-last-error", errMsg); } catch (_e) { /* ignore */ }
          toast.error(errMsg, { duration: 8000 });
          logAttempt({
            status: "error",
            stage: "callback",
            message: errMsg,
          });
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh, logAttempt]);

  const linkedin = accounts.find((a) => a.platform === "linkedin");
  const x = accounts.find((a) => a.platform === "x");

  const connectLinkedIn = async () => {
    if (!session?.access_token) {
      toast.error("Not signed in");
      return;
    }
    setPending("linkedin");

    // Call the start endpoint via POST with the Supabase JWT in the
    // Authorization header. This avoids leaking the token via URL/Referer/logs.
    let authorizeUrl: string | null = null;
    try {
      const res = await fetch("/api/public/oauth/linkedin/start", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        let message = `LinkedIn connect failed with HTTP ${res.status}.`;
        try {
          const body = await res.json();
          if (body?.error) message = String(body.error);
        } catch {
          const text = (await res.text()).trim();
          if (text) message = text;
        }
        setPending(null);
        setLinkedinError(message);
        try { localStorage.setItem("linkedin-oauth-last-error", message); } catch (_e) { /* ignore */ }
        toast.error(message, { duration: 10000 });
        logAttempt({ status: "error", stage: "start", message });
        return;
      }
      const body = (await res.json()) as { authorizeUrl?: string };
      if (!body.authorizeUrl) {
        throw new Error("Missing authorizeUrl in response");
      }
      authorizeUrl = body.authorizeUrl;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error";
      setPending(null);
      setLinkedinError(message);
      try { localStorage.setItem("linkedin-oauth-last-error", message); } catch (_e) { /* ignore */ }
      toast.error(message, { duration: 10000 });
      logAttempt({ status: "error", stage: "start", message });
      return;
    }

    if (!authorizeUrl) {
      setPending(null);
      return;
    }

    const popup = window.open(authorizeUrl, "linkedin-oauth", "width=600,height=720");
    if (!popup) {
      // Popup blocked → full-page redirect
      setPending(null);
      window.location.href = authorizeUrl;
      return;
    }
    // Safety: clear pending if popup closes without messaging
    let receivedResult = false;
    const onResult = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data as { type?: string } | null;
      if (m?.type === "linkedin-oauth") receivedResult = true;
    };
    window.addEventListener("message", onResult);
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", onResult);
        setPending((p) => (p === "linkedin" ? null : p));
        if (!receivedResult) {
          logAttempt({
            status: "error",
            stage: "popup_closed",
            message: "Popup was closed before LinkedIn returned a result.",
          });
        }
        refresh();
      }
    }, 800);
  };

  const disconnect = async (platform: "linkedin" | "x") => {
    setPending(platform);
    try {
      await disconnectFn({ data: { platform } });
      toast.success("Disconnected");
      if (platform === "linkedin") {
        setLinkedinError(null);
        try { localStorage.removeItem("linkedin-oauth-last-error"); } catch (_e) { /* ignore */ }
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setPending(null);
    }
  };

  const dismissLinkedinError = () => {
    setLinkedinError(null);
    try { localStorage.removeItem("linkedin-oauth-last-error"); } catch (_e) { /* ignore */ }
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="text-sm font-medium">Connected accounts</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Connect LinkedIn or X to publish posts directly. Without a connection, posts fall back to
        copy-and-open from your queue.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AccountCard
          platform="linkedin"
          label="LinkedIn"
          accentClass="text-linkedin"
          loading={loading}
          account={linkedin}
          pending={pending === "linkedin"}
          lastError={linkedinError}
          history={linkedinHistory}
          onClearHistory={clearHistory}
          onDismissError={dismissLinkedinError}
          onConnect={connectLinkedIn}
          onDisconnect={() => disconnect("linkedin")}
        />
        <AccountCard
          platform="x"
          label="X"
          accentClass=""
          loading={loading}
          account={x}
          pending={pending === "x"}
          comingSoon
          onConnect={() => toast.info("X publishing requires a paid X API tier — coming soon.")}
          onDisconnect={() => disconnect("x")}
        />
      </div>
    </section>
  );
}

function AccountCard({
  label,
  accentClass,
  loading,
  account,
  pending,
  lastError,
  history,
  onClearHistory,
  onConnect,
  onDisconnect,
  onDismissError,
  comingSoon,
}: {
  platform: "linkedin" | "x";
  label: string;
  accentClass: string;
  loading: boolean;
  account: ConnectedAccountSummary | undefined;
  pending: boolean;
  lastError?: string | null;
  history?: LinkedInAttempt[];
  onClearHistory?: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onDismissError?: () => void;
  comingSoon?: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const initials = (account?.display_name || account?.handle || label)
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4">
      <div className="flex items-center justify-between">
        <div className={`text-sm font-medium ${accentClass}`}>{label}</div>
        {account ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Connected
          </span>
        ) : comingSoon ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Coming soon
          </span>
        ) : lastError ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Connection failed
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Not connected
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 h-10 animate-pulse rounded-md bg-muted/50" />
      ) : account ? (
        <div className="mt-3 flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={account.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {account.display_name ?? account.handle ?? "Connected"}
            </div>
            {account.handle && (
              <div className="truncate text-xs text-muted-foreground">{account.handle}</div>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onDisconnect} disabled={pending}>
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Unplug className="mr-1.5 h-3.5 w-3.5" />
            )}
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {comingSoon
              ? "Available once X API access is wired up."
              : "Sign in to enable direct publishing."}
          </p>
          <Button size="sm" onClick={onConnect} disabled={pending || comingSoon}>
            {pending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="mr-1.5 h-3.5 w-3.5" />
            )}
            Connect {label}
            <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
          </Button>
        </div>
      )}

      {!account && lastError && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-xs">Last connection error</AlertTitle>
          <AlertDescription className="mt-1 break-words text-xs">
            {lastError}
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="ml-2 underline opacity-80 hover:opacity-100"
              >
                Dismiss
              </button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {history && history.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={showHistory}
            >
              <History className="h-3 w-3" />
              {showHistory ? "Hide" : "Show"} attempt history ({history.length})
            </button>
            {showHistory && onClearHistory && (
              <button
                type="button"
                onClick={onClearHistory}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {showHistory && (
            <ul className="mt-2 max-h-56 space-y-1.5 overflow-auto pr-1">
              {history.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start gap-2 rounded-md border border-border/60 bg-background/40 px-2 py-1.5"
                >
                  {h.status === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <time dateTime={h.ts}>
                        {new Date(h.ts).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </time>
                      <span className="rounded bg-muted px-1 py-px font-mono">
                        {h.stage}
                      </span>
                    </div>
                    <p className="mt-0.5 break-words text-xs leading-snug">
                      {h.message}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


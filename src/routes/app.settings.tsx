import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plug, Unplug, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, timezone")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setTimezone(data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, avatar_url: avatarUrl, timezone })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error("Save failed");
    else toast.success("Profile updated");
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
        <div className="mt-5 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="avatar" className="text-xs">
              Avatar URL
            </Label>
            <Input
              id="avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">
              Display name
            </Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </section>

      <ConnectedAccountsSection />


      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium">Account</h2>
        <div className="mt-3">
          <Button variant="outline" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </section>
    </div>
  );
}

function ConnectedAccountsSection() {
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<null | "linkedin" | "x">(null);
  const listFn = useServerFn(listConnectedAccounts);
  const disconnectFn = useServerFn(disconnectAccount);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Listen for OAuth popup completion
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const msg = e.data as { type?: string; status?: string } | null;
      if (msg?.type === "linkedin-oauth") {
        setPending(null);
        if (msg.status === "success") {
          toast.success("LinkedIn connected");
          refresh();
        } else {
          toast.error("LinkedIn connection failed");
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  const linkedin = accounts.find((a) => a.platform === "linkedin");
  const x = accounts.find((a) => a.platform === "x");

  const connectLinkedIn = () => {
    if (!session?.access_token) {
      toast.error("Not signed in");
      return;
    }
    setPending("linkedin");
    const url = `/api/public/oauth/linkedin/start?token=${encodeURIComponent(session.access_token)}`;
    const popup = window.open(url, "linkedin-oauth", "width=600,height=720");
    if (!popup) {
      // Popup blocked → full-page redirect
      setPending(null);
      window.location.href = url;
      return;
    }
    // Safety: clear pending if popup closes without messaging
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setPending((p) => (p === "linkedin" ? null : p));
        refresh();
      }
    }, 800);
  };

  const disconnect = async (platform: "linkedin" | "x") => {
    setPending(platform);
    try {
      await disconnectFn({ data: { platform } });
      toast.success("Disconnected");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setPending(null);
    }
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
  onConnect,
  onDisconnect,
  comingSoon,
}: {
  platform: "linkedin" | "x";
  label: string;
  accentClass: string;
  loading: boolean;
  account: ConnectedAccountSummary | undefined;
  pending: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  comingSoon?: boolean;
}) {
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
            Connect
            <ExternalLink className="ml-1 h-3 w-3 opacity-60" />
          </Button>
        </div>
      )}
    </div>
  );
}

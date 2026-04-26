import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  FileText,
  Send,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORM_LABEL, platformBg, type Platform } from "@/lib/platform";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

type PostRow = {
  id: string;
  platform: Platform;
  content: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
};

type StatusBreakdown = {
  draft: number;
  scheduled: number;
  ready: number;
  published: number;
  failed: number;
};

const TREND_DAYS = 14;

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    drafts: 0,
    scheduledThisWeek: 0,
    publishedThisMonth: 0,
    readyToPublish: 0,
    failed: 0,
  });
  const [byPlatform, setByPlatform] = useState<Record<Platform, StatusBreakdown>>({
    linkedin: { draft: 0, scheduled: 0, ready: 0, published: 0, failed: 0 },
    x: { draft: 0, scheduled: 0, ready: 0, published: 0, failed: 0 },
  });
  const [trend, setTrend] = useState<
    Array<{ date: string; LinkedIn: number; X: number }>
  >([]);
  const [upcoming, setUpcoming] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const trendStart = startOfDay(subDays(now, TREND_DAYS - 1));

      const [
        drafts,
        scheduledWeek,
        publishedMonth,
        ready,
        failed,
        platformBreakdown,
        publishedTrend,
        up,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft"),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "scheduled")
          .gte("scheduled_at", now.toISOString())
          .lte("scheduled_at", weekEnd.toISOString()),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "published")
          .gte("published_at", monthStart.toISOString()),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "ready"),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("status", "failed"),
        supabase.from("posts").select("platform, status"),
        supabase
          .from("posts")
          .select("platform, published_at")
          .eq("status", "published")
          .gte("published_at", trendStart.toISOString()),
        supabase
          .from("posts")
          .select("id, platform, content, status, scheduled_at, published_at")
          .in("status", ["scheduled", "ready"])
          .order("scheduled_at", { ascending: true })
          .limit(5),
      ]);

      if (cancelled) return;

      setStats({
        drafts: drafts.count ?? 0,
        scheduledThisWeek: scheduledWeek.count ?? 0,
        publishedThisMonth: publishedMonth.count ?? 0,
        readyToPublish: ready.count ?? 0,
        failed: failed.count ?? 0,
      });

      // Aggregate platform x status
      const empty: StatusBreakdown = {
        draft: 0,
        scheduled: 0,
        ready: 0,
        published: 0,
        failed: 0,
      };
      const breakdown: Record<Platform, StatusBreakdown> = {
        linkedin: { ...empty },
        x: { ...empty },
      };
      for (const row of (platformBreakdown.data ?? []) as Array<{
        platform: Platform;
        status: keyof StatusBreakdown;
      }>) {
        if (breakdown[row.platform] && row.status in breakdown[row.platform]) {
          breakdown[row.platform][row.status] += 1;
        }
      }
      setByPlatform(breakdown);

      // Build daily trend buckets
      const buckets = new Map<string, { LinkedIn: number; X: number }>();
      for (let i = 0; i < TREND_DAYS; i++) {
        const d = startOfDay(subDays(now, TREND_DAYS - 1 - i));
        buckets.set(format(d, "yyyy-MM-dd"), { LinkedIn: 0, X: 0 });
      }
      for (const row of (publishedTrend.data ?? []) as Array<{
        platform: Platform;
        published_at: string | null;
      }>) {
        if (!row.published_at) continue;
        const key = format(startOfDay(new Date(row.published_at)), "yyyy-MM-dd");
        const entry = buckets.get(key);
        if (!entry) continue;
        if (row.platform === "linkedin") entry.LinkedIn += 1;
        else if (row.platform === "x") entry.X += 1;
      }
      setTrend(
        Array.from(buckets.entries()).map(([date, v]) => ({
          date: format(new Date(date), "MMM d"),
          LinkedIn: v.LinkedIn,
          X: v.X,
        })),
      );

      setUpcoming((up.data ?? []) as PostRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

  const totalPublished14 = useMemo(
    () => trend.reduce((acc, d) => acc + d.LinkedIn + d.X, 0),
    [trend],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your posting at a glance.</p>
        </div>
        <Link to="/app/compose">
          <Button>
            <Sparkles className="mr-1.5 h-4 w-4" />
            New post
          </Button>
        </Link>
      </div>

      {/* Headline stats — each links to a filtered Library view */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Drafts"
          value={stats.drafts}
          loading={loading}
          to="/app/queue"
          search={{ status: "draft", platform: "all" }}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Scheduled this week"
          value={stats.scheduledThisWeek}
          loading={loading}
          to="/app/calendar"
        />
        <StatCard
          icon={<Send className="h-4 w-4" />}
          label="Published this month"
          value={stats.publishedThisMonth}
          loading={loading}
          to="/app/queue"
          search={{ status: "published", platform: "all" }}
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Ready to publish"
          value={stats.readyToPublish}
          loading={loading}
          to="/app/queue"
          search={{ status: "ready", platform: "all" }}
          accent={stats.readyToPublish > 0 ? "success" : undefined}
        />
      </div>

      {/* Failed posts banner — quick path to fix */}
      {stats.failed > 0 && (
        <Link
          to="/app/queue"
          search={{ status: "failed", platform: "all" }}
          className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm transition-colors hover:bg-destructive/10"
        >
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">
              {stats.failed} {stats.failed === 1 ? "post" : "posts"} failed to publish
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            Review <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </span>
        </Link>
      )}

      {/* Analytics: scheduled vs published + trend */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium">Publishing activity</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Posts published per day · last {TREND_DAYS} days · {totalPublished14} total
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-56 w-full">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : totalPublished14 === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground">
                <p>No published posts in the last {TREND_DAYS} days yet.</p>
                <Link
                  to="/app/compose"
                  className="mt-2 text-foreground underline-offset-4 hover:underline"
                >
                  Draft your first post
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--linkedin, 210 100% 40%))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--linkedin, 210 100% 40%))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="xGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="LinkedIn"
                    stroke="hsl(var(--linkedin, 210 100% 40%))"
                    fill="url(#liGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="X"
                    stroke="hsl(var(--foreground))"
                    fill="url(#xGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">By platform</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">All-time scheduled vs published</p>
          <div className="mt-4 space-y-4">
            {(["linkedin", "x"] as const).map((p) => (
              <PlatformBreakdownRow
                key={p}
                platform={p}
                breakdown={byPlatform[p]}
                loading={loading}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
          <Link
            to="/app/queue"
            search={{ status: "scheduled", platform: "all" }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="ml-0.5 inline h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {loading ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nothing scheduled.{" "}
              <Link to="/app/compose" className="text-foreground underline-offset-4 hover:underline">
                Start drafting
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-start gap-4 p-4 hover-lift">
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${platformBg(p.platform)}`}
                  >
                    {PLATFORM_LABEL[p.platform]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{p.content || "(empty)"}</p>
                    {p.scheduled_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(p.scheduled_at), "EEE, MMM d · h:mm a")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

type StatLink =
  | { to: "/app/queue"; search: { status: "all" | "draft" | "scheduled" | "ready" | "published" | "failed"; platform: "all" | "linkedin" | "x" } }
  | { to: "/app/calendar"; search?: undefined }
  | { to: "/app/compose"; search?: undefined };

function StatCard({
  icon,
  label,
  value,
  loading,
  to,
  search,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  to: StatLink["to"];
  search?: Extract<StatLink, { to: "/app/queue" }>["search"];
  accent?: "success";
}) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={
          "mt-3 text-3xl font-semibold tracking-tight " +
          (accent === "success" ? "text-success" : "")
        }
      >
        {loading ? <Skeleton className="h-8 w-12" /> : value}
      </div>
      <div className="mt-2 inline-flex items-center text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
        View <ArrowRight className="ml-0.5 h-3 w-3" />
      </div>
    </>
  );

  const className =
    "group block rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0";

  if (to === "/app/queue" && search) {
    return (
      <Link to="/app/queue" search={search} className={className}>
        {content}
      </Link>
    );
  }
  if (to === "/app/calendar") {
    return (
      <Link to="/app/calendar" className={className}>
        {content}
      </Link>
    );
  }
  return (
    <Link to="/app/compose" className={className}>
      {content}
    </Link>
  );
}

function PlatformBreakdownRow({
  platform,
  breakdown,
  loading,
}: {
  platform: Platform;
  breakdown: StatusBreakdown;
  loading: boolean;
}) {
  const total = breakdown.scheduled + breakdown.ready + breakdown.published;
  const publishedPct = total === 0 ? 0 : Math.round((breakdown.published / total) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className={`rounded-md px-2 py-0.5 font-medium ${platformBg(platform)}`}>
          {PLATFORM_LABEL[platform]}
        </span>
        <span className="text-muted-foreground">
          {loading ? "…" : `${breakdown.published} / ${total} published`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: loading ? "0%" : `${publishedPct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <Link
          to="/app/queue"
          search={{ status: "scheduled", platform }}
          className="hover:text-foreground"
        >
          {breakdown.scheduled} scheduled
        </Link>
        <Link
          to="/app/queue"
          search={{ status: "ready", platform }}
          className="hover:text-foreground"
        >
          {breakdown.ready} ready
        </Link>
        <Link
          to="/app/queue"
          search={{ status: "published", platform }}
          className="hover:text-foreground"
        >
          {breakdown.published} published
        </Link>
        {breakdown.failed > 0 && (
          <Link
            to="/app/queue"
            search={{ status: "failed", platform }}
            className="text-destructive hover:opacity-80"
          >
            {breakdown.failed} failed
          </Link>
        )}
      </div>
    </div>
  );
}

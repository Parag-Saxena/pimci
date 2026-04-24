import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, FileText, Send, Sparkles, ArrowRight } from "lucide-react";
import { format } from "date-fns";
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
};

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ drafts: 0, scheduledThisWeek: 0, publishedThisMonth: 0 });
  const [upcoming, setUpcoming] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [drafts, scheduled, published, up] = await Promise.all([
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
          .select("id, platform, content, status, scheduled_at")
          .in("status", ["scheduled", "ready"])
          .order("scheduled_at", { ascending: true })
          .limit(5),
      ]);

      if (cancelled) return;
      setStats({
        drafts: drafts.count ?? 0,
        scheduledThisWeek: scheduled.count ?? 0,
        publishedThisMonth: published.count ?? 0,
      });
      setUpcoming((up.data ?? []) as PostRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

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

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<FileText className="h-4 w-4" />}
          label="Drafts"
          value={stats.drafts}
          loading={loading}
        />
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          label="Scheduled this week"
          value={stats.scheduledThisWeek}
          loading={loading}
        />
        <StatCard
          icon={<Send className="h-4 w-4" />}
          label="Published this month"
          value={stats.publishedThisMonth}
          loading={loading}
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
          <Link to="/app/queue" className="text-xs text-muted-foreground hover:text-foreground">
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

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover-lift">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">
        {loading ? <Skeleton className="h-8 w-12" /> : value}
      </div>
    </div>
  );
}

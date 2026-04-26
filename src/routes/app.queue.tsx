import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { format } from "date-fns";
import { Copy, ExternalLink, Trash2, CheckCircle2, Sparkles, Filter, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PLATFORM_LABEL,
  platformBg,
  platformOpenUrl,
  type Platform,
} from "@/lib/platform";
import { publishPost } from "@/utils/social.functions";
import { stripMarkdown } from "@/lib/preflight";

const STATUS_VALUES = ["all", "draft", "scheduled", "ready", "published", "failed"] as const;
const PLATFORM_VALUES = ["all", "linkedin", "x"] as const;

const librarySearchSchema = z.object({
  status: z.enum(STATUS_VALUES).optional().default("all"),
  platform: z.enum(PLATFORM_VALUES).optional().default("all"),
});

export const Route = createFileRoute("/app/queue")({
  component: Queue,
  validateSearch: zodValidator(librarySearchSchema),
});

type Status = (typeof STATUS_VALUES)[number];
type PlatformFilter = (typeof PLATFORM_VALUES)[number];

type PostRow = {
  id: string;
  platform: Platform;
  content: string;
  status: Status extends "all" ? never : Status;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
};

function Queue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { status, platform } = Route.useSearch();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const publishPostFn = useServerFn(publishPost);

  const setStatus = (next: Status) =>
    navigate({ to: "/app/queue", search: { status: next, platform } });
  const setPlatform = (next: PlatformFilter) =>
    navigate({ to: "/app/queue", search: { status, platform: next } });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("posts")
      .select("id, platform, content, status, scheduled_at, published_at, created_at")
      .order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    if (platform !== "all") q = q.eq("platform", platform);
    const { data } = await q;
    setPosts((data ?? []) as PostRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status, platform]);

  // Auto-promote scheduled posts whose time has passed → "ready"
  useEffect(() => {
    if (!user) return;
    const promote = async () => {
      const now = new Date().toISOString();
      await supabase
        .from("posts")
        .update({ status: "ready" })
        .eq("status", "scheduled")
        .lte("scheduled_at", now);
      load();
    };
    promote();
    const t = setInterval(promote, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(
    () => posts.filter((p) => p.content.toLowerCase().includes(search.toLowerCase())),
    [posts, search],
  );

  const copyAndOpen = async (p: PostRow) => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(p.content).trim());
      window.open(platformOpenUrl(p.platform), "_blank");
      toast.success("Copied & opened " + PLATFORM_LABEL[p.platform]);
    } catch {
      toast.error("Could not copy");
    }
  };

  const publishNow = async (p: PostRow) => {
    setPublishingId(p.id);
    try {
      const result = await publishPostFn({ data: { postId: p.id } });
      if (result.published) {
        toast.success("Published to " + PLATFORM_LABEL[p.platform]);
      } else if (result.manualFallback) {
        await copyAndOpen(p);
        toast.message(result.message);
      }
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
      load();
    } finally {
      setPublishingId(null);
    }
  };

  const markPublished = async (p: PostRow) => {
    const { error } = await supabase
      .from("posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) toast.error("Update failed");
    else {
      toast.success("Marked published");
      load();
    }
  };

  const remove = async (p: PostRow) => {
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Library</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">All your drafts and published posts in one place.</p>
        </div>
        <Link to="/app/compose" className="self-start sm:self-auto">
          <Button size="sm">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            New post
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto">
          <Filter className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 sm:w-64"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
          <SelectTrigger className="w-[150px] flex-1 sm:flex-initial">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="ready">Ready to publish</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformFilter)}>
          <SelectTrigger className="w-[140px] flex-1 sm:flex-initial">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card shimmer" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No posts yet.{" "}
            <Link to="/app/compose" className="text-foreground underline-offset-4 hover:underline">
              Start drafting
            </Link>
            .
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              className="group rounded-xl border border-border bg-card p-4 hover-lift"
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium",
                    platformBg(p.platform),
                  )}
                >
                  {PLATFORM_LABEL[p.platform]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-muted-foreground">
                      {p.scheduled_at
                        ? `Scheduled ${format(new Date(p.scheduled_at), "MMM d, h:mm a")}`
                        : p.published_at
                          ? `Published ${format(new Date(p.published_at), "MMM d, h:mm a")}`
                          : `Created ${format(new Date(p.created_at), "MMM d")}`}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate({ to: "/app/compose", search: { id: p.id } })}
                    className="mt-2 block w-full text-left"
                  >
                    <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                      {p.content || <span className="italic text-muted-foreground">(empty)</span>}
                    </p>
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {(p.status === "ready" || p.status === "scheduled" || p.status === "draft" || p.status === "failed") && (
                    <Button
                      size="sm"
                      onClick={() => publishNow(p)}
                      disabled={publishingId === p.id}
                    >
                      {publishingId === p.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Publish
                    </Button>
                  )}
                  {p.status === "ready" && (
                    <Button variant="ghost" size="sm" onClick={() => copyAndOpen(p)}>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy & open
                    </Button>
                  )}
                  {(p.status === "ready" || p.status === "scheduled") && (
                    <Button variant="ghost" size="sm" onClick={() => markPublished(p)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Mark done
                    </Button>
                  )}
                  {p.status === "published" && (
                    <Button variant="ghost" size="icon" onClick={() => copyAndOpen(p)} title="Copy & open">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => remove(p)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    scheduled: { label: "Scheduled", cls: "bg-primary/10 text-primary" },
    ready: { label: "Ready to publish", cls: "bg-warning/15 text-warning" },
    published: { label: "Published", cls: "bg-success/15 text-success" },
    failed: { label: "Failed", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] ?? map.draft;
  return (
    <Badge variant="secondary" className={cn("text-[10px] font-medium", m.cls)}>
      {m.label}
    </Badge>
  );
}

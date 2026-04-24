import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Sparkles,
  Save,
  Trash2,
  Copy,
  Wand2,
  Send,
  Loader2,
  Lightbulb,
  Bold,
  Italic,
  Heading,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  Eye,
  Pencil,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORM_LIMITS, PLATFORM_LABEL, type Platform } from "@/lib/platform";
import { runPreflight, stripMarkdown } from "@/lib/preflight";
import { useGeneratePosts, useGenerateTrendIdeas, useRewritePost } from "@/hooks/use-ai";

const search = z.object({
  id: z.string().optional(),
  platform: z.enum(["linkedin", "x"]).optional(),
});

export const Route = createFileRoute("/app/compose")({
  validateSearch: (s) => search.parse(s),
  component: Compose,
});

type Draft = {
  id: string | null;
  platform: Platform;
  content: string;
  scheduled_at: string | null;
  ai_generated: boolean;
  source_brief: string | null;
  variant_group_id: string | null;
};

const emptyDraft = (platform: Platform = "linkedin"): Draft => ({
  id: null,
  platform,
  content: "",
  scheduled_at: null,
  ai_generated: false,
  source_brief: null,
  variant_group_id: null,
});

type MdAction =
  | { wrap: string; placeholder?: string }
  | { linePrefix: string; placeholder?: string }
  | { custom: (sel: string) => { text: string; cursorOffset?: number } };

function applyMarkdown(
  el: HTMLTextAreaElement,
  current: string,
  action: MdAction,
  onChange: (next: string) => void,
) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const selected = current.slice(start, end);

  let next = current;
  let nextStart = start;
  let nextEnd = end;

  if ("wrap" in action) {
    const inner = selected || action.placeholder || "";
    const insertion = `${action.wrap}${inner}${action.wrap}`;
    next = current.slice(0, start) + insertion + current.slice(end);
    nextStart = start + action.wrap.length;
    nextEnd = nextStart + inner.length;
  } else if ("linePrefix" in action) {
    // Find start of current line
    const lineStart = current.lastIndexOf("\n", start - 1) + 1;
    const before = current.slice(0, lineStart);
    const lineAndAfter = current.slice(lineStart);
    const inner = selected || action.placeholder || "";
    if (selected) {
      // Prefix every selected line
      const selBlock = current.slice(lineStart, end);
      const prefixed = selBlock
        .split("\n")
        .map((l) => `${action.linePrefix}${l}`)
        .join("\n");
      next = before + prefixed + current.slice(end);
      nextStart = lineStart;
      nextEnd = before.length + prefixed.length;
    } else {
      next =
        before +
        action.linePrefix +
        inner +
        lineAndAfter.slice(0);
      nextStart = lineStart + action.linePrefix.length;
      nextEnd = nextStart + inner.length;
    }
  } else {
    const out = action.custom(selected);
    next = current.slice(0, start) + out.text + current.slice(end);
    nextStart = start + (out.cursorOffset ?? out.text.length);
    nextEnd = nextStart;
  }

  onChange(next);
  // restore focus + selection after React updates
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(nextStart, nextEnd);
  });
}

type ToolbarItem = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: MdAction;
};

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { key: "bold", icon: Bold, label: "Bold", action: { wrap: "**", placeholder: "bold text" } },
  { key: "italic", icon: Italic, label: "Italic", action: { wrap: "*", placeholder: "italic" } },
  { key: "code", icon: Code, label: "Inline code", action: { wrap: "`", placeholder: "code" } },
  { key: "h", icon: Heading, label: "Heading", action: { linePrefix: "## ", placeholder: "Heading" } },
  { key: "ul", icon: List, label: "Bulleted list", action: { linePrefix: "- ", placeholder: "Item" } },
  { key: "ol", icon: ListOrdered, label: "Numbered list", action: { linePrefix: "1. ", placeholder: "Item" } },
  { key: "quote", icon: Quote, label: "Quote", action: { linePrefix: "> ", placeholder: "Quote" } },
  {
    key: "link",
    icon: Link2,
    label: "Link",
    action: {
      custom: (sel: string) => {
        const text = sel || "link text";
        const md = `[${text}](https://)`;
        // place cursor inside url
        return { text: md, cursorOffset: md.length - 1 };
      },
    },
  },
];

function MarkdownToolbar({ onAction }: { onAction: (a: MdAction) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
      {TOOLBAR_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="flex items-center">
            {(item.key === "h" || item.key === "link") && (
              <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            )}
            <button
              type="button"
              title={item.label}
              aria-label={item.label}
              onMouseDown={(e) => {
                // prevent textarea blur so selection is preserved
                e.preventDefault();
                onAction(item.action);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <span className="ml-auto pr-1 text-[10px] text-muted-foreground">Markdown</span>
    </div>
  );
}

/* ---------- Platform-accurate post preview ---------- */

function platformContent(content: string, platform: Platform) {
  // Both LinkedIn and X render plain text — markdown is stripped, links left intact.
  let body = stripMarkdown(content);
  if (platform === "x") body = body.replace(/\n{3,}/g, "\n\n");
  return body;
}

function effectiveLengthFor(content: string, platform: Platform): number {
  if (platform === "x") {
    const replaced = content.replace(/\bhttps?:\/\/[^\s)]+/gi, "x".repeat(23));
    return Array.from(replaced).length;
  }
  return Array.from(content).length;
}

function autolink(text: string): React.ReactNode[] {
  const re = /(https?:\/\/[^\s)]+)/gi;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a
        key={`l-${i++}`}
        href={m[1]}
        target="_blank"
        rel="noreferrer"
        className="text-[hsl(var(--primary))] underline-offset-2 hover:underline"
      >
        {m[1]}
      </a>,
    );
    last = m.index + m[1].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function LinkedInPreview({ rendered }: { rendered: string }) {
  // LinkedIn truncates the in-feed body around ~210 chars, then "…see more".
  const TRUNC = 210;
  const isLong = rendered.length > TRUNC;
  const visible = isLong ? rendered.slice(0, TRUNC).replace(/\s+\S*$/, "") : rendered;
  const rest = isLong ? rendered.slice(visible.length) : "";

  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linkedin/15 text-sm font-semibold text-linkedin">
          You
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">Your Name</p>
          <p className="truncate text-xs text-muted-foreground">Your headline · 1st</p>
          <p className="text-[11px] text-muted-foreground">now · 🌐</p>
        </div>
      </div>
      <div className="px-4 pb-3 pt-3 text-[14px] leading-[1.45] text-foreground">
        <span className="whitespace-pre-wrap break-words">{autolink(visible)}</span>
        {isLong && (
          <>
            <span className="text-muted-foreground">… </span>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground hover:underline"
              title={rest}
            >
              see more
            </button>
          </>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        <span>👍 ❤️ 💡 · 0</span>
        <span>0 comments</span>
      </div>
      <div className="grid grid-cols-4 border-t border-border text-[11px] text-muted-foreground">
        {["Like", "Comment", "Repost", "Send"].map((l) => (
          <button
            key={l}
            type="button"
            className="px-2 py-2 transition-colors hover:bg-muted"
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function XPreview({ rendered, overflow }: { rendered: string; overflow: number }) {
  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="flex gap-3 px-4 pt-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-x-platform/15 text-sm font-semibold text-x-platform">
          You
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1 text-sm">
            <span className="font-semibold">Your Name</span>
            <span className="truncate text-muted-foreground">@you · now</span>
          </div>
          <div className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[1.35]">
            {overflow > 0 ? (
              <>
                {autolink(rendered)}
                <span className="ml-1 inline-flex items-center rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  +{overflow} over limit
                </span>
              </>
            ) : (
              autolink(rendered)
            )}
          </div>
          <div className="mt-3 flex items-center justify-between pb-3 pr-2 text-[12px] text-muted-foreground">
            <span>💬 0</span>
            <span>🔁 0</span>
            <span>♥ 0</span>
            <span>📊 0</span>
            <span>↗</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformPreview({
  content,
  platform,
}: {
  content: string;
  platform: Platform;
}) {
  const [shown, setShown] = useState<Platform>(platform);
  // Sync with composer platform when it changes
  useEffect(() => {
    setShown(platform);
  }, [platform]);

  const rendered = platformContent(content, shown);
  const limit = PLATFORM_LIMITS[shown];
  const len = effectiveLengthFor(rendered, shown);
  const overflow = Math.max(0, len - limit);
  const stripped = rendered !== content;

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
          {(["linkedin", "x"] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setShown(p)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                shown === p
                  ? p === "linkedin"
                    ? "bg-linkedin text-white shadow-sm"
                    : "bg-x-platform text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PLATFORM_LABEL[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className={cn("tabular-nums", overflow > 0 && "text-destructive")}>
            {len.toLocaleString()} / {limit.toLocaleString()}
          </span>
          {stripped && (
            <span
              className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-medium text-foreground"
              title="Markdown is stripped on this platform"
            >
              MD stripped
            </span>
          )}
        </div>
      </div>
      {shown === "linkedin" ? (
        <LinkedInPreview rendered={rendered} />
      ) : (
        <XPreview rendered={rendered} overflow={overflow} />
      )}
      <p className="text-center text-[11px] text-muted-foreground">
        Approximation of how your post will render on {PLATFORM_LABEL[shown]}.
      </p>
    </div>
  );
}

function Compose() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useSearch({ from: "/app/compose" });
  const [draft, setDraft] = useState<Draft>(emptyDraft(params.platform ?? "linkedin"));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(Boolean(params.id));
  const [view, setView] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load draft if id in url
  useEffect(() => {
    if (!user) return;
    if (!params.id) {
      setDraft(emptyDraft(params.platform ?? "linkedin"));
      setLoadingDraft(false);
      return;
    }
    setLoadingDraft(true);
    (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, platform, content, scheduled_at, ai_generated, source_brief, variant_group_id")
        .eq("id", params.id!)
        .maybeSingle();
      if (error) {
        toast.error("Could not load post");
        setLoadingDraft(false);
        return;
      }
      if (data) {
        setDraft({
          id: data.id,
          platform: data.platform as Platform,
          content: data.content,
          scheduled_at: data.scheduled_at,
          ai_generated: data.ai_generated,
          source_brief: data.source_brief,
          variant_group_id: data.variant_group_id,
        });
      }
      setLoadingDraft(false);
    })();
  }, [user, params.id, params.platform]);

  const limit = PLATFORM_LIMITS[draft.platform];
  const len = draft.content.length;
  const pct = Math.min(len / limit, 1);
  const counterColor =
    len > limit ? "text-destructive" : pct > 0.9 ? "text-warning" : "text-muted-foreground";

  const preflight = useMemo(
    () => runPreflight(draft.content, draft.platform),
    [draft.content, draft.platform],
  );

  type SaveStatus = "draft" | "scheduled" | "published";
  const save = useCallback(
    async (
      intent: SaveStatus = "draft",
      overrides?: Partial<Draft>,
    ): Promise<{ id: string } | null> => {
      if (!user) return null;
      const merged = { ...draft, ...overrides };
      if (intent === "scheduled" && !merged.scheduled_at) {
        toast.error("Pick a date & time first");
        return null;
      }
      if (intent !== "draft") {
        const pf = runPreflight(merged.content, merged.platform);
        if (!pf.ok) {
          toast.error(pf.errors[0]?.message ?? "Fix preflight issues first");
          return null;
        }
      }
      const isPublishing = intent === "published";
      if (isPublishing) setPublishing(true);
      else setSaving(true);
      const payload = {
        user_id: user.id,
        platform: merged.platform,
        content: merged.content,
        scheduled_at: intent === "scheduled" ? merged.scheduled_at : null,
        ai_generated: merged.ai_generated,
        source_brief: merged.source_brief,
        variant_group_id: merged.variant_group_id,
        published_at: isPublishing ? new Date().toISOString() : null,
        status: intent as "draft" | "scheduled" | "published",
      };
      try {
        let id = merged.id;
        if (id) {
          const { error } = await supabase.from("posts").update(payload).eq("id", id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("posts")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw error;
          id = data.id;
          setDraft((d) => ({ ...d, ...overrides, id: id! }));
          navigate({ to: "/app/compose", search: { id: id! }, replace: true });
        }
        setDirty(false);
        toast.success(
          intent === "draft"
            ? "Draft saved"
            : intent === "scheduled"
              ? "Post scheduled"
              : "Post marked as published",
        );
        return { id: id! };
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
        return null;
      } finally {
        setSaving(false);
        setPublishing(false);
      }
    },
    [user, draft, navigate],
  );

  // Track unsaved changes (skip on initial load / id swap)
  useEffect(() => {
    setDirty(false);
  }, [draft.id]);

  const setPlatform = (p: Platform) => {
    setDraft((d) => ({ ...d, platform: p }));
    setDirty(true);
  };

  const setScheduledAt = (iso: string | null) => {
    setDraft((d) => ({ ...d, scheduled_at: iso }));
    setDirty(true);
  };

  const remove = async () => {
    if (!draft.id) {
      setDraft(emptyDraft(draft.platform));
      return;
    }
    const { error } = await supabase.from("posts").delete().eq("id", draft.id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Post deleted");
    navigate({ to: "/app/queue" });
  };

  const duplicate = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        platform: draft.platform,
        content: draft.content,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Duplicate failed");
      return;
    }
    toast.success("Duplicated");
    navigate({ to: "/app/compose", search: { id: data.id } });
  };

  if (authLoading || loadingDraft) {
    return <ComposeSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-10 animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Compose</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {draft.id ? "Editing" : "New post"} ·{" "}
            {saving
              ? "Saving…"
              : dirty
                ? <span className="text-warning">Unsaved changes</span>
                : "All changes saved"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                Rewrite
              </Button>
            </DropdownMenuTrigger>
            <RewriteMenu draft={draft} setDraft={setDraft} />
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => setTrendOpen(true)}>
            <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
            Trend ideas
          </Button>
          <Button size="sm" onClick={() => setAiOpen(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate
          </Button>
        </div>
      </div>

      <Tabs value={draft.platform} onValueChange={(v) => setPlatform(v as Platform)}>
        <TabsList>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="x">X</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-2 py-1.5">
          <div className="inline-flex items-center gap-0.5 rounded-md bg-background p-0.5">
            <button
              type="button"
              onClick={() => setView("write")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                view === "write"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Pencil className="h-3 w-3" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setView("preview")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                view === "preview"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>
          <span className="pr-1 text-[10px] text-muted-foreground">Markdown</span>
        </div>

        {view === "write" ? (
          <>
            <MarkdownToolbar
              onAction={(action) => {
                const el = textareaRef.current;
                if (!el) return;
                applyMarkdown(el, draft.content, action, (next) => {
                  setDraft((d) => ({ ...d, content: next }));
                  setDirty(true);
                });
              }}
            />
            <Textarea
              ref={textareaRef}
              value={draft.content}
              onChange={(e) => {
                setDraft((d) => ({ ...d, content: e.target.value }));
                setDirty(true);
              }}
              placeholder={
                draft.platform === "linkedin"
                  ? "Write a long-form post for LinkedIn — opening hook, short paragraphs, soft CTA…\n\nMarkdown supported: **bold**, *italic*, # headings, - lists, > quotes."
                  : "Say something punchy in 280 characters or less…"
              }
              className="min-h-[300px] resize-none rounded-none border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0 md:text-sm"
            />
          </>
        ) : (
          <div className="min-h-[300px] bg-muted/30 px-4 py-4">
            {draft.content.trim() ? (
              <PlatformPreview content={draft.content} platform={draft.platform} />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing to preview yet — start writing.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("tabular-nums", counterColor)}>
              {len.toLocaleString()} / {limit.toLocaleString()}
            </span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full transition-all",
                  len > limit ? "bg-destructive" : pct > 0.9 ? "bg-warning" : "bg-primary",
                )}
                style={{ width: `${Math.min(pct, 1) * 100}%` }}
              />
            </div>
            {draft.scheduled_at && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                <CalendarClock className="h-3 w-3" />
                {format(new Date(draft.scheduled_at), "MMM d · h:mm a")}
                <button
                  type="button"
                  onClick={() => setScheduledAt(null)}
                  className="ml-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear schedule"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={duplicate} disabled={!draft.content}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button variant="ghost" size="sm" onClick={remove}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
            <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" aria-hidden />
            <Button
              variant="outline"
              size="sm"
              onClick={() => save("draft")}
              disabled={saving || publishing || !draft.content.trim()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save draft
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScheduleOpen(true)}
              disabled={saving || publishing || !draft.content.trim() || !preflight.ok}
              title={!preflight.ok ? "Resolve preflight errors first" : undefined}
            >
              <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
              {draft.scheduled_at ? "Reschedule" : "Schedule"}
            </Button>
            <Button
              size="sm"
              onClick={() => save("published")}
              disabled={saving || publishing || !draft.content.trim() || !preflight.ok}
              title={!preflight.ok ? "Resolve preflight errors first" : undefined}
            >
              {publishing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Post now
            </Button>
          </div>
        </div>
      </div>

      <PreflightPanel
        platform={draft.platform}
        preflight={preflight}
        content={draft.content}
        onApplyFix={(next) => {
          setDraft((d) => ({ ...d, content: next }));
          setDirty(true);
        }}
      />

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Best times · LinkedIn: Tue–Thu 8–10am · X: Mon–Fri 12–3pm
      </p>

      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        value={draft.scheduled_at}
        saving={saving}
        onConfirm={async (iso) => {
          setScheduledAt(iso);
          const res = await save("scheduled", { scheduled_at: iso });
          if (res) setScheduleOpen(false);
        }}
      />

      <GenerateDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        platform={draft.platform}
        onPick={(content, brief, variantGroupId) => {
          setDraft((d) => ({
            ...d,
            content,
            ai_generated: true,
            source_brief: brief,
            variant_group_id: variantGroupId,
          }));
          setDirty(true);
        }}
      />
      <TrendDialog
        open={trendOpen}
        onOpenChange={setTrendOpen}
        platform={draft.platform}
        onPick={(brief) => {
          setAiOpen(true);
          // Stash brief into AI dialog via custom event
          window.dispatchEvent(new CustomEvent("sd:prefill-brief", { detail: brief }));
        }}
      />
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function PreflightPanel({
  platform,
  preflight,
  content,
  onApplyFix,
}: {
  platform: Platform;
  preflight: ReturnType<typeof runPreflight>;
  content: string;
  onApplyFix?: (next: string) => void;
}) {
  const { errors, warnings, ok } = preflight;
  const label = platform === "linkedin" ? "LinkedIn" : "X";
  const fixable = [...errors, ...warnings].filter((i) => i.fix);

  const applyAllFixes = () => {
    if (!onApplyFix) return;
    let next = content;
    for (const it of fixable) {
      if (it.fix) next = it.fix.apply(next);
    }
    onApplyFix(next);
  };

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Preflight passed for {label}.</span>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label} preflight</p>
        <div className="flex items-center gap-2">
          {onApplyFix && fixable.length > 1 && (
            <button
              type="button"
              onClick={applyAllFixes}
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Fix all ({fixable.length})
            </button>
          )}
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              ok ? "bg-warning/20 text-foreground" : "bg-destructive/15 text-destructive",
            )}
          >
            {ok
              ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`
              : `${errors.length} blocker${errors.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
      <ul className="space-y-1.5">
        {[...errors, ...warnings].map((it) => {
          const isError = it.severity === "error";
          return (
            <li
              key={it.id}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs animate-fade-in",
                isError
                  ? "border-destructive/30 bg-destructive/10"
                  : "border-warning/40 bg-warning/15",
              )}
            >
              {isError ? (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/70" />
              )}
              <div className="flex-1">
                <p className={cn("font-medium", isError && "text-destructive")}>{it.message}</p>
                {it.hint && <p className="mt-0.5 text-muted-foreground">{it.hint}</p>}
              </div>
              {it.fix && onApplyFix && (
                <button
                  type="button"
                  onClick={() => onApplyFix(it.fix!.apply(content))}
                  className="shrink-0 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {it.fix.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  value,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: string | null;
  saving: boolean;
  onConfirm: (iso: string) => void;
}) {
  const [local, setLocal] = useState<string>(value ? toLocalInput(value) : "");

  useEffect(() => {
    if (open) setLocal(value ? toLocalInput(value) : "");
  }, [open, value]);

  const minLocal = toLocalInput(new Date(Date.now() + 60_000).toISOString());
  const iso = local ? new Date(local).toISOString() : null;
  const inPast = iso ? new Date(iso).getTime() < Date.now() : false;
  const canConfirm = Boolean(iso) && !inPast && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" /> Schedule post
          </DialogTitle>
          <DialogDescription>
            Pick a date & time in your local timezone. We'll surface the post in your queue when it's ready.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dt-modal" className="text-xs text-muted-foreground">
              Date & time
            </Label>
            <Input
              id="dt-modal"
              type="datetime-local"
              value={local}
              min={minLocal}
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>
          {iso && (
            <p className={cn("text-xs", inPast ? "text-destructive" : "text-muted-foreground")}>
              {inPast
                ? "Pick a time in the future."
                : `Will publish ${format(new Date(iso), "EEE, MMM d · h:mm a")}.`}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!canConfirm}
              onClick={() => iso && onConfirm(iso)}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-1.5 h-4 w-4" />
              )}
              Confirm schedule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RewriteMenu({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
}) {
  const rewrite = useRewritePost();
  const [busy, setBusy] = useState(false);

  const run = async (action: "shorten" | "lengthen" | "casual" | "punchy" | "thread" | "hook_body") => {
    if (!draft.content.trim()) {
      toast.error("Write something first");
      return;
    }
    setBusy(true);
    try {
      const res = await rewrite({
        data: { content: draft.content, platform: draft.platform, action },
      });
      if (!res || typeof res.content !== "string") throw new Error("No content returned");
      setDraft((d) => ({ ...d, content: res.content }));
      toast.success("Rewritten");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuItem disabled={busy} onClick={() => run("shorten")}>
        Shorten
      </DropdownMenuItem>
      <DropdownMenuItem disabled={busy} onClick={() => run("lengthen")}>
        Lengthen
      </DropdownMenuItem>
      <DropdownMenuItem disabled={busy} onClick={() => run("casual")}>
        More casual
      </DropdownMenuItem>
      <DropdownMenuItem disabled={busy} onClick={() => run("punchy")}>
        Make punchier
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {draft.platform === "x" ? (
        <DropdownMenuItem disabled={busy} onClick={() => run("thread")}>
          Convert to thread
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem disabled={busy} onClick={() => run("hook_body")}>
          Hook + body
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  );
}

function GenerateDialog({
  open,
  onOpenChange,
  platform,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: Platform;
  onPick: (content: string, brief: string, variantGroupId: string | null) => void;
}) {
  const [brief, setBrief] = useState("");
  const [tone, setTone] = useState("professional");
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<string[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const generate = useGeneratePosts();

  useEffect(() => {
    const h = (e: Event) => {
      const ev = e as CustomEvent<string>;
      if (ev.detail) setBrief(ev.detail);
    };
    window.addEventListener("sd:prefill-brief", h);
    return () => window.removeEventListener("sd:prefill-brief", h);
  }, []);

  useEffect(() => {
    if (!open) {
      setVariants([]);
      setGroupId(null);
    }
  }, [open]);

  const run = async () => {
    if (!brief.trim()) return;
    setBusy(true);
    setVariants([]);
    try {
      const res = await generate({ data: { brief, tone, platform, count: 3 } });
      setVariants(res.variants);
      setGroupId(res.variantGroupId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI brief → posts
          </DialogTitle>
          <DialogDescription>
            Describe what you want to post about. We'll draft 3 {platform === "linkedin" ? "LinkedIn" : "X"} variants.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="brief" className="text-xs">
              Brief
            </Label>
            <Textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="e.g. Lessons from shipping our v1 in 6 weeks with a small team"
              className="mt-1.5 min-h-[100px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tone</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                  <SelectItem value="witty">Witty</SelectItem>
                  <SelectItem value="inspirational">Inspirational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={run} disabled={busy || !brief.trim()} className="w-full">
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    Generate 3 variants
                  </>
                )}
              </Button>
            </div>
          </div>

          {busy && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-lg border border-border bg-card shimmer" />
              ))}
            </div>
          )}

          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Pick a variant</p>
              {variants.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onPick(v, brief, groupId);
                    onOpenChange(false);
                    toast.success("Loaded into editor");
                  }}
                  className="block w-full rounded-lg border border-border bg-card p-3 text-left text-sm hover-lift hover:border-primary/50"
                >
                  <div className="line-clamp-6 whitespace-pre-wrap">{v}</div>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {v.length.toLocaleString()} chars
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrendDialog({
  open,
  onOpenChange,
  platform,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: Platform;
  onPick: (brief: string) => void;
}) {
  const [niche, setNiche] = useState("");
  const [busy, setBusy] = useState(false);
  const [ideas, setIdeas] = useState<{ hook: string; angle: string; why: string }[]>([]);
  const trend = useGenerateTrendIdeas();

  useEffect(() => {
    if (!open) setIdeas([]);
  }, [open]);

  const run = async () => {
    if (!niche.trim()) return;
    setBusy(true);
    setIdeas([]);
    try {
      const res = await trend({ data: { niche, platform } });
      setIdeas(res.ideas);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" /> Trend ideation
          </DialogTitle>
          <DialogDescription>
            Get 5 fresh post angles for your niche. Based on general patterns, not real-time data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Indie SaaS founders, AI engineering, product design"
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <Button onClick={run} disabled={busy || !niche.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suggest"}
            </Button>
          </div>
          {busy && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 rounded-lg border border-border bg-card shimmer" />
              ))}
            </div>
          )}
          {ideas.length > 0 && (
            <div className="space-y-2">
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onPick(`Hook: ${idea.hook}\nAngle: ${idea.angle}`);
                    onOpenChange(false);
                  }}
                  className="block w-full rounded-lg border border-border bg-card p-3 text-left text-sm hover-lift hover:border-primary/50"
                >
                  <p className="font-medium">{idea.hook}</p>
                  <p className="mt-1 text-muted-foreground">{idea.angle}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    <Send className="mr-1 inline h-3 w-3" />
                    {idea.why}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ComposeSkeleton() {
  return (
    <div
      className="mx-auto max-w-3xl p-6 md:p-10"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-16 rounded-md" />
      </div>

      {/* Editor card */}
      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-4 w-[40%]" />
          <div className="h-32" />
        </div>
        {/* Counter bar */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-1.5 w-24 rounded-full" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-20 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      </div>

      {/* Schedule card */}
      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      <div className="mt-3 flex justify-center">
        <Skeleton className="h-3 w-72" />
      </div>
    </div>
  );
}

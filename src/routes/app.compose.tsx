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
} from "lucide-react";
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
import { PLATFORM_LIMITS, type Platform } from "@/lib/platform";
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

function Compose() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const params = useSearch({ from: "/app/compose" });
  const [draft, setDraft] = useState<Draft>(emptyDraft(params.platform ?? "linkedin"));
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(Boolean(params.id));
  const initial = useRef(true);
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

  const save = useCallback(
    async (overrides?: Partial<Draft>) => {
      if (!user) return;
      setSaving(true);
      const merged = { ...draft, ...overrides };
      const payload = {
        user_id: user.id,
        platform: merged.platform,
        content: merged.content,
        scheduled_at: merged.scheduled_at,
        ai_generated: merged.ai_generated,
        source_brief: merged.source_brief,
        variant_group_id: merged.variant_group_id,
        status: (merged.scheduled_at ? "scheduled" : "draft") as
          | "draft"
          | "scheduled"
          | "ready"
          | "published"
          | "failed",
      };
      try {
        if (merged.id) {
          const { error } = await supabase.from("posts").update(payload).eq("id", merged.id);
          if (error) throw error;
          toast.success("Saved");
        } else {
          const { data, error } = await supabase
            .from("posts")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw error;
          setDraft((d) => ({ ...d, ...overrides, id: data.id }));
          navigate({ to: "/app/compose", search: { id: data.id }, replace: true });
          toast.success("Draft saved");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [user, draft, navigate],
  );

  // Auto-save on idle (skip first render)
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (!draft.content.trim()) return;
    const t = setTimeout(() => {
      save();
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.content, draft.platform, draft.scheduled_at]);

  const setPlatform = (p: Platform) => setDraft((d) => ({ ...d, platform: p }));

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
            {draft.id ? "Editing" : "New post"} · {saving ? "Saving…" : "Auto-saved"}
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

      <div className="mt-4 rounded-xl border border-border bg-card">
        <Textarea
          value={draft.content}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
          placeholder={
            draft.platform === "linkedin"
              ? "Write a long-form post for LinkedIn — opening hook, short paragraphs, soft CTA…"
              : "Say something punchy in 280 characters or less…"
          }
          className="min-h-[300px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
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
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={duplicate} disabled={!draft.content}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button variant="ghost" size="sm" onClick={remove}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Schedule</Label>
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {draft.scheduled_at ? (
              format(new Date(draft.scheduled_at), "EEE, MMM d · h:mm a")
            ) : (
              <span className="text-muted-foreground">Not scheduled</span>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dt" className="text-xs text-muted-foreground">
            Date & time (your local timezone)
          </Label>
          <Input
            id="dt"
            type="datetime-local"
            value={draft.scheduled_at ? toLocalInput(draft.scheduled_at) : ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
              }))
            }
          />
        </div>
        <Button onClick={() => save()} disabled={saving || !draft.content.trim()}>
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
          Save
        </Button>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Best times · LinkedIn: Tue–Thu 8–10am · X: Mon–Fri 12–3pm
      </p>

      <GenerateDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        platform={draft.platform}
        onPick={(content, brief, variantGroupId) =>
          setDraft((d) => ({
            ...d,
            content,
            ai_generated: true,
            source_brief: brief,
            variant_group_id: variantGroupId,
          }))
        }
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

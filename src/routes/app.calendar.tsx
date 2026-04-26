import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLATFORM_LABEL, type Platform } from "@/lib/platform";

export const Route = createFileRoute("/app/calendar")({
  component: CalendarPage,
});

type PostRow = {
  id: string;
  platform: Platform;
  content: string;
  status: string;
  scheduled_at: string;
};

function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const range = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    const days: Date[] = [];
    let d = start;
    while (d <= end) {
      days.push(d);
      d = addDays(d, 1);
    }
    return { start, end, days };
  }, [cursor]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("posts")
      .select("id, platform, content, status, scheduled_at")
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", range.start.toISOString())
      .lte("scheduled_at", range.end.toISOString())
      .order("scheduled_at");
    if (!error && data) setPosts(data as PostRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, range.start.getTime(), range.end.getTime()]);

  const drop = async (day: Date) => {
    if (!dragId) return;
    const orig = posts.find((p) => p.id === dragId);
    if (!orig) return;
    const oldDt = new Date(orig.scheduled_at);
    const newDt = new Date(day);
    newDt.setHours(oldDt.getHours(), oldDt.getMinutes(), 0, 0);
    setPosts((prev) =>
      prev.map((p) => (p.id === dragId ? { ...p, scheduled_at: newDt.toISOString() } : p)),
    );
    setDragId(null);
    const { error } = await supabase
      .from("posts")
      .update({ scheduled_at: newDt.toISOString(), status: "scheduled" })
      .eq("id", dragId);
    if (error) {
      toast.error("Reschedule failed");
      load();
    } else {
      toast.success(`Moved to ${format(newDt, "MMM d, h:mm a")}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Drag posts between days to reschedule.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => subMonths(c, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[10ch] text-center text-sm font-medium">
            {format(cursor, "MMMM yyyy")}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>
      </div>

      {/* Horizontal scroller on small screens so the 7-day grid stays usable */}
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <div className="min-w-[640px] overflow-hidden rounded-xl border border-border bg-card sm:min-w-0">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="p-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 grid-rows-6">
            {range.days.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const today = isSameDay(day, new Date());
              const dayPosts = posts.filter((p) => isSameDay(new Date(p.scheduled_at), day));
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={(e) => {
                    if (dragId) e.preventDefault();
                  }}
                  onDrop={() => drop(day)}
                  className={cn(
                    "min-h-[100px] border-b border-r border-border p-1.5 transition-colors",
                    !inMonth && "bg-muted/20",
                    dragId && "hover:bg-accent/40",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between px-1">
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        today && "bg-primary text-primary-foreground font-medium",
                        !today && (inMonth ? "text-foreground" : "text-muted-foreground"),
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        draggable
                        onDragStart={() => setDragId(p.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => navigate({ to: "/app/compose", search: { id: p.id } })}
                        className={cn(
                          "block w-full cursor-grab truncate rounded px-1.5 py-1 text-left text-[11px] transition-opacity active:cursor-grabbing active:opacity-60",
                          p.platform === "linkedin"
                            ? "bg-linkedin/15 text-linkedin"
                            : "bg-x-platform/15 text-x-platform",
                        )}
                        title={`${PLATFORM_LABEL[p.platform]} · ${format(new Date(p.scheduled_at), "h:mm a")}`}
                      >
                        <span className="opacity-70">{format(new Date(p.scheduled_at), "h:mma")}</span>{" "}
                        {p.content || "(empty)"}
                      </button>
                    ))}
                    {dayPosts.length > 3 && (
                      <div className="px-1.5 text-[10px] text-muted-foreground">
                        +{dayPosts.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

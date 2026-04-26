import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

type Props = {
  items: readonly NavItem[];
  currentPath: string;
};

function isActive(item: NavItem, path: string) {
  return item.exact ? path === item.to : path.startsWith(item.to);
}

/**
 * Responsive top-nav that progressively collapses items into a "More"
 * overflow menu when there isn't enough horizontal space. Uses real-DOM
 * measurements via ResizeObserver — no hard-coded breakpoints.
 */
export function AppNav({ items, currentPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const moreRef = useRef<HTMLButtonElement>(null);

  const [visibleCount, setVisibleCount] = useState(items.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const widths = itemRefs.current.map((el) => (el ? el.offsetWidth : 0));
      const moreWidth = moreRef.current?.offsetWidth ?? 0;
      const gap = 4; // gap-1
      const available = container.clientWidth;

      // Fit-all check
      const totalAll = widths.reduce(
        (sum, w, i) => sum + w + (i > 0 ? gap : 0),
        0,
      );
      if (totalAll <= available) {
        setVisibleCount(items.length);
        return;
      }

      // Reserve room for the More button + its gap
      let used = moreWidth + gap;
      let count = 0;
      for (let i = 0; i < widths.length; i++) {
        const next = used + widths[i] + (i > 0 ? gap : 0);
        if (next > available) break;
        used = next;
        count++;
      }
      setVisibleCount(count);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items]);

  const visibleItems = items.slice(0, visibleCount);
  const overflowItems = items.slice(visibleCount);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 items-center justify-center"
    >
      {/* Hidden measurement row — full-size copies of every nav item */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-1"
      >
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <a
              key={`measure-${item.to}`}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </a>
          );
        })}
        <button
          ref={moreRef}
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
          <span>More</span>
        </button>
      </div>

      {/* Visible nav */}
      <nav
        aria-label="Primary"
        className="flex items-center justify-center gap-1"
      >
        {visibleItems.map((item) => {
          const active = isActive(item, currentPath);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {overflowItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`More navigation (${overflowItems.length} item${overflowItems.length === 1 ? "" : "s"})`}
                className={cn(
                  "inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  overflowItems.some((i) => isActive(i, currentPath))
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              {overflowItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item, currentPath);
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "cursor-pointer",
                        active && "bg-accent text-accent-foreground",
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </nav>
    </div>
  );
}

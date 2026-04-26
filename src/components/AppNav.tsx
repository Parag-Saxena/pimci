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
 * Responsive top-nav: shows all items inline when they fit, otherwise
 * collapses the entire nav into a single hamburger menu. Uses real-DOM
 * measurement via ResizeObserver — no hard-coded breakpoints.
 */
export function AppNav({ items, currentPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const widths = itemRefs.current.map((el) => (el ? el.offsetWidth : 0));
      const gap = 4; // gap-1
      const totalAll = widths.reduce(
        (sum, w, i) => sum + w + (i > 0 ? gap : 0),
        0,
      );
      // Small safety buffer so we don't toggle right at the edge
      setCollapsed(totalAll > container.clientWidth - 8);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [items]);

  const showInline = !collapsed;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 items-center justify-center"
    >
      {/* Hidden measurement row — full-size copies of every nav item */}
      <div
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
      </div>

      {/* Visible nav — inline OR collapsed into a single hamburger */}
      {showInline ? (
        <nav
          aria-label="Primary"
          className="flex items-center justify-center gap-1"
        >
          {items.map((item) => {
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
        </nav>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Open navigation menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            {items.map((item) => {
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
    </div>
  );
}

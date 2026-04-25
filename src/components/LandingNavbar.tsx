import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Layers,
  Menu,
  X,
  Sparkles,
  LayoutGrid,
  PlayCircle,
  Workflow,
  MessageSquareQuote,
  BarChart3,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { id: "features", label: "Features", href: "#features", icon: LayoutGrid },
  { id: "demo", label: "Demo", href: "#demo", icon: PlayCircle },
  { id: "how", label: "How it works", href: "#how", icon: Workflow },
  { id: "testimonials", label: "Loved by", href: "#testimonials", icon: MessageSquareQuote },
  { id: "stats", label: "Stats", href: "#stats", icon: BarChart3 },
];

const SCROLL_THRESHOLD = 100;
const THROTTLE_MS = 16;

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string>("features");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastRun = useRef(0);

  // Throttled scroll handler — toggles glass state + tracks active section
  useEffect(() => {
    const handleScroll = () => {
      const now = performance.now();
      if (now - lastRun.current < THROTTLE_MS) return;
      lastRun.current = now;

      setScrolled(window.scrollY > SCROLL_THRESHOLD);

      // Active section detection — pick the section whose top is closest to 1/3 viewport
      const probe = window.innerHeight / 3;
      let closestId = NAV_ITEMS[0].id;
      let closestDist = Infinity;
      for (const item of NAV_ITEMS) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - probe);
        if (rect.top - probe <= 0 && dist < closestDist) {
          closestDist = dist;
          closestId = item.id;
        }
      }
      setActiveId(closestId);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  // Close drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileOpen(false);
    }
  };

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 flex justify-center pointer-events-none"
        role="banner"
        style={{ willChange: "transform" }}
      >
        {/* Inner shell — only transform/opacity/background animate. Width stays constant to avoid layout. */}
        <div
          className={cn(
            "pointer-events-auto relative mt-0 w-full max-w-7xl origin-top",
            "transition-[transform,background-color,backdrop-filter,border-color,box-shadow,border-radius,margin-top] duration-[380ms] ease-out",
            "border",
            scrolled
              ? "mt-3 scale-[0.92] rounded-full border-border/60 bg-background/75 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]"
              : "scale-100 rounded-none border-transparent bg-transparent",
          )}
          style={{ willChange: "transform, background-color" }}
        >
        <div
          className="mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6"
        >
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Pimci home"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="hidden font-semibold tracking-tight sm:inline-block">Pimci</span>
          </Link>

          {/* Center pill nav — tablet (icons) + desktop (icons + text) */}
          <nav
            aria-label="Primary"
            className="hidden md:flex"
            onMouseLeave={() => setHoveredId(null)}
          >
            <ul
              className={cn(
                "relative flex items-center gap-1 rounded-full border p-1 transition-colors duration-300",
                scrolled
                  ? "border-border/60 bg-background/60 backdrop-blur-md"
                  : "border-border/40 bg-background/30 backdrop-blur",
              )}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeId === item.id;
                const isHovered = hoveredId === item.id;
                const showHighlight = isHovered || (!hoveredId && isActive);
                const Icon = item.icon;
                return (
                  <li key={item.id} className="relative">
                    <a
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.id)}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onFocus={() => setHoveredId(item.id)}
                      onBlur={() => setHoveredId(null)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "relative z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive || isHovered
                          ? "text-foreground"
                          : "text-foreground/60 hover:text-foreground",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "h-4 w-4 transition-[color,opacity,transform] duration-150",
                          isActive ? "text-[color:var(--linkedin)]" : "opacity-80",
                        )}
                      />
                      <span className="hidden lg:inline">{item.label}</span>
                    </a>
                    {showHighlight && (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 -z-0 rounded-full bg-foreground/10 motion-safe:animate-[scale-in_0.18s_ease-out]"
                        style={{
                          transitionProperty: "transform, opacity",
                          transitionDuration: "260ms",
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="GitHub"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link to="/auth" className="hidden lg:inline-flex">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" } as never} className="hidden md:inline-flex">
              <Button
                size="sm"
                className="bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-transform"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Get In Touch
              </Button>
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Header is fixed/floating — hero owns its own top spacing, no spacer needed */}


      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity duration-300",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Panel */}
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className={cn(
            "absolute left-3 right-3 top-20 origin-top rounded-2xl border border-border/60 bg-background/85 p-4 shadow-xl backdrop-blur-xl transition-[opacity,transform] duration-300 ease-out",
            mobileOpen ? "opacity-100 scale-100" : "opacity-0 scale-95",
          )}
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-foreground/10 text-foreground"
                        : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isActive ? "text-[color:var(--linkedin)]" : "opacity-80",
                      )}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
            <Link to="/auth" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-center">
                Sign in
              </Button>
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" } as never}
              onClick={() => setMobileOpen(false)}
            >
              <Button
                size="sm"
                className="w-full justify-center bg-foreground text-background hover:bg-foreground/90"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Get In Touch
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

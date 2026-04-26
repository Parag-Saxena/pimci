import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Calendar,
  LayoutDashboard,
  ListChecks,
  Settings,
  Layers,
  PenSquare,
  LogOut,
  
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/app")({
  component: AppShell,
});

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/compose", label: "Compose", icon: PenSquare, exact: false },
  { to: "/app/calendar", label: "Calendar", icon: Calendar, exact: false },
  { to: "/app/queue", label: "Library", icon: ListChecks, exact: false },
] as const;

function AppShell() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { dark, toggle: toggleTheme } = useThemeToggle();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <AppShellSkeleton />;
  }

  const initials = (user.user_metadata?.display_name || user.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const username =
    user.user_metadata?.display_name || user.email?.split("@")[0] || "Account";

  const handleSignOut = () => {
    signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top navbar — elevated */}
      <header className="sticky top-3 z-30 mx-3 flex h-14 items-center gap-3 rounded-xl border border-border bg-background/80 px-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Left: logo */}
        <Link
          to="/app"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Pimci home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-semibold tracking-tight">Pimci</span>
        </Link>

        {/* Center: nav */}
        <nav
          aria-label="Primary"
          className="flex flex-1 items-center justify-center gap-1"
        >
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
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
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: avatar-only account dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-ring/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Account menu for ${username}`}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end" className="w-64">
            {/* Header row: avatar+name on left, theme toggle SVG on right */}
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{username}</div>
                <div className="truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {dark ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden px-3 pb-3 pt-3">
        <div
          tabIndex={-1}
          className={cn(
            "group/card h-full w-full overflow-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl outline-none ring-0",
            "transition-[transform,box-shadow] duration-300 ease-out will-change-transform",
            "hover:-translate-y-0.5 hover:shadow-2xl",
            "focus-within:-translate-y-0.5 focus-within:shadow-2xl focus-within:ring-2 focus-within:ring-ring/40",
            "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0",
          )}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background" aria-busy="true" aria-live="polite">
      {/* Top navbar skeleton */}
      <header className="sticky top-3 z-30 mx-3 flex h-14 items-center gap-3 rounded-xl border border-border bg-background px-4 shadow-lg">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      {/* Main skeleton */}
      <main className="flex-1 overflow-hidden px-3 pb-3 pt-3">
        <div className="h-full overflow-auto rounded-xl border border-border bg-card p-6 shadow-xl">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="mb-3 h-3 w-20" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

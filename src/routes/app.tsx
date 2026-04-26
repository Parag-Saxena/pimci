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
  ChevronsUpDown,
  UserCircle,
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
  DropdownMenuLabel,
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
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — sticky */}
      <aside className="sticky top-0 z-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <Link
          to="/app"
          className="flex h-14 items-center gap-2 border-b border-border px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
          aria-label="Pimci home"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-semibold tracking-tight">Pimci</span>
        </Link>

        <nav aria-label="Primary" className="flex-1 space-y-0.5 px-3 py-4">
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Account menu for ${username}`}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{username}</div>
                </div>
                <ChevronsUpDown
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.user_metadata?.avatar_url} alt="" />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{username}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/settings" className="cursor-pointer">
                  <UserCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/app/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  toggleTheme();
                }}
                className="cursor-pointer"
              >
                {dark ? (
                  <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {dark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile bottom nav */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background md:hidden"
        >
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="relative z-10 flex-1 overflow-hidden pb-16 md:pb-0">
          <div
            tabIndex={-1}
            className={cn(
              "group/card h-full overflow-auto rounded-xl border border-border bg-card text-card-foreground shadow-xl outline-none ring-0",
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
    </div>
  );
}

function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background" aria-busy="true" aria-live="polite">
      {/* Sidebar skeleton */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-4 w-24" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-md px-3 py-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2.5 w-28" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-hidden pb-16 md:pb-0">
          <div className="h-full overflow-auto rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <Skeleton className="mb-3 h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  Sparkles,
  PencilLine,
  Layers,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">SocialDeck</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--color-primary) 14%, transparent), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-4xl px-6 pb-20 pt-24 text-center sm:pt-32">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              AI-assisted writing for LinkedIn & X
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              The calm workspace for{" "}
              <span className="bg-gradient-to-br from-primary to-[oklch(0.65_0.18_310)] bg-clip-text text-transparent">
                social posts
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Draft, AI-generate, and schedule posts for LinkedIn and X — from one minimal,
              keyboard-friendly composer.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link to="/auth" search={{ mode: "signup" }}>
                <Button size="lg" className="group">
                  Start writing free
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="ghost">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<PencilLine className="h-5 w-5" />}
              title="Per-platform composer"
              body="Side-by-side editor with live character counters and platform-aware formatting."
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title="AI brief → posts"
              body="Turn a topic and tone into 3 polished variants tailored to each platform."
            />
            <Feature
              icon={<Calendar className="h-5 w-5" />}
              title="Schedule on a calendar"
              body="Drop posts onto a calendar, color-coded by platform. Drag to reschedule."
            />
            <Feature
              icon={<Layers className="h-5 w-5" />}
              title="Trend ideation"
              body="Get 5 fresh post angles for any niche to break through writer's block."
            />
            <Feature
              icon={<Clock className="h-5 w-5" />}
              title="Best-time hints"
              body="Suggested time windows per platform so your posts hit at peak attention."
            />
            <Feature
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Ready-to-publish queue"
              body="One-click copy and open the platform — no integrations required to ship."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 pb-28 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Ship your next 30 posts.</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Stop spending mornings staring at an empty box. Start with a brief, end with a queue.
          </p>
          <div className="mt-7">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg">
                Create your free account
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} SocialDeck</span>
          <span>Built with Lovable</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-card p-6 transition-colors hover:bg-card/70">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

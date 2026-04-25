import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Calendar,
  Sparkles,
  PencilLine,
  Layers,
  Clock,
  CheckCircle2,
  Zap,
  BarChart3,
  Wand2,
  Send,
  Quote,
  Twitter,
  Linkedin,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/LandingNavbar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pimci — AI post composer & scheduler for LinkedIn and X" },
      {
        name: "description",
        content:
          "Pimci is the calm workspace to draft, AI-generate, schedule and publish posts to LinkedIn and X — from one minimal composer.",
      },
      { property: "og:title", content: "Pimci — AI post composer & scheduler" },
      {
        property: "og:description",
        content:
          "Draft, AI-generate and schedule LinkedIn and X posts from one minimal workspace.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <main>
        <Hero />
        <BentoSection />
        <DemoVideoSection />
        <HowItWorksParallax />
        <TestimonialsSection />
        <StatsSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

/* ----------------------------------------------------------------- Header */
// Header replaced by <LandingNavbar />.

/* ------------------------------------------------------------------- Hero */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Shader backdrop */}
      <div className="absolute inset-0 -z-10 shader-mesh" />
      <div className="shader-grain -z-10" />
      <div
        className="absolute inset-x-0 -top-40 -z-10 h-[420px] opacity-60 blur-3xl"
        aria-hidden
      >
        <div className="conic-sweep mx-auto h-full max-w-3xl rounded-full" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-20 sm:pt-28 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:pb-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            AI-assisted writing for LinkedIn & X
          </div>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
            The calm workspace for{" "}
            <span className="bg-gradient-to-br from-primary via-[oklch(0.7_0.12_200)] to-[oklch(0.65_0.18_310)] bg-clip-text text-transparent">
              social posts
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Pimci turns a one-line brief into ready-to-publish posts. Draft, generate, schedule
            and ship — without the tab-switching tax.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" className="group">
                Start writing free
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="ghost">Watch demo</Button>
            </a>
          </div>
          <div className="mt-8 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Free forever tier
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              LinkedIn & X
            </span>
          </div>
        </div>

        <HeroSVG />
      </div>
    </section>
  );
}

function HeroSVG() {
  return (
    <div className="relative">
      <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px] rounded-md border border-border bg-card/80 p-5 shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--color-primary)_30%,transparent)] backdrop-blur-xl">
        <svg
          viewBox="0 0 520 420"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Animated illustration of composing and scheduling a post"
        >
          {/* Composer card */}
          <g>
            <rect x="20" y="20" width="300" height="170" rx="6" className="fill-[var(--color-muted)] stroke-[var(--color-border)]" strokeWidth="1.2" />
            <rect x="36" y="40" width="80" height="10" rx="2" className="fill-[var(--color-primary)]" opacity="0.85" />
            <rect x="36" y="60" width="260" height="6" rx="2" className="fill-[var(--color-foreground)]" opacity="0.18" />
            <rect x="36" y="74" width="220" height="6" rx="2" className="fill-[var(--color-foreground)]" opacity="0.18" />
            <rect x="36" y="88" width="180" height="6" rx="2" className="fill-[var(--color-foreground)]" opacity="0.18" />
            {/* Typing line */}
            <line
              x1="36" y1="112" x2="256" y2="112"
              className="stroke-[var(--color-primary)] draw-line"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="262" cy="112" r="3.5" className="fill-[var(--color-primary)] pulse-dot" />
            {/* Toolbar */}
            <g transform="translate(36 140)">
              <rect width="48" height="22" rx="4" className="fill-[var(--color-card)] stroke-[var(--color-border)]" strokeWidth="1" />
              <rect x="56" width="48" height="22" rx="4" className="fill-[var(--color-card)] stroke-[var(--color-border)]" strokeWidth="1" />
              <rect x="200" width="60" height="22" rx="4" className="fill-[var(--color-primary)]" />
              <text x="230" y="15" textAnchor="middle" className="fill-[var(--color-primary-foreground)]" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600">
                Generate
              </text>
            </g>
          </g>

          {/* Calendar tile */}
          <g className="float-y">
            <rect x="350" y="40" width="150" height="110" rx="6" className="fill-[var(--color-card)] stroke-[var(--color-border)]" strokeWidth="1.2" />
            <rect x="350" y="40" width="150" height="22" rx="6" className="fill-[var(--color-primary)]" />
            <text x="425" y="56" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" className="fill-[var(--color-primary-foreground)]">
              Tue · 9:00 AM
            </text>
            {/* Mini calendar grid */}
            {Array.from({ length: 21 }).map((_, i) => {
              const col = i % 7;
              const row = Math.floor(i / 7);
              const isHi = i === 9;
              return (
                <rect
                  key={i}
                  x={358 + col * 19}
                  y={72 + row * 22}
                  width="14"
                  height="14"
                  rx="2"
                  className={isHi ? "fill-[var(--color-accent)]" : "fill-[var(--color-muted)]"}
                />
              );
            })}
          </g>

          {/* Arrow connector */}
          <path
            d="M320 110 C 340 110, 340 95, 350 95"
            className="stroke-[var(--color-primary)]"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="3 3"
          />

          {/* LinkedIn post preview */}
          <g>
            <rect x="20" y="220" width="240" height="170" rx="6" className="fill-[var(--color-card)] stroke-[var(--color-border)]" strokeWidth="1.2" />
            <circle cx="44" cy="244" r="12" className="fill-[var(--color-linkedin)]" />
            <text x="44" y="248" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif" className="fill-white">in</text>
            <rect x="64" y="238" width="90" height="6" rx="2" className="fill-[var(--color-foreground)]" opacity="0.7" />
            <rect x="64" y="250" width="60" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.3" />
            <rect x="36" y="276" width="208" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            <rect x="36" y="288" width="180" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            <rect x="36" y="300" width="200" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            <rect x="36" y="312" width="120" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            <g transform="translate(36 340)">
              <rect width="60" height="22" rx="11" className="fill-[var(--color-success)]" opacity="0.18" />
              <circle cx="14" cy="11" r="4" className="fill-[var(--color-success)]" />
              <text x="34" y="15" fontSize="10" fontFamily="Inter, sans-serif" fontWeight="600" className="fill-[var(--color-success)]">
                Posted
              </text>
            </g>
          </g>

          {/* X post preview */}
          <g className="float-y" style={{ animationDelay: "0.6s" }}>
            <rect x="290" y="200" width="210" height="190" rx="6" className="fill-[var(--color-card)] stroke-[var(--color-border)]" strokeWidth="1.2" />
            <rect x="306" y="216" width="22" height="22" rx="4" className="fill-[var(--color-x-platform)]" />
            <text x="317" y="232" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif" className="fill-white">𝕏</text>
            <rect x="336" y="220" width="80" height="6" rx="2" className="fill-[var(--color-foreground)]" opacity="0.7" />
            <rect x="336" y="232" width="50" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.3" />
            <rect x="306" y="258" width="178" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            <rect x="306" y="270" width="160" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            <rect x="306" y="282" width="170" height="5" rx="2" className="fill-[var(--color-foreground)]" opacity="0.22" />
            {/* Char meter */}
            <g transform="translate(306 320)">
              <rect width="178" height="6" rx="3" className="fill-[var(--color-muted)]" />
              <rect width="120" height="6" rx="3" className="fill-[var(--color-primary)]" />
              <text x="178" y="22" textAnchor="end" fontSize="10" fontFamily="Inter, sans-serif" className="fill-[var(--color-muted-foreground)]">
                212/280
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- Bento */

function BentoSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="text-sm font-medium text-primary">Everything you need</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          One workspace. Less switching. Better posts.
        </h2>
        <p className="mt-3 text-muted-foreground">
          A focused toolkit for people who post for a living — and people who really should.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:auto-rows-[minmax(180px,auto)]">
        <BentoCard className="md:col-span-4 md:row-span-2 group relative overflow-hidden">
          <div className="relative z-10 flex h-full flex-col">
            <BentoHeader icon={<Wand2 className="h-4 w-4" />} title="Brief → 3 polished posts" />
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              A topic and a tone is enough. Pimci writes platform-aware variants you can ship in a click.
            </p>
            <div className="mt-6 grid flex-1 grid-cols-3 gap-2">
              {["Hook-first", "Story-led", "Punchy thread"].map((t, i) => (
                <div
                  key={t}
                  className="relative overflow-hidden rounded-md border border-border bg-background/60 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  <div className="text-[10px] font-medium uppercase tracking-wider text-primary">Variant {i + 1}</div>
                  <div className="mt-1 text-xs font-medium">{t}</div>
                  <div className="mt-3 space-y-1">
                    <div className="h-1.5 w-full rounded bg-foreground/10" />
                    <div className="h-1.5 w-4/5 rounded bg-foreground/10" />
                    <div className="h-1.5 w-3/5 rounded bg-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
            <div className="conic-sweep h-full w-full blur-3xl" />
          </div>
        </BentoCard>

        <BentoCard className="md:col-span-2 group">
          <BentoHeader icon={<PencilLine className="h-4 w-4" />} title="Per-platform composer" />
          <p className="mt-2 text-sm text-muted-foreground">
            Live counters and platform-aware formatting, side by side.
          </p>
          <div className="mt-4">
            <CounterMeter />
          </div>
        </BentoCard>

        <BentoCard className="md:col-span-2 group">
          <BentoHeader icon={<Calendar className="h-4 w-4" />} title="Calendar scheduling" />
          <p className="mt-2 text-sm text-muted-foreground">Drag to reschedule. Color by platform.</p>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {Array.from({ length: 21 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-[3px] transition-colors duration-300 ${
                  [4, 9, 13, 17].includes(i)
                    ? "bg-primary"
                    : [6, 11].includes(i)
                      ? "bg-accent"
                      : "bg-muted group-hover:bg-muted/70"
                }`}
              />
            ))}
          </div>
        </BentoCard>

        <BentoCard className="md:col-span-2 group">
          <BentoHeader icon={<Sparkles className="h-4 w-4" />} title="Trend ideation" />
          <p className="mt-2 text-sm text-muted-foreground">
            Five fresh post angles for any niche, instantly.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
            {["Counterintuitive take", "Behind the scenes", "Controversial frame", "Numbers story", "Lessons learned"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-primary" />
                <span className="transition-colors group-hover:text-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </BentoCard>

        <BentoCard className="md:col-span-2 group">
          <BentoHeader icon={<Clock className="h-4 w-4" />} title="Best-time hints" />
          <p className="mt-2 text-sm text-muted-foreground">
            Post-time windows tuned per platform.
          </p>
          <div className="mt-5 flex h-10 items-end gap-1">
            {[20, 35, 28, 60, 92, 80, 45, 30, 22, 18, 26, 40].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/80 transition-all duration-500 group-hover:bg-primary"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </BentoCard>

        <BentoCard className="md:col-span-2 group">
          <BentoHeader icon={<CheckCircle2 className="h-4 w-4" />} title="Ready-to-publish queue" />
          <p className="mt-2 text-sm text-muted-foreground">
            One-click copy + open platform. No integrations required.
          </p>
          <div className="mt-4 space-y-1.5">
            {["LinkedIn · 9:00 AM", "X · 11:30 AM", "LinkedIn · 4:00 PM"].map((t) => (
              <div
                key={t}
                className="flex items-center justify-between rounded-sm border border-border bg-background/60 px-2.5 py-1.5 text-xs transition-all hover:border-primary/40"
              >
                <span>{t}</span>
                <Send className="h-3 w-3 text-primary" />
              </div>
            ))}
          </div>
        </BentoCard>
      </div>
    </section>
  );
}

function BentoCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md border border-border bg-card p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_20px_60px_-30px_color-mix(in_oklab,var(--color-primary)_40%,transparent)] ${className}`}
    >
      {children}
    </div>
  );
}

function BentoHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent text-accent-foreground transition-transform duration-300 group-hover:rotate-[-6deg]">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function CounterMeter() {
  const [n, setN] = useState(120);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= 268 ? 120 : v + 4)), 80);
    return () => clearInterval(id);
  }, []);
  const pct = Math.min(100, (n / 280) * 100);
  const color = n < 240 ? "bg-primary" : n < 270 ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>X</span>
        <span>{n}/280</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Demo video */

function DemoVideoSection() {
  return (
    <section id="demo" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-medium text-primary">See it in motion</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Two minutes. One workflow you'll keep.
        </h2>
      </div>
      <div className="relative">
        <div className="absolute -inset-4 -z-10 rounded-md bg-gradient-to-br from-primary/20 via-accent/20 to-transparent blur-2xl" aria-hidden />
        <div className="relative overflow-hidden rounded-md border border-border bg-card p-2 shadow-[0_30px_80px_-40px_color-mix(in_oklab,var(--color-primary)_40%,transparent)]">
          <div className="relative aspect-video w-full overflow-hidden rounded-sm bg-muted">
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1"
              title="Pimci product demo"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- How it works */

function HowItWorksParallax() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = rect.height - vh;
        const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
        setProgress(passed / Math.max(total, 1));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Three stages: 0–0.33 compose, 0.33–0.66 schedule, 0.66–1 publish
  const stage = progress < 0.34 ? 0 : progress < 0.67 ? 1 : 2;

  const stages = [
    { icon: <PencilLine className="h-4 w-4" />, label: "01 · Compose", title: "Write or generate", body: "Type a brief or paste a draft. Pimci handles platform formatting and tone." },
    { icon: <Calendar className="h-4 w-4" />, label: "02 · Schedule", title: "Drop on a calendar", body: "Pick a slot or accept a best-time hint. Drag to reshuffle when life happens." },
    { icon: <Send className="h-4 w-4" />, label: "03 · Publish", title: "Ship to LinkedIn", body: "When the slot hits, your post is queued and ready — copy, open, done." },
  ];

  return (
    <section id="how" ref={sectionRef} className="relative" style={{ height: "260vh" }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          {/* Text rail */}
          <div className="relative">
            <p className="text-sm font-medium text-primary">How Pimci works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              From blank box to published post.
            </h2>
            <div className="mt-10 space-y-8">
              {stages.map((s, i) => {
                const active = stage === i;
                return (
                  <div
                    key={s.title}
                    className={`relative rounded-md border-l-2 pl-5 transition-all duration-500 ${
                      active ? "border-primary opacity-100" : "border-border/60 opacity-40"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-accent text-accent-foreground">
                        {s.icon}
                      </span>
                      {s.label}
                    </div>
                    <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Parallax stage */}
          <div className="relative h-[460px]">
            <ParallaxStage progress={progress} stage={stage} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ParallaxStage({ progress, stage }: { progress: number; stage: number }) {
  // Layer offsets with different speeds
  const slow = progress * -40;
  const mid = progress * -90;
  const fast = progress * -160;

  return (
    <div className="relative mx-auto h-full w-full max-w-md">
      <div
        className="absolute inset-0 -z-10 rounded-md bg-gradient-to-br from-primary/15 via-accent/15 to-transparent blur-2xl"
        style={{ transform: `translateY(${slow}px)` }}
      />
      {/* Composer card */}
      <div
        className={`absolute left-2 top-4 w-[78%] rounded-md border border-border bg-card p-4 shadow-lg transition-all duration-500 ${
          stage >= 0 ? "opacity-100" : "opacity-40"
        }`}
        style={{ transform: `translateY(${mid}px) ${stage > 0 ? "scale(0.96)" : ""}` }}
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <PencilLine className="h-3 w-3" />
          </span>
          Compose · LinkedIn
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="h-2 w-full rounded bg-foreground/10" />
          <div className="h-2 w-5/6 rounded bg-foreground/10" />
          <div className="h-2 w-4/6 rounded bg-foreground/10" />
          <div className="h-2 w-3/6 rounded bg-primary/70" />
        </div>
      </div>

      {/* Calendar card */}
      <div
        className={`absolute right-0 top-32 w-[60%] rounded-md border border-border bg-card p-4 shadow-xl transition-all duration-500 ${
          stage >= 1 ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"
        }`}
        style={{ transform: `translateY(${fast}px) ${stage >= 1 ? "translateX(0)" : "translateX(24px)"}` }}
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm bg-accent text-accent-foreground">
            <Calendar className="h-3 w-3" />
          </span>
          Tue · 9:00 AM
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 21 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-[2px] ${i === 9 ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {/* LinkedIn published card */}
      <div
        className={`absolute bottom-2 left-6 w-[78%] rounded-md border border-border bg-card p-4 shadow-2xl transition-all duration-700 ${
          stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
        style={{ transform: `translateY(${stage >= 2 ? slow : 24}px)` }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--color-linkedin)] text-white text-xs font-bold">
            in
          </div>
          <div>
            <div className="text-xs font-semibold">Your post · Just now</div>
            <div className="text-[10px] text-muted-foreground">LinkedIn · Public</div>
          </div>
          <div className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
            <CheckCircle2 className="h-3 w-3" /> Posted
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="h-2 w-full rounded bg-foreground/10" />
          <div className="h-2 w-11/12 rounded bg-foreground/10" />
          <div className="h-2 w-9/12 rounded bg-foreground/10" />
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Testimonials */

const TESTIMONIALS = [
  { name: "Maya Chen", role: "Founder, Northwind", body: "Pimci killed my Sunday-night posting dread. I queue 10 posts in 20 minutes." },
  { name: "Ryan Patel", role: "Head of Growth, Loop", body: "The variant generator alone is worth the switch. Three angles, zero blank-page panic." },
  { name: "Sofia García", role: "Indie maker", body: "Calm UI, sharp output. Feels like Linear made a posting tool." },
  { name: "Daniel Okafor", role: "Solo consultant", body: "Best-time hints + calendar = I actually post on a schedule for the first time." },
  { name: "Hana Kim", role: "DevRel, Atlas", body: "The LinkedIn↔X side-by-side view changed how I plan campaigns." },
  { name: "Liam Brooks", role: "Creator", body: "Pimci writes more like me than the AI tool I was paying $40/mo for." },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-12 max-w-2xl">
        <p className="text-sm font-medium text-primary">Loved by people who post</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Founders, creators, and growth folks ship with Pimci.
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="group relative rounded-md border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_20px_60px_-30px_color-mix(in_oklab,var(--color-primary)_30%,transparent)]"
          >
            <Quote className="absolute right-4 top-4 h-5 w-5 text-primary/30 transition-transform group-hover:scale-110" />
            <blockquote className="text-sm leading-relaxed text-foreground/90">
              "{t.body}"
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground">
                {t.name.split(" ").map((p) => p[0]).join("")}
              </div>
              <div>
                <div className="text-sm font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Marquee logos */}
      <div className="marquee-pause mt-14 overflow-hidden border-y border-border py-6">
        <div className="marquee-track flex items-center gap-12 text-sm font-semibold text-muted-foreground">
          {[...Array(2)].flatMap((_, k) =>
            ["Northwind", "LoopHQ", "Atlas", "Vercel-ish", "Sundial", "Forge", "Mosaic", "Helix"].map((n) => (
              <span key={`${k}-${n}`} className="whitespace-nowrap opacity-70 transition-opacity hover:opacity-100">
                {n}
              </span>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Stats */

const STATS = [
  { label: "Posts shipped", value: 412000, suffix: "+" },
  { label: "Avg time saved / week", value: 6, suffix: "h" },
  { label: "Active creators", value: 14000, suffix: "+" },
  { label: "Customer rating", value: 4.9, suffix: "/5", decimals: 1 },
];

function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && setShown(true)),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="stats" ref={ref} className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-card px-6 py-10 text-center">
            <div className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              <CountUp to={s.value} active={shown} decimals={s.decimals ?? 0} />
              <span className="text-primary">{s.suffix}</span>
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CountUp({ to, active, decimals = 0 }: { to: number; active: boolean; decimals?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(to * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, to]);
  const formatted =
    to >= 1000
      ? Math.round(n).toLocaleString()
      : n.toFixed(decimals);
  return <span>{formatted}</span>;
}

/* -------------------------------------------------------------- Final CTA */

function FinalCTA() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="relative overflow-hidden rounded-md border border-border bg-card p-10 text-center sm:p-16">
        <div className="absolute inset-0 -z-10 opacity-70">
          <div className="shader-mesh h-full w-full" />
        </div>
        <div className="shader-grain -z-10" />
        <BarChart3 className="mx-auto mb-4 h-7 w-7 text-primary" />
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Ship your next 30 posts.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Stop staring at an empty box on Monday. Start with a brief, end with a queue.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg">
              Create your free account
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="ghost">
              <Zap className="mr-1 h-4 w-4" /> Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- Footer */

function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Pimci</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            The calm workspace for social posts. Draft, generate, schedule, ship.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label="Social"
              >
                <Icon className="h-3.5 w-3.5" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Product" links={["Features", "How it works", "Demo", "Pricing"]} />
        <FooterCol title="Company" links={["About", "Customers", "Careers", "Contact"]} />
        <FooterCol title="Legal" links={["Privacy", "Terms", "Security", "DPA"]} />
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Pimci. All rights reserved.</span>
          <span>Built with Lovable</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="transition-colors hover:text-foreground">{l}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

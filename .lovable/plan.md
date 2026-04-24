
# SocialDeck — AI-powered post composer & scheduler for LinkedIn and X

A clean, production-grade tool to write, AI-generate, schedule, and (later) auto-publish posts to LinkedIn and X.

## Stack note
We'll build on Lovable's stack: **TanStack Start (React) + Lovable Cloud (Postgres/Auth/Storage) + Lovable AI**. Same product, different infra than your original Next.js/MongoDB/AWS spec — fully portable later.

## v1 Scope (this build)

### 1. Auth & accounts
- Email/password + Google sign-in
- Lightweight user profile (name, avatar, timezone)
- Per-user data isolation (RLS)

### 2. Composer (manual & AI-assisted)
- Side-by-side editor with **per-platform tabs** (LinkedIn / X)
- Live character counter, link preview, hashtag suggestions
- Per-platform formatting rules (X = 280 chars, LinkedIn = long-form, line-break friendly)
- Save as draft, duplicate, delete
- "Variants" — one brief produces 3 tailored drafts

### 3. AI generation (Lovable AI)
- **Brief → posts**: topic + tone + platform → 3–5 variants
- **Trend ideation**: pick an industry/niche → AI suggests 5 post angles based on its general knowledge of what performs (clearly labeled — not real-time scraping, since LinkedIn/X don't allow that)
- **Rewrite tools** on any draft: shorten, lengthen, change tone, make it a thread (X), turn it into a hook + body (LinkedIn)

### 4. Scheduling
- Pick date + time per draft (timezone-aware)
- **Calendar view** (month + week) showing scheduled posts color-coded by platform
- **List/queue view** with filters: status (draft/scheduled/published/failed), platform, date range
- Drag-to-reschedule on calendar
- "Best time to post" hints (static heuristics in v1; can wire to real analytics later)

### 5. Publishing — copy/post for v1, real APIs as a follow-up
- At scheduled time, the post enters a "Ready to publish" queue with a one-click copy + open-platform action and a notification
- Mark as published manually
- **Reason**: real LinkedIn + X publishing requires you to register developer apps on both platforms (LinkedIn Marketing Developer Platform approval, X API paid tier) and provide OAuth credentials. We'll build the publishing pipeline so it's ready to flip on once you have those — but won't block v1 on approvals that take days/weeks.

### 6. Dashboard
- Quick stats: drafts, scheduled this week, published this month
- Upcoming queue (next 5 posts)
- Quick "New post" CTA

## Pages
- `/` — marketing landing (hero, features, CTA to sign up)
- `/auth` — sign in / sign up
- `/app` — dashboard (post-login home)
- `/app/compose` — composer (manual + AI)
- `/app/calendar` — scheduling calendar
- `/app/queue` — list of all posts with filters
- `/app/settings` — profile, timezone, (later) connected accounts

## Data model (Lovable Cloud)
- `profiles` — user profile + timezone
- `posts` — id, user_id, platform, content, status, scheduled_at, published_at, ai_generated, source_brief
- `post_variants` — groups variants generated from one brief
- `ai_generations` — log of prompts + outputs (for "regenerate" history)

## Design direction
- **Minimal, production-grade**: think Linear + Notion restraint. Generous whitespace, one accent color, neutral surfaces.
- **Light + dark mode**, system default
- **Micro-interactions**: smooth tab transitions in composer, subtle character-counter color shift as you approach limits, calendar drag feedback, AI "generating…" shimmer, success toasts with icon morph, hover lift on post cards
- **Typography**: Inter for UI, slightly tighter tracking for headings
- **Iconography**: Lucide, consistent stroke

## Phase 2 (after v1 ships)
- Real publishing via LinkedIn + X OAuth (you'll need to register dev apps)
- Multiple connected accounts per platform
- Team workspaces & approval flows
- Analytics (impressions, engagement) once real publishing is live
- Image attachments + AI image generation per post

## Goal
Ditch the left sidebar in the `/app` shell. The four nav items (Dashboard, Compose, Calendar, Library) move into a **top navbar**, centered, with the **Pimci logo on the left**. The **user info sits at the bottom-left** of the screen, and an **icon-only dropdown trigger sits at the bottom-right**, with all account details (name, email, settings, theme switch, logout) tucked inside the dropdown. The theme switch becomes an SVG-only icon next to the username inside the dropdown header.

## Changes

### 1. `src/routes/app.tsx` — full layout rewrite
**Remove**
- The entire `<aside>` left sidebar (logo block, nav list, account dropdown at bottom).
- The mobile bottom-tab `<nav>` (replaced by the same top navbar, which works on mobile too).
- Sidebar-specific skeleton.

**Add — Top Navbar (sticky, full-width)**
- Sticky `<header>` at the top of the shell:
  - **Left**: Pimci logo + wordmark (links to `/app`).
  - **Center**: NAV items as horizontal pill links with the existing active-state styling (active = `bg-sidebar-accent text-sidebar-accent-foreground`, idle = muted hover). Use `flex-1 justify-center` so the group is visually centered between logo and right edge. On narrow viewports, hide labels and show icons only (≤ `sm`), keep labels from `md` up.
  - **Right**: empty for now (keeps header balanced; no user info here).
- Keeps the existing `aria-current="page"` and focus-ring patterns.

**Add — Bottom bar (fixed, full-width)**
- A `fixed bottom-0 inset-x-0` bar with:
  - **Left**: Avatar + display name + email (truncated). Plain, non-interactive info block.
  - **Right**: `DropdownMenu` whose trigger is an **icon-only** button (`ChevronsUpDown` or `MoreHorizontal` in a small ghost button, `aria-label="Account menu"`).
- Dropdown content (`side="top" align="end"`) contains everything currently in the sidebar dropdown:
  - **Header row**: avatar + username on the left, **theme toggle as an SVG icon button** on the right (Sun/Moon swap based on `dark`). Icon-only, `aria-label="Toggle theme"`. No text label — purely the SVG, per request.
  - Email line under the username.
  - Separator.
  - `Settings` item → `/app/settings`.
  - Separator.
  - `Log out` item.
- Remove the previous "Light mode / Dark mode" text item from the menu list (it's now the SVG toggle in the header row).

**Main content area**
- Stays as the elevated rounded card with the existing hover/focus micro-interactions.
- Adjust spacing: add top padding/offset for the sticky header height and bottom padding to clear the fixed bottom bar (e.g. `pt-14 pb-16`).
- Remove the `z-0`/`z-10` sidebar overlay logic (no longer needed); keep card shadow + transitions intact.

**Skeleton**
- Replace the sidebar skeleton with a top-navbar skeleton (logo placeholder + 4 short nav placeholders) and a bottom-bar skeleton (avatar + two text lines on the left, small circle on the right). Card skeleton in the middle stays.

**Imports cleanup**
- Drop `Layers` only if logo styling changes; otherwise keep. Keep `Sun`, `Moon`, `Settings`, `LogOut`, `ChevronsUpDown`. Add a small icon for the bottom-right trigger if we go with `ChevronsUpDown` (already imported).

### 2. No other files need changes
- `ThemeToggle.tsx` already exposes `useThemeToggle()` returning `{ dark, toggle }` — reused as-is for the SVG-only toggle in the dropdown header.
- Routes, auth, and dropdown primitives are unchanged.

## Responsive behavior
- **≥ md**: Top navbar shows icon + label for each nav item, centered. Bottom bar shows full avatar + name + email on the left, icon trigger on the right.
- **< md**: Top navbar shows icon-only nav items (still centered). Bottom bar shrinks: avatar + name only (email hidden), icon trigger on the right. All nav remains reachable from the top bar, so the old mobile bottom-tabs are no longer needed.

## Accessibility
- `aria-label="Primary"` on the top `<nav>`.
- `aria-current="page"` on active nav links (unchanged).
- Icon-only buttons get explicit `aria-label`s ("Account menu", "Toggle theme").
- Dropdown items keep `cursor-pointer` and keyboard activation behavior.
- `motion-reduce` classes on the content card stay in place.

## Out of scope
- No changes to individual `/app/*` route content.
- No changes to auth, data, or routing logic.
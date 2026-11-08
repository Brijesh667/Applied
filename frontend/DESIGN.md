# Design System (frontend/DESIGN.md)

## Concept: navy and blue
Applied uses a disciplined "navy and blue" system. Calm, crisp paper surfaces, rich ink-navy text, and focused primary blue accents for brand, primary actions, time urgency, and focus states. The main command center is the **dashboard** with immediate action items under "Needs attention". Everything stays quiet and disciplined.

## Avoid (generic defaults to NOT use)
- Cream background with a serif display and terracotta/clay accent; near-black background with acid-green accent; newspaper layouts
- Identical rounded cards with the same soft grey shadow everywhere; gradient washes; glassmorphism; blurred blobs
- ALL-CAPS tracked-out eyebrow labels, "WORD — fragment" labels, middle-dot meta strings (`A · B · C`), monospace for small labels, arrows (`→`) appended to buttons/links
- Highlighting a single word in a headline with color/italic
- Numbered 01/02/03 markers unless the content is truly a sequence
- Fade-and-slide-up entrance on every section, hover lift/scale on panels (see owner-approved exceptions for application cards and buttons)
- Default Tailwind indigo/blue/gray palette, Inter/Roboto/system font stack
- Pure `#000` / `#fff` page backgrounds
- Yellow highlighter accents or yellow marks (deprecated and replaced by primary navy & blue)

## Color tokens
Define as CSS variables, light values on `:root` and dark values on `[data-theme="dark"]`. Expose them to Tailwind through `@theme` (e.g. `bg-paper`, `bg-surface`, `text-ink`, `text-ink-soft`, `border-rule`, `bg-primary`, `bg-primary-soft`, `border-primary-tint`).

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#F4F7FB` | `#0B1220` | Page background |
| `surface` | `#FFFFFF` | `#111A2E` | Cards, panels, dialogs, inputs |
| `sunken` | `#E9EEF6` | `#0A101C` | Hover rows, input wells, skeletons |
| `rule` | `#D5DEEB` | `#24324D` | All borders and dividers |
| `ink` | `#0F1B2D` | `#E6EDF7` | Primary text |
| `ink-soft` | `#52627A` | `#9FB0C8` | Secondary muted text |
| `placeholder` | `#5B6B84` | `#8496B0` | Input placeholder |
| `primary` | `#1D4ED8` | `#5B9CFF` | Brand, primary button, focus ring, active nav |
| `primary-hover` | `#1E40AF` | `#7BB0FF` | Primary button hover |
| `on-primary` | `#FFFFFF` | `#08111F` | Text on primary |
| `primary-soft` | `#E3ECFD` | `#172A4D` | Soft tinted backgrounds, selection bg |
| `primary-tint` | `#9DB8F2` | `#2F4F8F` | Subtle accent borders (This week box, KPI card) |
| `danger` | `#BC3626` | `#FF7A6B` | Missed deadlines, delete, logout |
| `danger-bg` | `#FCE8E5` | `#3A1C22` | Missed chip bg, error tint background |
| `danger-tint` | `#EFA79D` | `#7A3039` | Subtle danger-tint border (Missed box) |
| `danger-hover` | `#A62B1D` | `#FF6352` | Danger button hover background |
| `--glow-rgb` | `29 78 216` | `91 156 255` | Primary blue color for glow/spotlight |
| `--glow-alpha-page` | `0.08` | `0.14` | Peak alpha of the page cursor glow |
| `--glow-alpha-card` | `0.10` | `0.15` | Peak alpha of in-card spotlight |
| `--shadow-lift` | `0 10px 24px rgb(15 27 45 / 0.10)` | `0 10px 24px rgb(0 0 0 / 0.45)` | Card/button hover shadow |
| `--backdrop` / `--backdrop-auth` | `rgb(0 0 0 / 0.06)` | `rgb(0 0 0 / 0.12)` | See-through backdrop for AuthDialog |
| `auth-bg` | `#0F1B2D` | `#050A14` | Auth dialog background (dark in both themes) |
| `auth-field` | `#18283F` | `#0D1626` | Auth input well background |
| `auth-border` | `#2A3A58` | `#2A3A58` | Auth dialog and input border |
| `auth-border-hover` | `#3F5E96` | `#3F5E96` | Auth dialog border on hover |
| `auth-ink` | `#E6EDF7` | `#E6EDF7` | Auth primary text, labels, title |
| `auth-ink-soft` | `#9FB0C8` | `#9FB0C8` | Auth subtitle, helper text, placeholder |
| `auth-primary` | `#5B9CFF` | `#5B9CFF` | Auth button background, focus border |
| `auth-on-primary` | `#08111F` | `#08111F` | Text on primary button |
| `auth-glow` | `91 156 255` | `91 156 255` | Auth glow RGB channels |
| `--ease-out` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | Hover/lift transitions |
| `--dur-press` | `90ms` | `90ms` | Press down |
| `--dur-hover` | `180ms` | `180ms` | Hover transitions |
| `--dur-ripple` | `520ms` | `520ms` | Click ripple |

**Status colors** (text-only badges, no icons, both themes):
| Status | Light fg / bg | Dark fg / bg |
|---|---|---|
| applied (slate) | `#405270` / `#E4E9F2` | `#A9B8D0` / `#1D2940` |
| in-process (purple) | `#5B3FC4` / `#ECE8FB` | `#B9A9FF` / `#251F4D` |
| offer (emerald) | `#166B3C` / `#DAF1E3` | `#7DDBA3` / `#12301F` |
| rejected (ruby) | `#9B2F44` / `#F8DEE3` | `#F2A0B0` / `#3A1B25` |

**Rules:** All text/background pairs meet WCAG AA (>= 4.5:1 text, >= 3:1 focus ring) in both themes. Never rely on color alone: status is shown by text label; chips have no icons. Purely typography and token-driven.

**Primary accent rule:** Primary blue appears for (a) the logo mark, (b) active navigation indicator, (c) "Today" / "This week" due chips, (d) focus outlines, (e) active filter borders/toggles, and (f) cursor glow and card spotlights. At most one highlighted element per context.

## Typography
One family: **Schibsted Grotesk** (variable, weights 400 to 800). Use `font-variant-numeric: tabular-nums` on all numbers (stats, dates, pay, counters).
| Role | Size / line-height | Weight | Tracking |
|---|---|---|---|
| caption | 12 / 16 | 500 | 0 |
| small | 14 / 20 | 400 | 0 |
| body | 16 / 24 | 400 | 0 |
| lead | 18 / 26 | 400 | 0 |
| h3 | 22 / 28 | 700 | -0.01em |
| h2 | 28 / 34 | 700 | -0.015em |
| h1 | 36 / 42 | 800 | -0.02em |
| stat (big numbers) | 48 / 52 | 800 | -0.02em |
Sentence case everywhere (no uppercase text-transform). Prose line length max 65ch.

## Shape, spacing, elevation
- 4px spacing base. Content max-width 1120px; page padding 16px mobile, 24px tablet, 32px desktop.
- **Hierarchical radii**: cards/panels 12px, controls (inputs, buttons, selects) 8px, chips/badges full pill, dialogs 16px.
- **No shadows on resting cards.** Resting cards are flat: `surface` background + 1px `rule` border, radius 12px, padding 16px. Status is displayed strictly via `StatusBadge` (text label, no icons), never color alone.
- **Shared chip sizing & equal widths:** all chips share height 28px (`h-7`), full radius, `inline-flex items-center justify-center text-center whitespace-nowrap`, padding `px-2.5`, text-only (no icons). Fixed widths per chip family: ReplyTypeBadge `min-w-[104px]`, DueChip `min-w-[140px]` (shrinks on mobile with `min-w-0`), StatusBadge `min-w-[92px]`.
- **DueChip states:**
  - Missed (<0 days): `danger` text on `danger-bg` + 1px `border-danger/25`.
  - Today / This week (0..7 days): solid `primary` bg with `on-primary` text, no border.
  - Later (>7 days): `ink-soft` on `surface` with `rule` border.
- **Needs attention rows:**
  - **Desktop (md and up):** 4 columns in straight vertical lines: company + role (`minmax(0,1fr)`), type chip (`140px`), due chip (`140px`), and Mark as done button (`128px`). Both chips use equal 140px widths.
  - **Mobile (below md):** 2 lines:
    - Line 1: company name (bold, truncate) with role below it (muted, truncate), and "Done" button on the right (fixed width `72px`, never shrinks).
    - Line 2: `grid grid-cols-2 gap-2` with type chip (left) and due chip (right), both `w-full min-w-0`, same height (`h-7`), centered text, nowrap, equal width across every row.
    - In the **Missed** box, due chip omits the word "Missed" ("25 days ago", "yesterday", "2 days ago") via `dueText(date, { inMissedGroup: true })` / `inMissedGroup` prop since the group heading already states Missed. Elsewhere ("Cards", "Detail", "KPI"), "Missed N days ago" is retained. No overflow or clipped text down to 320px viewport.
- Equal-height cards on `/applications`: grid items stretch (`items-stretch`), wrappers `h-full`, card `flex flex-col h-full`, footer `mt-auto min-h-[76px]`, single reserved skills row (`h-[26px] mt-3`). In pending deadline state, footer uses 2 rows: Row 1 with `ReplyTypeBadge` (left) and `DueChip` (right, drops if too narrow), Row 2 with right-aligned `Mark as done` button (full-width under 260px container width). In no-deadline or no-reply states, single centered row inside the 76px min-height. All cards in a row have identical height and aligned footers.
- **Application detail page (`/applications/:id`):**
  - Compact header: BackLink on top, row with company name + inline `StatusBadge`, muted role below, and action buttons aligned right (desktop) or in a full-width row (mobile).
  - Details panel: 2-column facts grid (Platform | Applied on, Pay | Duration) with small muted labels above values, followed by full-width rows for Job link (host text), Skills, Description, and Notes. Any field without a value is hidden. Desktop sticky under `--topbar-h` when fitting inside viewport.
  - Reply cards: Row 1 = `ReplyTypeBadge` + "Received {date}" and edit/delete actions; Row 2 = single merged chip ("Due {date} · {relative}") and "Mark as done" checkbox (only if a deadline exists); Row 3 = notes below a 1px rule (no rule if no notes).
  - Detail page replies list: displays the 3 latest replies (newest first by receivedDate) with shared `ReplyCard`. Total count badge in header. If total replies > 3, displays a "Show all (N)" button below the list navigating to `/applications/:id/replies`.
  - All replies page (`/applications/:id/replies`): dedicated single-column reading page displaying all replies. Sorted by: pending (not completed) first with nearest deadline first, followed by pending without deadline (newest first), then completed replies (newest first). Back arrow explicitly navigates to `/applications/:id`.
  - Completed replies: visually muted (`bg-sunken/40`, `text-ink-soft` ensuring WCAG AA >= 4.5:1), due chip replaced with "Done" chip (text only, no icon), checkbox labeled "Mark as not done".
  - Timeline: vertical line and marker dots rendered only when 2 or more replies exist; single reply renders full width without line or dot. Empty state inside panel renders a single "Add reply" CTA without duplication in the panel header.
- **Dashboard (`/dashboard`):**
  - Header: H1 "Dashboard" only (subtitle removed).
  - Layout skeleton invariant: ALWAYS render the complete layout skeleton (all 5 KPI boxes and all cards), even when `total === 0`. Never replace the entire dashboard with a generic EmptyState.
  - Row 1: 5 separate compact KPI cards with 16px desktop gap, 12px mobile gap (2-column mobile grid with 5th box full-width, 5-column desktop row). Flat, 1px border, radius 12px, padding 16px, auto height (about 100-120px). Content order inside each card: 1. Label (15-16px semibold), 2. Detail line (12-13px muted), 3. Number (32-36px bold tabular figures). Tilt + glow on hover via `useCardFx`.
    - Applied: `total`, line `{noReply} no reply yet`
    - Got a reply: `replied`, line `of {total} applications`
    - Missed: `deadlines.overdue`, line `past deadline` (number in danger token when > 0, link -> `/applications?deadline=missed`)
    - This week: `deadlines.dueSoon`, line `deadlines in next 7 days` (primary-tint border on card when > 0, number in text-primary when > 0, link -> `/applications?deadline=week`)
    - Offers: `byStatus.offer`, line `{byStatus.rejected} rejected`
    - When any box has value 0: show `0` with `none yet`, plain text color (`text-ink`), no danger/primary accent.
  - Row 2 (about 2/3 and 1/3 desktop, single column mobile):
    - Left (2/3): "Needs attention" card: outer card with title + total count. Inside, two separate boxes with 12-16px gap (order: **This week** first, **Missed** second). Each inner box has its own 1px border, radius 10px, padding, and header with group count + "See more ({deadlines.dueSoon})" / "See all ({deadlines.overdue})" link on header right. This week box has subtle `primary-tint` border with header count in `text-primary`; Missed box has subtle `danger-tint` border with danger header count (`text-danger`). Glow only (no tilt) on outer card and inner boxes. Real totals from `deadlines.dueSoon` and `deadlines.overdue` are used for counts and overflow links; a group is hidden only if its count is 0. If both are empty, single message "Nothing needs attention" is shown. Rows inside keep the existing grid layout, limits (5 / 3), links and inline Mark as done action (optimistic, rollback, refills list from fresh stats on success). Entire row acts as a link to `/applications/:id/replies` without nested interactive elements. Footer link to `/applications?sort=deadline` with pending count ("View all {pending} pending deadlines").
    - Right (1/3): "Status" stacked bar with 4 status colors + legend rows (tilt + glow, empty state: "Appears after your first application."); "Replies" horizontal bars for `repliesByType` with `bg-primary/70` fill on `sunken` track (tilt + glow, empty state: "Appears after your first reply.").
  - Row 3 (about 1/3 and 2/3 desktop, single column mobile):
    - Left (1/3): "Where you applied" table with columns `Platform | Applied | Replied`, progress bar `bg-primary/70` on `sunken` track, all rows linked to `/applications?appliedFrom=...` (tilt + glow, empty state: "Appears after your first application.").
    - Right (2/3): "Recent applications" card showing latest 5 applications via `/api/applications?limit=5`, header link "View all" -> `/applications`, each row linking to `/applications/:id` with company name (bold), role (muted), and `StatusBadge` (shared fixed width 92px, tilt + glow; empty state "Start your first application." with "Add application" button -> `/applications/new`).
  - Mobile stacking order: KPI strip, Needs attention, Status, Replies, Where you applied, Recent applications. All grid cells include `min-w-0` to prevent right-edge overflow.
- **Jobs page & Match Meter (`/jobs`):**
  - Responsive 2-column desktop / 1-column mobile grid of `JobCard` components.
  - Resting cards are flat: `surface` bg, 1px `rule` border, radius 12px (`rounded-[12px]`), padding 20px (`p-5`).
  - Title clamped to 2 lines (`line-clamp-2`), rendered as raw JSX children (no `dangerouslySetInnerHTML`).
  - Company and location with "Remote" chip (`bg-primary-soft text-primary`) and platform pill (`bg-sunken text-ink-soft`).
  - Pay in `en-IN` format (`₹`) with `PAY_LABELS` ("per year", "per month"), supporting ranges (`payMin`–`payMax`) and single amounts.
  - Posted time formatted in calendar days ("Today", "Yesterday", "N days ago").
  - **Match meter pattern:**
    - Percentage text score (`tabular-nums font-semibold text-ink`).
    - Thin ink progress bar: `bg-sunken` track with `h-1.5`, filled with `bg-ink` (strictly no yellow highlighter).
    - Text tier with icon: `Sparkles` + "Strong match" ($\ge 75$), `CheckCircle2` + "Good match" ($\ge 50$), `MinusCircle` + "Weak match" ($< 50$). Status is never indicated by color alone.
    - Single-line `matchReason` truncated below meter.
  - Snippet clamped to 3 lines (`JOB_SNIPPET_COLLAPSED_LINES = 3`) with "Show more" / "Show less" toggle for long descriptions.
  - Isolated `ApplyButton` opening in new tab (`target="_blank" rel="noopener noreferrer"`) with protocol validation (`http://` or `https://` prefix required; hidden otherwise).
  - Search data retains per-resume results across session navigation via disabled `useQuery` (`staleTime: Infinity`) and `useMutation` without auto-fetching on mount or polling.
  - **Job Tracking & "Did you apply?" flow:**
    - Clicking Apply logs a pending apply record in `sessionStorage` (`applied_pending_apply`).
    - Tab-return detection hook (`usePendingApply`) activates when returning to the tab ($\ge 3$ seconds elapsed) and prompts the "Did you apply?" modal dialog.
    - Dialog: native `<dialog>` with focus trap, displaying job title and company with "Yes, track it" (primary with spinner) and "Not yet" (secondary).
    - Manual track option: each card includes an always-visible secondary "Track application" button opening the same dialog directly.
    - Tracked state: card replaces the secondary track button with an accessible "Tracked" indicator (Check icon + text) and a "View application" link.
    - Unlisted compensation: applications tracked from jobs without pay listings have `pay.amount = 0`, formatted and displayed across the application as "Not specified" via `formatPay`.

## Focus, motion, accessibility
- Visible keyboard focus on every interactive element: `outline: 2px solid var(--color-primary)` with `outline-offset: 2px` in both themes. Never remove outlines without replacement.
- Motion tokens: `--ease: cubic-bezier(0.2, 0.7, 0.2, 1)`, `--ease-out: cubic-bezier(0.2, 0.7, 0.2, 1)`, durations `--dur-press: 90ms`, 120ms (micro), `--dur-hover: 180ms`, 200ms (state change), `--dur-ripple: 520ms`.
- **No ambient or scroll-triggered animation.** Allowed: motion that answers a user action (checkbox complete, dialog open/close, toast in/out, button loading, interaction motion exceptions below). "Mark as done" on dashboard fades the row over 180ms ease-out (instant under `prefers-reduced-motion: reduce`).
- Respect `prefers-reduced-motion: reduce` globally (disable transitions, transforms, ripple, and glow).
- Minimum touch target 40px on mobile. All inputs have visible labels. Support 375px width up to wide desktop.

## Interaction motion (owner-approved exceptions)
Deliberate exceptions to the static rules, approved by the product owner to make `/applications` and interactive controls feel alive and responsive while maintaining restraint and 60fps performance:
- **Shared card effect (`useCardFx` hook):** ONE shared hook for cursor effects across `/applications` and `/dashboard`:
  - **Tilt + cursor glow:** applied to `ApplicationCard` on `/applications` and to Dashboard 5 KPI cards, Status, Replies, Where you applied, and Recent applications:
    - **Tilt:** on pointer move, 3D tilt based on cursor position relative to card center. Max about 4 degrees on `rotateX`/`rotateY`, `perspective: 800px`, slight lift (`translateY(-2px)`). On leave, smoothly returns to flat resting position over 200ms ease-out.
    - **Glow:** a radial-gradient spotlight following the cursor inside the card (about 200px radius, low opacity, using `--glow-rgb` / `--glow-alpha-card`, working in both light and dark themes). Implemented via CSS variables `--mx` / `--my` set on pointermove and a `::before` overlay with `pointer-events: none` and `z-index: 0`. It sits behind text and card content (`relative z-10`), never obscuring them.
  - **Glow only (no tilt):** applied to Needs attention outer card and its two inner boxes (This week and Missed). Keeps interactive rows and buttons rock-solid while providing subtle dynamic lighting.
  - **Performance & a11y:** CSS variables updated inside `requestAnimationFrame` with zero React re-renders. Enabled only for `@media (hover: hover) and (pointer: fine)`. Disabled under `prefers-reduced-motion: reduce` (reverts to simple border-color change). `will-change: transform` added only while hovering so resting text stays crisp. Keyboard focus (`:focus-visible`) continues to show the standard focus ring without tilt. Rows and buttons inside cards remain 100% interactive.
- **Sticky FilterBar & Filters System:**
  - **Sticky position:** FilterBar sticks directly below TopBar using `position: sticky; top: var(--topbar-h); z-index: 30;` (`--topbar-h` is 56px on mobile, 64px on desktop).
  - Opaque `bg-surface` background token prevents scrolling cards from ever showing through.
  - A subtle bottom border and shadow (`border-b border-rule shadow-[0_4px_12px_rgb(0_0_0_/_0.06)]` / dark `shadow-[0_4px_16px_rgb(0_0_0_/_0.35)]`, top border removed, `rounded-b-[12px] rounded-t-none`) appears only once it is actually stuck, detected via an `IntersectionObserver` sentinel element.
  - **Desktop layout (`md` and up):**
    - Row 1: Search input (`flex-1`) + permanent "Clear filters" button on the right, matching search input height (`h-10`).
    - Row 2: 5 selects in an equal-width grid (`grid-cols-5 gap-3` with `min-w-0`), never wrapping to a second line at `md+`. First select default option label: "Any deadline" (not "Any"). Every select has a visually hidden `<label className="sr-only">` and accessible `aria-label`.
    - Row 3: Day row (when Deadline = This week) with "All days" and 7-day keyboard-navigable radiogroup pills. Active pill: `bg-primary text-on-primary border-primary`.
  - **Permanent Clear filters button:**
    - Always rendered in the same spot (no layout shift, `min-w-[150px]`, tabular numbers).
    - Disabled when no filter is active (search empty, deadline Any, day All days, status/platform/replies defaults). Sort is NOT counted as a filter.
    - Enabled when at least one filter is active; label displays count: "Clear filters (N)".
    - Click resets all filters and the day row in ONE URL update (single history entry), keeping custom sort if present, and moves focus to the search input.
    - Styling: secondary outline with `border-primary` and `text-ink` when active, subtle surface fill on hover. Hover lift `translateY(-1px)`, active `scale(0.98)` over 180ms ease-out (no transform under `prefers-reduced-motion`). Disabled state: `opacity-40 border-rule/50 text-ink-soft cursor-not-allowed`.
  - **Mobile layout (below `md`):**
    - Sticky bar contains: Search input (`flex-1`) + "Filters" button with active count badge in `bg-primary text-on-primary`.
    - "Filters" button opens a bottom sheet (`FilterSheet`) built on native `<dialog>` with focus trap, backdrop click close, Esc close, focus restored to Filters button on close, and body scroll locked while open.
    - Sheet contents: 5 selects stacked full width with visible labels; filter changes apply live to URL while sheet is open. Sheet footer contains Clear filters (matching disabled/count rules) and primary "Show results" CTA (`bg-primary text-on-primary`).
    - Active filters appear as removable chips in one horizontally scrollable row under the search bar (`overflow-x-auto scrollbar-none`, hidden when 0 active filters). Each chip has a text remove button ("×") with accessible `aria-label` (e.g. "Remove Missed filter").
    - Day row sits below chips when Deadline = This week, horizontally scrollable without page overflow down to 320px viewport, never colliding with `BottomNav`.
- **TopBar, Theme Toggle & User Menu:**
  - Sticky header (`h-14` mobile, `h-16` desktop) on `bg-paper border-b border-rule`. `--topbar-h` invariant (56px mobile, 64px desktop).
  - **Desktop 3-Zone Layout (`md` and up):** `grid grid-cols-[1fr_auto_1fr] items-center`.
    - Left (1fr): Logo (`justify-start`), wordmark only in `ink`, bold, tight letter-spacing. Stays a link to `/dashboard`.
    - Center (auto): Truly centered nav links Dashboard and Applications (`<nav aria-label="Main">`, gap 32px / `gap-8`, padding `px-3 py-2` for generous touch target, `ink-soft` inactive, active `ink` + semibold). 150ms color and weight transition with layout shift prevented via invisible bold copy reserving exact width.
    - Right (1fr): Actions (`justify-end`, gap 12px / `gap-3`): "Add application" button (`hidden md:inline-flex`), Theme toggle, Avatar.
  - **Mobile Layout (below `md`):** 2-zone layout (left: Logo, right: Theme toggle + Avatar). No center nav and no Add button in top bar.
  - **Active Sliding Indicator:** ONE 2px `primary` indicator line positioned at the bottom of the header under the active link, measured with refs (`transform: translateX`, `width`, 250ms ease-out). No layout jump on initial render. Recalculates on route change, window resize, and font loading. Inactive on `/applications/new` (opacity 0). Under `prefers-reduced-motion`, sliding is disabled (snaps instantly).
  - **Navigation Route-Change Feedback:** Thin 2px `primary` progress line along top edge of the header that animates left to right (350ms ease-out) and fades out on router location changes. Pure CSS keyframe, disabled under `prefers-reduced-motion`. `aria-hidden="true"`.
  - **Theme Toggle:** Icon-only `IconButton` placed directly left of the avatar on both mobile and desktop. Shows `Sun` in dark mode, `Moon` in light mode. Includes `aria-label` and `title` tooltip ("Switch to light theme" / "Switch to dark theme"). Same size as the avatar button (`w-9 h-9`).
  - **User Menu:** Opens from the avatar trigger. Features:
    - Header block: 40px avatar (`size="md"`), semibold name, muted truncated email.
    - Divider, followed by navigation links: "Dashboard" (`/dashboard`) and "Applications" (`/applications`), with min touch target 44px (`min-h-[44px]`).
    - Divider, followed by "Log out" action (`danger` text token, `min-h-[44px]`).
    - Mobile layout: full-width anchored under the top bar (max 320px). Keyboard focus trapped with Tab/Shift+Tab, Esc closes and returns focus to the avatar trigger, `role="menu"` semantics.
- **Mobile Bottom Navigation (`BottomNav`):**
  - Strictly hidden on desktop (`md:hidden`), fixed at bottom with `pb-[env(safe-area-inset-bottom)]`.
  - All three tabs (Dashboard, Add, Applications) use identical styling: icon above label, equal width (`flex-1`), min touch target >= 44px (`h-14`).
  - Inactive state: muted text/icon (`text-ink-soft`), transparent background.
  - Active state: ink-colored text/icon (`text-ink`), semibold label, subtle surface background (`bg-surface/90`), and a 2px top indicator line (`before:h-[2px] before:bg-primary`). Includes `aria-current="page"`. Active state never relies on color alone (line + font weight).
  - Route matching: exactly one active tab per route. Add is active strictly on `/applications/new`. Applications is active on `/applications` and child routes (`/applications/:id`, etc.) except `/applications/new`. Dashboard is active on `/dashboard`. Transition 150ms; reduced motion disables transforms.
- **Ambient glow on `/applications`:** page cursor glow (`CursorGlow`, `--glow-alpha-page`) fixed below content.
- **Button feedback:** press feedback (`scale(0.97)` over `--dur-press`) and click ripples (`currentColor` expanding circle, 16% opacity, 24% for primary, capped at 3 live ripples, removed on animation end) on interactive controls (`Button`, `IconButton`, `SegmentedControl`, `BottomNav`, `Menu`). Primary button: `bg-primary text-on-primary hover:bg-[var(--color-primary-hover)]`.

## Voice and copy
Plain verbs, sentence case, active voice, no filler, no exclamation marks, no emoji.
- Buttons say what happens: "Save application", "Add reply", "Mark as done", "Delete application". The same action keeps the same name in the toast ("Application saved").
- Errors say what happened and how to fix it, without apologizing: "Company name is required." / "Can't reach the server. Check your connection and try again."
- Empty states are invitations: "No applications yet. Add the first one to start your log."
- Labels: statuses "Applied", "In process", "Offer", "Rejected"; reply types "Assessment", "Assignment", "Interview", "Offer", "Rejection", "Other"; pay types "per year", "per month", "one-time".
- Due text: "Today", "Tomorrow", "In 3 days", "Missed 2 days ago", "Missed yesterday".
- Currency is INR: format with `Intl.NumberFormat("en-IN")` and a `CURRENCY = "₹"` constant. Dates: `12 Nov 2026` (`en-IN`, day numeric, month short, year numeric).

## Logo
Wordmark "Applied" in `ink`, bold, tight letter-spacing (`font-bold tracking-tight text-ink`). No dot, mark, swipe, or underline. Link to `/dashboard`.

## Public landing page and footer (Landing v3)
- **Typography hierarchy (single scale defined as `.landing-*`):**
  - **Hero H1 (`.landing-h1`):** 56px desktop / 36px mobile, bold, tight tracking (`letter-spacing: -0.025em`), line-height 1.08, `text-ink`.
  - **Section Heading H2 (`.landing-h2`):** 36px desktop / 28px mobile, bold, line-height 1.15, centered, `text-ink`. Same weight and identical margin-bottom (48px desktop / 32px mobile) in all sections.
  - **Row Title H3 (`.landing-h3`):** 28px desktop / 22px mobile, bold, line-height 1.25, `text-ink`.
  - **Body (`.landing-body`):** 18px desktop / 16px mobile, line-height 1.6, `text-ink-soft`. Used for solution lines, FAQ answers, and hero subtext.
- **Spacing system (single scale):**
  - **Sections (`.landing-section`):** 96px vertical padding desktop / 64px mobile (`py-16 md:py-24`), identical across all sections.
  - **Section heading to content:** 48px desktop / 32px mobile (`mb-8 md:mb-12`).
  - **Between problem rows:** 80px desktop / 48px mobile (`space-y-12 md:space-y-20`).
  - **Section separation:** Dividers removed (no `border-t`). Sections separated purely by spacing. "How it works" uses a subtle alternate background (`bg-sunken/40`) to create visual rhythm.
  - **Universal container:** All content shares `max-w-[1120px] mx-auto w-full px-4 sm:px-6 md:px-8`. FAQ list centered at max-width 720px; final CTA centered within universal container.
- **Strict single-ownership & zero filler:** Nothing repeats across the page. Each fact, feature, mockup, or sentence appears exactly once (Needs attention mockup in Hero only; Applications + filters mockup in Problem 1 only; Reply timeline mockup in Problem 2 only; Status bar + platform table mockup in Problem 3 only; How it works has NO mockups; FAQ has NO mockups). No filler lines, no captions under mockups, no "calm", no trust/privacy marketing slogans, no unbuilt features (reminders, calendar sync, export). All copy lives in `src/lib/landingContent.js`. Sentence case, no emoji, no icons in chips.
- **Auth rules:** NO "Log in", "Sign up", or "Already have an account" links anywhere on the public landing page (header, hero, CTA, footer). Every "Start tracking" / "Start" button opens the URL-driven auth dialog (`/?auth=register`), which already contains login/signup mode switching.
- **Sticky Navbar:** Sticky header (`h-14` mobile, `h-16` desktop) on `bg-paper/95 backdrop-blur-xs border-b border-rule`.
  - Left: wordmark logo "Applied" (anchor to top).
  - Center (`md+`): anchor links "Features" (`#solution`), "How it works" (`#how`), "FAQ" (`#faq`), styled identically to app TopBar nav (`px-3 py-2 text-[14px] font-normal text-ink-soft hover:text-ink active: font-semibold text-ink`). Smooth scroll with topbar height scroll-margin; active section highlight via IntersectionObserver with sliding 2px `primary` indicator line matching app TopBar.
  - Right: theme toggle + "Sign in" link button (clean normal text in `ink`, turns `primary` blue on hover; on click routes to `/?auth=login` opening the authentication dialog).
  - Mobile (below `md`): logo left; theme toggle + compact "Sign in" + menu toggle button right. Menu button expands clean accessible dropdown with anchor links and "Sign in".
- **Hero:** 2 columns on `lg:` and up (stacked below `lg:` with text first, preview below). Left: H1 (56px/36px), subtext (18px/16px), one large primary CTA "Start tracking" (`h-12 px-6 text-[16px] font-semibold bg-primary text-on-primary`, hover lift 1px, active scale 0.98, nothing beside or under it). Right: composed dashboard preview (3 KPI mini cards: Applied 24, Missed 2, This week 5 stacked directly above the Needs attention card with This week 1 row and Missed 1 row). Top padding at least 64px below navbar. Text and preview card are vertically aligned such that the preview card never starts above the headline, and comfortably fits within 900px viewport height. Ambient primary radial glow background (`--hero-glow-alpha`: 0.10 light / 0.14 dark).
- **Problem and Solution (`id="solution"`, "Why a tracker"):** Three full-width alternating rows with 1px rule border, radius 12, surface background, and hover glow (`useCardFx({ tilt: false, glow: true })`):
  - No uppercase "Problem" or "With Applied" labels. No red or `danger` token (reserved for Missed).
  - Problem sentence is H3 (`.landing-h3`, 28px/22px bold, `ink`). Directly under it, the solution sentence (`.landing-body`, 18px/16px `ink-soft`), separated by 12px gap.
  - Equal halves on desktop (`grid-cols-2`, gap 64px), vertically centered. Stack on mobile with text first, 24px gap.
  - All three mockups share equal width (max 520px) and a consistent min-height (400px, fitting the tallest with top alignment `justify-start`):
    1. Problem 1 Mockup: Filter bar + 2 application cards.
    2. Problem 2 Mockup: 2 reply rows with due chip and Done button.
    3. Problem 3 Mockup: Status bar with 4 status totals + 3 platform rows with thin progress bars.
- **How It Works (`id="how"`, "How it works"):**
  - Section background: `surface` full-bleed band (`border-y border-rule/50`), other sections stay `paper`.
  - Centered H2 heading (`.landing-h2`, 36px/28px, 48px/32px mb).
  - Semantic `<ol>` with `<li>` per step. Numbered circles (40px, `bg-primary`, `text-on-primary`, semibold) carry `aria-hidden="true"` as decorative markers because the ordered list already announces step sequence.
  - Desktop (`md+`): 1 row of 3 equal cards (`gap-6`). A 1px `rule` horizontal line runs through the vertical centers of the three circles, strictly connecting Circle 1 to Circle 3 only (animated `scaleX` 0 to 1 over 400ms on reveal, `origin-left`). Each circle is centered above its card.
  - Mobile (`< md`): Vertical list with 1px `rule` line running down the left side through circles 1 to 3, cards on the right.
  - Card content (padding 24px / `p-6`, equal height `items-stretch`):
    1. Title: H3 style (20-22px bold, `text-ink`): "Log an application" / "Add replies and deadlines" / "Work from the dashboard".
    2. Description: 1 line (body, `text-ink-soft`): "Company, role, platform and pay." / "Record each reply with a due date." / "Mark deadlines done as they pass."
    3. Result strip: `mt-auto pt-4 border-t border-rule` with muted label "Result" (`text-[12px] font-medium text-ink-soft`) and result text (`text-[14px] font-medium text-ink`): "Appears in your applications list" / "Shows up in Needs attention" / "Status updates on its own". Strips horizontally aligned across cards.
    - No chips, no icons, no mockups, no emoji.
  - Motion: Staggered scroll reveal (80ms between cards), card glow on hover (`useCardFx({ tilt: false, glow: true })`), circle scale 1.05 on hover (150ms). Under `prefers-reduced-motion: reduce`, line is fully drawn, transitions and scale transforms are disabled.
- **FAQ (`id="faq"`, "FAQ"):** Accessible accordion (button with `aria-expanded`, `aria-controls`, `role="region"` panel) centered at `max-w-[720px]`. Centered H2 heading (36px/28px, 48px/32px mb). Item padding 20px (`p-5`), gap 12px (`gap-3`). Questions 18px semibold, answers 16px line-height 1.6. Exactly one item open at a time, 200ms height transition (instant under `prefers-reduced-motion`). Exactly 4 items:
  1. "Can I track internships?" — "Yes. Log jobs and internships with pay per year, per month or one-time."
  2. "Can I change an application later?" — "Yes. Edit any detail, and add, edit or delete replies. Status follows your latest reply."
  3. "Who can see my data?" — "Only you. Each account has its own data and passwords are stored hashed."
  4. "Does it send reminders?" — "No. Missed and this-week deadlines show on your dashboard and applications list."
- **Footer:** Same container. Left: Brand wordmark (size lg, clicking smoothly scrolls to top) + prominent tagline ("Track every application in one place.", 16-18px). Right: GitHub (`https://github.com/Brijesh667/Applied`) and LinkedIn links (larger 16-17px font, `target="_blank" rel="noopener noreferrer"`, no "Project" label). Bottom copyright and stack rows removed.
- **Motion & Accessibility:** Lightweight IntersectionObserver scroll reveal (`useScrollReveal`) fades up elements once (8-12px, 250ms ease-out). Fallback to instant visibility when IntersectionObserver is not supported or under `prefers-reduced-motion: reduce`. Zero horizontal overflow down to 320px viewport width (`scrollWidth <= docWidth`). Tab key completely skips all previews and mockups (`aria-hidden="true"`, `inert=""`, non-focusable). All text contrast meets WCAG AA (>= 4.5:1 text, >= 3:1 focus ring). Page renders fully with the backend offline.

## Authentication Dialog (`AuthDialog`)
- **Dark Surface in Both Themes:**
  - Dialog is dark in BOTH themes so it never blends into the light or dark landing page (`auth-bg`: `#0F1B2D` light / `#050A14` dark).
  - Native controls inside use `color-scheme: dark`.
  - Autofill style overrides `:-webkit-autofill` with `auth-field` (`#18283F` light / `#0D1626` dark) background and `auth-ink` (`#E6EDF7`) text, preventing white/yellow browser default styling.
- **Scoped Token Remapping:**
  - Inside `.auth-dialog`, global CSS variables are mapped directly to auth tokens:
    - `--color-surface`: `var(--auth-field)`
    - `--color-sunken`: `var(--auth-field)`
    - `--color-paper`: `var(--auth-bg)`
    - `--color-rule`: `var(--auth-border)` (`#2A3A58`)
    - `--color-ink`: `var(--auth-ink)` (`#E6EDF7`)
    - `--color-ink-soft`: `var(--auth-ink-soft)` (`#9FB0C8`)
    - `--color-placeholder`: `var(--auth-ink-soft)`
    - `--color-primary`: `var(--auth-primary)` (`#5B9CFF`)
    - `--color-primary-hover`: `var(--auth-primary-hover)` (`#7BB0FF`)
    - `--color-on-primary`: `var(--auth-on-primary)` (`#08111F`)
    - `--color-danger`: `#FF7A6B` (passes WCAG AA >= 4.5:1 on auth dark backgrounds)
    - `--color-danger-bg`: `#3A1C22` (dark subtle error container background)
- **Distinct Glow States & Elevation:**
  - **Rest:** 1px border `auth-border` (`#2A3A58`), radius 16px, shadow `0 24px 64px rgb(0 0 0 / 0.35)`. No glow.
  - **Hover (pointer over dialog, `(hover: hover) and (pointer: fine)`):** border `auth-border-hover` (`#3F5E96`), glow `0 24px 64px rgb(0 0 0 / 0.35), 0 0 24px 2px rgb(var(--auth-glow) / 0.35)`. Transition `200ms ease-out`. Touch devices do not trigger hover glow.
  - **Typing / Focus-within (`:focus-within`, wins over hover):** border `auth-primary` (`#5B9CFF`), glow `0 24px 64px rgb(0 0 0 / 0.35), 0 0 30px 4px rgb(var(--auth-glow) / 0.5)` with slow breathing pulse (`auth-dialog-pulse` 2s ease-in-out infinite, alpha 0.4 to 0.6, spread 2px to 6px animating box-shadow only).
  - **Focused input:** border `auth-primary` (`#5B9CFF`) + ring `0 0 0 3px rgb(var(--auth-glow) / 0.25)`.
  - **Keyboard focus:** visible 2px focus ring (`outline: 2px solid var(--auth-primary)`) on button, close, and links.
  - **Glow clipping prevention:** `<dialog>` has `overflow: visible` so box-shadow spreads freely without clipping; inner wrapper has `max-h-[calc(100dvh-64px)] overflow-y-auto`.
  - **Reduced motion:** breathing pulse and transitions disabled; static glow retained.
- **See-through Backdrop:**
  - Nearly invisible layer using `--backdrop` / `--backdrop-auth`: `rgb(0 0 0 / 0.06)` (light) / `rgb(0 0 0 / 0.12)` (dark).
  - Landing page behind remains full color, sharp, and non-interactive (`inert`).
  - Esc closes, outside click closes, focus returns to opener, focus trapped, 0px layout shift via scrollbar compensation.


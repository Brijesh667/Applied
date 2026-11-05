# Applied — Frontend

The modern, calm, and disciplined web client for **Applied**, a job and internship application tracker designed specifically for students and early-career job seekers.

---

## What is Applied?

Applied replaces chaotic spreadsheets and generic SaaS kanban templates with a focused logbook. It tracks every internship and job application, organizes multi-stage interview & assessment timelines, and keeps impending deadlines front and center through the signature **Deadline Ruler**.

---

## Quick Start

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- Running backend instance (default: `http://localhost:5000`)

### Installation & Development
```bash
# From the frontend directory
npm install

# Start development server with Vite (proxies /api -> localhost:5000)
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server with Hot Module Replacement (HMR) on port 5173. |
| `npm run build` | Compiles the production bundle with Rollup, tree-shakes dev styleguides, and outputs to `dist/`. |
| `npm run preview` | Runs a local static preview server of the production `dist/` build. |
| `npm run lint` | Runs ESLint across all `src/` modules (strictly enforced zero errors, zero warnings). |

---

## Project Structure

```text
frontend/
├── src/
│   ├── api/                       # API client and endpoints
│   │   ├── client.js              # Fetch wrapper, error normalizing & 401 interceptor
│   │   ├── endpoints.js           # Auth, Applications, and Stats endpoints
│   │   └── queryKeys.js           # Structured TanStack Query cache key factories
│   ├── components/
│   │   ├── applications/          # Application cards, filters, panels & forms
│   │   │   ├── form/              # DateField, MoneyInput, PlatformField, SegmentedControl, SkillsField
│   │   │   ├── ApplicationCard.jsx
│   │   │   ├── DetailsPanel.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── RepliesPanel.jsx
│   │   │   └── ReplyForm.jsx
│   │   ├── auth/                  # Authentication modal & forms
│   │   │   ├── AuthDialog.jsx     # Native <dialog> auth modal with bottom-sheet on mobile
│   │   │   ├── LoginForm.jsx      # Login form with autofocus & validation
│   │   │   └── RegisterForm.jsx   # Registration form with 409 email switch
│   │   ├── dashboard/             # Dashboard metrics and timeline visualization
│   │   │   ├── DeadlineList.jsx   # Mobile linear view of active deadlines
│   │   │   ├── DeadlinePanel.jsx  # Container switching between ruler and mobile list
│   │   │   ├── DeadlineRuler.jsx  # Signature 14-day chronological deadline ruler
│   │   │   ├── OverviewStrip.jsx  # Total, in-process, offers, rejections strip
│   │   │   ├── PlatformTable.jsx  # Platform distribution breakdown table
│   │   │   └── StatusBreakdown.jsx# Status distribution progress bars
│   │   ├── landing/               # Public landing page sections
│   │   │   ├── LandingClosing.jsx # Call-to-action closing section
│   │   │   ├── LandingFooter.jsx  # Minimalist footer with brand & author credits
│   │   │   ├── LandingHeader.jsx  # Transparent top bar with logo, theme toggle & auth links
│   │   │   ├── LandingHero.jsx    # Left-aligned hero with Deadline Ruler preview
│   │   │   └── LandingSteps.jsx   # 3-step 'How it works' with static UI component slices
│   │   ├── layout/                # Shell, top navigation, mobile bottom bar, fallbacks
│   │   │   ├── AppShell.jsx       # Logged-in page shell with skip-links
│   │   │   ├── BackLink.jsx       # Standard back arrow navigation link
│   │   │   ├── BottomNav.jsx      # Mobile sticky bottom 3-tab bar
│   │   │   ├── ErrorBoundary.jsx  # React error boundary catching render crashes
│   │   │   ├── NetworkStatus.jsx  # Offline toast & reconnect handler
│   │   │   ├── PageContainer.jsx  # Standard width & horizontal padding wrapper
│   │   │   ├── PageFallback.jsx   # Suspense fallback with logo and spinner
│   │   │   ├── PageHeader.jsx     # Semantic h1 header with responsive actions
│   │   │   ├── RouteEffects.jsx   # Top-of-page scroll on navigation
│   │   │   ├── TopBar.jsx         # Sticky desktop top navigation bar
│   │   │   └── UserMenu.jsx       # Accessible user popover menu
│   │   └── ui/                    # Primitive design-system components
│   │       ├── Avatar.jsx, Button.jsx, Checkbox.jsx, ConfirmDialog.jsx,
│   │       ├── DueChip.jsx, EmptyState.jsx, ErrorState.jsx, Field.jsx,
│   │       ├── IconButton.jsx, Input.jsx, Logo.jsx, Menu.jsx,
│   │       ├── PasswordInput.jsx, ReplyTypeBadge.jsx, Select.jsx,
│   │       ├── Skeleton.jsx, Spinner.jsx, StatusBadge.jsx, Textarea.jsx
│   │   ├── context/               # Global state contexts
│   │   │   ├── AuthContext.jsx    # Session state, login/register/logout & 401 handling
│   │   │   └── ThemeContext.jsx   # Light/dark theme toggle, localStorage & system sync
│   │   ├── hooks/                 # Custom reusable React hooks
│   │   │   ├── useApplication.js, useApplications.js, useDebouncedValue.js,
│   │   │   ├── useDeleteApplication.js, usePageMeta.js, usePageTitle.js,
│   │   │   ├── useReplyMutations.js, useSaveApplication.js, useStats.js
│   │   ├── lib/                   # Pure utility functions and domain helpers
│   │   │   ├── applicationForm.js # Form validation, payload formatting & date math
│   │   │   ├── applications.js    # Reply ordering & status color helpers
│   │   │   ├── brand.js           # Centralized brand constants & config
│   │   │   ├── cn.js              # Classnames merger
│   │   │   ├── constants.js       # Limits, statuses, reply types & labels
│   │   │   ├── format.js          # Currency, relative dates, due text
│   │   │   ├── landingSamples.js  # Static sample data for landing previews
│   │   │   ├── normalize.js       # String trimming & whitespace cleaners
│   │   │   └── ruler.js           # 14-day bucket lane algorithm & collision detection
│   │   ├── pages/                 # Route screens (lazy-loaded)
│   │   │   ├── ApplicationDetail.jsx
│   │   │   ├── ApplicationForm.jsx
│   │   │   ├── Applications.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Landing.jsx        # Public marketing landing page at /
│   │   │   ├── NotFound.jsx
│   │   │   └── Styleguide.jsx     # Dev-only visual component sandbox
│   │   └── styles/
│   │       └── index.css          # Design tokens, @theme definitions & font faces
│   ├── App.jsx                    # Lazy router, route guards & React Query provider
│   ├── index.html                 # HTML metadata, dark theme-color & OpenGraph tags
│   └── main.jsx                   # Application DOM mount
├── eslint.config.js               # ESLint flat config
├── vercel.json                    # Production proxy & SPA rewrite configuration
└── vite.config.js                 # Vite + Tailwind v4 + API reverse proxy setup
```

---

## Design System & Tokens

Applied avoids generic SaaS defaults. Everything is driven by semantic CSS variables defined in `src/styles/index.css`:

- **Typography**: Self-hosted variable `Schibsted Grotesk` across Latin and Latin-ext character sets. Numbers use tabular figures (`tnum` / `font-variant-numeric: tabular-nums`).
- **Surfaces**:
  - `bg-paper`: Base canvas background (`#F1F3F0` light, `#12171B` dark).
  - `bg-surface`: Elevated card surface (`#FFFFFF` light, `#1A2026` dark).
  - `bg-sunken`: Sunken input, pill, and track surface (`#E6E9E4` light, `#0D1114` dark).
  - `border-rule`: 1px architectural divider rule (`#D6DBD2` light, `#263038` dark).
- **Ink**:
  - `text-ink`: Primary high-contrast text (`#111618` light, `#EEF2E6` dark).
  - `text-ink-soft`: Secondary informational text (`#52606D` light, `#8C9DAE` dark).
- **Highlighter Rule**: The highlighter yellow (`--color-highlighter`) is strictly reserved for **time** (deadlines today or within 3 days) and the brand logo dot. It is never used for general decorations or status bars.
- **Hierarchical Radii**: Outer containers use `12px` / `16px`, interior elements use `6px` / `8px`, pills and avatars use `full`.
- **Motion**: Subtle transitions ($120$–$200\text{ ms}$). All interactive animations respect `prefers-reduced-motion: reduce`.

---

## Brand Constants & Rebranding

All application brand text is centralized in [`src/lib/brand.js`](src/lib/brand.js). To rebrand the application, edit this single file:

```javascript
export const APP_NAME = import.meta.env.VITE_APP_NAME || "Applied";
export const WORDMARK = APP_NAME;
export const TAGLINE = "Track every application in one place.";
export const AUTHOR_NAME = "Brijesh";
export const GITHUB_URL = "https://github.com/Brijesh667/Applied";
```

- **Environment Overrides**: Set `VITE_APP_NAME` in `frontend/.env` to customize the app title in `<title>`, OpenGraph tags, and UI components without touching code.
- **Strict Brand Integrity**: No hardcoded "Applied" strings exist across components or hooks. All metadata and wordmarks source directly from `brand.js`.

---

## Landing Page & Modal Auth Architecture

Applied features a public marketing landing page at `/` designed strictly around `DESIGN.md` guidelines (no generic SaaS templates, no fake testimonials, no 3-card feature columns, and no hamburger menus).

### Key Components:
- **`Landing.jsx`**: Public landing screen at `/` featuring left-aligned display typography, signature static `DeadlineRuler` preview, 3-step 'How it works' workflow with real UI component slices, and transparent header.
- **`AuthDialog.jsx`**: Modal authentication flow built on top of the native HTML `<dialog>` element.
  - Controlled via URL search parameters: `/?auth=login` opens the log-in view; `/?auth=register` opens the sign-up view.
  - Automatically adapts to a bottom sheet on mobile screens (`< 640px`).
  - Supports full keyboard accessibility: Esc to close, focus trapping, and restoration of focus to the triggering element.
  - Deep-linkable and browser-history friendly: closing updates the URL back to `/` without page reloads; clicking browser Back closes the modal.
  - Legacy redirects: Direct visits to `/login` or `/register` replace-redirect to `/?auth=login` or `/?auth=register`, preserving target navigation state.

### The Session Hint (`session-hint`):
To prevent an abrupt flash of the public landing page when authenticated users reload `/` or open new tabs, Applied uses a non-sensitive boolean flag in `localStorage`:
```javascript
localStorage.setItem("session-hint", "1");
```
- **Privacy & Security**: Contains **zero** user data, secrets, or tokens. Real authentication is strictly governed by `HttpOnly` server session cookies.
- **Cold-Start Resilience**: If `session-hint === "1"`, Applied renders a calm loading state while validating the session with `GET /api/auth/me`. If the backend is waking up or temporarily unavailable, it gracefully times out and clears the hint rather than blocking the UI or throwing an error wall.
- **Immediate Invalidation**: Cleared immediately on explicit logout (`POST /api/auth/logout`) and on any `401 Unauthorized` response.

---

## Architecture & Technical Decisions

1. **TanStack React Query Cache Strategy**:
   - `stats`: 30-second stale time.
   - `applications.list`: 30-second stale time.
   - `applications.detail`: 30-second stale time.
   - Hover and focus prefetching on navigation links and `ApplicationCard` ensures near-instantaneous transitions.
2. **URL-Synced Search & Filters**:
   - Filter state (`search`, `status`, `platform`, `replied`, `sort`, `page`) lives directly in the URL search params.
   - Searching is debounced by 400ms to preserve network bandwidth while keeping back/forward navigation fully reproducible.
3. **Lazy Code Splitting**:
   - All page routes (`Dashboard`, `Applications`, `ApplicationForm`, `ApplicationDetail`, `Landing`, `NotFound`) are loaded via `React.lazy()` with a branded `Logo` + `Spinner` fallback.
   - Initial landing page bundle footprint is $< 100\text{ kB}$ gzip (91.7 kB core + 7.2 kB landing), well below performance budgets.
   - Dev-only `Styleguide` is eliminated from production builds via `import.meta.env.DEV` branch elimination.
4. **Resilient Session & Error Handling**:
   - Centralized `ApiError` mapping in `client.js`.
   - Global 401 interceptor automatically flushes stale query cache and redirects to `/?auth=login` preserving target route state.
   - Offline detection with persistent toast notifications and auto-dismiss on reconnection.

---

## Production Deployment

### Option A: Vercel with Reverse Proxy (Recommended)
Because Applied uses secure `HttpOnly` session cookies, having the frontend and backend share the same origin avoids cross-site cookie restrictions.

1. Deploy the backend API to your hosting provider (Render, Railway, Fly.io, etc.).
2. In `frontend/vercel.json`, configure the API destination:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://applied-api.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
3. Deploy `frontend/` to Vercel.

### Option B: Standalone Static Hosting (with CORS)
1. Point `VITE_API_URL` to your full backend domain (e.g. `https://api.yourdomain.com`).
2. Ensure the backend Express server has CORS configured with `credentials: true` and `origin: 'https://applied.yourdomain.com'`.
3. Ensure session cookie is configured with `sameSite: 'none'` and `secure: true`.

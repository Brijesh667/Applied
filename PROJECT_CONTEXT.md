# Project Context & Architecture Documentation: Applied

> **Applied** is a modern, high-performance web application designed to help job seekers track their job/internship applications, monitor replies and deadlines, manage parsed resumes, and discover AI-ranked job opportunities across multiple global job search boards.

---

## 1. High-Level System Architecture

Applied is architected as a decoupled, full-stack web application:

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (Single Page App)                  │
│   React 18 + Vite + Tailwind CSS v4 + TanStack Query v5    │
│            Runs on port 5173 (Development)                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               HTTP / REST (credentials: "include")
               Cookie-based Session Auth ('sid')
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend REST API Server                  │
│       Node.js (ES Modules) + Express + connect-mongo        │
│                 Runs on port 5000                           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
┌──────────────▼──────────────┐ ┌─────────────▼───────────────┐
│     MongoDB Database        │ │    Third-Party Cloud & APIs │
│  - Users                    │ │  - Cloudinary (File Store)  │
│  - Applications & Replies   │ │  - Anthropic Claude /       │
│  - Resumes                  │ │    Google Gemini (AI)       │
│  - JobSearchCache & Sessions│ │  - Job APIs (Adzuna, Jooble,│
└─────────────────────────────┘ │    Careerjet, JSearch, etc.)│
                                └─────────────────────────────┘
```

---

## 2. Backend Deep Dive

### 2.1 Technology Stack
- **Runtime & Framework**: Node.js (ES Modules, `"type": "module"`), Express.js.
- **Database & ODM**: MongoDB with Mongoose ODM.
- **Session Management**: `express-session` with `connect-mongo` storing sessions in MongoDB.
- **Security & Headers**: `helmet` (secure HTTP headers), `cors` (origin validation with credentials), `bcrypt` (password hashing).
- **Validation**: `zod` for environment variable validation and request payload validation.
- **File Upload & Storage**: `multer` (in-memory buffering), Cloudinary SDK (secure raw document uploads and signed downloads).
- **Text Extraction**: `pdf-parse` (PDF extraction), `mammoth` (DOCX extraction).
- **AI Integrations**: `@anthropic-ai/sdk` (Claude Haiku 3.5 / 3) and `@google/genai` (Gemini 2.5 Flash) for resume parsing and semantic job matching.

---

### 2.2 Backend Request Flow & Lifecycle

When a request reaches the backend, it passes through the following pipeline:

1. **Query Parser & Trust Proxy**: Express extended query parser (`qs`), and proxy hops configuration (`TRUST_PROXY`).
2. **Security & Diagnostics**:
   - `helmet()` sets security headers.
   - `morgan("dev")` logs HTTP requests.
   - `cors({ origin: config.clientUrls, credentials: true })` ensures only authorized frontends can interact with the API with credentials.
   - `express.json({ limit: "10kb" })` parses JSON payloads and guards against payload injection.
3. **Session Middleware**:
   - Reads the `sid` cookie sent by the browser.
   - Looks up the session document in MongoDB (`sessions` collection).
   - Attaches `req.session` (containing `userId`) to the request.
   - Session cookie settings: `httpOnly: true`, `sameSite: "lax"` (or `"none"` if cross-site), `secure` (in production), 7-day TTL.
4. **Health Route**: `GET /api/health` returns status without hitting rate limiters.
5. **Rate Limiting**:
   - General API limiter (`apiLimiter`: 100 req / 15 min).
   - Auth limiter (`authLimiter`: 10 req / 15 min for login/register).
   - Resume limiter (`resumeUploadLimiter`, `resumeReparseLimiter`).
   - Job limiter (`jobSearchLimiter`, `jobTrackLimiter`).
6. **Route Handlers & Middlewares**:
   - `isAuthenticated`: Validates `req.session.userId`, queries the database for user existence, and populates `req.user`.
   - `validate(schema)` / `validateQuery(schema)`: Validates body or query parameters using Zod schemas.
   - `validateObjectId(paramName)`: Ensures URL parameters are valid 24-character hexadecimal MongoDB ObjectIds.
7. **Controller & Service Layer**: Executes core business logic, database queries, AI invocations, or third-party API aggregations.
8. **Centralized Error Handler (`errorHandler.js`)**: Catches all errors, formats validation errors (Zod / Mongoose) into consistent `{ message, errors }` shapes, masks internal server stack traces in production, and emits appropriate HTTP status codes (400, 401, 403, 404, 409, 429, 500).

---

### 2.3 Database Models & Schemas

#### 1. `User` (`backend/src/models/User.js`)
- `name`: String, required, max 60 chars.
- `email`: String, required, unique, lowercase, trimmed, validated via regex.
- `password`: String, required, hashed with `bcrypt`, marked `select: false` so it is never exposed in queries.
- Timestamps: `createdAt`, `updatedAt`.

#### 2. `Application` (`backend/src/models/Application.js`)
- `userId`: ObjectId referencing `User` (indexed).
- `companyName`: String, required, max 100 chars.
- `role`: String, required, max 100 chars.
- `appliedFrom`: String (e.g., LinkedIn, Indeed, Career Page), required, max 60 chars.
- `pay`: Object containing:
  - `type`: Enum (`"yearly"`, `"monthly"`, `"onetime"`).
  - `amount`: Number (min 0, max 100,000,000).
- `duration`: String (e.g., `"Full-time"`, `"6 months"`), max 50 chars.
- `skills`: String (comma-separated or free-form), max 500 chars.
- `description`: String, max 5000 chars.
- `jobLink`: String, HTTP/HTTPS URL, max 500 chars.
- `notes`: String, max 2000 chars.
- `status`: String, enum: `["applied", "in-process", "offer", "rejected"]`, default `"applied"`.
- `appliedDate`: Date, default `Date.now`.
- `resumeId`: ObjectId referencing `Resume`, optional.
- `replies`: Array of embedded subdocuments (`replySchema`):
  - `type`: Enum (`"screening"`, `"interview"`, `"assessment"`, `"offer"`, `"rejection"`, `"ghosted"`, `"other"`).
  - `receivedDate`: Date, default `Date.now`.
  - `deadline`: Date, optional (must be >= `receivedDate`).
  - `completed`: Boolean, default `false`.
  - `notes`: String, max 1000 chars.
- Compound Indexes:
  - `{ userId: 1, appliedDate: -1 }` (for chronology).
  - `{ userId: 1, companyName: 1 }` (for search/filtering).
  - `{ userId: 1, status: 1 }` (for status metrics).

#### 3. `Resume` (`backend/src/models/Resume.js`)
- `userId`: ObjectId referencing `User` (indexed).
- `label`: String, custom label (e.g. "Full-Stack Dev 2026").
- `fileName`: Original upload filename.
- `fileType`: Enum (`"pdf"`, `"docx"`).
- `fileSize`: Number (max 5 MB).
- `storagePublicId`: Cloudinary asset ID (`select: false`).
- `isDefault`: Boolean, only one default resume allowed per user.
- `parseStatus`: Enum (`"pending"`, `"done"`, `"failed"`).
- `parseError`: Reason for failure if any (`"no_text"`, `"ai_unavailable"`, `"ai_failed"`, etc.).
- `extractedText`: Raw extracted text (`select: false`).
- `skills`: Array of Strings (parsed or manually edited skills).
- `roleTitles`: Array of Strings (target roles inferred from resume).
- `experienceYears`: Number.
- `locationPreference`: String.
- `rawParsedProfile`: JSON object with raw AI analysis.

#### 4. `JobSearchCache` (`backend/src/models/JobSearchCache.js`)
- `userId`: ObjectId referencing `User`.
- `resumeId`: ObjectId referencing `Resume`.
- `profileHash`: SHA1 hash computed from resume skills, roles, experience, and location.
- `searchHash`: SHA1 hash combining `profileHash` and canonical search filters.
- `filters`: Normalized filter parameters.
- `queries`: Generated search queries sent to job boards.
- `jobs`: Embedded array of aggregated, deduplicated, and ranked job objects.
- `facets`: Computed facet distributions (employment type, level, remote, platform).
- `sources`: Status of each provider (e.g. `adzuna: "ok"`, `remoteok: "ok"`).
- `rankedBy`: `"ai"` or `"local"`.
- `createdAt`: Indexed with MongoDB TTL index (`JOB_SEARCH_CACHE_TTL_SECONDS` = 6 hours) to automatically expire stale cached searches.

---

### 2.4 Core Backend Functionalities

#### 1. Authentication & Session Management
- **Routes**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.
- Uses `bcrypt` with salt rounds = 10.
- Regenerates session ID on login to protect against session fixation.
- Cleans up cookie on logout and destroys database session document.

#### 2. Application & Reply Management
- **Routes**:
  - `GET /api/applications`: Full search, sort, and pagination. Supports query params: `search`, `status`, `appliedFrom`, `payMin`, `payMax`, `sortBy`, `sortOrder`, `page`, `limit`.
  - `POST /api/applications`: Creates a new application.
  - `GET /api/applications/:id`: Retrieves a single application with populated resume details.
  - `PUT /api/applications/:id`: Updates core application details.
  - `DELETE /api/applications/:id`: Removes application.
  - `POST /api/applications/:id/replies`: Adds a reply subdocument.
  - `PATCH /api/applications/:id/replies/:replyId`: Edits reply (e.g. toggles `completed`, changes deadline).
  - `DELETE /api/applications/:id/replies/:replyId`: Deletes a reply.
- **Automatic Status Derivation (`deriveStatus.js`)**:
  - When replies are added, modified, or removed, the parent application's status is dynamically derived:
    - 0 replies: `"applied"`.
    - Any replies without final decision: `"in-process"`.
    - If reply includes `"offer"` or `"rejection"`, the status matches the latest decision: `"offer"` or `"rejected"`.

#### 3. Analytics & Statistics (`stats.controller.js`)
- **Route**: `GET /api/stats`.
- Uses a multi-facet MongoDB `$facet` aggregation pipeline executing in a single database round-trip:
  - `overview`: Total applications, total replied count, calculated reply rate percentage.
  - `statusCounts`: Grouping by application status.
  - `repliesByType`: Grouping by reply type (interview, assessment, offer, etc.).
  - `platforms`: Total applications and reply rate grouped by platform (`appliedFrom`).
  - `pendingDeadlines`: Finds uncompleted replies with deadlines where status is not rejected.
  - `attention`: Extracts overdue deadlines and deadlines occurring within the next 7 days for the "Needs Attention" queue.

#### 4. Resume Storage & AI Parsing Pipeline (`services/resume*.js`)
- **Routes**:
  - `POST /api/resumes`: Uploads file via Multer, sends stream/buffer to Cloudinary, extracts text (`pdf-parse` or `mammoth`), stores record, and triggers async AI parsing.
  - `GET /api/resumes`: Lists all user resumes.
  - `GET /api/resumes/:id`: Fetches details and parsed skills/roles.
  - `GET /api/resumes/:id/download`: Generates a temporary signed Cloudinary download URL.
  - `PATCH /api/resumes/:id`: Allows the user to manually edit skills, target roles, or toggle `isDefault`.
  - `POST /api/resumes/:id/reparse`: Re-runs AI extraction on demand.
  - `DELETE /api/resumes/:id`: Deletes asset from Cloudinary and removes record from MongoDB.
- **AI Extraction Pipeline**:
  - Sends extracted text to Anthropic Claude or Google Gemini using strict JSON schema prompting.
  - Extracts: normalized technical skills, target role titles, estimated experience in years, and location preference.

#### 5. Multi-Source Job Aggregation & AI Ranking Engine (`services/jobs/`)
- **Routes**:
  - `POST /api/jobs/search`: Takes `resumeId` and user filters.
  - `GET /api/jobs/searches/latest`: Retrieves cached results for quick loading.
  - `GET /api/jobs/searches/:searchId/jobs`: Paginated view of cached search results.
  - `POST /api/jobs/track`: Converts a job search result into a tracked `Application` in 1 click.
- **Providers Aggregated**:
  - **Adzuna**: International job search API.
  - **JSearch**: RapidAPI aggregator (LinkedIn, Indeed, Glassdoor).
  - **Jooble**: Global job search engine.
  - **Careerjet**: Country-localized job search API.
  - **Himalayas**: Modern remote jobs API.
  - **RemoteOK**: Developer and tech remote jobs feed.
- **Pipeline Stages**:
  1. *Query Builder*: Translates resume profile into optimized keywords and location queries.
  2. *Parallel Fetching*: Queries all enabled providers concurrently with timeouts.
  3. *Normalization*: Maps inconsistent API outputs into a uniform `Job` schema.
  4. *Deduplication*: Strips URL tracking parameters (utm, ref, source) and hashes `(company + title + canonical applyUrl)` to eliminate duplicates.
  5. *Matching & Scoring*:
     - **AI Ranking (Claude/Gemini)**: Analyzes job descriptions against the user's resume skills, generating a 0-100 `matchScore` and a concise 1-sentence `matchReason`.
     - **Local Fallback Scorer (`localScore.js`)**: Jaccard similarity and keyword intersection fallback if AI quota or keys are unavailable.
  6. *Caching*: Stores results in `JobSearchCache` keyed by profile and filter hash.

---

## 3. Frontend Deep Dive

### 3.1 Technology Stack
- **Framework**: React 18 with Vite 6.
- **Styling**: Tailwind CSS v4, custom theme variables in `frontend/src/styles/index.css`.
- **Icons**: `lucide-react`.
- **Routing**: `react-router-dom` v7 with lazy loading (`React.lazy`, `Suspense`).
- **Data Fetching & State**: `@tanstack/react-query` v5 for server state, query caching, and mutations.
- **Motion & Effects**: `motion` (Framer Motion), custom UI shaders/canvas effects (`ogl` in `LightRays.jsx`), cursor spotlights.
- **Notifications**: `sonner` for toast notifications.

---

### 3.2 Frontend Pages & Contents

#### 1. Landing Page (`/`) — [`Landing.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/Landing.jsx)
- **Purpose**: Public home page explaining the product and converting visitors into users.
- **Key Sections**:
  - `LandingNavbar`: Sticky top navigation with brand wordmark, interactive scroll-spy navigation pill, desktop sign-in button, and responsive mobile toggle menu.
  - `LandingHero`: Ambient radial glow and GPU-accelerated interactive `LightRays` canvas effect. Two-column layout with headline, subtext, `GradientButton` CTA, and an interactive simulated dashboard preview (KPIs + Needs Attention card).
  - `LandingProblemSolution`: Alternating interactive rows showcasing common job search pain points (messy spreadsheets, forgotten follow-ups, opaque timelines) and Applied's solutions.
  - `LandingHowItWorks`: 3-step timeline connected with vertical/horizontal indicator rules.
  - `LandingFAQ`: Accessible 4-item accordion answering questions about pricing, privacy, and platforms.
  - `LandingClosing`: Redesigned bottom CTA card container (`max-w-4xl mx-auto`), dark slate gradient (`from-slate-900 to-slate-800`), centered heading, subtext, and `GradientButton`.
  - `LandingFooter`: Brand wordmark, smooth scroll-to-top handler, and social/GitHub links.
  - `AuthDialog`: URL-driven modal dialog (`/?auth=login` or `/?auth=register`) displaying tabbed login and register forms without navigating away from the page.

#### 2. Dashboard (`/dashboard`) — [`Dashboard.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/Dashboard.jsx)
- **Purpose**: Central command center providing instant insights into the job search pipeline.
- **Key Components**:
  - `OverviewStrip`: 4 metric cards: Total Applications, Response Rate %, Total Replied, and In Process count.
  - `NeedsAttention`: Dynamic urgency list showing applications with pending deadlines (overdue in red, due within 7 days in amber) with quick navigation to replies.
  - `StatusBreakdown`: Horizontal proportion bar and stat tiles displaying the exact count and percentage of applications in `applied`, `in-process`, `offer`, and `rejected` states.
  - `RepliesByType`: Visual breakdown of replies received by stage (screening, technical interview, assessment, offer, etc.).
  - `PlatformTable`: Conversion table ranking job boards by applications submitted and response rate.
  - `RecentApplications`: Chronological list of the latest applications submitted.

#### 3. Applications List (`/applications`) — [`Applications.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/Applications.jsx)
- **Purpose**: Searchable, filterable ledger of every job application.
- **Key Components**:
  - `FilterBar`: Instant text search (company/role), status filter pills, platform dropdown, pay sorting, and clear filters action.
  - `FilterSheet`: Mobile-optimized slide-over bottom sheet for filter controls on smaller screens.
  - `DayRow` & `ApplicationCard`: Grouped chronologically by date of application. Cards feature company logos/placeholders, role, pay badge, status badge, deadline chip, and contextual hover actions.

#### 4. Application Detail (`/applications/:id`) — [`ApplicationDetail.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/ApplicationDetail.jsx)
- **Purpose**: Comprehensive view of an individual job application.
- **Key Components**:
  - Header with company name, role, status badge, and action buttons (Edit, Delete, Add Reply).
  - Metadata grid: Platform applied from, compensation & pay frequency, expected duration, applied date, linked resume.
  - Description and user notes blocks.
  - Embedded `RepliesPanel`: Timeline view of all historical replies, interview rounds, and deadline reminders.

#### 5. Application Form (`/applications/new` & `/applications/:id/edit`) — [`ApplicationForm.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/ApplicationForm.jsx)
- **Purpose**: Single responsive form used for both logging new applications and updating existing ones.
- **Key Components**:
  - Company and role input fields with character limits.
  - `PlatformField`: Quick-select popular platforms (LinkedIn, Indeed, Wellfound, Career Page, etc.) or enter custom source.
  - `MoneyInput` + `SegmentedControl`: Clean currency/pay amount entry paired with yearly/monthly/one-time toggles.
  - `SkillsField`: Interactive chip tags editor for skills relevant to this application.
  - Job link input with automatic URL validation.
  - Resume selector linking an uploaded resume to this specific application.

#### 6. Application Replies (`/applications/:id/replies`) — [`ApplicationReplies.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/ApplicationReplies.jsx)
- **Purpose**: Dedicated workspace to log, edit, and check off interview rounds, assessments, and decision emails.
- **Key Components**:
  - Chronological timeline of reply cards (`ReplyCard.jsx`).
  - `ReplyForm.jsx`: Dialog/panel to add or edit replies with reply type dropdown, date received picker, deadline date picker, completion checkbox, and notes.

#### 7. Jobs Search Engine (`/jobs`) — [`Jobs.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/Jobs.jsx)
- **Purpose**: Aggregated job board with automated resume-tailored matching.
- **Key Components**:
  - Resume selector: Choose which uploaded resume drives the search parameters.
  - `JobSearchForm`: Keyword and location search inputs with a "Search Jobs" trigger and cache-refresh action.
  - `ResultFilters`: Filter results on the fly by remote/onsite, job type (fulltime, internship), experience level, platform, and minimum salary.
  - `JobCard`: Displays job title, company, location, salary range, source badge, match score badge (with AI reasoning tooltip), and external apply button.
  - `ApplyButton` & `DidYouApplyDialog`: When clicking apply, Applied opens the external listing in a new tab and presents a subtle prompt: *"Did you apply?"*. Clicking "Yes" automatically transfers the job's title, company, salary, and URL directly into a new application entry with 1 click.

#### 8. Resumes Management (`/resumes`) — [`Resumes.jsx`](file:///home/brijesh/GitCode/Applied/frontend/src/pages/Resumes.jsx)
- **Purpose**: Centralized storage and AI parsing dashboard for user resumes.
- **Key Components**:
  - `UploadResumeDialog`: Drag-and-drop file uploader supporting `.pdf` and `.docx` up to 5 MB.
  - `ResumeCard`: Displays resume title, original filename, upload date, file size, and parsing status badge (`pending`, `done`, `failed`).
  - Extracted profile display: Parsed skills chips, inferred target job roles, estimated years of experience, and preferred location.
  - `EditResumeDialog`: Allows users to add, edit, or delete skills chips and roles.
  - Actions: Set as default resume, download original file via signed URL, trigger AI reparse, or delete resume.

#### 9. Error & Support Views
- `NotFound.jsx` (`*`): Friendly 404 page with navigation to return to `/dashboard`.
- `ErrorBoundary.jsx`: React class component wrapping routes and panels, catching uncaught runtime render errors and presenting a retry button.
- `NetworkStatus.jsx`: Real-time listener on window offline/online events, showing a subtle banner if the user loses connectivity.
- `Styleguide.jsx` (`/styleguide`): Dev-only page displaying the full design system typography, color palettes, status chips, buttons, and form inputs.

---

## 4. How Frontend & Backend Connect

### 4.1 Base Configuration & URL Resolution
- In `frontend/src/api/client.js`:
  ```javascript
  const BASE_URL = (import.meta.env.VITE_API_URL ?? "") + "/api";
  ```
- In local development, `VITE_API_URL` defaults to empty string `""` or `http://localhost:5000`. Vite proxies requests or the browser connects directly via CORS.

---

### 4.2 Authentication & Session Flow Across the Wire

```
Browser (React App)                             Backend (Express Server)
       │                                                   │
       ├─── POST /api/auth/login { email, password } ─────►│ (Validates bcrypt hash)
       │                                                   │ (Creates MongoDB session)
       │◄── Set-Cookie: sid=s%3A...; HttpOnly; SameSite ───┤
       │                                                   │
       │ (Stores 'session-hint' in localStorage)           │
       │                                                   │
       ├─── GET /api/auth/me (Cookie: sid=...) ───────────►│ (Looks up req.session.userId)
       │◄── 200 OK { user: { id, name, email } } ──────────┤
       │                                                   │
       ├─── Subsequent API Calls (Cookie: sid=...) ───────►│ (isAuthenticated middleware)
       │◄── 200 OK [Data Payload] ─────────────────────────┤
       │                                                   │
       ├─── 401 Unauthorized (If session expired) ────────►│
       │◄── 401 { message: "Not authenticated" } ──────────┤
       │ (client.js clears 'session-hint', calls           │
       │  unauthorizedHandler to trigger AuthDialog)       │
```

- **No JWT tokens in LocalStorage**: Authentication relies exclusively on secure, `HttpOnly` session cookies (`sid`). This protects against Cross-Site Scripting (XSS) token theft.
- **`credentials: "include"`**: Every fetch request initiated by `frontend/src/api/client.js` sends `credentials: "include"`, ensuring session cookies are sent across all API calls.
- **`session-hint` Optimization**: When authenticated, a lightweight flag (`session-hint=1`) is saved to `localStorage`. On page load, this hint allows the app to show a sleek splash screen while `useQuery(["me"])` runs in the background, avoiding jarring page jumps between the public Landing page and the authenticated Dashboard.

---

### 4.3 Unified API Client (`frontend/src/api/client.js`)

All communication is routed through a single fetch wrapper:
- **Automatic Headers**: Sets `Accept: "application/json"`. Automatically sets `Content-Type: "application/json"` for JSON payloads, but automatically omits it when sending `FormData` so the browser generates the multipart boundary.
- **`ApiError` Custom Class**: Captures HTTP status code, server error messages, and field-specific validation errors:
  ```javascript
  throw new ApiError(status, message, fieldErrors, data);
  ```
- **Global 401 Interception**: Intercepts 401 responses on protected endpoints, clears the session hint, and invokes the `unauthorizedHandler` registered by `AuthContext` to gracefully prompt the user to re-authenticate.

---

### 4.4 Data Synchronization with TanStack React Query

The frontend uses TanStack React Query v5 to synchronize server state, manage caches, and handle mutations:
- **Central Query Keys (`frontend/src/api/queryKeys.js`)**:
  - `queryKeys.me`: Current authenticated user profile.
  - `queryKeys.stats`: Dashboard overview metrics and deadlines.
  - `queryKeys.applications.list(filters)`: Application search results.
  - `queryKeys.applications.detail(id)`: Single application and replies.
  - `queryKeys.resumes.list`: All user resumes.
  - `queryKeys.jobs.latest(resumeId)`: Latest cached job search results.
- **Cache Invalidation on Mutations**:
  - When an application is created or updated, `queryClient.invalidateQueries({ queryKey: queryKeys.applications.all })` and `queryClient.invalidateQueries({ queryKey: queryKeys.stats })` are triggered.
  - When replies are added or edited, the specific application detail query and the dashboard stats query are updated to reflect new deadlines and derived statuses immediately.

---

### 4.5 Full API Endpoint Reference Table

| Module | HTTP Method | Endpoint | Description | Protected? |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Create user account | No |
| | `POST` | `/api/auth/login` | Authenticate user & issue session cookie | No |
| | `POST` | `/api/auth/logout` | Destroy session & clear cookie | Yes |
| | `GET` | `/api/auth/me` | Fetch active user session | Yes |
| **Stats** | `GET` | `/api/stats` | Aggregate dashboard KPIs, deadlines, platform stats | Yes |
| **Applications** | `GET` | `/api/applications` | Query, filter, and paginate applications | Yes |
| | `POST` | `/api/applications` | Create a new job application | Yes |
| | `GET` | `/api/applications/:id` | Fetch application details and replies | Yes |
| | `PUT` | `/api/applications/:id` | Update core application details | Yes |
| | `DELETE` | `/api/applications/:id` | Delete an application | Yes |
| **Replies** | `POST` | `/api/applications/:id/replies` | Add interview, assessment, or decision reply | Yes |
| | `PATCH` | `/api/applications/:id/replies/:replyId` | Update reply (deadline, completed, notes) | Yes |
| | `DELETE` | `/api/applications/:id/replies/:replyId` | Delete a specific reply | Yes |
| **Resumes** | `GET` | `/api/resumes` | List all resumes uploaded by user | Yes |
| | `POST` | `/api/resumes` | Upload resume file (PDF/DOCX) & trigger parse | Yes |
| | `GET` | `/api/resumes/:id` | Get parsed resume profile and skills | Yes |
| | `PATCH` | `/api/resumes/:id` | Manually edit skills, roles, or set as default | Yes |
| | `POST` | `/api/resumes/:id/reparse` | Re-run AI parser on resume document | Yes |
| | `GET` | `/api/resumes/:id/download` | Get signed temporary Cloudinary download URL | Yes |
| | `DELETE` | `/api/resumes/:id` | Remove resume from storage and database | Yes |
| **Jobs** | `POST` | `/api/jobs/search` | Trigger multi-provider job search with AI ranking | Yes |
| | `GET` | `/api/jobs/searches/latest` | Retrieve cached search results | Yes |
| | `GET` | `/api/jobs/searches/:searchId/jobs` | Paginate cached job results | Yes |
| | `POST` | `/api/jobs/track` | Convert job listing to tracked application | Yes |
| **Health** | `GET` | `/api/health` | Health check endpoint | No |

---

## 5. Environment Variables & Setup

### Backend (`backend/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/applied
SESSION_SECRET=your_super_secret_session_key_min_32_chars
CLIENT_URL=http://localhost:5173
COOKIE_SAMESITE=lax
TRUST_PROXY=0

# Cloudinary (File storage for resumes)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# AI Providers (Anthropic or Google)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-haiku-5-5
# or
# AI_PROVIDER=google
# GOOGLE_API_KEY=AIzaSy...
# GOOGLE_MODEL=gemini-2.5-flash

# Job Search APIs (Optional / Configurable)
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
JSEARCH_API_KEY=...
JOOBLE_API_KEY=...
CAREERJET_API_KEY=...
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
```
*(In production, if frontend and backend are hosted on the same domain or behind a reverse proxy, `VITE_API_URL` can be left blank).*

# Project Context: Applied

> Applied is a calm, disciplined job and internship application tracker designed specifically for students and early-career job seekers.

---

## 1. Project Overview & Architecture

Applied provides a streamlined workflow to track applications, stage-by-stage replies (assessments, interviews, offers, rejections), deadlines, and resumes.

### Architecture
- **Backend**: Express.js (v5) on Node.js (ESM), MongoDB via Mongoose, Session authentication via `express-session` & `connect-mongo`.
- **Frontend**: React 18, Vite, Tailwind CSS v4, TanStack React Query v5.
- **File Storage**: Cloudinary Private Storage (authenticated raw assets, short-lived signed URLs).

---

## 2. Tech Stack & Dependencies

### Backend Dependencies
- **Core**: `express` (v5), `dotenv`, `cors`, `helmet`, `morgan`
- **Database & Auth**: `mongoose`, `connect-mongo`, `express-session`, `bcrypt`
- **Validation**: `zod`
- **Rate Limiting**: `express-rate-limit`
- **File Upload & Storage**: `multer`, `cloudinary`
- **AI Parsing**: `@anthropic-ai/sdk`, `@google/genai`

---

## 3. Data Models

### User (`backend/src/models/User.js`)
- `name`: String, required, max 50, normalized.
- `email`: String, required, unique, lowercase, trim.
- `password`: String, required, select: false (bcrypt hashed).
- Timestamps: `createdAt`, `updatedAt`.

### Application (`backend/src/models/Application.js`)
- `userId`: ObjectId ref User, required, indexed.
- `companyName`: String, required, max 50, normalized.
- `role`: String, required, max 50, normalized.
- `appliedFrom`: String, required, max 30, normalized.
- `pay`: Object `{ type: enum ['yearly', 'monthly', 'onetime'], amount: Number (0 - 10,000,000) }`.
- `duration`: String, required, max 10, normalized.
- `skills`: String, max 150, normalized.
- `description`: String, max 300, normalized.
- `notes`: String, max 200, normalized.
- `jobLink`: String, max 500, http/https URL.
- `status`: String, enum `['applied', 'in-process', 'offer', 'rejected']`, default `applied`.
- `appliedDate`: Date, default `Date.now`.
- `resumeId`: ObjectId ref Resume, default `null`.
- `replies`: Array of Reply subdocuments.

### Resume (`backend/src/models/Resume.js`) — Added in Phase 1 (Parts 1 & 2)
- `userId`: ObjectId ref User, required, indexed via compound indexes.
- `label`: String, required, max 50, normalized (`normalizeText`).
- `fileName`: String, required, max 100 (sanitized: stripped path parts and control chars, truncated).
- `fileType`: String, required, enum `['pdf', 'docx']`.
- `fileSize`: Number, required (bytes).
- `storagePublicId`: String, required, `select: false`.
- `isDefault`: Boolean, default `false`.
- `parseStatus`: String, enum `['pending', 'done', 'failed']`, default `'pending'`.
- `parseError`: String, enum `[null, 'no_text', 'ai_unavailable', 'ai_failed', 'invalid_output', 'extract_failed']`, default `null`.
- `parseStartedAt`: Date, default `null`.
- `parsedAt`: Date, default `null`.
- `skillsEditedByUser`: Boolean, default `false` (prevents AI reparse from overwriting manual user corrections).
- `extractedText`: String, default `""`, `select: false`.
- `skills`: `[String]`, max 30 items, each max 40 chars, normalized.
- `roleTitles`: `[String]`, max 5 items, each max 60 chars, normalized.
- `experienceYears`: Number, 0–50, default `null`.
- `locationPreference`: String, max 100, normalized, default `""`.
- Timestamps: `createdAt`, `updatedAt`.

Indexes:
- `{ userId: 1, createdAt: -1 }`
- `{ userId: 1 }` with `partialFilterExpression: { isDefault: true }` and `unique: true` (strictly prevents multiple default resumes per user).

### JobSearchCache (`backend/src/models/JobSearchCache.js`) — Added in Phase 2, Extended in Phase 3
- `userId`: ObjectId ref User, required, indexed.
- `resumeId`: ObjectId ref Resume, required.
- `searchHash`: String, required, sha1 of resume profile hash + canonical filters JSON.
- `filters`: Mixed Object, canonical search filters.
- `jobs`: Array of normalized and ranked job objects (with `jobType`, `level`, `rank`, `matchScore`, `matchReason`, `scoredBy`, `attribution`, `salaryText`).
- `sources`: Object with status per provider (`ok`, `failed`, `quota`, `skipped`).
- `rankedBy`: String, enum `['ai', 'local']`, default `'local'`.
- `rankStatus`: String, enum `['ok', 'unavailable', 'quota', 'timeout', 'invalid_output', 'failed', 'skipped']`.
- Timestamps: `createdAt`, `updatedAt`.
- TTL Index: `{ createdAt: 1 }` with `expireAfterSeconds: 86400`.
- Unique Index: `{ userId: 1, resumeId: 1, searchHash: 1 }`.
- Gracefully drops old `profileHash` index on collection initialization. Bounded by `trimUserSearches` to max 10 entries per user.

---

## 4. API Endpoints

### Auth (`/api/auth`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Applications (`/api/applications`)
- `POST /api/applications` (supports optional `resumeId`)
- `GET /api/applications`
- `GET /api/applications/:id`
- `PUT /api/applications/:id` (supports optional `resumeId`, allows `resumeId: null` to unlink)
- `DELETE /api/applications/:id`
- `POST /api/applications/:id/replies`
- `PATCH /api/applications/:id/replies/:replyId`
- `DELETE /api/applications/:id/replies/:replyId`

### Stats (`/api/stats`)
- `GET /api/stats`

### Resumes (`/api/resumes`) — Added in Phase 1 (Parts 1 & 2)
- `POST /api/resumes`: Multipart (`file`, optional `label`). Max 5 resumes, max 5 MB, PDF or DOCX. Rate limited to 20 uploads/hr. Extracts text synchronously, saves `extractedText` (`select: false`), initiates unawaited background AI parse, returns `201 { resume }`.
- `GET /api/resumes`: Returns `200 { resumes, limit: 5 }` ordered with default first, then newest. Includes parsed profile fields.
- `GET /api/resumes/:id`: Returns `200 { resume }` for single resume by ID.
- `GET /api/resumes/:id/download`: Generates secure, short-lived signed download URL (valid for 300s). Returns `200 { url, expiresInSeconds }`.
- `POST /api/resumes/:id/reparse`: Retrigger background AI parsing. Allowed when status is `failed`, `done`, or stale `pending` (>120s). Returns `202 { resume }`. Rate limited to 10/hr. If currently active, returns `409 { message: "Parsing is already in progress" }`.
- `PATCH /api/resumes/:id`: Rename (`label`), promote to default (`isDefault: true`), or manually edit profile fields (`skills`, `roleTitles`, `experienceYears`, `locationPreference`). Editing profile fields flags `skillsEditedByUser: true`. Returns `200 { resume }`.
- `DELETE /api/resumes/:id`: Deletes document from DB, promotes next newest resume if default was deleted, nullifies `resumeId` across user's applications, and deletes authenticated asset from Cloudinary. Returns `200 { message }`.

### Jobs (`/api/jobs`) — Added in Phase 2, Extended in Phase 3
> Note: Frontend Part 3 will connect to and use these new endpoints (`/api/jobs/searches/:searchId/jobs` and `/api/jobs/searches/latest`).

- `POST /api/jobs/search`: Search and rank jobs matching resume criteria and optional filters (`jobType`, `experience`, `roles`, `location`, `remote`, `postedWithinDays`, `minPay`). Rate limited to 10/hr per user. Evaluates up to 150 jobs locally, evaluates top 25 candidate jobs via a single batched AI call, and stores up to 150 ranked jobs in `JobSearchCache`. Returns page 1 with 20 items, `facets`, and `search` metadata. Adds dynamic `trackedApplicationId` to every returned job.
- `GET /api/jobs/searches/:searchId/jobs`: Paged and filtered read of stored search results. Supports `page`, `limit`, `sort` (`best` | `newest`), `source`, `remote`, `match`, `payListed`, `hideTracked`, and `q`. Computes facets over whole stored list. Zero provider or AI calls.
- `GET /api/jobs/searches/latest`: Restores user's latest unexpired search and canonical filters (optional `?resumeId=`). Zero provider or AI calls.
- `POST /api/jobs/track`: Track a job from search results into an Application document. Body: `{ resumeId, jobId }`. Fetches the job from the server's cache, checks for URL duplicates (returns `409 { message: "You already track this job", applicationId }` if duplicate found), maps fields, and creates a new application (`201 { application }`). Rate limited to 60 requests/hour per user.

#### Job to Application Mapping (`services/jobs/jobToApplication.js`):
| Application field | Value |
|---|---|
| `companyName` | job company, cut to 50 |
| `role` | job title, cut to 50 |
| `appliedFrom` | job platform (cut to 30); fallback `"Other"` |
| `pay` | `job.pay` if present; otherwise `{ type: "yearly", amount: 0 }` ("Not specified") |
| `duration` | `"Not set"` (`TRACK_DEFAULT_DURATION`) |
| `skills` | resume skills that appear as whole words in job title and snippet, joined as `A, B, C`, cut at a comma boundary to $\le 150$ chars; empty string if none |
| `description` | job snippet, plain text, cut to 300 |
| `notes` | `Added from job search. Match <score>%: <matchReason>`, cut to 200 |
| `jobLink` | job `applyUrl` (max 500) |
| `appliedDate` | now |
| `resumeId` | the resume used for search |
| `status` | default (`"applied"`) |

---

## 5. Constants (`backend/src/config/constants.js`)

- `MAX_RESUMES_PER_USER = 5`
- `RESUME_MAX_BYTES = 5 * 1024 * 1024` (5 MB)
- `RESUME_LABEL_MAX = 50`
- `RESUME_FILENAME_MAX = 100`
- `RESUME_ALLOWED_TYPES = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }`
- `RESUME_DOWNLOAD_URL_TTL_SECONDS = 300` (5 minutes)
- `RESUME_TEXT_MAX_CHARS = 12000`
- `RESUME_MIN_TEXT_CHARS = 50`
- `RESUME_SKILLS_MAX = 30`
- `RESUME_SKILL_MAX_LEN = 40`
- `RESUME_ROLES_MAX = 5`
- `RESUME_ROLE_MAX_LEN = 60`
- `RESUME_EXPERIENCE_MAX_YEARS = 50`
- `RESUME_PARSE_TIMEOUT_MS = 30000`
- `RESUME_PARSE_STALE_MS = 120000` (2 minutes)
- `RESUME_REPARSE_LIMIT_PER_HOUR = 10`
- `JOB_SEARCH_CACHE_TTL_SECONDS = 86400` (24 hours)
- `JOB_SEARCH_REFRESH_MIN_AGE_SECONDS = 3600` (1 hour)
- `JOB_SEARCH_LIMIT_PER_HOUR = 10`
- `JOB_PROVIDER_TIMEOUT_MS = 10000` (10 seconds)
- `JOB_ADZUNA_MAX_REQUESTS_PER_SEARCH = 2`
- `JOB_JSEARCH_MAX_REQUESTS_PER_SEARCH = 1`
- `JOB_JOOBLE_MAX_REQUESTS_PER_SEARCH = 1`
- `JOB_CAREERJET_MAX_REQUESTS_PER_SEARCH = 1`
- `JOB_HIMALAYAS_MAX_REQUESTS_PER_SEARCH = 1`
- `JOB_REMOTEOK_FEED_CACHE_SECONDS = 3600` (1 hour)
- `JOB_HIMALAYAS_CACHE_SECONDS = 3600` (1 hour)
- `JOB_RESULTS_PER_REQUEST = 20`
- `JOB_STORE_MAX = 150`
- `JOB_PAGE_SIZE_DEFAULT = 20`
- `JOB_PAGE_SIZE_MAX = 30`
- `JOB_MAX_SEARCHES_PER_USER = 10`
- `JOB_POSTED_WITHIN_OPTIONS = [7, 30, 60]`
- `JOB_QUERY_TEXT_MAX = 50`
- `JOB_ROLES_MAX = 5`
- `JOB_ROLE_MAX_LEN = 60`
- `JOB_LOCATION_MAX = 100`
- `JOB_MIN_PAY_MAX = 10000000`
- `JOB_STRONG_MATCH_MIN = 75`
- `JOB_GOOD_MATCH_MIN = 50`
- `JOB_ADZUNA_RESULTS_PER_REQUEST = 50`
- `JOB_CAREERJET_PAGE_SIZE = 100`
- `JOB_JOOBLE_MAX_PAGES = 2`
- `JOB_MAX_AGE_DAYS = 60`
- `JOB_DESCRIPTION_SNIPPET_MAX = 500`
- `JOB_RANK_CANDIDATES = 25`
- `JOB_RANK_SNIPPET_CHARS = 300`
- `JOB_RANK_REASON_MAX = 120`
- `JOB_RANK_TIMEOUT_MS = 30000`
- `JOB_RANK_MAX_TOKENS = 3000`
- `TRACK_DEFAULT_DURATION = "Not set"`
- `JOB_TRACK_LIMIT_PER_HOUR = 60`

---

## 6. Environment Variables

- `PORT` (default: 5000)
- `MONGO_URI` (Required)
- `SESSION_SECRET` (Required, $\ge 32$ chars in production)
- `CLIENT_URL` (Required, comma-separated origins, no wildcards in production)
- `NODE_ENV` (`development` | `production` | `test`)
- `COOKIE_SAMESITE` (`lax` | `none` | `strict`, defaults to `lax` in dev, `none` in prod with HTTPS)
- `TRUST_PROXY` (default: 0 in dev, 1 in prod; non-negative integer for reverse proxy hops)
- `AUTH_RATE_LIMIT_MAX` (default: 10 per 15 min per IP)
- `CLOUDINARY_CLOUD_NAME` (Required)
- `CLOUDINARY_API_KEY` (Required)
- `CLOUDINARY_API_SECRET` (Required)
- `AI_PROVIDER` (`anthropic` | `google`, default: `anthropic`)
- `ANTHROPIC_API_KEY` (Optional, fails gracefully with `parseError: "ai_unavailable"` if absent when active provider is `anthropic`)
- `ANTHROPIC_MODEL` (Optional, default: `claude-haiku-5-5`)
- `GOOGLE_API_KEY` (Optional, fails gracefully with `parseError: "ai_unavailable"` if absent when active provider is `google`)
- `GOOGLE_MODEL` (Optional, default: `gemini-2.5-flash`)
- `ADZUNA_APP_ID` (Optional, required alongside ADZUNA_APP_KEY to enable Adzuna provider)
- `ADZUNA_APP_KEY` (Optional, Adzuna application key)
- `JSEARCH_API_KEY` (Optional, RapidAPI JSearch key)
- `JOOBLE_API_KEY` (Optional, Jooble API key)
- `CAREERJET_API_KEY` (Optional, Careerjet API key)
- `CAREERJET_LOCALE` (Optional, default `en_IN`)
- `JOB_PROVIDERS` (Optional, comma-separated list or `none`)
- `BASE_URL` (Optional, target base URL for smoke tests, defaults to `http://localhost:5000`)
- `SMOKE_SKIP_AI` (Optional, set `1` to skip live AI calls during smoke test)
- `SMOKE_SKIP_JOBS` (Optional, set `1` to skip live external job provider calls during smoke test)
- `SMOKE_ALLOW_REMOTE` (Optional, set `1` to bypass safety block against non-localhost smoke test targets)

---

## 7. Development & Security Conventions

1. **Authentication & Multi-Tenant Isolation**:
   - Every protected route must be guarded by `isAuthenticated`.
   - All MongoDB queries must filter by `userId: req.session.userId`.
   - Never trust client-supplied `userId`, `storagePublicId`, `fileType`, or `parseStatus`.
   - Cross-tenant queries must return `404 Not Found` (never reveal the existence of another user's resource).

2. **File Upload & Magic Byte Verification**:
   - Validate file size (max 5 MB) and MIME type early.
   - Always verify magic bytes in buffer after upload:
     - PDF: must start with `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`)
     - DOCX: must start with `PK\x03\x04` (`0x50, 0x4B, 0x03, 0x04`) and have declared type docx.
   - Reject mismatched magic bytes with `400 { message: "Only PDF or DOCX files are allowed" }`.

3. **Storage Security**:
   - Files are stored in Cloudinary as **private authenticated assets** (`resource_type: 'raw'`, `type: 'authenticated'`).
   - Public URLs are never exposed or stored in the database.
   - Signed download URLs are generated on demand with a strict 300-second TTL (`RESUME_DOWNLOAD_URL_TTL_SECONDS`).
   - When database document creation fails, orphan files in Cloudinary must be cleaned up immediately (`deleteAsset`).

4. **AI & Untrusted Content Handling**:
   - The resume text is untrusted user input, enclosed in delimiters (`<resume>...</resume>`).
   - Forced tool use (`save_resume_profile`) prevents freeform prompt injection.
   - Model response is strictly validated with Zod, normalized (case-insensitive deduplication, length trimming, list caps), and sanitized before database persistence.
   - Parse failures never block uploads, downloads, or CRUD.
   - Manual user corrections (`skillsEditedByUser: true`) are never overwritten by automated reparses.

5. **Response Sanitization**:
   - Never return `storagePublicId` or `extractedText` in API responses (`select: false` and explicit sanitization).
   - Never log Cloudinary credentials, Anthropic API keys, resume text, or model response bodies.

---

## 8. Build Status

- **Phase 1, Part 1: Resume Manager Backend**: **COMPLETED**
- **Phase 1, Part 2: Resume Text Extraction & AI Parsing**: **COMPLETED**
  - Synchronous text extraction via `pdf-parse/lib/pdf-parse.js` and `mammoth` with clean control-character stripping and length validation.
  - Anthropic Claude integration (`@anthropic-ai/sdk`) with forced tool use (`save_resume_profile`), temperature 0, and robust error handling.
  - Atomic parse claiming and background parse execution with graceful degradation (`ai_unavailable`, `no_text`, `ai_failed`, `invalid_output`, `extract_failed`).
  - Manual correction protection (`skillsEditedByUser: true`).
  - Reparse rate limiting (10/hr) and 409 concurrency guards.
  - Comprehensive smoke test suite (Phase 1 Parts 1 & 2): **ALL PASSED**.
  - Lint check: **PASSED (0 errors, 0 warnings)**.
- **Phase 1, Part 3: Resumes Page and Resume Link in Applications (Frontend)**: **COMPLETED**
  - Dedicated `/resumes` management page with responsive card grid, upload modal with drag-and-drop file picker, limit warnings ("X of 5"), and empty/error states.
  - TopBar desktop link with sliding indicator and BottomNav 4th tab with prefetching.
  - Edit resume dialog with inline chip editors for skills and role titles (with Enter/comma adding, paste splitting, deduplication, length/count limits, and keyboard navigation).
  - Popover action menu with secure download (popup-blocker safe via immediate blank tab), reparse trigger with loading/disabled states, edit modal, and delete confirmation dialog with cascade warnings.
  - 3000ms polling strictly when $\ge 1$ resume is `parseStatus === "pending"`.
  - Application form resume selector (`resumeId`), preselecting default resume on create and saved resume on edit, tracking dirty state, with helpful empty fallback linking to `/resumes`.
  - Details panel displays linked resume with link to `/resumes` and skeleton fallback.
  - Clean `FormData` handling in API client without hardcoding `Content-Type`.
  - Lint check: **PASSED (0 errors, 0 warnings)**.
  - Build check: **PASSED (dist built cleanly)**.
- **Provider-Switchable Resume AI Parsing (Anthropic Claude & Google Gemini)**: **COMPLETED**
  - Integrated `@google/genai` alongside `@anthropic-ai/sdk` with provider selection via `AI_PROVIDER` (`anthropic` | `google`).
  - Google Gemini integration using JSON response schema (`responseMimeType: "application/json"`, `responseSchema`), `temperature: 0`, structured system instruction, and shared normalization + Zod schema validation.
  - Resilient graceful degradation (`AI_UNAVAILABLE` when active provider key is omitted, `INVALID_OUTPUT` on unparsable response, `AI_FAILED` on upstream error/timeout).
  - All resume tests, error handling, rate limiting, and smoke tests verified.
- **Phase 2, Part 1: Job Search Backend (Providers, Normalize, Dedupe, Cache)**: **COMPLETED**
  - Search query builder based on resume profile fields (`roleTitles`, `skills`, fresher/student detection, location/remote handling).
  - External job providers: Adzuna and JSearch (RapidAPI) with timeout protection, graceful error handling (`Promise.allSettled`), and rate limiting.
  - Normalization engine mapping diverse provider shapes into uniform standard listings with HTML stripping, INR pay parsing, and expiration pruning.
  - Deduplication pipeline with collision detection on normalized apply URLs and fuzzy `company|title|location` keys, ranking better listings (pay, snippet length, recency).
  - MongoDB `JobSearchCache` model with 24-hour TTL index, profile-hash invalidation, and 1-hour refresh cooldown.
  - Offline self-test suite (`npm run jobs:test`) covering normalization, deduplication, and query generation.
  - Full smoke test suite (`npm run smoke`) passing with 61 tests.
- **Phase 2, Part 2: Job Ranking (Local Score + One Batched AI Call)**: **COMPLETED**
  - Deterministic local scoring engine (`scoreJobLocally` in `services/jobs/localScore.js`) balancing skill matches (up to 50 pts, handles `Node.js`, `C++`, `C#`), role title overlap (up to 30 pts), level and seniority fit (+15 to -20 pts), and location preference (up to 5 pts) into clamped integer `0..100` with factual reason strings ($\le 120$ chars).
  - Top 25 candidate job selection (`JOB_RANK_CANDIDATES = 25`) evaluated via a single batched AI call (`rankJobsWithAi` in `services/jobs/jobRankAi.js`) with forced structured output (Anthropic tool use or Google Gemini JSON response schema).
  - Shared AI client factory (`services/ai/clients.js`) with zero automatic retries on quota or rate-limit errors and single retry on timeouts/5xx.
  - Resilient ranking pipeline (`rankAndMergeJobs` in `services/jobs/jobRankService.js`) with graceful fallback to local scoring on missing keys, quota exhaustion, network timeouts, or invalid schema without 5xx errors.
  - Extended `JobSearchCache` model storing `matchScore`, `matchReason`, `scoredBy`, `rankedBy`, and `rankStatus`.
  - Smoke suite AI quota guard (`SMOKE_SKIP_AI=1`) skipping real AI API calls while maintaining test coverage across all features.
  - Comprehensive offline unit test suite (`npm run jobs:test`) passing all 26 tests (local scoring, special character matching, AI output sanitization, injection resistance, and merge stubs).
- **Phase 2, Part 3: Jobs Page (Frontend Only)**: **COMPLETED**
  - Dedicated `/jobs` page with URL parameter preservation (`?resume=<id>`), resume `<select>` pre-selecting default resume, search trigger button with loading state, and screen reader announcements.
  - Pre-condition states for empty resumes (EmptyState linking to `/resumes`), pending AI extraction (disabled button + inline alert), and empty skills/roles (disabled button + link to `/resumes`).
  - Search data layer using `useJobSearch(resumeId)` hook pairing `useMutation` with disabled `useQuery` (`staleTime: Infinity`) to retain search results per resume across session navigation with zero auto-search on mount and no polling.
  - Results header with count, relative updated time, "Search again" button (`refresh: true`), 1-hour cooldown note (`JOB_REFRESH_COOLDOWN_MS = 3600000`), client-side sort toggle ("Best match" by `matchScore` vs "Newest" by `postedAt`), and quiet note when `rankedBy === "local"`.
  - Responsive 2-column desktop / 1-column mobile grid of `JobCard` components featuring flat card surface (`surface` bg, 1px `rule` border, radius 12px), title clamped to 2 lines, company, location, remote chip, platform badge, Indian Rupee pay formatting (`en-IN`), calendar-day posted dates ("Today", "Yesterday", "N days ago"), snippet clamp (`JOB_SNIPPET_COLLAPSED_LINES = 3`) with "Show more" / "Show less" toggle, and match meter.
  - Match meter design: Score percentage (`tabular-nums`), thin ink bar (`bg-ink`, no yellow highlighter), text tier with icon (`Sparkles` + "Strong match" $\ge 75$, `CheckCircle2` + "Good match" $\ge 50$, `MinusCircle` + "Weak match" $< 50$), and single-line `matchReason`.
  - Isolated `ApplyButton` opening external postings in a new tab (`target="_blank" rel="noopener noreferrer"`) with protocol validation (`http://` or `https://` only, otherwise hidden).
  - Navigation updates: desktop `TopBar` nav item after Applications with sliding 2px indicator measurement and prefetch, mobile `BottomNav` 5th tab (44px touch targets), and `UserMenu` link.
  - Dev-only `Styleguide` section with 8 fixtures (strong match, good match remote, weak match, remote pay range, no pay/date, long snippet, invalid apply URL, skeleton, error states, empty state).
  - Lint check: **PASSED (0 errors, 0 warnings)**.
  - Build check: **PASSED (dist built cleanly in 14.12s, 0 errors)**.
- **Phase 3, Part 1: More job providers (Jooble, Careerjet, Himalayas, RemoteOK)**: **COMPLETED**
  - Added four job providers alongside Adzuna and JSearch: Jooble (POST API, key in URL, free-text salary parsing), Careerjet (GET API, Basic auth, end user IP & User-Agent required, untouched tracking URLs), Himalayas (free public JSON API, in-memory TTL query cache, USD salary text, attribution required), RemoteOK (free public feed, legal notice skipped, shared 1-hour in-memory feed cache, whole-word keyword filtering, capped at 20 jobs, attribution required).
  - Provider environment configuration via `JOB_PROVIDERS` (supports `none` to disable all, custom subsets, and default based on configured keys + keyless providers).
  - Careerjet locale validation against official supported locales list (`CAREERJET_LOCALE`, default `en_IN`).
  - Added `attribution: { name, url } | null` and `salaryText: string | null` to standard normalized job shape and Mongoose `JobSearchCache` schema.
  - Deduplication tie-break preference: when pay, snippet length, and posted date are identical, prefers the job with attribution so licensing terms are respected.
  - Dropped apply URL count tracking and logging per provider without logging URLs or job text.
  - Extended offline self-test suite (`npm run jobs:test`) passing all 46 tests.
  - End-to-end smoke test suite passing with `SMOKE_SKIP_AI=1 SMOKE_SKIP_JOBS=1 npm run smoke`.

  - Backend tracking endpoint `POST /api/jobs/track` behind `isAuthenticated` with rate limit of 60 req/hr (`jobTrackLimiter`). Reads job from `JobSearchCache`, enforces resume ownership, checks for duplicate applications via normalized `applyUrl` vs existing `jobLink` (returns `409 { message, applicationId }` if already tracked), maps fields via pure `jobToApplication`, and returns `201 { application }`.
  - Search responses (`POST /api/jobs/search`) dynamically compute `trackedApplicationId` against the user's existing applications without mutating or staling the search cache.
  - Pure mapping function `jobToApplication` (`services/jobs/jobToApplication.js`) truncating company (50), title (50), platform (30), defaulting missing/zero pay to `{ type: "yearly", amount: 0 }`, matching resume skills as whole words formatted as comma-separated string $\le 150$ chars cut at comma boundaries, snippet description cut to 300, formatted notes cut to 200, duration default "Not set", and status "applied".
  - Frontend `useTrackJob` hook handling `201` and `409` consistently by updating the cached search results for the resume and invalidating application lists and stats without retries.
  - Apply and return detection via `usePendingApply` and `sessionStorage`, triggering `DidYouApplyDialog` after returning to the tab ($\ge 3$ seconds old) without duplicate prompts.
  - `JobCard` incorporates an always-visible "Track application" secondary button, a "Tracked" status label with checkmark and "View application" link when tracked, and keeps the external Apply link available.
  - Compensation formatter `formatPay` displays "Not specified" when `pay.amount === 0` across cards, details panels, and lists.
  - Extended offline unit test suite (`npm run jobs:test`) passing 32 tests covering mapping, truncation, pay defaults, comma-boundary skills formatting, injection resistance, and URL deduplication.
  - Smoke tests extended with `SMOKE_SKIP_JOBS=1` flag and Suite 21 for job tracking.
- **Phase 3, Part 2: Search filters, 150 stored jobs, paged and filterable results (backend only)**: **COMPLETED**
  - Search filters support (`jobType`, `experience`, `roles`, `location`, `remote`, `postedWithinDays`, `minPay`) with automatic derivation from resume when omitted.
  - Native provider mapping for Adzuna, Jooble, Careerjet, JSearch, and remote provider exclusion for Himalayas/RemoteOK.
  - Local filters engine (`services/jobs/applyFilters.js`) handling `inferJobType`, `inferJobLevel`, `applyFilters`, result filtering/sorting, and facet aggregation.
  - Storage of up to 150 ranked jobs in `JobSearchCache` with AI ranking on top 25 only, stable 1-based `rank`, and bounding to 10 searches per user (`trimUserSearches`).
  - Added endpoints `GET /api/jobs/searches/:searchId/jobs` (paged & filterable reads without external calls) and `GET /api/jobs/searches/latest` (server-side search restoration).
  - Extended offline unit test suite (`npm run jobs:test`) passing all 62 tests.
  - Extended smoke test suite with database seeding passing with `SMOKE_SKIP_AI=1 SMOKE_SKIP_JOBS=1 npm run smoke`.
- **Phase 3, Part 3: Search form, paged results and restored last search (frontend only)**: **COMPLETED**
  - Search form component `JobSearchForm` (`components/jobs/JobSearchForm.jsx`) with collapsible single-line summary ("Edit search", "Reset to resume defaults"), 3 field groups (What you want, Where and when, Pay optional with INR preview), inline validation, and submit button ("Find jobs").
  - Filter logic & canonicalization in `lib/jobFilters.js`: option constants, `deriveDefaultFilters(resume)` (null/0: fresher, 1: junior, 2..4: mid, 5+: any), `canonicalizeFilters`, `filtersEqual`, and `formatFiltersSummary`.
  - TanStack React Query v5 data layer in `hooks/useJobSearch.js`: `useLatestSearch(resumeId)` (restores server-saved search; 404 handled gracefully as null), `useRunJobSearch()` (mutation updating latest query and seeding page 1 into `jobs.results`), and `useJobResults(searchId, { sort })` (`useInfiniteQuery` with server sort, `placeholderData: (prev) => prev` for zero flicker, and graceful 404 detection for expired searches).
  - Synchronized query client seeding on latest search restoration, avoiding duplicate network fetches for page 1.
  - Page integration in `pages/Jobs.jsx`:
    - Responsive job search form pre-filling with restored search filters (starts collapsed) or resume defaults when no search exists (starts expanded).
    - "Search settings changed. Press Find jobs to update the results." quiet helper note when form state diverges from displayed search.
    - Server-side sorting toggle ("Best match" vs "Newest") with persistent cards during fetch.
    - Expired search inline banner ("This search has expired. Search again.") expanding the form with a direct re-search action.
    - Header showing count ("Showing X of Y jobs for <resume>"), relative update time, and 1-hour cooldown note.
    - "Load more" button under the grid with loading state, accessible polite live region announcing newly loaded count, and keyboard focus management shifting focus to the first newly loaded job card.
  - `JobCard` enhancements: Plain-text `salaryText` display fallback, explicit remote chip condition (`job.remote === true`), attribution link line (`via <name>` with safe rel/target), and `id`/`tabIndex={-1}` for programmatic accessibility focus.
  - Styleguide fixtures in `pages/Styleguide.jsx`: Form collapsed summary, form expanded with server error, settings changed helper line, expired search banner, results header with Load more (idle & loading), and JobCard with attribution/salaryText.
  - Lint check: **PASSED (0 errors, 0 warnings)**.
  - Build check: **PASSED (dist built cleanly in 10.35s, 0 errors)**.
- **Phase 3, Part 4: Result filters on the Jobs page (frontend only) — PHASE 3 COMPLETE**: **COMPLETED**
  - Result filter bar component `ResultFilters` (`components/jobs/ResultFilters.jsx`) with debounced search input (400ms, max 50 chars), multi-select source popover with live counts from `facets.bySource` and disabled options, match toggle chips ("Strong match", "Good match", "Weak match") with matching card tier icons and counts, remote segmented control ("Any", "Remote", "Not remote"), pay listed and hide tracked checkboxes with counts, clear filters button, removable active chips row with individual dismiss buttons, and a responsive mobile bottom-sheet modal.
  - Pure constants and helper functions in `lib/jobFilters.js`: `RESULT_SOURCE_LABELS`, `RESULT_MATCH_OPTIONS`, `emptyResultFilters`, `parseResultFilters(searchParams)`, `resultFiltersToParams(filters)`, `resultFiltersToUrlParams(filters)`, and `countActiveResultFilters(filters)`.
  - URL as single source of truth (`?resume=<id>&q=&source=a,b&match=strong,good&remote=true&pay=1&hide=1&sort=newest`):
    - All filter changes replace history state without extra history stack pollution.
    - Changing resumes or executing a new search automatically clears all result filters.
    - Invalid or unknown values are silently dropped.
  - Results header displays `Showing <loaded> of <total> jobs (filtered from <facets.total>) for <resume>`.
  - Screen reader announcements: polite live announcement `"<total> jobs match"` on filter change without shifting focus.
  - Distinct empty states: "No jobs match these filters" with "Clear filters" action button when active filters yield 0 results, distinct from global empty results.
  - Quiet 400 error recovery: drops filters, shows quiet error line, keeps existing results.
  - Tracking interaction: `useTrackJob` detects when `hideTracked` is ON and updates `trackedApplicationId` in TanStack Query cache without invalidating the search query, keeping the just-tracked card visible with success toast and "Tracked" status until next filter change or refresh.
  - Styleguide fixtures in `pages/Styleguide.jsx`: desktop filter bar idle and with multiple active filters, source menu with counts, disabled options, removable chips row, results header with "(filtered from 87)", and "No jobs match these filters" empty state.
  - Lint check: **PASSED (0 errors, 0 warnings)**.
  - Build check: **PASSED (dist built cleanly in 3.79s, 0 errors)**.
- **Deploy Prep: Production safety, secrets hygiene and deploy docs**: **COMPLETED**
  - Leftover non-product helper scripts removed (`run-and-smoke.js`, `make_fixtures.py`, `patch_debug.cjs`, `scratch/` files).
  - Seed scripts (`seed.js`, `seed-rahul.js`, `seed-dashboard-data.js`) strictly require credentials via environment variables (`SEED_EMAIL`, `SEED_PASSWORD`) with zero hardcoded fallbacks.
  - Comprehensive scan of git history and working tree: 0 committed secrets (verified across all commits, files, and diffs).
  - Proxy and rate-limiting safety: added `TRUST_PROXY` (default 0 dev, 1 prod) enabling `app.set("trust proxy", ...)` for accurate Express IP resolution behind reverse proxies (Vercel/Render). User-specific rate limiters keyed by authenticated `req.session.userId`.
  - Production validation guards: `CLIENT_URL` strictly required and rejects wildcards (`*`) in production; `SESSION_SECRET` requires $\ge 32$ characters in production; `Resume` model ensures unique partial index is synced on boot.
  - Smoke test safety guard: refuses to run against non-localhost `BASE_URL` without `SMOKE_ALLOW_REMOTE=1`.
  - Frontend production clean: dev-only `/styleguide` route completely tree-shaken and excluded from production bundle (`dist/`); `ReactQueryDevtools` mounted only in development.
  - Verified Node engines (`>=20.0.0`) in both `backend/package.json` and `frontend/package.json`.
  - Automated tooling: `scripts/check-env-docs.js` verifies all code env vars are documented in `.env.example`; `scripts/check-indexes.js` verifies all production database indexes in read-only mode.
  - Production deployment documentation created in `docs/DEPLOY.md`.
- **Phase 3: Jobs page cleanup and premium redesign (frontend) plus backend text fix**: **COMPLETED**
  - **Copy minimalism & production voice:** Stripped all non-actionable copy (subtitle, "Showing X of Y" counters, 24-hour cache persistence notes, match score explanations, unlisted pay notes, form settings changed helper notes, and group headings). Sentence case everywhere, zero exclamation marks, zero emojis.
  - **Job card anatomy (`JobCard`):** Redesigned with flat surface, 1px rule border, radius 12px, hover spotlight. Circular SVG `MatchRing` with tabular percentage inside and full `aria-label`. Clamped 2-line title, company and location with remote chip, meta row separated by middle dots (pay/salaryText, type, recency, attribution link), one-line truncated `matchReason`, and 3-line clamped snippet without toggle. Primary "Apply" button and secondary "Track" / "Tracked" + "View" links.
  - **Search form (`JobSearchForm`):** Refined card without group headings. Seamless resume select at top when no search exists. Collapsed slim summary bar with small neutral criteria chips, quiet "Edit" button, and "Search again" button.
  - **Result filters toolbar (`ResultFilters`):** Desktop single-row toolbar (search input, Remote 3-way segmented control, Pay listed toggle, Sort select, Clear button). Mobile bottom-sheet modal. Removed old multi-select popover, match chips, hide tracked, facet count labels, and active filter chips row.
  - **Backend text & mojibake repair (`cleanJobText`):** Added robust UTF-8 and Latin-1 mojibake cleaner to `normalize.js` fixing RemoteOK apostrophe/quote mojibake (e.g. `â€™` -> `'`) and non-breaking spaces while safely preserving real accented names (e.g. `Zürich`, `Café`).
  - **Styleguide section 11:** 8 JobCard fixtures (short, long title/company, remote with attribution, salary text, no pay, tracked, long clamped snippet, skeleton), MatchRing at 0/38/62/94%, form fixtures (empty, filled, error, searching), summary bar variants, toolbar variants, empty states, and dialogs.
  - **Self-tests & verification:** Backend lint PASSED, 63/63 backend self-tests PASSED (`npm run jobs:test`), frontend lint PASSED (0 errors, 0 warnings), and frontend production build PASSED (`vite build`).

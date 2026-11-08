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

### JobSearchCache (`backend/src/models/JobSearchCache.js`) — Added in Phase 2 (Parts 1 & 2)
- `userId`: ObjectId ref User, required, indexed.
- `resumeId`: ObjectId ref Resume, required.
- `profileHash`: String, sha1 of sorted roles, skills, experienceYears, locationPreference.
- `jobs`: Array of normalized and ranked job objects (with `matchScore`, `matchReason`, `scoredBy`).
- `sources`: Object with status per provider (`ok`, `failed`, `quota`, `skipped`).
- `rankedBy`: String, enum `['ai', 'local']`, default `'local'`.
- `rankStatus`: String, enum `['ok', 'unavailable', 'quota', 'timeout', 'invalid_output', 'failed', 'skipped']`.
- Timestamps: `createdAt`, `updatedAt`.
- TTL Index: `{ createdAt: 1 }` with `expireAfterSeconds: 86400`.
- Unique Index: `{ userId: 1, resumeId: 1, profileHash: 1 }`.

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

### Jobs (`/api/jobs`) — Added in Phase 2
- `POST /api/jobs/search`: Search and rank jobs matching resume criteria. Rate limited to 10/hr per user. Returns `200 { jobs, total, sources, rankedBy, rankStatus, cached, generatedAt }`. Evaluates top 25 candidate jobs locally and via a single batched AI call with graceful fallback to local scoring. Returns `503` if no provider is configured. If all providers fail, falls back to older cache or returns `502`. Adds dynamic `trackedApplicationId` to every returned job by checking against the user's existing applications.
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
- `JOB_RESULTS_PER_REQUEST = 20`
- `JOB_MAX_RESULTS_RETURNED = 50`
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
- `CLIENT_URL` (Required, comma-separated origins)
- `NODE_ENV` (`development` | `production` | `test`)
- `COOKIE_SAMESITE` (`lax` | `none` | `strict`)
- `TRUST_PROXY_HOPS` (default: 1)
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
- **Phase 2, Part 4: Apply & Automatic Application Tracking (Backend + Frontend)**: **COMPLETED (Phase 2 Fully Completed)**
  - Backend tracking endpoint `POST /api/jobs/track` behind `isAuthenticated` with rate limit of 60 req/hr (`jobTrackLimiter`). Reads job from `JobSearchCache`, enforces resume ownership, checks for duplicate applications via normalized `applyUrl` vs existing `jobLink` (returns `409 { message, applicationId }` if already tracked), maps fields via pure `jobToApplication`, and returns `201 { application }`.
  - Search responses (`POST /api/jobs/search`) dynamically compute `trackedApplicationId` against the user's existing applications without mutating or staling the search cache.
  - Pure mapping function `jobToApplication` (`services/jobs/jobToApplication.js`) truncating company (50), title (50), platform (30), defaulting missing/zero pay to `{ type: "yearly", amount: 0 }`, matching resume skills as whole words formatted as comma-separated string $\le 150$ chars cut at comma boundaries, snippet description cut to 300, formatted notes cut to 200, duration default "Not set", and status "applied".
  - Frontend `useTrackJob` hook handling `201` and `409` consistently by updating the cached search results for the resume and invalidating application lists and stats without retries.
  - Apply and return detection via `usePendingApply` and `sessionStorage`, triggering `DidYouApplyDialog` after returning to the tab ($\ge 3$ seconds old) without duplicate prompts.
  - `JobCard` incorporates an always-visible "Track application" secondary button, a "Tracked" status label with checkmark and "View application" link when tracked, and keeps the external Apply link available.
  - Compensation formatter `formatPay` displays "Not specified" when `pay.amount === 0` across cards, details panels, and lists.
  - Extended offline unit test suite (`npm run jobs:test`) passing 32 tests covering mapping, truncation, pay defaults, comma-boundary skills formatting, injection resistance, and URL deduplication.
  - Smoke tests extended with `SMOKE_SKIP_JOBS=1` flag and Suite 21 for job tracking.
  - Both frontend and backend lint and production build checks clean.

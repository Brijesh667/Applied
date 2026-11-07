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

### JobSearchCache (`backend/src/models/JobSearchCache.js`) — Added in Phase 2 (Part 1)
- `userId`: ObjectId ref User, required, indexed.
- `resumeId`: ObjectId ref Resume, required.
- `profileHash`: String, sha1 of sorted roles, skills, experienceYears, locationPreference.
- `jobs`: Array of normalized job objects.
- `sources`: Object with status per provider (`ok`, `failed`, `quota`, `skipped`).
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

### Jobs (`/api/jobs`) — Added in Phase 2 (Part 1)
- `POST /api/jobs/search`: Search jobs matching resume criteria. Rate limited to 10/hr per user. Returns `200 { jobs, total, sources, cached, generatedAt }`. Returns `503` if no provider is configured. If all providers fail, falls back to older cache or returns `502`.

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

# Applied - Backend API

A RESTful backend service for tracking job applications, replies, interview deadlines, and job search metrics. Built with Node.js, Express, MongoDB (Mongoose), and secure session-based authentication.

---

## Tech Stack

- **Runtime & Framework**: Node.js (ES Modules), Express.js (v5)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Session-based auth via `express-session` & `connect-mongo`
- **Password Hashing**: `bcrypt` (12 salt rounds)
- **Validation**: `zod`
- **Security & Protection**: `helmet`, `cors`, `express-rate-limit`

---

## Setup & Running

### 1. Installation
```bash
cd backend
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Seed Demo Data
Populates the database with a demo user and realistic job applications (refuses to run when `NODE_ENV=production`):
```bash
SEED_EMAIL="you@example.com" SEED_PASSWORD="<your-password>" npm run seed
```
*(Variables can also be set in `backend/.env` as `SEED_EMAIL` and `SEED_PASSWORD`)*

---

## Environment Variables

| Variable | Required | Example | Notes |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `5000` | Port server listens on (default: `5000`) |
| `MONGO_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster.mongodb.net/dbname` | MongoDB connection URI |
| `SESSION_SECRET` | **Yes** | `your_secret_key_minimum_32_characters` | Secret key for signing session cookies. Must be **>= 32 characters** in production. |
| `CLIENT_URL` | **Yes** | `http://localhost:5173,https://your-app.vercel.app` | Allowed CORS origins. Comma-separated list supported. |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` (default: `development`) |
| `COOKIE_SAMESITE` | No | `lax` | Cookie SameSite policy: `lax`, `none`, or `strict` (default: `lax`). If set to `none`, `secure: true` is enforced for cross-site deployments. |
| `TRUST_PROXY_HOPS` | No | `1` | Number of reverse proxy hops to trust (default: `1`). Set to `1` for Render/Vercel single proxy tier. |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | `dxyz123` | Cloudinary account cloud name for resume file storage. |
| `CLOUDINARY_API_KEY` | **Yes** | `123456789012345` | Cloudinary API Key. Never log or return in responses. |
| `CLOUDINARY_API_SECRET` | **Yes** | `abcdef123456789...` | Cloudinary API Secret. Never log or return in responses. |
| `AI_PROVIDER` | No | `anthropic` | AI provider for resume parsing: `anthropic` or `google` (default: `anthropic`). |
| `ANTHROPIC_API_KEY` | No | `sk-ant-api03-...` | Optional Anthropic API key for AI resume parsing. If omitted while `AI_PROVIDER=anthropic`, server boots with "AI parsing disabled" warning and resumes receive `parseError: "ai_unavailable"`. Never log or return in responses. |
| `ANTHROPIC_MODEL` | No | `claude-haiku-5-5` | Optional Claude model identifier for resume parsing (default: `claude-haiku-5-5`). |
| `GOOGLE_API_KEY` | No | `AIzaSy...` | Optional Google API key for Gemini resume parsing. If omitted while `AI_PROVIDER=google`, server boots with "AI parsing disabled" warning and resumes receive `parseError: "ai_unavailable"`. Never log or return in responses. |
| `GOOGLE_MODEL` | No | `gemini-2.5-flash` | Optional Gemini model identifier for resume parsing (default: `gemini-2.5-flash`). |
| `ADZUNA_APP_ID` | No | `your_app_id` | Optional Adzuna Application ID for job search. Provider enabled only if both ID and Key exist. |
| `ADZUNA_APP_KEY` | No | `your_app_key` | Optional Adzuna Application Key for job search. Never log or return in responses. |
| `JSEARCH_API_KEY` | No | `your_rapidapi_key` | Optional RapidAPI key for JSearch job search. Spend carefully (free quota is ~100-200 requests/month). |
| `SEED_EMAIL` | Only for seeding | `you@example.com` | Email for seed script (`scripts/seed.js`). |
| `SEED_PASSWORD` | Only for seeding | `<your-password>` | Password for seed script (`scripts/seed.js`). |

### How to Get Cloudinary Keys
1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. Navigate to your **Cloudinary Programmable Media Dashboard** (or **Settings > API Keys**).
3. Under **Product Environment Credentials**, copy your **Cloud Name**, **API Key**, and **API Secret**.
4. Paste these values into `backend/.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
5. Files are stored as **private (authenticated)** raw assets (`type: 'authenticated'`). Public URLs are never exposed or stored, and downloads require time-limited signed URLs (valid for 5 minutes).

### Configuring and Switching AI Providers
The backend supports switchable AI providers for extracting skills, target roles, experience years, and location preference from resumes:
- **Anthropic Claude** (default):
  Set `AI_PROVIDER=anthropic`, provide `ANTHROPIC_API_KEY`, and optionally specify `ANTHROPIC_MODEL` (default: `claude-haiku-5-5`).
- **Google Gemini**:
  Set `AI_PROVIDER=google`, provide `GOOGLE_API_KEY`, and optionally specify `GOOGLE_MODEL` (default: `gemini-2.5-flash`).

If the API key for the active provider is missing, the backend boots normally with an `AI parsing disabled` warning, and resumes are marked with `parseStatus: "failed"` and `parseError: "ai_unavailable"`.

### Configuring Job Search Providers (Phase 2, Part 1)
Job search integrates with two external providers:
1. **Adzuna**:
   - Register at [Adzuna Developer Portal](https://developer.adzuna.com/) to get an **App ID** and **App Key**.
   - Set `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` in `backend/.env`. Both must be present to enable Adzuna.
2. **JSearch (RapidAPI)**:
   - Register at [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3qguO5/api/jsearch) and subscribe to the free tier to obtain an API key.
   - Set `JSEARCH_API_KEY` in `backend/.env`.
   - **Quota notice**: The JSearch free tier permits approximately 100-200 requests per month. The backend caps JSearch calls to 1 request per search to conserve quota.

**Missing Keys & Graceful Degradation**:
- Both providers are optional. The server boots cleanly if keys are missing, logging a warning listing unconfigured providers.
- If neither provider is configured, `POST /api/jobs/search` responds with `503 Service Unavailable` (`{ message: "Job search is not configured yet" }`).
- Search results are deduplicated and cached for 24 hours (`JOB_SEARCH_CACHE_TTL_SECONDS = 86400`) in MongoDB (`JobSearchCache`). Refresh requests younger than 1 hour (`JOB_SEARCH_REFRESH_MIN_AGE_SECONDS = 3600`) return cached results immediately without calling external APIs.
- Per-user rate limiting is enforced at 10 requests per hour (`JOB_SEARCH_LIMIT_PER_HOUR = 10`) keyed by authenticated session user ID.

---

## API Endpoints

### Health Check
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | No | Basic health check returning `{ status: "ok" }` (bypasses rate limiters) |

### Authentication (`/api/auth`)
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | No | Register a new user (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | No | Authenticate with credentials and initialize session |
| `POST` | `/api/auth/logout` | **Yes** | Terminate current user session and clear cookie |
| `GET` | `/api/auth/me` | **Yes** | Get current authenticated user profile |

### Applications (`/api/applications`)
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/applications` | **Yes** | Create a new job application |
| `GET` | `/api/applications` | **Yes** | List user applications with pagination, filters, search, and sorting |
| `GET` | `/api/applications/:id` | **Yes** | Retrieve a single application by ID |
| `PUT` | `/api/applications/:id` | **Yes** | Update an application's details |
| `DELETE` | `/api/applications/:id` | **Yes** | Delete an application |

#### List Query Parameters (`GET /api/applications`)
| Parameter | Type / Values | Description |
| :--- | :--- | :--- |
| `page` | Integer $\ge 1$ (max 10000) | Page number (default: `1`) |
| `limit` | Integer 1 - 30 | Items per page (default: `15`, max: `30`) |
| `search` | String (max 50) | Case-insensitive contains search on `companyName` |
| `status` | `applied`, `in-process`, `offer`, `rejected` | Filter by application status |
| `appliedFrom` | String (max 30) | Case-insensitive exact match on platform name |
| `replied` | `true`, `false` | Filter by whether the application has replies |
| `due` | `missed` | Filter applications with at least one pending reply with deadline < now. Excludes `rejected`. Cannot be combined with `dueFrom`/`dueTo`. |
| `dueFrom` | ISO datetime string | Start of deadline range (inclusive). Must be paired with `dueTo`. Excludes `rejected`. |
| `dueTo` | ISO datetime string | End of deadline range (exclusive). Must be paired with `dueFrom` (`dueFrom < dueTo`, max 400 days range). Excludes `rejected`. |
| `sort` | `latest` (default without deadline filter), `oldest`, `deadline` (default when a deadline filter is active) | Sort order (`deadline` puts nearest upcoming or oldest missed deadline first) |

**List Response Shape**:
```json
{
  "applications": [
    {
      "_id": "6ae6720dc54c839e03516a8b",
      "companyName": "Tata Consultancy",
      "role": "Associate Software Engineer",
      "status": "in-process",
      "nextDeadline": "2026-11-20T00:00:00.000Z",
      "nextDeadlineReplyId": "6ae6720dc54c839e03516a8c",
      "replies": [ /* array of reply objects */ ]
      /* ...other application fields */
    }
  ],
  "total": 37,
  "page": 1,
  "limit": 15,
  "hasMore": true
}
```

### Replies (`/api/applications/:id/replies`)
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/applications/:id/replies` | **Yes** | Add a reply (assessment, assignment, interview, offer, rejection, other) |
| `PATCH` | `/api/applications/:id/replies/:replyId` | **Yes** | Update a reply (e.g. mark `completed: true`, reschedule `deadline`) |
| `DELETE` | `/api/applications/:id/replies/:replyId` | **Yes** | Remove a reply and auto-recalculate application status |

### Dashboard Statistics (`/api/stats`)
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/stats` | **Yes** | Aggregated stats: overview metrics, status counts, reply types, platform metrics, and action items (`attention`) |

### Resumes (`/api/resumes`)
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/resumes` | **Yes** | Upload a resume (`multipart/form-data`, field: `file`, optional: `label`). Max 5 resumes, max 5 MB, PDF or DOCX. Rate limited to 20/hr. Extracts text synchronously, saves `extractedText` (`select: false`), initiates background AI parse, and returns `201 { resume }` immediately. |
| `GET` | `/api/resumes` | **Yes** | List user's resumes ordered with default resume first, then newest. Returns `200 { resumes, limit: 5 }`. |
| `GET` | `/api/resumes/:id` | **Yes** | Retrieve single resume by ID including parsed AI profile fields. Returns `200 { resume }`. |
| `GET` | `/api/resumes/:id/download` | **Yes** | Generate a secure, short-lived signed download URL (expires in 5 minutes). Returns `200 { url, expiresInSeconds }`. |
| `POST` | `/api/resumes/:id/reparse` | **Yes** | Retrigger background AI parsing. Allowed when status is `failed`, `done`, or stale `pending` (>120s). Returns `202 { resume }` with `parseStatus: "pending"`. Rate limited to 10/hr. If active parse is in progress, returns `409 { message: "Parsing is already in progress" }`. |
| `PATCH` | `/api/resumes/:id` | **Yes** | Update resume metadata (`label`, `isDefault`) and/or manual profile corrections (`skills`, `roleTitles`, `experienceYears`, `locationPreference`). Editing profile fields sets `skillsEditedByUser: true`, protecting user corrections from being overwritten by future reparses. Returns `200 { resume }`. |
| `DELETE` | `/api/resumes/:id` | **Yes** | Delete resume from DB and remove authenticated file asset from Cloudinary. Automatically promotes next newest resume if deleting the default, and clears `resumeId` across referenced applications. Returns `200 { message }`. |

#### Resume Parse States & Error Codes
- **`parseStatus`**:
  - `pending`: Parsing in progress (background AI extraction).
  - `done`: AI extraction completed successfully and profile fields populated.
  - `failed`: Extraction or parsing failed with error code documented in `parseError`.
- **`parseError` Codes**:
  - `no_text`: File is scanned/image-based or contains fewer than 50 text characters.
  - `ai_unavailable`: Anthropic API key is not configured.
  - `ai_failed`: Anthropic API request failed (rate limit, network timeout, 5xx).
  - `invalid_output`: Model response did not match the expected structured schema.
  - `extract_failed`: Error during file text extraction (corrupted document, parser timeout).

> [!NOTE]
> Resume files are stored in Cloudinary as **private (`type: 'authenticated'`)** assets. Public URLs are never generated or stored. Responses never include `storagePublicId` or `extractedText`.

> [!NOTE]
> Applications (`/api/applications`) support an optional `resumeId` reference. On create/update, the referenced resume is verified to belong to the authenticated user. When a resume is deleted, referenced applications automatically have their `resumeId` cleared (`null`).

### Jobs (`/api/jobs`) — Added in Phase 2 (Part 1)
| Method | Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/jobs/search` | **Yes** | Search jobs matching a user's resume. Body: `{ resumeId: string, refresh?: boolean }`. Queries Adzuna and JSearch, normalizes listings, deduplicates collisions, and caches results for 24 hours. Rate limited to 10 requests/hour per user. Returns `200 { jobs, total, sources, cached, generatedAt }`. |


**Stats Response Shape**:
```json
{
  "total": 40,
  "replied": 25,
  "noReply": 15,
  "replyRate": 62.5,
  "byStatus": {
    "applied": 15,
    "in-process": 18,
    "offer": 3,
    "rejected": 4
  },
  "repliesByType": {
    "assessment": 12,
    "assignment": 8,
    "interview": 9,
    "offer": 3,
    "rejection": 4,
    "other": 2
  },
  "deadlines": {
    "pending": 9,
    "overdue": 2,
    "dueSoon": 5
  },
  "byPlatform": [
    {
      "platform": "LinkedIn",
      "total": 14,
      "replied": 9,
      "replyRate": 64.3
    }
  ],
  "attention": [
    {
      "applicationId": "654c1234567890abcdef0001",
      "replyId": "654c1234567890abcdef0002",
      "companyName": "Acme Corp",
      "role": "Software Engineer",
      "type": "assignment",
      "deadline": "2026-11-01T18:29:00.000Z"
    }
  ],
  "attentionTotal": 7
}
```

#### Attention Rules:
- **Scope**: Replies where `completed: false`, a `deadline` is set, and the parent application's status is not `rejected`.
- **Filtering**: Only deadlines that are overdue (`deadline < now`) or due within the next 7 days (`deadline <= now + 7 * 24h`, same definition as `dueSoon`).
- **Sorting**: Ascending by `deadline` (overdue first, most overdue first).
- **Limit**: Max 10 items returned in `attention`.
- **`attentionTotal`**: Total count of all matching attention items before the 10-item limit cut.
- **`deadlines.upcoming`**: Removed in favor of `attention`.

---

## Validation Limits

Values defined in [`src/config/constants.js`](src/config/constants.js):

| Field / Rule | Constraint |
| :--- | :--- |
| User Name | 1 - 50 characters |
| User Email | Max 100 characters, valid email format |
| User Password | 8 - 64 characters |
| Company Name | 1 - 50 characters |
| Role | 1 - 50 characters |
| Duration | 1 - 10 characters |
| Applied From | 1 - 30 characters |
| Skills | Max 150 characters |
| Description | Max 300 characters |
| Notes (Application) | Max 200 characters |
| Notes (Reply) | Max 200 characters |
| Pay Types | `yearly`, `monthly`, `onetime` |
| Pay Amount | 0 - 10,000,000 |
| Page Size (`pageSize`) | 15 (default) |
| Max Page Size (`maxPageSize`) | 30 (maximum allowed) |
| Max Replies per Application | 20 |
| Reply Types | `assessment`, `assignment`, `interview`, `offer`, `rejection`, `other` |
| Application Statuses | `applied`, `in-process`, `offer`, `rejected` |

---

## Important Architectural Notes

1. **Session Cookie**:
   - Cookie name: `sid`.
   - Frontend requests must specify `credentials: "include"` (fetch) or `withCredentials: true` (axios).
2. **Automatic Status Derivation**:
   - An application's `status` is automatically derived based on its replies:
     - Contains an `offer` reply $\rightarrow$ `"offer"`
     - Contains a `rejection` reply (without offer) $\rightarrow$ `"rejected"`
     - Contains any other reply type $\rightarrow$ `"in-process"`
     - Has no replies $\rightarrow$ `"applied"`
3. **Error Response Shapes**:
   - Single message:
     ```json
     { "message": "Invalid email or password" }
     ```
   - Validation failure:
     ```json
     {
       "message": "Validation failed",
       "errors": {
         "companyName": "Company name is required",
         "pay.amount": "Pay amount cannot be less than 0"
       }
     }
     ```
4. **Rate Limiting**:
   - `/api/auth/login` and `/api/auth/register`: 10 requests per 15 minutes per IP.
   - All other `/api/*` endpoints: 300 requests per 15 minutes per IP (auth routes and `/api/health` are excluded).
   - In-memory store: Designed for single-instance deployments (such as Render free/starter tiers). If scaling to multiple server instances or clusters, configure a shared external store (e.g. `rate-limit-redis`) to share rate limit state across instances.

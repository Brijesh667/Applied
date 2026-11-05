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
| `SEED_EMAIL` | Only for seeding | `you@example.com` | Email for seed script (`scripts/seed.js`). |
| `SEED_PASSWORD` | Only for seeding | `<your-password>` | Password for seed script (`scripts/seed.js`). |

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

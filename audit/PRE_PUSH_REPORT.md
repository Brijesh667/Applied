# Pre-Push Security & DevOps Audit Report: Applied

**Audit Date**: 2026-11-11  
**Target Branch**: `updated` (destined for `main`)  
**Deployment Target**: Vercel (Frontend) + Dedicated Host (e.g. Render / Railway for Backend)  
**Overall Verdict**: ⚠️ **PUSH AFTER FIXES** (3 Blockers must be resolved before pushing)

---

## Executive Summary & Verdict

Pushing directly in the current working state will cause deployment failures or risk committing untracked test credentials. Specifically:
1. Two newly required backend implementation files (`JobSearchUsage.js`, `dailySearchLimit.js`) are untracked and must be staged.
2. Two ad-hoc test scripts containing test credentials (`test-daily-limit.js`, `test-parallel-limit.js`) are untracked and would be caught by `git add .`.
3. `frontend/vercel.json` contains a placeholder backend destination (`https://YOUR-BACKEND-HOST/api/:path*`) which will break frontend API proxying on Vercel unless `VITE_API_URL` is set in Vercel project settings or the URL is filled in.

Once these 3 items are addressed using the exact steps below, the codebase is completely safe to push.

---

## 1. Findings & Issues Table

| ID | Severity | File : Line | Issue | Exact Fix |
|:---|:---:|:---|:---|:---|
| **SEC-01** | **BLOCKER** | `backend/scripts/test-daily-limit.js:25`<br>`backend/scripts/test-parallel-limit.js:25` | Untracked test scripts containing plain-text passwords (`Pass***`) created during test runs. Running `git add .` would commit them to GitHub. | Delete both files (`rm backend/scripts/test-*.js`) or add `backend/scripts/test-*.js` to `.gitignore`. |
| **OPS-01** | **BLOCKER** | `backend/src/models/JobSearchUsage.js`<br>`backend/src/middleware/dailySearchLimit.js` | Critical new feature files are currently untracked (`??`). Pushing without them will cause backend build/import failure (`Cannot find module`). | Stage both files explicitly: `git add backend/src/models/JobSearchUsage.js backend/src/middleware/dailySearchLimit.js`. |
| **OPS-02** | **BLOCKER** | `frontend/vercel.json:6` | `destination` is set to placeholder `"https://YOUR-BACKEND-HOST/api/:path*"`. If Vercel environment variable `VITE_API_URL` is not set, all production `/api` calls return 502 Bad Gateway. | **Option A (Recommended)**: Set `VITE_API_URL=https://<your-backend-host>` in Vercel dashboard.<br>**Option B**: Replace `YOUR-BACKEND-HOST` in `frontend/vercel.json` with your real backend domain. |
| **SEC-02** | **MEDIUM** | `backend/.env:7` | Local MongoDB Atlas connection string contains username & password (`Brij***:VT1K***`). | **Verified**: `backend/.env` is correctly ignored by `.gitignore` and has **never** been committed to git history. Ensure `.env` is never staged. |
| **OPS-03** | **LOW** | `audit/` folder | Audit reports and scratch files should not be cluttering the production repository root. | Add `audit/` to `.gitignore` before committing. |

---

## 2. Secrets Leak Scan Results

### Working Tree Scan
- `backend/.env`: Contains local development credentials (`MONGO_URI`, Cloudinary, Anthropic dummy key). **Ignored by git (`.gitignore`), NOT tracked.**
- `frontend/.env`: Contains `VITE_API_URL=http://localhost:5000`. **Ignored by git (`.gitignore`), NOT tracked.**
- `backend/.env.example` & `frontend/.env.example`: **Clean**. Contain placeholders only (`<username>`, `<password>`, `your_...`).
- `frontend/dist/`: Built and scanned with zero leaked secrets or server tokens.

### Git History Scan (`git log -p --all`)
- Scanned all past commits across all branches.
- **0 secrets found in git history**. No Anthropic keys (`sk-ant-`), Google AI keys (`AIza`), MongoDB credentials, or private keys were ever committed to Git.
- **Key Rotation**: No immediate key rotation required.

### Masked Secrets Reference (Working Tree Only)
| Type | File : Line | Masked Value | Status |
|:---|:---|:---|:---:|
| MongoDB URI | `backend/.env:7` | `mongodb+srv://Brij***:VT1K***@learningmongodb...` | Uncommitted / Gitignored |
| Anthropic Key | `backend/.env:22` | `sk-a***-dummy-anthropic-api-key-here` | Dummy placeholder |
| Test Password | `backend/scripts/test-daily-limit.js:25` | `Pass***` | Untracked test file |
| Test Password | `backend/scripts/test-parallel-limit.js:25` | `Pass***` | Untracked test file |

---

## 3. What Will Be Pushed (Git Inspection)

### Tracked Modified Files (`git diff --stat`):
1. `backend/src/config/env.js`: Configures `JOB_SEARCH_DAILY_LIMIT` & `JOB_SEARCH_DAILY_WINDOW_HOURS`.
2. `backend/src/controllers/job.controller.js`: Implements usage recording, remaining quota calculations, and quota headers.
3. `backend/src/routes/job.routes.js`: Registers `dailySearchLimit` middleware in correct pipeline order.
4. `backend/.env.example`: Documents new rolling quota environment variables.
5. `frontend/src/pages/Jobs.jsx`: Handles 429 reset time in local time, manages quota state.
6. `frontend/src/components/jobs/JobSearchForm.jsx`: Adds search remaining indicator and button disabling when remaining is 0.
7. `frontend/src/components/landing/LandingClosing.jsx`: Redesigned bottom CTA section card.
8. `PROJECT_CONTEXT.md`: Architecture and system context documentation.
9. `backend/package-lock.json` & `frontend/package-lock.json`: Metadata synchronization.

### Untracked Files (`git status --porcelain`):
- `backend/src/models/JobSearchUsage.js` ➔ **MUST BE COMMITTED**
- `backend/src/middleware/dailySearchLimit.js` ➔ **MUST BE COMMITTED**
- `backend/scripts/test-daily-limit.js` ➔ **DO NOT COMMIT (Delete or Ignore)**
- `backend/scripts/test-parallel-limit.js` ➔ **DO NOT COMMIT (Delete or Ignore)**

---

## 4. Vercel Deployment Safety (Frontend)

1. **SPA Routing**:
   - `frontend/vercel.json` contains `"source": "/(.*)", "destination": "/index.html"`.
   - Direct visits or browser refreshes on `/dashboard`, `/applications/:id`, `/jobs`, and `/resumes` will resolve properly without 404s.

2. **Build Verification**:
   - Command: `npm --prefix frontend run build`
   - Result: **Passed in 2.99s with 0 errors**.
   - Output directory: `frontend/dist`.
   - Node engine: `>=20.0.0` (fully compatible with Vercel Node 20.x).

3. **Backend Host Architecture (Non-Serverless)**:
   - The backend runs Express 5, `express-session` with `connect-mongo`, an in-memory active search tracking map (`inFlightSearches`), multi-provider aggregations (up to 10s timeout), and Multer file upload streams.
   - **Vercel Serverless Warning**: The backend **cannot** run as Vercel serverless functions. It must continue to be hosted on a persistent Node.js runtime (e.g. Render, Railway, Fly.io, or VPS).
   - **Repository Isolation**: The repository has no root `package.json` and no root `api/` directory. Vercel's Root Directory setting is pointed to `frontend/`, ensuring Vercel only builds the React frontend.

4. **Backward Compatibility with Currently Live Backend**:
   - **Scenario**: What happens if the new frontend is deployed to Vercel before the backend is deployed?
   - **Behavior**:
     - `Jobs.jsx` checks `typeof runSearchMutation.data?.remaining === "number"`.
     - When communicating with the older backend (which does not return `remaining`), `quota` defaults cleanly to `{ remaining: 5, limit: 5 }`.
     - The indicator shows `"5 of 5 searches left today"` and the search button remains enabled.
     - If the older backend returns a 429 (burst limiter), `mapJobSearchError` gracefully displays `"Search limit reached. Please try again later."` even when `resetAt` is absent.
     - **Verdict**: 100% backward-compatible. Deploying the frontend first will not crash or break the UI.

5. **CORS & Cookie Settings**:
   - If using Vercel `/api/*` rewrite: Requests are same-origin (`/api/*`), so `COOKIE_SAMESITE=lax` works seamlessly.
   - If using direct cross-domain (`VITE_API_URL=https://applied-backend.onrender.com`):
     - Backend `CLIENT_URL` must match `https://your-app.vercel.app` (no trailing slash, no wildcards).
     - Backend `COOKIE_SAMESITE` must be set to `none`.
     - Backend `cookieSecure` is automatically `true` in production.
     - Backend `TRUST_PROXY=1` must be set on reverse proxy hosts.

---

## 5. Backend Production Security Checks

1. **Environment Validation**:
   - `backend/src/config/env.js` uses Zod with `superRefine`.
   - Enforces `SESSION_SECRET >= 32 chars` in production.
   - Enforces `CLIENT_URL` non-empty with no wildcards.
   - `JOB_SEARCH_DAILY_LIMIT` defaults to `5` and `JOB_SEARCH_DAILY_WINDOW_HOURS` defaults to `24`.

2. **Security Headers & Protections**:
   - `helmet()` is active on all endpoints.
   - `express.json({ limit: "10kb" })` protects against oversized body attacks.
   - Centralized `errorHandler` hides error messages and stack traces when `NODE_ENV === "production"`.
   - Rate limiters active: `authLimiter` (10/15m), `jobSearchLimiter` (10/1h), `dailySearchLimit` (5/24h), `apiLimiter` (300/15m).

3. **Database Indexes**:
   - Live MongoDB Atlas index check (`npm run check:indexes`) passed 100%.
   - `jobsearchusages` collection has verified TTL index `createdAt_1` (`expireAfterSeconds: 86400`) and compound query index `userId_1_createdAt_-1`.

4. **Dependency Audit (`npm audit`)**:
   - Zero high or critical vulnerabilities in both backend and frontend.
   - Only devDependencies (`nodemon` and `eslint`) have moderate notices (`minimatch`). Production runtime is clean.

---

## 6. Vercel Environment Variables Checklist

Set these in your **Vercel Project Settings > Environment Variables**:

| Variable Name | Required? | Recommended Value | Purpose |
|:---|:---:|:---|:---|
| `VITE_API_URL` | Conditional | `https://applied-backend.onrender.com` *(or empty if using rewrite)* | Points frontend API client to the backend server. |
| `VITE_APP_NAME` | Optional | `Applied` | Custom brand name displayed in headers and document title. |

---

## 7. Exact Step-by-Step Push & Deployment Guide

Follow these exact commands to safely stage, commit, and deploy:

### Step 1: Clean up ad-hoc test scripts
```bash
rm -f backend/scripts/test-daily-limit.js backend/scripts/test-parallel-limit.js
```

### Step 2: Add `audit/` to `.gitignore`
Append `audit/` to `.gitignore` so local audit artifacts remain local:
```bash
echo "audit/" >> .gitignore
```

### Step 3: Stage the intended changes
```bash
# Stage core backend changes including new feature files
git add backend/src/models/JobSearchUsage.js
git add backend/src/middleware/dailySearchLimit.js
git add backend/src/controllers/job.controller.js
git add backend/src/routes/job.routes.js
git add backend/src/config/env.js
git add backend/.env.example
git add backend/package-lock.json

# Stage frontend changes
git add frontend/src/components/landing/LandingClosing.jsx
git add frontend/src/components/jobs/JobSearchForm.jsx
git add frontend/src/pages/Jobs.jsx
git add frontend/package-lock.json

# Stage documentation & gitignore
git add PROJECT_CONTEXT.md .gitignore
```

### Step 4: Verify staged files before committing
```bash
git status
```
*Confirm that ONLY project files are staged, and NO `.env` files appear.*

### Step 5: Commit and push
```bash
git commit -m "feat(jobs): add per-user rolling 24h search limit and redesign landing CTA"
git push origin updated
# (or merge into main and push to trigger Vercel deployment)
```

### Step 6: Post-Deployment Verification
1. Open Vercel deployment dashboard and confirm frontend build finishes with status `Ready`.
2. Visit `https://<your-app>.vercel.app/dashboard` and refresh to verify SPA routing.
3. Open Developer Tools > Network tab and run a job search:
   - Check headers for `X-Searches-Remaining: 4` and `X-Searches-Limit: 5`.
   - Verify indicator `"4 of 5 searches left today"` appears near the search button.

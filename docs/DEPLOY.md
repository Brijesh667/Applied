# Applied Deployment & Production Guide

This guide details the complete production deployment setup for Applied, including environment configuration, database preparation, backend hosting, Vercel frontend deployment, post-deploy verification, and quota considerations.

---

## 1. Architecture Overview

- **Frontend**: React 18 single-page application hosted on **Vercel**. Uses `vercel.json` to proxy API requests under `/api/*` to the backend host, allowing seamless same-origin session cookies (`COOKIE_SAMESITE=lax`) without third-party cookie restrictions.
- **Backend**: Express 5 on Node.js hosted on a container or platform host (such as **Render**, **Railway**, or **Fly.io**). Configured with `trust proxy` enabled to correctly resolve client IPs behind the reverse proxy.
- **Database & Sessions**: **MongoDB Atlas** for document persistence and session store (`connect-mongo`).
- **File Storage**: **Cloudinary** for private, authenticated resume asset storage with short-lived signed URLs.
- **AI & Provider Integrations**: Switchable resume parsing (Google Gemini or Anthropic Claude) and multiple job search providers with graceful degradation when keys are omitted.

---

## 2. Environment Variables

### Backend Environment Variables (`backend/.env`)

| Variable | Required in Prod | Example Placeholder | Purpose | Where to Obtain |
|---|:---:|---|---|---|
| `PORT` | No | `5000` | Port server listens on (automatically assigned by platforms like Render/Railway). | Hosting provider default |
| `MONGO_URI` | **Yes** | `mongodb+srv://<user>:<password>@cluster.mongodb.net/applied?retryWrites=true&w=majority` | Connection string for MongoDB Atlas cluster. | [MongoDB Atlas](https://cloud.mongodb.com) |
| `SESSION_SECRET` | **Yes** | `<random-32-chars-hex>` | Secret key for signing session cookies. Must be $\ge 32$ characters in production. | Run `openssl rand -hex 32` |
| `CLIENT_URL` | **Yes** | `https://your-app.vercel.app` | Comma-separated list of exact allowed origins for CORS. No wildcards allowed. | Vercel Project Domains |
| `NODE_ENV` | **Yes** | `production` | Enables production security guards (secure cookies, hides error stacks, enforces secret lengths). | Hosting provider |
| `COOKIE_SAMESITE` | No | `lax` | Cookie SameSite attribute: `lax` (recommended for Vercel rewrite) or `none` (for cross-site). | Deploy architecture |
| `TRUST_PROXY` | No | `1` | Number of upstream proxy hops to trust (default `1` in production, `0` in development). | Render / Railway / Vercel proxy tier |
| `AUTH_RATE_LIMIT_MAX` | No | `10` | Maximum login/register attempts allowed per 15 minutes per client IP (default: `10`). | Custom adjustment for shared networks |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | `your_cloudinary_cloud_name` | Cloud name for private authenticated resume storage. | [Cloudinary Console](https://cloudinary.com/console) |
| `CLOUDINARY_API_KEY` | **Yes** | `123456789012345` | Cloudinary API Key. | [Cloudinary Console](https://cloudinary.com/console) |
| `CLOUDINARY_API_SECRET` | **Yes** | `abcdef123456789...` | Cloudinary API Secret. | [Cloudinary Console](https://cloudinary.com/console) |
| `AI_PROVIDER` | No | `anthropic` | Primary AI provider for resume extraction (`anthropic` or `google`, default: `anthropic`). | Developer preference |
| `ANTHROPIC_API_KEY` | No | `sk-ant-api03-...` | Anthropic API key for Claude resume parsing and job ranking. | [Anthropic Console](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | No | `claude-haiku-5-5` | Model ID for Anthropic Claude. | Anthropic Documentation |
| `GOOGLE_API_KEY` | No | `AIzaSy...` | Google Gemini API key for Gemini resume parsing and job ranking. | [Google AI Studio](https://aistudio.google.com) |
| `GOOGLE_MODEL` | No | `gemini-2.5-flash` | Model ID for Google Gemini. | Google AI Studio |
| `ADZUNA_APP_ID` | No | `your_adzuna_app_id` | Adzuna application ID for job search. | [Adzuna Developer Portal](https://developer.adzuna.com) |
| `ADZUNA_APP_KEY` | No | `your_adzuna_app_key` | Adzuna application key for job search. | [Adzuna Developer Portal](https://developer.adzuna.com) |
| `JSEARCH_API_KEY` | No | `your_rapidapi_key` | RapidAPI key for JSearch job listings. | [RapidAPI JSearch](https://rapidapi.com) |
| `JOOBLE_API_KEY` | No | `your_jooble_api_key` | Jooble API key for job listings. | [Jooble API About](https://jooble.org/api/about) |
| `CAREERJET_API_KEY` | No | `your_careerjet_api_key` | Careerjet affiliate website key. | [Careerjet Publisher Portal](https://www.careerjet.co.in) |
| `CAREERJET_LOCALE` | No | `en_IN` | Supported locale code for Careerjet (default: `en_IN`). | Careerjet Documentation |
| `JOB_PROVIDERS` | No | `adzuna,jsearch,jooble,careerjet,himalayas,remoteok` | Comma-separated list to restrict enabled providers, or `none`. | Developer configuration |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Required in Prod | Example Placeholder | Purpose | Notes |
|---|:---:|---|---|---|
| `VITE_API_URL` | No | *(leave empty)* | API host prefix. Leave blank when using the Vercel rewrite in `vercel.json`. | Only set to `https://api.yourdomain.com` if using a cross-domain API architecture without rewrites. |
| `VITE_APP_NAME` | No | `Applied` | Custom brand name rendered in application headers and titles. | Default: `Applied` |

---

## 3. Step-by-Step Deployment Instructions

### Step 1: MongoDB Atlas Database Setup
1. Create a free or dedicated cluster on [MongoDB Atlas](https://cloud.mongodb.com).
2. Under **Database Access**, create a database user with password and `readWriteAnyDatabase` privileges.
3. Under **Network Access**, add an IP access rule:
   - For serverless or dynamic cloud providers (Render, Railway), add `0.0.0.0/0` (Allow Access from Anywhere) secured by strong database passwords.
   - For static IP hosting, add the specific outbound IP addresses.
4. Obtain your connection string under **Cluster > Connect > Drivers > Node.js**. Replace `<username>` and `<password>` with your credentials.

### Step 2: Deploy Backend (e.g. Render / Railway)
1. Link your repository to **Render** or **Railway**.
2. Configure service settings:
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
3. Configure Environment Variables in the provider dashboard:
   - `NODE_ENV`: `production`
   - `MONGO_URI`: *(your MongoDB Atlas URI)*
   - `SESSION_SECRET`: *(32+ character random string)*
   - `CLIENT_URL`: `https://YOUR-APP.vercel.app` (or temporary placeholder; update after Vercel deploy)
   - `COOKIE_SAMESITE`: `lax`
   - `TRUST_PROXY`: `1`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - Optional AI & Job provider keys (`GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `ADZUNA_APP_ID`, etc.)
4. Deploy the backend and copy its public domain (e.g., `https://applied-backend.onrender.com`).
5. Verify health: visit `https://applied-backend.onrender.com/api/health` in your browser; it should return `{"status":"ok"}`.
6. Verify database indexes: run `npm run check:indexes` inside `backend/` to verify that all indexes (unique constraints, TTLs, query compounds) are active on the database.

### Step 3: Deploy Frontend (Vercel)
1. In `frontend/vercel.json`, verify the destination proxy points to your live backend domain:
   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://applied-backend.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
2. Import the project on [Vercel](https://vercel.com).
3. Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Leave `VITE_API_URL` empty in Vercel environment variables so requests stay relative (`/api/...`).
5. Deploy. Vercel will assign a production URL (e.g. `https://applied-tracker.vercel.app`).

### Step 4: Finalize CORS Configuration
1. Return to your backend host dashboard (Render/Railway).
2. Update `CLIENT_URL` to the exact production Vercel URL (e.g., `https://applied-tracker.vercel.app`). If custom domains are attached, include them comma-separated (e.g., `https://applied-tracker.vercel.app,https://applied.yourdomain.com`).
3. Trigger a redeploy / restart of the backend service so the updated CORS allowlist takes effect.

---

## 4. Post-Deploy Verification Checklist

Perform these manual checks after deploying to production:

- [ ] **Authentication**: Register a new user and log in. Verify the session cookie `sid` in browser DevTools (under Application > Cookies):
  - `HttpOnly`: checked
  - `Secure`: checked
  - `SameSite`: `Lax`
- [ ] **CORS & Network**: Open Browser Console > Network tab. Verify zero CORS warnings or blocked pre-flight errors.
- [ ] **Deep Linking & SPA Refresh**: Navigate to `/dashboard`, `/jobs`, `/resumes`, and an individual application `/applications/<id>`. Refresh the browser on each deep URL to ensure `vercel.json` serves `index.html` without 404 errors.
- [ ] **Resume Upload & AI Parsing**: Upload a sample PDF or DOCX resume. Verify the upload completes, text extracts, and skills parse cleanly.
- [ ] **Job Search & Filters**: Run a job search. Verify that listings appear, result filters update in the URL, facet counts display, and "Load more" fetches subsequent pages.
- [ ] **Job Tracking ("Hide Tracked")**: Click "Apply", then "Track application". Verify that the card displays "Tracked" and does NOT immediately vanish while the toast notification is displayed.
- [ ] **Rate Limiting Isolation**: Attempt 10 failed logins from one network (e.g., laptop on Wi-Fi). Verify that you receive the rate limit response (429), while a mobile device using cellular data can still log in without being blocked (verifying `trust proxy` correctly isolates IP addresses).
- [ ] **Cold Start Resilience**: On free tiers where the backend sleeps after inactivity, trigger a request from the frontend and observe that the loading indicator handles the delay gracefully without throwing fatal errors.

---

## 5. Known Limitations & Upstream Quotas

1. **Adzuna Sandbox Limit**: The Adzuna free test account allows approximately 25 total API requests before quota exhaustion. Once exhausted, Adzuna requests return `401/403` and the backend automatically marks Adzuna as `quota` or `failed` while other providers continue serving results.
2. **Google Gemini Free Tier**: The Gemini API free tier allows up to 15 requests per minute (RPM) and a daily limit. Batch ranking top 25 jobs is designed to make only a single AI call per search to respect this limit.
3. **Free Tier Backend Cold Starts**: Free host instances (such as Render Free) spin down after 15 minutes of inactivity. First requests after sleeping take 30–60 seconds to spin up. The frontend has request timeouts set to accommodate cold starts.
4. **Careerjet Publisher Policy**: Careerjet requires:
   - The registered website URL in your publisher portal must match the production deployment domain.
   - Every request must include the real client IP and User-Agent (`req.ip`, `req.get("user-agent")`), which is forwarded correctly via `TRUST_PROXY`.
5. **Himalayas & RemoteOK Attribution**: Himalayas and RemoteOK API terms mandate visible attribution links on the job card (e.g., `via Himalayas`, `via RemoteOK`) and strictly prohibit redistribution to third-party scraping feeds.

---

## 6. Secrets Hygiene & Key Rotation

1. **Never Commit Secrets**: Never commit `.env` or production credentials to git. The repository `.gitignore` ignores all `.env*` files except `.env.example`.
2. **Key Rotation Requirement**: If any credential or connection string was ever pasted into a chat, ticket, issue, or git commit, it must be rotated immediately in its respective dashboard:
   - Rotate MongoDB database user password in Atlas.
   - Rotate Cloudinary API Secret in Cloudinary Settings.
   - Regenerate Gemini or Anthropic API keys.
3. **Production Password Strength**: Use unique, high-entropy passwords for production accounts; never use development test passwords (`demo123`, `password123`).

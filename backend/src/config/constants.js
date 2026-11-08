export const LIMITS = {
  companyName: 50,
  role: 50,
  duration: 10,
  appliedFrom: 30,
  skills: 150,
  description: 300,
  notes: 200,
  replyNotes: 200,
  payMin: 0,
  payMax: 10000000,
  name: 50,
  email: 100,
  passwordMin: 8,
  passwordMax: 64,
  maxReplies: 20,
  pageSize: 15,
  maxPageSize: 30,
};

export const PAY_TYPES = ["yearly", "monthly", "onetime"];
export const STATUSES = ["applied", "in-process", "offer", "rejected"];
export const REPLY_TYPES = ["assessment", "assignment", "interview", "offer", "rejection", "other"];
export const PLATFORMS = ["LinkedIn", "Internshala", "Naukri", "Company Website", "Referral", "Other"];

export const MAX_RESUMES_PER_USER = 5;
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_LABEL_MAX = 50;
export const RESUME_FILENAME_MAX = 100;
export const RESUME_ALLOWED_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const RESUME_DOWNLOAD_URL_TTL_SECONDS = 300;

export const RESUME_TEXT_MAX_CHARS = 12000;
export const RESUME_MIN_TEXT_CHARS = 50;
export const RESUME_SKILLS_MAX = 30;
export const RESUME_SKILL_MAX_LEN = 40;
export const RESUME_ROLES_MAX = 5;
export const RESUME_ROLE_MAX_LEN = 60;
export const RESUME_EXPERIENCE_MAX_YEARS = 50;
export const RESUME_PARSE_TIMEOUT_MS = 30000;
export const RESUME_PARSE_STALE_MS = 120000;
export const RESUME_REPARSE_LIMIT_PER_HOUR = 10;

export const JOB_SEARCH_CACHE_TTL_SECONDS = 86400;
export const JOB_SEARCH_REFRESH_MIN_AGE_SECONDS = 3600;
export const JOB_SEARCH_LIMIT_PER_HOUR = 10;
export const JOB_PROVIDER_TIMEOUT_MS = 10000;
export const JOB_ADZUNA_MAX_REQUESTS_PER_SEARCH = 2;
export const JOB_JSEARCH_MAX_REQUESTS_PER_SEARCH = 1;
export const JOB_RESULTS_PER_REQUEST = 20;
export const JOB_MAX_RESULTS_RETURNED = 50;
export const JOB_MAX_AGE_DAYS = 60;
export const JOB_DESCRIPTION_SNIPPET_MAX = 500;

export const JOB_RANK_CANDIDATES = 25;
export const JOB_RANK_SNIPPET_CHARS = 300;
export const JOB_RANK_REASON_MAX = 120;
export const JOB_RANK_TIMEOUT_MS = 30000;
export const JOB_RANK_MAX_TOKENS = 3000;

export const TRACK_DEFAULT_DURATION = "Not set";
export const JOB_TRACK_LIMIT_PER_HOUR = 60;



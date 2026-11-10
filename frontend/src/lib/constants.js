export const LIMITS = {
  companyName: 50,
  role: 50,
  duration: 10,
  appliedFrom: 30,
  skills: 150,
  description: 300,
  notes: 200,
  replyNotes: 200,
  jobLink: 500,
  payMin: 0,
  payMax: 10000000,
  name: 50,
  email: 100,
  passwordMin: 8,
  passwordMax: 64,
  pageSize: 15,
  maxReplies: 20,
  resumeLabel: 50,
  resumeSkills: 30,
  resumeSkillLen: 40,
  resumeRoles: 5,
  resumeRoleLen: 60,
  resumeExperienceMax: 50,
  resumeLocation: 100,
};

export const MAX_RESUMES_PER_USER = 5;
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_LABEL_MAX = 50;
export const RESUME_SKILLS_MAX = 30;
export const RESUME_SKILL_MAX_LEN = 40;
export const RESUME_ROLES_MAX = 5;
export const RESUME_ROLE_MAX_LEN = 60;
export const RESUME_EXPERIENCE_MAX_YEARS = 50;
export const RESUME_LOCATION_MAX = 100;
export const RESUME_PARSE_STALE_MS = 120000;

export const RESUME_ALLOWED_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
export const RESUME_ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
export const RESUME_ACCEPTED_MIME_TYPES = Object.values(RESUME_ALLOWED_TYPES);
export const RESUME_ACCEPT_STRING = ".pdf,.docx";

export const PAY_TYPES = ["yearly", "monthly", "onetime"];
export const STATUSES = ["applied", "in-process", "offer", "rejected"];
export const REPLY_TYPES = ["assessment", "assignment", "interview", "offer", "rejection", "other"];
export const PLATFORMS = ["LinkedIn", "Internshala", "Naukri", "Company Website", "Referral", "Other"];

export const STATUS_LABELS = {
  applied: "Applied",
  "in-process": "In process",
  offer: "Offer",
  rejected: "Rejected",
};

export const REPLY_LABELS = {
  assessment: "Assessment",
  assignment: "Assignment",
  interview: "Interview",
  offer: "Offer",
  rejection: "Rejection",
  other: "Other",
};

export const PAY_LABELS = {
  yearly: "per year",
  monthly: "per month",
  onetime: "one-time",
};

export const CURRENCY = "₹";

export const JOB_STRONG_MATCH_MIN = 75;
export const JOB_GOOD_MATCH_MIN = 50;
export const JOB_REFRESH_COOLDOWN_MS = 3600000;
export const JOB_SNIPPET_COLLAPSED_LINES = 3;
export const JOB_POSTED_WITHIN_OPTIONS = [7, 30, 60];
export const JOB_ROLES_MAX = 5;
export const JOB_ROLE_MAX_LEN = 60;
export const JOB_LOCATION_MAX = 100;
export const JOB_MIN_PAY_MAX = 10000000;
export const JOB_PAGE_SIZE = 20;
export const JOB_QUERY_TEXT_MAX = 50;

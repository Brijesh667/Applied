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
};

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

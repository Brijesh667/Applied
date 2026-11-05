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

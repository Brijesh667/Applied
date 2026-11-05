/**
 * landingSamples.js
 * Sample datasets for Landing Page v3 mockups.
 * All preview data is static and renders without backend or network.
 * Strict ownership:
 * - Hero: KPI mini cards + Needs attention preview
 * - Problem 1: Filter bar + 2 application cards
 * - Problem 2: 2 reply rows with due chip and Done button
 * - Problem 3: Status bar (4 statuses) + 3 platform rows
 */

export const heroKpis = [
  { label: "Applied", value: "24", sub: "total apps", variant: "default" },
  { label: "Missed", value: "2", sub: "overdue", variant: "danger" },
  { label: "This week", value: "5", sub: "due soon", variant: "primary" },
];

export function getSampleHeroAttention(now = new Date()) {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );

  const tomorrow = new Date(startOfToday.getTime() + 1 * 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(
    startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000
  );
  const twoDaysAgo = new Date(
    startOfToday.getTime() - 2 * 24 * 60 * 60 * 1000
  );

  return {
    thisWeek: [
      {
        id: "razorpay",
        company: "Razorpay",
        role: "Backend Developer Intern",
        type: "assessment",
        deadline: tomorrow.toISOString(),
      },
      {
        id: "tcs",
        company: "Tata Consultancy Services",
        role: "Associate Software Engineer",
        type: "interview",
        deadline: inThreeDays.toISOString(),
      },
    ],
    missed: [
      {
        id: "google",
        company: "Google",
        role: "Senior Backend Engineer",
        type: "assignment",
        deadline: twoDaysAgo.toISOString(),
      },
    ],
  };
}

export function getProblem1Cards(now = new Date()) {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );
  const tomorrow = new Date(startOfToday.getTime() + 1 * 24 * 60 * 60 * 1000);
  const inTwoDays = new Date(startOfToday.getTime() + 2 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "card-1",
      company: "Razorpay",
      role: "Backend Developer Intern",
      platform: "LinkedIn",
      pay: "₹60,000 / month",
      status: "in-process",
      replyType: "interview",
      deadline: inTwoDays.toISOString(),
    },
    {
      id: "card-2",
      company: "Google",
      role: "Software Engineer",
      platform: "Career site",
      pay: "₹32 LPA",
      status: "in-process",
      replyType: "assessment",
      deadline: tomorrow.toISOString(),
    },
  ];
}

export function getProblem2Replies(now = new Date()) {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0
  );
  const inThreeDays = new Date(
    startOfToday.getTime() + 3 * 24 * 60 * 60 * 1000
  );

  return [
    {
      id: "reply-1",
      type: "assignment",
      received: "4d ago",
      deadline: inThreeDays.toISOString(),
      completed: false,
    },
    {
      id: "reply-2",
      type: "assessment",
      received: "6d ago",
      deadline: null,
      completed: true,
    },
  ];
}

export const problem3Data = {
  statuses: [
    { label: "Applied", count: 9, percent: 37, color: "bg-ink-soft/40" },
    { label: "In process", count: 10, percent: 42, color: "bg-primary" },
    { label: "Offer", count: 2, percent: 8, color: "bg-emerald-500" },
    { label: "Rejected", count: 3, percent: 13, color: "bg-ink-soft/70" },
  ],
  platforms: [
    { name: "LinkedIn", count: 14, percent: 58 },
    { name: "Indeed", count: 6, percent: 25 },
    { name: "Career site", count: 4, percent: 17 },
  ],
};

/**
 * landingContent.js
 * Centralized copy for Landing Page.
 * Strict rules:
 * - Every line carries information; nothing repeats across sections.
 * - Sentence case, no emoji, no icons in chips.
 * - No filler lines, no "calm", no trust/privacy marketing slogans.
 * - No unbuilt features (reminders, calendar sync, export).
 */

export const navContent = {
  links: [
    { href: "#solution", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#faq", label: "FAQ" },
  ],
  signIn: "Sign in",
};

export const heroContent = {
  headline: "Know where you applied and what is due next.",
  subtext: "Track job and internship applications, replies and deadlines.",
  cta: "Start tracking",
};

export const problemSolutionContent = {
  heading: "Why a tracker",
  rows: [
    {
      id: "scattered-applications",
      problem: "Applications are scattered across sites and notes.",
      solution: "One list with company, role, pay and platform. Search and filter it.",
    },
    {
      id: "lost-deadlines",
      problem: "Replies and deadlines get lost in email.",
      solution: "Each reply sits on a timeline with its deadline. Tick it off when done.",
    },
    {
      id: "platform-outcomes",
      problem: "You cannot tell which platforms actually reply.",
      solution: "Status totals and replies per platform in one view.",
    },
  ],
};

export const howItWorksContent = {
  heading: "How it works",
  resultLabel: "Result",
  steps: [
    {
      number: "1",
      title: "Log an application",
      description: "Company, role, platform and pay.",
      result: "Appears in your applications list",
    },
    {
      number: "2",
      title: "Add replies and deadlines",
      description: "Record each reply with a due date.",
      result: "Shows up in Needs attention",
    },
    {
      number: "3",
      title: "Work from the dashboard",
      description: "Mark deadlines done as they pass.",
      result: "Status updates on its own",
    },
  ],
};

export const faqContent = {
  heading: "FAQ",
  items: [
    {
      id: "faq-internships",
      question: "Can I track internships?",
      answer: "Yes. Log jobs and internships with pay per year, per month or one-time.",
    },
    {
      id: "faq-change",
      question: "Can I change an application later?",
      answer: "Yes. Edit any detail, and add, edit or delete replies. Status follows your latest reply.",
    },
    {
      id: "faq-privacy",
      question: "Who can see my data?",
      answer: "Only you. Each account has its own data and passwords are stored hashed.",
    },
    {
      id: "faq-reminders",
      question: "Does it send reminders?",
      answer: "No. Missed and this-week deadlines show on your dashboard and applications list.",
    },
  ],
};

export const footerContent = {
  tagline: "Track every application in one place.",
};

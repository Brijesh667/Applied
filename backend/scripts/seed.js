import bcrypt from "bcrypt";
import mongoose from "mongoose";
import config from "../src/config/env.js";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Application from "../src/models/Application.js";
import { deriveStatus } from "../src/utils/deriveStatus.js";

async function seed() {
  if (config.nodeEnv === "production") {
    console.error("ERROR: Refusing to run seed script in production environment.");
    process.exit(1);
  }

  // Parse optional --count=N (default 10, range 1 to 100)
  let count = 10;
  const countArg = process.argv.find((arg) => arg.startsWith("--count="));
  if (countArg) {
    const raw = countArg.split("=")[1];
    if (!/^\d+$/.test(raw) || parseInt(raw, 10) < 1 || parseInt(raw, 10) > 100) {
      console.error("ERROR: --count must be an integer between 1 and 100.");
      process.exit(1);
    }
    count = parseInt(raw, 10);
  } else {
    const idx = process.argv.indexOf("--count");
    if (idx !== -1 && process.argv[idx + 1]) {
      const raw = process.argv[idx + 1];
      if (!/^\d+$/.test(raw) || parseInt(raw, 10) < 1 || parseInt(raw, 10) > 100) {
        console.error("ERROR: --count must be an integer between 1 and 100.");
        process.exit(1);
      }
      count = parseInt(raw, 10);
    }
  }

  await connectDB();

  console.log("Connected to MongoDB. Seeding database...");

  const demoEmail = process.env.SEED_EMAIL || "demo@example.com";
  const demoPassword = process.env.SEED_PASSWORD;
  const demoName = process.env.SEED_NAME || "Demo User";

  if (!demoPassword) {
    console.error("ERROR: SEED_PASSWORD environment variable is required.");
    process.exit(1);
  }

  // Check if demo user exists
  let user = await User.findOne({ email: demoEmail });

  if (user) {
    console.log(`Demo user (${demoEmail}) found. Resetting existing applications...`);
    await Application.deleteMany({ userId: user._id });
  } else {
    console.log(`Creating demo user (${demoEmail})...`);
    const hashedPassword = await bcrypt.hash(demoPassword, 12);
    user = await User.create({
      name: demoName,
      email: demoEmail,
      password: hashedPassword,
    });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const rawApplications = [
    {
      companyName: "Google",
      role: "Senior Backend Engineer",
      appliedFrom: "LinkedIn",
      pay: { type: "yearly", amount: 3500000 },
      duration: "Full-time",
      skills: "Go, Kubernetes, Distributed Systems, GCP",
      description: "Working on scalable cloud infrastructure.",
      appliedDate: new Date(now - 28 * dayMs),
      replies: [
        {
          type: "assessment",
          receivedDate: new Date(now - 25 * dayMs),
          deadline: new Date(now - 20 * dayMs),
          completed: true,
          notes: "Online coding test passed with 100%",
        },
        {
          type: "interview",
          receivedDate: new Date(now - 15 * dayMs),
          completed: true,
          notes: "System design round and behavioural rounds completed",
        },
        {
          type: "offer",
          receivedDate: new Date(now - 5 * dayMs),
          completed: false,
          notes: "Received official offer letter",
        },
      ],
    },
    {
      companyName: "Microsoft",
      role: "Fullstack Developer",
      appliedFrom: "Referral",
      pay: { type: "yearly", amount: 2800000 },
      duration: "Full-time",
      skills: "TypeScript, React, C#, Azure",
      description: "Developing developer platform tooling.",
      appliedDate: new Date(now - 22 * dayMs),
      replies: [
        {
          type: "assignment",
          receivedDate: new Date(now - 18 * dayMs),
          deadline: new Date(now + 10 * dayMs),
          completed: false,
          notes: "Build microservices prototype in TypeScript and C#",
        },
      ],
    },
    {
      companyName: "Amazon",
      role: "DevOps Engineer",
      appliedFrom: "Company Website",
      pay: { type: "monthly", amount: 180000 },
      duration: "Full-time",
      skills: "AWS, Terraform, Docker, CI/CD",
      description: "Infrastructure automation and CI/CD pipelines.",
      appliedDate: new Date(now - 25 * dayMs),
      replies: [
        {
          type: "assessment",
          receivedDate: new Date(now - 22 * dayMs),
          deadline: new Date(now - 15 * dayMs),
          completed: false,
          notes: "HackerRank coding challenge (overdue)",
        },
      ],
    },
    {
      companyName: "Netflix",
      role: "UI/UX Frontend Engineer",
      appliedFrom: "LinkedIn",
      pay: { type: "yearly", amount: 3200000 },
      duration: "Full-time",
      skills: "React, Next.js, CSS, WebGL",
      description: "Enhancing viewing experience for millions of subscribers.",
      appliedDate: new Date(now - 19 * dayMs),
      replies: [
        {
          type: "interview",
          receivedDate: new Date(now - 12 * dayMs),
          completed: true,
          notes: "Technical round with frontend engineering team",
        },
      ],
    },
    {
      companyName: "Meta",
      role: "Software Engineer - Infrastructure",
      appliedFrom: "Naukri",
      pay: { type: "yearly", amount: 3000000 },
      duration: "Full-time",
      skills: "C++, Linux, Python, Networking",
      description: "High-performance distributed networking components.",
      appliedDate: new Date(now - 26 * dayMs),
      replies: [
        {
          type: "assessment",
          receivedDate: new Date(now - 21 * dayMs),
          completed: true,
          notes: "Algorithms assessment",
        },
        {
          type: "rejection",
          receivedDate: new Date(now - 14 * dayMs),
          completed: true,
          notes: "Position put on hold",
        },
      ],
    },
    {
      companyName: "Stripe",
      role: "Backend Systems Intern",
      appliedFrom: "Internshala",
      pay: { type: "monthly", amount: 80000 },
      duration: "6 months",
      skills: "Ruby, API Design, PostgreSQL, Redis",
      description: "Core payments gateway reliability.",
      appliedDate: new Date(now - 14 * dayMs),
      replies: [],
    },
    {
      companyName: "Spotify",
      role: "Mobile App Engineer",
      appliedFrom: "LinkedIn",
      pay: { type: "monthly", amount: 150000 },
      duration: "Full-time",
      skills: "React Native, Kotlin, Swift",
      description: "Audio player UI and offline cache optimization.",
      appliedDate: new Date(now - 10 * dayMs),
      replies: [
        {
          type: "interview",
          receivedDate: new Date(now - 7 * dayMs),
          deadline: new Date(now + 3 * dayMs),
          completed: false,
          notes: "Live coding interview round",
        },
      ],
    },
    {
      companyName: "Uber",
      role: "Data Platform Engineer",
      appliedFrom: "Referral",
      pay: { type: "yearly", amount: 2600000 },
      duration: "Full-time",
      skills: "Apache Spark, Kafka, Python, SQL",
      description: "Real-time rider and driver telemetry processing.",
      appliedDate: new Date(now - 16 * dayMs),
      replies: [],
    },
    {
      companyName: "Airbnb",
      role: "Frontend Contractor",
      appliedFrom: "Company Website",
      pay: { type: "onetime", amount: 250000 },
      duration: "3 months",
      skills: "Vue.js, Nuxt, Tailwind CSS",
      description: "Host onboarding flows redesign.",
      appliedDate: new Date(now - 8 * dayMs),
      replies: [
        {
          type: "assignment",
          receivedDate: new Date(now - 5 * dayMs),
          deadline: new Date(now + 2 * dayMs),
          completed: false,
          notes: "Build responsive booking calendar component",
        },
      ],
    },
    {
      companyName: "Swiggy",
      role: "Backend Intern",
      appliedFrom: "Internshala",
      pay: { type: "monthly", amount: 45000 },
      duration: "3 months",
      skills: "Node.js, Express, MongoDB",
      description: "Delivery tracking microservice support.",
      appliedDate: new Date(now - 3 * dayMs),
      replies: [],
    },
  ];

  const applicationsList = [...rawApplications];

  if (count > 10) {
    const extraCompanies = [
      "Oracle", "Salesforce", "Cisco", "Adobe", "Intel", "Nvidia", "Twitter", "Snapchat",
      "Pinterest", "Reddit", "Dropbox", "Square", "Shopify", "Atlassian", "Twilio",
      "Datadog", "Snowflake", "Palantir", "Cloudflare", "MongoDB Inc", "Docker", "GitLab",
      "HashiCorp", "Elastic", "Confluent", "Asana", "Slack", "Zoom", "DocuSign", "Zscaler"
    ];
    const extraRoles = [
      "Frontend Engineer", "Backend Developer", "Fullstack Engineer", "DevOps Engineer",
      "Site Reliability Engineer", "Mobile Developer", "Data Engineer", "Cloud Architect",
      "Security Engineer", "Software Engineer"
    ];
    const extraPlatforms = ["LinkedIn", "Internshala", "Naukri", "Company Website", "Referral"];
    const extraPayTypes = ["yearly", "monthly", "onetime"];

    for (let i = 11; i <= count; i++) {
      const company = extraCompanies[(i - 11) % extraCompanies.length] + (i > 40 ? ` ${i}` : "");
      const role = extraRoles[(i - 11) % extraRoles.length];
      const platform = extraPlatforms[(i - 11) % extraPlatforms.length];
      const payType = extraPayTypes[(i - 11) % extraPayTypes.length];
      const amount =
        payType === "yearly"
          ? 1500000 + ((i * 50000) % 2500000)
          : payType === "monthly"
          ? 60000 + ((i * 5000) % 90000)
          : 100000 + ((i * 10000) % 200000);
      const daysAgo = 1 + ((i * 3) % 60); // spread over last 60 days
      const appliedDate = new Date(now - daysAgo * dayMs);

      const replies = [];
      if (i % 3 === 0) {
        replies.push({
          type: "assessment",
          receivedDate: new Date(appliedDate.getTime() + 2 * dayMs),
          deadline: new Date(now + 4 * dayMs),
          completed: false,
          notes: "Online coding test",
        });
      } else if (i % 4 === 0) {
        replies.push({
          type: "interview",
          receivedDate: new Date(appliedDate.getTime() + 5 * dayMs),
          completed: true,
          notes: "Technical phone screen",
        });
      } else if (i % 7 === 0) {
        replies.push({
          type: "rejection",
          receivedDate: new Date(appliedDate.getTime() + 10 * dayMs),
          completed: true,
        });
      } else if (i % 11 === 0) {
        replies.push({
          type: "offer",
          receivedDate: new Date(appliedDate.getTime() + 14 * dayMs),
          completed: false,
        });
      }

      applicationsList.push({
        companyName: company,
        role: role,
        appliedFrom: platform,
        pay: { type: payType, amount },
        duration: "Full-time",
        skills: "JavaScript, TypeScript, Node.js",
        description: `Job opportunity at ${company}`,
        appliedDate,
        replies,
      });
    }
  }

  const applicationsToInsert = applicationsList.slice(0, count).map((app) => ({
    ...app,
    userId: user._id,
    status: deriveStatus(app.replies),
  }));

  const createdApps = await Application.insertMany(applicationsToInsert);

  console.log("\n=================================");
  console.log(" Database Seed Successful!");
  console.log("=================================");
  console.log(`Demo User Email    : ${demoEmail}`);
  console.log(`Demo User Password : (configured via SEED_PASSWORD)`);
  console.log(`Applications Created: ${createdApps.length}`);
  console.log("=================================\n");

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

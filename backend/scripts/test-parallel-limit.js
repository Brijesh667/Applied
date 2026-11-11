import http from "http";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import Resume from "../src/models/Resume.js";
import JobSearchCache from "../src/models/JobSearchCache.js";
import JobSearchUsage from "../src/models/JobSearchUsage.js";

async function runParallelTest() {
  console.log("\n=======================================================");
  console.log(" Running Parallel Race Condition Test (8 Simultaneous Requests)");
  console.log("=======================================================\n");

  await connectDB();

  // 1. Start server on test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5098, resolve));
  const baseUrl = "http://127.0.0.1:5098/api";
  console.log("Test server running at:", baseUrl);

  // 2. Create unique test user
  const testEmail = `parallel-tester-${Date.now()}@example.com`;
  const testPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  const testUser = await User.create({
    name: "Parallel Tester",
    email: testEmail,
    password: hashedPassword,
  });
  console.log("Created test user:", testUser.email, `(id: ${testUser._id})`);

  // 3. Create test resume
  const testResume = await Resume.create({
    userId: testUser._id,
    label: "Parallel Test Resume",
    fileName: "resume.pdf",
    fileType: "pdf",
    fileSize: 1024,
    storagePublicId: "test/parallel-resume",
    parseStatus: "done",
    skills: ["React", "Node.js", "Python", "Go", "Docker", "Kubernetes", "AWS", "SQL"],
    roleTitles: ["Software Engineer", "Backend Developer", "DevOps Engineer"],
    experienceYears: 4,
    locationPreference: "Remote",
  });
  console.log("Created test resume:", testResume.label, `(id: ${testResume._id})`);

  // 4. Log in to get session cookie
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed with status ${loginRes.status}`);
  }

  const rawCookie = loginRes.headers.get("set-cookie");
  const cookie = rawCookie ? rawCookie.split(";")[0] : "";
  console.log("Logged in successfully, session cookie obtained.\n");

  // 8 completely distinct search query objects (ensuring zero cache hits)
  const queries = [
    { query: "golang backend", location: "Bengaluru" },
    { query: "python django", location: "Hyderabad" },
    { query: "react frontend", location: "Mumbai" },
    { query: "devops kubernetes", location: "Pune" },
    { query: "node microservices", location: "Delhi" },
    { query: "data engineer spark", location: "Chennai" },
    { query: "cloud aws architect", location: "Noida" },
    { query: "fullstack typescript", location: "Gurugram" },
  ];

  console.log(`Firing 8 simultaneous POST /api/jobs/search requests with Promise.all()...\n`);

  const startTime = Date.now();

  const results = await Promise.all(
    queries.map(async (filters, index) => {
      const reqId = index + 1;
      const res = await fetch(`${baseUrl}/jobs/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({
          resumeId: String(testResume._id),
          filters,
          refresh: false,
        }),
      });

      const status = res.status;
      const data = await res.json();
      return {
        reqId,
        query: filters.query,
        location: filters.location,
        status,
        remaining: data?.remaining,
        cached: data?.cached,
        message: data?.message,
        resetAt: data?.resetAt,
      };
    })
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`All 8 requests completed in ${duration}s.\n`);

  console.log("---------------- Individual Results ----------------");
  for (const r of results) {
    if (r.status === 200) {
      console.log(`Request #${r.reqId} [${r.query} in ${r.location}]: HTTP ${r.status} | Cached: ${r.cached} | Remaining: ${r.remaining}`);
    } else {
      console.log(`Request #${r.reqId} [${r.query} in ${r.location}]: HTTP ${r.status} | Message: "${r.message}" | ResetAt: ${r.resetAt}`);
    }
  }

  // Count statuses
  const status200 = results.filter((r) => r.status === 200);
  const status429 = results.filter((r) => r.status === 429);
  const otherStatuses = results.filter((r) => r.status !== 200 && r.status !== 429);

  console.log("\n---------------- Verification ----------------");
  console.log(`HTTP 200 OK count:  ${status200.length} (Expected: exactly 5)`);
  console.log(`HTTP 429 count:     ${status429.length} (Expected: exactly 3)`);
  if (otherStatuses.length > 0) {
    console.log(`Other statuses:    ${otherStatuses.length}`);
  }

  // Count records in MongoDB
  const dbUsageCount = await JobSearchUsage.countDocuments({ userId: testUser._id });
  console.log(`DB JobSearchUsage count: ${dbUsageCount} (Expected: exactly 5)`);

  let passed = true;
  if (status200.length > 5) {
    console.error(`[FAIL] More than 5 requests returned 200! (${status200.length})`);
    passed = false;
  } else if (status200.length !== 5) {
    console.warn(`[WARN] Expected 5 to return 200, got ${status200.length}`);
  }

  if (status429.length !== 3) {
    console.error(`[FAIL] Expected 3 requests to return 429, got ${status429.length}`);
    passed = false;
  }

  if (dbUsageCount !== 5) {
    console.error(`[FAIL] Expected JobSearchUsage count to be exactly 5, got ${dbUsageCount}`);
    passed = false;
  }

  if (passed) {
    console.log("\n[SUCCESS] Race condition prevention verified: At most 5 returned 200, remaining returned 429, and DB count is exactly 5!");
  } else {
    console.log("\n[FAILURE] Race condition test failed requirements.");
  }

  // Cleanup
  console.log("\nCleaning up test artifacts...");
  await JobSearchUsage.deleteMany({ userId: testUser._id });
  await JobSearchCache.deleteMany({ userId: testUser._id });
  await Resume.deleteMany({ userId: testUser._id });
  await User.deleteOne({ _id: testUser._id });
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  console.log("Cleanup complete.\n");

  if (!passed) {
    process.exit(1);
  }
}

runParallelTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

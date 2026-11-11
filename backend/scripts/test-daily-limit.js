import http from "http";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import User from "../src/models/User.js";
import Resume from "../src/models/Resume.js";
import JobSearchCache from "../src/models/JobSearchCache.js";
import JobSearchUsage from "../src/models/JobSearchUsage.js";

async function runTest() {
  console.log("\n=======================================================");
  console.log(" Running Daily Job Search Limit Test (Rolling 24h Quota)");
  console.log("=======================================================\n");

  await connectDB();

  // 1. Start server on test port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5099, resolve));
  const baseUrl = "http://127.0.0.1:5099/api";
  console.log("Test server running at:", baseUrl);

  // 2. Create test user
  const testEmail = `test-quota-${Date.now()}@example.com`;
  const testPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  const testUser = await User.create({
    name: "Quota Tester",
    email: testEmail,
    password: hashedPassword,
  });
  console.log("Created test user:", testUser.email, `(id: ${testUser._id})`);

  // 3. Create test resume
  const testResume = await Resume.create({
    userId: testUser._id,
    label: "Quota Test Resume",
    fileName: "resume.pdf",
    fileType: "pdf",
    fileSize: 1024,
    storagePublicId: "test/quota-resume",
    parseStatus: "done",
    skills: ["React", "Node.js", "TypeScript"],
    roleTitles: ["Full Stack Developer", "Frontend Engineer"],
    experienceYears: 3,
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

  const sendSearch = async (filters, refresh = false) => {
    const res = await fetch(`${baseUrl}/jobs/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        resumeId: String(testResume._id),
        filters,
        refresh,
      }),
    });
    const status = res.status;
    const data = await res.json();
    const remainingHeader = res.headers.get("x-searches-remaining");
    const limitHeader = res.headers.get("x-searches-limit");
    return { status, data, remainingHeader, limitHeader };
  };

  try {
    // Search 1: Fresh Search
    console.log("--- CALL 1: Fresh Search #1 ---");
    const call1 = await sendSearch({ query: "developer", location: "Bengaluru" });
    console.log(`Status: ${call1.status}`);
    console.log(`Cached: ${call1.data?.cached}`);
    console.log(`Remaining (body): ${call1.data?.remaining}, Header: ${call1.remainingHeader}`);
    console.log(`Daily Limit: ${call1.data?.dailyLimit}, Header: ${call1.limitHeader}`);
    const usageCount1 = await JobSearchUsage.countDocuments({ userId: testUser._id });
    console.log(`DB JobSearchUsage count: ${usageCount1}`);
    if (call1.status !== 200 || call1.data?.remaining !== 4 || usageCount1 !== 1) {
      throw new Error(`Call 1 assertion failed! Status=${call1.status}, remaining=${call1.data?.remaining}, count=${usageCount1}`);
    }
    console.log("[PASS] Call 1 consumed 1 quota slot (remaining = 4).\n");

    // Search 2: CACHE HIT (Same parameters)
    console.log("--- CALL 2: Repeated Search #1 (CACHE HIT) ---");
    const call2 = await sendSearch({ query: "developer", location: "Bengaluru" });
    console.log(`Status: ${call2.status}`);
    console.log(`Cached: ${call2.data?.cached}`);
    console.log(`Remaining: ${call2.data?.remaining}`);
    const usageCount2 = await JobSearchUsage.countDocuments({ userId: testUser._id });
    console.log(`DB JobSearchUsage count: ${usageCount2}`);
    if (call2.status !== 200 || !call2.data?.cached || call2.data?.remaining !== 4 || usageCount2 !== 1) {
      throw new Error(`Call 2 assertion failed! Status=${call2.status}, cached=${call2.data?.cached}, remaining=${call2.data?.remaining}, count=${usageCount2}`);
    }
    console.log("[PASS] Call 2 was a cache hit and did NOT consume quota (count remains 1, remaining = 4).\n");

    // Search 3: Fresh Search #2
    console.log("--- CALL 3: Fresh Search #2 (different query) ---");
    const call3 = await sendSearch({ query: "frontend", location: "Mumbai" });
    console.log(`Status: ${call3.status}`);
    console.log(`Cached: ${call3.data?.cached}`);
    console.log(`Remaining: ${call3.data?.remaining}`);
    const usageCount3 = await JobSearchUsage.countDocuments({ userId: testUser._id });
    console.log(`DB JobSearchUsage count: ${usageCount3}`);
    if (call3.status !== 200 || call3.data?.remaining !== 3 || usageCount3 !== 2) {
      throw new Error(`Call 3 assertion failed! Status=${call3.status}, remaining=${call3.data?.remaining}, count=${usageCount3}`);
    }
    console.log("[PASS] Call 3 consumed 1 quota slot (remaining = 3).\n");

    // Search 4: Fresh Search #3
    console.log("--- CALL 4: Fresh Search #3 ---");
    const call4 = await sendSearch({ query: "backend", location: "Delhi" });
    console.log(`Status: ${call4.status}`);
    console.log(`Remaining: ${call4.data?.remaining}`);
    const usageCount4 = await JobSearchUsage.countDocuments({ userId: testUser._id });
    console.log(`DB JobSearchUsage count: ${usageCount4}`);
    if (call4.status !== 200 || call4.data?.remaining !== 2 || usageCount4 !== 3) {
      throw new Error(`Call 4 assertion failed!`);
    }
    console.log("[PASS] Call 4 consumed 1 quota slot (remaining = 2).\n");

    // Search 5: Fresh Search #4
    console.log("--- CALL 5: Fresh Search #4 ---");
    const call5 = await sendSearch({ query: "react engineer", location: "Hyderabad" });
    console.log(`Status: ${call5.status}`);
    console.log(`Remaining: ${call5.data?.remaining}`);
    const usageCount5 = await JobSearchUsage.countDocuments({ userId: testUser._id });
    console.log(`DB JobSearchUsage count: ${usageCount5}`);
    if (call5.status !== 200 || call5.data?.remaining !== 1 || usageCount5 !== 4) {
      throw new Error(`Call 5 assertion failed!`);
    }
    console.log("[PASS] Call 5 consumed 1 quota slot (remaining = 1).\n");

    // Search 6: Fresh Search #5 (5th and final allowed search)
    console.log("--- CALL 6: Fresh Search #5 (Final allowed quota slot) ---");
    const call6 = await sendSearch({ query: "full stack engineer", location: "Pune" });
    console.log(`Status: ${call6.status}`);
    console.log(`Remaining: ${call6.data?.remaining}`);
    const usageCount6 = await JobSearchUsage.countDocuments({ userId: testUser._id });
    console.log(`DB JobSearchUsage count: ${usageCount6}`);
    if (call6.status !== 200 || call6.data?.remaining !== 0 || usageCount6 !== 5) {
      throw new Error(`Call 6 assertion failed!`);
    }
    console.log("[PASS] Call 6 consumed 5th quota slot (remaining = 0).\n");

    // Search 7: 6th Fresh Search -> Must return 429!
    console.log("--- CALL 7: 6th Search (Limit Exceeded) ---");
    const call7 = await sendSearch({ query: "devops", location: "Chennai" });
    console.log(`Status: ${call7.status} (Expected: 429)`);
    console.log("429 Response Body:", JSON.stringify(call7.data, null, 2));
    console.log(`X-Searches-Remaining header: ${call7.remainingHeader}`);
    console.log(`X-Searches-Limit header: ${call7.limitHeader}`);

    if (call7.status !== 429) {
      throw new Error(`Expected 429 but got ${call7.status}`);
    }
    if (call7.data?.remaining !== 0) {
      throw new Error(`Expected remaining = 0 in 429 response`);
    }
    if (call7.data?.limit !== 5) {
      throw new Error(`Expected limit = 5 in 429 response`);
    }
    if (!call7.data?.resetAt) {
      throw new Error(`Expected resetAt date in 429 response`);
    }
    console.log("[PASS] Call 7 successfully blocked by dailySearchLimit middleware with 429!\n");

    console.log("=======================================================");
    console.log(" ALL TESTS PASSED SUCCESSFULLY!");
    console.log("=======================================================\n");
  } finally {
    // Cleanup
    console.log("Cleaning up test artifacts...");
    await JobSearchUsage.deleteMany({ userId: testUser._id });
    await JobSearchCache.deleteMany({ userId: testUser._id });
    await Resume.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    console.log("Cleanup complete.");
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

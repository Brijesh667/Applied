import assert from "assert";
import {
  stripHtml,
  cleanUrl,
  calculatePay,
  normalizeAdzunaJob,
  normalizeJSearchJob,
  normalizeJobs,
} from "../src/services/jobs/normalize.js";
import {
  normalizeApplyUrlKey,
  normalizeTextKey,
  isBetterJob,
  dedupeJobs,
} from "../src/services/jobs/dedupe.js";
import {
  buildQueries,
  QueryBuilderError,
} from "../src/services/jobs/queryBuilder.js";
import { computeProfileHash } from "../src/models/JobSearchCache.js";

let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failedCount++;
    console.error(`[FAIL] ${name} - ${err.message}`);
  }
}

console.log("======================================================");
console.log(" Running Job Search Offline Self-Tests (No Network/Keys)");
console.log("======================================================\n");

// ---------------------------------------------------------------------------
// 1. Normalize tests
// ---------------------------------------------------------------------------
test("1.1 stripHtml removes tags, decodes entities, and collapses spaces", () => {
  const input = "<p>Senior &amp; Lead &lt;Dev&gt; at &#39;Acme&#39; &quot;Corp&quot;&nbsp;&nbsp;</p>";
  const output = stripHtml(input);
  assert.strictEqual(output, "Senior & Lead <Dev> at 'Acme' \"Corp\"");
});

test("1.2 cleanUrl accepts valid http/https <= 500 chars, rejects invalid", () => {
  assert.strictEqual(
    cleanUrl("https://example.com/jobs/123"),
    "https://example.com/jobs/123"
  );
  assert.strictEqual(cleanUrl("javascript:alert(1)"), null);
  assert.strictEqual(cleanUrl("ftp://example.com/file"), null);
  assert.strictEqual(cleanUrl("not a url"), null);
  assert.strictEqual(cleanUrl(null), null);
  assert.strictEqual(cleanUrl("https://" + "a".repeat(501)), null);
});

test("1.3 calculatePay handles INR midpoint, non-INR, invalid periods, and pay caps", () => {
  // Valid INR yearly midpoint
  const pay1 = calculatePay(600000, 800000, "yearly", true);
  assert.deepStrictEqual(pay1, {
    pay: { type: "yearly", amount: 700000 },
    payMin: 600000,
    payMax: 800000,
  });

  // Valid INR monthly single bound
  const pay2 = calculatePay(50000, null, "monthly", true);
  assert.deepStrictEqual(pay2, {
    pay: { type: "monthly", amount: 50000 },
    payMin: 50000,
    payMax: null,
  });

  // Non-INR currency returns null pay
  const pay3 = calculatePay(100000, 120000, "yearly", false);
  assert.deepStrictEqual(pay3, {
    pay: null,
    payMin: null,
    payMax: null,
  });

  // Amount exceeds 10,000,000 cap
  const pay4 = calculatePay(15000000, 20000000, "yearly", true);
  assert.deepStrictEqual(pay4, {
    pay: null,
    payMin: 15000000,
    payMax: 20000000,
  });
});

test("1.4 normalizeAdzunaJob maps fields correctly and sets platform Adzuna", () => {
  const raw = {
    id: "adzuna-101",
    title: "<b>Frontend Engineer</b>",
    company: { display_name: "Tech Corp &amp; Co" },
    location: { display_name: "Bengaluru, Karnataka" },
    description: "Looking for a <i>React</i> developer with remote option.",
    redirect_url: "https://adzuna.com/land/101?source=test",
    created: new Date().toISOString(),
    salary_min: 500000,
    salary_max: 700000,
    contract_time: "full_time",
  };

  const job = normalizeAdzunaJob(raw);
  assert.ok(job);
  assert.strictEqual(job.source, "adzuna");
  assert.strictEqual(job.platform, "Adzuna");
  assert.strictEqual(job.title, "Frontend Engineer");
  assert.strictEqual(job.company, "Tech Corp & Co");
  assert.strictEqual(job.location, "Bengaluru, Karnataka");
  assert.strictEqual(job.remote, true);
  assert.strictEqual(job.employmentType, "full-time");
  assert.deepStrictEqual(job.pay, { type: "yearly", amount: 600000 });
});

test("1.5 normalizeJSearchJob maps fields, handles publisher as platform, and period mapping", () => {
  const raw = {
    job_id: "js-202",
    job_title: "Backend Developer",
    employer_name: "FinTech India",
    job_city: "Mumbai",
    job_state: "MH",
    job_country: "IN",
    job_description: "Build Node.js APIs.",
    job_apply_link: "https://linkedin.com/jobs/view/202",
    job_publisher: "LinkedIn",
    job_posted_at_datetime_utc: new Date().toISOString(),
    job_min_salary: 40000,
    job_max_salary: 60000,
    job_salary_period: "MONTH",
    job_salary_currency: "INR",
    job_is_remote: false,
    job_employment_type: "FULLTIME",
  };

  const job = normalizeJSearchJob(raw);
  assert.ok(job);
  assert.strictEqual(job.source, "jsearch");
  assert.strictEqual(job.platform, "LinkedIn");
  assert.strictEqual(job.title, "Backend Developer");
  assert.strictEqual(job.company, "FinTech India");
  assert.strictEqual(job.location, "Mumbai, MH, IN");
  assert.strictEqual(job.remote, false);
  assert.strictEqual(job.employmentType, "full-time");
  assert.deepStrictEqual(job.pay, { type: "monthly", amount: 50000 });
});

test("1.6 Normalization drops invalid jobs (missing title, company, bad url, or > 60 days old)", () => {
  const sixtyFiveDaysAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString();

  // Missing title
  assert.strictEqual(
    normalizeAdzunaJob({ id: "1", redirect_url: "https://example.com", company: { display_name: "Acme" } }),
    null
  );
  // Missing company
  assert.strictEqual(
    normalizeAdzunaJob({ id: "2", title: "Dev", redirect_url: "https://example.com" }),
    null
  );
  // Bad url
  assert.strictEqual(
    normalizeAdzunaJob({ id: "3", title: "Dev", company: { display_name: "Acme" }, redirect_url: "ftp://bad" }),
    null
  );
  // Expired date
  assert.strictEqual(
    normalizeAdzunaJob({
      id: "4",
      title: "Dev",
      company: { display_name: "Acme" },
      redirect_url: "https://example.com/4",
      created: sixtyFiveDaysAgo,
    }),
    null
  );
});

// ---------------------------------------------------------------------------
// 2. Deduplication tests
// ---------------------------------------------------------------------------
test("2.1 normalizeApplyUrlKey strips query string, fragments, and trailing slashes", () => {
  const url1 = "https://example.com/jobs/123?ref=feed&utm=ads#section";
  const url2 = "https://EXAMPLE.COM/jobs/123/";
  assert.strictEqual(normalizeApplyUrlKey(url1), "https://example.com/jobs/123");
  assert.strictEqual(normalizeApplyUrlKey(url2), "https://example.com/jobs/123");
  assert.strictEqual(normalizeApplyUrlKey(url1), normalizeApplyUrlKey(url2));
});

test("2.2 normalizeTextKey strips punctuation, spaces, and normalizes case", () => {
  const key1 = normalizeTextKey("Google, Inc.", "Software Engineer (L4)", "Bengaluru, India");
  const key2 = normalizeTextKey("Google Inc", "Software Engineer L4", "Bengaluru India");
  assert.strictEqual(key1, key2);
});

test("2.3 isBetterJob prefers jobs with pay, then longer snippet, then newer postedAt", () => {
  const base = {
    id: "1",
    pay: null,
    snippet: "short",
    postedAt: "2026-11-01T00:00:00.000Z",
  };
  const withPay = {
    ...base,
    id: "2",
    pay: { type: "yearly", amount: 600000 },
  };
  const longerSnippet = {
    ...base,
    id: "3",
    snippet: "a much longer descriptive snippet about the responsibilities",
  };
  const newerDate = {
    ...base,
    id: "4",
    postedAt: "2026-11-05T00:00:00.000Z",
  };

  // withPay vs base
  assert.strictEqual(isBetterJob(withPay, base), true);
  assert.strictEqual(isBetterJob(base, withPay), false);

  // longer snippet vs short snippet (both no pay)
  assert.strictEqual(isBetterJob(longerSnippet, base), true);
  assert.strictEqual(isBetterJob(base, longerSnippet), false);

  // newer date vs older date (both same snippet length & no pay)
  assert.strictEqual(isBetterJob(newerDate, base), true);
  assert.strictEqual(isBetterJob(base, newerDate), false);
});

test("2.4 dedupeJobs removes duplicates by URL and by text key, sorting by date descending", () => {
  const jobA1 = {
    id: "adzuna:1",
    source: "adzuna",
    platform: "Adzuna",
    title: "React Developer",
    company: "Meta",
    location: "Hyderabad",
    applyUrl: "https://meta.com/careers/123?source=adzuna",
    snippet: "Short",
    pay: null,
    postedAt: "2026-11-01T00:00:00.000Z",
  };
  const jobA2 = {
    id: "jsearch:1",
    source: "jsearch",
    platform: "LinkedIn",
    title: "React Developer",
    company: "Meta",
    location: "Hyderabad",
    applyUrl: "https://meta.com/careers/123?source=linkedin",
    snippet: "Longer snippet from LinkedIn with more requirements",
    pay: { type: "yearly", amount: 1200000 },
    postedAt: "2026-11-02T00:00:00.000Z",
  };
  const jobB = {
    id: "adzuna:2",
    source: "adzuna",
    platform: "Adzuna",
    title: "DevOps Engineer",
    company: "Cloud Corp",
    location: "Pune",
    applyUrl: "https://cloudcorp.com/apply/456",
    snippet: "Kubernetes and Terraform",
    pay: null,
    postedAt: "2026-11-06T00:00:00.000Z",
  };

  const deduped = dedupeJobs([jobA1, jobA2, jobB]);
  // jobA1 and jobA2 have the same base URL (meta.com/careers/123). jobA2 has pay, so it must win.
  assert.strictEqual(deduped.length, 2);
  assert.strictEqual(deduped[0].id, "adzuna:2"); // newer date (Nov 6)
  assert.strictEqual(deduped[1].id, "jsearch:1"); // won deduplication over jobA1
  assert.strictEqual(deduped[1].pay?.amount, 1200000);
});

// ---------------------------------------------------------------------------
// 3. Query builder tests
// ---------------------------------------------------------------------------
test("3.1 buildQueries creates intern/fresher variant for student/fresher", () => {
  const resume = {
    roleTitles: ["Full-Stack Developer", "Software Engineer"],
    skills: ["React", "Node.js"],
    experienceYears: 0,
    locationPreference: "Bengaluru",
  };

  const queries = buildQueries(resume);
  assert.strictEqual(queries.length, 2);
  assert.strictEqual(queries[0].what, "Full-Stack Developer intern");
  assert.strictEqual(queries[0].where, "Bengaluru");
  assert.strictEqual(queries[0].level, "fresher");
  assert.strictEqual(queries[1].what, "Software Engineer");
});

test("3.2 buildQueries keeps exact role for experienced user", () => {
  const resume = {
    roleTitles: ["Senior Backend Engineer", "Lead Developer"],
    skills: ["Go", "Kubernetes"],
    experienceYears: 5,
    locationPreference: "Mumbai",
  };

  const queries = buildQueries(resume);
  assert.strictEqual(queries.length, 2);
  assert.strictEqual(queries[0].what, "Senior Backend Engineer");
  assert.strictEqual(queries[0].level, "experienced");
  assert.strictEqual(queries[0].where, "Mumbai");
});

test("3.3 buildQueries handles remote flag and clears location string", () => {
  const resume = {
    roleTitles: ["Frontend Engineer"],
    skills: ["Vue"],
    experienceYears: 2,
    locationPreference: "Remote - India",
  };

  const queries = buildQueries(resume);
  assert.strictEqual(queries[0].isRemote, true);
  assert.strictEqual(queries[0].where, "");
});

test("3.4 buildQueries falls back to top skills when roleTitles is empty", () => {
  const resume = {
    roleTitles: [],
    skills: ["Python", "Django", "PostgreSQL", "Docker"],
    experienceYears: 1,
    locationPreference: "",
  };

  const queries = buildQueries(resume);
  assert.strictEqual(queries.length, 1);
  assert.strictEqual(queries[0].what, "Python Django PostgreSQL");
});

test("3.5 buildQueries throws 400 QueryBuilderError if both roles and skills are empty", () => {
  const resume = {
    roleTitles: [],
    skills: [],
    experienceYears: 0,
  };

  assert.throws(
    () => buildQueries(resume),
    (err) => {
      return (
        err instanceof QueryBuilderError &&
        err.status === 400 &&
        err.message === "Add skills or role titles to this resume first"
      );
    }
  );
});

// ---------------------------------------------------------------------------
// 4. Cache profile hash test
// ---------------------------------------------------------------------------
test("4.1 computeProfileHash is deterministic and changes when resume profile changes", () => {
  const resume1 = {
    roleTitles: ["Backend Engineer", "DevOps"],
    skills: ["Go", "Docker"],
    experienceYears: 2,
    locationPreference: "Remote",
  };
  const resume2 = {
    roleTitles: ["DevOps", "Backend Engineer"], // reversed order
    skills: ["Docker", "Go"], // reversed order
    experienceYears: 2,
    locationPreference: "Remote",
  };
  const resume3 = {
    ...resume1,
    experienceYears: 3, // edited
  };

  const hash1 = computeProfileHash(resume1);
  const hash2 = computeProfileHash(resume2);
  const hash3 = computeProfileHash(resume3);

  // Sorting roles & skills ensures hash1 === hash2
  assert.strictEqual(hash1, hash2);
  // Changing experience changes hash
  assert.notStrictEqual(hash1, hash3);
});

console.log("\n======================================================");
console.log(` Self-Test Summary: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("======================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

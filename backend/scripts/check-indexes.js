import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("ERROR: MONGO_URI environment variable is required to check indexes.");
  process.exit(1);
}

// Expected index patterns
const EXPECTED = {
  users: [
    {
      description: "Unique email index",
      matches: (idx) => idx.key?.email === 1 && idx.unique === true,
    },
  ],
  applications: [
    {
      description: "{ userId: 1, appliedDate: -1 }",
      matches: (idx) => idx.key?.userId === 1 && idx.key?.appliedDate === -1,
    },
    {
      description: "{ userId: 1, companyName: 1 }",
      matches: (idx) => idx.key?.userId === 1 && idx.key?.companyName === 1,
    },
    {
      description: "{ userId: 1, status: 1 }",
      matches: (idx) => idx.key?.userId === 1 && idx.key?.status === 1,
    },
  ],
  resumes: [
    {
      description: "{ userId: 1, createdAt: -1 }",
      matches: (idx) => idx.key?.userId === 1 && idx.key?.createdAt === -1,
    },
    {
      description: "{ userId: 1 } unique partial (isDefault: true)",
      matches: (idx) =>
        idx.key?.userId === 1 &&
        idx.unique === true &&
        Boolean(idx.partialFilterExpression?.isDefault),
    },
  ],
  jobsearchcaches: [
    {
      description: "Unique { userId: 1, resumeId: 1, searchHash: 1 }",
      matches: (idx) =>
        idx.key?.userId === 1 &&
        idx.key?.resumeId === 1 &&
        idx.key?.searchHash === 1 &&
        idx.unique === true,
    },
    {
      description: "TTL index on createdAt (expireAfterSeconds)",
      matches: (idx) =>
        idx.key?.createdAt === 1 &&
        typeof idx.expireAfterSeconds === "number" &&
        idx.expireAfterSeconds > 0,
    },
  ],
  sessions: [
    {
      description: "TTL index on expires",
      matches: (idx) =>
        (idx.key?.expires === 1 || idx.key?.["expires"] === 1) &&
        typeof idx.expireAfterSeconds === "number",
    },
  ],
};

async function checkIndexes() {
  console.log("Connecting to MongoDB in READ-ONLY mode...\n");

  try {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;

    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name.toLowerCase());

    console.log(`Found collections in database: ${collectionNames.join(", ")}\n`);

    let allExpectedPresent = true;

    for (const [targetColl, expectedRules] of Object.entries(EXPECTED)) {
      console.log(`------------------------------------------------------`);
      console.log(`Collection: ${targetColl}`);

      // Check if collection exists
      const actualName = collections.find(
        (c) => c.name.toLowerCase() === targetColl
      )?.name;

      if (!actualName) {
        console.log(`  [NOTE] Collection '${targetColl}' does not exist yet.`);
        allExpectedPresent = false;
        continue;
      }

      const rawIndexes = await db.collection(actualName).indexes();
      console.log(`  Existing indexes (${rawIndexes.length}):`);
      for (const idx of rawIndexes) {
        const keyDesc = JSON.stringify(idx.key);
        const flags = [];
        if (idx.unique) flags.push("unique");
        if (idx.expireAfterSeconds !== undefined)
          flags.push(`TTL: ${idx.expireAfterSeconds}s`);
        if (idx.partialFilterExpression)
          flags.push(`partial: ${JSON.stringify(idx.partialFilterExpression)}`);
        const flagStr = flags.length > 0 ? ` (${flags.join(", ")})` : "";
        console.log(`    - ${idx.name}: ${keyDesc}${flagStr}`);
      }

      console.log(`  Expected checks:`);
      for (const rule of expectedRules) {
        const found = rawIndexes.find(rule.matches);
        if (found) {
          console.log(`    [PASS] ${rule.description} (found as '${found.name}')`);
        } else {
          console.log(`    [MISSING] ${rule.description}`);
          allExpectedPresent = false;
        }
      }
    }

    console.log(`------------------------------------------------------\n`);
    if (allExpectedPresent) {
      console.log("Status: ALL expected indexes are present.");
    } else {
      console.log("Status: Some expected indexes are missing or pending model initialization.");
    }
  } catch (err) {
    console.error("Index check failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

checkIndexes();

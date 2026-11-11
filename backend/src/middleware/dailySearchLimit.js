import JobSearchUsage from "../models/JobSearchUsage.js";
import config from "../config/env.js";

/**
 * Race Condition Avoidance Approach:
 * When multiple parallel search requests arrive simultaneously for the same user,
 * checking only the database records would allow concurrent requests to all see count < limit
 * before any record is inserted in the controller.
 *
 * To prevent limit bypass without prematurely inserting records before cache-hit/validation:
 * 1. An in-memory Map `inFlightSearches` tracks how many active search requests are currently
 *    executing for each user ID.
 * 2. In this middleware, effective usage is computed as:
 *       totalActive = recordedDbCount + inFlightCount
 * 3. If totalActive >= limit, the request is immediately rejected with 429.
 * 4. If totalActive < limit, inFlightCount is incremented, and an event listener on
 *    res 'finish' / 'close' decrements it once the HTTP lifecycle completes (whether success,
 *    cache hit, provider failure, or error).
 * 5. In the controller, a final double-check ensures that even across clustered instances,
 *    records cannot exceed the configured limit.
 */
const inFlightSearches = new Map();

export async function dailySearchLimit(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userIdStr = String(userId);
    const limit = config.jobSearchDailyLimit || 5;
    const windowMs = config.jobSearchDailyWindowMs || 24 * 60 * 60 * 1000;
    const windowStart = new Date(Date.now() - windowMs);

    // Fetch all records in current rolling 24h window (sorted oldest first)
    const recentUsage = await JobSearchUsage.find({
      userId,
      createdAt: { $gte: windowStart },
    }).sort({ createdAt: 1 });

    const recordedCount = recentUsage.length;
    const inFlight = inFlightSearches.get(userIdStr) || 0;
    const totalActive = recordedCount + inFlight;

    if (totalActive >= limit) {
      // Oldest entry determines when the first search resets/expires
      const oldestDate = recentUsage[0]?.createdAt || windowStart;
      const resetAt = new Date(oldestDate.getTime() + windowMs).toISOString();

      res.set(
        "Retry-After",
        String(
          Math.max(
            1,
            Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000)
          )
        )
      );
      res.set("X-Searches-Remaining", "0");
      res.set("X-Searches-Limit", String(limit));
      res.set("X-Searches-Reset", resetAt);

      return res.status(429).json({
        message: `You have reached your daily limit of ${limit} job searches. Please try again later.`,
        resetAt,
        remaining: 0,
        limit,
      });
    }

    // Register this in-flight request to prevent parallel requests from bypassing quota
    inFlightSearches.set(userIdStr, inFlight + 1);

    let released = false;
    const releaseInFlight = () => {
      if (released) return;
      released = true;
      const current = inFlightSearches.get(userIdStr) || 1;
      if (current <= 1) {
        inFlightSearches.delete(userIdStr);
      } else {
        inFlightSearches.set(userIdStr, current - 1);
      }
    };

    res.once("finish", releaseInFlight);
    res.once("close", releaseInFlight);

    // Pass quota metadata downstream
    req.jobSearchQuota = {
      limit,
      windowMs,
      windowStart,
      recordedCount,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export default dailySearchLimit;

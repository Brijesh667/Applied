import mongoose from "mongoose";
import Application from "../models/Application.js";
import { STATUSES, REPLY_TYPES } from "../config/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getStats = asyncHandler(async (req, res) => {
  const userObjectId = new mongoose.Types.ObjectId(req.session.userId);
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [statsResult] = await Application.aggregate([
    {
      $match: {
        userId: userObjectId,
      },
    },
    {
      $facet: {
        overview: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              replied: {
                $sum: {
                  $cond: [
                    { $gt: [{ $size: { $ifNull: ["$replies", []] } }, 0] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        statusCounts: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ],
        repliesByType: [
          { $unwind: "$replies" },
          {
            $group: {
              _id: "$replies.type",
              count: { $sum: 1 },
            },
          },
        ],
        platforms: [
          {
            $group: {
              _id: { $toLower: { $trim: { input: "$appliedFrom" } } },
              platform: { $first: "$appliedFrom" },
              total: { $sum: 1 },
              replied: {
                $sum: {
                  $cond: [
                    { $gt: [{ $size: { $ifNull: ["$replies", []] } }, 0] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        pendingDeadlines: [
          {
            $match: {
              status: { $ne: "rejected" },
            },
          },
          { $unwind: "$replies" },
          {
            $match: {
              "replies.completed": false,
              "replies.deadline": { $ne: null },
            },
          },
          {
            $sort: { "replies.deadline": 1 },
          },
          {
            $project: {
              _id: 0,
              applicationId: "$_id",
              replyId: "$replies._id",
              companyName: "$companyName",
              role: "$role",
              type: "$replies.type",
              deadline: "$replies.deadline",
            },
          },
        ],
      },
    },
  ]);

  const overview = statsResult?.overview?.[0] || { total: 0, replied: 0 };
  const total = overview.total;
  const replied = overview.replied;
  const noReply = total - replied;
  const replyRate =
    total === 0 ? 0 : Number(((replied / total) * 100).toFixed(1));

  // Initialize all statuses with 0
  const byStatus = {};
  for (const status of STATUSES) {
    byStatus[status] = 0;
  }
  for (const item of statsResult?.statusCounts || []) {
    if (item._id in byStatus) {
      byStatus[item._id] = item.count;
    }
  }

  // Initialize all reply types with 0
  const repliesByType = {};
  for (const type of REPLY_TYPES) {
    repliesByType[type] = 0;
  }
  for (const item of statsResult?.repliesByType || []) {
    if (item._id in repliesByType) {
      repliesByType[item._id] = item.count;
    }
  }

  // Calculate deadlines and attention items
  const pendingReplies = statsResult?.pendingDeadlines || [];
  let overdue = 0;
  let dueSoon = 0;
  const attentionItems = [];

  for (const item of pendingReplies) {
    const deadlineDate = new Date(item.deadline);
    if (deadlineDate < now) {
      overdue++;
      attentionItems.push(item);
    } else if (deadlineDate <= sevenDaysLater) {
      dueSoon++;
      attentionItems.push(item);
    }
  }

  const attentionTotal = attentionItems.length;
  const attention = attentionItems.slice(0, 10).map((item) => ({
    applicationId: String(item.applicationId),
    replyId: String(item.replyId),
    companyName: item.companyName,
    role: item.role,
    type: item.type,
    deadline: item.deadline,
  }));

  // Format platforms and sort by total desc, then platform asc
  const formattedPlatforms = (statsResult?.platforms || []).map((p) => {
    const platformTotal = p.total;
    const platformReplied = p.replied;
    const rate =
      platformTotal === 0
        ? 0
        : Number(((platformReplied / platformTotal) * 100).toFixed(1));
    return {
      platform: p.platform,
      total: platformTotal,
      replied: platformReplied,
      replyRate: rate,
    };
  });

  formattedPlatforms.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.platform.localeCompare(b.platform);
  });

  res.status(200).json({
    total,
    replied,
    noReply,
    replyRate,
    byStatus,
    repliesByType,
    deadlines: {
      pending: pendingReplies.length,
      overdue,
      dueSoon,
    },
    byPlatform: formattedPlatforms,
    attention,
    attentionTotal,
  });
});

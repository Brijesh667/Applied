import mongoose from "mongoose";
import Application from "../models/Application.js";
import { LIMITS } from "../config/constants.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { escapeRegex } from "../utils/escapeRegex.js";

export const createApplication = asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const application = await Application.create({
    ...req.body,
    userId,
  });
  return res.status(201).json({ application });
});

export const getApplications = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    appliedFrom,
    replied,
    sort,
    due,
    dueFrom,
    dueTo,
    page = 1,
    limit = LIMITS.pageSize,
  } = req.validatedQuery;
  const userId = new mongoose.Types.ObjectId(req.session.userId);
  const now = new Date();

  const hasDeadlineFilter = Boolean(due || (dueFrom && dueTo));
  const effectiveSort = sort || (hasDeadlineFilter ? "deadline" : "latest");

  const matchQuery = { userId };

  if (search) {
    matchQuery.companyName = { $regex: escapeRegex(search), $options: "i" };
  }

  if (hasDeadlineFilter) {
    if (status) {
      if (status === "rejected") {
        matchQuery.status = { $in: [] };
      } else {
        matchQuery.status = status;
      }
    } else {
      matchQuery.status = { $ne: "rejected" };
    }

    if (due === "missed") {
      matchQuery.replies = {
        $elemMatch: {
          completed: false,
          deadline: { $ne: null, $lt: now },
        },
      };
    } else if (dueFrom && dueTo) {
      matchQuery.replies = {
        $elemMatch: {
          completed: false,
          deadline: { $ne: null, $gte: dueFrom, $lt: dueTo },
        },
      };
    }
  } else if (status) {
    matchQuery.status = status;
  }

  if (appliedFrom) {
    matchQuery.appliedFrom = {
      $regex: "^" + escapeRegex(appliedFrom) + "$",
      $options: "i",
    };
  }

  if (replied === true) {
    matchQuery["replies.0"] = { $exists: true };
  } else if (replied === false) {
    matchQuery["replies.0"] = { $exists: false };
  }

  // Reply filter condition for nextDeadline & nextDeadlineReplyId
  let replyFilterCond;
  if (due === "missed") {
    replyFilterCond = {
      $and: [
        { $eq: ["$$r.completed", false] },
        { $ne: ["$$r.deadline", null] },
        { $lt: ["$$r.deadline", now] },
      ],
    };
  } else if (dueFrom && dueTo) {
    replyFilterCond = {
      $and: [
        { $eq: ["$$r.completed", false] },
        { $ne: ["$$r.deadline", null] },
        { $gte: ["$$r.deadline", dueFrom] },
        { $lt: ["$$r.deadline", dueTo] },
      ],
    };
  } else {
    replyFilterCond = {
      $and: [
        { $eq: ["$$r.completed", false] },
        { $ne: ["$$r.deadline", null] },
      ],
    };
  }

  const pipeline = [
    { $match: matchQuery },
    {
      $addFields: {
        targetReply: {
          $reduce: {
            input: {
              $filter: {
                input: "$replies",
                as: "r",
                cond: replyFilterCond,
              },
            },
            initialValue: null,
            in: {
              $cond: [
                { $eq: ["$$value", null] },
                "$$this",
                {
                  $cond: [
                    { $lt: ["$$this.deadline", "$$value.deadline"] },
                    "$$this",
                    "$$value",
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        nextDeadline: { $ifNull: ["$targetReply.deadline", null] },
        nextDeadlineReplyId: { $ifNull: ["$targetReply._id", null] },
      },
    },
  ];

  if (effectiveSort === "oldest") {
    pipeline.push({
      $sort: { appliedDate: 1, _id: 1 },
    });
  } else if (effectiveSort === "deadline") {
    pipeline.push(
      {
        $addFields: {
          noDeadline: {
            $cond: [{ $eq: ["$nextDeadline", null] }, 1, 0],
          },
        },
      },
      {
        $sort: {
          noDeadline: 1,
          nextDeadline: 1,
          appliedDate: -1,
          _id: -1,
        },
      }
    );
  } else {
    // Default: "latest"
    pipeline.push({
      $sort: { appliedDate: -1, _id: -1 },
    });
  }

  const skip = (page - 1) * limit;

  pipeline.push({
    $facet: {
      items: [
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            targetReply: 0,
            noDeadline: 0,
          },
        },
      ],
      total: [{ $count: "count" }],
    },
  });

  const [result] = await Application.aggregate(pipeline);

  const applications = result?.items || [];
  const total = result?.total?.[0]?.count || 0;
  const hasMore = page * limit < total;

  return res.status(200).json({
    applications,
    total,
    page,
    limit,
    hasMore,
  });
});

export const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }
  return res.status(200).json({ application });
});

export const updateApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  const application = await Application.findOne({ _id: id, userId });
  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }

  if (req.body.pay) {
    application.set("pay", req.body.pay);
  }

  const fields = { ...req.body };
  delete fields.pay;
  application.set(fields);

  await application.save();

  return res.status(200).json({ application });
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;
  const application = await Application.findOneAndDelete({ _id: id, userId });
  if (!application) {
    return res.status(404).json({ message: "Application not found" });
  }
  return res.status(200).json({ message: "Application deleted" });
});

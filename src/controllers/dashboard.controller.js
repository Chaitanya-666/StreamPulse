import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { executeChannelStatsAggregation } from "../pipelines/aggregatePipelines.js";

/**
 * ============================================================================
 * TODO: getChannelStats — Channel Analytics Rollup via $facet
 * ============================================================================
 * SPECIFICATION:
 * Compute channel analytics for the authenticated creator:
 * 1. Total videos uploaded.
 * 2. Total views accumulated across all videos.
 * 3. Total subscribers subscribed to this channel.
 * 4. Total likes received across all videos of this channel.
 *
 * ARCHITECTURE & OPTIMIZATION NOTES:
 * - What is `$facet`? Executes multiple aggregation pipelines within a single
 *   stage on the same input documents.
 * - Performance benefit: Drastically cuts down network latency vs running 4
 *   separate queries across the database connection pool.
 * - Memory considerations: $facet stages have a 100MB RAM limit unless `allowDiskUse`
 *   is enabled.
 * ============================================================================
 */
const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  // TODO: Construct custom aggregation pipeline or use executeChannelStatsAggregation helper:
  const channelStats = await executeChannelStatsAggregation(channelId);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelStats,
        "Channel statistics retrieved successfully"
      )
    );
});

/**
 * @desc Get all videos uploaded by the channel (creator studio view)
 * @route GET /api/v1/dashboard/videos
 * @access Private (verifyJWT)
 */
const getChannelVideos = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  const videos = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    { $project: { likes: 0 } },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new apiResponse(200, videos, "Channel videos retrieved successfully")
    );
});

export { getChannelStats, getChannelVideos };

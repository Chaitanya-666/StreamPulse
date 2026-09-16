import mongoose from "mongoose";

/**
 * ============================================================================
 * STREAMPULSE — HIGH-PERFORMANCE MONGO AGGREGATION PIPELINES
 * ============================================================================
 * Modular, optimized MongoDB aggregation builders for complex relations,
 * metric rollups, dynamic search filtering, and paginated graph traversal.
 */

/**
 * Pipeline: getAllVideos
 * - Filters by search query (case-insensitive regex on title/description) and optional userId
 * - Matches only published videos unless the owner is requesting their own videos
 * - Populates owner details (username, fullName, avatar)
 * - Sorts by specified field and direction
 * - Returns pipeline array ready for `Video.aggregatePaginate(Video.aggregate(pipeline), options)`
 */
export const buildGetAllVideosPipeline = ({
  query,
  userId,
  sortBy = "createdAt",
  sortType = "desc",
  requestingUserId,
}) => {
  const matchStage = {};

  // 1. Text / Regex search on title and description
  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // 2. Filter by specific uploader/owner if provided
  if (userId) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }

  // 3. Visibility rule: Only show published videos unless requesting own videos
  if (!userId || userId !== requestingUserId?.toString()) {
    matchStage.isPublished = true;
  }

  const pipeline = [
    { $match: matchStage },

    // Lookup owner details (project only safe public fields)
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },

    // Sort stage (1 for asc, -1 for desc)
    {
      $sort: {
        [sortBy]: sortType.toLowerCase() === "asc" ? 1 : -1,
      },
    },
  ];

  return pipeline;
};

/**
 * Pipeline: getVideoComments
 * - Filters comments for a target videoId
 * - Joins comment owner profile (username, fullName, avatar)
 * - Joins likes on each comment to calculate `likesCount`
 * - Adds a boolean `isLiked` indicating if the requestingUser liked the comment
 * - Sorts newest comments first
 */
export const buildGetVideoCommentsPipeline = (videoId, requestingUserId) => {
  const videoObjId = new mongoose.Types.ObjectId(videoId);
  const userObjId = requestingUserId
    ? new mongoose.Types.ObjectId(requestingUserId)
    : null;

  return [
    { $match: { video: videoObjId } },

    // 1. Lookup Comment Author
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },

    // 2. Lookup Likes for this comment
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },

    // 3. Project / AddFields for likesCount and isLiked
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [userObjId, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },

    // Discard raw likes array to minimize memory footprint & network transfer
    { $project: { likes: 0 } },

    // 4. Sort newest first
    { $sort: { createdAt: -1 } },
  ];
};

/**
 * Pipeline: getLikedVideos
 * - Matches likes made by the current user specifically for videos
 * - Joins the Video document
 * - Joins the Video's owner document
 * - Filters out unpublished videos if not owned by user
 */
export const buildGetLikedVideosPipeline = (userId) => {
  const userObjId = new mongoose.Types.ObjectId(userId);

  return [
    {
      $match: {
        likedBy: userObjId,
        video: { $exists: true, $ne: null },
      },
    },
    // Join Video
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          // Within Video, join owner details
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          { $unwind: "$owner" },
        ],
      },
    },
    { $unwind: "$video" },
    // Filter only published videos
    { $match: { "video.isPublished": true } },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        _id: 1,
        video: 1,
        createdAt: 1,
      },
    },
  ];
};

/**
 * Pipeline: getUserChannelSubscribers
 * - Finds who subscribed to `channelId` (subscribedTo: channelId)
 * - Populates subscriber user profile
 * - Adds dynamic `isSubscribed` flag: does the currently logged-in user ALSO subscribe to this subscriber?
 */
export const buildGetChannelSubscribersPipeline = (channelId, loggedInUserId) => {
  const channelObjId = new mongoose.Types.ObjectId(channelId);
  const loggedInObjId = loggedInUserId
    ? new mongoose.Types.ObjectId(loggedInUserId)
    : null;

  return [
    { $match: { subscribedTo: channelObjId } },
    // Join subscriber details
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$subscriber" },

    // Check if loggedInUser is subscribed to this subscriber
    {
      $lookup: {
        from: "subscriptions",
        let: { subscriberId: "$subscriber._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$subscriber", loggedInObjId] },
                  { $eq: ["$subscribedTo", "$$subscriberId"] },
                ],
              },
            },
          },
        ],
        as: "mutualSub",
      },
    },
    {
      $addFields: {
        "subscriber.isSubscribed": {
          $cond: {
            if: { $gt: [{ $size: "$mutualSub" }, 0] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        subscriber: 1,
        createdAt: 1,
      },
    },
  ];
};

/**
 * Pipeline: getSubscribedChannels
 * - Finds all channels that `subscriberId` subscribed to
 * - Populates channel profile and latest uploaded video
 */
export const buildGetSubscribedChannelsPipeline = (subscriberId) => {
  const subObjId = new mongoose.Types.ObjectId(subscriberId);

  return [
    { $match: { subscriber: subObjId } },
    // Join channel user details
    {
      $lookup: {
        from: "users",
        localField: "subscribedTo",
        foreignField: "_id",
        as: "subscribedChannel",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$subscribedChannel" },

    // Lookup latest video for this channel
    {
      $lookup: {
        from: "videos",
        let: { channelId: "$subscribedChannel._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$owner", "$$channelId"] },
                  { $eq: ["$isPublished", true] },
                ],
              },
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
          {
            $project: {
              title: 1,
              thumbnail: 1,
              duration: 1,
              views: 1,
              createdAt: 1,
            },
          },
        ],
        as: "latestVideo",
      },
    },
    {
      $addFields: {
        "subscribedChannel.latestVideo": {
          $arrayElemAt: ["$latestVideo", 0],
        },
      },
    },
    {
      $project: {
        _id: 1,
        subscribedChannel: 1,
        createdAt: 1,
      },
    },
  ];
};

/**
 * Pipeline: executeChannelStatsAggregation ($facet)
 * Computes in ONE single database call:
 * - totalVideos & totalViews (from videos collection)
 * - totalSubscribers (from subscriptions collection)
 * - totalLikes (from likes collection joining channel's videos)
 */
export const executeChannelStatsAggregation = async (channelId) => {
  const channelObjId = new mongoose.Types.ObjectId(channelId);

  const stats = await mongoose.model("Video").aggregate([
    { $match: { owner: channelObjId } },
    {
      $facet: {
        // Facet 1: Video totals and view sum
        videoStats: [
          {
            $group: {
              _id: null,
              totalVideos: { $sum: 1 },
              totalViews: { $sum: "$views" },
            },
          },
        ],
        // Facet 2: Total Likes across all videos of this owner
        likesStats: [
          {
            $lookup: {
              from: "likes",
              localField: "_id",
              foreignField: "video",
              as: "likes",
            },
          },
          { $unwind: { path: "$likes", preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: null,
              totalLikes: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  const totalSubscribers = await mongoose.model("Subscription").countDocuments({
    subscribedTo: channelObjId,
  });

  const videoData = stats[0]?.videoStats[0] || { totalVideos: 0, totalViews: 0 };
  const likesData = stats[0]?.likesStats[0] || { totalLikes: 0 };

  return {
    totalVideos: videoData.totalVideos || 0,
    totalViews: videoData.totalViews || 0,
    totalSubscribers,
    totalLikes: likesData.totalLikes || 0,
  };
};

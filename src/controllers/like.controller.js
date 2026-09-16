import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Post } from "../models/post.model.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildGetLikedVideosPipeline } from "../pipelines/aggregatePipelines.js";

/**
 * ============================================================================
 * TODO: getLikedVideos — Liked Media Aggregation Pipeline
 * ============================================================================
 * SPECIFICATION:
 * 1. Filter likes collection where `likedBy` is current user and `video` exists.
 * 2. Join `videos` collection to populate video details.
 * 3. Inside the video lookup, join `users` to fetch the video creator/owner profile.
 * 4. Filter out any unpublished videos.
 * 5. Sort newest likes first.
 *
 * ARCHITECTURE & OPTIMIZATION NOTES:
 * - Why Likes collection is designed with separate optional fields (video, comment, post)
 *   instead of a generic dynamic string reference (preserves Mongo referential integrity).
 * - Compound sparse unique indexes preventing race condition double-likes.
 * ============================================================================
 */
const getLikedVideos = asyncHandler(async (req, res) => {
  // TODO: Construct custom pipeline or use buildGetLikedVideosPipeline helper:
  const pipeline = buildGetLikedVideosPipeline(req.user._id);

  const likedVideos = await Like.aggregate(pipeline);

  return res
    .status(200)
    .json(
      new apiResponse(200, likedVideos, "Liked videos retrieved successfully")
    );
});

/**
 * @desc Toggle like on a video
 * @route POST /api/v1/likes/toggle/v/:videoId
 * @access Private (verifyJWT)
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video does not exist");
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: false }, "Video unliked successfully")
      );
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: true }, "Video liked successfully")
      );
  }
});

/**
 * @desc Toggle like on a comment
 * @route POST /api/v1/likes/toggle/c/:commentId
 * @access Private (verifyJWT)
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new apiError(400, {}, "Invalid commentId format");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new apiError(404, {}, "Comment does not exist");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: false }, "Comment unliked successfully")
      );
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: true }, "Comment liked successfully")
      );
  }
});

/**
 * @desc Toggle like on a post
 * @route POST /api/v1/likes/toggle/p/:postId
 * @access Private (verifyJWT)
 */
const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new apiError(400, {}, "Invalid postId format");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new apiError(404, {}, "Post does not exist");
  }

  const existingLike = await Like.findOne({
    post: postId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
    return res
      .status(200)
      .json(
        new apiResponse(200, { isLiked: false }, "Post unliked successfully")
      );
  } else {
    await Like.create({
      post: postId,
      likedBy: req.user._id,
    });
    return res
      .status(200)
      .json(new apiResponse(200, { isLiked: true }, "Post liked successfully"));
  }
});

export { toggleVideoLike, toggleCommentLike, togglePostLike, getLikedVideos };

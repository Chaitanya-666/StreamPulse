import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildGetVideoCommentsPipeline } from "../pipelines/aggregatePipelines.js";

/**
 * ============================================================================
 * TODO: getVideoComments — Paginated Video Comments Pipeline
 * ============================================================================
 * SPECIFICATION:
 * 1. Filter comments by video ID.
 * 2. Join owner profile (username, fullName, avatar).
 * 3. Join likes collection to compute:
 *    - `likesCount`: total likes on this comment
 *    - `isLiked`: boolean whether current requesting user liked this comment
 * 4. Sort newest first ({ createdAt: -1 }).
 * 5. Paginate using `Comment.aggregatePaginate(Comment.aggregate(pipeline), { page, limit })`.
 *
 * ARCHITECTURE & OPTIMIZATION NOTES:
 * - Difference between embedded comments array vs separate collection (16MB BSON doc limit!).
 * - Compound index on `{ video: 1, createdAt: -1 }` for high-speed retrieval.
 * - Using `$cond` and `$in` in `$addFields` for conditional boolean flags.
 * ============================================================================
 */
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video does not exist");
  }

  // TODO: Construct custom aggregation pipeline or use buildGetVideoCommentsPipeline:
  const pipeline = buildGetVideoCommentsPipeline(videoId, req.user?._id);

  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  };

  const comments = await Comment.aggregatePaginate(
    Comment.aggregate(pipeline),
    options
  );

  return res
    .status(200)
    .json(new apiResponse(200, comments, "Comments fetched successfully"));
});

/**
 * @desc Add a new comment to a video
 * @route POST /api/v1/comments/:videoId
 * @access Private (verifyJWT)
 */
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  if (!content || content.trim().length < 4) {
    throw new apiError(400, {}, "Comment must be at least 4 characters long");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video does not exist");
  }

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user._id,
  });

  const populatedComment = await Comment.findById(comment._id).populate(
    "owner",
    "username fullName avatar"
  );

  return res
    .status(201)
    .json(new apiResponse(201, populatedComment, "Comment added successfully"));
});

/**
 * @desc Update a comment
 * @route PATCH /api/v1/comments/c/:commentId
 * @access Private (verifyJWT)
 */
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new apiError(400, {}, "Invalid commentId format");
  }

  if (!content || content.trim().length < 4) {
    throw new apiError(400, {}, "Comment must be at least 4 characters long");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new apiError(404, {}, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You can only edit your own comment");
  }

  comment.content = content.trim();
  await comment.save();

  return res
    .status(200)
    .json(new apiResponse(200, comment, "Comment updated successfully"));
});

/**
 * @desc Delete a comment
 * @route DELETE /api/v1/comments/c/:commentId
 * @access Private (verifyJWT)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new apiError(400, {}, "Invalid commentId format");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new apiError(404, {}, "Comment not found");
  }

  // Either comment author OR video owner can delete the comment
  const video = await Video.findById(comment.video);
  const isCommentOwner = comment.owner.toString() === req.user._id.toString();
  const isVideoOwner =
    video && video.owner.toString() === req.user._id.toString();

  if (!isCommentOwner && !isVideoOwner) {
    throw new apiError(
      403,
      {},
      "You do not have permission to delete this comment"
    );
  }

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };

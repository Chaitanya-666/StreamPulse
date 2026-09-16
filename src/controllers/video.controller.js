import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { buildGetAllVideosPipeline } from "../pipelines/aggregatePipelines.js";

/**
 * ============================================================================
 * TODO: getAllVideos — Dynamic Video Querying & Pagination Pipeline
 * ============================================================================
 * SPECIFICATION:
 * 1. Filter videos by search query (case-insensitive regex on title/description).
 * 2. Filter by userId (if provided).
 * 3. Enforce visibility rule: Only published videos unless owner requests own.
 * 4. Populate owner details (username, fullName, avatar) without exposing password.
 * 5. Sort by `sortBy` field (default "createdAt") in `sortType` ("asc" or "desc").
 * 6. Paginate using `Video.aggregatePaginate(aggregationQuery, { page, limit })`.
 *
 * ARCHITECTURE & OPTIMIZATION NOTES:
 * - Why `$match` MUST be first stage: allows MongoDB to leverage B-tree indexes early.
 * - Difference between `$lookup` with simple `localField/foreignField` vs subpipeline.
 * - Why pagination using aggregate-paginate prevents Node.js memory exhaustion.
 * ============================================================================
 */
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  if (userId && !isValidObjectId(userId)) {
    throw new apiError(400, {}, "Invalid userId format");
  }

  // TODO: Implement custom pipeline array or use buildGetAllVideosPipeline helper:
  // Example scaffold:
  // const pipeline = [
  //   { $match: { ... } },
  //   { $lookup: { ... } },
  //   { $unwind: "$owner" },
  //   { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } }
  // ];

  // Using the reference pipeline builder:
  const pipeline = buildGetAllVideosPipeline({
    query: query.trim(),
    userId,
    sortBy,
    sortType,
    requestingUserId: req.user?._id,
  });

  const options = {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  };

  const videos = await Video.aggregatePaginate(
    Video.aggregate(pipeline),
    options
  );

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        videos,
        "Videos fetched successfully with pagination"
      )
    );
});

/**
 * @desc Publish a new video
 * @route POST /api/v1/videos
 * @access Private (verifyJWT)
 */
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || title.trim() === "") {
    throw new apiError(400, {}, "Video title is required");
  }

  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath) {
    throw new apiError(400, {}, "Video file is required");
  }

  if (!thumbnailLocalPath) {
    throw new apiError(400, {}, "Thumbnail image is required");
  }

  // Upload video file to Cloudinary (resource_type: "video")
  const videoUploadResult = await uploadOnCloudinary(videoLocalPath);
  if (!videoUploadResult?.url) {
    throw new apiError(500, {}, "Failed to upload video to Cloudinary");
  }

  // Upload thumbnail image to Cloudinary
  const thumbnailUploadResult = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnailUploadResult?.url) {
    throw new apiError(500, {}, "Failed to upload thumbnail to Cloudinary");
  }

  const video = await Video.create({
    videoFile: videoUploadResult.url,
    thumbnail: thumbnailUploadResult.url,
    title: title.trim(),
    description: description?.trim() || "",
    duration: videoUploadResult.duration || 0, // Cloudinary auto-extracts video duration in seconds!
    owner: req.user._id,
    isPublished: true,
  });

  return res
    .status(201)
    .json(new apiResponse(201, video, "Video published successfully"));
});

/**
 * @desc Get video by ID and atomically increment view count
 * @route GET /api/v1/videos/:videoId
 * @access Public / Optional Auth
 */
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  // Atomically increment views count ($inc)
  const video = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { views: 1 } },
    { new: true }
  ).populate("owner", "username fullName avatar");

  if (!video) {
    throw new apiError(404, {}, "Video not found");
  }

  // If video is unlisted/unpublished, only owner can view
  if (
    !video.isPublished &&
    (!req.user || video.owner._id.toString() !== req.user._id.toString())
  ) {
    throw new apiError(403, {}, "This video is private");
  }

  return res
    .status(200)
    .json(new apiResponse(200, video, "Video details retrieved successfully"));
});

/**
 * @desc Update video metadata or thumbnail
 * @route PATCH /api/v1/videos/:videoId
 * @access Private (verifyJWT)
 */
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video not found");
  }

  // Authorization check: Only video owner can update
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You are not authorized to update this video");
  }

  const updates = {};
  if (title && title.trim() !== "") updates.title = title.trim();
  if (description !== undefined) updates.description = description.trim();

  // If new thumbnail is provided
  const thumbnailLocalPath = req.file?.path;
  if (thumbnailLocalPath) {
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (uploadedThumbnail?.url) {
      updates.thumbnail = uploadedThumbnail.url;
    }
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updates },
    { new: true }
  );

  return res
    .status(200)
    .json(new apiResponse(200, updatedVideo, "Video updated successfully"));
});

/**
 * @desc Delete video document and associated cloud assets
 * @route DELETE /api/v1/videos/:videoId
 * @access Private (verifyJWT)
 */
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You are not authorized to delete this video");
  }

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Video deleted successfully"));
});

/**
 * @desc Toggle video published state
 * @route PATCH /api/v1/videos/toggle/publish/:videoId
 * @access Private (verifyJWT)
 */
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid videoId format");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new apiError(
      403,
      {},
      "You are not authorized to toggle status of this video"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isPublished: video.isPublished },
        `Video publish status updated to ${video.isPublished ? "Published" : "Unpublished"}`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

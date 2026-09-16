import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Create a new playlist
 * @route POST /api/v1/playlists
 * @access Private (verifyJWT)
 */
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || name.trim().length < 3) {
    throw new apiError(
      400,
      {},
      "Playlist name must have at least 3 characters"
    );
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description?.trim() || "",
    videos: [],
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new apiResponse(201, playlist, "Playlist created successfully"));
});

/**
 * @desc Get all playlists created by a specific user
 * @route GET /api/v1/playlists/user/:userId
 * @access Public
 */
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new apiError(400, {}, "Invalid userId format");
  }

  const playlists = await Playlist.find({ owner: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new apiResponse(200, playlists, "User playlists fetched successfully")
    );
});

/**
 * @desc Get single playlist by ID with populated videos and aggregated stats
 * @route GET /api/v1/playlists/:playlistId
 * @access Public
 */
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new apiError(400, {}, "Invalid playlistId format");
  }

  const playlistAgg = await Playlist.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
    // Populate owner
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
    // Populate videos array
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          { $match: { isPublished: true } },
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
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
      },
    },
  ]);

  if (!playlistAgg || playlistAgg.length === 0) {
    throw new apiError(404, {}, "Playlist not found");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        playlistAgg[0],
        "Playlist details retrieved successfully"
      )
    );
});

/**
 * @desc Add video to a playlist
 * @route PATCH /api/v1/playlists/add/:videoId/:playlistId
 * @access Private (verifyJWT)
 */
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid playlistId or videoId format");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new apiError(404, {}, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You do not own this playlist");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new apiError(404, {}, "Video not found");
  }

  // Use $addToSet in MongoDB to prevent duplicate entries atomically
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        updatedPlaylist,
        "Video added to playlist successfully"
      )
    );
});

/**
 * @desc Remove video from a playlist
 * @route PATCH /api/v1/playlists/remove/:videoId/:playlistId
 * @access Private (verifyJWT)
 */
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new apiError(400, {}, "Invalid playlistId or videoId format");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new apiError(404, {}, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You do not own this playlist");
  }

  // Use $pull to atomically remove the videoId from the videos array
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        updatedPlaylist,
        "Video removed from playlist successfully"
      )
    );
});

/**
 * @desc Delete a playlist
 * @route DELETE /api/v1/playlists/:playlistId
 * @access Private (verifyJWT)
 */
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new apiError(400, {}, "Invalid playlistId format");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new apiError(404, {}, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You do not own this playlist");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Playlist deleted successfully"));
});

/**
 * @desc Update playlist metadata (name, description)
 * @route PATCH /api/v1/playlists/:playlistId
 * @access Private (verifyJWT)
 */
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new apiError(400, {}, "Invalid playlistId format");
  }

  if (!name || name.trim().length < 3) {
    throw new apiError(
      400,
      {},
      "Playlist name must have at least 3 characters"
    );
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new apiError(404, {}, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You do not own this playlist");
  }

  playlist.name = name.trim();
  if (description !== undefined) playlist.description = description.trim();
  await playlist.save();

  return res
    .status(200)
    .json(new apiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};

import mongoose, { isValidObjectId } from "mongoose";
import { Post } from "../models/post.model.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * @desc Create a new community post
 * @route POST /api/v1/posts
 * @access Private (verifyJWT)
 */
const createPost = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content || content.trim().length < 3) {
    throw new apiError(400, {}, "Post content must have at least 3 characters");
  }

  const post = await Post.create({
    content: content.trim(),
    owner: req.user._id,
  });

  const populatedPost = await Post.findById(post._id).populate(
    "owner",
    "username fullName avatar"
  );

  return res
    .status(201)
    .json(new apiResponse(201, populatedPost, "Post created successfully"));
});

/**
 * @desc Get all posts created by a specific user with like metrics
 * @route GET /api/v1/posts/user/:userId
 * @access Public
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) {
    throw new apiError(400, {}, "Invalid userId format");
  }

  const posts = await Post.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
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
    // Join likes on posts
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: {
              $in: [
                req.user?._id
                  ? new mongoose.Types.ObjectId(req.user._id)
                  : null,
                "$likes.likedBy",
              ],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    { $project: { likes: 0 } },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(new apiResponse(200, posts, "User posts retrieved successfully"));
});

/**
 * @desc Update a post
 * @route PATCH /api/v1/posts/:postId
 * @access Private (verifyJWT)
 */
const updatePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(postId)) {
    throw new apiError(400, {}, "Invalid postId format");
  }

  if (!content || content.trim().length < 3) {
    throw new apiError(400, {}, "Post content must have at least 3 characters");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new apiError(404, {}, "Post not found");
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You are not authorized to update this post");
  }

  post.content = content.trim();
  await post.save();

  return res
    .status(200)
    .json(new apiResponse(200, post, "Post updated successfully"));
});

/**
 * @desc Delete a post
 * @route DELETE /api/v1/posts/:postId
 * @access Private (verifyJWT)
 */
const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new apiError(400, {}, "Invalid postId format");
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new apiError(404, {}, "Post not found");
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new apiError(403, {}, "You are not authorized to delete this post");
  }

  await Post.findByIdAndDelete(postId);

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Post deleted successfully"));
});

export { createPost, getUserPosts, updatePost, deletePost };

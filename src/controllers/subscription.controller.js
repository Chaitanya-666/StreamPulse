import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiErrors.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  buildGetChannelSubscribersPipeline,
  buildGetSubscribedChannelsPipeline,
} from "../pipelines/aggregatePipelines.js";

/**
 * ============================================================================
 * TODO: Subscriptions & Graph Traversal (Mutual Subscription & Follow Graph)
 * ============================================================================
 * SPECIFICATION:
 * 1. `toggleSubscription`:
 *    - Guard against subscribing to oneself.
 *    - Atomic toggle (create if absent, delete if present).
 * 2. `getUserChannelSubscribers`:
 *    - Match documents where `subscribedTo` is the target channel.
 *    - Join subscriber's user profile.
 *    - Correlated sub-pipeline lookup to determine if the requesting user
 *      is also subscribed to each subscriber (mutual subscription check!).
 * 3. `getSubscribedChannels`:
 *    - Match documents where `subscriber` is the target user.
 *    - Join channel profile and the channel's latest published video.
 *
 * ARCHITECTURE & OPTIMIZATION NOTES:
 * - Graph modeling in MongoDB: Using adjacency list / separate collection.
 * - Why compound index `{ subscriber: 1, subscribedTo: 1 }` prevents concurrent duplicates.
 * - Correlated subqueries in Mongo using `$lookup` with `let` and `$expr`.
 * ============================================================================
 */

/**
 * @desc Toggle subscription to a channel
 * @route POST /api/v1/subscriptions/c/:channelId
 * @access Private (verifyJWT)
 */
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new apiError(400, {}, "Invalid channelId format");
  }

  // Prevent self-subscription
  if (channelId.toString() === req.user._id.toString()) {
    throw new apiError(400, {}, "You cannot subscribe to your own channel");
  }

  const channel = await User.findById(channelId);
  if (!channel) {
    throw new apiError(404, {}, "Channel not found");
  }

  const existingSub = await Subscription.findOne({
    subscriber: req.user._id,
    subscribedTo: channelId,
  });

  if (existingSub) {
    await Subscription.findByIdAndDelete(existingSub._id);
    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { isSubscribed: false },
          "Unsubscribed from channel successfully"
        )
      );
  } else {
    await Subscription.create({
      subscriber: req.user._id,
      subscribedTo: channelId,
    });
    return res
      .status(200)
      .json(
        new apiResponse(
          200,
          { isSubscribed: true },
          "Subscribed to channel successfully"
        )
      );
  }
});

/**
 * @desc Get list of subscribers for a given channel
 * @route GET /api/v1/subscriptions/c/:channelId
 * @access Public / Private (pass token to get mutual sub status)
 */
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new apiError(400, {}, "Invalid channelId format");
  }

  const pipeline = buildGetChannelSubscribersPipeline(channelId, req.user?._id);
  const subscribers = await Subscription.aggregate(pipeline);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    );
});

/**
 * @desc Get list of channels a user has subscribed to
 * @route GET /api/v1/subscriptions/u/:subscriberId
 * @access Public
 */
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new apiError(400, {}, "Invalid subscriberId format");
  }

  const pipeline = buildGetSubscribedChannelsPipeline(subscriberId);
  const channels = await Subscription.aggregate(pipeline);

  return res
    .status(200)
    .json(
      new apiResponse(200, channels, "Subscribed channels fetched successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };

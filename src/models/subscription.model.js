import mongoose, { Schema } from "mongoose";
const subscriptionSchema = new Schema(
  {
    // one person subscribes to another person , this is a relation for now if we consider this as a one to one relation then it means that each subscription is uniquely tracked then it exists purely as one to one
    // X subscribes Y account
    // X is a subscriber of Y
    // Y is the person being subscribed to
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscribedTo: {
      // the channel or user which is being subscribed to
      // basically also called as channel
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);

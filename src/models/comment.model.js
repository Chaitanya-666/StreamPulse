import mongoose, { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
  {
    // id primary key is directly provided by mongoose
    content: {
      type: String,
      required: true,
      minlength: [4, "Minimum 4 characters needed to make a comment"],
      maxlength: [400, "Maximum 400 characters allowed when making a comment"],
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to optimize fetching comments of a video sorted by time
commentSchema.index({ video: 1, createdAt: -1 });

commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = model("Comment", commentSchema);

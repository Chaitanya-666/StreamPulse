import mongoose, { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const postSchema = new Schema(
  {
    // id primary key is directly provided by mongoose
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      minlength: [3, "Post content needs atleast 3 characters"],
      maxlength: [20, "Post content cannot exceed 20 characters"],
    },
  },
  {
    timestamps: true,
  }
);

postSchema.plugin(mongooseAggregatePaginate);
export const Post = model("Post", postSchema);

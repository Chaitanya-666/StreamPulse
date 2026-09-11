import mongoose, { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const playlistSchema = new Schema(
  {
    // id primary key is directly provided by mongoose
    name: {
      type: String,
      required: true,
      minlength: [3, "Playlist name needs atleast 3 characters"],
      maxlength: [20, "Playlist name cannot exceed 20 characters"],
    },
    description: {
      type: String,
    },
    videos: [
      {
        // need to modify this into array
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

playlistSchema.plugin(mongooseAggregatePaginate);
export const Playlist = model("Playlist", playlistSchema);

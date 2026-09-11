import { Schema, model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema(
  {
    // since we know id is going to be provided by mongoose or mongodb itself we focus on other fields
    videoFile: {
      type: String,
      // maybe bson gonna be used ?
      required: true,
      // can add unique true to prevent spam but god knows if ever two files produce same binanry ? in some way
    },
    thumbnail: {
      type: String,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    duration: {
      type: Number,
      required: true,
      min: 0,
      // we will store it in seconds , for per file this can be fetched via cloudinary too ?
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);
videoSchema.plugin(mongooseAggregatePaginate);
export const Video = model("Video", videoSchema);

/*
 * we will use aggregate paginate 
 * | SQL                | MongoDB Aggregation     |
| ------------------ | ----------------------- |
| `WHERE`            | `$match`                |
| `JOIN`             | `$lookup`               |
| `GROUP BY`         | `$group`                |
| `SELECT`           | `$project`              |
| `ORDER BY`         | `$sort`                 |
| `LIMIT` / `OFFSET` | `$limit` / `$skip`      |
| `HAVING`           | `$match` after `$group` |

 * */

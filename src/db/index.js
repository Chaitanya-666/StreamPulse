import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
const connectDB = async () => {
  try {
    // mognoose gonna return a promise object which we can also store it
    const ConnectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected , DB host : ${ConnectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("ERROR WHICH OCCURED WHILE CONNECTING TO DB IS : ", error);
    process.exit(1);
  }
};
export default connectDB;

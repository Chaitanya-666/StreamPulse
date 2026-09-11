import { apiError } from "./apiErrors.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// fix when both images or images with same name are uploaded
// Generate unique temp filename

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath || !fs.existsSync(localFilePath)) {
      return null;
    }
    const cloudinaryRes = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("(cloduinary) : File uploaded successfully", cloudinaryRes);
    console.log(" (cloduinary) :  File URL is ", cloudinaryRes.url);
    return cloudinaryRes;
  } catch (error) {
    // even for failure of uploads or handling stale corrupted files unlink them synchronously
    // unlinking doesnt work
    throw new apiError(500, {}, "Error occured while uploading your file");
  } finally {
    // In our finally block:
    console.log("Attempting to delete:", localFilePath);
    console.log("File exists?", fs.existsSync(localFilePath));
    try {
      fs.unlinkSync(localFilePath);
      console.log("Deleted successfully");
    } catch (e) {
      console.error("Delete failed:", e.code, e.message);
    }
  }
};
export { uploadOnCloudinary };

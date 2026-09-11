import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
const uploadDir = path.join(process.cwd(), "public", "tmp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, file.originalname + "_" + uniqueSuffix + ext);
  },
});

export const upload = multer({ storage });

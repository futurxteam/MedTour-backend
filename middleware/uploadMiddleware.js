import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

// DUMMY CONFIG - USER WILL UPDATE THESE
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "medtour_records",
        allowed_formats: ["jpg", "png", "pdf", "jpeg"],
        resource_type: "auto",
    },
});

const upload = multer({ storage: storage });

export default upload;

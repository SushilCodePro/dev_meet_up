import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

/**
 * Uploads a file buffer to Cloudinary using a readable stream.
 * @param {Buffer} fileBuffer - The memory buffer from multer.
 * @param {String} folder - The cloudinary folder name to store the image in.
 * @returns {Promise<Object>} - The cloudinary upload result (including the secure_url).
 */
export const uploadToCloudinary = (fileBuffer, folder = "dev-meet-up") => {
    return new Promise((resolve, reject) => {
        // Create an upload stream to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                // Optional: You can add transformations here, e.g. crop, resize
                // width: 400, height: 400, crop: "fill", gravity: "face" 
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        // Convert the file buffer to a readable stream and pipe it to Cloudinary
        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};

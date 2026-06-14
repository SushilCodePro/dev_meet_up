import multer from "multer";

// Configure Multer to use memory storage
// This means the file won't be saved to the server's disk, but kept in RAM
// so we can stream it directly to Cloudinary.
const storage = multer.memoryStorage();

// Set file filters (only allow images)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

// Create the upload middleware instance
// We limit the file size to 5MB to prevent abuse
export const uploadMiddleware = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max
    },
});

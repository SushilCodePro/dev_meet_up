import multer from "multer";

// Configure Multer to use memory storage
// This means the file won't be saved to the server's disk, but kept in RAM
// so we can stream it directly to Cloudinary.
// const storage = multer.memoryStorage(); //It simply creates a storage engine object.

// Set file filters (only allow images)


// const fileFilter = (req, file, cb) => {

//     const allowedTypes = [
//         "application/pdf"
//     ];

//     if (
//         file.mimetype.startsWith("image/") ||
//         file.mimetype.startsWith("video/") ||
//         allowedTypes.includes(file.mimetype)
//     ) {
//         cb(null, true);
//     } else {
//         cb(new Error("Unsupported file type"), false);
//     }
// };

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);//cb(error, accept)
    } else {
        cb(new Error("Only image files are allowed!"), false);
    }
};

// Create the upload middleware instance
// We limit the file size to 5MB to prevent abuse
export const uploadMiddleware = multer({ //It returns a Multer instance.
    storage: multer.memoryStorage(), //Now Multer creates a file object in memory instead of saving the file to disk.
    // const file = {
    //     fieldname: "photo",
    //     originalname: "cat.jpg",
    //     mimetype: "image/jpeg",
    //     encoding: "7bit",
    //     stream: Readable
    // }
    fileFilter: fileFilter,//call by multer
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB max
    },
});


// returns of Multer instance
// const uploadMiddleware= { 
//     single(){},
//     array(){},
//     fields(){},
//     none(){},
//     any(){}
// }

//NOTE: Limits are checked first (to prevent resource exhaustion), then fileFilter.

//NOTE: [fileFilter is called first, not because of where it appears in your object,
// but because Multer's internal implementation chooses to call it first.]
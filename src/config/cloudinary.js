import { v2 as cloudinary } from 'cloudinary';

// Configuration
cloudinary.config({
    cloud_name: 'dujs5uiye',
    api_key: '994448444715213',
    api_secret: process.env.CLOUDINARY_SECRET
});

export default cloudinary;

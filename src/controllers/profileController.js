
import User from "../models/userModel.js";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";
export const profile = async (req, res) => {
  try {
    // req.user was set by verifyToken middleware
    const userId = req.user.id;

    // Fetch full user details from DB
    const user = await User.findById(userId).select("-password"); // exclude password

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile fetched successfully",
      user
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// {
//     "firstName": "Karina",
//     "lastName": "khan",
//     "emailId": "karina.lko5293@gmail.com",
//     "password": "Saifalikhan@123",
//     "age": 40,
//     "gender": "female",
//     "photoUrl":"https://encrypted-tbn0.gstatic.com/licensed-image?q=tbn:ANd9GcTTmOLDkFJGxU5kPZUCCDl3nHSTnF6DWMk75mL5MjpT_calOccQSwC5iQUmr7WYH5iw7B4t_kKSy_-ThxhYILybPxTjc1CaNnYUXnxAy95LsE_dIkOObgXWVuh1zmC2kMVlU-wIoXsuBBU&s=19"
// }
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from verifyToken middleware

    // Take input fields from request body
    const { firstName, lastName, age, gender, skills, location, about } = req.body;

    // Validate (basic)
    // if (!firstName || !lastName || !emailId) {
    //   return res.status(400).json({ message: "First name, last name, and email are required" });
    // }
    const ALLOWED_UPDATE = ['firstName', 'lastName', 'age', 'gender', 'skills', 'about', 'location']
    const isAllowedUpdate = Object.keys(req.body).every(k => ALLOWED_UPDATE.includes(k));

    if (!isAllowedUpdate) {
      return res.status(400).json({ message: "Update is not allowed" })
    }
    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, age, gender, skills, location, about },
      { new: true, runValidators: true, select: "-password -refreshToken" } // return updated doc & exclude password
      // runValidators: By default, validators(schema validations) only run on save() / create(), not on update.
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = req.user.id; // from verifyToken middleware

    // Check if file exists in the request
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    // Upload the file buffer to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer);

    // Update user in DB with the new photoUrl
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { photoUrl: cloudinaryResult.secure_url },
      { new: true, select: "-password" }
    );

    res.status(200).json({
      message: "Profile photo uploaded successfully",
      photoUrl: cloudinaryResult.secure_url,
      user: updatedUser
    });

  } catch (error) {
    console.error("Profile photo upload error:", error);
    res.status(500).json({ message: "Failed to upload photo" });
  }
};

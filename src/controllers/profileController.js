

import User from "../models/userModel.js";

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

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from verifyToken middleware

    // Take input fields from request body
    const { firstName, lastName, emailId, age, gender } = req.body;

    // Validate (basic)
    if (!firstName || !lastName || !emailId) {
      return res.status(400).json({ message: "First name, last name, and email are required" });
    }

    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, emailId, age, gender },
      { new: true, runValidators: true, select: "-password" } // return updated doc & exclude password
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

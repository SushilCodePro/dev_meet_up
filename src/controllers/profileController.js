

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



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
    const { firstName, lastName, emailId, age, gender, skills, photoUrl } = req.body;

    // Validate (basic)
    // if (!firstName || !lastName || !emailId) {
    //   return res.status(400).json({ message: "First name, last name, and email are required" });
    // }
    const ALLOWED_UPDATE = ['age', 'gender', 'skills', 'photoUrl', 'about','firstName', 'lastName']
    const isAllowedUpdate = Object.keys(req.body).every(k => ALLOWED_UPDATE.includes(k));

    if (!isAllowedUpdate) {
      return res.status(400).json({ message: "Update is not allowed" })
    }
    // Update user in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {age, gender, skills, photoUrl},
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

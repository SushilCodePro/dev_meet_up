import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import { use } from "react";
import validator from "validator";
import redisClient from "../config/redis.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";
// import { use } from "react";

function Validator(data) {
  const mandatoryFields = ["firstName", "emailId", "password"];

  mandatoryFields.forEach((field) => {
    if (!data[field]) {
      throw new Error(`${field} is required`);
    }
  });

  if (!validator.isEmail(data.emailId)) {
    throw new Error("Invalid email");
  }

  if (!validator.isStrongPassword(data.password)) {
    throw new Error("Weak password");
  }
}
// Signup
export const signup = async (req, res) => {
  // console.log('req in signup', req);
  try {
    const { firstName, lastName, emailId, password, age, gender } = req.body;
    console.log({ emailId, password })
    //validate kr sakte h all data ko age jane se phle
    //validetor.js lib use kro
    Validator(req.body);
    // Check if user exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      emailId,
      password: hashedPassword,
      age,
      gender,
    });
    const safeUser = {
      _id: user._id,
      firstName: user.firstName,
      emailId: user.emailId,
    };

    res.status(201).json({
      message: "User registered successfully",
      user: safeUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Signin
export const signin = async (req, res) => {
  try {
    const { emailId, password } = req.body;
    console.log({ emailId, password })
    //validate kr sakte h all data ko age jane se phle
    //validetor.js lib use kro
    // Check user
    const user = await User.findOne({ emailId });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Generate JWT
    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken;

    await user.save();

    const safeUser = {
      _id: user._id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      emailId: user?.emailId,
      age: user?.age,
      gender: user?.gender,
      photoUrl: user?.photoUrl,
      skills: user?.skills,
      about: user?.about,
      location: user?.location,
    };


    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "none",
    //   path: "/",                  // ✅ required
    //   maxAge: 24 * 60 * 60 * 1000 // ✅ 1 day in milliseconds
    // }).json(safeUser);

    res.cookie(
      'accessToken',
      accessToken,
      {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        maxAge: 15 * 60 * 1000
      }
    );

    res.cookie(
      'refreshToken',
      refreshToken,
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    );
    res.status(200).json({ safeUser })

    console.log('safeuser', safeUser);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//logout
export const logout = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (accessToken) {
      const payload = jwt.decode(accessToken);
      if (payload && payload.exp) {
        await redisClient.set(`accessToken-${accessToken}`, 'Blocked');
        await redisClient.expireAt(`accessToken-${accessToken}`, payload.exp);
      }
    }

    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const payload = jwt.decode(refreshToken);
      if (payload && payload.userId) {
        await User.findByIdAndUpdate(payload.userId, { $unset: { refreshToken: 1 } });
      }
    }

    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false, // only secure in prod // process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false, // only secure in prod
      sameSite: "lax",
      path: "/",
    });

    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


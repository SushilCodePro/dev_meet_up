import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

import { generateAccessToken, generateRefreshToken } from "../utils/generateTokens.js";

export const refresh = async (req, res) => {

    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh" });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: "Invalid" });
        }

        const newAccess = generateAccessToken(user._id);

        const newRefresh = generateRefreshToken(user._id);

        user.refreshToken = newRefresh;

        await user.save();

        res.cookie("accessToken", newAccess, {
            httpOnly: true,
            sameSite: "none",
            secure: true, // set to true in production
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", newRefresh, {
            httpOnly: true,
            sameSite: "none",
            secure: true, // set to true in production
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ message: "Refreshed" });
    }
    catch {
        return res.status(401).json({ message: "Expired" });
    }
};
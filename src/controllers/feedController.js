import ConnectionRequest from "../models/connectionModel.js";
import User from "../models/userModel.js";


export const feed = async (req, res) => {
    try {
        const userId = req.user.id;

        const connectionRequest = await ConnectionRequest.find({
            $or: [
                { fromUserId: userId },
                { toUserId: userId }
            ]
        }).select("fromUserId toUserId")

        const hideUsersfromFeed = new Set();
        connectionRequest.forEach((req) => {
            hideUsersfromFeed.add(req.fromUserId.toString());
            hideUsersfromFeed.add(req.toUserId.toString());
        })

        const userFeed = await User.find({
            $and: [
                { _id: { $nin: Array.from(hideUsersfromFeed) } },
                { _id: { $ne: userId } }
            ]
        }).select("firstName lastName age gender")
        res.status(200).json({
            message: "Feeds fetched successfully",
            data: userFeed,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

}
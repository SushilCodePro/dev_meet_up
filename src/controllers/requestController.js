import ConnectionRequest from "../models/connectionModel.js";

export const myRequest = async (req, res) => {
    try {
        const userId = req.user.id;

        const gotRequest = await ConnectionRequest.find({
            toUserId: userId,
            status: "interested",
        }).populate({
            path: "fromUserId",
            select: "firstName lastName age gender skills photoUrl about"
        });

        if (!gotRequest || gotRequest.length === 0) {
            return res.status(200).json({
                message: "No connection requests found",
                data: [],
            });
        }

        res.status(200).json({
            message: "Connection requests fetched successfully",
            data: gotRequest,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const myConnection = async (req, res) => {
    try {
        const userId = req.user.id;

        const connections = await ConnectionRequest.find({
            $or: [
                { toUserId: userId, status: "accepted" },
                { fromUserId: userId, status: "accepted" }
            ]
        }).populate([
            { path: "fromUserId", select: "firstName lastName age gender skills photoUrl about" },
            { path: "toUserId", select: "firstName lastName age gender skills photoUrl about" }
        ]);

        if (!connections || connections.length === 0) {
            return res.status(200).json({
                message: "No connections found",
                data: [],
            });
        }

        // Return only the OTHER person — not the logged-in user
        const otherUsers = connections.map((conn) => {
            const isFromUser = conn.fromUserId._id.toString() === userId.toString();
            return isFromUser ? conn.toUserId : conn.fromUserId;
        });

        res.status(200).json({
            message: "Connections fetched successfully",
            data: otherUsers,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// export default myRequest;
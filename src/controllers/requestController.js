import ConnectionRequest from "../models/connectionModel.js";

export const myRequest = async (req, res) => {
    try {
        const userId = req.user.id;

        const gotRequest = await ConnectionRequest.find({
            toUserId: userId,
            status: "interested",
        }).populate({
            path: "fromUserId",
            select: "firstName lastName age"
        });

        if (!gotRequest || gotRequest.length === 0) {
            return res.status(404).json({
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

        const connection = await ConnectionRequest.find({
            $or: [
                { toUserId: userId, status: "accepted" },
                { fromUserId: userId, status: "accepted" }
            ]
        }).populate([
            { path: "fromUserId", select: "firstName lastName age" },
            { path: "toUserId", select: "firstName lastName age" }
        ]);


        if (!connection || connection.length === 0) {
            return res.status(404).json({
                message: "No connection requests found",
                data: [],
            });
        }

        res.status(200).json({
            message: "Connection requests fetched successfully",
            data: connection,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

}

// export default myRequest;

import mongoose from "mongoose";
import ConnectionRequest from "../models/connectionModel.js";

export const connectionStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const [stats] = await ConnectionRequest.aggregate([
            {
                $facet: {
                    // 1. Accepted Connections
                    connections: [
                        {
                            $match: {
                                $or: [{ fromUserId: userObjectId }, { toUserId: userObjectId }],
                                status: "accepted"
                            }
                        },
                        { $count: "total" }
                    ],
                    // 2. Pending Requests Sent by Logged-in User
                    sentRequests: [
                        {
                            $match: {
                                fromUserId: userObjectId,
                                status: "interested"
                            }
                        },
                        { $count: "total" }
                    ],
                    // 3. Pending Requests Received by Logged-in User
                    receivedRequests: [
                        {
                            $match: {
                                toUserId: userObjectId,
                                status: "interested"
                            }
                        },
                        { $count: "total" }
                    ],
                    // 4. Ignored / Passed profiles
                    ignoredCount: [
                        {
                            $match: {
                                fromUserId: userObjectId,
                                status: "ignored"
                            }
                        },
                        { $count: "total" }
                    ]
                }
            }
        ]);

        const totalConnections = stats?.connections?.[0]?.total || 0;
        const totalSent = stats?.sentRequests?.[0]?.total || 0;
        const totalReceived = stats?.receivedRequests?.[0]?.total || 0;
        const totalIgnored = stats?.ignoredCount?.[0]?.total || 0;

        // Calculate acceptance rate: accepted / (accepted + pending + ignored) sent
        const totalOutreach = totalConnections + totalSent + totalIgnored;
        const acceptanceRate = totalOutreach > 0 ? Math.round((totalConnections / totalOutreach) * 100) : 0;

        res.status(200).json({
            message: "Connection stats calculated successfully via aggregation",
            data: {
                totalConnections,
                totalSent,
                totalReceived,
                totalIgnored,
                acceptanceRate
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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
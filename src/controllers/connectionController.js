import ConnectionRequest from "../models/connectionModel.js";
import User from "../models/userModel.js";

export const sender = async (req, res) => {
    try {
        const fromUserId = req.user.id;
        const toUserId = req.params.toUserId;
        const status = req.params.status;

        // Prevent sending connection request to self
        if (fromUserId.toString() === toUserId) {
            return res.status(400).json({ message: "You cannot send a request to yourself" });
        }

        let isAllowedStatus = ["interested", "ignored"];
        if (!isAllowedStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid Status: " + status });
        }

        const extistingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });
        if (extistingConnectionRequest) {
            return res.status(400).json({ message: "Connection Request already exist" });
        }

        const user = await User.findById(toUserId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const connectionRequest = await ConnectionRequest.create({ fromUserId, toUserId, status });
        res.status(201).json({ message: "Connection request send successfully!", data: connectionRequest })

    } catch (error) {
        console.error("Error creating connection request:", error);
        res.status(500).json({ message: "Internal server error" });
    }

}

export const receiver = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, requestedId } = req.params;

    const isAllowedStatus = ["accepted", "rejected"];
    if (!isAllowedStatus.includes(status)) {
      return res.status(400).json({ message: "Status is not valid!" });
    }

    const connectionRequest = await ConnectionRequest.findOneAndUpdate(
      { _id: requestedId, toUserId: userId, status: "interested" },
      { $set: { status } },
      { new: true } // return updated document
    );

    // const connectionRequest = await ConnectionRequest.findOne({
    //     _id: requestedId,
    //     toUserId: userId,
    //     status: "interested",
    // });

    // connectionRequest.status = status; 
    // await connectionRequest.save(); 

    if (!connectionRequest) {
      return res.status(404).json({ message: "Connection request not found!" });
    }

    res.status(200).json({
      message: `Connection request ${status} successfully!`,
      data: connectionRequest,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

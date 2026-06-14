import ConnectionRequest from "../models/connectionModel.js";
import User from "../models/userModel.js";

export const feed = async (req, res) => {
  try {
    const userId = req.user.id;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const search = req.query.search;
    const skills = req.query.skills;
    const skip = (page - 1) * limit;

    const connectionRequest = await ConnectionRequest.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).select("fromUserId toUserId");

    const hideUsersfromFeed = new Set();

    connectionRequest.forEach((req) => {
      hideUsersfromFeed.add(req.fromUserId.toString());
      hideUsersfromFeed.add(req.toUserId.toString());
    });

    const query = {
      _id: {
        $nin: [...hideUsersfromFeed],
        $ne: userId,
      },
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    }

    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      console.log("skill:::", skillsArray)

      query.skills = {
        $in: skillsArray.map(skill => new RegExp(skill, 'i'))
      }
    }

    // Current page users
    const users = await User.find(query)
      .select("firstName lastName age gender skills photoUrl location about status")
      .skip(skip)
      .limit(limit);

    // Total count
    const totalUsers = await User.countDocuments(query);

    const hasMore = skip + users.length < totalUsers;

    res.status(200).json({
      message: "Feeds fetched successfully",
      users,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
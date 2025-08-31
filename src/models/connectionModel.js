import mongoose from "mongoose";


const connectionSchema= new mongoose.Schema({
    fromUserId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    toUserId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    status:{
        type: String,
        required: true,
        enum: {
            values: ["ignore", "interested", "accepted","rejected"],
            message: '{VALUES} is incorrect status type '
        }
    }
})

export default mongoose.model('ConnectionRequest',connectionSchema);
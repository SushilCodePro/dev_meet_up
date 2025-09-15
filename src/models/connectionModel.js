import mongoose from "mongoose";


const connectionSchema= new mongoose.Schema({
    fromUserId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref:"User"
    },
    toUserId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref:"User"
    },
    status:{
        type: String,
        required: true,
        enum: {
            values: ["ignored", "interested", "accepted","rejected"],
            message: '{VALUE} is incorrect status type '
        }
    },
    
},{ timestamps: true })

export default mongoose.model('ConnectionRequest',connectionSchema);
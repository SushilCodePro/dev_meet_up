import mongoose from "mongoose";

const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URL); 
        console.log("connected to mongoDB with mongoose");
    }catch(error){
        console.error("mongoDB connection error: ", error);
        process.exit(1);
    }
}
export default connectDB;
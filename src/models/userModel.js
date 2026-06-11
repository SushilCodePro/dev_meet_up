import mongoose from "mongoose";
// import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minlength: 3,
    },
    lastName: {
        type: String,
        // required: true,
        minlength: 3,
    }, 
    emailId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    age: {
        type: Number,
        // required: true,
    },
    gender: {
        type: String,
        lowercase: true,
        validate(value){
            if(!['male','female', 'others'].includes(value)){
                throw new Error("gender is not valid")
            }
        }
    },
    photoUrl: {
        type:String
    },
    skills:{
        type:[String]
    },
    about:{
        type: String,
        default:"This default about"
    }

},{timestamps:true});

// Hash password before saving
// userSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     this.password = await bcrypt.hash(this.password, 10);
//     next();
// });

export default mongoose.model("User", userSchema);

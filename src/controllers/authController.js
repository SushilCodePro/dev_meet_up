import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// function Validator(data){
//  const mandatoryField=["firstName","emailID",'password']
//  const isAllowed=mandatoryField.every((k)=>Object.keys(data).includes(k)) 
//  if(!isAllowed){
//   throw new Error('some filed missing')
//  }

//  if(!validator.isEmail(data.emailID)){
//   throw new Error('invalid email')
//  }
//  //like this write others
// }
// Signup
export const signup = async (req, res) => {
  // console.log('req in signup', req);
  try {
    const { firstName, lastName, emailId, password, gender, age,photoUrl } = req.body;
    //validate kr sakte h all data ko age jane se phle
    //validetor.js lib use kro
    // Check if user exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      emailId,
      password: hashedPassword,
      photoUrl,
      gender,
      age
    });
    res.status(201).json({ message: "User registered successfully", user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Signin
export const signin = async (req, res) => {
  try {
    const { emailId, password } = req.body;

    //validate kr sakte h all data ko age jane se phle
    //validetor.js lib use kro
    // Check user
    const user = await User.findOne({ emailId });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {expiresIn: "1d"});

    res.cookie("token", token, { httpOnly: true, secure: true ,sameSite: "None"})
      .json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//logout
export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false, // only secure in prod // process.env.NODE_ENV === "production",
      sameSite: "strict", // prevent CSRF
    });
// secure: false → the cookie will also be sent over HTTP (in local development).
// secure: true → the cookie will only be sent by the browser over HTTPS (not HTTP).
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../model/User.model.js";
import { config } from "dotenv";

config();

export const stripPassword = (userDoc) => {
  const { password, ...strippedUser } = userDoc;
  return strippedUser;
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Find the user by email

    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: `${email} is not a valid email address`,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    // Check if the password matches
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }
    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res
      .status(200)
      .json({ success: true, user: { token, ...stripPassword(user._doc) } });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const signup = async (req, res) => {
  try {
    const { fullName, email, password, role, companyName } = req.body;
    const profilePic = req.file;

    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email is already registered" });
    }

    // Check if an supervisor already exists for the company (case-insensitive)
    if (role === "supervisor") {
      const existingAdmin = await User.findOne({
        companyName: { $regex: new RegExp(`^${companyName}$`, "i") },
        role: "supervisor",
      });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: "A supervisor already exists for this company",
        });
      }
    }

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, and one number",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const profilePicPath = profilePic ? `/uploads/${profilePic.filename}` : "";

    // Create a new user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      role,
      companyName,
      profilePic: profilePicPath,
      profession: "",
    });

    // Save the new user to the database
    await newUser.save();

    // Generate JWT token

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.status(200).json({
      success: true,
      user: { token, ...stripPassword(newUser._doc) },
    });
  } catch (error) {
    console.error("Error during signup:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User with this email does not exist",
      });
    }
    // Generate and send password reset token
    // (Implementation of sending email with reset link goes here)
    return res.status(200).json({
      success: true,
      message: "Password reset token sent successfully",
    });
  } catch (error) {
    console.error("Error during forgot password:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

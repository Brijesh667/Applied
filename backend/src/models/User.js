import mongoose from "mongoose";
import { LIMITS } from "../config/constants.js";
import { normalizeText } from "../utils/normalize.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      maxlength: [LIMITS.name, `Name cannot exceed ${LIMITS.name} characters`],
      set: normalizeText,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [LIMITS.email, `Email cannot exceed ${LIMITS.email} characters`],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export { userSchema, User };
export default User;

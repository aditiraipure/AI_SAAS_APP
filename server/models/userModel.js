import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      default: "QuickAI Creator",
    },
    username: {
      type: String,
    },
    email: {
      type: String,
    },
    plan: {
      type: String,
      default: "free",
      enum: [
        "free",
        "Free",
        "premium",
        "Premium",
        "basic",
        "Basic",
        "pro",
        "Pro",
      ],
    },
    freeUsage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;

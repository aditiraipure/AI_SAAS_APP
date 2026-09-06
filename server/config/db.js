import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Database connected successfully to quickAI");
    });

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    const uri = process.env.MONGODB_URL || process.env.DATABASE_URL;
    if (!uri) {
      throw new Error("MONGODB_URL is not defined in .env");
    }

    await mongoose.connect(uri, {
      dbName: "quickAI",
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
  }
};

export default connectDB;

import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import { swaggerSpec, swaggerUi } from "./config/swagger/swagger.js";
import aiRouter from "./routes/aiRoute.js";
import userRouter from "./routes/userroutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to QuickAI Database
await connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

// Swagger API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root Health Route
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "QuickAI API is working",
    docs: `http://localhost:${PORT}/api-docs`,
  });
});

// AI Routes
app.use("/api/ai", aiRouter);

// User & Creations Routes
app.use("/api/user", userRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

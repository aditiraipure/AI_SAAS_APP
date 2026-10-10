import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import { swaggerSpec, swaggerUi } from "./config/swagger/swagger.js";
import aiRouter from "./routes/aiRoute.js";
import resumeRouter from "./routes/resumeRoutes.js";
import userRouter from "./routes/userRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to QuickAI Database
try {
  await connectDB();
} catch (error) {
  console.error("Fatal: Database connection failed. Server startup aborted.");
  process.exit(1);
}

// Middlewares
app.use(cors());
// Dynamic CORS configuration for local Docker testing and production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:5173", "http://localhost:5000"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        !process.env.ALLOWED_ORIGINS ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);
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

// Resume Builder & Review Routes
app.use("/api/resumes", resumeRouter);
app.use("/api/resume", resumeRouter);

// User & Creations Routes
app.use("/api/user", userRouter);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

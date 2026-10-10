import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../");

const port = process.env.PORT || 5000;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "QuickAI API Documentation",
      version: "1.0.0",
      description:
        "Comprehensive API documentation for the QuickAI SaaS Backend, including AI article generation, blog title generator, AI image generation, Clerk authentication, and user usage tracking.",
      contact: {
        name: "QuickAI Support",
      },
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter Clerk session token (`Bearer <session_token>`)",
        },
      },
      schemas: {
        GenerateArticleRequest: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: {
              type: "string",
              example: "Write an article about artificial intelligence",
              description: "The topic or prompt for the article to generate",
            },
            length: {
              type: "string",
              enum: ["short", "medium", "long"],
              example: "medium",
              description: "Length category for article generation",
            },
            temperature: {
              type: "number",
              example: 0.7,
              description: "Model temperature parameter (0.0 to 1.0)",
            },
            max_tokens: {
              type: "integer",
              example: 1500,
              description: "Maximum tokens to generate in the response",
            },
          },
        },
        GenerateArticleResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Article generated successfully",
            },
            article: {
              type: "string",
              example: "## Artificial Intelligence\n\nAI is transforming...",
            },
            content: { type: "string" },
            creation: { type: "object" },
            usage: { type: "integer", example: 1 },
            plan: { type: "string", example: "free" },
          },
        },
        GenerateBlogTitleRequest: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: {
              type: "string",
              example: "Artificial intelligence in education",
              description: "Keyword or topic for title generation",
            },
            category: {
              type: "string",
              example: "Technology",
              description: "Category of the blog/article",
            },
          },
        },
        GenerateBlogTitleResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Blog titles generated successfully",
            },
            titles: {
              type: "array",
              items: { type: "string" },
              example: [
                "The Future of Learning: How AI Is Revolutionizing the Modern Classroom",
                "Beyond the Blackboard: How Artificial Intelligence Is Reshaping Education",
                "Smarter Classrooms: The Ultimate Guide to Artificial Intelligence in EdTech",
                "From Personalized Tutoring to Automated Grading: The Rise of AI in Education",
                "Transforming the Student Experience: Why AI Is the Next Big Leap for Schools",
                "5 Proven Strategies for Implementing AI in Higher Education",
                "How Educational AI Is Helping Students Learn Faster and Better",
              ],
            },
            creation: { type: "object" },
            usage: { type: "integer", example: 1 },
            plan: { type: "string", example: "free" },
          },
        },
        GenerateImageRequest: {
          type: "object",
          required: ["prompt"],
          properties: {
            prompt: {
              type: "string",
              example: "shot of vaporwave fashion dog in miami",
              description: "Detailed description of the image to generate",
            },
            style: {
              type: "string",
              enum: [
                "Realistic",
                "Ghibli Style",
                "Anime Style",
                "Cartoon Style",
                "Fantasy Style",
                "3D Style",
                "Portrait Style",
              ],
              example: "Anime Style",
              description: "Artistic style for image rendering",
            },
            isPublic: {
              type: "boolean",
              example: false,
              description: "Whether to publish creation to the community page",
            },
          },
        },
        GenerateImageResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: {
              type: "string",
              example: "Image generated successfully",
            },
            imageUrl: {
              type: "string",
              example:
                "https://res.cloudinary.com/mzgepnuk/image/upload/v12345/quickai_creations/abc.jpg",
            },
            creation: { type: "object" },
            usage: { type: "integer", example: 1 },
            plan: { type: "string", example: "free" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Error description",
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Resume Builder",
        description: "AI-Powered Resume Builder, ATS analysis, and PDF/DOCX Export",
      },
      {
        name: "AI Tools",
        description: "Endpoints for AI-powered generation tools",
      },
      {
        name: "User & Creations",
        description: "Endpoints for user creations, community feed, and likes",
      },
      {
        name: "General",
        description: "General API health and status endpoints",
      },
    ],
  },
  apis: [
    path.join(serverRoot, "routes/*.js"),
    path.join(serverRoot, "routes/**/*.js"),
    path.join(serverRoot, "server.js"),
    "./routes/*.js",
    "./routes/**/*.js",
    "./server/routes/*.js",
    "./server/routes/**/*.js",
    "./server.js",
    "./server/server.js",
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
export { swaggerUi };
export default swaggerSpec;

import express from "express";
import { upload } from "../config/multer.js";
import {
  generateArticle,
  generateBlogTitle,
  generateImage,
  removeImageBackground,
  removeImageObject,
  resumeReview,
} from "../controllers/aicontroller.js";
import { auth } from "../middleware/auth.js";

const aiRouter = express.Router();

/**
 * @openapi
 * /api/ai/generate-article:
 *   post:
 *     summary: Generate an AI article
 *     description: Generates an AI-written article using Gemini model. Free-tier users have a 10-article limit; Premium users have unlimited access.
 *     tags:
 *       - AI Tools
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: "Write an article about artificial intelligence"
 *               length:
 *                 type: string
 *                 enum: [short, medium, long]
 *                 example: "medium"
 *               temperature:
 *                 type: number
 *                 example: 0.7
 *               max_tokens:
 *                 type: integer
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Article generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenerateArticleResponse'
 *       400:
 *         description: Missing or invalid prompt
 *       401:
 *         description: Unauthorized / Missing Clerk authentication
 *       403:
 *         description: Free plan generation limit reached (>= 10)
 *       500:
 *         description: Internal server error or Gemini API error
 */
aiRouter.post("/generate-article", auth, generateArticle);

/**
 * @openapi
 * /api/ai/generate-blog-title:
 *   post:
 *     summary: Generate AI Blog Titles
 *     description: Generates 5 to 8 engaging, unique, and SEO-friendly blog titles using Gemini. Free plan limit is 10 generations; Premium users have unlimited access.
 *     tags:
 *       - AI Tools
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: "Artificial intelligence in education"
 *               category:
 *                 type: string
 *                 example: "Technology"
 *     responses:
 *       200:
 *         description: 5 to 8 blog titles generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Blog titles generated successfully"
 *                 titles:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "The Future of Learning: How AI Is Revolutionizing the Classroom",
 *                     "Beyond the Blackboard: 7 Ways AI Is Transforming EdTech",
 *                     "Smarter Classrooms: The Ultimate Guide to AI in Modern Education",
 *                     "From Grading to Personalized Tutoring: The Power of Educational AI",
 *                     "5 Breakthrough AI Innovations Every Educator Needs to Know",
 *                     "How AI-Powered Learning Is Closing the Student Achievement Gap",
 *                     "The Rise of Smart Schools: Practical Strategies for AI Adoption"
 *                   ]
 *                 usage:
 *                   type: integer
 *                   example: 1
 *                 plan:
 *                   type: string
 *                   example: "free"
 *       400:
 *         description: Missing or invalid prompt
 *       401:
 *         description: Unauthorized / Missing Clerk authentication
 *       403:
 *         description: Free plan generation limit reached
 *       500:
 *         description: Internal server error
 */
aiRouter.post("/generate-blog-title", auth, generateBlogTitle);

/**
 * @openapi
 * /api/ai/generate-image:
 *   post:
 *     summary: Generate AI Image
 *     description: Generates an image using Clipdrop text-to-image API and uploads it to Cloudinary.
 *     tags:
 *       - AI Tools
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: "shot of vaporwave fashion dog in miami"
 *               style:
 *                 type: string
 *                 enum: ["Realistic", "Ghibli Style", "Anime Style", "Cartoon Style", "Fantasy Style", "3D Style", "Portrait Style"]
 *                 example: "Anime Style"
 *               isPublic:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Image generated and uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Image generated successfully"
 *                 imageUrl:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../image.jpg"
 *                 usage:
 *                   type: integer
 *                   example: 1
 *                 plan:
 *                   type: string
 *                   example: "free"
 *       400:
 *         description: Missing prompt
 *       401:
 *         description: Unauthorized / Missing Clerk authentication
 *       402:
 *         description: Insufficient Clipdrop API credits
 *       403:
 *         description: Free plan limit reached or feature restricted
 *       500:
 *         description: Internal server error or Cloudinary upload failure
 */
aiRouter.post("/generate-image", auth, generateImage);

/**
 * @openapi
 * /api/ai/remove-background:
 *   post:
 *     summary: Remove Image Background (Premium Only)
 *     description: Removes the background of an uploaded image using Cloudinary background removal AI. Requires an active Premium plan.
 *     tags:
 *       - AI Tools
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to remove background from (JPG, PNG, WEBP, max 5MB)
 *     responses:
 *       200:
 *         description: Background removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Background removed successfully"
 *                 imageUrl:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../image.png"
 *                 plan:
 *                   type: string
 *                   example: "premium"
 *       400:
 *         description: Missing or invalid image file
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Premium-only feature (Free users receive 403)
 *       500:
 *         description: Server or Cloudinary transformation error
 */
aiRouter.post(
  "/remove-background",
  upload.single("image"),
  auth,
  removeImageBackground,
);

/**
 * @openapi
 * /api/ai/remove-object:
 *   post:
 *     summary: Remove Object from Image (Premium Only)
 *     description: Removes a specified object from an image using Cloudinary GenAI inpainting. Requires an active Premium plan.
 *     tags:
 *       - AI Tools
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file containing the object to remove
 *               object:
 *                 type: string
 *                 example: "watch"
 *                 description: Name or description of the object to remove
 *     responses:
 *       200:
 *         description: Object removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Object removed successfully"
 *                 imageUrl:
 *                   type: string
 *                   example: "https://res.cloudinary.com/.../image.jpg"
 *                 plan:
 *                   type: string
 *                   example: "premium"
 *       400:
 *         description: Missing image file or object description
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Premium-only feature
 *       500:
 *         description: Server or Cloudinary transformation error
 */
aiRouter.post(
  "/remove-object",
  upload.single("image"),
  auth,
  removeImageObject,
);

/**
 * @openapi
 * /api/ai/resume-review:
 *   post:
 *     summary: Review Resume with AI (Premium Only)
 *     description: Extracts text from PDF, DOC, or DOCX resume and provides in-depth ATS score, strength analysis, and recruiter recommendations via Gemini. Requires an active Premium plan.
 *     tags:
 *       - AI Tools
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - resume
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume document in PDF, DOC, or DOCX format (Max 5MB)
 *     responses:
 *       200:
 *         description: Resume reviewed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Resume reviewed successfully"
 *                 review:
 *                   type: string
 *                   example: "## ATS Score: 85/100\n\n### Key Strengths..."
 *                 plan:
 *                   type: string
 *                   example: "premium"
 *       400:
 *         description: Missing resume file, oversized file (>5MB), or unsupported format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Premium-only feature
 *       500:
 *         description: AI model or text extraction error
 */
aiRouter.post("/resume-review", upload.single("resume"), auth, resumeReview);

export default aiRouter;

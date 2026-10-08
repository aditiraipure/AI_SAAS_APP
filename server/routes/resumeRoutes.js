import express from "express";
import {
  analyzeResumeAts,
  createResume,
  deleteResume,
  expandAbbreviation,
  exportResume,
  generateResumeContent,
  getResumeById,
  getUserResumes,
  improveDraftSection,
  improveResumeSection,
  updateResume,
} from "../controllers/resumeController.js";
import { auth } from "../middleware/auth.js";
import {
  aiRateLimiter,
  validateAiInputMiddleware,
} from "../security/promptSecurity.js";

const resumeRouter = express.Router();

/**
 * @openapi
 * /api/resumes:
 *   post:
 *     summary: Create a new resume draft
 *     description: Initializes a new resume draft owned by the authenticated user.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetRole:
 *                 type: string
 *                 example: "Full Stack Developer"
 *               template:
 *                 type: string
 *                 enum: [modern, classic, minimal, professional]
 *                 example: "modern"
 *               personalInfo:
 *                 type: object
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     example: "Aditi Raipure"
 *                   email:
 *                     type: string
 *                     example: "aditi@example.com"
 *     responses:
 *       201:
 *         description: Resume created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 *   get:
 *     summary: Get all resumes for the authenticated user
 *     description: Returns a list of all resume drafts and completed resumes belonging to the user.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of resumes retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */
resumeRouter.post("/", auth, createResume);
resumeRouter.get("/", auth, getUserResumes);

/**
 * @openapi
 * /api/resumes/{id}:
 *   get:
 *     summary: Get a resume by ID
 *     description: Fetches complete resume details for the authenticated user.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The MongoDB ObjectId of the resume
 *     responses:
 *       200:
 *         description: Resume details retrieved
 *       404:
 *         description: Resume not found or unauthorized
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update a resume
 *     description: Updates resume fields, sections, target role, template, or draft status.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Resume updated successfully
 *       404:
 *         description: Resume not found or unauthorized
 *   delete:
 *     summary: Delete a resume
 *     description: Deletes a resume owned by the authenticated user.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resume deleted successfully
 *       404:
 *         description: Resume not found or unauthorized
 */
resumeRouter.get("/:id", auth, getResumeById);
resumeRouter.put("/:id", auth, updateResume);
resumeRouter.delete("/:id", auth, deleteResume);

/**
 * @openapi
 * /api/resumes/{id}/generate:
 *   post:
 *     summary: AI Generation & Tailoring
 *     description: Generates or refines resume sections (summary, experience bullets, project achievements, skill categorization) without hallucinating unprovided facts.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobDescription:
 *                 type: string
 *                 example: "Looking for a Full Stack Developer experienced with React, Node.js, and MongoDB..."
 *               targetRole:
 *                 type: string
 *                 example: "Senior Full Stack Engineer"
 *               save:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Resume generated and updated successfully
 *       404:
 *         description: Resume not found
 *       500:
 *         description: AI generation failed
 */
resumeRouter.post(
  "/:id/generate",
  auth,
  aiRateLimiter({ endpointName: "generate_resume", limit: 20 }),
  generateResumeContent
);

/**
 * @openapi
 * /api/resumes/{id}/improve:
 *   post:
 *     summary: AI Section Improvement
 *     description: Improves a specific section (summary, experience bullets, projects, skills, achievements) using action verbs and clarity.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - section
 *             properties:
 *               section:
 *                 type: string
 *                 enum: [summary, experience, projects, skills, achievements]
 *               targetRole:
 *                 type: string
 *               jobDescription:
 *                 type: string
 *               save:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Section improved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Missing or invalid section
 *       404:
 *         description: Resume not found
 */
resumeRouter.post(
  "/improve",
  auth,
  aiRateLimiter({ endpointName: "improve_draft", limit: 30 }),
  validateAiInputMiddleware({ maxPromptLength: 5000, requiredFields: ["section"] }),
  improveDraftSection
);

resumeRouter.post(
  "/:id/improve",
  auth,
  aiRateLimiter({ endpointName: "improve_section", limit: 30 }),
  validateAiInputMiddleware({ maxPromptLength: 5000, requiredFields: ["section"] }),
  improveResumeSection
);

const optionalAuth = (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization !== "Bearer null" &&
    req.headers.authorization !== "Bearer undefined"
  ) {
    return auth(req, res, next);
  }
  next();
};

resumeRouter.post(
  "/expand-abbreviation",
  optionalAuth,
  aiRateLimiter({ endpointName: "expand_abbreviation", limit: 60 }),
  validateAiInputMiddleware({ maxPromptLength: 500, requiredFields: [] }),
  expandAbbreviation
);

/**
 * @openapi
 * /api/resumes/{id}/ats-analysis:
 *   post:
 *     summary: ATS Compatibility Analysis
 *     description: Evaluates resume content against a job description, returning an internal ATS score (0-100), matched keywords, missing keywords, and actionable recommendations.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobDescription:
 *                 type: string
 *                 example: "Job description text to evaluate match against..."
 *     responses:
 *       200:
 *         description: ATS analysis generated and saved
 *       400:
 *         description: Missing job description
 *       404:
 *         description: Resume not found
 */
resumeRouter.post(
  "/:id/ats-analysis",
  auth,
  aiRateLimiter({ endpointName: "ats_analysis", limit: 25 }),
  analyzeResumeAts
);

/**
 * @openapi
 * /api/resumes/{id}/export:
 *   post:
 *     summary: Export Resume to PDF or DOCX
 *     description: Generates a binary document download (PDF via PDFKit or DOCX via docx) styled according to the selected template.
 *     tags:
 *       - Resume Builder
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [pdf, docx]
 *                 default: pdf
 *               template:
 *                 type: string
 *                 enum: [modern, classic, minimal, professional]
 *     responses:
 *       200:
 *         description: Binary PDF or DOCX stream
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid format specified
 *       404:
 *         description: Resume not found
 */
resumeRouter.post("/:id/export", auth, exportResume);

export default resumeRouter;

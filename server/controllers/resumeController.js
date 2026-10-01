import mongoose from "mongoose";
import Resume from "../models/resumeModel.js";
import {
  buildAtsAnalysisPrompt,
  buildResumeGenerationPrompt,
  buildSectionImprovementPrompt,
} from "../prompts/resumePrompts.js";
import { callGeminiJson } from "../services/resumeAiService.js";
import {
  generateResumeDocx,
  generateResumePdf,
} from "../services/resumeExportService.js";

const VALID_TEMPLATES = ["modern", "classic", "minimal", "professional"];
const VALID_STATUSES = ["draft", "completed"];
const VALID_IMPROVEMENT_SECTIONS = [
  "summary",
  "experience",
  "experienceBullets",
  "projects",
  "projectDescription",
  "skills",
  "achievements",
];

/**
 * Create a new resume draft
 * POST /api/resumes
 */
export const createResume = async (req, res) => {
  try {
    const { userId } = req;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in to create a resume.",
      });
    }

    const {
      personalInfo = {},
      targetRole = "",
      summary = "",
      education = [],
      experience = [],
      projects = [],
      skills = {},
      achievements = [],
      certifications = [],
      template = "modern",
      jobDescription = "",
      status = "draft",
    } = req.body;

    const validatedTemplate = VALID_TEMPLATES.includes(template)
      ? template
      : "modern";
    const validatedStatus = VALID_STATUSES.includes(status) ? status : "draft";

    const newResume = await Resume.create({
      userId,
      personalInfo: {
        fullName: personalInfo.fullName || req.userName || "",
        email: personalInfo.email || "",
        phone: personalInfo.phone || "",
        location: personalInfo.location || "",
        linkedin: personalInfo.linkedin || "",
        github: personalInfo.github || "",
        portfolio: personalInfo.portfolio || "",
      },
      targetRole,
      summary,
      education,
      experience,
      projects,
      skills,
      achievements,
      certifications,
      template: validatedTemplate,
      jobDescription,
      status: validatedStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Resume draft created successfully",
      resume: newResume,
    });
  } catch (error) {
    console.error("Create resume error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create resume",
      error: error.message,
    });
  }
};

/**
 * Get all resumes belonging to the authenticated user
 * GET /api/resumes
 */
export const getUserResumes = async (req, res) => {
  try {
    const { userId } = req;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in to access resumes.",
      });
    }

    const resumes = await Resume.find({ userId }).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Resumes retrieved successfully",
      count: resumes.length,
      resumes,
    });
  } catch (error) {
    console.error("Get user resumes error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve resumes",
      error: error.message,
    });
  }
};

/**
 * Get a single resume by ID with strict ownership validation
 * GET /api/resumes/:id
 */
export const getResumeById = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findOne({ _id: id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or you do not have permission to access it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume retrieved successfully",
      resume,
    });
  } catch (error) {
    console.error("Get single resume error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve resume",
      error: error.message,
    });
  }
};

/**
 * Update a resume by ID with ownership verification
 * PUT /api/resumes/:id
 */
export const updateResume = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findOne({ _id: id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or you do not have permission to modify it.",
      });
    }

    const {
      personalInfo,
      targetRole,
      summary,
      education,
      experience,
      projects,
      skills,
      achievements,
      certifications,
      template,
      jobDescription,
      status,
    } = req.body;

    if (personalInfo !== undefined) resume.personalInfo = personalInfo;
    if (targetRole !== undefined) resume.targetRole = targetRole;
    if (summary !== undefined) resume.summary = summary;
    if (education !== undefined) resume.education = education;
    if (experience !== undefined) resume.experience = experience;
    if (projects !== undefined) resume.projects = projects;
    if (skills !== undefined) resume.skills = skills;
    if (achievements !== undefined) resume.achievements = achievements;
    if (certifications !== undefined) resume.certifications = certifications;
    if (jobDescription !== undefined) resume.jobDescription = jobDescription;

    if (template !== undefined) {
      if (!VALID_TEMPLATES.includes(template)) {
        return res.status(400).json({
          success: false,
          message: `Invalid template. Supported templates: ${VALID_TEMPLATES.join(", ")}`,
        });
      }
      resume.template = template;
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Supported statuses: ${VALID_STATUSES.join(", ")}`,
        });
      }
      resume.status = status;
    }

    await resume.save();

    return res.status(200).json({
      success: true,
      message: "Resume updated successfully",
      resume,
    });
  } catch (error) {
    console.error("Update resume error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update resume",
      error: error.message,
    });
  }
};

/**
 * Delete a resume by ID with ownership verification
 * DELETE /api/resumes/:id
 */
export const deleteResume = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const deletedResume = await Resume.findOneAndDelete({ _id: id, userId });

    if (!deletedResume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or you do not have permission to delete it.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume deleted successfully",
      id,
    });
  } catch (error) {
    console.error("Delete resume error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete resume",
      error: error.message,
    });
  }
};

/**
 * Generate / refine full resume content using AI based on provided user facts
 * POST /api/resumes/:id/generate
 */
export const generateResumeContent = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findOne({ _id: id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or unauthorized.",
      });
    }

    const resumeObj = resume.toObject();
    const { systemInstruction, userPrompt } = buildResumeGenerationPrompt(resumeObj);
    const aiResult = await callGeminiJson(systemInstruction, userPrompt, 3000, 0.3);

    // Merge AI generated content safely without overriding user metadata or IDs
    if (aiResult.summary && typeof aiResult.summary === "string") {
      resume.summary = aiResult.summary.trim();
    }

    if (Array.isArray(aiResult.experience) && aiResult.experience.length > 0) {
      resume.experience = aiResult.experience.map((exp, idx) => ({
        ...exp,
        _id: resume.experience[idx]?._id || new mongoose.Types.ObjectId(),
      }));
    }

    if (Array.isArray(aiResult.projects) && aiResult.projects.length > 0) {
      resume.projects = aiResult.projects.map((proj, idx) => ({
        ...proj,
        _id: resume.projects[idx]?._id || new mongoose.Types.ObjectId(),
      }));
    }

    if (Array.isArray(aiResult.achievements) && aiResult.achievements.length > 0) {
      resume.achievements = aiResult.achievements.map((ach, idx) => ({
        ...ach,
        _id: resume.achievements[idx]?._id || new mongoose.Types.ObjectId(),
      }));
    }

    if (aiResult.skills && typeof aiResult.skills === "object") {
      resume.skills = {
        ...resume.skills,
        ...aiResult.skills,
      };
    }

    await resume.save();

    return res.status(200).json({
      success: true,
      message: "Resume content generated and refined successfully",
      resume,
    });
  } catch (error) {
    console.error("Generate resume AI error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to generate resume content via AI.",
      error: error.message,
    });
  }
};

/**
 * Improve a specific draft section of a resume before saving
 * POST /api/resumes/improve
 */
export const improveDraftSection = async (req, res) => {
  try {
    const { userId } = req;
    const { section, sectionData = {}, content, context = {} } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    const targetSection = section || "summary";
    if (!VALID_IMPROVEMENT_SECTIONS.includes(targetSection)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section. Supported sections: ${VALID_IMPROVEMENT_SECTIONS.join(", ")}`,
      });
    }

    const rawData = content !== undefined ? content : sectionData;

    const { systemInstruction, userPrompt } = buildSectionImprovementPrompt(
      targetSection,
      rawData,
      context
    );

    const aiResult = await callGeminiJson(systemInstruction, userPrompt, 2500, 0.3);
    const improvedData = aiResult[targetSection] !== undefined ? aiResult[targetSection] : aiResult;

    return res.status(200).json({
      success: true,
      message: `Section '${targetSection}' improved successfully`,
      section: targetSection,
      improvedData,
    });
  } catch (error) {
    console.error("Improve draft section error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to improve section via AI.",
      error: error.message,
    });
  }
};

/**
 * Improve a specific section of the resume using AI
 * POST /api/resumes/:id/improve
 */
export const improveResumeSection = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { section, content, sectionData, context = {} } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    // Handle draft improvement if id is 'improve'
    if (id === "improve") {
      return improveDraftSection(req, res);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    if (!section || !VALID_IMPROVEMENT_SECTIONS.includes(section)) {
      return res.status(400).json({
        success: false,
        message: `Invalid section. Supported sections: ${VALID_IMPROVEMENT_SECTIONS.join(", ")}`,
      });
    }

    const resume = await Resume.findOne({ _id: id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or unauthorized.",
      });
    }

    const rawData = content !== undefined ? content : sectionData !== undefined ? sectionData : resume[section];

    const { systemInstruction, userPrompt } = buildSectionImprovementPrompt(
      section,
      rawData,
      {
        targetRole: resume.targetRole,
        jobDescription: resume.jobDescription,
        ...context,
      }
    );

    const aiResult = await callGeminiJson(systemInstruction, userPrompt, 2500, 0.3);

    const improvedData = aiResult[section] !== undefined ? aiResult[section] : aiResult;

    // Apply improved section safely if standard schema field
    if (section === "summary" && typeof improvedData === "string") {
      resume.summary = improvedData.trim();
    } else if (section === "summary" && improvedData?.summary) {
      resume.summary = improvedData.summary.trim();
    } else if (section === "skills" && typeof improvedData === "object") {
      resume.skills = { ...resume.skills, ...improvedData };
    } else if (Array.isArray(improvedData) && Array.isArray(resume[section])) {
      resume[section] = improvedData;
    }

    await resume.save();

    return res.status(200).json({
      success: true,
      message: `Section '${section}' improved successfully`,
      section,
      improvedData,
      improvedContent: resume[section],
      resume,
    });
  } catch (error) {
    console.error("Improve resume section error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to improve section via AI.",
      error: error.message,
    });
  }
};

/**
 * Analyze resume against a Job Description for ATS compatibility
 * POST /api/resumes/:id/ats-analysis
 */
export const analyzeResumeAts = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const { jobDescription } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findOne({ _id: id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or unauthorized.",
      });
    }

    const targetJobDesc = jobDescription || resume.jobDescription;

    if (!targetJobDesc || !targetJobDesc.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please provide a job description to perform ATS analysis.",
      });
    }

    const { systemInstruction, userPrompt } = buildAtsAnalysisPrompt(
      resume.toObject(),
      targetJobDesc.trim()
    );

    const aiResult = await callGeminiJson(systemInstruction, userPrompt, 2000, 0.2);

    const rawScore = Number(aiResult?.score);
    if (!aiResult || !Number.isFinite(rawScore)) {
      return res.status(502).json({
        success: false,
        message: "AI service was unable to evaluate ATS score for this resume. Please try again later.",
      });
    }

    const score = Math.min(100, Math.max(0, Math.round(rawScore)));

    resume.atsAnalysis = {
      score,
      matchedKeywords: Array.isArray(aiResult.matchedKeywords) ? aiResult.matchedKeywords : [],
      missingKeywords: Array.isArray(aiResult.missingKeywords) ? aiResult.missingKeywords : [],
      suggestions: Array.isArray(aiResult.suggestions) ? aiResult.suggestions : [],
      analyzedAt: new Date(),
    };

    if (jobDescription && jobDescription.trim()) {
      resume.jobDescription = jobDescription.trim();
    }

    await resume.save();

    return res.status(200).json({
      success: true,
      message: "ATS analysis completed successfully",
      atsAnalysis: resume.atsAnalysis,
      resume,
    });
  } catch (error) {
    console.error("ATS analysis error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to perform ATS analysis.",
      error: error.message,
    });
  }
};

/**
 * Export resume to PDF or DOCX format respecting selected template
 * POST /api/resumes/:id/export
 */
export const exportResume = async (req, res) => {
  try {
    const { userId } = req;
    const { id } = req.params;
    const format = (req.body?.format || req.query?.format || "pdf").toLowerCase();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please sign in.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid resume ID format.",
      });
    }

    const resume = await Resume.findOne({ _id: id, userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found or unauthorized.",
      });
    }

    const safeName = (resume.personalInfo?.fullName || "Resume")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();

    if (format === "docx") {
      const docxBuffer = await generateResumeDocx(resume);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}_resume.docx"`
      );
      return res.send(docxBuffer);
    }

    // Default to PDF format
    const pdfBuffer = await generateResumePdf(resume);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_resume.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Export resume error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to export resume.",
      error: error.message,
    });
  }
};

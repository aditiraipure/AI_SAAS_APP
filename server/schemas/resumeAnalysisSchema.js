import { z } from "zod";

/**
 * Zod schema for individual ATS breakdown categories
 */
export const resumeBreakdownCategorySchema = z.object({
  score: z.coerce.number().min(0).max(100),
  notes: z.string().default(""),
});

/**
 * =========================================================================
 * INFORMATION EXTRACTION SCHEMAS (Phase 2 — Step 3)
 * Transforms raw unstructured resume text into a context-aware structured object.
 * =========================================================================
 */

export const resumeExperienceItemSchema = z.object({
  company: z.string().default(""),
  role: z.string().default(""),
  duration: z.string().default(""),
  location: z.string().optional().default(""),
  responsibilities: z.array(z.string()).default([]),
  technologies: z.array(z.string()).optional().default([]),
});

export const resumeProjectItemSchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  technologies: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).optional().default([]),
  url: z.string().optional().default(""),
});

export const resumeEducationItemSchema = z.object({
  degree: z.string().default(""),
  institution: z.string().default(""),
  duration: z.string().default(""),
  location: z.string().optional().default(""),
  grade: z.string().default(""),
});

/**
 * Comprehensive Zod Schema for Structured Information Extraction
 */
export const resumeInformationExtractionSchema = z.object({
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(resumeExperienceItemSchema).default([]),
  projects: z.array(resumeProjectItemSchema).default([]),
  education: z.array(resumeEducationItemSchema).default([]),
  certifications: z.array(z.union([z.string(), z.record(z.any())])).default([]),
  achievements: z.array(z.union([z.string(), z.record(z.any())])).default([]),
  otherSections: z.record(z.any()).optional().default({}),
});

/**
 * Safe parser for Information Extraction output with sanitization and guaranteed defaults
 */
export const safeParseExtractedResumeInfo = (rawData) => {
  if (!rawData) {
    return {
      summary: "",
      skills: [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      achievements: [],
    };
  }

  let dataToParse = rawData;
  if (typeof rawData === "string") {
    try {
      dataToParse = JSON.parse(rawData);
    } catch {
      return {
        summary: rawData.slice(0, 500),
        skills: [],
        experience: [],
        projects: [],
        education: [],
        certifications: [],
        achievements: [],
      };
    }
  }

  const result = resumeInformationExtractionSchema.safeParse(dataToParse);
  if (result.success) {
    return result.data;
  }

  // Graceful fallback if strict parse fails: sanitize and extract available keys
  const obj = typeof dataToParse === "object" && dataToParse !== null ? dataToParse : {};
  return {
    summary: typeof obj.summary === "string" ? obj.summary : "",
    skills: Array.isArray(obj.skills) ? obj.skills.map(String) : [],
    experience: Array.isArray(obj.experience)
      ? obj.experience.map((exp) => ({
          company: typeof exp.company === "string" ? exp.company : "",
          role: typeof exp.role === "string" ? exp.role : "",
          duration: typeof exp.duration === "string" ? exp.duration : "",
          location: typeof exp.location === "string" ? exp.location : "",
          responsibilities: Array.isArray(exp.responsibilities)
            ? exp.responsibilities.map(String)
            : [],
          technologies: Array.isArray(exp.technologies)
            ? exp.technologies.map(String)
            : [],
        }))
      : [],
    projects: Array.isArray(obj.projects)
      ? obj.projects.map((proj) => ({
          name: typeof proj.name === "string" ? proj.name : "",
          description: typeof proj.description === "string" ? proj.description : "",
          technologies: Array.isArray(proj.technologies)
            ? proj.technologies.map(String)
            : [],
          responsibilities: Array.isArray(proj.responsibilities)
            ? proj.responsibilities.map(String)
            : [],
          url: typeof proj.url === "string" ? proj.url : "",
        }))
      : [],
    education: Array.isArray(obj.education)
      ? obj.education.map((edu) => ({
          degree: typeof edu.degree === "string" ? edu.degree : "",
          institution: typeof edu.institution === "string" ? edu.institution : "",
          duration: typeof edu.duration === "string" ? edu.duration : "",
          location: typeof edu.location === "string" ? edu.location : "",
          grade: typeof edu.grade === "string" ? edu.grade : "",
        }))
      : [],
    certifications: Array.isArray(obj.certifications) ? obj.certifications : [],
    achievements: Array.isArray(obj.achievements) ? obj.achievements : [],
  };
};

/**
 * =========================================================================
 * RESUME CHUNKING SCHEMAS (Phase 2 — Step 4)
 * Section-aware semantic chunk representation for embedding & vector storage.
 * =========================================================================
 */

export const resumeChunkMetadataSchema = z.object({
  section: z.enum([
    "summary",
    "skills",
    "experience",
    "project",
    "education",
    "certification",
    "achievement",
    "other",
  ]),
  company: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  technologies: z.array(z.string()).optional().default([]),
  degree: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  chunkIndex: z.number().int().min(0).default(0),
  totalChunksInSection: z.number().int().min(1).default(1),
  itemIndex: z.number().int().min(0).optional(),
});

export const resumeChunkSchema = z.object({
  chunkId: z.string().min(1),
  resumeId: z.string().default(""),
  section: z.enum([
    "summary",
    "skills",
    "experience",
    "project",
    "education",
    "certification",
    "achievement",
    "other",
  ]),
  content: z.string().min(1),
  metadata: resumeChunkMetadataSchema,
  embedding: z.array(z.number()).optional(),
});

/**
 * Zod Schema strictly enforcing 768-dimensional vector embedding
 */
export const resumeEmbeddedChunkSchema = resumeChunkSchema.extend({
  embedding: z.array(z.number()).length(768),
});

/**
 * Safe parser for individual resume chunk
 */
export const safeParseResumeChunk = (rawChunk) => {
  return resumeChunkSchema.safeParse(rawChunk);
};

/**
 * Safe parser for array of resume chunks
 */
export const safeParseResumeChunks = (rawChunks) => {
  if (!Array.isArray(rawChunks)) return [];
  return rawChunks
    .map((c) => {
      const res = resumeChunkSchema.safeParse(c);
      return res.success ? res.data : null;
    })
    .filter(Boolean);
};

/**
 * Safe parser for individual embedded resume chunk (validates 768-d embedding)
 */
export const safeParseEmbeddedResumeChunk = (rawChunk) => {
  return resumeEmbeddedChunkSchema.safeParse(rawChunk);
};

/**
 * Safe parser for array of embedded resume chunks
 */
export const safeParseEmbeddedResumeChunks = (rawChunks) => {
  if (!Array.isArray(rawChunks)) return [];
  return rawChunks
    .map((c) => {
      const res = resumeEmbeddedChunkSchema.safeParse(c);
      return res.success ? res.data : null;
    })
    .filter(Boolean);
};


/**
 * =========================================================================
 * RESUME REVIEW & ATS ANALYSIS SCHEMA
 * =========================================================================
 */
export const resumeAnalysisSchema = z.object({
  atsScore: z.coerce.number().min(0).max(100),
  summary: z.string().min(1, "Summary is required"),
  breakdown: z.object({
    formatting: resumeBreakdownCategorySchema,
    keywords: resumeBreakdownCategorySchema,
    impact: resumeBreakdownCategorySchema,
    roleRelevance: resumeBreakdownCategorySchema,
  }),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  missingKeywords: z.array(z.string()).optional().default([]),
  topKeywords: z.array(z.string()).optional().default([]),
  matchedSkills: z.array(z.string()).optional().default([]),
  missingSkills: z.array(z.string()).optional().default([]),
  improvements: z.array(z.string()).optional().default([]),
  actionPlan: z.array(z.string()).optional().default([]),
});

/**
 * Converts a validated structured Resume Analysis JSON into beautiful,
 * readable Markdown for the existing UI and Creation history.
 */
export const formatResumeAnalysisMarkdown = (data) => {
  if (!data) return "";

  const {
    atsScore,
    summary,
    breakdown,
    strengths,
    weaknesses,
    recommendations,
    missingKeywords,
    topKeywords,
    matchedSkills,
    missingSkills,
    improvements,
    actionPlan,
  } = data;

  const sections = [];

  // 1. ATS Score Header
  sections.push(
    `## 🎯 ATS Score: ${atsScore}/100\n*AI-estimated ATS compatibility score based on content structure, keyword density, and technical impact.*`
  );

  // 2. Executive Summary
  if (summary) {
    sections.push(`### 📋 Executive Summary\n${summary}`);
  }

  // 3. Score Breakdown
  if (breakdown) {
    const formatting = breakdown.formatting || { score: 70, notes: "" };
    const keywords = breakdown.keywords || { score: 70, notes: "" };
    const impact = breakdown.impact || { score: 70, notes: "" };
    const roleRelevance = breakdown.roleRelevance || { score: 70, notes: "" };

    sections.push(
      `### 📊 Score Breakdown\n` +
        `- **Formatting & Structure (${formatting.score}/100):** ${formatting.notes || "Clean layout and section hierarchy."}\n` +
        `- **Keyword Optimization (${keywords.score}/100):** ${keywords.notes || "Industry keyword coverage."}\n` +
        `- **Content & Impact (${impact.score}/100):** ${impact.notes || "Action verbs and quantifiable metrics."}\n` +
        `- **Role Relevance (${roleRelevance.score}/100):** ${roleRelevance.notes || "Alignment with industry role standards."}`
    );
  }

  // 4. Matched & Missing Skills
  const matched = matchedSkills || topKeywords || [];
  const missing = missingSkills || missingKeywords || [];
  if (matched.length > 0 || missing.length > 0) {
    const skillParts = [];
    if (matched.length > 0) {
      skillParts.push(`**Matched Skills:** ${matched.map((s) => `\`${s}\``).join(" • ")}`);
    }
    if (missing.length > 0) {
      skillParts.push(`**Missing Skills:** ${missing.map((s) => `\`${s}\``).join(" • ")}`);
    }
    sections.push(`### 🛠️ Skills & Keywords Analysis\n` + skillParts.join("\n\n"));
  }

  // 5. Key Strengths
  if (Array.isArray(strengths) && strengths.length > 0) {
    sections.push(
      `### ✅ Key Strengths\n` + strengths.map((s) => `- ${s}`).join("\n")
    );
  }

  // 6. Weaknesses / Areas for Improvement
  if (Array.isArray(weaknesses) && weaknesses.length > 0) {
    sections.push(
      `### ⚠️ Areas of Improvement\n` +
        weaknesses.map((w) => `- ${w}`).join("\n")
    );
  }

  // 7. Actionable Recommendations / Improvements
  const allImprovements = improvements && improvements.length > 0 ? improvements : recommendations;
  if (Array.isArray(allImprovements) && allImprovements.length > 0) {
    sections.push(
      `### 💡 Actionable Recommendations\n` +
        allImprovements.map((r) => `- ${r}`).join("\n")
    );
  }

  // 8. Step-by-Step Improvement Plan
  if (Array.isArray(actionPlan) && actionPlan.length > 0) {
    sections.push(
      `### 🚀 Step-by-Step Improvement Plan\n` +
        actionPlan.map((step, idx) => `${idx + 1}. ${step}`).join("\n")
    );
  }

  return sections.join("\n\n---\n\n");
};

/**
 * Safe parser helper with automatic type coercion and default fallbacks
 */
export const safeParseResumeAnalysis = (rawData) => {
  return resumeAnalysisSchema.safeParse(rawData);
};

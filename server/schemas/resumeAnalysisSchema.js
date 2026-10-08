import { z } from "zod";

/**
 * Zod schema for individual ATS breakdown categories
 */
export const resumeBreakdownCategorySchema = z.object({
  score: z.coerce.number().min(0).max(100),
  notes: z.string().default(""),
});

/**
 * Comprehensive Zod Schema for Structured Resume Review
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

  // 4. Key Strengths
  if (Array.isArray(strengths) && strengths.length > 0) {
    sections.push(
      `### ✅ Key Strengths\n` + strengths.map((s) => `- ${s}`).join("\n")
    );
  }

  // 5. Weaknesses / Areas for Improvement
  if (Array.isArray(weaknesses) && weaknesses.length > 0) {
    sections.push(
      `### ⚠️ Areas of Improvement\n` +
        weaknesses.map((w) => `- ${w}`).join("\n")
    );
  }

  // 6. Actionable Recommendations
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    sections.push(
      `### 💡 Actionable Recommendations\n` +
        recommendations.map((r) => `- ${r}`).join("\n")
    );
  }

  // 7. Missing & Recommended Keywords
  const combinedKeywords = [
    ...(missingKeywords || []),
    ...(topKeywords || []),
  ];
  if (combinedKeywords.length > 0) {
    const uniqueKeywords = Array.from(new Set(combinedKeywords));
    sections.push(
      `### 🔍 Top Recruiter & Search Keywords\n` +
        uniqueKeywords.map((k) => `\`${k}\``).join(" • ")
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

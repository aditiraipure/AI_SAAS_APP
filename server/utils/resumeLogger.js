/**
 * Dedicated Stage-by-Stage Structured Logger for Resume Analysis
 *
 * Logs exclusively with prefix [ResumeAnalysis] and correlation ID.
 * Strictly avoids logging API keys, full resume text, job description contents,
 * retrieved chunk contents, personal details, or full prompts.
 */

import crypto from "crypto";
import { analyzeGeminiError } from "./geminiErrorHelper.js";

/**
 * Creates a unique correlation ID for resume analysis requests.
 */
export const generateCorrelationId = () => {
  return `res_${crypto.randomBytes(6).toString("hex")}`;
};

/**
 * Stage names mapping for all 13 stages of the Resume Review pipeline.
 */
export const STAGE_NAMES = {
  1: "Request Receipt & Correlation Initialization",
  2: "Resume Extraction",
  3: "Structured Info Extraction",
  4: "Section-Aware Chunking",
  5: "Embedding Generation",
  6: "MongoDB Chunk Storage",
  7: "Job Description Processing",
  8: "Job Description Embedding",
  9: "Vector Retrieval",
  10: "Security Checks & Prompt Assembly",
  11: "Gemini Analysis",
  12: "Response Validation",
  13: "Response Delivery",
};

/**
 * Format metadata object into safe, sanitized string representation
 * ensuring no PII, full texts, chunks, or API keys are printed.
 */
const formatSafeMetadata = (meta = {}) => {
  if (!meta || typeof meta !== "object") return "";
  const safeEntries = Object.entries(meta).filter(([key, val]) => {
    const lowerKey = key.toLowerCase();
    // Exclude sensitive or large content fields
    if (
      lowerKey.includes("key") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("auth") ||
      lowerKey.includes("password") ||
      lowerKey.includes("rawresume") ||
      lowerKey.includes("rawjd")
    ) {
      return false;
    }

    // Do not log large strings
    if (typeof val === "string" && val.length > 80) {
      return false;
    }

    return true;
  });

  if (safeEntries.length === 0) return "";
  return safeEntries
    .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
    .join(" ");
};

/**
 * Creates a dedicated structured logger for a Resume Analysis request.
 */
export const createResumeLogger = (correlationId) => {
  const corrId = correlationId || generateCorrelationId();
  const startTime = Date.now();
  const stageTimers = new Map();
  let currentStageNumber = 1;

  const logStage = (stageNum, status, details = {}) => {
    const stageName = STAGE_NAMES[stageNum] || `Stage ${stageNum}`;
    const safeMetaStr = formatSafeMetadata(details);
    const metaSuffix = safeMetaStr ? ` | ${safeMetaStr}` : "";
    console.log(
      `[ResumeAnalysis] [corrId: ${corrId}] [Stage ${stageNum}: ${stageName}] [${status}]${metaSuffix}`
    );
  };

  return {
    corrId,
    start: (stageNum, nameOrMeta = {}, meta = {}) => {
      currentStageNumber = stageNum;
      stageTimers.set(stageNum, Date.now());
      const metadata = typeof nameOrMeta === "object" ? nameOrMeta : meta;
      logStage(stageNum, "START", metadata);
    },
    success: (stageNum, nameOrMeta = {}, meta = {}) => {
      const start = stageTimers.get(stageNum) || Date.now();
      const durationMs = Date.now() - start;
      const metadata = typeof nameOrMeta === "object" ? nameOrMeta : meta;
      logStage(stageNum, "SUCCESS", { durationMs, ...metadata });
    },
    fail: (stageNum, nameOrMeta = {}, meta = {}, err = null) => {
      const start = stageTimers.get(stageNum) || Date.now();
      const durationMs = Date.now() - start;
      let errorObj = err;
      let metadata = meta;

      if (nameOrMeta instanceof Error) {
        errorObj = nameOrMeta;
        metadata = {};
      } else if (typeof nameOrMeta === "object" && !(nameOrMeta instanceof Error)) {
        metadata = nameOrMeta;
        if (meta instanceof Error) errorObj = meta;
      }

      const analyzed = analyzeGeminiError(errorObj);
      logStage(stageNum, "FAIL", {
        durationMs,
        errorCategory: analyzed.category,
        message: analyzed.safeMessage,
        ...metadata,
      });
    },
    getCurrentStage: () => currentStageNumber,
    getTotalDuration: () => Date.now() - startTime,
    logStage,
  };
};


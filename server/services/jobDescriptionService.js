/**
 * Job Description Processing Service (Phase 2 — Step 8)
 * Validates, normalizes, and embeds target job descriptions
 * into 768-dimensional query vectors for vector search and ATS analysis.
 */

import {
  detectPromptInjection,
  logSecurityEvent,
  sanitizeUntrustedText,
} from "../security/promptSecurity.js";
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
  generateChunkEmbedding,
} from "./resumeEmbeddingService.js";
import {
  searchSimilarResumeChunks,
  validateQueryVector,
} from "./resumeVectorSearchService.js";

export const MIN_JD_LENGTH = 20;
export const MAX_JD_LENGTH = 10000;

/**
 * Normalizes job description text: removes control chars, trims,
 * and collapses excessive blank lines while preserving all technical requirements.
 */
export const normalizeJobDescription = (text = "") => {
  if (!text || typeof text !== "string") return "";

  // 1. Sanitize control characters, zero-width spaces, and spoofed delimiters
  const sanitized = sanitizeUntrustedText(text, MAX_JD_LENGTH);

  // 2. Normalize whitespace (collapse multiple tabs/spaces while preserving sentence breaks)
  return sanitized
    .replace(/[ \t]+/g, " ")
    .replace(/(\r\n|\r|\n){3,}/g, "\n\n")
    .trim();
};

/**
 * Validates a job description against minimum and maximum length bounds.
 */
export const validateJobDescription = (text) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    return {
      isValid: false,
      error: "Job description is required and cannot be empty.",
    };
  }

  const normalized = normalizeJobDescription(text);

  if (normalized.length < MIN_JD_LENGTH) {
    return {
      isValid: false,
      error: `Job description is too short (${normalized.length} chars). Please provide at least ${MIN_JD_LENGTH} characters of role requirements.`,
    };
  }

  if (text.length > MAX_JD_LENGTH) {
    return {
      isValid: false,
      error: `Job description exceeds maximum allowed length of ${MAX_JD_LENGTH} characters.`,
    };
  }

  return {
    isValid: true,
    normalizedText: normalized,
  };
};

/**
 * Processes a submitted job description:
 * 1. Validates and normalizes text
 * 2. Scans for prompt injection and logs security events
 * 3. Generates a 768-dimensional query embedding matching the resume vector model
 * 4. Preserves the exact job description text for subsequent ATS analysis
 */
export const processJobDescription = async (text, options = {}) => {
  const validation = validateJobDescription(text);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const normalizedText = validation.normalizedText;

  // Security scan for indirect prompt injection inside user-submitted job descriptions
  const scanResult = detectPromptInjection(normalizedText, { isDocument: true });
  if (scanResult.isSuspicious) {
    logSecurityEvent({
      type: "INDIRECT_PROMPT_INJECTION_DETECTED",
      endpoint: options.endpoint || "/api/ai/resume-review",
      userId: options.userId || "anonymous",
      ip: options.ip || "unknown",
      matchedPatterns: scanResult.matchedPatterns,
      riskLevel: scanResult.riskLevel,
      preview: normalizedText.slice(0, 60),
    });
  }

  // Generate 768-d query embedding using the existing Gemini embedding service
  const queryEmbedding = await generateChunkEmbedding(normalizedText, {
    model: EMBEDDING_MODEL,
    dimension: EMBEDDING_DIMENSION,
    aiClient: options.aiClient,
    mockMode: options.mockMode,
  });

  // Validate embedding vector format and length
  const vectorValidation = validateQueryVector(queryEmbedding);
  if (!vectorValidation.isValid) {
    throw new Error(`Generated query embedding is invalid: ${vectorValidation.error}`);
  }

  return {
    rawText: text,
    normalizedText,
    embedding: queryEmbedding,
    model: EMBEDDING_MODEL,
    dimension: EMBEDDING_DIMENSION,
    characterCount: normalizedText.length,
  };
};

/**
 * Bridge helper: processes job description and queries Atlas vector search
 * for top-K most similar resume chunks without code duplication.
 */
export const retrieveResumeChunksForJobDescription = async ({
  jobDescription,
  userId,
  resumeId,
  topK = 5,
  filter = {},
  options = {},
}) => {
  const processedJd = await processJobDescription(jobDescription, options);

  return searchSimilarResumeChunks({
    queryVector: processedJd.embedding,
    userId,
    resumeId,
    topK,
    filter,
    options,
  });
};


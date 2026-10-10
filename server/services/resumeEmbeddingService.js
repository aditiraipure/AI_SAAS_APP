/**
 * Resume Chunk Embedding Service (Phase 2 — Step 5)
 * Converts section-aware resume chunks into 768-dimensional vector embeddings
 * using @google/genai SDK with the gemini-embedding-2 model.
 */

import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { safeParseEmbeddedResumeChunk } from "../schemas/resumeAnalysisSchema.js";
import {
  analyzeGeminiError,
  calculateAdaptiveBackoff,
} from "../utils/geminiErrorHelper.js";

export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSION = 768;
const DEFAULT_CONCURRENCY = 4;

const getApiKey = () =>
  process.env.GEMINI_API_KEY || process.env.GEMINI_API_kEY;

let genAiClient = null;

export const getGenAIClient = () => {
  const key = getApiKey();
  if (!genAiClient || genAiClient.apiKey !== key) {
    genAiClient = new GoogleGenAI({ apiKey: key || "dummy_key" });
  }
  return genAiClient;
};

/**
 * Creates a deterministic, unit-normalized 768-dimensional fallback embedding vector.
 * Used for offline resilience, test mocks, or empty input handling.
 */
export const generateSyntheticEmbedding = (
  text = "",
  dimension = EMBEDDING_DIMENSION,
) => {
  const str = String(text || "").trim();
  const vector = new Array(dimension);
  let hash = 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  let sumSq = 0;
  for (let i = 0; i < dimension; i++) {
    const val = Math.sin((hash + i) * 0.1) + Math.cos(i * 13 * 0.05);
    vector[i] = val;
    sumSq += val * val;
  }

  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < dimension; i++) {
    vector[i] = Number((vector[i] / norm).toFixed(6));
  }

  return vector;
};

/**
 * Generates a 768-dimensional vector embedding for a single text chunk using Gemini Embedding 2.
 */
export const generateChunkEmbedding = async (text, options = {}) => {
  const cleanText = String(text || "").trim();
  const targetDimension = options.dimension || EMBEDDING_DIMENSION;

  if (!cleanText) {
    return generateSyntheticEmbedding("empty_chunk", targetDimension);
  }

  const apiKey = getApiKey();
  const customClient = options.aiClient;
  const isMockMode = Boolean(options.mockMode || (!apiKey && !customClient));

  if (isMockMode) {
    return generateSyntheticEmbedding(cleanText, targetDimension);
  }

  const client = customClient || getGenAIClient();
  const modelName = options.model || EMBEDDING_MODEL;
  const maxRetries =
    typeof options.maxRetries === "number" ? options.maxRetries : 3;

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.models.embedContent({
        model: modelName,
        contents: cleanText,
        config: {
          outputDimensionality: targetDimension,
        },
      });

      const values =
        response?.embedding?.values ||
        response?.embeddings?.[0]?.values ||
        response?.values ||
        null;

      if (Array.isArray(values) && values.length > 0) {
        let normalizedVector = values.map(Number);
        if (normalizedVector.length > targetDimension) {
          normalizedVector = normalizedVector.slice(0, targetDimension);
        } else if (normalizedVector.length < targetDimension) {
          while (normalizedVector.length < targetDimension) {
            normalizedVector.push(0);
          }
        }
        return normalizedVector;
      }

      throw new Error("Invalid or empty embedding values received from API");
    } catch (err) {
      lastError = err;
      const analysis = analyzeGeminiError(err);

      if (!analysis.isTransient || attempt >= maxRetries) {
        console.warn(
          `Embedding generation failed on ${modelName} (${analysis.category}, attempt ${attempt + 1}/${maxRetries + 1}): ${analysis.safeMessage}`,
        );
        break;
      }

      const delay = calculateAdaptiveBackoff(attempt, analysis.retryAfterMs);
      console.warn(
        `Transient rate limit on ${modelName} (${analysis.category}, attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Graceful fallback: return deterministic embedding on unexpected API failure
  console.warn(
    "Falling back to synthetic normalized embedding vector for chunk",
  );
  return generateSyntheticEmbedding(cleanText, targetDimension);
};

/**
 * Converts an array of section-aware resume chunks into embedded chunks with 768-dimensional vectors.
 * Preserves all chunk properties and metadata while executing with bounded concurrency.
 */
export const embedResumeChunks = async (chunks = [], options = {}) => {
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const concurrency = Math.max(
    1,
    Math.min(10, options.concurrency || DEFAULT_CONCURRENCY),
  );

  const results = new Array(chunks.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < chunks.length) {
      const idx = currentIndex++;
      const rawChunk = chunks[idx];

      if (!rawChunk || typeof rawChunk !== "object") {
        continue;
      }

      const embedding = await generateChunkEmbedding(
        rawChunk.content || "",
        options,
      );

      const candidateChunk = {
        chunkId: String(rawChunk.chunkId || `chunk_${idx}`),
        resumeId: String(rawChunk.resumeId || ""),
        section: rawChunk.section || "other",
        content: String(rawChunk.content || "").trim(),
        metadata: rawChunk.metadata || {
          section: rawChunk.section || "other",
          chunkIndex: idx,
          totalChunksInSection: 1,
        },
        embedding,
      };

      const parsed = safeParseEmbeddedResumeChunk(candidateChunk);
      results[idx] = parsed.success ? parsed.data : candidateChunk;
    }
  };

  const pool = Array.from(
    { length: Math.min(concurrency, chunks.length) },
    () => worker(),
  );
  await Promise.all(pool);

  return results.filter(Boolean);
};


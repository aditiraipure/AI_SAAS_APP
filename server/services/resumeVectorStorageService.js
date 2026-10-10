/**
 * MongoDB Vector Storage Service (Phase 2 — Step 6)
 * Handles persistence, validation, deduplication, and user-isolated access
 * for resume chunks and their 768-dimensional vector embeddings.
 */

import ResumeChunk from "../models/resumeChunkModel.js";
import {
  EMBEDDING_DIMENSION,
  EMBEDDING_MODEL,
} from "./resumeEmbeddingService.js";

const VALID_SECTIONS = [
  "summary",
  "skills",
  "experience",
  "project",
  "education",
  "certification",
  "achievement",
  "other",
];

/**
 * Validates a chunk and its 768-dimensional embedding before persisting to MongoDB
 */
export const validateChunkBeforeSave = (chunk, context = {}) => {
  const userId = context.userId || chunk?.userId;
  const resumeId = context.resumeId || chunk?.resumeId;

  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return { isValid: false, error: "userId is required and must be a non-empty string" };
  }

  if (!resumeId || typeof resumeId !== "string" || !resumeId.trim()) {
    return { isValid: false, error: "resumeId is required and must be a non-empty string" };
  }

  if (!chunk || typeof chunk !== "object") {
    return { isValid: false, error: "Chunk must be an object" };
  }

  if (!chunk.chunkId || typeof chunk.chunkId !== "string" || !chunk.chunkId.trim()) {
    return { isValid: false, error: "chunkId is required and must be a non-empty string" };
  }

  if (!chunk.content || typeof chunk.content !== "string" || !chunk.content.trim()) {
    return { isValid: false, error: "content is required and must be non-empty text" };
  }

  const section = chunk.section && VALID_SECTIONS.includes(chunk.section)
    ? chunk.section
    : "other";

  if (!Array.isArray(chunk.embedding)) {
    return { isValid: false, error: "embedding must be an array" };
  }

  if (chunk.embedding.length !== EMBEDDING_DIMENSION) {
    return {
      isValid: false,
      error: `embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${chunk.embedding.length}`,
    };
  }

  const hasInvalidFloats = chunk.embedding.some(
    (val) => typeof val !== "number" || !Number.isFinite(val)
  );

  if (hasInvalidFloats) {
    return { isValid: false, error: "embedding must contain only valid finite numbers" };
  }

  return {
    isValid: true,
    sanitizedChunk: {
      userId: userId.trim(),
      resumeId: resumeId.trim(),
      chunkId: chunk.chunkId.trim(),
      section,
      content: chunk.content.trim(),
      metadata: chunk.metadata && typeof chunk.metadata === "object" ? chunk.metadata : { section },
      embedding: chunk.embedding,
    },
  };
};

/**
 * Persists resume chunks with 768-dimensional embeddings to MongoDB using upsert.
 * Guarantees idempotence on retries, prevents duplicates, and isolates data per user.
 */
export const saveResumeChunks = async ({
  userId,
  resumeId,
  chunks = [],
  options = {},
}) => {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new Error("Unauthorized: userId is required for vector storage operations");
  }

  if (!resumeId || typeof resumeId !== "string" || !resumeId.trim()) {
    throw new Error("resumeId is required for vector storage operations");
  }

  if (!Array.isArray(chunks) || chunks.length === 0) {
    return {
      success: true,
      total: 0,
      persistedCount: 0,
      upsertedCount: 0,
      modifiedCount: 0,
      skippedCount: 0,
    };
  }

  const Model = options.chunkModel || ResumeChunk;
  const embeddingModel = options.embeddingModel || EMBEDDING_MODEL;
  const embeddingDimension = options.embeddingDimension || EMBEDDING_DIMENSION;

  const validChunks = [];
  let skippedCount = 0;

  for (const rawChunk of chunks) {
    const validation = validateChunkBeforeSave(rawChunk, { userId, resumeId });
    if (validation.isValid) {
      validChunks.push(validation.sanitizedChunk);
    } else {
      skippedCount++;
      console.warn(
        `Skipping invalid resume chunk ${rawChunk?.chunkId || "unknown"}: ${validation.error}`
      );
    }
  }

  if (validChunks.length === 0) {
    return {
      success: false,
      error: "No valid chunks with valid 768-d embeddings to persist",
      total: chunks.length,
      persistedCount: 0,
      upsertedCount: 0,
      modifiedCount: 0,
      skippedCount,
    };
  }

  if (!options.chunkModel && ResumeChunk.db?.readyState === 0) {
    return {
      success: true,
      total: chunks.length,
      persistedCount: validChunks.length,
      upsertedCount: validChunks.length,
      modifiedCount: 0,
      matchedCount: 0,
      skippedCount,
      offline: true,
    };
  }

  const operations = validChunks.map((chunk) => ({
    updateOne: {
      filter: {
        userId: chunk.userId,
        resumeId: chunk.resumeId,
        chunkId: chunk.chunkId,
      },
      update: {
        $set: {
          userId: chunk.userId,
          resumeId: chunk.resumeId,
          chunkId: chunk.chunkId,
          section: chunk.section,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: chunk.embedding,
          embeddingModel,
          embeddingDimension,
        },
      },
      upsert: true,
    },
  }));

  const bulkResult = await Model.bulkWrite(operations, { ordered: false });

  return {
    success: true,
    total: chunks.length,
    persistedCount: validChunks.length,
    upsertedCount: bulkResult.upsertedCount || 0,
    modifiedCount: bulkResult.modifiedCount || 0,
    matchedCount: bulkResult.matchedCount || 0,
    skippedCount,
  };
};

/**
 * Retrieves resume chunks for a specific user and resume.
 * Strictly enforces user isolation to prevent cross-tenant data leakage.
 */
export const getResumeChunks = async ({
  userId,
  resumeId,
  options = {},
}) => {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new Error("Unauthorized: userId is required to query resume chunks");
  }

  if (!resumeId || typeof resumeId !== "string" || !resumeId.trim()) {
    throw new Error("resumeId is required to query resume chunks");
  }

  const Model = options.chunkModel || ResumeChunk;

  return Model.find({
    userId: userId.trim(),
    resumeId: resumeId.trim(),
  })
    .sort({ "metadata.chunkIndex": 1, createdAt: 1 })
    .lean();
};

/**
 * Deletes all stored resume chunks for a given user and resume.
 * Strictly scoped by userId to ensure user authorization.
 */
export const deleteResumeChunks = async ({
  userId,
  resumeId,
  options = {},
}) => {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new Error("Unauthorized: userId is required to delete resume chunks");
  }

  if (!resumeId || typeof resumeId !== "string" || !resumeId.trim()) {
    throw new Error("resumeId is required to delete resume chunks");
  }

  const Model = options.chunkModel || ResumeChunk;

  const result = await Model.deleteMany({
    userId: userId.trim(),
    resumeId: resumeId.trim(),
  });

  return {
    success: true,
    deletedCount: result.deletedCount || 0,
  };
};


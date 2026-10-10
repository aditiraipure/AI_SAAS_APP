/**
 * MongoDB Atlas Vector Search Service (Phase 2 — Step 7)
 * Provides reusable semantic search and top-K chunk retrieval
 * using Atlas $vectorSearch with user and resume filtering.
 */

import ResumeChunk from "../models/resumeChunkModel.js";
import { EMBEDDING_DIMENSION } from "./resumeEmbeddingService.js";

export const RESUME_VECTOR_INDEX_NAME =
  process.env.ATLAS_VECTOR_INDEX_NAME || "resume_vector_index";

/**
 * MongoDB Atlas Vector Search Index Specification
 * For collection: resumechunks
 */
export const RESUME_VECTOR_INDEX_SPEC = {
  name: RESUME_VECTOR_INDEX_NAME,
  type: "vectorSearch",
  definition: {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: EMBEDDING_DIMENSION, // 768
        similarity: "cosine",
      },
      {
        type: "filter",
        path: "userId",
      },
      {
        type: "filter",
        path: "resumeId",
      },
      {
        type: "filter",
        path: "section",
      },
    ],
  },
};

/**
 * Returns the exact JSON definition for Atlas Vector Search index creation
 */
export const getVectorSearchIndexDefinition = () => RESUME_VECTOR_INDEX_SPEC;

/**
 * Programmatically creates the Atlas Search index if connected to an Atlas cluster
 */
export const createVectorSearchIndex = async (options = {}) => {
  const Model = options.chunkModel || ResumeChunk;
  if (!Model?.collection?.createSearchIndex) {
    return {
      success: false,
      message: "createSearchIndex is not supported on this MongoDB collection or driver version",
    };
  }

  try {
    const result = await Model.collection.createSearchIndex(RESUME_VECTOR_INDEX_SPEC);
    return {
      success: true,
      indexName: result || RESUME_VECTOR_INDEX_NAME,
      message: `Vector search index '${RESUME_VECTOR_INDEX_NAME}' created successfully`,
    };
  } catch (err) {
    if (err.message?.includes("already exists") || err.codeName === "IndexAlreadyExists") {
      return {
        success: true,
        indexName: RESUME_VECTOR_INDEX_NAME,
        message: `Vector search index '${RESUME_VECTOR_INDEX_NAME}' already exists`,
      };
    }
    throw err;
  }
};

/**
 * Validates a 768-dimensional query vector before issuing an Atlas search
 */
export const validateQueryVector = (queryVector) => {
  if (!Array.isArray(queryVector)) {
    return { isValid: false, error: "queryVector must be an array" };
  }

  if (queryVector.length !== EMBEDDING_DIMENSION) {
    return {
      isValid: false,
      error: `queryVector dimension mismatch: expected ${EMBEDDING_DIMENSION}, got ${queryVector.length}`,
    };
  }

  const hasInvalidElements = queryVector.some(
    (v) => typeof v !== "number" || !Number.isFinite(v)
  );

  if (hasInvalidElements) {
    return {
      isValid: false,
      error: "queryVector must contain only valid finite numbers",
    };
  }

  return { isValid: true };
};

/**
 * Computes cosine similarity between two numeric vectors
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom ? dot / denom : 0;
};

/**
 * Executes MongoDB Atlas $vectorSearch to retrieve top-K most similar resume chunks.
 * Strictly enforces user and resume filter to prevent cross-tenant data access.
 */
export const searchSimilarResumeChunks = async ({
  queryVector,
  userId,
  resumeId,
  topK = 5,
  numCandidates,
  filter = {},
  indexName = RESUME_VECTOR_INDEX_NAME,
  options = {},
}) => {
  // 1. Authorize & Validate userId
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new Error("Unauthorized: userId is required for vector search");
  }

  // 2. Validate query vector
  const vectorValidation = validateQueryVector(queryVector);
  if (!vectorValidation.isValid) {
    throw new Error(vectorValidation.error);
  }

  // 3. Normalize and clamp topK and numCandidates
  const limit = Math.max(1, Math.min(50, Math.floor(Number(topK) || 5)));
  const defaultCandidates = Math.max(limit * 10, 50);
  const candidates =
    typeof numCandidates === "number" && numCandidates > 0
      ? Math.max(limit, Math.min(1000, Math.floor(numCandidates)))
      : defaultCandidates;

  // 4. Construct strict pre-filter for Atlas Vector Search
  const searchFilter = {
    userId: String(userId).trim(),
  };

  if (resumeId && typeof resumeId === "string" && resumeId.trim()) {
    searchFilter.resumeId = String(resumeId).trim();
  }

  if (filter?.section && typeof filter.section === "string" && filter.section.trim()) {
    searchFilter.section = String(filter.section).trim();
  }

  // 5. Build $vectorSearch aggregation pipeline
  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: "embedding",
        queryVector,
        numCandidates: candidates,
        limit,
        filter: searchFilter,
      },
    },
    {
      $project: {
        _id: 1,
        chunkId: 1,
        resumeId: 1,
        userId: 1,
        section: 1,
        content: 1,
        metadata: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  const Model = options.chunkModel || ResumeChunk;

  if (!options.chunkModel && ResumeChunk.db?.readyState === 0) {
    return [];
  }

  try {
    const results = await Model.aggregate(pipeline);
    return Array.isArray(results) ? results : [];
  } catch (err) {
    console.error("Vector search aggregation error:", err.message);
    throw err;
  }
};

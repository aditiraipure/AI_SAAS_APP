/**
 * Resume Chunk Retrieval & Semantic Search Service (Phase 2 — Step 9)
 * Retrieves top-K most relevant resume chunks for a given resume and authenticated user
 * using MongoDB Atlas Vector Search with strict tenant isolation.
 */

import { processJobDescription } from "./jobDescriptionService.js";
import {
  cosineSimilarity,
  searchSimilarResumeChunks,
  validateQueryVector,
} from "./resumeVectorSearchService.js";

export const DEFAULT_RETRIEVAL_TOP_K = 5;

/**
 * Retrieves the top-K most relevant resume chunks for the specified resume and user.
 * Reuses existing query embeddings, vector-search service, and tenant filters.
 */
export const retrieveRelevantResumeChunks = async ({
  queryVector,
  queryText,
  userId,
  resumeId,
  topK = DEFAULT_RETRIEVAL_TOP_K,
  filter = {},
  options = {},
}) => {
  // 1. Authorize & Validate user
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    throw new Error("Unauthorized: userId is required for chunk retrieval");
  }

  // 2. Validate resume identifier
  if (!resumeId || typeof resumeId !== "string" || !resumeId.trim()) {
    throw new Error("resumeId is required for chunk retrieval");
  }

  // 3. Resolve and validate query vector without duplicating embedding logic
  let vector = queryVector;
  if (!vector && queryText && typeof queryText === "string" && queryText.trim()) {
    const jdResult = await processJobDescription(queryText, options);
    vector = jdResult.embedding;
  }

  if (!vector) {
    throw new Error("Either queryVector or queryText is required for chunk retrieval");
  }

  const vectorValidation = validateQueryVector(vector);
  if (!vectorValidation.isValid) {
    throw new Error(vectorValidation.error);
  }

  // 4. Validate and clamp topK
  const limit = Math.max(1, Math.min(50, Math.floor(Number(topK) || DEFAULT_RETRIEVAL_TOP_K)));

  // 5. Query Atlas Vector Search with strict tenant scoping
  try {
    const rawResults = await searchSimilarResumeChunks({
      queryVector: vector,
      userId: userId.trim(),
      resumeId: resumeId.trim(),
      topK: limit,
      filter,
      options,
    });

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return [];
    }

    // 6. Return standardized results with chunkId, resumeId, section, content, metadata, score
    return rawResults.map((item) => ({
      chunkId: item.chunkId || String(item._id || ""),
      resumeId: item.resumeId || resumeId.trim(),
      section: item.section || "other",
      content: String(item.content || "").trim(),
      metadata: item.metadata && typeof item.metadata === "object" ? item.metadata : {},
      score: typeof item.score === "number" ? Number(item.score.toFixed(4)) : null,
    }));
  } catch (err) {
    if (options.throwOnError) {
      throw err;
    }
    console.warn(`Resume retrieval notice: ${err.message}. Returning safe empty results.`);
    return [];
  }
};


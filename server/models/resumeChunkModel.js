import mongoose from "mongoose";

/**
 * Resume Chunk Mongoose Schema (Phase 2 — Step 6)
 * Stores section-aware resume chunks along with their 768-dimensional vector embeddings,
 * metadata, and model information for semantic retrieval and RAG.
 */
const resumeChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    resumeId: {
      type: String,
      required: true,
      index: true,
    },
    chunkId: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      required: true,
      enum: [
        "summary",
        "skills",
        "experience",
        "project",
        "education",
        "certification",
        "achievement",
        "other",
      ],
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: function (arr) {
          return (
            Array.isArray(arr) &&
            arr.length === 768 &&
            arr.every((v) => typeof v === "number" && Number.isFinite(v))
          );
        },
        message: "Embedding must be an array of exactly 768 finite numbers.",
      },
    },
    embeddingModel: {
      type: String,
      default: "gemini-embedding-2",
    },
    embeddingDimension: {
      type: Number,
      default: 768,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring idempotence & deduplication on retries per user & resume
resumeChunkSchema.index(
  { userId: 1, resumeId: 1, chunkId: 1 },
  { unique: true }
);

// Compound index for efficient user-scoped queries and chronological ordering
resumeChunkSchema.index({ userId: 1, resumeId: 1, createdAt: -1 });

const ResumeChunk =
  mongoose.models.ResumeChunk ||
  mongoose.model("ResumeChunk", resumeChunkSchema);

export default ResumeChunk;


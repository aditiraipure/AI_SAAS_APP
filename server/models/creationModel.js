import mongoose from "mongoose";

const creationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "QuickAI Creator",
    },
    prompt: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "article",
      enum: [
        "article",
        "blog-title",
        "image",
        "remove-bg",
        "remove-background",
        "remove-object",
        "resume-review",
      ],
    },
    publish: {
      type: Boolean,
      default: false,
    },
    likes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const Creation =
  mongoose.models.Creation || mongoose.model("Creation", creationSchema);

export default Creation;

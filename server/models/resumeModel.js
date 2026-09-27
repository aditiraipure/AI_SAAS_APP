import mongoose from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    location: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    grade: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, default: "" },
    role: { type: String, default: "" },
    location: { type: String, default: "" },
    employmentType: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    isCurrent: { type: Boolean, default: false },
    responsibilities: [{ type: String }],
    achievements: [{ type: String }],
    technologies: [{ type: String }],
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    description: { type: String, default: "" },
    technologies: [{ type: String }],
    responsibilities: [{ type: String }],
    outcome: { type: String, default: "" },
    githubUrl: { type: String, default: "" },
    liveUrl: { type: String, default: "" },
  },
  { _id: true }
);

const achievementSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    organization: { type: String, default: "" },
    date: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    organization: { type: String, default: "" },
    issueDate: { type: String, default: "" },
    credentialUrl: { type: String, default: "" },
  },
  { _id: true }
);

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    personalInfo: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      portfolio: { type: String, default: "" },
    },
    targetRole: {
      type: String,
      default: "",
    },
    summary: {
      type: String,
      default: "",
    },
    education: [educationSchema],
    experience: [experienceSchema],
    projects: [projectSchema],
    skills: {
      programming: [{ type: String }],
      frontend: [{ type: String }],
      backend: [{ type: String }],
      database: [{ type: String }],
      cloud: [{ type: String }],
      devops: [{ type: String }],
      tools: [{ type: String }],
      other: [{ type: String }],
    },
    achievements: [achievementSchema],
    certifications: [certificationSchema],
    template: {
      type: String,
      enum: ["modern", "classic", "minimal", "professional"],
      default: "modern",
    },
    jobDescription: {
      type: String,
      default: "",
    },
    atsAnalysis: {
      score: { type: Number, default: 0 },
      matchedKeywords: [{ type: String }],
      missingKeywords: [{ type: String }],
      suggestions: [{ type: String }],
      analyzedAt: { type: Date },
    },
    status: {
      type: String,
      enum: ["draft", "completed"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user-scoped queries and chronological ordering
resumeSchema.index({ userId: 1, updatedAt: -1 });

const Resume = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);

export default Resume;

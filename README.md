

# QuickAI — Next-Generation Enterprise Generative AI SaaS Platform

> **An all-in-one AI productivity suite powered by Google Gemini, Grounded RAG with MongoDB Atlas Vector Search, and Image Processing pipelines.**

---

## 1. Project Purpose & Overview

QuickAI is an AI-powered MERN SaaS application that brings multiple AI tools together on a single platform. It helps users create resumes, review them against job descriptions, generate articles and blog titles, edit images, and share their creations with the community without switching between different tools.

### Key Features

1. **Resume Builder & ATS Review:** Enables users to create resumes and compare them against job descriptions to identify missing skills and areas for improvement.

2. **AI Content Generation:** Generates SEO-friendly articles and engaging blog titles using AI-powered text generation with streaming responses.

3. **AI Image Tools:** Supports text-to-image generation, background removal, and object editing in images.

4. **Community Collaboration:** Allows users to share their creations, like and bookmark posts, and reuse content shared by other users.

5. **Security & Reliability:** Includes authentication, protection against malicious prompts, error handling, and retry mechanisms to handle temporary AI service failures.

### Project Objective

The objective of QuickAI is to simplify access to AI-powered tools by combining career development, content creation, and image editing capabilities into a single, user-friendly platform.

---

## 2. System Architecture

```
                                  ┌───────────────────────────────┐
                                  │      Client (React 19)        │
                                  │   Tailwind CSS v4 + Vite 8    │
                                  └──────────────┬────────────────┘
                                                 │ HTTPS / JSON / FormData
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │    Express 5 Backend Server   │
                                  │   Clerk Auth + Rate Limiter   │
                                  └──────────────┬────────────────┘
                                                 │
         ┌──────────────────────────────┬────────┴──────────────────────┬──────────────────────────────┐
         ▼                              ▼                               ▼                              ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│  Document Parse  │           │  Security Guard  │           │   Vector Store   │           │   Generative AI  │
│  Mammoth (DOCX)  │           │ Prompt Injection │           │  MongoDB Atlas   │           │ Google Gemini    │
│  pdf-parse (PDF) │           │ Sanitizer / XML  │           │  $vectorSearch   │           │ 3.8 / 3.5 Models │
└──────────────────┘           └──────────────────┘           └──────────────────┘           └──────────────────┘
         │                              │                               │                              │
         └──────────────────────────────┴────────┬──────────────────────┴──────────────────────────────┘
                                                 │
                                                 ▼
                                  ┌───────────────────────────────┐
                                  │ Grounded ATS / Analysis Engine│
                                  │  Zod Validation & Formatting  │
                                  └───────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend Architecture
* **Core Framework:** React 19 (`react`, `react-dom`) with React Router v7 (`react-router-dom`)
* **Build System & Tooling:** Vite 8 (`@vitejs/plugin-react`) with route-level code splitting via `React.lazy` and `Suspense`
* **Styling & UI:** Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React icons (`lucide-react`)
* **Notifications & Rendering:** React Hot Toast, React Markdown (`react-markdown`)
* **Authentication:** Clerk React SDK (`@clerk/react`)

### Backend Architecture
* **Runtime & Framework:** Node.js (ES Modules) with Express 5 (`express`)
* **Database & ODM:** MongoDB with Mongoose 9 (`mongoose`)
* **Vector Search Engine:** MongoDB Atlas `$vectorSearch` with 768-dimensional Cosine Similarity indexes
* **Authentication & Middleware:** Clerk Express SDK (`@clerk/express`), CORS, Multer (multipart uploads)
* **API Documentation:** OpenAPI 3.0 via Swagger JSDoc (`swagger-jsdoc`) & Swagger UI Express (`swagger-ui-express`)

### Generative AI & Media Processing
* **LLM Engine:** Google Gemini REST API & Google GenAI SDK (`@google/genai`), OpenAI SDK compatibility layer
* **Embedding Model:** `gemini-embedding-2` (768-dimensional vector embeddings)
* **Text Generation Models:** `gemini-3.8-flash` (Primary), `gemini-3.5-flash-lite` (Fallback)
* **Document Parsers:** `pdf-parse`, `mammoth` (DOCX), `docx`, `pdfkit`
* **Image Processing:** Cloudinary SDK (`cloudinary`), ClipDrop AI API (removals & inpainting)
* **Validation & Schemas:** Zod (`zod`) for strict runtime type enforcement and auto-repair

---
## 4. Feature Breakdown & Generative AI Workflows

---

### Feature 1: RAG-Based Resume Review & ATS Analysis (Main Feature)

- **The Problem:** Basic AI resume checkers may suggest skills that candidates do not have, provide scores without clear reasons, or get manipulated by malicious instructions hidden in the input.
- **How QuickAI Solves It:** QuickAI uses a 13-stage Retrieval-Augmented Generation (RAG) pipeline to compare a resume with a job description. It extracts resume details, splits the content into meaningful sections, generates 768-dimensional embeddings, and retrieves relevant information using MongoDB Atlas Vector Search. The AI evaluates the candidate based on the retrieved resume evidence, while Zod schema validation and score limits help keep the results consistent.
- **Gen AI Pipeline & Workflow:**
  1. **Stage 1 (Request & Tracking):** Receives the request, assigns a correlation ID (`corrId`), and checks the user's premium plan.
  2. **Stage 2 (Document Processing):** Extracts text from PDF, DOCX, and TXT files using `pdf-parse` or `mammoth`.
  3. **Stage 3 (Data Extraction):** Organizes resume information into sections such as Summary, Experience, Projects, Skills, and Education.
  4. **Stage 4 (Section-Based Chunking):** Splits the resume into smaller sections while preserving details such as company, role, and section name.
  5. **Stage 5 (Embedding Generation):** Converts resume sections into 768-dimensional vectors using `@google/genai` and `gemini-embedding-2`.
  6. **Stage 6 (Vector Storage):** Stores the chunks and embeddings in MongoDB with `userId` and `resumeId` to keep each user's data separate.
  7. **Stage 7 & 8 (Job Description Processing):** Validates the job description and converts it into a 768-dimensional query vector.
  8. **Stage 9 (Relevant Data Retrieval):** Uses Atlas `$vectorSearch` to retrieve the five most relevant resume sections for the job.
  9. **Stage 10 (Prompt Security):** Wraps resume content in XML-style boundaries and neutralizes unsafe delimiters before sending it to the AI.
  10. **Stage 11 (AI Analysis):** Uses `gemini-3.8-flash` with instructions to evaluate the resume using factual evidence and avoid inventing information.
  11. **Stage 12 (Validation & Correction):** Validates the response using the `resumeAnalysisSchema` and Zod, and keeps scores within the range of 0 to 100.
  12. **Stage 13 (Final Result):** Returns the ATS score, category-wise scores for Formatting, Keywords, Impact, and Role Relevance, matched and missing skills, and an action plan for improving the resume.

---

### Feature 2: AI-Powered Resume Builder

- **The Problem:** Writing professional resume summaries and strong achievement statements takes time. Candidates may also use unclear descriptions or abbreviations that need to be expanded.
- **How QuickAI Solves It:** QuickAI provides an interactive resume builder with AI-powered writing assistance:
  - **AI Summary Generator:** Converts rough notes and role descriptions into a clear, professional summary.
  - **AI Bullet Point Improvement:** Improves resume bullet points using the STAR method (Situation, Task, Action, Result) and strong action verbs.
  - **AI Abbreviation Expander:** Identifies and expands degree and institution abbreviations, with in-memory caching to avoid repeated processing.
  - **ATS-Friendly Export:** Shows resume changes in real time and supports exporting resumes to PDF and Word formats.

---

### Feature 3: AI Article Writer

- **The Problem:** Writing long blog articles takes time, especially when content needs a clear structure and SEO-friendly formatting.
- **How QuickAI Solves It:** QuickAI generates complete articles in Markdown format based on the user's topic and preferred tone. Users can choose short, medium, or long content, typically ranging from 400 to 1,000 or more words. Streaming responses and estimated reading times are also supported.
- **Gen AI Model:** Uses `gemini-3.8-flash` with a fallback to `gemini-3.5-flash-lite`.

---

### Feature 4: AI Blog Title & Idea Generator

- **The Problem:** Generic blog titles may fail to attract readers or include relevant search keywords.
- **How QuickAI Solves It:** Users provide keywords, a category, and a target audience. QuickAI generates title ideas in different formats, including how-to guides, listicles, alternative viewpoints, and curiosity-based titles.
- **Gen AI Model:** Uses Gemini to generate structured JSON responses and validates the output against the expected schema.

---

### Feature 5: AI Text-to-Image Generation

- **The Problem:** Finding suitable, copyright-free images for blogs and social media can take a lot of time.
- **How QuickAI Solves It:** Users can describe the image they want, and QuickAI generates visuals in different styles, such as realistic, cyberpunk, 3D, anime, and watercolor. It also supports different image aspect ratios.
- **Tech Engine:** Integrates AI image-generation models with Cloudinary for image storage and delivery.

---

### Feature 6: AI Background Removal

- **The Problem:** Preparing images with transparent backgrounds for online stores, profile pictures, and design projects often requires additional editing software.
- **How QuickAI Solves It:** QuickAI uses ClipDrop AI and Cloudinary to identify the main subject in an image and remove its background, producing a transparent PNG.

---

### Feature 7: AI Object Removal (Inpainting)

- **The Problem:** Unwanted objects, marks, or other distractions can affect the quality of product and profile photos.
- **How QuickAI Solves It:** Users can select or mark an unwanted object in an image. The AI removes the selected area and fills it with a background that matches the surrounding image.

---

### Feature 8: Community Hub & Creative Sharing

- **The Problem:** Users may find it difficult to discover new ideas or learn how others create useful content with AI.
- **How QuickAI Solves It:** QuickAI includes a community feed where users can publish AI-generated articles, images, and designs. Other users can like posts, copy prompts, and reuse shared creations. The interface also supports responsive masonry layouts.
## 5. Security, Reliability & Quota Architecture

```
                       Incoming AI Request
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Sliding-Window AI Rate Limiter         │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │  Multi-Tier Prompt Injection Detection       │
        │  • Strips null bytes / invisible unicode     │
        │  • Neutralizes system delimiters             │
        │  • Wraps in <untrusted_*> boundary tags      │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │  Dual-Model Automatic Fallback Engine        │
        │  Primary:   gemini-3.8-flash                 │
        │  Secondary: gemini-3.5-flash-lite            │
        │  Tertiary:  OpenAI-Compatible REST Endpoint  │
        │  Emergency: Deterministic Heuristic Parser   │
        └──────────────────────┬───────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │ Adaptive Exponential Backoff + Jitter        │
        │  • Differentiates RPM vs. Daily Quota (429)  │
        │  • Reads Retry-After & Google RPC RetryInfo  │
        │  • Zero repeated retries on exhausted quota  │
        │  • Redacts all API keys in safe logs         │
        └──────────────────────────────────────────────┘
```

1. **Prompt Injection Defense Layer:**
   - Detects direct override attempts (`"ignore previous instructions"`), role hijacking (`"you are now DAN"`), and score manipulation (`"give 100/100 score"`).
   - Sanitizes non-printable characters and wraps all candidate data in escaped XML boundaries.
2. **Quota & Rate-Limit Intelligence:**
   - Detects `DAILY_QUOTA_EXHAUSTED` and immediately advances to fallback models without wasting 4 retries.
   - For transient `RATE_LIMIT_TRANSIENT` (RPM/TPM spikes), reads `Retry-After` headers and applies adaptive exponential backoff with jitter.
3. **Dedicated Pipeline Logging:**
   - Exclusively tracks the 13 resume analysis stages under the prefix `[ResumeAnalysis]` with a correlation ID (`corrId`).
   - Strict zero-leakage guarantee: never logs resume text, JD contents, retrieved chunks, or API keys.

---

## 6. Database Models & Schema Design

### 1. `Creation` Collection (`creationModel.js`)
Stores user-generated artifacts across all platform tools:
```typescript
{
  userId: String,         // Clerk user identifier
  userName: String,       // Display name
  prompt: String,         // Input prompt or title
  content: String,        // Generated article markdown, review report, or image URL
  type: String,           // 'article' | 'blog-title' | 'image' | 'bg-remove' | 'resume-review'
  publish: Boolean,       // Public feed visibility
  likes: [String],        // Array of userIds who liked the creation
  createdAt: Date,
  updatedAt: Date
}
```

### 2. `ResumeChunk` Collection (`resumeChunkModel.js`)
Stores section-aware chunks and vector embeddings for Atlas Vector Search:
```typescript
{
  chunkId: String,        // Unique chunk ID (e.g. res_xxx_experience_0)
  resumeId: String,       // Associated resume document identifier
  userId: String,         // Strict tenant ownership filter
  section: String,        // 'summary' | 'experience' | 'projects' | 'education' | 'skills'
  content: String,        // Semantic text content
  embedding: [Number],    // 768-dimensional float vector
  metadata: {
    company: String,
    role: String,
    technologies: [String],
    chunkIndex: Number,
    totalChunks: Number
  },
  createdAt: Date
}
```

---

## 7. Interactive API Documentation

QuickAI comes with integrated Swagger / OpenAPI 3.0 documentation:
* **Interactive UI:** Accessible at `http://localhost:5000/api-docs`
* **Coverage:** Documents all 17 REST endpoints including `/api/ai/resume-review`, `/api/ai/generate-article`, `/api/ai/blog-titles`, `/api/ai/generate-image`, `/api/ai/remove-bg`, `/api/ai/remove-obj`, and `/api/user/creations`.
* **Testing:** Fully validated with 0 YAML parsing warnings or semantic errors.

---

## 8. Future Enhancements & Roadmap

* [ ] **Multi-Agent Resume Optimization:** Specialized autonomous subagents (e.g., Executive Recruiter Agent, Technical Lead Agent, Grammar Specialist Agent) working cooperatively to suggest line-by-line resume edits.
* [ ] **Live Mock Interview Simulator:** Voice-based conversational AI simulating technical interviews grounded in the candidate's uploaded resume and retrieved projects.
* [ ] **Multi-Language ATS Localization:** Semantic cross-language vector search supporting resume evaluation in German, French, Spanish, and Japanese.
* [ ] **Granular Section Inpainting:** Live interactive canvas allowing users to drag and drop suggested resume bullet points directly into live PDF previews.
* [ ] **Team Workspaces & Enterprise Recruiter Portals:** Batch resume screening with vector rank matching for hiring managers.

---

## 9. Quick Start & Setup Guide

### Prerequisites
* **Node.js** v20+ and npm
* **MongoDB** connection string (Atlas recommended for Vector Search)
* **Clerk** account (API keys)
* **Google Gemini** API key
* **Cloudinary** credentials (for image processing)

### Environment Variables

#### Backend (`server/.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/quickai
GEMINI_API_KEY=AIzaSy...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
CLIPDROP_API_KEY=your_clipdrop_key
```

#### Frontend (`client/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_BACKEND_URL=http://localhost:5000
```

### Installation & Running

```bash
# 1. Install Backend Dependencies
cd server
npm install

# 2. Run Backend Server
npm run server

# 3. Install Frontend Dependencies (in a separate terminal)
cd ../client
npm install

# 4. Start Frontend Development Server
npm run dev
```

* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:5000`
* **Swagger API Docs:** `http://localhost:5000/api-docs`

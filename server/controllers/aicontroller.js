import axios from "axios";
import "dotenv/config";
import fs from "fs";
import mammoth from "mammoth";
import OpenAI from "openai";
import path from "path";
import { PDFParse } from "pdf-parse";
import cloudinary from "../config/cloudinary.js";
import Creation from "../models/creationModel.js";

const AI = new OpenAI({
  apiKey:
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_API_kEY ||
    "dummy_key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Supported Gemini models with fallback hierarchy
const SUPPORTED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/**
 * Helper to call Gemini with retry and fallback across models
 */
const callGeminiWithRetry = async (
  messages,
  maxTokens = 1500,
  temperature = 0.7,
) => {
  let lastError = null;

  for (const model of SUPPORTED_MODELS) {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await AI.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        const content = response.choices?.[0]?.message?.content;
        if (
          content &&
          typeof content === "string" &&
          content.trim().length > 0
        ) {
          return content.trim();
        }

        throw new Error("Empty response returned from AI model");
      } catch (err) {
        lastError = err;
        const status = err.status || err.response?.status;
        const msg = String(err.message || "");

        const is503 =
          status === 503 ||
          msg.includes("503") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand");

        if (is503 && attempt < maxRetries) {
          console.warn(
            `Gemini 503 on ${model} (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${(attempt + 1) * 1000}ms...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, (attempt + 1) * 1000),
          );
          continue;
        }

        break;
      }
    }
  }

  throw lastError;
};

/**
 * Handle AI provider errors with clean, safe HTTP status codes and messages
 */
const handleAiErrorResponse = (err, res, actionName = "generate content") => {
  console.error(`AI Error during ${actionName}:`, err.message || err);

  const status = err.status || err.response?.status;
  const msg = String(err.message || "");

  if (
    status === 503 ||
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("high demand")
  ) {
    return res.status(503).json({
      success: false,
      message:
        "AI service is temporarily unavailable. Please try again shortly.",
    });
  }

  if (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota")
  ) {
    return res.status(429).json({
      success: false,
      message: "AI rate limit exceeded. Please try again shortly.",
    });
  }

  if (
    status === 401 ||
    status === 403 ||
    msg.includes("API key not valid") ||
    msg.includes("401")
  ) {
    return res.status(500).json({
      success: false,
      message:
        "AI service authentication error. Please check server configuration.",
    });
  }

  if (
    status === 400 ||
    msg.includes("400") ||
    msg.includes("INVALID_ARGUMENT")
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid AI generation request format.",
    });
  }

  return res.status(500).json({
    success: false,
    message: `Failed to ${actionName}. Please try again later.`,
  });
};

/**
 * Generate AI Article
 * POST /api/ai/generate-article
 */
export const generateArticle = async (req, res) => {
  try {
    const { prompt, topic, length } = req.body;
    const finalPrompt = prompt || topic;

    if (
      !finalPrompt ||
      typeof finalPrompt !== "string" ||
      !finalPrompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_kEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    const userPlan = (req.plan || "free").toLowerCase();
    const isFreePlan = userPlan === "free" || userPlan === "basic";
    const currentUsage = req.dbUser?.freeUsage || 0;

    if (isFreePlan && currentUsage >= 10) {
      return res.status(403).json({
        success: false,
        message:
          "Free plan limit reached. You have used all 10 free article generations. Please upgrade your plan to continue.",
      });
    }

    const generatedArticle = await callGeminiWithRetry(
      [
        {
          role: "system",
          content:
            "You are a helpful assistant that writes high-quality articles.",
        },
        {
          role: "user",
          content: length ? `${finalPrompt} (Length: ${length})` : finalPrompt,
        },
      ],
      1500,
      0.7,
    );

    const savedCreation = await Creation.create({
      userId: req.userId,
      userName: req.userName || "QuickAI Creator",
      prompt: finalPrompt,
      content: generatedArticle,
      type: "article",
      publish: false,
      likes: [],
    });

    let updatedUsage = currentUsage;
    if (isFreePlan && req.dbUser) {
      req.dbUser.freeUsage = currentUsage + 1;
      await req.dbUser.save();
      updatedUsage = req.dbUser.freeUsage;
    }

    return res.status(200).json({
      success: true,
      message: "Article generated successfully",
      article: generatedArticle,
      content: generatedArticle,
      creation: savedCreation,
      usage: updatedUsage,
      plan: req.plan || "free",
    });
  } catch (error) {
    return handleAiErrorResponse(error, res, "generate article");
  }
};

/**
 * Generate 5 to 8 Catchy Blog Titles using Gemini
 * POST /api/ai/generate-blog-title
 */
export const generateBlogTitle = async (req, res) => {
  try {
    const { prompt, topic, keyword, category } = req.body;
    const finalPrompt = prompt || topic || keyword;

    if (
      !finalPrompt ||
      typeof finalPrompt !== "string" ||
      !finalPrompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Prompt / keyword is required",
      });
    }

    if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_kEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    const userPlan = (req.plan || "free").toLowerCase();
    const isFreePlan = userPlan === "free" || userPlan === "basic";
    const currentUsage = req.dbUser?.freeUsage || 0;

    if (isFreePlan && currentUsage >= 10) {
      return res.status(403).json({
        success: false,
        message:
          "Free plan limit reached. You have used all 10 free blog title generations. Please upgrade your plan to continue.",
      });
    }

    const systemPrompt =
      "You are an expert SEO copywriter and viral content strategist. Your task is to generate catchy, engaging, highly click-worthy, and SEO-friendly blog post titles. Always return between 5 and 8 distinct, diverse, and compelling titles formatted strictly as a plain text list, with exactly one title per line. Do not number the titles, do not add introductory text, and do not use quotes.";

    const categoryContext = category ? ` in the category "${category}"` : "";
    const userPrompt = `Generate between 5 and 8 unique, catchy, and diverse blog titles for the topic "${finalPrompt}"${categoryContext}.`;

    const rawContent = await callGeminiWithRetry(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      800,
      0.7,
    );

    const parsedTitles = rawContent
      .split("\n")
      .map((line) =>
        line
          .replace(/^[0-9]+[\.\)\-\:\s]+|^[\*\-\•\>]\s*/, "")
          .replace(/^["'`]|["'`]$/g, "")
          .trim(),
      )
      .filter((line) => line.length > 0);

    const uniqueTitles = Array.from(new Set(parsedTitles));
    let titles = uniqueTitles.slice(0, 8);

    if (titles.length < 5) {
      const fallbackTemplates = [
        `The Complete Guide to ${finalPrompt}`,
        `Top Proven Strategies for ${finalPrompt}`,
        `Why ${finalPrompt} Is Transforming the Industry`,
        `5 Essential Trends in ${finalPrompt} You Must Know`,
        `How to Master ${finalPrompt}: Practical Step-by-Step Insights`,
        `The Future of ${finalPrompt}: Emerging Innovations`,
      ];
      for (const tpl of fallbackTemplates) {
        if (!titles.includes(tpl)) {
          titles.push(tpl);
        }
        if (titles.length >= 7) break;
      }
    }

    const savedCreation = await Creation.create({
      userId: req.userId,
      userName: req.userName || "QuickAI Creator",
      prompt: finalPrompt,
      content: JSON.stringify(titles),
      type: "blog-title",
      publish: false,
      likes: [],
    });

    let updatedUsage = currentUsage;
    if (isFreePlan && req.dbUser) {
      req.dbUser.freeUsage = currentUsage + 1;
      await req.dbUser.save();
      updatedUsage = req.dbUser.freeUsage;
    }

    return res.status(200).json({
      success: true,
      message: "Blog titles generated successfully",
      titles: titles,
      content: rawContent,
      creation: savedCreation,
      usage: updatedUsage,
      plan: req.plan || "free",
    });
  } catch (error) {
    return handleAiErrorResponse(error, res, "generate blog titles");
  }
};

/**
 * Generate AI Image using Clipdrop & Cloudinary
 * POST /api/ai/generate-image
 */
export const generateImage = async (req, res) => {
  try {
    const { prompt, style, isPublic, publish } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const clipdropApiKey =
      process.env.CLIPDROP_API_KEY || process.env.YOUR_API_KEY;
    if (!clipdropApiKey) {
      return res.status(500).json({
        success: false,
        message: "CLIPDROP_API_KEY is not configured",
      });
    }

    if (!req.isPremium) {
      return res.status(403).json({
        success: false,
        message:
          "This feature is available only on the Premium plan. Please upgrade your plan to continue.",
      });
    }

    const enhancedPrompt =
      style && style !== "Realistic"
        ? `${prompt} in the style ${style}`
        : prompt;

    const formData = new FormData();
    formData.append("prompt", enhancedPrompt);

    const clipdropResponse = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          "x-api-key": clipdropApiKey,
        },
        responseType: "arraybuffer",
      },
    );

    const base64Image = Buffer.from(clipdropResponse.data, "binary").toString(
      "base64",
    );
    const dataURI = `data:image/jpeg;base64,${base64Image}`;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: "quickai_creations",
      resource_type: "image",
    });

    const secureImageUrl = uploadResult.secure_url;

    if (!secureImageUrl) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload generated image to Cloudinary",
      });
    }

    const savedCreation = await Creation.create({
      userId: req.userId,
      userName: req.userName || "QuickAI Creator",
      prompt: enhancedPrompt,
      content: secureImageUrl,
      type: "image",
      publish: Boolean(isPublic || publish),
      likes: [],
    });

    return res.status(200).json({
      success: true,
      message: "Image generated successfully",
      imageUrl: secureImageUrl,
      content: secureImageUrl,
      creation: savedCreation,
      plan: req.plan || "premium",
    });
  } catch (error) {
    console.error("AI Image Generation Error:", error.message);

    let clientErrorMessage = error.message || "Failed to generate image";
    if (error.response?.data) {
      try {
        const parsed = JSON.parse(Buffer.from(error.response.data).toString());
        if (parsed.error) clientErrorMessage = parsed.error;
      } catch {
        // Not JSON
      }
    }

    const statusCode = error.response?.status === 402 ? 402 : 500;
    return res.status(statusCode).json({
      success: false,
      message: clientErrorMessage,
    });
  }
};

/**
 * 1. Remove Image Background — PREMIUM ONLY
 * POST /api/ai/remove-background
 */
export const removeImageBackground = async (req, res) => {
  let tempFilePath = null;
  try {
    // 1. Premium Plan Verification
    if (!req.isPremium) {
      return res.status(403).json({
        success: false,
        message: "This feature is available only on the Premium plan.",
      });
    }

    // 2. File Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file to remove background.",
      });
    }

    tempFilePath = req.file.path;

    // 3. Upload Original to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: "quickai_creations",
      resource_type: "image",
    });

    if (!uploadResult?.public_id) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image to Cloudinary.",
      });
    }

    // 4. Generate Cloudinary Background Removal Transformed URL
    const bgRemovedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [{ effect: "background_removal" }],
      format: "png",
      secure: true,
    });

    // 5. Save to Database
    const savedCreation = await Creation.create({
      userId: req.userId,
      userName: req.userName || "QuickAI Creator",
      prompt: `Remove Background: ${req.file.originalname}`,
      content: bgRemovedUrl,
      type: "remove-background",
      publish: false,
      likes: [],
    });

    return res.status(200).json({
      success: true,
      message: "Background removed successfully",
      imageUrl: bgRemovedUrl,
      content: bgRemovedUrl,
      creation: savedCreation,
      plan: req.plan,
    });
  } catch (error) {
    console.error("Remove Background Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove image background.",
    });
  } finally {
    // Cleanup temporary uploaded file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.warn("Failed to delete temp file:", cleanupErr.message);
      }
    }
  }
};

/**
 * 2. Remove Image Object — PREMIUM ONLY
 * POST /api/ai/remove-object
 */
export const removeImageObject = async (req, res) => {
  let tempFilePath = null;
  try {
    // 1. Premium Plan Verification
    if (!req.isPremium) {
      return res.status(403).json({
        success: false,
        message: "This feature is available only on the Premium plan.",
      });
    }

    // 2. File and Object Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file.",
      });
    }

    const objectToRemove = req.body.object || req.body.prompt;
    if (
      !objectToRemove ||
      typeof objectToRemove !== "string" ||
      !objectToRemove.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please specify the object to remove from the image.",
      });
    }

    tempFilePath = req.file.path;

    // 3. Upload Original to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: "quickai_creations",
      resource_type: "image",
    });

    if (!uploadResult?.public_id) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload image to Cloudinary.",
      });
    }

    // 4. Generate Cloudinary GenAI Object Removal URL
    const objectRemovedUrl = cloudinary.url(uploadResult.public_id, {
      transformation: [
        {
          effect: `gen_remove:prompt_${encodeURIComponent(objectToRemove.trim())}`,
        },
      ],
      resource_type: "image",
      secure: true,
    });

    // 5. Save to Database
    const savedCreation = await Creation.create({
      userId: req.userId,
      userName: req.userName || "QuickAI Creator",
      prompt: `Remove object: ${objectToRemove.trim()}`,
      content: objectRemovedUrl,
      type: "remove-object",
      publish: false,
      likes: [],
    });

    return res.status(200).json({
      success: true,
      message: "Object removed successfully",
      imageUrl: objectRemovedUrl,
      content: objectRemovedUrl,
      creation: savedCreation,
      plan: req.plan,
    });
  } catch (error) {
    console.error("Remove Object Error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove object from image.",
    });
  } finally {
    // Cleanup temporary uploaded file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.warn("Failed to delete temp file:", cleanupErr.message);
      }
    }
  }
};

/**
 * 3. Resume Review — PREMIUM ONLY
 * POST /api/ai/resume-review
 */
export const resumeReview = async (req, res) => {
  let tempFilePath = null;
  try {
    // 1. Premium Plan Verification
    if (!req.isPremium) {
      return res.status(403).json({
        success: false,
        message: "This feature is available only on the Premium plan.",
      });
    }

    // 2. File Validation
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a resume file (PDF, DOC, or DOCX).",
      });
    }

    tempFilePath = req.file.path;

    // 3. File Size Validation (Max 5 MB)
    const MAX_RESUME_SIZE = 5 * 1024 * 1024;
    if (req.file.size > MAX_RESUME_SIZE) {
      return res.status(400).json({
        success: false,
        message:
          "Resume file size exceeds the 5 MB limit. Please upload a smaller file.",
      });
    }

    // 4. Text Extraction
    let extractedText = "";
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === ".pdf") {
      try {
        const fileBuffer = fs.readFileSync(tempFilePath);
        const parser = new PDFParse({ data: fileBuffer });
        await parser.load();
        const pdfText = await parser.getText();
        await parser.destroy();
        extractedText =
          pdfText?.text || (typeof pdfText === "string" ? pdfText : "");
      } catch (pdfErr) {
        console.warn("PDF extraction error:", pdfErr.message);
      }
    } else if (ext === ".docx" || ext === ".doc") {
      try {
        const docResult = await mammoth.extractRawText({ path: tempFilePath });
        extractedText = docResult.value || "";
      } catch (docErr) {
        console.warn("DOC/DOCX extraction error:", docErr.message);
      }
    }

    const cleanedText = extractedText.replace(/\s+/g, " ").trim();

    if (!cleanedText || cleanedText.length < 50) {
      return res.status(400).json({
        success: false,
        message:
          "Could not extract sufficient text from the uploaded resume. Please ensure the document contains readable text and is not an image scan or empty.",
      });
    }

    // 5. Call Gemini for In-depth Resume Review
    const systemPrompt =
      "You are an expert executive resume reviewer and senior technical recruiter with deep expertise in Applicant Tracking Systems (ATS), talent acquisition, and career coaching. Analyze the candidate's resume thoroughly and provide a structured, actionable, and constructive evaluation formatted in clean Markdown.";

    const userPrompt = `Review the following resume and provide a constructive career-improvement path. Analyze the resume's ATS score, AI/human-readable strengths and weaknesses, areas for improvement, and actionable recommendations. Also suggest important recruiter/search keywords that should appear based on the candidate's skills, experience, role, and industry.

Structure your evaluation with the following clear Markdown sections:
1. **ATS Score** (AI-estimated score out of 100, e.g. 78/100, with a note that this is an AI estimation)
2. **ATS Score Breakdown & Explanation**
3. **Overall Resume Strength**
4. **Key Strengths**
5. **Areas of Improvement & Weaknesses**
6. **Formatting & ATS Compatibility Issues**
7. **Content & Impact Improvements**
8. **Missing / Recommended Skills**
9. **Top Recruiter & Industry Search Keywords**
10. **Actionable Step-by-Step Career / Resume Improvement Plan**

Resume Content:
${cleanedText.slice(0, 10000)}`;

    const reviewMarkdown = await callGeminiWithRetry(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      2500,
      0.7,
    );

    // 6. Save to Database
    const savedCreation = await Creation.create({
      userId: req.userId,
      userName: req.userName || "QuickAI Creator",
      prompt: `Resume Review: ${req.file.originalname}`,
      content: reviewMarkdown,
      type: "resume-review",
      publish: false,
      likes: [],
    });

    return res.status(200).json({
      success: true,
      message: "Resume reviewed successfully",
      review: reviewMarkdown,
      content: reviewMarkdown,
      creation: savedCreation,
      plan: req.plan,
    });
  } catch (error) {
    return handleAiErrorResponse(error, res, "review resume");
  } finally {
    // Cleanup temporary uploaded file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupErr) {
        console.warn("Failed to delete temp file:", cleanupErr.message);
      }
    }
  }
};

import axios from "axios";
import "dotenv/config";
import fs from "fs";
import mammoth from "mammoth";
import OpenAI from "openai";
import path from "path";
import { PDFParse } from "pdf-parse";
import cloudinary from "../config/cloudinary.js";
import Creation from "../models/creationModel.js";
import {
  blogTitleSchema,
  buildBlogTitlePrompt,
} from "../schemas/blogTitleSchema.js";
import { formatResumeAnalysisMarkdown } from "../schemas/resumeAnalysisSchema.js";
import {
  calculateBackoff,
  isTransientError,
  sanitizeUntrustedText,
  SYSTEM_SECURITY_DIRECTIVES,
  wrapUntrustedData,
} from "../security/promptSecurity.js";
import { analyzeResumeTextWithAi } from "../services/resumeAiService.js";

const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_kEY;

const AI = new OpenAI({
  apiKey: apiKey || "dummy_key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Supported Gemini models with fallback hierarchy (Primary: gemini-3.8-flash, Fallback: gemini-3.5-flash-lite)
export const SUPPORTED_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

/**
 * Helper to call Gemini with retry and fallback across models
 */
export const callGeminiWithRetry = async (
  messages,
  maxTokens = 1500,
  temperature = 0.7,
  responseMimeType = null,
) => {
  let lastError = null;

  // 1. Primary: Direct Google REST API generateContent
  for (const model of SUPPORTED_MODELS) {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const userMsg = messages.find((m) => m.role === "user")?.content || "";
        const systemMsg =
          messages.find((m) => m.role === "system")?.content || "";

        const payload = {
          ...(systemMsg
            ? {
                systemInstruction: {
                  parts: [{ text: systemMsg }],
                },
              }
            : {}),
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: systemMsg
                    ? `[SYSTEM INSTRUCTION]\n${systemMsg}\n\n[USER REQUEST]\n${userMsg}`
                    : userMsg,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...(responseMimeType ? { responseMimeType } : {}),
          },
        };

        const res = await axios.post(restUrl, payload, { timeout: 25000 });
        const content = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
        const isTransient = isTransientError(err);

        // 404 / permanent 4xx: do not retry same model, immediately advance to fallback
        if (!isTransient || attempt >= maxRetries) {
          console.warn(
            `Gemini REST failed on ${model} (attempt ${attempt + 1}, status: ${err.status || err.response?.status}): ${err.message}. Moving to fallback model if available.`,
          );
          break;
        }

        // 503 / 429 transient: retry up to 3 times with exponential backoff and jitter
        const delay = calculateBackoff(attempt);
        console.warn(
          `Gemini REST transient error on ${model} (attempt ${attempt + 1}/${maxRetries + 1}, status: ${err.status || err.response?.status}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 2. Secondary Fallback: OpenAI-compatible endpoint
  for (const model of SUPPORTED_MODELS) {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await AI.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          ...(responseMimeType === "application/json"
            ? { response_format: { type: "json_object" } }
            : {}),
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
        const isTransient = isTransientError(err);

        if (!isTransient || attempt >= maxRetries) {
          console.warn(
            `Gemini OpenAI endpoint failed on ${model} (attempt ${attempt + 1}): ${err.message}. Moving to fallback model if available.`,
          );
          break;
        }

        const delay = calculateBackoff(attempt);
        console.warn(
          `Gemini OpenAI endpoint transient error on ${model} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to generate content from AI model");
};

/**
 * Helper to stream text output from Gemini with fallback across models
 */
export const callGeminiStream = async (
  messages,
  onChunk,
  maxTokens = 4096,
  temperature = 0.7,
  abortSignal = null,
) => {
  let lastError = null;
  const userMsg = messages.find((m) => m.role === "user")?.content || "";
  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const promptText = systemMsg
    ? `[SYSTEM INSTRUCTION]\n${systemMsg}\n\n[USER REQUEST]\n${userMsg}`
    : userMsg;

  // 1. Primary: Direct Google REST API streamGenerateContent
  for (const model of SUPPORTED_MODELS) {
    if (abortSignal?.aborted) return "";
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abortSignal?.aborted) return "";
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: promptText }] }],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        };

        const response = await axios.post(restUrl, payload, {
          responseType: "stream",
          headers: { "Content-Type": "application/json" },
          timeout: 90000,
          signal: abortSignal,
        });

        let fullText = "";
        let finishReason = null;

        await new Promise((resolve, reject) => {
          let buffer = "";

          const processLine = (line) => {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) return;
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") return;
            try {
              const data = JSON.parse(jsonStr);
              const text =
                data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                fullText += text;
                onChunk(text);
              }
              if (data.candidates?.[0]?.finishReason) {
                finishReason = data.candidates[0].finishReason;
              }
            } catch (_) {}
          };

          response.data.on("data", (chunk) => {
            if (abortSignal?.aborted) {
              response.data.destroy();
              return resolve();
            }
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            lines.forEach(processLine);
          });

          response.data.on("end", () => {
            if (buffer.trim()) processLine(buffer);
            if (finishReason === "SAFETY" || finishReason === "RECITATION") {
              return reject(
                new Error("Generation stopped due to safety filter policies."),
              );
            }
            fullText.trim()
              ? resolve()
              : reject(new Error("Stream completed without content"));
          });

          response.data.on("error", reject);
        });

        if (fullText.trim()) return fullText.trim();
      } catch (err) {
        lastError = err;
        if (abortSignal?.aborted) return "";
        const isTransient = isTransientError(err);

        // Permanent error (404, etc.) or exceeded max retries: advance to fallback model
        if (!isTransient || attempt >= maxRetries) {
          console.warn(
            `REST stream failed on ${model} (attempt ${attempt + 1}, status: ${err.status || err.response?.status}): ${err.message}. Moving to fallback model.`,
          );
          break;
        }

        const delay = calculateBackoff(attempt);
        console.warn(
          `REST stream transient error on ${model} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 2. Secondary Fallback: OpenAI-compatible endpoint stream
  for (const model of SUPPORTED_MODELS) {
    if (abortSignal?.aborted) return "";
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abortSignal?.aborted) return "";
      try {
        const stream = await AI.chat.completions.create(
          { model, messages, temperature, max_tokens: maxTokens, stream: true },
          { signal: abortSignal },
        );

        let fullText = "";
        for await (const chunk of stream) {
          if (abortSignal?.aborted) break;
          const text = chunk.choices?.[0]?.delta?.content || "";
          if (text) {
            fullText += text;
            onChunk(text);
          }
        }

        if (fullText.trim()) return fullText.trim();
      } catch (err) {
        lastError = err;
        if (abortSignal?.aborted) return "";
        const isTransient = isTransientError(err);

        if (!isTransient || attempt >= maxRetries) {
          console.warn(
            `OpenAI SDK stream failed on ${model} (attempt ${attempt + 1}): ${err.message}. Moving to fallback model.`,
          );
          break;
        }

        const delay = calculateBackoff(attempt);
        console.warn(
          `OpenAI SDK stream transient retry on ${model} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to stream response from AI model");
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
 * Validate whether generated article text is complete and meets minimum word requirements
 */
export const validateArticleCompleteness = (text, length = "medium") => {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { isComplete: false, wordCount: 0, reason: "Empty content" };
  }

  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  let minWords = 380;
  let targetDesc = "400–600 words";

  if (length === "short") {
    minWords = 180;
    targetDesc = "200–400 words";
  } else if (length === "long") {
    minWords = 560;
    targetDesc = "600–800 words";
  }

  // 1. Check minimum word count threshold
  if (wordCount < minWords) {
    return {
      isComplete: false,
      wordCount,
      minWords,
      targetDesc,
      reason: `Article word count (${wordCount}) is below target (${targetDesc}).`,
    };
  }

  // 2. Check terminal sentence closure (Must not end abruptly mid-sentence or on dangling punctuation)
  const endsWithTerminalPunctuation = /[.!?:"'”’*_~)]\s*$/.test(trimmed);
  const endsWithIncompletePunctuation = /[,;(\-\—\/]\s*$/.test(trimmed);

  if (!endsWithTerminalPunctuation || endsWithIncompletePunctuation) {
    return {
      isComplete: false,
      wordCount,
      minWords,
      targetDesc,
      reason:
        "Article ends with an incomplete sentence or hanging punctuation.",
    };
  }

  return { isComplete: true, wordCount, minWords, targetDesc };
};

/**
 * Generate AI Article (Supports real-time SSE streaming with automatic continuation)
 * POST /api/ai/generate-article
 */
export const generateArticle = async (req, res) => {
  try {
    const { prompt, topic, length = "medium", stream = true } = req.body;
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

    // Configure token limit and word guidance based on requested length
    let maxTokens = 5096;
    let wordRangeDescription = "400 to 600 words";

    if (length === "short") {
      maxTokens = 3048;
      wordRangeDescription = "200 to 400 words";
    } else if (length === "long") {
      maxTokens = 7144;
      wordRangeDescription = "600 to 800 words";
    }

    const cleanPrompt = sanitizeUntrustedText(finalPrompt, 3000);

    const messages = [
      {
        role: "system",
        content: `You are an expert content creator and professional article writer. Write an engaging, well-structured, high-quality article formatted in clean Markdown with clear headings and paragraphs. Ensure the article is completely finished with an insightful conclusion and does not stop mid-sentence.\n\n${SYSTEM_SECURITY_DIRECTIVES}`,
      },
      {
        role: "user",
        content: `Write an engaging, comprehensive article of approximately ${wordRangeDescription} on the user's requested topic encapsulated below:\n${wrapUntrustedData("article_topic", cleanPrompt, 3000)}\n\nStructure the article with an engaging title, detailed sub-sections with clear Markdown headings, and a complete concluding section.`,
      },
    ];

    // Non-streaming fallback if stream: false explicitly requested
    if (stream === false) {
      let generatedArticle = "";
      try {
        generatedArticle = await callGeminiWithRetry(messages, maxTokens, 0.7);
      } catch (err) {
        console.warn("Initial non-streaming generation error:", err.message);
      }

      // Automatic continuation for non-streaming mode if incomplete
      let validation = validateArticleCompleteness(generatedArticle, length);
      let contAttempt = 0;
      while (!validation.isComplete && contAttempt < 2) {
        contAttempt++;
        const hasContent =
          generatedArticle && generatedArticle.trim().length > 0;
        const contMessages = hasContent
          ? [
              {
                role: "system",
                content: `You are an expert content creator and professional article writer. You are continuing an unfinished article. Seamlessly continue writing from where the text left off without repeating any prior sentences. Finish with a complete, well-rounded conclusion.\n\n${SYSTEM_SECURITY_DIRECTIVES}`,
              },
              {
                role: "user",
                content: `The following is the first part of an article on the topic encapsulated below:\n${wrapUntrustedData("article_topic", cleanPrompt, 3000)}\n\n${wrapUntrustedData("partial_article", generatedArticle, 15000)}\n\nPlease continue writing the article seamlessly from the exact ending point above. Expand on the topic with detailed sub-sections and a complete concluding section to reach the total target length of ${wordRangeDescription}. Do not repeat any text from above; immediately provide the remaining content.`,
              },
            ]
          : messages;

        try {
          const contText = await callGeminiWithRetry(
            contMessages,
            maxTokens,
            0.7,
          );
          if (hasContent) {
            const sep = generatedArticle.endsWith("\n") ? "\n" : "\n\n";
            generatedArticle += sep + contText.trim();
          } else {
            generatedArticle = contText.trim();
          }
          validation = validateArticleCompleteness(generatedArticle, length);
        } catch (_) {
          break;
        }
      }

      const finalValidation = validateArticleCompleteness(
        generatedArticle,
        length,
      );
      if (
        !finalValidation.isComplete &&
        (!generatedArticle || generatedArticle.trim().length < 150)
      ) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate a complete article. Please try again.",
        });
      }

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
    }

    // SSE Streaming Mode
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // Initial comment to establish immediate HTTP stream connection
    res.write(":\n\n");

    const abortController = new AbortController();
    req.on("close", () => {
      abortController.abort();
    });

    let fullArticleText = "";

    // 1. Primary Streaming Pass
    try {
      fullArticleText = await callGeminiStream(
        messages,
        (chunk) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ chunk, text: chunk })}\n\n`);
          }
        },
        maxTokens,
        0.7,
        abortController.signal,
      );
    } catch (streamErr) {
      console.warn(
        "Initial stream pass error in generateArticle:",
        streamErr.message,
      );
    }

    if (abortController.signal.aborted) {
      return;
    }

    // 2. Automatic Continuation Pipeline if incomplete or under target length
    let validation = validateArticleCompleteness(fullArticleText, length);
    const maxContinuations = 2;
    let continuationAttempt = 0;

    while (
      !validation.isComplete &&
      continuationAttempt < maxContinuations &&
      !abortController.signal.aborted
    ) {
      continuationAttempt++;
      console.log(
        `Article incomplete (${validation.reason || "Under target"}). Initiating continuation pass ${continuationAttempt}/${maxContinuations}...`,
      );

      const hasContent = fullArticleText && fullArticleText.trim().length > 0;

      let contMessages;
      if (hasContent) {
        contMessages = [
          {
            role: "system",
            content: `You are an expert content creator and professional article writer. You are continuing an unfinished article. Seamlessly continue writing from where the text left off without repeating any prior sentences. Finish with a complete, well-rounded conclusion.\n\n${SYSTEM_SECURITY_DIRECTIVES}`,
          },
          {
            role: "user",
            content: `The following is the first part of an article on the topic encapsulated below:\n${wrapUntrustedData("article_topic", cleanPrompt, 3000)}\n\n${wrapUntrustedData("partial_article", fullArticleText, 15000)}\n\nPlease continue writing the article seamlessly from the exact ending point above. Expand on the topic with detailed sub-sections and a complete concluding section to reach the total target length of ${wordRangeDescription}. Do not repeat any text from above; immediately provide the remaining content.`,
          },
        ];
      } else {
        contMessages = messages;
      }

      let continuationText = "";

      // Ensure appropriate spacing before continuation chunks
      const needsSeparator =
        hasContent &&
        !fullArticleText.endsWith("\n") &&
        !fullArticleText.endsWith(" ");

      if (needsSeparator && !res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({ chunk: "\n\n", text: "\n\n" })}\n\n`,
        );
        fullArticleText += "\n\n";
      }

      try {
        await callGeminiStream(
          contMessages,
          (chunk) => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ chunk, text: chunk })}\n\n`);
            }
            continuationText += chunk;
          },
          maxTokens,
          0.7,
          abortController.signal,
        );

        if (hasContent) {
          fullArticleText += continuationText;
        } else if (continuationText.trim().length > 0) {
          fullArticleText = continuationText;
        }

        validation = validateArticleCompleteness(fullArticleText, length);
      } catch (contErr) {
        console.warn(
          `Continuation pass ${continuationAttempt} failed:`,
          contErr.message,
        );
        break;
      }
    }

    if (abortController.signal.aborted) {
      return;
    }

    // 3. Final Completeness Validation Check
    const finalValidation = validateArticleCompleteness(
      fullArticleText,
      length,
    );
    if (
      !finalValidation.isComplete &&
      (!fullArticleText || fullArticleText.trim().length < 150)
    ) {
      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error: "Failed to generate a complete article. Please try again.",
          })}\n\n`,
        );
        res.end();
      }
      return;
    }

    // 4. Send final completion event immediately so client stream receives completion with zero latency
    let updatedUsage = currentUsage;
    if (isFreePlan && req.dbUser) {
      updatedUsage = currentUsage + 1;
    }

    if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          done: true,
          article: fullArticleText,
          content: fullArticleText,
          usage: updatedUsage,
          plan: req.plan || "free",
        })}\n\n`,
      );
      res.write("data: [DONE]\n\n");
      res.end();
    }

    // 5. Persist completed creation to MongoDB
    try {
      await Creation.create({
        userId: req.userId,
        userName: req.userName || "QuickAI Creator",
        prompt: finalPrompt,
        content: fullArticleText,
        type: "article",
        publish: false,
        likes: [],
      });
    } catch (dbErr) {
      console.warn("Creation saving error in stream:", dbErr.message);
    }

    // 6. Increment usage for free plan
    if (isFreePlan && req.dbUser) {
      try {
        req.dbUser.freeUsage = updatedUsage;
        await req.dbUser.save();
      } catch (usageErr) {
        console.warn("Usage increment error in stream:", usageErr.message);
      }
    }
  } catch (error) {
    if (!res.headersSent) {
      return handleAiErrorResponse(error, res, "generate article");
    } else if (!res.writableEnded) {
      res.write(
        `data: ${JSON.stringify({
          error: error.message || "Server error occurred",
        })}\n\n`,
      );
      res.end();
    }
  }
};

/**
 * Safely extracts and parses JSON from AI responses with fallback cleanup
 */
const cleanAndExtractJson = (rawText) => {
  if (!rawText || typeof rawText !== "string") return null;
  let text = rawText.trim();
  if (text.includes("```")) {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match) text = match[1].trim();
    else
      text = text
        .replace(/```(?:json)?/gi, "")
        .replace(/```/g, "")
        .trim();
  }
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * Generate 5 to 8 Catchy Blog Titles using Gemini
 * with Structured JSON & Zod validation
 *
 * POST /api/ai/generate-blog-title
 */
export const generateBlogTitle = async (req, res) => {
  try {
    // 1. Get the user's blog-title input.
    const { prompt, topic, keyword, category } = req.body;

    // Support the existing input formats.
    const finalPrompt = prompt || topic || keyword;

    // Validate that the user actually provided a topic/prompt.
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

    // 2. Check Gemini API configuration.
    if (!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_kEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is not configured",
      });
    }

    // 3. Get the user's current plan.
    const userPlan = (req.plan || "free").toLowerCase();

    // Identify free/basic users.
    const isFreePlan = userPlan === "free" || userPlan === "basic";

    // Get the user's current free usage.
    const currentUsage = req.dbUser?.freeUsage || 0;

    // Enforce the existing free-plan limit.
    if (isFreePlan && currentUsage >= 10) {
      return res.status(403).json({
        success: false,
        message:
          "Free plan limit reached. You have used all 10 free blog title generations. Please upgrade your plan to continue.",
      });
    }

    // 4. Build the modular prompt.
    // This should contain your prompt-engineering instructions
    // and few-shot examples from resumePrompts/blog prompt utility.
    const { systemInstruction, userPrompt } = buildBlogTitlePrompt(
      finalPrompt,
      category,
    );

    // 5. Generate structured JSON from Gemini.
    let rawContent = "";

    try {
      rawContent = await callGeminiWithRetry(
        [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        2048,
        0.7,
        "application/json",
      );
    } catch (aiErr) {
      // Retry once without responseMimeType if structured generation fails.
      console.warn(
        "Structured JSON generation failed. Retrying without responseMimeType:",
        aiErr.message,
      );

      rawContent = await callGeminiWithRetry(
        [
          {
            role: "system",
            content: systemInstruction,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        2048,
        0.7,
      );
    }

    // 6. Make sure Gemini actually returned something.
    if (!rawContent || typeof rawContent !== "string" || !rawContent.trim()) {
      return res.status(502).json({
        success: false,
        message: "AI returned an empty response.",
      });
    }

    // 7. Safely extract JSON from Gemini's response.
    const parsedJson = cleanAndExtractJson(rawContent);

    // 8. Validate Gemini's response using Zod.
    const validation = blogTitleSchema.safeParse(parsedJson);

    // If validation fails, do not silently create hardcoded titles.
    if (!validation.success) {
      console.error(
        "Invalid Gemini blog-title response:",
        validation.error.flatten(),
      );

      return res.status(502).json({
        success: false,
        message: "AI returned an invalid blog title response.",
      });
    }

    // 9. Use ONLY the validated titles.
    const titles = validation.data.titles
      .map((title) => title.trim())
      .filter(Boolean)
      .slice(0, 8);

    // Make sure the final result still contains 5–8 titles.
    if (titles.length < 5) {
      return res.status(502).json({
        success: false,
        message: "AI returned fewer than 5 valid blog titles.",
      });
    }

    // 10. Save the generated titles to the database.
    let savedCreation = null;

    try {
      savedCreation = await Creation.create({
        userId: req.userId,
        userName: req.userName || "QuickAI Creator",
        prompt: finalPrompt,
        content: JSON.stringify(titles),
        type: "blog-title",
        publish: false,
        likes: [],
      });
    } catch (dbErr) {
      // Database failure should not destroy an otherwise valid AI response.
      console.warn(
        "Creation saving error in generateBlogTitle:",
        dbErr.message,
      );
    }

    // 11. Update free-plan usage.
    let updatedUsage = currentUsage;

    if (isFreePlan && req.dbUser) {
      try {
        req.dbUser.freeUsage = currentUsage + 1;

        await req.dbUser.save();

        updatedUsage = req.dbUser.freeUsage;
      } catch (usageErr) {
        console.warn(
          "Usage increment error in generateBlogTitle:",
          usageErr.message,
        );
      }
    }

    // 12. Return the existing API contract.
    // Blogtitles.jsx can continue using response.titles.
    return res.status(200).json({
      success: true,
      message: "Blog titles generated successfully",
      titles,
      content: rawContent,
      creation: savedCreation,
      usage: updatedUsage,
      plan: req.plan || "free",
    });
  } catch (error) {
    // Use the existing centralized AI error handler.
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

    const imageBuffer = Buffer.from(clipdropResponse.data);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "quickai_creations",
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
      uploadStream.end(imageBuffer);
    });

    const secureImageUrl = uploadResult?.secure_url;

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
        const fileBuffer = await fs.promises.readFile(tempFilePath);
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

    // 5. Call Gemini for Structured JSON Resume Review validated with Zod & prompt security
    const validatedAnalysis = await analyzeResumeTextWithAi(cleanedText, {
      userId: req.userId,
      ip: req.ip || "unknown",
    });

    // 6. Format Markdown for UI display and backward compatibility
    const reviewMarkdown = formatResumeAnalysisMarkdown(validatedAnalysis);

    // 7. Save to Database
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
      analysis: validatedAnalysis,
      creation: savedCreation,
      plan: req.plan,
    });
  } catch (error) {
    return handleAiErrorResponse(error, res, "review resume");
  } finally {
    // Cleanup temporary uploaded file asynchronously
    if (tempFilePath) {
      fs.promises.unlink(tempFilePath).catch((err) => {
        if (err.code !== "ENOENT") {
          console.warn("Failed to delete temp file:", err.message);
        }
      });
    }
  }
};

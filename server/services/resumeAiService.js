import axios from "axios";
import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_kEY;

const AI = new OpenAI({
  apiKey: apiKey || "dummy_key",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// Supported Gemini models with prioritized fallback hierarchy
const SUPPORTED_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

/**
 * Educational abbreviation dictionary for fast normalization
 */
export const expandEducationText = (text = "") => {
  if (!text || typeof text !== "string") return text;
  let expanded = text.trim();

  // Compound patterns first (e.g. "BE CS", "BE ENTC", "BTech CSE", "B.Tech in IT")
  const compoundRegex =
    /^(B\.?E\.?|B\.?Tech\.?|M\.?E\.?|M\.?Tech\.?|B\.?C\.?A\.?|M\.?C\.?A\.?|B\.?B\.?A\.?|M\.?B\.?A\.?|B\.?Sc\.?|M\.?Sc\.?|B\.?S\.?|M\.?S\.?)\s*(?:in\s+)?(CSE|CS|ENTC|E&TC|E&Tc|ETC|ECE|EEE|EE|MECH|ME|CIVIL|AI\s*&\s*DS|AIDS|AI\/DS|AI\s*&\s*ML|AIML|AI\/ML|IT)(.*)$/i;
  const match = expanded.match(compoundRegex);
  if (match) {
    const rawDeg = match[1].toUpperCase().replace(/\./g, "");
    const rawBranch = match[2].toUpperCase().replace(/\s+/g, "");
    const rest = match[3] ? match[3].trim() : "";

    let degFull = "Bachelor of Engineering";
    if (rawDeg.startsWith("BTECH")) degFull = "Bachelor of Technology";
    else if (rawDeg.startsWith("MTECH")) degFull = "Master of Technology";
    else if (rawDeg.startsWith("ME")) degFull = "Master of Engineering";
    else if (rawDeg.startsWith("BCA")) degFull = "Bachelor of Computer Applications";
    else if (rawDeg.startsWith("MCA")) degFull = "Master of Computer Applications";
    else if (rawDeg.startsWith("BBA")) degFull = "Bachelor of Business Administration";
    else if (rawDeg.startsWith("MBA")) degFull = "Master of Business Administration";
    else if (rawDeg.startsWith("BSC") || rawDeg === "BS") degFull = "Bachelor of Science";
    else if (rawDeg.startsWith("MSC") || rawDeg === "MS") degFull = "Master of Science";

    let branchFull = "Computer Science and Engineering";
    if (rawBranch === "CS" || rawBranch === "CSE") branchFull = "Computer Science and Engineering";
    else if (["ENTC", "E&TC", "ETC"].includes(rawBranch)) branchFull = "Electronics & Telecommunication Engineering";
    else if (rawBranch === "ECE") branchFull = "Electronics and Communication Engineering";
    else if (rawBranch === "IT") branchFull = "Information Technology";
    else if (rawBranch === "EEE") branchFull = "Electrical and Electronics Engineering";
    else if (rawBranch === "EE") branchFull = "Electrical Engineering";
    else if (rawBranch === "ME" || rawBranch === "MECH") branchFull = "Mechanical Engineering";
    else if (rawBranch === "CIVIL") branchFull = "Civil Engineering";
    else if (rawBranch.includes("DS")) branchFull = "Artificial Intelligence and Data Science";
    else if (rawBranch.includes("ML")) branchFull = "Artificial Intelligence and Machine Learning";

    return `${degFull} in ${branchFull}${rest ? ` ${rest}` : ""}`;
  }

  // Degrees
  expanded = expanded
    .replace(/\b(B\.?E\.?)\b/gi, "Bachelor of Engineering")
    .replace(/\b(B\.?Tech\.?)\b/gi, "Bachelor of Technology")
    .replace(/\b(M\.?E\.?)\b/gi, "Master of Engineering")
    .replace(/\b(M\.?Tech\.?)\b/gi, "Master of Technology")
    .replace(/\b(B\.?C\.?A\.?)\b/gi, "Bachelor of Computer Applications")
    .replace(/\b(M\.?C\.?A\.?)\b/gi, "Master of Computer Applications")
    .replace(/\b(B\.?B\.?A\.?)\b/gi, "Bachelor of Business Administration")
    .replace(/\b(M\.?B\.?A\.?)\b/gi, "Master of Business Administration")
    .replace(/\b(B\.?Sc\.?)\b/gi, "Bachelor of Science")
    .replace(/\b(M\.?Sc\.?)\b/gi, "Master of Science")
    .replace(/\b(B\.?S\.?)\b/gi, "Bachelor of Science")
    .replace(/\b(M\.?S\.?)\b/gi, "Master of Science")
    .replace(/\b(Ph\.?D\.?)\b/gi, "Doctor of Philosophy");

  // Branches / Specializations
  expanded = expanded
    .replace(/\b(E&TC|E&Tc|E\s*&\s*TC|ENTC|ETC)\b/gi, "Electronics & Telecommunication Engineering")
    .replace(/\b(ECE)\b/gi, "Electronics and Communication Engineering")
    .replace(/\b(CSE)\b/gi, "Computer Science and Engineering")
    .replace(/\b(IT)\b/gi, "Information Technology")
    .replace(/\b(EEE)\b/gi, "Electrical and Electronics Engineering")
    .replace(/\b(EE)\b/gi, "Electrical Engineering")
    .replace(/\b(AI\s*&\s*DS|AIDS|AI\/DS)\b/gi, "Artificial Intelligence and Data Science")
    .replace(/\b(AI\s*&\s*ML|AIML|AI\/ML)\b/gi, "Artificial Intelligence and Machine Learning");

  // Well known colleges / institutes (only replace if not already part of the expanded full title)
  if (!/Padmabhooshan Vasantdada Patil Institute of Technology/i.test(expanded)) {
    expanded = expanded.replace(/\bPVPIT\b/g, "Padmabhooshan Vasantdada Patil Institute of Technology (PVPIT)");
  }
  if (!/Jayawantrao Sawant College of Engineering/i.test(expanded)) {
    expanded = expanded.replace(/\bJSCOE\b/g, "Jayawantrao Sawant College of Engineering (JSCOE)");
  }
  if (!/College of Engineering Pune/i.test(expanded)) {
    expanded = expanded.replace(/\bCOEP\b/g, "College of Engineering Pune (COEP)");
  }
  if (!/Pune Institute of Computer Technology/i.test(expanded)) {
    expanded = expanded.replace(/\bPICT\b/g, "Pune Institute of Computer Technology (PICT)");
  }
  if (!/Veermata Jijabai Technological Institute/i.test(expanded)) {
    expanded = expanded.replace(/\bVJTI\b/g, "Veermata Jijabai Technological Institute (VJTI)");
  }
  if (!/Pimpri Chinchwad College of Engineering/i.test(expanded)) {
    expanded = expanded.replace(/\bPCCOE\b/g, "Pimpri Chinchwad College of Engineering (PCCOE)");
  }
  if (!/Vishwakarma Institute of Technology/i.test(expanded)) {
    expanded = expanded.replace(/\bVIT\s*(?:Pune)?\b/gi, "Vishwakarma Institute of Technology (VIT)");
  }
  if (!/Maharashtra Institute of Technology/i.test(expanded)) {
    expanded = expanded.replace(/\bMIT\s*(?:Pune)?\b/gi, "Maharashtra Institute of Technology (MIT)");
  }
  if (!/Savitribai Phule Pune University/i.test(expanded)) {
    expanded = expanded.replace(/\bSPPU\b/g, "Savitribai Phule Pune University (SPPU)");
  }

  return expanded.replace(/\s{2,}/g, " ").trim();
};

/**
 * Expands user keywords into a complete, professional 4+ sentence summary
 */
export const synthesizeSummaryFromKeywords = (keywordsText = "", role = "Software Developer", skills = {}) => {
  const text = keywordsText || "";
  const techList = [];

  const checkAndAdd = (keyword, formalName) => {
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(text) && !techList.includes(formalName)) {
      techList.push(formalName);
    }
  };

  checkAndAdd("react", "React.js");
  checkAndAdd("react.js", "React.js");
  checkAndAdd("typescript", "TypeScript");
  checkAndAdd("ts", "TypeScript");
  checkAndAdd("javascript", "JavaScript");
  checkAndAdd("js", "JavaScript");
  checkAndAdd("node", "Node.js");
  checkAndAdd("node.js", "Node.js");
  checkAndAdd("express", "Express.js");
  checkAndAdd("express.js", "Express.js");
  checkAndAdd("nestjs", "NestJS");
  checkAndAdd("nest.js", "NestJS");
  checkAndAdd("mongo", "MongoDB");
  checkAndAdd("mongodb", "MongoDB");
  checkAndAdd("mongoose", "Mongoose");
  checkAndAdd("postgres", "PostgreSQL");
  checkAndAdd("postgresql", "PostgreSQL");
  checkAndAdd("mysql", "MySQL");
  checkAndAdd("redis", "Redis");
  checkAndAdd("jwt", "JSON Web Tokens (JWT)");
  checkAndAdd("rest", "RESTful APIs");
  checkAndAdd("rest api", "RESTful APIs");
  checkAndAdd("docker", "Docker");
  checkAndAdd("clerk", "Clerk Authentication");
  checkAndAdd("websockets", "WebSockets");
  checkAndAdd("git", "Git");
  checkAndAdd("github", "GitHub");
  checkAndAdd("ci/cd", "CI/CD Pipelines");
  checkAndAdd("tailwind", "Tailwind CSS");

  if (techList.length < 3 && skills && typeof skills === "object") {
    const flattened = Object.values(skills).flat().filter(Boolean);
    flattened.forEach((s) => {
      if (!techList.includes(s) && techList.length < 8) techList.push(s);
    });
  }

  const backendTools = techList.filter((t) => ["Node.js", "Express.js", "NestJS", "MongoDB", "PostgreSQL", "MySQL", "Redis", "RESTful APIs"].includes(t));
  const frontendTools = techList.filter((t) => ["React.js", "TypeScript", "JavaScript", "Tailwind CSS"].includes(t));

  const targetTitle = role && role !== "Professional" ? role : "Software Developer";

  const s1 = `Results-driven ${targetTitle} with proven expertise in building scalable, production-grade web applications and high-performance software systems.`;
  const s2 = frontendTools.length > 0
    ? `Experienced in crafting responsive, accessible user interfaces and component architectures using ${frontendTools.join(", ")}.`
    : `Skilled in developing clean, responsive user interfaces that deliver intuitive and frictionless user experiences.`;
  const s3 = backendTools.length > 0
    ? `Proficient in architecting robust backend services, secure authentication workflows, and high-throughput data pipelines leveraging ${backendTools.join(", ")}.`
    : `Adept at designing modular RESTful APIs, database schemas, and secure authentication workflows to ensure high application reliability.`;
  const s4 = `Committed to engineering excellence with strong skills in version control, automated testing, agile collaboration, and continuous delivery pipelines.`;

  return [s1, s2, s3, s4].join(" ");
};

/**
 * Strips markdown code blocks and returns clean JSON string
 */
export const cleanJsonString = (raw) => {
  if (!raw || typeof raw !== "string") return "{}";
  let cleaned = raw.trim();

  // Strip code fences
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
    }
  }

  // Find first { and last }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  } else {
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket >= firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  return cleaned.trim();
};

/**
 * Generates an intelligent high-quality fallback response if API is unreachable
 */
const generateHeuristicFallback = (systemInstruction, userPrompt) => {
  const isAbbreviation =
    systemInstruction.includes("abbreviation and entity expansion") ||
    userPrompt.includes("Field Context:") ||
    userPrompt.includes("expandedText");

  if (isAbbreviation) {
    const textMatch = userPrompt.match(/Text:\s*([^\n\r]+)/i);
    const rawText = textMatch ? textMatch[1].trim() : "";
    const expanded = expandEducationText(rawText);
    const isChanged = expanded.toLowerCase() !== rawText.toLowerCase();

    // Check if the input is a known full name or completely random/ambiguous unrecognized
    const isKnownAcronym = /(JSCOE|PVPIT|COEP|PICT|VJTI|PCCOE|VIT|MIT|SPPU|IIT|NIT|IIIT|BITS|BE|BTech|ME|MTech|BCA|MCA|BBA|MBA|BSc|MSc|BS|MS|PhD|ENTC|E&TC|ETC|ECE|CSE|CS|IT|EEE|EE|AIDS|AIML)/i.test(rawText);
    const isVerified = isChanged || isKnownAcronym || rawText.length > 20;

    return {
      expandedText: expanded || rawText,
      verified: isVerified,
    };
  }

  const isEducation =
    systemInstruction.includes("Education") ||
    systemInstruction.includes("academic") ||
    userPrompt.includes("Degree/Course:") ||
    userPrompt.includes("Education Entry:");

  if (isEducation) {
    const degreeMatch = userPrompt.match(/Degree\/Course:\s*([^\n\r]+)/i);
    const instMatch = userPrompt.match(/Institution\/College:\s*([^\n\r]+)/i);
    const locMatch = userPrompt.match(/Location:\s*([^\n\r]+)/i);
    const gradeMatch = userPrompt.match(/Grade\/CGPA:\s*([^\n\r]+)/i);
    const startMatch = userPrompt.match(/Start Date:\s*([^\n\r]+)/i);
    const endMatch = userPrompt.match(/End Date:\s*([^\n\r]+)/i);

    const rawDegree = degreeMatch ? degreeMatch[1].trim() : "Bachelor of Engineering in Computer Science and Engineering";
    const rawInst = instMatch ? instMatch[1].trim() : "Padmabhooshan Vasantdada Patil Institute of Technology (PVPIT)";

    return {
      degree: expandEducationText(rawDegree),
      institution: expandEducationText(rawInst),
      location: locMatch ? locMatch[1].trim() : "Pune",
      startDate: startMatch ? startMatch[1].trim() : "2022-11",
      endDate: endMatch ? endMatch[1].trim() : "2026-06",
      grade: gradeMatch ? gradeMatch[1].trim() : "8.91",
    };
  }

  const isSummary =
    systemInstruction.includes("Professional Summary") ||
    userPrompt.includes("summary") ||
    userPrompt.includes("Summary") ||
    userPrompt.includes("Keywords");

  if (isSummary) {
    const draftMatch = userPrompt.match(/User Notes \/ Keywords \/ Summary Draft:\s*([^\n\r]+)/i);
    const roleMatch = userPrompt.match(/Target Role:\s*([^\n\r]+)/i);
    const keywords = draftMatch ? draftMatch[1] : "";
    const role = roleMatch ? roleMatch[1] : "Software Developer";

    return {
      summary: synthesizeSummaryFromKeywords(keywords, role),
    };
  }

  const isProject =
    systemInstruction.includes("project description") ||
    userPrompt.includes("project") ||
    userPrompt.includes("Project");

  if (isProject) {
    return {
      description: [
        "Architected and deployed a comprehensive software solution with modular architecture and modern user experience.",
        "Implemented secure authentication, data validation pipelines, and optimized RESTful API endpoints for high reliability.",
        "Designed and maintained scalable database schemas, ensuring fast query performance and data integrity across modules.",
      ].join("\n"),
    };
  }

  const isExperience =
    systemInstruction.includes("experience") ||
    userPrompt.includes("experience") ||
    userPrompt.includes("bullet");

  if (isExperience) {
    return {
      bullets: [
        "Spearheaded the development and integration of core application modules, increasing system efficiency and maintainability.",
        "Engineered robust RESTful APIs and optimized database operations, reducing average response latency.",
        "Collaborated with cross-functional engineering teams to implement clean code standards, unit testing, and agile delivery cycles.",
      ],
    };
  }

  return { success: true };
};

/**
 * Call Gemini model with structured JSON response, automatic retry and fallback
 */
export const callGeminiJson = async (
  systemInstruction,
  userPrompt,
  maxTokens = 2500,
  temperature = 0.3
) => {
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured; using heuristic fallback.");
    return generateHeuristicFallback(systemInstruction, userPrompt);
  }

  let lastError = null;

  // 1. Primary: Direct Google REST API with structured responseMimeType
  for (const model of SUPPORTED_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await axios.post(
          restUrl,
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `[SYSTEM INSTRUCTION]\n${systemInstruction}\n\n[USER REQUEST]\n${userPrompt}\n\n[OUTPUT REQUIREMENT]\nRespond strictly with valid JSON only.`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseMimeType: "application/json",
            },
          },
          { timeout: 12000 }
        );

        const rawContent = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawContent && typeof rawContent === "string" && rawContent.trim()) {
          const cleaned = cleanJsonString(rawContent);
          return JSON.parse(cleaned);
        }
      } catch (err) {
        lastError = err;
        const status = err.status || err.response?.status;
        const msg = String(err.message || "");
        const isTransient =
          status === 503 ||
          status === 429 ||
          msg.includes("503") ||
          msg.includes("429") ||
          msg.includes("UNAVAILABLE") ||
          msg.includes("high demand") ||
          msg.includes("timeout") ||
          msg.includes("ECONNABORTED");

        if (!isTransient || attempt === 1) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  // 2. Secondary Fallback: OpenAI-compatible endpoint
  for (const model of SUPPORTED_MODELS) {
    try {
      const response = await AI.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: `${systemInstruction}\nRespond strictly with valid JSON only.`,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      });

      const rawContent = response.choices?.[0]?.message?.content;
      if (rawContent && typeof rawContent === "string" && rawContent.trim()) {
        const cleaned = cleanJsonString(rawContent);
        return JSON.parse(cleaned);
      }
    } catch (err) {
      lastError = err;
    }
  }

  console.warn("AI generation failed across all models, using heuristic synthesizer:", lastError?.message);
  return generateHeuristicFallback(systemInstruction, userPrompt);
};

/**
 * Service function for abbreviation expansion with Gemini AI + deterministic fallback
 */
export const expandAbbreviationService = async ({ text = "", context = "General", location = "" }) => {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { expandedText: text || "", verified: false };
  }

  const cleanInput = text.trim();

  try {
    const { buildAbbreviationExpansionPrompt } = await import("../prompts/resumePrompts.js");
    const { systemInstruction, userPrompt } = buildAbbreviationExpansionPrompt({
      text: cleanInput,
      context,
      location,
    });

    const aiRes = await callGeminiJson(systemInstruction, userPrompt, 1500, 0.2);
    if (aiRes && typeof aiRes.expandedText === "string" && aiRes.expandedText.trim()) {
      return {
        expandedText: aiRes.expandedText.trim(),
        verified: Boolean(aiRes.verified !== false),
      };
    }
  } catch (err) {
    console.warn("AI abbreviation expansion error, falling back to deterministic normalizer:", err.message);
  }

  const expanded = expandEducationText(cleanInput);
  const isChanged = expanded.toLowerCase() !== cleanInput.toLowerCase();
  const isKnownAcronym = /(JSCOE|PVPIT|COEP|PICT|VJTI|PCCOE|VIT|MIT|SPPU|IIT|NIT|IIIT|BITS|BE|BTech|ME|MTech|BCA|MCA|BBA|MBA|BSc|MSc|BS|MS|PhD|ENTC|E&TC|ETC|ECE|CSE|CS|IT|EEE|EE|AIDS|AIML)/i.test(cleanInput);

  return {
    expandedText: expanded,
    verified: isChanged || isKnownAcronym || (cleanInput.length > 20 && !isChanged),
  };
};

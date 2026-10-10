/**
 * Section-Aware Semantic Resume Chunking Service (Phase 2 — Step 4)
 * Transforms structured resume data into high-quality semantic chunks
 * optimized for embedding models and vector retrieval.
 */

import {
  safeParseExtractedResumeInfo,
  safeParseResumeChunk,
} from "../schemas/resumeAnalysisSchema.js";

const DEFAULT_MAX_CHUNK_CHARS = 800;

/**
 * Creates a standardized chunk object conforming to resumeChunkSchema
 */
export const createChunk = ({
  chunkId,
  resumeId = "",
  section,
  content,
  metadata = {},
}) => {
  const rawChunk = {
    chunkId:
      chunkId ||
      `chunk_${section}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    resumeId: String(resumeId || ""),
    section,
    content: String(content || "").trim(),
    metadata: {
      section,
      company: metadata.company || null,
      role: metadata.role || null,
      duration: metadata.duration || null,
      location: metadata.location || null,
      projectName: metadata.projectName || null,
      technologies: Array.isArray(metadata.technologies)
        ? metadata.technologies
        : [],
      degree: metadata.degree || null,
      institution: metadata.institution || null,
      grade: metadata.grade || null,
      chunkIndex:
        typeof metadata.chunkIndex === "number" ? metadata.chunkIndex : 0,
      totalChunksInSection:
        typeof metadata.totalChunksInSection === "number"
          ? metadata.totalChunksInSection
          : 1,
      itemIndex:
        typeof metadata.itemIndex === "number" ? metadata.itemIndex : undefined,
    },
  };

  const parsed = safeParseResumeChunk(rawChunk);
  return parsed.success ? parsed.data : rawChunk;
};

/**
 * Chunks candidate summary/objective
 */
const chunkSummary = (summaryText = "", resumeId = "", maxChars = DEFAULT_MAX_CHUNK_CHARS) => {
  const text = (summaryText || "").trim();
  if (!text) return [];

  if (text.length <= maxChars) {
    return [
      createChunk({
        chunkId: `${resumeId || "resume"}_summary_0`,
        resumeId,
        section: "summary",
        content: `Professional Summary: ${text}`,
        metadata: {
          section: "summary",
          chunkIndex: 0,
          totalChunksInSection: 1,
        },
      }),
    ];
  }

  // Split large summary by sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+|\S+/g) || [text];
  const chunks = [];
  let currentSentences = [];
  let currentLen = 0;

  for (const sentence of sentences) {
    const sTrimmed = sentence.trim();
    if (!sTrimmed) continue;

    if (currentLen + sTrimmed.length > maxChars && currentSentences.length > 0) {
      const partIndex = chunks.length;
      chunks.push({
        partIndex,
        content: currentSentences.join(" "),
      });
      // 1 sentence overlap for context continuity
      currentSentences = [currentSentences[currentSentences.length - 1], sTrimmed];
      currentLen = currentSentences.reduce((acc, s) => acc + s.length + 1, 0);
    } else {
      currentSentences.push(sTrimmed);
      currentLen += sTrimmed.length + 1;
    }
  }

  if (currentSentences.length > 0) {
    chunks.push({
      partIndex: chunks.length,
      content: currentSentences.join(" "),
    });
  }

  return chunks.map((c, idx) =>
    createChunk({
      chunkId: `${resumeId || "resume"}_summary_${idx}`,
      resumeId,
      section: "summary",
      content: `Professional Summary (Part ${idx + 1}/${chunks.length}): ${c.content}`,
      metadata: {
        section: "summary",
        chunkIndex: idx,
        totalChunksInSection: chunks.length,
      },
    })
  );
};

/**
 * Chunks candidate technical & domain skills
 */
const chunkSkills = (skillsList = [], resumeId = "", maxChars = DEFAULT_MAX_CHUNK_CHARS) => {
  const validSkills = Array.isArray(skillsList)
    ? skillsList.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (validSkills.length === 0) return [];

  // If skills fit comfortably in one chunk
  const singleString = validSkills.join(", ");
  if (singleString.length <= maxChars && validSkills.length <= 25) {
    return [
      createChunk({
        chunkId: `${resumeId || "resume"}_skills_0`,
        resumeId,
        section: "skills",
        content: `Skills & Technical Competencies: ${singleString}`,
        metadata: {
          section: "skills",
          technologies: validSkills,
          chunkIndex: 0,
          totalChunksInSection: 1,
        },
      }),
    ];
  }

  // Batch skills into semantic subsets of 15-20 skills
  const batches = [];
  let currentBatch = [];
  let currentLen = 0;

  for (const skill of validSkills) {
    if ((currentLen + skill.length > maxChars || currentBatch.length >= 20) && currentBatch.length > 0) {
      batches.push([...currentBatch]);
      currentBatch = [skill];
      currentLen = skill.length;
    } else {
      currentBatch.push(skill);
      currentLen += skill.length + 2;
    }
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches.map((batch, idx) =>
    createChunk({
      chunkId: `${resumeId || "resume"}_skills_${idx}`,
      resumeId,
      section: "skills",
      content: `Skills & Technical Competencies (Group ${idx + 1}/${batches.length}): ${batch.join(", ")}`,
      metadata: {
        section: "skills",
        technologies: batch,
        chunkIndex: idx,
        totalChunksInSection: batches.length,
      },
    })
  );
};

/**
 * Chunks candidate work experience positions
 */
const chunkExperience = (experienceList = [], resumeId = "", maxChars = DEFAULT_MAX_CHUNK_CHARS) => {
  if (!Array.isArray(experienceList) || experienceList.length === 0) return [];

  const chunks = [];

  experienceList.forEach((exp, expIdx) => {
    if (!exp || typeof exp !== "object") return;

    const company = (exp.company || "").trim();
    const role = (exp.role || "").trim();
    const duration = (exp.duration || "").trim();
    const location = (exp.location || "").trim();
    const technologies = Array.isArray(exp.technologies)
      ? exp.technologies.filter(Boolean)
      : [];

    const responsibilities = Array.isArray(exp.responsibilities)
      ? exp.responsibilities.map((r) => String(r).trim()).filter(Boolean)
      : [];

    const headerParts = [];
    if (company && role) {
      headerParts.push(`Experience at ${company} as ${role}`);
    } else if (company) {
      headerParts.push(`Experience at ${company}`);
    } else if (role) {
      headerParts.push(`Experience as ${role}`);
    } else {
      headerParts.push(`Professional Experience Position #${expIdx + 1}`);
    }

    if (duration) headerParts.push(`(${duration})`);
    if (location) headerParts.push(`[${location}]`);

    const header = `${headerParts.join(" ")}:`;

    // Case 1: No bullets provided, single header chunk
    if (responsibilities.length === 0) {
      chunks.push(
        createChunk({
          chunkId: `${resumeId || "resume"}_exp_${expIdx}_0`,
          resumeId,
          section: "experience",
          content: header,
          metadata: {
            section: "experience",
            itemIndex: expIdx,
            company: company || null,
            role: role || null,
            duration: duration || null,
            location: location || null,
            technologies,
            chunkIndex: 0,
            totalChunksInSection: 1,
          },
        })
      );
      return;
    }

    // Case 2: Full experience fits in one chunk
    const fullContent = `${header}\n${responsibilities.map((r) => `• ${r}`).join("\n")}`;
    if (fullContent.length <= maxChars) {
      chunks.push(
        createChunk({
          chunkId: `${resumeId || "resume"}_exp_${expIdx}_0`,
          resumeId,
          section: "experience",
          content: fullContent,
          metadata: {
            section: "experience",
            itemIndex: expIdx,
            company: company || null,
            role: role || null,
            duration: duration || null,
            location: location || null,
            technologies,
            chunkIndex: 0,
            totalChunksInSection: 1,
          },
        })
      );
      return;
    }

    // Case 3: Large experience entry — split responsibilities into sub-batches
    const subBatches = [];
    let currentBullets = [];
    let currentLen = header.length + 10;

    for (const bullet of responsibilities) {
      const lineLen = bullet.length + 3; // for '• \n'
      if (currentLen + lineLen > maxChars && currentBullets.length > 0) {
        subBatches.push([...currentBullets]);
        currentBullets = [bullet];
        currentLen = header.length + lineLen;
      } else {
        currentBullets.push(bullet);
        currentLen += lineLen;
      }
    }

    if (currentBullets.length > 0) {
      subBatches.push(currentBullets);
    }

    subBatches.forEach((batch, batchIdx) => {
      chunks.push(
        createChunk({
          chunkId: `${resumeId || "resume"}_exp_${expIdx}_${batchIdx}`,
          resumeId,
          section: "experience",
          content: `${header} (Part ${batchIdx + 1}/${subBatches.length})\n${batch.map((b) => `• ${b}`).join("\n")}`,
          metadata: {
            section: "experience",
            itemIndex: expIdx,
            company: company || null,
            role: role || null,
            duration: duration || null,
            location: location || null,
            technologies,
            chunkIndex: batchIdx,
            totalChunksInSection: subBatches.length,
          },
        })
      );
    });
  });

  return chunks;
};

/**
 * Chunks candidate projects
 */
const chunkProjects = (projectsList = [], resumeId = "", maxChars = DEFAULT_MAX_CHUNK_CHARS) => {
  if (!Array.isArray(projectsList) || projectsList.length === 0) return [];

  const chunks = [];

  projectsList.forEach((proj, projIdx) => {
    if (!proj || typeof proj !== "object") return;

    const name = (proj.name || "").trim() || `Project #${projIdx + 1}`;
    const desc = (proj.description || "").trim();
    const technologies = Array.isArray(proj.technologies)
      ? proj.technologies.map(String).filter(Boolean)
      : [];
    const responsibilities = Array.isArray(proj.responsibilities)
      ? proj.responsibilities.map(String).filter(Boolean)
      : [];
    const url = (proj.url || "").trim();

    const lines = [`Project: ${name}`];
    if (technologies.length > 0) {
      lines.push(`Technologies: ${technologies.join(", ")}`);
    }
    if (desc) {
      lines.push(`Description: ${desc}`);
    }
    if (responsibilities.length > 0) {
      lines.push(`Key Contributions:\n${responsibilities.map((r) => `• ${r}`).join("\n")}`);
    }
    if (url) {
      lines.push(`URL: ${url}`);
    }

    const fullText = lines.join("\n");

    if (fullText.length <= maxChars) {
      chunks.push(
        createChunk({
          chunkId: `${resumeId || "resume"}_proj_${projIdx}_0`,
          resumeId,
          section: "project",
          content: fullText,
          metadata: {
            section: "project",
            itemIndex: projIdx,
            projectName: name,
            technologies,
            chunkIndex: 0,
            totalChunksInSection: 1,
          },
        })
      );
      return;
    }

    // Large project: Split overview and key contributions while keeping project header
    const part1Lines = [`Project: ${name}`];
    if (technologies.length > 0) part1Lines.push(`Technologies: ${technologies.join(", ")}`);
    if (desc) part1Lines.push(`Description: ${desc}`);
    if (url) part1Lines.push(`URL: ${url}`);

    chunks.push(
      createChunk({
        chunkId: `${resumeId || "resume"}_proj_${projIdx}_0`,
        resumeId,
        section: "project",
        content: part1Lines.join("\n"),
        metadata: {
          section: "project",
          itemIndex: projIdx,
          projectName: name,
          technologies,
          chunkIndex: 0,
          totalChunksInSection: responsibilities.length > 0 ? 2 : 1,
        },
      })
    );

    if (responsibilities.length > 0) {
      chunks.push(
        createChunk({
          chunkId: `${resumeId || "resume"}_proj_${projIdx}_1`,
          resumeId,
          section: "project",
          content: `Project ${name} (Key Contributions):\n${responsibilities.map((r) => `• ${r}`).join("\n")}`,
          metadata: {
            section: "project",
            itemIndex: projIdx,
            projectName: name,
            technologies,
            chunkIndex: 1,
            totalChunksInSection: 2,
          },
        })
      );
    }
  });

  return chunks;
};

/**
 * Chunks candidate education credentials
 */
const chunkEducation = (educationList = [], resumeId = "") => {
  if (!Array.isArray(educationList) || educationList.length === 0) return [];

  const chunks = [];

  educationList.forEach((edu, eduIdx) => {
    if (!edu || typeof edu !== "object") return;

    const degree = (edu.degree || "").trim();
    const institution = (edu.institution || "").trim();
    const duration = (edu.duration || "").trim();
    const location = (edu.location || "").trim();
    const grade = (edu.grade || "").trim();

    const parts = ["Education:"];
    if (degree && institution) {
      parts.push(`${degree} at ${institution}`);
    } else if (degree) {
      parts.push(degree);
    } else if (institution) {
      parts.push(`Studied at ${institution}`);
    } else {
      parts.push(`Education Entry #${eduIdx + 1}`);
    }

    if (duration) parts.push(`(${duration})`);
    if (location) parts.push(`[${location}]`);
    if (grade) parts.push(`. Grade/GPA: ${grade}`);

    chunks.push(
      createChunk({
        chunkId: `${resumeId || "resume"}_edu_${eduIdx}_0`,
        resumeId,
        section: "education",
        content: parts.join(" "),
        metadata: {
          section: "education",
          itemIndex: eduIdx,
          degree: degree || null,
          institution: institution || null,
          duration: duration || null,
          location: location || null,
          grade: grade || null,
          chunkIndex: 0,
          totalChunksInSection: 1,
        },
      })
    );
  });

  return chunks;
};

/**
 * Chunks candidate certifications
 */
const chunkCertifications = (certificationsList = [], resumeId = "", maxChars = DEFAULT_MAX_CHUNK_CHARS) => {
  if (!Array.isArray(certificationsList) || certificationsList.length === 0) return [];

  const stringCerts = certificationsList
    .map((c) => (typeof c === "string" ? c.trim() : c?.name || JSON.stringify(c)))
    .filter(Boolean);

  if (stringCerts.length === 0) return [];

  const fullContent = `Certifications & Licenses: ${stringCerts.join(", ")}`;
  if (fullContent.length <= maxChars) {
    return [
      createChunk({
        chunkId: `${resumeId || "resume"}_cert_0`,
        resumeId,
        section: "certification",
        content: fullContent,
        metadata: {
          section: "certification",
          chunkIndex: 0,
          totalChunksInSection: 1,
        },
      }),
    ];
  }

  // Split into batches if long
  const batches = [];
  let current = [];
  let len = 30;

  for (const cert of stringCerts) {
    if (len + cert.length > maxChars && current.length > 0) {
      batches.push([...current]);
      current = [cert];
      len = cert.length + 30;
    } else {
      current.push(cert);
      len += cert.length + 2;
    }
  }
  if (current.length > 0) batches.push(current);

  return batches.map((batch, idx) =>
    createChunk({
      chunkId: `${resumeId || "resume"}_cert_${idx}`,
      resumeId,
      section: "certification",
      content: `Certifications & Licenses (Part ${idx + 1}/${batches.length}): ${batch.join(", ")}`,
      metadata: {
        section: "certification",
        chunkIndex: idx,
        totalChunksInSection: batches.length,
      },
    })
  );
};

/**
 * Chunks candidate achievements
 */
const chunkAchievements = (achievementsList = [], resumeId = "", maxChars = DEFAULT_MAX_CHUNK_CHARS) => {
  if (!Array.isArray(achievementsList) || achievementsList.length === 0) return [];

  const stringAchievements = achievementsList
    .map((a) => (typeof a === "string" ? a.trim() : a?.title || a?.description || JSON.stringify(a)))
    .filter(Boolean);

  if (stringAchievements.length === 0) return [];

  const fullContent = `Achievements & Honors:\n${stringAchievements.map((a) => `• ${a}`).join("\n")}`;
  if (fullContent.length <= maxChars) {
    return [
      createChunk({
        chunkId: `${resumeId || "resume"}_achieve_0`,
        resumeId,
        section: "achievement",
        content: fullContent,
        metadata: {
          section: "achievement",
          chunkIndex: 0,
          totalChunksInSection: 1,
        },
      }),
    ];
  }

  const batches = [];
  let current = [];
  let len = 30;

  for (const ach of stringAchievements) {
    if (len + ach.length > maxChars && current.length > 0) {
      batches.push([...current]);
      current = [ach];
      len = ach.length + 30;
    } else {
      current.push(ach);
      len += ach.length + 5;
    }
  }
  if (current.length > 0) batches.push(current);

  return batches.map((batch, idx) =>
    createChunk({
      chunkId: `${resumeId || "resume"}_achieve_${idx}`,
      resumeId,
      section: "achievement",
      content: `Achievements & Honors (Part ${idx + 1}/${batches.length}):\n${batch.map((b) => `• ${b}`).join("\n")}`,
      metadata: {
        section: "achievement",
        chunkIndex: idx,
        totalChunksInSection: batches.length,
      },
    })
  );
};

/**
 * Main Entrypoint: Transforms structured resume data into section-aware semantic chunks
 */
export const chunkStructuredResume = (structuredData, options = {}) => {
  if (!structuredData) return [];

  const {
    resumeId = "resume_doc",
    maxChunkCharSize = DEFAULT_MAX_CHUNK_CHARS,
  } = options;

  const validData = safeParseExtractedResumeInfo(structuredData);

  const chunks = [
    ...chunkSummary(validData.summary, resumeId, maxChunkCharSize),
    ...chunkSkills(validData.skills, resumeId, maxChunkCharSize),
    ...chunkExperience(validData.experience, resumeId, maxChunkCharSize),
    ...chunkProjects(validData.projects, resumeId, maxChunkCharSize),
    ...chunkEducation(validData.education, resumeId),
    ...chunkCertifications(validData.certifications, resumeId, maxChunkCharSize),
    ...chunkAchievements(validData.achievements, resumeId, maxChunkCharSize),
  ];

  return chunks;
};


/**
 * Dedicated prompt generators for AI Resume Builder
 * Enforces strict anti-hallucination guardrails and structured JSON output.
 */

/**
 * Prompt for complete resume content generation / refinement
 */
export const buildResumeGenerationPrompt = (resume) => {
  const systemInstruction = `You are an expert executive resume writer and career strategist.
Your task is to refine and generate professional, high-impact resume content based EXCLUSIVELY on the factual information provided by the user.

CRITICAL ANTI-HALLUCINATION & INTEGRITY RULES:
1. DO NOT invent, fabricate, or assume any facts, companies, job titles, institutions, degrees, certifications, or employment dates.
2. DO NOT invent technologies, tools, libraries, or programming languages that the user has not mentioned.
3. DO NOT fabricate metrics, percentages, dollar amounts, revenue figures, user counts, or team sizes unless explicitly provided in the user's data.
4. Professional Summary: Must contain a MINIMUM of 4 complete sentences expanding the provided user details into an articulate software engineer summary.
5. Experience: Transform rough points into a MINIMUM of 3 complete, active, result-oriented bullet points using strong action verbs (e.g., Engineered, Architected, Streamlined, Developed).
6. Projects: Transform rough notes and features into a MINIMUM of 3 complete lines/sentences detailing architecture, functionality, and implementation without inventing features.
7. Technical Abbreviations: Expand recognized technical abbreviations properly (JS -> JavaScript, TS -> TypeScript, React -> React.js, Node -> Node.js, Express -> Express.js, Mongo -> MongoDB, JWT -> JSON Web Token, REST -> RESTful APIs).
8. You MUST return ONLY a valid, parseable JSON object without markdown formatting, code fences, or additional text.`;

  const userPrompt = `Here is the user's current resume information:
Target Role: ${resume.targetRole || "Professional"}
Personal Summary Draft: ${resume.summary || "None provided"}
Experience: ${JSON.stringify(resume.experience || [])}
Projects: ${JSON.stringify(resume.projects || [])}
Education: ${JSON.stringify(resume.education || [])}
Skills Provided: ${JSON.stringify(resume.skills || {})}
Achievements: ${JSON.stringify(resume.achievements || [])}
Certifications: ${JSON.stringify(resume.certifications || [])}
Optional Job Description Context: ${resume.jobDescription || "None provided"}

Generate a refined, professional version of the resume content strictly adhering to the provided facts.
Return your response in the following exact JSON format:
{
  "summary": "Polished professional summary of at least 4 complete sentences based strictly on provided facts",
  "experience": [
    {
      "company": "Company name from input",
      "role": "Role from input",
      "location": "Location from input",
      "employmentType": "Employment type from input",
      "startDate": "Start date from input",
      "endDate": "End date from input",
      "isCurrent": true/false,
      "responsibilities": [
        "Polished responsibility bullet 1 (complete sentence)",
        "Polished responsibility bullet 2 (complete sentence)",
        "Polished responsibility bullet 3 (complete sentence)"
      ],
      "achievements": ["Polished achievement bullet 1"],
      "technologies": ["Technologies from input"]
    }
  ],
  "projects": [
    {
      "name": "Project name from input",
      "description": "Polished project overview of at least 3 complete sentences explaining development, functionality, and technical implementation",
      "technologies": ["Technologies from input"],
      "responsibilities": [
        "Polished contribution line 1 (complete sentence)",
        "Polished contribution line 2 (complete sentence)",
        "Polished contribution line 3 (complete sentence)"
      ],
      "outcome": "Concise outcome strictly based on provided facts",
      "githubUrl": "URL from input",
      "liveUrl": "URL from input"
    }
  ],
  "achievements": [
    {
      "title": "Title from input",
      "organization": "Organization from input",
      "date": "Date from input",
      "description": "Polished concise description"
    }
  ],
  "skills": {
    "programming": ["Skills categorized from input"],
    "frontend": ["Skills categorized from input"],
    "backend": ["Skills categorized from input"],
    "database": ["Skills categorized from input"],
    "cloud": ["Skills categorized from input"],
    "devops": ["Skills categorized from input"],
    "tools": ["Skills categorized from input"],
    "other": ["Skills categorized from input"]
  }
}`;

  return { systemInstruction, userPrompt };
};

/**
 * Prompt for expanding a Project Description from keywords/notes
 */
export const buildProjectDescriptionPrompt = (projectData, context = {}) => {
  const systemInstruction = `You are an expert technical resume writer and software engineering career advisor.
Your task is to transform rough project notes, feature lists, or keywords into a high-impact, professional project description suitable for a software developer resume.

CRITICAL REQUIREMENTS:
1. Generate a MINIMUM of 3 complete lines/sentences.
2. Structure:
   - Line 1: Explain what was developed and the architectural scope/domain.
   - Line 2: Explain key functionality, core workflows, and technical implementation (e.g. authentication, API integration, data flow).
   - Line 3: Explain purpose, business value, data management, or reliability.
3. Mention technologies ONLY when provided in the project input, technologies list, or context.
4. Expand technical abbreviations professionally (e.g., JWT -> JSON Web Token, REST -> RESTful APIs, DB -> Database).
5. DO NOT fabricate unmentioned technologies, external integrations, metrics, or unsupported features.
6. Avoid generic filler sentences. Output must sound like an articulate, professional software developer.
7. Return ONLY a valid JSON object without markdown or code fences.`;

  const userPrompt = `Project Context:
Project Name: ${projectData.name || "Software Project"}
Technologies: ${Array.isArray(projectData.technologies) ? projectData.technologies.join(", ") : projectData.technologiesText || projectData.technologies || "Not specified"}
User Input / Feature Keywords: ${projectData.description || projectData.responsibilitiesText || projectData.input || "Software application with modern features"}
Target Role: ${context.targetRole || "Software Developer"}
Job Description Context: ${context.jobDescription || "None"}

Transform the user's features and keywords into at least 3 professional, complete sentences.
Return ONLY this JSON format:
{
  "description": "Full multi-sentence description containing at least 3 complete sentences.",
  "bullets": [
    "Complete sentence 1 explaining development and system architecture.",
    "Complete sentence 2 explaining technical implementation and core workflows.",
    "Complete sentence 3 explaining data management, integration, or purpose."
  ]
}`;

  return { systemInstruction, userPrompt };
};

/**
 * Prompt for expanding Experience Key Responsibilities & Achievements
 */
export const buildExperienceBulletsPrompt = (experienceData, context = {}) => {
  const systemInstruction = `You are an expert executive resume writer.
Your task is to transform rough work experience points or keywords into professional resume bullets.

CRITICAL REQUIREMENTS:
1. Generate a MINIMUM of 3 complete sentences/bullets based on the user's input.
2. Start each bullet with a strong action verb (e.g., Engineered, Developed, Architected, Integrated, Optimized, Implemented).
3. Do not invent unmentioned technologies or fabricate fake percentage metrics.
4. Expand technical abbreviations accurately (e.g., JWT -> JSON Web Token, REST APIs -> RESTful APIs).
5. Return ONLY a valid JSON object without markdown or code fences.`;

  const userPrompt = `Experience Details:
Company: ${experienceData.company || "Company"}
Role: ${experienceData.role || context.targetRole || "Software Engineer"}
Technologies: ${Array.isArray(experienceData.technologies) ? experienceData.technologies.join(", ") : experienceData.technologiesText || "None"}
User Notes / Keywords: ${experienceData.responsibilitiesText || experienceData.responsibilities || experienceData.input || ""}

Return ONLY this JSON format:
{
  "bullets": [
    "First complete action-oriented sentence.",
    "Second complete action-oriented sentence.",
    "Third complete action-oriented sentence."
  ]
}`;

  return { systemInstruction, userPrompt };
};

/**
 * Prompt for expanding Professional Summary (min 4 complete sentences)
 */
export const buildSummaryPrompt = (summaryDraft, context = {}) => {
  const systemInstruction = `You are an expert executive resume writer.
Your task is to generate a polished Professional Summary of a MINIMUM of 4 complete sentences.

CRITICAL REQUIREMENTS:
1. The summary MUST contain at least 4 complete sentences.
2. Synthesize user notes, target role, and technical skills into a coherent developer summary.
3. Do not invent unmentioned technologies, fake degrees, or false metrics.
4. Improve grammar, sentence flow, professionalism, and ATS keyword relevance.
5. Return ONLY a valid JSON object without markdown or code fences.`;

  const userPrompt = `Summary Notes / Draft: ${summaryDraft || ""}
Target Role: ${context.targetRole || "Software Developer"}
Job Description Context: ${context.jobDescription || "None"}
Skills Context: ${JSON.stringify(context.skills || {})}

Return ONLY this JSON format:
{
  "summary": "Professional summary with a minimum of 4 complete sentences."
}`;

  return { systemInstruction, userPrompt };
};

/**
 * Prompt for targeted section improvement
 */
export const buildSectionImprovementPrompt = (section, sectionData, context = {}) => {
  if (section === "projectDescription" || (section === "projects" && !Array.isArray(sectionData))) {
    return buildProjectDescriptionPrompt(sectionData, context);
  }
  if (section === "experienceBullets" || (section === "experience" && !Array.isArray(sectionData))) {
    return buildExperienceBulletsPrompt(sectionData, context);
  }
  if (section === "summary") {
    const draftText = typeof sectionData === "string" ? sectionData : sectionData?.summary || "";
    return buildSummaryPrompt(draftText, context);
  }

  const systemInstruction = `You are a professional resume editor.
Your task is to improve and polish a specific section of a user's resume.

CRITICAL RULES:
1. Improve ONLY the requested section: "${section}".
2. DO NOT invent false facts, metrics, unmentioned tools, or fabricate claims.
3. Use strong active verbs, clear phrasing, and professional industry terminology.
4. Ensure minimum length requirements: Summary >= 4 complete sentences; Experience/Projects >= 3 complete bullets/sentences.
5. Output MUST be ONLY a valid JSON object matching the section structure.`;

  const userPrompt = `Target Role: ${context.targetRole || "Professional"}
Job Description Context: ${context.jobDescription || "None"}
Section to improve: "${section}"
Current Section Content:
${JSON.stringify(sectionData, null, 2)}

Improve this section content while preserving complete factual accuracy.
Return a valid JSON object with the key "${section}" containing the improved structure.`;

  return { systemInstruction, userPrompt };
};

/**
 * Prompt for ATS Analysis and scoring against a Job Description
 */
export const buildAtsAnalysisPrompt = (resume, jobDescription) => {
  const systemInstruction = `You are an advanced Applicant Tracking System (ATS) simulation engine and hiring expert.
Your job is to perform an objective, explainable comparison between a user's resume and a target job description.

SCORING RULES & METHODOLOGY:
1. Base score between 0 and 100 on hard skills alignment, relevant experience keywords, domain qualifications, and clarity.
2. matchedKeywords: List keywords, technical skills, tools, and qualifications present in BOTH the job description and the resume.
3. missingKeywords: List critical keywords, tools, or qualifications mentioned in the job description that are NOT found in the resume.
4. suggestions: 3 to 6 concrete, actionable advice items on how the candidate can better tailor or clarify their EXISTING experience to meet the role's needs.
5. DO NOT recommend fabricating skills or qualifications.
6. Return ONLY valid JSON format.`;

  const userPrompt = `Job Description:
${jobDescription}

Candidate Resume Data:
Target Role: ${resume.targetRole || ""}
Summary: ${resume.summary || ""}
Skills: ${JSON.stringify(resume.skills || {})}
Experience: ${JSON.stringify(resume.experience || [])}
Projects: ${JSON.stringify(resume.projects || [])}
Education: ${JSON.stringify(resume.education || [])}
Certifications: ${JSON.stringify(resume.certifications || [])}

Perform the ATS match analysis and return the exact JSON structure:
{
  "score": 78,
  "matchedKeywords": ["Node.js", "Express", "MongoDB", "REST APIs", "Git"],
  "missingKeywords": ["Docker", "Kubernetes", "Redis", "CI/CD Pipelines"],
  "suggestions": [
    "Highlight experience with RESTful microservices in your work experience bullet points.",
    "Ensure your project descriptions mention any asynchronous queue processing you have implemented."
  ]
}`;

  return { systemInstruction, userPrompt };
};

/**
 * Prompt for dedicated AI-powered abbreviation expansion
 */
export const buildAbbreviationExpansionPrompt = ({
  text = "",
  context = "General",
  location = "",
}) => {
  const systemInstruction = `You are an expert AI abbreviation and entity expansion specialist for professional resumes.

Your task is to analyze user input, determine if it contains abbreviations, acronyms, or shortened names within the specified context, and expand them into their official, fully recognized, professional form.

CRITICAL EXPANSION & VERIFICATION RULES:
1. Complete / Full Names: If the input is already a complete, un-abbreviated name (e.g. "Bachelor of Engineering", "Harvard University", "Google"), return it unchanged with "verified": true.
2. Technical Abbreviations (Skills/Tech):
   - "JS" -> "JavaScript", "TS" -> "TypeScript", "React" -> "React.js", "Node" -> "Node.js", "Express" -> "Express.js", "Mongo" -> "MongoDB", "Postgres" -> "PostgreSQL", "JWT" -> "JSON Web Token", "REST" / "REST API" -> "RESTful APIs", "HTML" -> "HTML5", "CSS" -> "CSS3", "SQL" -> "SQL", "AWS" -> "Amazon Web Services", "GCP" -> "Google Cloud Platform", "CI/CD" -> "Continuous Integration / Continuous Delivery", "OOP" -> "Object-Oriented Programming", "AI" -> "Artificial Intelligence", "ML" -> "Machine Learning", "NLP" -> "Natural Language Processing", "UI" -> "User Interface", "UX" -> "User Experience".
3. Academic Degrees:
   - "BE" / "B.E." / "B.E" -> "Bachelor of Engineering"
   - "BTech" / "B.Tech." / "B.Tech" -> "Bachelor of Technology"
   - "ME" / "M.E." / "M.E" -> "Master of Engineering"
   - "MTech" / "M.Tech." / "M.Tech" -> "Master of Technology"
   - "BCA" / "B.C.A." -> "Bachelor of Computer Applications"
   - "MCA" / "M.C.A." -> "Master of Computer Applications"
   - "BBA" / "B.B.A." -> "Bachelor of Business Administration"
   - "MBA" / "M.B.A." -> "Master of Business Administration"
   - "BSc" / "B.Sc." -> "Bachelor of Science"
   - "MSc" / "M.Sc." -> "Master of Science"
   - "BS" / "B.S." -> "Bachelor of Science"
   - "MS" / "M.S." -> "Master of Science"
   - "PhD" / "Ph.D." -> "Doctor of Philosophy"
4. Academic Specializations / Fields:
   - "ENTC" / "E&TC" / "E&Tc" / "ETC" -> "Electronics & Telecommunication Engineering"
   - "CSE" / "CS" -> "Computer Science and Engineering" / "Computer Science"
   - "ECE" -> "Electronics and Communication Engineering"
   - "IT" -> "Information Technology"
   - "EE" / "EEE" -> "Electrical and Electronics Engineering"
   - "Mech" -> "Mechanical Engineering"
   - "Civil" -> "Civil Engineering"
   - "AI & DS" / "AIDS" -> "Artificial Intelligence and Data Science"
   - "AIML" / "AI & ML" -> "Artificial Intelligence and Machine Learning"
5. Compound Academic Credentials:
   - If degree + field is provided together (e.g. "BE CS", "BE ENTC", "BTech CSE", "BE in E&TC"), synthesize into the full form: "Bachelor of Engineering in Computer Science and Engineering", "Bachelor of Engineering in Electronics & Telecommunication Engineering", etc.
6. Colleges, Universities & Organizations:
   - When given institutional acronyms with location context (e.g. text: "JSCOE", location: "Pune, Maharashtra, India"), resolve to the official institution name: "Jayawantrao Sawant College of Engineering (JSCOE)" or "JSPM's Jayawantrao Sawant College of Engineering (JSCOE)".
   - "PVPIT" -> "Padmabhooshan Vasantdada Patil Institute of Technology (PVPIT)"
   - "COEP" -> "College of Engineering Pune (COEP)"
   - "PICT" -> "Pune Institute of Computer Technology (PICT)"
   - "VJTI" -> "Veermata Jijabai Technological Institute (VJTI)"
   - "VIT" in Pune -> "Vishwakarma Institute of Technology (VIT)"
   - "PCCOE" -> "Pimpri Chinchwad College of Engineering (PCCOE)"
   - "IIT" -> "Indian Institute of Technology"
   - "NIT" -> "National Institute of Technology"
   - "IIIT" -> "Indian Institute of Information Technology"
   - "BITS" -> "Birla Institute of Technology and Science"
7. Ambiguity & Integrity:
   - If an acronym is genuinely ambiguous and cannot be confidently identified with the given context, return the original text unchanged with "verified": false. Never invent fake names or hallucinations.
8. Output Format:
   - Return ONLY a valid JSON object matching:
     {
       "expandedText": "Full expanded name or unchanged text",
       "verified": true
     }`;

  const userPrompt = `Input:
Text: ${text || ""}
Field Context: ${context || "General"}
Location: ${location || "Not specified"}

Return ONLY this JSON format:
{
  "expandedText": "Full expanded professional text",
  "verified": true
}`;

  return { systemInstruction, userPrompt };
};


import { z } from "zod";
import {
  SYSTEM_SECURITY_DIRECTIVES,
  wrapUntrustedData,
  sanitizeUntrustedText,
} from "../security/promptSecurity.js";

/**
 * Zod Schema for Blog Title Generation Output
 * Ensures a valid list of 5 to 8 non-empty, high-quality blog titles.
 */
export const blogTitleSchema = z.object({
  titles: z
    .array(
      z
        .string()
        .trim()
        .min(5, "Each blog title must be at least 5 characters long.")
        .max(200, "Blog title is too long.")
    )
    .min(5, "At least 5 blog titles are required.")
    .max(8, "At most 8 blog titles can be returned."),
});

/**
 * Constructs a structured prompt for blog title generation with few-shot examples
 */
export const buildBlogTitlePrompt = (topic, category = "General") => {
  const cleanTopic = sanitizeUntrustedText(topic, 500);
  const cleanCategory = sanitizeUntrustedText(category || "General", 100);

  const systemInstruction = `You are an expert SEO copywriter, viral growth strategist, and professional editor.
Your task is to generate between 5 and 8 diverse, catchy, high-converting, and SEO-optimized blog titles for a given topic and category.

${SYSTEM_SECURITY_DIRECTIVES}

Return ONLY a valid JSON object strictly matching this schema:
{
  "titles": [
    "Title 1",
    "Title 2",
    "Title 3",
    "Title 4",
    "Title 5"
  ]
}

### Guidelines for Title Styles:
Ensure the titles represent a rich mix of proven editorial styles:
1. **How-To Guide:** Practical, action-oriented step-by-step guidance.
2. **Listicle:** High-value numbered lists or checklists.
3. **Thought-Provoking / Question:** Engages curiosity or addresses a key dilemma.
4. **Contrarian / Myth-Busting:** Challenges conventional wisdom or common misconceptions.
5. **Authority / Comprehensive:** Definitive industry benchmarks, ultimate guides, or future outlooks.

### Few-Shot Demonstrations (Style Guidelines Only):

Example 1:
Input Topic: "Time management for remote workers" | Category: "Business"
Output:
{
  "titles": [
    "How to Master Remote Time Management Without Burning Out",
    "7 Proven Time-Blocking Techniques Every Remote Professional Needs",
    "Are You Working More but Accomplishing Less? The Remote Productivity Trap",
    "Why Traditional 9-to-5 Schedules Fail for Remote Teams (And What to Do Instead)",
    "The Ultimate Guide to Deep Work and Focus for Distributed Teams"
  ]
}

Example 2:
Input Topic: "Plant-based meal prep" | Category: "Health"
Output:
{
  "titles": [
    "How to Meal Prep 5 Days of High-Protein Vegan Lunches in 1 Hour",
    "10 Essential Plant-Based Pantry Staples for Quick Weeknight Dinners",
    "Is Plant-Based Eating Actually Expensive? 6 Budget Myths Debunked",
    "Why Most Vegan Meal Plans Fail in Week Two and How to Stick to Yours",
    "The Beginner's Definitive Blueprint to Stress-Free Plant-Based Nutrition"
  ]
}

Strict Rules:
- Return ONLY the JSON object. No Markdown code fences, no conversational preamble, no trailing commentary.
- Every title must be engaging, clear, and relevant to the user's specific topic.
- Return between 5 and 8 titles.`.trim();

  const userPrompt = `Generate between 5 and 8 catchy, diverse, and SEO-friendly blog titles for the user's topic. The user input is encapsulated below:
${wrapUntrustedData("topic", `Topic: "${cleanTopic}" | Category: "${cleanCategory}"`, 1000)}`;

  return { systemInstruction, userPrompt };
};

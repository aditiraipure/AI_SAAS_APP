import { z } from "zod";

/**
 * Zod schema for context-aware structured abbreviation expansion
 */
export const abbreviationExpansionSchema = z.object({
  original: z.string().default(""),
  expanded: z.string().default(""),
  confidence: z.coerce.number().min(0).max(1).default(0.9),
  isAmbiguous: z.boolean().default(false),
  category: z
    .enum([
      "degree",
      "course",
      "institution",
      "specialization",
      "non-education",
      "other",
    ])
    .or(z.string())
    .default("other"),
});

/**
 * Safe parser helper with automatic repair fallbacks
 */
export const safeParseAbbreviationExpansion = (rawData, originalInput = "") => {
  const result = abbreviationExpansionSchema.safeParse(rawData);
  if (result.success) {
    return result.data;
  }

  const rawConf = Number(rawData?.confidence);
  const confidence = Number.isFinite(rawConf)
    ? Math.max(0, Math.min(1, rawConf))
    : 0.5;

  return {
    original:
      typeof rawData?.original === "string" && rawData.original.trim()
        ? rawData.original.trim()
        : originalInput || "",
    expanded:
      typeof rawData?.expanded === "string" && rawData.expanded.trim()
        ? rawData.expanded.trim()
        : originalInput || "",
    confidence,
    isAmbiguous: Boolean(rawData?.isAmbiguous),
    category:
      typeof rawData?.category === "string" && rawData.category.trim()
        ? rawData.category.trim()
        : "other",
  };
};

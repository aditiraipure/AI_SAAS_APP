/**
 * Gemini Error Analyzer and Adaptive Backoff Utility
 *
 * Distinguishes between transient rate limits (RPM/concurrency) vs permanent
 * or exhausted daily quota errors, extracts Retry-After delays, and redacts API keys.
 */

/**
 * Analyzes and categorizes Gemini API errors safely without exposing API keys or secrets.
 *
 * @param {Error|object} err
 * @returns {object} { category, isTransient, isDailyQuota, statusCode, retryAfterMs, safeMessage }
 */
export const analyzeGeminiError = (err) => {
  if (!err) {
    return {
      category: "UNKNOWN",
      isTransient: false,
      isDailyQuota: false,
      statusCode: null,
      retryAfterMs: null,
      safeMessage: "Unknown error",
    };
  }

  const statusCode = err.status || err.response?.status || err.statusCode || null;
  const rawMsg = String(err.message || "");
  const responseData = err.response?.data?.error || err.response?.data || {};
  const responseMsg = String(responseData.message || "");
  const errorStatus = String(responseData.status || "");
  const combinedMsg = `${rawMsg} ${responseMsg} ${errorStatus}`.toLowerCase();

  // Extract retry delay from headers (e.g. Retry-After: 12) or Google RPC details
  let retryAfterMs = null;
  const retryHeader =
    err.response?.headers?.["retry-after"] ||
    err.headers?.["retry-after"] ||
    err.response?.headers?.["x-ratelimit-reset"];

  if (retryHeader) {
    const parsedSec = Number(retryHeader);
    if (Number.isFinite(parsedSec) && parsedSec > 0) {
      retryAfterMs = parsedSec * 1000;
    }
  }

  // Check Google RPC RetryInfo in error details
  if (!retryAfterMs && Array.isArray(responseData.details)) {
    const retryInfo = responseData.details.find(
      (d) => d["@type"]?.includes("RetryInfo") && d.retryDelay
    );
    if (retryInfo?.retryDelay) {
      const match = String(retryInfo.retryDelay).match(/(\d+(?:\.\d+)?)\s*s?/i);
      if (match) {
        retryAfterMs = Math.round(Number(match[1]) * 1000);
      }
    }
  }

  // Check regex in message text (e.g. "Please retry after 15s")
  if (!retryAfterMs) {
    const textMatch = combinedMsg.match(/retry\s+(?:after|in)\s+(\d+)\s*s/i);
    if (textMatch) {
      retryAfterMs = Number(textMatch[1]) * 1000;
    }
  }

  // Check if error is specifically exhausted daily/free-tier project quota (non-transient for the current model)
  const isDailyQuota =
    combinedMsg.includes("per day") ||
    combinedMsg.includes("perday") ||
    combinedMsg.includes("daily") ||
    (combinedMsg.includes("quota exceeded for quota metric") && combinedMsg.includes("day")) ||
    combinedMsg.includes("free tier limit") ||
    combinedMsg.includes("billing not enabled");

  let category = "UNKNOWN";
  let isTransient = false;

  if (statusCode === 404 || combinedMsg.includes("not found")) {
    category = "MODEL_NOT_FOUND";
    isTransient = false;
  } else if (
    statusCode === 401 ||
    statusCode === 403 ||
    combinedMsg.includes("api_key") ||
    combinedMsg.includes("api key not valid") ||
    combinedMsg.includes("unauthenticated")
  ) {
    category = "AUTH_FAILURE";
    isTransient = false;
  } else if (statusCode === 400 || combinedMsg.includes("invalid argument")) {
    category = "BAD_REQUEST";
    isTransient = false;
  } else if (
    statusCode === 429 ||
    combinedMsg.includes("resource_exhausted") ||
    combinedMsg.includes("rate limit") ||
    combinedMsg.includes("quota")
  ) {
    if (isDailyQuota) {
      category = "DAILY_QUOTA_EXHAUSTED";
      isTransient = false; // Exhausted daily quota will not reset in milliseconds; do NOT retry same model
    } else {
      category = "RATE_LIMIT_TRANSIENT";
      isTransient = true; // Temporary burst / per-minute throttle; eligible for backoff retry
    }
  } else if (
    statusCode === 503 ||
    statusCode === 502 ||
    statusCode === 504 ||
    combinedMsg.includes("unavailable") ||
    combinedMsg.includes("high demand")
  ) {
    category = "MODEL_UNAVAILABLE_TRANSIENT";
    isTransient = true;
  } else if (
    combinedMsg.includes("timeout") ||
    combinedMsg.includes("econnreset") ||
    combinedMsg.includes("econnaborted") ||
    combinedMsg.includes("etimedout")
  ) {
    category = "NETWORK_TIMEOUT";
    isTransient = true;
  } else if (statusCode === 500) {
    category = "INTERNAL_SERVER_ERROR";
    isTransient = true;
  }

  // Clean and redact any sensitive query parameters or keys from the error message
  const safeMessage = rawMsg
    .replace(/key=[a-zA-Z0-9_\-]+/gi, "key=[REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/https:\/\/[^\s]+/g, (url) => url.split("?")[0]);

  return {
    category,
    isTransient,
    isDailyQuota,
    statusCode,
    retryAfterMs,
    safeMessage,
  };
};

/**
 * Calculates adaptive backoff respecting Retry-After when available, bounded by min/max limits with jitter
 */
export const calculateAdaptiveBackoff = (
  attempt = 0,
  retryAfterMs = null,
  baseDelay = 500,
  maxDelay = 5000,
) => {
  const jitter = Math.floor(Math.random() * 200);

  if (typeof retryAfterMs === "number" && retryAfterMs > 0) {
    return Math.min(maxDelay, Math.max(baseDelay, retryAfterMs + jitter));
  }

  const exponential = Math.pow(2, attempt) * baseDelay;
  return Math.min(maxDelay, exponential + jitter);
};

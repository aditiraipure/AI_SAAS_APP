/**
 * Comprehensive Test Suite for Gemini Model Fallback, 404 Fast-Skip, and 503 Backoff Retries
 */

import assert from "assert";
import { SUPPORTED_MODELS as AI_CONTROLLER_MODELS } from "../controllers/aiController.js";
import { SUPPORTED_MODELS as RESUME_SERVICE_MODELS } from "../services/resumeAiService.js";
import {
  isTransientError,
  calculateBackoff,
} from "../security/promptSecurity.js";

let passedCount = 0;
let failedCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

async function runAsyncTest(testName, fn) {
  try {
    await fn();
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${testName}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

console.log("\n========================================================");
console.log("  Running Gemini Model Fallback & Retry Test Suite      ");
console.log("========================================================\n");

// ----------------------------------------------------
// 1. Model Hierarchy & Configuration Verification
// ----------------------------------------------------
console.log("--- Group 1: Model Hierarchy & Configuration ---");

runTest("aiController SUPPORTED_MODELS sets gemini-3.8-flash as primary and gemini-3.5-flash-lite as fallback", () => {
  assert.strictEqual(AI_CONTROLLER_MODELS[0], "gemini-3.8-flash", "Primary model must be gemini-3.8-flash");
  assert.strictEqual(AI_CONTROLLER_MODELS[1], "gemini-3.5-flash-lite", "Fallback model must be gemini-3.5-flash-lite");
  assert.ok(!AI_CONTROLLER_MODELS.includes("gemini-1.5-flash"), "gemini-1.5-flash must be replaced");
  assert.ok(!AI_CONTROLLER_MODELS.includes("gemini-1.5-pro"), "gemini-1.5-pro must be replaced");
  assert.ok(!AI_CONTROLLER_MODELS.includes("gemini-2.0-flash"), "gemini-2.0-flash must be replaced");
});

runTest("resumeAiService SUPPORTED_MODELS sets gemini-3.8-flash as primary and gemini-3.5-flash-lite as fallback", () => {
  assert.strictEqual(RESUME_SERVICE_MODELS[0], "gemini-3.8-flash", "Primary model must be gemini-3.8-flash");
  assert.strictEqual(RESUME_SERVICE_MODELS[1], "gemini-3.5-flash-lite", "Fallback model must be gemini-3.5-flash-lite");
  assert.ok(!RESUME_SERVICE_MODELS.includes("gemini-1.5-flash"), "gemini-1.5-flash must be replaced");
  assert.ok(!RESUME_SERVICE_MODELS.includes("gemini-1.5-pro"), "gemini-1.5-pro must be replaced");
  assert.ok(!RESUME_SERVICE_MODELS.includes("gemini-2.0-flash"), "gemini-2.0-flash must be replaced");
});

// ----------------------------------------------------
// 2. Permanent Error vs Transient Error Classification
// ----------------------------------------------------
console.log("\n--- Group 2: Error Classification (404 vs 503/429) ---");

runTest("404 Not Found is correctly classified as permanent (NEVER retry same model)", () => {
  assert.strictEqual(isTransientError({ status: 404 }), false);
  assert.strictEqual(isTransientError({ response: { status: 404 } }), false);
});

runTest("400, 401, and 403 are classified as permanent client errors", () => {
  assert.strictEqual(isTransientError({ status: 400 }), false);
  assert.strictEqual(isTransientError({ status: 401 }), false);
  assert.strictEqual(isTransientError({ status: 403 }), false);
});

runTest("503 Service Unavailable is classified as transient (eligible for retry)", () => {
  assert.strictEqual(isTransientError({ status: 503 }), true);
  assert.strictEqual(isTransientError({ message: "503 UNAVAILABLE: The model is overloaded" }), true);
});

runTest("429 Rate Limit / Resource Exhausted is classified as transient", () => {
  assert.strictEqual(isTransientError({ status: 429 }), true);
  assert.strictEqual(isTransientError({ message: "RESOURCE_EXHAUSTED: quota exceeded" }), true);
});

runTest("Network timeouts, ECONNABORTED, ETIMEDOUT are classified as transient", () => {
  assert.strictEqual(isTransientError({ message: "timeout of 25000ms exceeded" }), true);
  assert.strictEqual(isTransientError({ message: "ECONNABORTED" }), true);
  assert.strictEqual(isTransientError({ message: "ETIMEDOUT" }), true);
});

// ----------------------------------------------------
// 3. Exponential Backoff and Jitter Calculation
// ----------------------------------------------------
console.log("\n--- Group 3: Exponential Backoff & Jitter ---");

runTest("calculateBackoff applies exponential delay with jitter bounded by maxDelay", () => {
  for (let i = 0; i < 10; i++) {
    const delay0 = calculateBackoff(0, 500, 4000);
    assert.ok(delay0 >= 500 && delay0 <= 700, `Attempt 0 delay ${delay0} out of expected range [500, 700]`);

    const delay1 = calculateBackoff(1, 500, 4000);
    assert.ok(delay1 >= 1000 && delay1 <= 1200, `Attempt 1 delay ${delay1} out of expected range [1000, 1200]`);

    const delay2 = calculateBackoff(2, 500, 4000);
    assert.ok(delay2 >= 2000 && delay2 <= 2200, `Attempt 2 delay ${delay2} out of expected range [2000, 2200]`);

    const delayLarge = calculateBackoff(10, 500, 4000);
    assert.strictEqual(delayLarge, 4000, "Large attempts must be clamped to maxDelay");
  }
});

// ----------------------------------------------------
// 4. Model Fallback Simulation: 404 No-Retry & 503 3-Retry Flow
// ----------------------------------------------------
console.log("\n--- Group 4: Simulated Model Fallback Sequencing ---");

await runAsyncTest("404 on primary model triggers immediate switch to fallback model with 0 retries on primary", async () => {
  const modelAttempts = {
    "gemini-3.8-flash": 0,
    "gemini-3.5-flash-lite": 0,
  };

  const fakeApiCall = async (model) => {
    modelAttempts[model]++;
    if (model === "gemini-3.8-flash") {
      const err = new Error("models/gemini-3.8-flash is not found");
      err.status = 404;
      throw err;
    }
    return { success: true, text: "Generated successfully from fallback model" };
  };

  let finalResult = null;
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

  for (const model of models) {
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        finalResult = await fakeApiCall(model);
        break;
      } catch (err) {
        if (!isTransientError(err) || attempt >= maxRetries) {
          // 404: break immediately without retrying the same model
          break;
        }
      }
    }
    if (finalResult) break;
  }

  assert.strictEqual(modelAttempts["gemini-3.8-flash"], 1, "Primary model with 404 must NOT be retried (exactly 1 call)");
  assert.strictEqual(modelAttempts["gemini-3.5-flash-lite"], 1, "Fallback model must be called immediately");
  assert.strictEqual(finalResult.success, true);
});

await runAsyncTest("503 on primary model retries up to 3 times before falling back to secondary model", async () => {
  const modelAttempts = {
    "gemini-3.8-flash": 0,
    "gemini-3.5-flash-lite": 0,
  };

  const fakeApiCall = async (model) => {
    modelAttempts[model]++;
    if (model === "gemini-3.8-flash") {
      const err = new Error("503 Service Unavailable");
      err.status = 503;
      throw err;
    }
    return { success: true, text: "Fallback response after 503 exhaustion" };
  };

  let finalResult = null;
  const models = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

  for (const model of models) {
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        finalResult = await fakeApiCall(model);
        break;
      } catch (err) {
        if (!isTransientError(err) || attempt >= maxRetries) {
          break;
        }
      }
    }
    if (finalResult) break;
  }

  // 1 initial call + 3 retries = 4 total attempts on primary model before falling back
  assert.strictEqual(modelAttempts["gemini-3.8-flash"], 4, "Primary model with 503 must retry up to maxRetries = 3 (4 calls total)");
  assert.strictEqual(modelAttempts["gemini-3.5-flash-lite"], 1, "Fallback model must be called after primary retries are exhausted");
  assert.strictEqual(finalResult.success, true);
});

// ----------------------------------------------------
// Summary Report
// ----------------------------------------------------
console.log("\n========================================================");
console.log(`  Tests Completed: ${passedCount + failedCount}`);
console.log(`  Passed: ${passedCount}`);
console.log(`  Failed: ${failedCount}`);
console.log("========================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("  All Gemini Fallback & Retry Tests Passed!  \n");
  process.exit(0);
}

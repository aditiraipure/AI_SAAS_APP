/**
 * Verification Test Suite for Latency & AI Model Optimizations
 */

import assert from "assert";
import { enrichEducationWithAi } from "../controllers/resumeController.js";
import { expandAbbreviationService } from "../services/resumeAiService.js";

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
console.log("  Running QuickAI Latency & Model Verification Suite   ");
console.log("========================================================\n");

// 1. In-Memory Abbreviation Cache Test
console.log("--- Group 1: Abbreviation In-Memory Cache ---");

await runAsyncTest("Repeated abbreviation expansions resolve instantly from in-memory cache", async () => {
  const startFirst = Date.now();
  const res1 = await expandAbbreviationService({
    text: "BTech",
    section: "education",
    context: "degree",
    location: "Pune",
  });
  const durationFirst = Date.now() - startFirst;

  const startCached = Date.now();
  const res2 = await expandAbbreviationService({
    text: "BTech",
    section: "education",
    context: "degree",
    location: "Pune",
  });
  const durationCached = Date.now() - startCached;

  assert.strictEqual(res1.expanded, res2.expanded);
  assert.ok(durationCached <= 5, `Expected cached expansion to take <= 5ms, took ${durationCached}ms`);
});

// 2. Education Enrichment Optimization
console.log("\n--- Group 2: Education Enrichment Optimization ---");

await runAsyncTest("enrichEducationWithAi skips redundant AI calls for already expanded titles", async () => {
  const educationList = [
    {
      degree: "Bachelor of Engineering in Information Technology",
      institution: "Pune University, Maharashtra",
      location: "Pune",
    },
  ];

  const startTime = Date.now();
  const enriched = await enrichEducationWithAi(educationList, "Pune");
  const duration = Date.now() - startTime;

  assert.strictEqual(enriched.length, 1);
  assert.strictEqual(enriched[0].degree, "Bachelor of Engineering in Information Technology");
  assert.strictEqual(enriched[0].institution, "Pune University, Maharashtra");
  // Should complete in sub-millisecond time because AI call is skipped
  assert.ok(duration < 20, `Expected fast-path skipping to take < 20ms, took ${duration}ms`);
});

console.log("\n========================================================");
console.log(`  Tests Completed: ${passedCount + failedCount}`);
console.log(`  Passed: ${passedCount}`);
console.log(`  Failed: ${failedCount}`);
console.log("========================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log("  All Latency & Model Verification Tests Passed!  \n");
  process.exit(0);
}

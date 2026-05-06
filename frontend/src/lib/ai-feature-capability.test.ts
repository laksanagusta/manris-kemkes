import assert from "node:assert/strict";
import test from "node:test";

const capabilityLib = await import("./ai-feature-capability.ts");

const { isAIFeaturesDisabled } =
  capabilityLib as typeof import("./ai-feature-capability.ts");

test("isAIFeaturesDisabled returns false by default", () => {
  assert.equal(isAIFeaturesDisabled(undefined), false);
  assert.equal(isAIFeaturesDisabled(""), false);
  assert.equal(isAIFeaturesDisabled("false"), false);
});

test("isAIFeaturesDisabled enables the frontend AI kill switch for truthy env values", () => {
  assert.equal(isAIFeaturesDisabled("true"), true);
  assert.equal(isAIFeaturesDisabled("TRUE"), true);
  assert.equal(isAIFeaturesDisabled("1"), true);
  assert.equal(isAIFeaturesDisabled("yes"), true);
});

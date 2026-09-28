import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./risk-charter-quick-create.tsx", import.meta.url),
  "utf8",
);

test("quick create asks for title only and never prefills it", () => {
  assert.match(source, /useState\(""\)/);
  assert.match(source, /Judul Piagam/);
  assert.match(source, /maxLength=\{120\}/);
  assert.doesNotMatch(source, /value=\{user\?\.orgName/);
  assert.doesNotMatch(source, /<Select/);
  assert.match(source, /className="flex flex-col gap-2"/);
});

test("quick create uses annual identity and waits for modal exit", () => {
  assert.match(source, /currentAssessmentCycle\(\)\.slice\(0, 4\)/);
  assert.match(source, /response\.existing/);
  assert.match(source, /Lanjutkan draf/);
  assert.match(source, /Buka Piagam/);
  assert.match(source, /setOpen\(false\)/);
  assert.match(source, /onAnimationEnd/);
  assert.match(source, /animationName !== "exit"/);
});

test("quick create uses the mitigation-report modal shell", () => {
  assert.match(source, /className="max-w-2xl no-scrollbar"/);
  assert.match(source, /showCloseButton=\{false\}/);
  assert.match(source, /CollectionDialogCancel/);
  assert.match(source, /size="md"/);
});

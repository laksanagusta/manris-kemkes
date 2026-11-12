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

test("quick create uses version identity and opens the new or existing charter directly", () => {
  assert.doesNotMatch(source, /currentFiscalYear|currentAssessmentCycle|period:/);
  assert.match(source, /response\.existing/);
  assert.match(source, /Membuka draf Piagam yang sudah ada/);
  assert.doesNotMatch(source, /Lanjutkan draf|setExisting/);
  assert.match(source, /router\.push\(`\/management\/charters\/\$\{response\.data\.id\}\`\)/);
  assert.doesNotMatch(source, /onAnimationEnd/);
});

test("quick create opens a shared dialog with a single form submit path", () => {
  assert.match(source, /<DialogTrigger asChild>/);
  assert.match(source, /<DialogContent/);
  assert.match(source, /<DialogDescription>/);
  assert.match(source, /<form[^>]+onSubmit=\{handleCreate\}/);
  assert.match(source, /type="submit"/);
  assert.match(source, /<DialogClose asChild>/);
  assert.doesNotMatch(source, /<FormPage|listAllOrganizations/);
});

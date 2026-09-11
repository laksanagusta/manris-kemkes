import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./profil-risiko-card.tsx", import.meta.url),
  "utf8",
);

const floatingVariant = source.slice(
  source.indexOf("if (compact && floating)"),
  source.indexOf("if (compact)", source.indexOf("if (compact && floating)") + 1),
);

test("monitoring baseline uses the minimal floating reference bar", () => {
  assert.match(floatingVariant, /surface-hairline/);
  assert.match(floatingVariant, /rounded-xl bg-card text-foreground/);
  assert.match(floatingVariant, /min-h-11 min-w-11/);
  assert.match(floatingVariant, /overflow-x-auto/);
  assert.match(floatingVariant, /focus-visible:ring-2/);
  assert.doesNotMatch(floatingVariant, /bg-black|backdrop-blur|bg-gradient|rounded-full/);
  assert.doesNotMatch(floatingVariant, /shadow-\[/);
});

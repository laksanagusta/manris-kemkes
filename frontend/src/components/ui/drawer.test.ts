import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./drawer.tsx", import.meta.url), "utf8");
const topbarSource = readFileSync(new URL("../app-topbar.tsx", import.meta.url), "utf8");

test("Vaul right drawer uses the floating 8px inset treatment", () => {
  assert.match(source, /direction = "right"/);
  assert.match(source, /fixed bottom-2 right-2 top-2 z-\[70\]/);
  assert.match(source, /w-\[310px\]/);
  assert.match(source, /"--initial-transform": "calc\(100% \+ 8px\)"/);
  assert.match(source, /rounded-\[16px\] bg-card p-5/);
  assert.match(source, /fixed inset-0 z-\[60\] bg-black\/40/);
});

test("drawer scrim sits above fixed shell chrome", () => {
  assert.match(topbarSource, /data-slot="app-topbar"[\s\S]*z-50/);
  assert.match(source, /fixed inset-0 z-\[60\]/);
  assert.match(source, /fixed bottom-2 right-2 top-2 z-\[70\]/);
});

test("drawer close action matches the canonical modal close button", () => {
  assert.match(
    source,
    /variant="ghost"[\s\S]*size="icon-sm"[\s\S]*className="absolute top-2 right-2 rounded-full shadow-none hover:bg-muted"/,
  );
  assert.match(source, /aria-label="Tutup drawer"/);
  assert.match(source, /<span className="sr-only">Close<\/span>/);
});

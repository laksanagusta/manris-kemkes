import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./app-header.tsx", import.meta.url),
  "utf8",
);

test("uses inset shell header geometry", () => {
  assert.match(
    source,
    /className="font-display mb-6 grid gap-3 md:grid-cols-\[minmax\(0,1fr\)_auto\] md:items-start"/,
  );
  assert.doesNotMatch(source, /sticky top-0/);
  assert.doesNotMatch(source, /border-b/);
});

test("derives the page title from the current route", () => {
  assert.match(source, /const pageTitle = breadcrumbMap\[pathname\] \?\? "Manajemen Risiko";/);
});

test("keeps the application title compact", () => {
  assert.match(
    source,
    /className="block truncate text-sm font-semibold tracking-tight text-foreground"/,
  );
});

test("keeps the optional actions slot", () => {
  assert.match(source, /const actions = useHeaderActions\(\);/);
  assert.match(source, /actions && \(/);
  assert.match(source, /justify-end gap-2/);
});

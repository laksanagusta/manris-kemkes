import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ELEVATION =
  "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30";
const sourceRoot = fileURLToPath(new URL("../..", import.meta.url));
const globalsSource = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return listTypeScriptFiles(path);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

function directSurfaceToken(token: string) {
  if (token.startsWith("[") || token.startsWith("*") || token.startsWith("**")) {
    return null;
  }

  const parts = token.split(":");
  return parts.at(-1) ?? token;
}

function isConflictingSurfaceToken(token: string) {
  const directToken = directSurfaceToken(token);
  if (!directToken) return false;

  if (
    (directToken === "border" || directToken.startsWith("border-")) &&
    !/(?:^|-)0$/.test(directToken)
  ) {
    return true;
  }
  if (directToken.startsWith("ring-")) return true;
  if (
    directToken.startsWith("shadow-") &&
    directToken !== "shadow-black"
  ) {
    return true;
  }

  return false;
}

test("all shared elevated primitives use the canonical smooth elevation", () => {
  for (const file of [
    "alert-dialog.tsx",
    "card.tsx",
    "combobox.tsx",
    "dialog.tsx",
    "dropdown-menu.tsx",
    "popover.tsx",
    "select.tsx",
    "sheet.tsx",
    "sonner.tsx",
    "tooltip.tsx",
  ]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.ok(source.includes(ELEVATION), `${file} must use ${ELEVATION}`);
  }

  const accordionFormSection = readFileSync(
    new URL(
      "../shared/design-system/layout/accordion-form-section.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    accordionFormSection,
    /not-last:border-b-0 bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/,
  );
});

test("risk form does not globally disable elevated surface shadows", () => {
  assert.doesNotMatch(
    globalsSource,
    /\.risk-form-filter-controls[^{}]*(?:\[data-slot="card"\]|\[data-slot="accordion-item"\])[^{}]*\{[\s\S]*?box-shadow:\s*none/,
  );
});

test("modal overlays use the shared frosted scrim", () => {
  for (const file of ["alert-dialog.tsx", "dialog.tsx", "sheet.tsx"]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /frosted-scrim/);
    assert.doesNotMatch(source, /bg-black\/10/);
  }

  assert.match(globalsSource, /\.frosted-scrim[\s\S]*backdrop-filter/);
  assert.match(globalsSource, /blur\(4px\) saturate\(110%\)/);
  assert.match(globalsSource, /--background\) 64%/);
});

test("shared field surfaces reuse the card border token", () => {
  for (const file of [
    "input.tsx",
    "textarea.tsx",
    "search-input.tsx",
    "input-group.tsx",
    "combobox.tsx",
  ]) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.match(source, /border-border/);
    assert.doesNotMatch(source, /border-input/);
    assert.match(
      source,
      /(?:focus:border-black|focus-visible:border-black|focus-within:border-black|:focus\]:border-black|:focus-visible\]:border-black)/,
    );
    assert.match(
      source,
      /(?:focus:ring-0|focus-visible:ring-0|focus-within:ring-0|:focus\]:ring-0|:focus-visible\]:ring-0)/,
    );
  }

  const selectSource = readFileSync(
    new URL("./select.tsx", import.meta.url),
    "utf8",
  );
  assert.match(selectSource, /border-border/);
  assert.doesNotMatch(selectSource, /border-input/);
  assert.doesNotMatch(
    selectSource,
    /(?:focus:border-black|focus-visible:border-black|dark:focus:border-white|dark:focus-visible:border-white)/,
  );
  assert.match(selectSource, /focus:ring-0/);
  assert.match(selectSource, /focus-visible:ring-0/);
});

test("risk form geometry overrides preserve the shared active field state", () => {
  assert.match(
    globalsSource,
    /\.risk-form-filter-controls \[data-slot="input"\]:focus,[\s\S]*?border-color: var\(--primary\);[\s\S]*?box-shadow: none;/,
  );
  assert.match(
    globalsSource,
    /\.risk-form-filter-controls \[data-slot="textarea"\]:focus-visible/,
  );
  assert.doesNotMatch(
    globalsSource,
    /\.risk-form-filter-controls \[data-slot="select-trigger"\]:(?:focus|focus-visible)/,
  );
});

test("all PopoverContent surfaces use the canonical rounded-xl radius", () => {
  const popoverSource = readFileSync(
    new URL("./popover.tsx", import.meta.url),
    "utf8",
  );
  assert.match(popoverSource, /data-slot="popover-content"[\s\S]*rounded-xl/);
  assert.doesNotMatch(popoverSource, /rounded-(?:2xl|3xl)/);

  for (const file of listTypeScriptFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/<PopoverContent\b[^>]*>/g)) {
      assert.doesNotMatch(
        match[0],
        /rounded-(?:sm|md|lg|2xl|3xl)/,
        `${file} overrides PopoverContent with a non-xl radius`,
      );
    }
  }
});

test("feature pages compose visible fields from shared primitives", () => {
  const nativeFieldImplementations = new Set([
    "/components/ui/input.tsx",
    "/components/ui/search-input.tsx",
    "/components/ui/textarea.tsx",
  ]);

  for (const file of listTypeScriptFiles(sourceRoot)) {
    if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;

    const source = readFileSync(file, "utf8");
    const nativeFields = [
      ...source.matchAll(/<(input|textarea|select)\b[\s\S]*?>/g),
    ];

    for (const match of nativeFields) {
      const tag = match[0];
      const isSharedImplementation = [...nativeFieldImplementations].some(
        (suffix) => file.endsWith(suffix),
      );
      const isIntentionalNativeControl = /type=["'](?:file|range)["']/.test(
        tag,
      );

      assert.ok(
        isSharedImplementation || isIntentionalNativeControl,
        `${file} contains a raw visible field; use a shared field primitive instead: ${tag.slice(0, 120)}`,
      );
    }
  }
});

test("Card consumers do not override the canonical elevation", () => {
  for (const file of listTypeScriptFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    const cardTags = source.match(/<Card\b[\s\S]*?>/g) ?? [];

    for (const tag of cardTags) {
      const classFragments = [...tag.matchAll(/"([^"]*)"/g)].map(
        (match) => match[1],
      );
      const conflicts = classFragments
        .flatMap((fragment) => fragment.split(/\s+/))
        .filter(isConflictingSurfaceToken);

      assert.deepEqual(
        conflicts,
        [],
        `${file} overrides Card elevation with: ${conflicts.join(", ")}`,
      );
    }
  }
});

test("smooth elevated surfaces do not stack a hard border, ring, or second shadow", () => {
  for (const file of listTypeScriptFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    const classFragments = [...source.matchAll(/"([^"]*)"/g)]
      .map((match) => match[1])
      .filter((className) => className.includes("smooth-shadow-ring-xs"));

    for (const className of classFragments) {
      const conflicts = className
        .split(/\s+/)
        .filter(isConflictingSurfaceToken);

      assert.deepEqual(
        conflicts,
        [],
        `${file} stacks another edge on ${ELEVATION}: ${conflicts.join(", ")}`,
      );
    }
  }
});

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const srcRoot = fileURLToPath(new URL("../", import.meta.url));
const designSystemRoot = fileURLToPath(
  new URL("./shared/design-system/", import.meta.url),
);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : [];
  });
}

const read = (file: string) => readFileSync(file, "utf8");

test("the removed collection module has no consumers", () => {
  for (const file of sourceFiles(srcRoot)) {
    assert.doesNotMatch(
      read(file),
      /@\/components\/shared\/collection-primitives/,
      relative(srcRoot, file),
    );
  }
  assert.equal(
    existsSync(join(srcRoot, "components/shared/collection-primitives.tsx")),
    false,
  );
});

test("production consumers use the root design-system API", () => {
  for (const file of sourceFiles(srcRoot)) {
    const path = relative(srcRoot, file);
    if (path.startsWith("components/shared/design-system/")) continue;
    if (path === "app/(app)/design-system/page.tsx") continue;
    assert.doesNotMatch(
      read(file),
      /@\/components\/shared\/design-system\//,
      path,
    );
  }
});

test("production design-system internals do not import their root barrel", () => {
  for (const file of sourceFiles(designSystemRoot)) {
    const path = relative(designSystemRoot, file);
    if (path.startsWith("examples/")) continue;
    assert.doesNotMatch(
      read(file),
      /from ["']@\/components\/shared\/design-system["']/,
      path,
    );
  }
});

test("the production barrel excludes catalogue modules", () => {
  const barrel = read(join(designSystemRoot, "index.ts"));
  assert.doesNotMatch(barrel, /preview|example|\/data/);
});

test("catalogue examples import production components", () => {
  const documentationOnly = new Set([
    "color-swatch.tsx",
    "color-palette-example.tsx",
    "radius-scale-example.tsx",
    "section-label.tsx",
    "typography-example.tsx",
  ]);
  const examples = sourceFiles(join(designSystemRoot, "examples")).filter(
    (file) => file.endsWith(".tsx"),
  );
  assert.ok(examples.length > documentationOnly.size);
  for (const file of examples) {
    const name = file.split("/").at(-1) ?? "";
    if (documentationOnly.has(name)) continue;
    assert.match(
      read(file),
      /@\/components\/shared\/design-system/,
      name,
    );
  }
});

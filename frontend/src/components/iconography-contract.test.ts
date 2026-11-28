import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL(".", import.meta.url));

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test("Reicon components stay in the shared icon layer", () => {
  const files = collectSourceFiles(sourceRoot);
  const iconLayer = path.join(sourceRoot, "shared/icons.tsx");
  const iconLayerSource = readFileSync(iconLayer, "utf8");
  const directReiconImports = files.filter(
    (file) =>
      !file.endsWith(".test.ts") &&
      /from ["']reicon-react["']/.test(readFileSync(file, "utf8")),
  );
  const legacyIconImports = files.filter(
    (file) =>
      !file.endsWith(".test.ts") &&
      /from ["'](?:@hugeicons\/(?:react|core-free-icons)|lucide-react)["']/.test(
        readFileSync(file, "utf8"),
      ),
  );

  assert.deepEqual(directReiconImports, [iconLayer]);
  assert.deepEqual(legacyIconImports, []);
  assert.match(iconLayerSource, /from "reicon-react"/);
});

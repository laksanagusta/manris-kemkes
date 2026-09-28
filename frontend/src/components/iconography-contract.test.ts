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

test("application icons use Lucide", () => {
  const files = collectSourceFiles(sourceRoot);
  const directHugeiconsImports = files.filter((file) =>
    /@hugeicons\/(react|core-free-icons)/.test(readFileSync(file, "utf8")),
  );

  assert.deepEqual(directHugeiconsImports, []);
  assert.match(readFileSync(path.join(sourceRoot, "shared/icons.tsx"), "utf8"), /lucide-react/);
});

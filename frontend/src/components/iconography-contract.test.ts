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

test("application icons use Hugeicons except chevrons", () => {
  const files = collectSourceFiles(sourceRoot);
  const iconLayer = path.join(sourceRoot, "shared/icons.tsx");
  const directHugeiconsImports = files.filter((file) =>
    /@hugeicons\/(react|core-free-icons)/.test(readFileSync(file, "utf8")),
  );
  const iconLayerSource = readFileSync(iconLayer, "utf8");
  const directLucideImports = files.filter(
    (file) =>
      file !== iconLayer &&
      !file.endsWith(".test.ts") &&
      /from ["']lucide-react["']/.test(readFileSync(file, "utf8")),
  );
  const lucideExports = [...iconLayerSource.matchAll(/export \{([\s\S]*?)\} from "lucide-react"/g)]
    .flatMap((match) => match[1].split(","))
    .map((name) => name.trim())
    .filter(Boolean)
    .sort();

  assert.deepEqual(directHugeiconsImports, [iconLayer]);
  assert.deepEqual(directLucideImports, []);
  assert.deepEqual(
    lucideExports,
    [
      "ChevronDown",
      "ChevronDownIcon",
      "ChevronLeft",
      "ChevronLeftIcon",
      "ChevronRight",
      "ChevronRightIcon",
      "ChevronsUpDown",
      "ChevronUp",
      "ChevronUpIcon",
    ].sort(),
  );
});

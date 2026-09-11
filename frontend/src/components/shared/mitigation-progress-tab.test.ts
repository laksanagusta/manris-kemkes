import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const componentSource = readFileSync(
  new URL("./mitigation-progress-tab.tsx", import.meta.url),
  "utf8",
);

test("mitigation progress summary emphasizes the Total label at 14px", () => {
  assert.match(
    componentSource,
    /<span className="text-sm text-muted-foreground">Total<\/span>/,
  );
  assert.match(
    componentSource,
    /<span className="text-xs text-muted-foreground">Selesai<\/span>/,
  );
});

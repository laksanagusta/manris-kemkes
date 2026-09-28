import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

test("risk event empty state is rendered as a centered table row", () => {
  assert.match(
    source,
    /<CollectionTableCard>[\s\S]*<TableBody>[\s\S]*filtered\.length === 0[\s\S]*<TableCell colSpan=\{6\} className="!p-0">[\s\S]*<CollectionEmptyState[\s\S]*align="center"/,
  );
});

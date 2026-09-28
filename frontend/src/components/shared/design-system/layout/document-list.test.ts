import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./document-list.tsx", import.meta.url), "utf8");

test("document list section exposes the reference list grammar", () => {
  assert.match(
    source,
    /surface-hairline rounded-\[12px\] bg-card px-4 py-1\.5/,
  );
  assert.match(source, /<h2[\s\S]*\{title\}[\s\S]*<ListGroup/);
  assert.match(source, /text-sm font-semibold leading-5 text-muted-foreground/);
  assert.match(source, /aria-labelledby=\{labelId\}/);
  assert.doesNotMatch(source, /<ListGroup[\s\S]*<h2/);
  assert.match(source, /hover:bg-transparent hover:text-muted-foreground/);
  assert.match(source, /justify-between gap-4 rounded-lg px-0 py-1\.5/);
  assert.doesNotMatch(source, /hover:bg-muted\/30/);
  assert.match(source, /aria-label=\{addLabel\}/);
  assert.match(source, /<Plus className="size-4"/);
  assert.match(source, /role="region"/);
  assert.match(source, /role="list"/);
  assert.match(source, /role="listitem"/);
  assert.match(source, /item\.action/);
});

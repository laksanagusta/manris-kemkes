import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./top-risks-panel.tsx", import.meta.url),
  "utf8",
);

test("uses normal typography throughout each top-risk row", () => {
  assert.match(
    source,
    /<div className="min-w-0 flex-1 font-normal">[\s\S]*?<span className="shrink-0 text-xs font-mono font-normal/,
  );
  assert.match(source, /className=\{cn\([\s\S]*?"font-normal",/);
  assert.match(
    source,
    /className="mt-1 break-words text-pretty text-sm font-normal text-foreground"/,
  );
  assert.doesNotMatch(source, /className="[^"]*font-(medium|semibold|bold)[^"]*"/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = ["./actions/accent-button.tsx", "./actions/action-button.tsx"]
  .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
  .join("\n");

test("shared action buttons pass exactly one child to Radix Slot", () => {
  const asChildBranches = source.match(
    /if \(asChild\) \{[\s\S]*?return \(\s*<Button[\s\S]*?asChild\s*>\s*\{children\}\s*<\/Button>\s*\);[\s\S]*?\}/g,
  );

  assert.equal(
    asChildBranches?.length,
    2,
    "AccentButton and ActionButton must bypass icon/loading siblings when asChild is enabled",
  );
});

test("ActionButton matches AccentButton primary radius", () => {
  const actionButton = readFileSync(
    new URL("./actions/action-button.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    (actionButton.match(/rounded-\[8px\]/g) ?? []).length,
    2,
    "ActionButton must keep the 8px radius in both render branches",
  );
});

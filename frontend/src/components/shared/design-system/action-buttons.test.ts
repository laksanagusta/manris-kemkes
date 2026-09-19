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

test("ActionButton keeps the shared 8px radius", () => {
  const actionButton = readFileSync(
    new URL("./actions/action-button.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    (actionButton.match(/rounded-\[8px\]/g) ?? []).length,
    1,
    "ActionButton must keep the 8px radius",
  );
});

test("shared labeled buttons use compact medium text-only geometry", () => {
  const button = readFileSync(
    new URL("../../ui/button.tsx", import.meta.url),
    "utf8",
  );

  assert.match(button, /!font-medium/);
  assert.match(button, /!text-\[14px\]/);
  assert.match(button, /!px-4/);
  assert.match(button, /p-\[1px_16px\]/);
  assert.match(
    readFileSync(new URL("../../../app/globals.css", import.meta.url), "utf8"),
    /data-slot="button"\]\:not\(\[data-size\^="icon"\]\) svg[\s\S]*display: none/,
  );
  assert.doesNotMatch(
    readFileSync(
      new URL("./actions/action-button.tsx", import.meta.url),
      "utf8",
    ),
    /Loader2|\{icon\}/,
  );
});

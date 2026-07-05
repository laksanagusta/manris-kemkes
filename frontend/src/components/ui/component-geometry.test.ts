import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

const contracts: Array<[string, string[]]> = [
  [
    "button.tsx",
    [
      "h-11",
      "rounded-xl",
      "px-5",
      "premium",
      "h-12",
      "rounded-2xl",
      "px-6",
      "size-10 rounded-full",
      "size-11 rounded-full",
    ],
  ],
  ["input.tsx", ["h-11", "rounded-xl", "px-3"]],
  ["search-input.tsx", ["h-11", "rounded-2xl", "px-4"]],
  [
    "card.tsx",
    [
      "rounded-2xl",
      "p-4",
      'size?: "default" | "sm" | "lg"',
      "data-[size=lg]:rounded-3xl",
      "data-[size=lg]:p-6",
    ],
  ],
  ["list-group.tsx", ["rounded-2xl", "overflow-hidden"]],
  ["icon-tile.tsx", ["size-11", "rounded-2xl", "size-14", "rounded-3xl"]],
  ["tabs.tsx", ["rounded-xl", "p-1"]],
  ["dialog.tsx", ["rounded-3xl", "p-6", "-mx-6", "-mb-6"]],
  [
    "sheet.tsx",
    ["data-[side=bottom]:rounded-t-3xl", "data-[side=bottom]:p-5"],
  ],
  ["badge.tsx", ["h-8", "rounded-full", "px-3"]],
  ["sonner.tsx", ["rounded-2xl", "px-4", "py-3"]],
  ["popover.tsx", ["rounded-3xl"]],
  ["dropdown-menu.tsx", ["rounded-2xl"]],
];

for (const [file, classes] of contracts) {
  test(`${file} follows the shared geometry contract`, () => {
    const contents = source(file);

    for (const className of classes) {
      assert.ok(
        contents.includes(className),
        `${file} must include ${className}`,
      );
    }
  });
}

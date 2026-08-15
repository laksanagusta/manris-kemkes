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
      "rounded-md",
      "px-5",
      "premium",
      "h-12",
      "rounded-md",
      "px-6",
      "size-10 rounded-md",
      "size-11 rounded-md",
    ],
  ],
  ["input.tsx", ["h-9", "rounded-lg", "px-3", "bg-card", "border-border"]],
  ["search-input.tsx", ["h-9", "rounded-lg", "px-3", "border-border"]],
  [
    "card.tsx",
    [
      "rounded-xl",
      "p-4",
      "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30",
      'size?: "default" | "sm" | "lg"',
      "data-[size=lg]:rounded-2xl",
      "data-[size=lg]:p-6",
    ],
  ],
  ["list-group.tsx", ["rounded-2xl", "overflow-hidden"]],
  ["icon-tile.tsx", ["size-11", "rounded-2xl", "size-14", "rounded-3xl"]],
  ["tabs.tsx", ["rounded-lg", "p-1"]],
  ["dialog.tsx", ["rounded-xl", "max-h-[calc(100dvh-2rem)]", "overflow-y-auto", "max-w-2xl", "bg-card", "p-5", "-mx-5", "-mb-5", "border-t border-border/70", "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"]],
  ["alert-dialog.tsx", ["rounded-xl", "max-h-[calc(100dvh-2rem)]", "overflow-y-auto", "max-w-lg", "bg-card", "p-5", "-mx-5", "-mb-5", "border-t border-border/70", "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"]],
  [
    "sheet.tsx",
    ["data-[side=bottom]:rounded-t-3xl", "data-[side=bottom]:p-5"],
  ],
  ["badge.tsx", ["h-8", "rounded-full", "compact: \"h-6 rounded-full", "micro: \"h-5 rounded-full", "px-3"]],
  ["sonner.tsx", ["rounded-2xl", "px-4", "py-3"]],
  ["popover.tsx", ["rounded-xl", "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"]],
  ["dropdown-menu.tsx", ["rounded-2xl", "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"]],
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

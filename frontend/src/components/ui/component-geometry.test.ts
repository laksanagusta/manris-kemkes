import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(name: string) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

const globalStyles = readFileSync(
  new URL("../../app/globals.css", import.meta.url),
  "utf8",
);

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
      "border-border/60",
      "size-10 rounded-md",
      "size-11 rounded-md",
    ],
  ],
  ["input.tsx", ["h-10", "rounded-lg", "px-3", "bg-card", "border-input", "hover:border-foreground/15"]],
  ["textarea.tsx", ["min-h-16", "rounded-lg", "px-3", "bg-card", "hover:border-foreground/15"]],
  ["search-input.tsx", ["h-10", "rounded-lg", "px-3", "border-input", "hover:border-foreground/15"]],
  ["input-group.tsx", ["h-10", "rounded-lg", "border-input", "hover:border-foreground/15"]],
  [
    "select.tsx",
    [
      "data-[size=default]:h-10",
      "data-[size=sm]:h-10",
      "border-input",
      "hover:border-foreground/15",
      "rounded-[12px]",
      "p-1",
      "h-8",
      "rounded-lg",
      "pr-10",
      "right-3",
      "border-shadow",
    ],
  ],
  ["combobox.tsx", ["min-h-10", "*:data-[slot=input-group]:h-10", "hover:border-foreground/15"]],
  [
    "card.tsx",
    [
      "rounded-xl",
      "p-4",
      "border-shadow",
      'size?: "default" | "sm" | "lg"',
      "data-[size=lg]:rounded-xl",
      "data-[size=lg]:p-6",
    ],
  ],
  ["list-group.tsx", ["rounded-xl", "overflow-hidden"]],
  ["icon-tile.tsx", ["size-11", "rounded-xl", "size-14", "rounded-3xl"]],
  ["tabs.tsx", ["rounded-lg", "p-1"]],
  ["dialog.tsx", ["rounded-xl", "max-h-[calc(100dvh-2rem)]", "overflow-y-auto", "no-scrollbar", "max-w-2xl", "bg-card", "p-5", "-mx-5", "-mb-5", "border-t border-border/70", "smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30"]],
  ["alert-dialog.tsx", ["rounded-xl", "max-h-[calc(100dvh-2rem)]", "overflow-y-auto", "no-scrollbar", "max-w-lg", "bg-card", "p-5", "-mx-5", "-mb-5", "border-t border-border/70", "smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30"]],
  [
    "sheet.tsx",
    ["bg-card", "no-scrollbar", "duration-200 ease-(--ease-out)", "data-[side=bottom]:rounded-t-3xl", "data-[side=bottom]:p-5"],
  ],
  ["badge.tsx", ["h-8", "rounded-full", "compact: \"h-6 rounded-full", "micro: \"h-5 rounded-full", "px-3"]],
  ["sonner.tsx", ["rounded-xl", "px-4", "py-3"]],
  [
    "popover.tsx",
    [
      "rounded-xl",
      "smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30",
      'variant?: "default" | "dropdown"',
      "rounded-[12px]",
      "border-shadow",
    ],
  ],
  [
    "dropdown-menu.tsx",
    [
      "rounded-[12px]",
      "rounded-lg",
      "p-1",
      "h-8",
      "px-2",
      "pr-10",
      "right-3",
      "border-shadow",
      "sideOffset = 8",
      "collisionPadding = 12",
    ],
  ],
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

test("uses a 10px shared xl radius", () => {
  assert.match(globalStyles, /--radius-xl: 0\.625rem;/);
});

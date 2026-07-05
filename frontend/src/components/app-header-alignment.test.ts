import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./app-header.tsx", import.meta.url),
  "utf8",
);

test("uses inset shell header geometry", () => {
  assert.match(
    source,
    /className="font-display mb-6 flex items-center justify-between gap-2 md:px-2"/,
  );
  assert.doesNotMatch(source, /sticky top-0/);
  assert.doesNotMatch(source, /border-b/);
});

test("removes the sidebar trigger and vertical separator", () => {
  assert.doesNotMatch(source, /SidebarTrigger/);
  assert.doesNotMatch(source, /<Separator/);
});

test("uses a larger application section title", () => {
  assert.match(
    source,
    /className="text-base font-semibold tracking-tight text-foreground"/,
  );
});

test("keeps the Manris account menu behavior", () => {
  assert.match(source, /const \{ logout, user \} = useAuth\(\)/);
  assert.match(source, /router\.push\("\/account"\)/);
  assert.match(source, /logout\(\)/);
  assert.match(source, /router\.push\("\/login"\)/);
});

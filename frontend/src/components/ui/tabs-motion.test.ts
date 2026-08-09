import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const tabs = readFileSync(new URL("./tabs.tsx", import.meta.url), "utf8");

test("shared tab list measures the active trigger for its sliding indicator", () => {
  assert.match(tabs, /querySelector<HTMLElement>\('\[data-state="active"\]'\)/);
  assert.match(tabs, /transform: `translateX\(\$\{activeTrigger\.offsetLeft\}px\)`/);
  assert.match(tabs, /width: activeTrigger\.offsetWidth/);
});

test("active tab indicator slides smoothly and respects reduced motion", () => {
  assert.match(tabs, /data-slot="tabs-active-indicator"/);
  assert.match(tabs, /rounded-md bg-white shadow-sm/);
  assert.match(tabs, /transition-\[transform,width,height,top,opacity\]/);
  assert.match(tabs, /duration-300/);
  assert.match(tabs, /ease-\(--ease-in-out\)/);
  assert.match(tabs, /motion-reduce:transition-none/);
  assert.doesNotMatch(tabs, /data-motion-direction/);
});

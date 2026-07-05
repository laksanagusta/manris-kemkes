import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const globalStyles = readFileSync(
  new URL("../../../globals.css", import.meta.url),
  "utf8",
);
const smoothCornersSource = readFileSync(
  new URL("../../../../components/smooth-corners.tsx", import.meta.url),
  "utf8",
);

test("targeted controls use the approved corner geometry", () => {
  assert.match(
    globalStyles,
    /\.corner-xs-smooth\s*\{[^}]*border-radius: 0\.125rem;/s,
  );
  assert.match(
    globalStyles,
    /\.corner-xl-smooth\s*\{[^}]*border-radius: var\(--radius-xl\);/s,
  );
  assert.match(
    globalStyles,
    /\.corner-2xl-smooth\s*\{[^}]*border-radius: var\(--radius-2xl\);/s,
  );
  assert.match(smoothCornersSource, /function appleCornerPath/);
  assert.match(smoothCornersSource, /const r = clamp\(radius, 0, Math\.min\(w, h\) \/ 2\)/);
  assert.match(smoothCornersSource, /const exponent = 2 \+ s \* 3\.35/);
  assert.match(smoothCornersSource, /element\.style\.clipPath = path \?/);
  assert.match(
    smoothCornersSource,
    /const \{ width, height \} = element\.getBoundingClientRect\(\)/,
  );
  assert.doesNotMatch(smoothCornersSource, /entry\.contentRect/);
  assert.match(
    source,
    /className="gap-2 corner-xl-smooth shadow-none"/,
  );
  assert.match(
    source,
    /className="gap-2 corner-xl-smooth"/,
  );
  assert.match(
    source,
    /className="corner-xl-smooth bg-muted pl-10 text-sm"/,
  );
  assert.match(
    source,
    /className="pointer-events-none absolute left-4 top-1\/2 z-10 size-4/,
  );
  assert.match(
    source,
    /<TabsList[^>]*className="corner-xl-smooth border border-border\/50 bg-muted\/50 p-0\.5"/,
  );
  assert.equal(
    source.match(/className="h-full corner-xl-smooth border/g)?.length,
    2,
  );
  assert.match(
    source,
    /className="flex min-h-\[96px\] flex-col corner-2xl-smooth p-4"/,
  );
  assert.match(
    source,
    /className="corner-2xl-smooth gap-0 overflow-hidden/,
  );
});

test("risk register primary controls follow shared geometry", () => {
  assert.match(
    source,
    /import \{ SearchInput \} from "@\/components\/ui\/search-input";/,
  );
  assert.match(source, /<SearchInput/);
  assert.doesNotMatch(source, /className="h-8 gap-2 shadow-none"/);
  assert.match(
    source,
    /className="h-11 rounded-xl border border-border\/50 bg-background\/80 text-xs"/,
  );
  assert.match(
    source,
    /className="flex min-h-\[96px\] flex-col rounded-2xl p-4"/,
  );
});

test("risk register modal content follows shared geometry", () => {
  assert.match(
    source,
    /className="rounded-2xl border bg-muted\/30 px-3 py-2 text-sm"/,
  );
  assert.match(
    source,
    /className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"/,
  );
});

test("risk register retains explicit dense table exceptions", () => {
  assert.match(source, /"h-6 rounded-lg border-0 px-2\.5 text-xs"/);
  assert.match(
    source,
    /className="h-7 w-\[65px\] text-xs bg-muted\/30 border-none"/,
  );
});

test("risk register table surfaces use shared cards", () => {
  assert.doesNotMatch(
    source,
    /<div className="overflow-hidden rounded-2xl bg-(?:card|white)/,
  );
  assert.equal(
    source.match(
      /<Card className="gap-0 overflow-hidden bg-(?:card|white) p-4/g,
    )?.length,
    2,
  );
  assert.match(source, /className="-mx-4 overflow-x-auto"/);
  assert.match(source, /className="-mx-4 -mb-4 flex items-center/);
});

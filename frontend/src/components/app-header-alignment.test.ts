import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./app-header.tsx", import.meta.url),
  "utf8",
);
const collectionHeaderSource = readFileSync(
  new URL(
    "./shared/design-system/layout/collection-page-header.tsx",
    import.meta.url,
  ),
  "utf8",
);
const appTopbarSource = readFileSync(
  new URL("./app-topbar.tsx", import.meta.url),
  "utf8",
);
const appShellSource = readFileSync(
  new URL("./app-shell.tsx", import.meta.url),
  "utf8",
);
const appSidebarSource = readFileSync(
  new URL("./app-sidebar.tsx", import.meta.url),
  "utf8",
);
const rootLayoutSource = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);

test("uses the compact 56px global topbar geometry", () => {
  assert.match(appTopbarSource, /className="fixed[\s\S]*flex h-14 w-full/);
  assert.match(appShellSource, /className="relative flex min-h-svh w-full flex-col bg-background pt-14"/);
  assert.match(appSidebarSource, /md:top-14 md:h-\[calc\(100svh-3\.5rem\)\]/);
  assert.doesNotMatch(appTopbarSource, /AI Tools/);
  assert.doesNotMatch(appTopbarSource, /Semua Modul/);
  assert.doesNotMatch(appTopbarSource, /src="\/logo\.svg"/);
  assert.match(
    appTopbarSource,
    /border-e border-border\/60 px-2[\s\S]*text-base font-bold/,
  );
  assert.match(appTopbarSource, /accessibleOrgIds/);
  assert.match(appTopbarSource, /<DropdownMenu modal=\{false\}>/);
});

test("keeps the application canvas painted through viewport overscroll", () => {
  assert.match(rootLayoutSource, /<body className="bg-background antialiased">/);
  assert.match(
    appShellSource,
    /className="relative flex min-h-svh w-full flex-col bg-background pt-14"/,
  );
});

test("uses inset shell header geometry", () => {
  assert.match(
    source,
    /<CollectionPageHeader[\s\S]*className="mx-auto mb-6 w-full max-w-\[1400px\]"/,
  );
  assert.doesNotMatch(source, /sticky top-0/);
  assert.doesNotMatch(source, /border-b/);
});

test("derives the page title from the current route", () => {
  assert.match(source, /const pageTitle = breadcrumbMap\[pathname\] \?\? "Manajemen Risiko";/);
});

test("hides the global fallback title on monitoring detail routes", () => {
  assert.match(source, /pathname\.startsWith\("\/risk\/monitoring\/"\)/);
  assert.match(source, /pathname\.startsWith\("\/risk\/assessment\/"\)/);
});

test("hides the global header on working paper creation", () => {
  assert.match(source, /pathname\.startsWith\("\/risk\/working-papers\/"\)/);
});

test("hides the global header on the dashboard", () => {
  assert.match(source, /pathname === "\/overview"/);
});

test("uses the shared compact page header", () => {
  assert.match(
    source,
    /import \{ CollectionPageHeader \} from "@\/components\/shared\/design-system";/,
  );
  assert.match(
    source,
    /<CollectionPageHeader[\s\S]*title=\{pageTitle\}/,
  );
});

test("keeps the optional actions slot", () => {
  assert.match(source, /const actions = useHeaderActions\(\);/);
  assert.match(source, /actions=\{actions\}/);
});

test("keeps the canonical header title compact and subtitle-free", () => {
  assert.match(
    collectionHeaderSource,
    /className="text-2xl leading-8 font-semibold/,
  );
  assert.doesNotMatch(collectionHeaderSource, /description/);
});

test("uses the topbar as the only authenticated page title", () => {
  assert.match(
    appTopbarSource,
    /<h1 className="truncate text-center text-sm font-medium text-foreground">/,
  );
  assert.match(collectionHeaderSource, /showTitle = false/);
  assert.match(
    collectionHeaderSource,
    /const hasHeaderContent = hasLeftContent \|\| Boolean\(actions\);/,
  );
});

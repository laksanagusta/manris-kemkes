import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./app-header.tsx", import.meta.url),
  "utf8",
);
const appNavigationSource = readFileSync(
  new URL("../lib/app-navigation.ts", import.meta.url),
  "utf8",
);
const collectionHeaderSource = readFileSync(
  new URL(
    "./shared/design-system/layout/collection-page-header.tsx",
    import.meta.url,
  ),
  "utf8",
);
const formBackActionSource = readFileSync(
  new URL(
    "./shared/design-system/actions/form-back-action.tsx",
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
    /border-e border-border\/60 px-2[\s\S]*font-logo[\s\S]*text-\[20px\][\s\S]*font-semibold/,
  );
  assert.match(
    appTopbarSource,
    /font-logo[\s\S]*lowercase tracking-\[-0\.4px\][\s\S]*>Manris<\/span>/,
  );
  assert.doesNotMatch(appTopbarSource, /accessibleOrgIds/);
  assert.doesNotMatch(appTopbarSource, /Pilih organisasi/);
  assert.doesNotMatch(appTopbarSource, /<DropdownMenu/);
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
    /className="mx-auto w-full max-w-7xl"[\s\S]*<CollectionPageHeader[\s\S]*className="mb-6 w-full"/,
  );
  assert.doesNotMatch(source, /sticky top-0/);
  assert.doesNotMatch(source, /border-b/);
});

test("uses the same max-width for meeting briefing and other page headers", () => {
  assert.match(source, /className="mx-auto w-full max-w-7xl"/);
  assert.doesNotMatch(source, /isMeetingBriefingCreate|isMeetingBriefingDetail/);
});

test("derives the page title from the current route", () => {
  assert.match(source, /const \{ title, subtitle \} = getAppPageMeta\(pathname\);/);
  assert.match(appNavigationSource, /export const appPageMeta/);
  assert.match(appNavigationSource, /"\/overview": \{[\s\S]*subtitle:/);
});

test("renders the shared title and subtitle header with route exceptions", () => {
  assert.match(source, /<CollectionPageHeader[\s\S]*showTitle/);
  assert.match(source, /subtitle=\{subtitle\}/);
  assert.match(
    source,
    /pathname === "\/overview"\s*\|\|\s*pathname === "\/risk\/register\/new"/,
  );
  assert.match(source, /const isCharterDetail =/);
  assert.match(source, /if \(isCharterDetail\) \{\s*return null;/);
  assert.match(
    source,
    /if \(\s*pathname === "\/overview"\s*\|\|\s*pathname === "\/risk\/register\/new"\s*\|\|\s*pathname === "\/intelligence\/document"\s*\) \{\s*return null;/,
  );
});

test("uses the shared compact page header", () => {
  assert.match(
    source,
    /CollectionPageHeader,[\s\S]*PAGE_BACK_ACTION_SLOT_ID,[\s\S]*from "@\/components\/shared\/design-system"/,
  );
  assert.match(
    source,
    /<CollectionPageHeader[\s\S]*title=\{title\}/,
  );
});

test("keeps the optional actions slot", () => {
  assert.match(source, /const actions = useHeaderActions\(\);/);
  assert.match(source, /\{actions\}/);
  assert.match(source, /id=\{PAGE_HEADER_ACTION_SLOT_ID\}/);
});

test("keeps the canonical header title at the shared page-title scale", () => {
  assert.match(
    collectionHeaderSource,
    /<h1 className="page-title">/,
  );
  assert.match(
    collectionHeaderSource,
    /className="mt-1 text-sm leading-6 text-muted-foreground text-pretty"/,
  );
  assert.match(collectionHeaderSource, /subtitle\?: ReactNode/);
});

test("centers title-row actions against the title and subtitle block", () => {
  assert.match(
    collectionHeaderSource,
    /actionsInTitleRow[\s\S]*sm:flex-row sm:items-center sm:justify-between/,
  );
  assert.match(source, /actionsPlacement="title"/);
  assert.match(source, /id=\{PAGE_HEADER_ACTION_SLOT_ID\}/);
});

test("allows form and detail actions to use the global title-row slot", () => {
  assert.match(collectionHeaderSource, /actionsPlacement\?: "header" \| "title" \| "top"/);
  assert.match(collectionHeaderSource, /actionsInTopSlot/);
  assert.match(collectionHeaderSource, /<PageHeaderActionsPortal>\{actions\}<\/PageHeaderActionsPortal>/);
});

test("uses one aligned, transparent back action across forms and details", () => {
  assert.match(formBackActionSource, /variant="ghost"/);
  assert.match(formBackActionSource, /size="sm"/);
  assert.match(formBackActionSource, /!px-0 text-\[12px\]/);
  assert.match(formBackActionSource, /ChevronLeft/);
  assert.match(formBackActionSource, /hover:bg-transparent/);
  assert.match(formBackActionSource, /group-hover\/back:text-foreground/);
});

test("defines page-title as 28px medium", () => {
  const globalsSource = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    globalsSource,
    /\.page-title \{[\s\S]*font-size: 1\.75rem;[\s\S]*font-weight: 500;/,
  );
});

test("uses the topbar as a compact context alongside the visible page header", () => {
  assert.match(
    appTopbarSource,
    /<h1 className="truncate text-center text-sm font-medium text-foreground">/,
  );
  assert.match(source, /showTitle/);
  assert.match(collectionHeaderSource, /showTitle = false/);
  assert.match(
    collectionHeaderSource,
    /const hasHeaderContent = hasLeftContent \|\| Boolean\(actions && !actionsInTopSlot\);/,
  );
});

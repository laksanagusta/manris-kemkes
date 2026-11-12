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
const pageHeaderActionsPortalSource = readFileSync(
  new URL(
    "./shared/design-system/layout/page-header-actions-portal.tsx",
    import.meta.url,
  ),
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
const globalsSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("workspace uses a standalone mobile trigger and a desktop breadcrumb bar", () => {
  assert.match(appShellSource, /<SidebarTrigger aria-label="Buka navigasi" className="[^"]*size-11[^"]*md:hidden"/);
  assert.match(appShellSource, /className="hidden[^"]*md:flex[^"]*">\s*<AppBreadcrumbs \/>/);
  assert.match(appSidebarSource, /collapsible="icon"/);
  assert.match(appSidebarSource, /openSettings\("account"\)/);
});

test("bounds the workspace to the viewport and scrolls below the topbar", () => {
  assert.match(
    appShellSource,
    /data-app-shell="" className="relative flex h-dvh w-full overflow-hidden bg-\(--app-shell-canvas\)/,
  );
  assert.match(appShellSource, /<AppBreadcrumbs \/>[\s\S]*data-app-shell-body="" className="[^"]*overflow-y-auto/);
  assert.match(globalsSource, /body:has\(\[data-app-shell\]\)\s*\{\s*overflow: hidden;/);
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
  assert.doesNotMatch(source, /PAGE_BACK_ACTION_SLOT_ID/);
  assert.doesNotMatch(collectionHeaderSource, /backAction|PageBackAction/);
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
  assert.doesNotMatch(
    collectionHeaderSource,
    /className="mt-1 text-sm leading-6 text-secondary-foreground text-pretty"/,
  );
  assert.match(collectionHeaderSource, /subtitle\?: ReactNode/);
});

test("keeps the title content free of a redundant min-width wrapper", () => {
  assert.doesNotMatch(
    collectionHeaderSource,
    /<div className="min-w-0">\s*<div className="flex items-center gap-2\.5">/,
  );
  assert.match(collectionHeaderSource, /"min-w-0"/);
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

test("right-aligns action groups in the local top slot", () => {
  assert.match(
    pageHeaderActionsPortalSource,
    /className="flex flex-wrap items-center justify-end gap-2"/,
  );
});

test("does not render a back-action slot in the shared shell", () => {
  assert.doesNotMatch(source, /app-header-back-action/);
  assert.doesNotMatch(source, /empty:hidden/);
});

test("defines page-title as 24px semibold", () => {
  const globalsSource = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    globalsSource,
    /\.page-title \{[\s\S]*font-size: 1\.5rem;[\s\S]*font-weight: 600;/,
  );
});

test("keeps page headers within the workspace content", () => {
  assert.match(appShellSource, /<SidebarInset[\s\S]*<AppHeader \/>[\s\S]*\{children\}/);
  assert.match(collectionHeaderSource, /showTitle = false/);
});

test("keeps route-local header actions visible without a global header slot", () => {
  const portalSource = readFileSync(
    new URL(
      "./shared/design-system/layout/page-header-actions-portal.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(portalSource, /flex flex-wrap items-center justify-end gap-2/);
  assert.doesNotMatch(portalSource, /createPortal|document\.getElementById/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("./app-shell.tsx", import.meta.url), "utf8");
const pageStack = readFileSync(new URL("./shared/design-system/layout/page-stack.tsx", import.meta.url), "utf8");
const formPage = readFileSync(new URL("./shared/form-shell.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("./app-sidebar.tsx", import.meta.url), "utf8");
const designSystemPage = readFileSync(
  new URL("../app/(app)/design-system/page.tsx", import.meta.url),
  "utf8",
);

test("uses the fixed light shell surfaces", () => {
  assert.match(styles, /--background: #ffffff;/);
  assert.match(styles, /--main-content: #ffffff;/);
  assert.match(styles, /--table-header-foreground: var\(--secondary-foreground\);/);
  assert.match(styles, /--sidebar: #fafafa;/);
  assert.match(styles, /--sidebar-border: var\(--surface-border\);/);
  assert.doesNotMatch(styles, /\bdark\b/);
});

test("neutral component boundaries inherit the light surface tokens", () => {
  assert.match(styles, /:root\s*\{[^}]*--border: var\(--surface-border\);/s);
  assert.match(styles, /:root\s*\{[^}]*--input: var\(--field-border\);/s);
});

test("accent surfaces use design-system zinc grays", () => {
  assert.match(styles, /:root\s*\{[^}]*--accent: var\(--sidebar-accent\);/s);
  assert.match(styles, /:root\s*\{[^}]*--sidebar-accent: #f0f0f0;/s);
});

test("reserves the scrollbar gutter for fixed shell chrome when overlays open", () => {
  assert.match(
    styles,
    /html\s*\{[\s\S]*scrollbar-gutter:\s*stable;/,
  );
});

test("keeps fixed shell chrome inside the pre-lock viewport", () => {
  assert.match(
    styles,
    /body\[data-scroll-locked\][\s\S]*data-slot="app-topbar"[\s\S]*width:\s*calc\(100%\s*-\s*var\(--removed-body-scroll-bar-size,\s*0px\)\)\s*!important;/,
  );
  assert.match(styles, /data-component="monitoring-baseline-floating"/);
});

test("shell consumes semantic surfaces without local color overrides", () => {
  assert.match(
    shell,
    /<SidebarInset className="min-w-0 overflow-x-hidden bg-main-content p-4 md:p-6">/,
  );
  assert.doesNotMatch(sidebar, /sidebar-inner\]:bg-muted\/60/);
  assert.match(sidebar, /sidebar-inner\]:bg-sidebar/);
});

test("desktop sidebar fills the viewport and keeps only the trailing divider", () => {
  assert.match(sidebar, /variant="sidebar"/);
  assert.doesNotMatch(sidebar, /variant="floating"/);
  assert.match(
    sidebar,
    /className=\{cn\(\s*"\*:data-\[slot=sidebar-inner\]:bg-sidebar"/,
  );
});

test("authenticated pages share the design-system main-content wrapper", () => {
  assert.match(
    shell,
    /<div className="w-full min-w-0 pb-8">\s*\{children\}\s*<\/div>/,
  );
  assert.match(designSystemPage, /<PageStack>/);
  assert.match(pageStack, /"w-full min-w-0 space-y-6 motion-safe:animate-fade-in"/);
  assert.match(formPage, /"w-full min-w-0 animate-fade-in space-y-6 pb-20/);
  assert.doesNotMatch(
    designSystemPage,
    /mx-auto max-w-\[1200px\][^\"]*py-8/,
  );
});

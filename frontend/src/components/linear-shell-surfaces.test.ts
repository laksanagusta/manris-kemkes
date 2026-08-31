import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("./app-shell.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("./app-sidebar.tsx", import.meta.url), "utf8");
const designSystemPage = readFileSync(
  new URL("../app/(app)/design-system/page.tsx", import.meta.url),
  "utf8",
);

test("uses Linear-style light and dark shell surfaces", () => {
  assert.match(styles, /--background: #ffffff;/);
  assert.match(styles, /--main-content: #fcfcfd;/);
  assert.match(styles, /--table-header-foreground: #a1a1a1;/);
  assert.match(styles, /--sidebar: #f7f7f8;/);
  assert.match(styles, /--sidebar-border: rgb\(0 0 0 \/ 8%\);/);
  assert.match(styles, /\.dark\s*\{[^}]*--background: #111113;/s);
  assert.match(styles, /\.dark\s*\{[^}]*--main-content: #111113;/s);
  assert.match(styles, /\.dark\s*\{[^}]*--sidebar: #171719;/s);
});

test("neutral component boundaries inherit the table-gray global token", () => {
  assert.match(styles, /:root\s*\{[^}]*--border: rgb\(228 228 231 \/ 80%\);/s);
  assert.match(styles, /:root\s*\{[^}]*--input: rgb\(228 228 231 \/ 80%\);/s);
  assert.match(styles, /\.dark\s*\{[^}]*--border: rgb\(63 63 70 \/ 80%\);/s);
  assert.match(styles, /\.dark\s*\{[^}]*--input: rgb\(63 63 70 \/ 80%\);/s);
});

test("accent surfaces use design-system zinc grays", () => {
  assert.match(styles, /:root\s*\{[^}]*--accent: #f1f1f2;/s);
  assert.match(styles, /:root\s*\{[^}]*--sidebar-accent: #ececee;/s);
  assert.match(styles, /\.dark\s*\{[^}]*--accent: #27272a;/s);
  assert.match(styles, /\.dark\s*\{[^}]*--sidebar-accent: #27272a;/s);
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
    /<div className="mx-auto w-full max-w-\[1400px\] min-w-0 pb-8">\s*\{children\}\s*<\/div>/,
  );
  assert.match(designSystemPage, /<div className="space-y-12">/);
  assert.doesNotMatch(
    designSystemPage,
    /mx-auto max-w-\[1200px\][^\"]*py-8/,
  );
});

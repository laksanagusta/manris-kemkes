import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const shell = readFileSync(
  new URL("../../../../components/app-shell.tsx", import.meta.url),
  "utf8",
);

test("risk register header omits the redundant subtitle", () => {
  assert.doesNotMatch(page, /Buat dan pantau risiko/);
});

test("risk register table headings share one typography scale", () => {
  const tableHeaderSection = page.slice(
    page.indexOf("<TableHeader"),
    page.indexOf("</TableHeader>") + "</TableHeader>".length,
  );

  assert.doesNotMatch(tableHeaderSection, /text-xs/);
  assert.equal(tableHeaderSection.match(/text-sm/g)?.length, 7);
});

test("application main content can shrink beside the sidebar", () => {
  assert.match(
    shell,
    /<SidebarInset className="min-w-0 overflow-x-hidden bg-background p-4 md:p-6">/,
  );
  assert.match(
    shell,
    /<main className="flex min-w-0 flex-1 flex-col gap-4">/,
  );
});

test("register tools sit on the same row as the tabs", () => {
  assert.match(
    page,
    /<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\s*<TabsList[\s\S]*?<RiskRegisterFilterToolbar[\s\S]*?<\/div>\s*<TabsContent/,
  );
});

test("scores and compact badges follow the table density", () => {
  assert.match(
    page,
    /className="text-sm font-medium tabular-nums text-foreground"/,
  );
  assert.match(page, /<Badge\s+size="compact"\s+tone=/);
  assert.match(
    page,
    /"flex size-6 items-center justify-center rounded-sm ring-1/,
  );
});

test("active register surfaces use shared design-system components", () => {
  assert.match(page, /from "@\/components\/shared\/design-system"/);
  assert.match(page, /<CollectionTabsList>/);
  assert.match(page, /<CollectionTableCard>/);
  assert.equal(page.match(/<CollectionPagination/g)?.length, 2);
  assert.doesNotMatch(page, /RegisterTabsList|RegisterTableCard|RegisterPagination/);
  assert.match(page, /<CollectionTabsTrigger/);
  assert.match(page, /<CollectionSearchField/);
  assert.match(page, /<CollectionFilterTrigger/);
  assert.match(page, /from "@\/components\/ui\/badge"/);
  assert.match(page, /<CollectionDialogCancel/);
});

test("removed draft and history experiences leave no route UI", () => {
  assert.doesNotMatch(page, /<TabsTrigger value="my-drafts"/);
  assert.doesNotMatch(page, /<TabsTrigger value="history"/);
});

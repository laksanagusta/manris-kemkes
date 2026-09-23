import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const registerSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const sidebarSource = readFileSync(
  new URL("../../../../components/app-sidebar.tsx", import.meta.url),
  "utf8",
);
test("risk register keeps navigation compact and removes KPI cards", () => {
  assert.doesNotMatch(registerSource, /import \{ KpiCard \}/);
  assert.doesNotMatch(registerSource, /riskSummaryCards/);
  assert.doesNotMatch(registerSource, /Total Risiko/);
  assert.match(registerSource, /<CollectionPageHeader title="Risiko" \/>/);
  assert.match(registerSource, /\{registerTotal\}/);
  assert.match(registerSource, /Pemantauan/);
});

test("sidebar does not duplicate the page-level create-risk action", () => {
  assert.doesNotMatch(sidebarSource, /tooltip="Tambah Risiko"/);
  assert.doesNotMatch(sidebarSource, /href="\/risk\/register\/new"/);
});

test("risk register table exposes accessible sorting and monitoring progress", () => {
  assert.match(registerSource, /aria-sort=\{scoreAriaSort\}/);
  assert.match(registerSource, /aria-label=\{`Urutkan berdasarkan skor/);
  assert.match(registerSource, /flex w-full items-center gap-1 px-0 text-left capitalize outline-none transition-colors/);
  assert.doesNotMatch(registerSource, /text-left uppercase outline-none transition-colors/);
  assert.match(registerSource, /<MonitoringTransactionProgress/);
  assert.match(registerSource, /<MonitoringTransactionProgress\s+data=\{risk\.semesterMonitoring\}\s+showCount=\{false\}/);
  assert.doesNotMatch(registerSource, /<CollectionTableHead[^>]*>\s*Kode\s*<\/CollectionTableHead>/);
  assert.match(registerSource, /<CollectionTableHead className="min-w-\[176px\]">\s*Pemantauan/);
  assert.match(registerSource, /Mulai Pemantauan/);
});

test("risk register table uses the approved column proportions", () => {
  assert.match(
    registerSource,
    /<colgroup>\s*<col style=\{\{ width: "42%" \}\} \/>\s*<col style=\{\{ width: "15%" \}\} \/>\s*<col style=\{\{ width: "8%" \}\} \/>\s*<col style=\{\{ width: "11%" \}\} \/>\s*<col style=\{\{ width: "18%" \}\} \/>\s*<col style=\{\{ width: "6%" \}\} \/>\s*<\/colgroup>/,
  );
  assert.match(registerSource, /sticky right-0 z-10 w-\[6%\]/);
  assert.match(registerSource, /sticky right-0 w-\[6%\] bg-card/);
});

test("risk register data rows use the shared two-line ledger rhythm", () => {
  assert.doesNotMatch(
    registerSource,
    /<TableRow\s+key=\{risk\.id\}\s+className=/,
  );
  assert.match(registerSource, /className="flex min-w-0 flex-col items-start gap-1"/);
  assert.match(registerSource, /font-mono text-\[11px\] leading-4 text-muted-foreground/);
});

test("risk register gives the sticky action cell the same row hover surface", () => {
  assert.doesNotMatch(registerSource, /hover:\[&>td\]:bg-muted/);
  assert.match(
    registerSource,
    /className="sticky right-0 w-\[6%\] bg-card px-5 py-3"/,
  );
  assert.doesNotMatch(registerSource, /group-hover:bg-muted\/50/);
});

test("risk register header delegates to the shared reference rhythm", () => {
  assert.match(
    registerSource,
    /<CollectionTableHeader>\s*<CollectionTableHeaderRow>/,
  );
  assert.doesNotMatch(registerSource, /CollectionTableHeader className=/);
});

test("risk register table keeps actions discoverable without redundant chrome", () => {
  assert.match(registerSource, /min-w-\[1120px\] table-fixed bg-card/);
  assert.match(registerSource, /sticky right-0/);
  assert.doesNotMatch(
    registerSource,
    /<h2 className="text-base font-medium tracking-tight text-foreground text-balance">\s*Daftar Risiko\s*<\/h2>/,
  );
  assert.match(registerSource, /text-xs text-muted-foreground/);
  assert.match(registerSource, /min-w-\[176px\]/);
});

test("risk register table and search use compact defined surfaces", () => {
  assert.match(
    registerSource,
    /<CollectionTableCard\b/,
  );
  assert.doesNotMatch(
    registerSource,
    /Card className="[^"]*(?:border|ring-|shadow-none)[^"]*bg-card p-0/,
  );
  assert.doesNotMatch(registerSource, /<div className="-mx-4">/);
  assert.match(registerSource, /<CollectionSearchField/);
});

test("risk register renders one collection without a secondary monitoring tab", () => {
  assert.doesNotMatch(registerSource, /<Tabs|TabsContent|TabsTrigger|SidebarTabsList/);
  assert.doesNotMatch(registerSource, /monitoring-transactions/);
  assert.match(registerSource, /Lanjutkan Pemantauan/);
});

test("risk register header uses the shared neutral surface", () => {
  assert.match(
    registerSource,
    /<CollectionTableHeader>\s*\n\s*<CollectionTableHeaderRow>/,
  );
});

test("risk register body rows use internal separator borders", () => {
  assert.match(registerSource, /<TableRow\s+key=\{risk\.id\}\s*>/);
  assert.match(
    registerSource,
    /<ActionIconButton\s+className="text-muted-foreground"\s+aria-label=\{`Aksi risiko/,
  );
  assert.match(
    registerSource,
    /className="sticky right-0 w-\[6%\] bg-card px-5 py-3"/,
  );
  assert.match(registerSource, /<MonitoringTransactionProgress\s+data=\{risk\.semesterMonitoring\}/);
  assert.doesNotMatch(registerSource, /countLabel=""/);
  assert.doesNotMatch(registerSource, /Pemantauan \{new Date\(\)\.getFullYear\(\)\}/);
  assert.doesNotMatch(
    registerSource,
    /className="group border-b border-border hover:bg-muted\/50"/,
  );
});

test("risk register pagination footer stays inside the shared table cards", () => {
  assert.match(
    registerSource,
    /<CollectionTableCard>[\s\S]*?<CollectionPagination[\s\S]*?<\/CollectionTableCard>/,
  );
  assert.equal(registerSource.match(/<CollectionPagination/g)?.length, 1);
  assert.doesNotMatch(registerSource, /monitoring-transactions/i);
  assert.doesNotMatch(
    registerSource,
    /mt-4 grid gap-3 px-1 text-sm text-muted-foreground/,
  );
});

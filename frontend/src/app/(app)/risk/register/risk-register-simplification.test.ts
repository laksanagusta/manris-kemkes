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
  assert.match(registerSource, /Daftar Risiko/);
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
  assert.match(registerSource, /<MonitoringTransactionProgress/);
  assert.match(registerSource, /<MonitoringTransactionProgress\s+data=\{risk\.semesterMonitoring\}\s+countLabel=""/);
  assert.doesNotMatch(registerSource, /<CollectionTableHead[^>]*>\s*Kode\s*<\/CollectionTableHead>/);
  assert.match(registerSource, /<CollectionTableHead className="min-w-\[176px\] px-3">\s*Pemantauan/);
  assert.match(registerSource, /Mulai Pemantauan/);
});

test("risk register data rows stay compact", () => {
  assert.match(
    registerSource,
    /className="group h-10 border-0 hover:bg-muted\/50"/,
  );
});

test("risk register header stays compact", () => {
  assert.match(
    registerSource,
    /<CollectionTableHeader\s+[^>]*density="compact"/,
  );
});

test("risk register table keeps actions discoverable without redundant chrome", () => {
  assert.doesNotMatch(registerSource, /min-w-\[1120px\]/);
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

test("risk register header uses the shared compact neutral surface", () => {
  assert.match(
    registerSource,
    /<CollectionTableHeader density="compact">/,
  );
});

test("risk register body rows do not use separator borders", () => {
  assert.match(
    registerSource,
    /className="group h-10 border-0 hover:bg-muted\/50"/,
  );
  assert.match(
    registerSource,
    /className="text-muted-foreground"\s+icon=\{/,
  );
  assert.match(
    registerSource,
    /className="sticky right-0 bg-card px-3 py-2 transition-colors group-hover:bg-muted\/50"/,
  );
  assert.doesNotMatch(
    registerSource,
    /className="text-muted-foreground"\s*aria-label={`Aksi risiko/,
  );
  assert.match(registerSource, /<MonitoringTransactionProgress\s+data=\{risk\.semesterMonitoring\}/);
  assert.match(registerSource, /className="text-sm font-normal tabular-nums text-muted-foreground"/);
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

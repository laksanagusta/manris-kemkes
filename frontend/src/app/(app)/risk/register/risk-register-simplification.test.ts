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

test("risk register table exposes accessible sorting and monitoring states", () => {
  assert.match(registerSource, /aria-sort=\{scoreAriaSort\}/);
  assert.match(registerSource, /aria-label=\{`Urutkan berdasarkan skor/);
  assert.match(registerSource, /sr-only/);
  assert.match(registerSource, /Selesai|Draf|Belum tersedia/);
});

test("risk register table keeps actions discoverable without redundant chrome", () => {
  assert.doesNotMatch(registerSource, /min-w-\[1120px\]/);
  assert.match(registerSource, /sticky right-0/);
  assert.doesNotMatch(
    registerSource,
    /<h2 className="text-base font-medium tracking-tight text-foreground text-balance">\s*Daftar Risiko\s*<\/h2>/,
  );
  assert.match(registerSource, /text-xs text-muted-foreground/);
  assert.match(registerSource, /h-10 w-\[72px\]/);
});

test("risk register table and search use compact defined surfaces", () => {
  assert.match(
    registerSource,
    /Card className="relative rounded-lg gap-0 overflow-hidden bg-card p-0 shadow-none ring-0 after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-\[inherit\] after:ring-1 after:ring-inset after:ring-zinc-200\/80 after:content-\[''\]"/,
  );
  assert.doesNotMatch(
    registerSource,
    /Card className="[^"]*border border-border[^"]*bg-card p-0/,
  );
  assert.doesNotMatch(registerSource, /<div className="-mx-4">/);
  assert.match(registerSource, /className="bg-card pl-10 text-sm ring-1 ring-inset ring-border\/40"/);
});

test("risk register tabs stay compact and fully rounded", () => {
  assert.match(
    registerSource,
    /TabsList className="group-data-horizontal\/tabs:!h-9 rounded-full ring-1 ring-inset ring-border\/50 bg-muted\/50 p-0\.5"/,
  );
  assert.match(
    registerSource,
    /TabsTrigger value="all-risks" className="h-full rounded-full border border-transparent px-2\.5 text-xs font-medium leading-none/,
  );
  assert.match(
    registerSource,
    /TabsTrigger[\s\S]*value="monitoring-transactions"[\s\S]*className="h-full rounded-full border border-transparent px-2\.5 text-xs font-medium leading-none/,
  );
});

test("risk register header uses a blended neutral surface", () => {
  assert.match(
    registerSource,
    /TableHeader className="bg-\[#fafafa\] \[&_tr\]:border-b \[&_tr\]:border-border"/,
  );
  assert.match(registerSource, /capitalize text-table-header-foreground/);
  assert.doesNotMatch(registerSource, /capitalize text-zinc-600/);
  assert.doesNotMatch(
    registerSource,
    /TableHeader className="[^\"]*"[\s\S]*?capitalize text-muted-foreground[\s\S]*?<\/TableHeader>/,
  );
});

test("risk register body rows do not use separator borders", () => {
  assert.match(
    registerSource,
    /className="group border-0 hover:bg-muted\/50"/,
  );
  assert.match(
    registerSource,
    /className="border border-zinc-200\/70 bg-white text-foreground shadow-\[0_1px_2px_rgba\(0,0,0,0\.04\)\] hover:bg-white hover:text-foreground aria-expanded:bg-white aria-expanded:text-foreground"/,
  );
  assert.match(
    registerSource,
    /className="sticky right-0 bg-background px-3 py-2 transition-colors group-hover:bg-muted\/50"/,
  );
  assert.doesNotMatch(
    registerSource,
    /className="text-muted-foreground"\s*aria-label={`Aksi risiko/,
  );
  assert.doesNotMatch(registerSource, /SemesterIndicator data=\{risk\.semesterMonitoring\}/);
  assert.doesNotMatch(registerSource, /Pemantauan \{new Date\(\)\.getFullYear\(\)\}/);
  assert.doesNotMatch(
    registerSource,
    /className="group border-b border-border hover:bg-muted\/50"/,
  );
});

test("risk register pagination footer stays inside the shared table cards", () => {
  assert.match(
    registerSource,
    /<CollectionTableCard title="Daftar Risiko">[\s\S]*?<CollectionPagination[\s\S]*?<\/CollectionTableCard>/,
  );
  assert.match(
    registerSource,
    /<CollectionTableCard title="Transaksi Pemantauan">[\s\S]*?<CollectionPagination[\s\S]*?<\/CollectionTableCard>/,
  );
  assert.doesNotMatch(
    registerSource,
    /mt-4 grid gap-3 px-1 text-sm text-muted-foreground/,
  );
});

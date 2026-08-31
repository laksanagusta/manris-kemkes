import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const riskFormPage = readFileSync(
  new URL("./new/page.tsx", import.meta.url),
  "utf8",
);
const roPicker = readFileSync(
  new URL("../../../../components/risk/ro-picker.tsx", import.meta.url),
  "utf8",
);
const shell = readFileSync(
  new URL("../../../../components/app-shell.tsx", import.meta.url),
  "utf8",
);

test("risk register header omits the redundant subtitle", () => {
  assert.doesNotMatch(page, /Buat dan pantau risiko/);
});

test("risk register table headings share one typography scale", () => {
  const tableHeaderSection = page.slice(
    page.indexOf("<CollectionTableHeader"),
    page.indexOf("</CollectionTableHeader>") + "</CollectionTableHeader>".length,
  );

  assert.equal(tableHeaderSection.match(/<CollectionTableHead(?:\s|>)/g)?.length, 6);
  assert.doesNotMatch(tableHeaderSection, />\s*Kode\s*</);
  assert.match(tableHeaderSection, /Pemantauan/);
});

test("risk form context card uses the shared default border shadow", () => {
  assert.match(
    riskFormPage,
    /<Card className="gap-0 overflow-hidden rounded-2xl bg-card p-0 transition-colors duration-300">/,
  );
  assert.doesNotMatch(riskFormPage, /elevation\s*=/);
});

test("risk form back action uses a secondary button with a concise label", () => {
  assert.match(
    riskFormPage,
    /<ActionButton\s+asChild\s+variant="secondary"\s+size="sm"\s+className="border-0 text-sm font-normal"\s*>[\s\S]*?<Link href="\/risk\/register">[\s\S]*?Kembali\s*<\/Link>/,
  );
  assert.doesNotMatch(riskFormPage, /Kembali ke daftar risiko/);
});

test("risk form uses concise finalization copy and medium-weight field labels", () => {
  assert.match(
    riskFormPage,
    /usesDirectApprovalCopy[\s\S]*?\? "Finalisasi"/,
  );
  assert.doesNotMatch(riskFormPage, /Finalisasi risiko/);
  assert.match(riskFormPage, /<Label[^>]*font-medium/);
  assert.match(riskFormPage, /\[&_\[data-slot=label\]\]:font-medium/);
});

test("risk form section headings use the medium weight", () => {
  const sectionHeadingClass =
    /<p className="text-sm font-medium tracking-tight text-foreground transition-colors">/g;

  assert.equal(riskFormPage.match(sectionHeadingClass)?.length, 6);
  assert.match(
    riskFormPage,
    /<p className="text-sm font-medium tracking-tight text-foreground transition-colors">\s*Identifikasi Risiko\s*<\/p>/,
  );
});

test("risk evaluation metadata is concise, normal, and muted", () => {
  assert.match(
    riskFormPage,
    /<div className="grid gap-5 text-sm font-normal text-muted-foreground md:grid-cols-2">[\s\S]*?Prioritas Risiko[\s\S]*?<span>\{riskPriority\}<\/span>[\s\S]*?Selera Risiko[\s\S]*?<span>/,
  );
  assert.doesNotMatch(riskFormPage, /\(Otomatis dari (tingkat|skor) risiko\)/);
});

test("finalized risk locks RO and assessment cycle selectors", () => {
  assert.match(
    riskFormPage,
    /<ROPicker[\s\S]*?value=\{watch\("roId"\)\}[\s\S]*?disabled=\{isRiskLocked\}/,
  );
  assert.match(
    riskFormPage,
    /<PopoverSelectField[\s\S]*?value=\{assessmentCycleDisplay\}[\s\S]*?placeholder="Pilih periode kuartal"[\s\S]*?disabled=\{isRiskLocked\}/,
  );
  assert.match(roPicker, /role="combobox"[\s\S]*?disabled=\{disabled\}/);
  assert.match(roPicker, /<SearchInput[\s\S]*?disabled=\{disabled\}/);
  assert.match(roPicker, /<button[\s\S]*?disabled=\{disabled\}/);
});

test("risk form context section titles use 0.6px character spacing", () => {
  const rightPanel = riskFormPage.slice(riskFormPage.indexOf("<aside"));

  assert.equal(rightPanel.match(/tracking-\[0\.6px\]/g)?.length, 3);
  assert.doesNotMatch(rightPanel, /tracking-\[0\.16em\]/);
});

test("application main content can shrink beside the sidebar", () => {
  assert.match(
    shell,
    /<SidebarInset className="min-w-0 overflow-x-hidden bg-main-content p-4 md:p-6">/,
  );
  assert.match(
    shell,
    /<main className="flex min-w-0 flex-1 flex-col gap-4">/,
  );
});

test("register tools sit above the single risk collection", () => {
  assert.match(page, /<CollectionToolbar/);
  assert.match(page, /<CollectionTableCard>/);
  assert.doesNotMatch(page, /<Tabs|TabsContent|TabsTrigger/);
  assert.doesNotMatch(page, /Muat ulang daftar risiko|handleRefreshRegister/);
});

test("risk register import action shares the card shadow boundary", () => {
  assert.match(
    page,
    /<ActionButton\s+asChild\s+variant="outline"\s+className="border-0 border-shadow"\s*>[\s\S]*?Import Risiko/,
  );
});

test("scores and compact badges follow the table density", () => {
  assert.match(
    page,
    /className="text-sm font-normal tabular-nums text-muted-foreground"/,
  );
  assert.match(page, /<Badge\s+size="compact"\s+tone=/);
  assert.match(page, /<CollectionTableHead className="sticky right-0/);
});

test("active register surfaces use shared design-system components", () => {
  assert.match(page, /from "@\/components\/shared\/design-system"/);
  assert.match(page, /<CollectionTableCard>/);
  assert.equal(page.match(/<CollectionPagination/g)?.length, 1);
  assert.doesNotMatch(page, /RegisterTabsList|RegisterTableCard|RegisterPagination|<Tabs/);
  assert.match(page, /<CollectionSearchField/);
  assert.match(page, /<CollectionFilterTrigger/);
  assert.match(page, /from "@\/components\/ui\/badge"/);
  assert.match(page, /<CollectionDialogCancel/);
});

test("risk archive modal uses the shared modal action contract", () => {
  assert.match(
    page,
    /<DialogContent className="max-w-lg no-scrollbar" showCloseButton=\{false\}>/,
  );
  assert.match(
    page,
    /<AccentButton[\s\S]*?onClick=\{handleArchiveRisk\}[\s\S]*?>\s*Arsipkan\s*<\/AccentButton>/,
  );
  assert.doesNotMatch(page, /bg-accent p-3 ring-1 ring-inset ring-border/);
});

test("removed draft and history experiences leave no legacy tab UI", () => {
  assert.doesNotMatch(page, /<TabsTrigger value="my-drafts"/);
  assert.doesNotMatch(page, /<TabsTrigger value="history"/);
});

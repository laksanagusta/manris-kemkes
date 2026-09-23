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
const appNavigation = readFileSync(
  new URL("../../../../lib/app-navigation.ts", import.meta.url),
  "utf8",
);
const bulkRiskPage = readFileSync(
  new URL("./bulk/page.tsx", import.meta.url),
  "utf8",
);
const actionIconButton = readFileSync(
  new URL(
    "../../../../components/shared/design-system/actions/action-icon-button.tsx",
    import.meta.url,
  ),
  "utf8",
);
const globals = readFileSync(
  new URL("../../../globals.css", import.meta.url),
  "utf8",
);

test("risk register metadata explains the page purpose", () => {
  assert.match(
    appNavigation,
    /"\/risk\/register": \{[\s\S]*subtitle: "Kelola identifikasi, status, dan siklus pemantauan risiko\."/,
  );
});

test("bulk risk form header has no back action", () => {
  assert.doesNotMatch(bulkRiskPage, /backClassName=/);
  assert.doesNotMatch(bulkRiskPage, /onBack=|backLabel=|FormBackAction/);
  assert.match(bulkRiskPage, /<FormHeader/);
});

test("risk register table headings share one typography scale", () => {
  const tableHeaderSection = page.slice(
    page.indexOf("<CollectionTableHeader"),
    page.indexOf("</CollectionTableHeader>") + "</CollectionTableHeader>".length,
  );

  assert.equal(tableHeaderSection.match(/<CollectionTableHead(?:\s|>)/g)?.length, 6);
  assert.doesNotMatch(tableHeaderSection, />\s*Kode\s*</);
  assert.match(tableHeaderSection, /Pemantauan/);
  assert.match(
    tableHeaderSection,
    /<CollectionTableHead aria-sort=\{scoreAriaSort\}>/,
  );
});

test("risk register titles use medium-weight detail links", () => {
  assert.match(
    page,
    /<Link\s+href=\{`\/risk\/register\/\$\{risk\.id\}`\}\s+className="min-w-0 max-w-full truncate text-sm font-medium leading-5 text-foreground transition-colors hover:text-primary"/,
  );
});

test("risk form context card uses the shared default border shadow", () => {
  assert.match(
    riskFormPage,
    /<Card className="gap-0 overflow-hidden rounded-lg bg-card p-0 transition-colors duration-300">/,
  );
  assert.doesNotMatch(riskFormPage, /elevation\s*=/);
});

test("risk AI assist buttons use the outlined treatment without decorative icons", () => {
  const aiButton = riskFormPage.slice(
    riskFormPage.indexOf("function AiFieldButton("),
    riskFormPage.indexOf("// ----------------------", riskFormPage.indexOf("function AiFieldButton(")),
  );

  assert.match(aiButton, /variant="outline"/);
  assert.match(aiButton, /size="xs"/);
  assert.doesNotMatch(aiButton, /border-0/);
  assert.doesNotMatch(aiButton, /WandSparkles|risk-ai-idle-icon|risk-ai-spinner/);
});

test("risk cause and impact suggestions share the structured-list modal", () => {
  const causeModal = riskFormPage.slice(
    riskFormPage.indexOf('<AiSuggestionModal\n          open={causeModalOpen}'),
    riskFormPage.indexOf('<AiSuggestionModal', riskFormPage.indexOf('<AiSuggestionModal\n          open={causeModalOpen}') + 1),
  );
  const impactModal = riskFormPage.slice(
    riskFormPage.indexOf('<AiSuggestionModal\n          open={impactModalOpen}'),
    riskFormPage.indexOf('</FormPage>', riskFormPage.indexOf('<AiSuggestionModal\n          open={impactModalOpen}')),
  );

  assert.match(causeModal, /variant="structured-list"/);
  assert.match(impactModal, /variant="structured-list"/);
  assert.doesNotMatch(impactModal, /description="Pilih dampak/);
});

test("risk version history uses compact solid timeline markers", () => {
  assert.match(
    riskFormPage,
    /RiskVersionHistoryList[\s\S]*?absolute -left-\[22px\] top-1 z-10 size-3 rounded-full border-2/,
  );
  assert.match(riskFormPage, /border-muted-foreground bg-muted-foreground/);
  assert.doesNotMatch(
    riskFormPage,
    /absolute -left-6 top-0\.5 z-10 size-4 rounded-full border-2 bg-card/,
  );
});

test("risk version history avoids a redundant current-version badge", () => {
  const versionHistory = riskFormPage.slice(
    riskFormPage.indexOf("function RiskVersionHistoryList"),
    riskFormPage.indexOf("export default function RiskInputPage"),
  );

  assert.doesNotMatch(versionHistory, /Terkini/);
  assert.doesNotMatch(versionHistory, /<Badge/);
});

test("risk version history connectors meet the center of each marker", () => {
  assert.doesNotMatch(
    riskFormPage,
    /absolute bottom-2 left-2 top-2 w-px bg-border\/70/,
  );
  assert.match(
    riskFormPage,
    /index < versions\.length - 1[\s\S]*?absolute -bottom-\[30px\] -left-\[16px\] top-\[10px\]/,
  );
});

test("risk context panel exposes compact risk properties", () => {
  assert.match(riskFormPage, /aria-labelledby="risk-side-properties"/);
  assert.match(riskFormPage, />\s*Properti\s*</);
  assert.match(riskFormPage, /<dt className="text-\[13px\] text-muted-foreground">Status<\/dt>/);
  assert.match(riskFormPage, /<dt className="text-\[13px\] text-muted-foreground">Kode risiko<\/dt>/);
  assert.match(riskFormPage, /<dt className="text-\[13px\] text-muted-foreground">Versi<\/dt>/);
  assert.match(riskFormPage, /<dt className="text-\[13px\] text-muted-foreground">Periode asesmen<\/dt>/);
  assert.match(riskFormPage, /riskVersionNumber/);
  assert.match(riskFormPage, /assessmentCycleDisplay/);
});

test("risk properties stay limited to status, code, version, and assessment period", () => {
  const propertyStart = riskFormPage.indexOf(
    '<section aria-labelledby="risk-side-properties">',
  );
  const propertySection = riskFormPage.slice(
    propertyStart,
    riskFormPage.indexOf("</section>", propertyStart),
  );

  assert.equal(
    propertySection.match(/<dt className="text-\[13px\] text-muted-foreground">/g)?.length,
    4,
  );
  assert.match(propertySection, /<dl className="mt-3 space-y-3">/);
  assert.doesNotMatch(propertySection, /grid-cols-2/);
  assert.doesNotMatch(propertySection, /Kategori|Unit kerja|Sumber risiko|Tingkat kendali|Skor inheren/);
  assert.match(
    riskFormPage,
    /<section\s+aria-labelledby="risk-side-treatment"\s+className="border-t border-dashed border-border\/70 pt-5"\s*>/,
  );
});

test("risk version navigation ignores stale loads and uses one click handler", () => {
  assert.match(riskFormPage, /const riskLoadRequestRef = useRef\(0\);/);
  assert.match(riskFormPage, /if \(loadRequestId !== riskLoadRequestRef\.current\) return;/);
  assert.doesNotMatch(
    riskFormPage,
    /onPointerDown=\{\(\) => onVersionSelect\(version\.id\)\}/,
  );
});

test("risk property rows do not carry redundant min-width constraints", () => {
  const propertySection = riskFormPage.slice(
    riskFormPage.indexOf('<section aria-labelledby="risk-side-properties">'),
    riskFormPage.indexOf('<section aria-labelledby="risk-side-treatment">'),
  );

  assert.doesNotMatch(propertySection, /className="min-w-0"/);
});

test("risk property rows align labels and values vertically", () => {
  const propertySection = riskFormPage.slice(
    riskFormPage.indexOf('<section aria-labelledby="risk-side-properties">'),
    riskFormPage.indexOf('<section aria-labelledby="risk-side-treatment">'),
  );

  assert.equal(
    propertySection.match(/className="flex items-center justify-between gap-4"/g)
      ?.length,
    4,
  );
  assert.doesNotMatch(propertySection, /items-start justify-between/);
});

test("risk creation and detail hide the RO selector", () => {
  assert.doesNotMatch(riskFormPage, /<ROPicker|Ringkasan Hirarki/);
  assert.match(riskFormPage, /roId: values\.roId \?\? ""/);
});

test("risk monitoring start action uses the outline treatment", () => {
  assert.match(
    riskFormPage,
    /<ActionButton\s+variant="outline"\s+icon=\{<RefreshCcw[\s\S]*?onClick=\{handleOpenMonitoringDialog\}[\s\S]*?>\s*Mulai Pemantauan/,
  );
});

test("risk save surfaces backend validation errors in a toast", () => {
  assert.match(
    riskFormPage,
    /err instanceof ApiError[\s\S]*?err\.message[\s\S]*?toast\.error\(errorMessage\)/,
  );
});

test("risk form has no back action", () => {
  assert.doesNotMatch(riskFormPage, /<FormBackAction|backAction=|backActionPlacement=/);
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
  const sectionSubtitleClass =
    /<p className="text-xs leading-relaxed text-secondary-foreground">/g;

  assert.equal(riskFormPage.match(sectionHeadingClass)?.length, 6);
  assert.equal(riskFormPage.match(sectionSubtitleClass)?.length, 6);
  assert.match(
    riskFormPage,
    /<p className="text-sm font-medium tracking-tight text-foreground transition-colors">\s*Identifikasi Risiko\s*<\/p>/,
  );
});

test("risk evaluation metadata keeps values concise, normal, and muted", () => {
  assert.match(
    riskFormPage,
    /<div className="grid gap-5 text-sm font-normal text-muted-foreground md:grid-cols-2">[\s\S]*?Prioritas Risiko[\s\S]*?<span>\{riskPriority\}<\/span>[\s\S]*?Selera Risiko[\s\S]*?<span>/,
  );
  assert.doesNotMatch(riskFormPage, /\(Otomatis dari (tingkat|skor) risiko\)/);
});

test("risk evaluation metadata labels use the primary foreground", () => {
  const evaluationSection = riskFormPage.slice(
    riskFormPage.indexOf('id="evaluasi"'),
    riskFormPage.indexOf('id="penanganan"'),
  );

  assert.match(
    evaluationSection,
    /<Label className="text-sm font-medium text-foreground">\s*Prioritas Risiko\s*<\/Label>/,
  );
  assert.match(
    evaluationSection,
    /<Label className="text-sm font-medium text-foreground">\s*Selera Risiko\s*<\/Label>/,
  );
});

test("risk form keeps code and assessment period in the context panel only", () => {
  const identificationSection = riskFormPage.slice(
    riskFormPage.indexOf('id="identifikasi"'),
    riskFormPage.indexOf('id="analisis"'),
  );

  assert.doesNotMatch(identificationSection, />\s*Kode Risiko\s*</);
  assert.doesNotMatch(identificationSection, />\s*Periode\s*</);
  assert.match(riskFormPage, /<dt className="text-\[13px\] text-muted-foreground">Kode risiko<\/dt>/);
  assert.match(riskFormPage, /<dt className="text-\[13px\] text-muted-foreground">Periode asesmen<\/dt>/);
});

test("RO picker remains independently locked when reused", () => {
  assert.match(roPicker, /role="combobox"[\s\S]*?disabled=\{disabled\}/);
  assert.match(roPicker, /<SearchInput[\s\S]*?disabled=\{disabled\}/);
  assert.match(roPicker, /<button[\s\S]*?disabled=\{disabled\}/);
});

test("risk form context section titles use 0.6px character spacing", () => {
  const rightPanel = riskFormPage.slice(riskFormPage.indexOf("<aside"));

  assert.equal(rightPanel.match(/tracking-\[0\.6px\]/g)?.length, 4);
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

test("risk register row actions use the card shadow boundary", () => {
  assert.match(actionIconButton, /border-0 border-shadow bg-card/);
  assert.doesNotMatch(
    actionIconButton,
    /border border-border\/60 bg-card shadow-none/,
  );
});

test("scores and compact badges follow the table density", () => {
  assert.match(
    page,
    /className="text-sm font-medium tabular-nums text-foreground"/,
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

test("draft deletion dialog uses a plain summary and solid destructive action", () => {
  const deleteDialog = page.slice(
    page.indexOf("open={!!riskToDeleteDraft}"),
    page.indexOf("</Dialog>", page.indexOf("open={!!riskToDeleteDraft}")),
  );

  assert.doesNotMatch(deleteDialog, /rounded-lg|bg-muted|ring-1 ring-inset/);
  assert.match(deleteDialog, /<DestructiveButton[\s\S]*>\s*Hapus\s*<\/DestructiveButton>/);
  assert.doesNotMatch(deleteDialog, /Trash2|icon=/);
});

test("destructive actions use the approved red token", () => {
  assert.match(globals, /--destructive:\s*#e33f47;/);
});

test("removed draft and history experiences leave no legacy tab UI", () => {
  assert.doesNotMatch(page, /<TabsTrigger value="my-drafts"/);
  assert.doesNotMatch(page, /<TabsTrigger value="history"/);
});

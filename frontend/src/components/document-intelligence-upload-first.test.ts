import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const uploadPanel = readSource(
  "./intelligence/document-processing/upload-panel.tsx",
);
const uploadUtils = readSource(
  "./intelligence/document-processing/upload-utils.ts",
);
const workspace = readSource(
  "./intelligence/document-processing/document-processing-workspace.tsx",
);
const documentApi = readSource("../lib/api/document-intelligence.ts");
const apiAdapter = readSource("../lib/document-processing/api-adapter.ts");
const processingActivity = readSource(
  "./intelligence/document-processing/processing-activity.tsx",
);
const spatialIndex = readSource(
  "./intelligence/document-processing/spatial-index.tsx",
);
const historyPanel = readSource(
  "./intelligence/document-processing/history-panel.tsx",
);
const completedResults = readSource(
  "./intelligence/document-processing/completed-results.tsx",
);
const riskDraftDialog = readSource(
  "./intelligence/document-processing/risk-draft-dialog.tsx",
);
const importSopPage = readSource("../app/(app)/risk/register/import-sop/page.tsx");
const designSystemPage = readSource("../app/(app)/design-system/page.tsx");
const designSystemDocument = readSource("../../../DESIGN.md");
const globalStyles = readSource("../app/globals.css");

test("uses a centered upload-first setup with a restrained document mark", () => {
  assert.match(workspace, /max-w-3xl/);
  assert.match(uploadPanel, /border-dashed/);
  assert.match(uploadPanel, /Tarik dan lepas dokumen/);
  assert.match(uploadPanel, /Maksimal \{formatFileSize\(MAX_FILE_SIZE\)\}/);
  assert.doesNotMatch(uploadPanel, /<ArrowUp/);
  assert.doesNotMatch(uploadPanel, /bg-blue-600 text-white/);
});

test("turns the selected document into a single reference-led file row", () => {
  assert.match(uploadPanel, /Dokumen siap dianalisis/);
  assert.match(uploadPanel, /aria-label=\{`Hapus \$\{document\.name\}`\}/);
  assert.match(uploadPanel, /Mulai analisis/);
  assert.match(uploadPanel, /border-shadow/);
  assert.doesNotMatch(uploadPanel, /FileReadinessRail|role="progressbar"/);
  assert.doesNotMatch(uploadPanel, /sm:grid-cols-2 2xl:grid-cols-3/);
});

test("uses the contextual route mode without a mode selector", () => {
  assert.match(workspace, /analysisMode: DocumentAnalysisMode/);
  assert.match(workspace, /mode: analysisMode/);
  assert.doesNotMatch(workspace, /<fieldset/);
  assert.doesNotMatch(workspace, /<RadioGroup/);
  assert.match(workspace, /<div className="pt-2">\s*<UploadPanel/);
  assert.doesNotMatch(workspace, /Tahapan proses, kontrol, dan risiko per tahap\./);
  assert.doesNotMatch(workspace, /<Label htmlFor="period"/);
  assert.doesNotMatch(workspace, /<Select/);
  assert.doesNotMatch(workspace, /<CollapsibleCard\.Root/);
  assert.doesNotMatch(workspace, /Riwayat pemrosesan|<HistoryPanel/);
});

test("keeps the contextual workspace free of mode cards", () => {
  assert.doesNotMatch(workspace, /ModeIcon|option\.icon|<ModeIcon/);
  assert.doesNotMatch(workspace, /RadioGroupItem|analysis-mode-label/);
});

test("keeps the setup heading at 16px and the drop-zone heading compact", () => {
  assert.match(workspace, /<div className="mb-8 max-w-2xl space-y-2 sm:mb-10">/);
  assert.doesNotMatch(workspace, /<p className="mt-2 text-sm leading-6 text-secondary-foreground">/);
  assert.match(workspace, /<h2 className="text-base font-medium tracking-\[-0\.015em\] text-foreground">/);
  assert.match(uploadPanel, /<h2 className="text-sm font-medium tracking-\[-0\.015em\] text-foreground">/);
  assert.doesNotMatch(workspace, /text-lg|text-xl/);
  assert.doesNotMatch(uploadPanel, /text-lg|text-xl/);
});

test("supports both destination-specific analysis modes", () => {
  assert.match(workspace, /analysisMode/);
  assert.doesNotMatch(workspace, /shadow-\[0_8px_24px/);
  assert.doesNotMatch(workspace, /Audit Finding|Struktur Kinerja|Mitigation Report Draft/);
});

test("sends supported documents directly to the backend analysis API", () => {
  assert.match(uploadUtils, /"pdf",\s*"xlsx"/);
  assert.doesNotMatch(uploadUtils, /"png"|"jpg"|"docx"|"csv"/);
  assert.match(uploadPanel, /PDF atau XLSX/);
  assert.match(workspace, /authToken/);
  assert.match(workspace, /createDocumentProcessingApiAdapter/);
  assert.doesNotMatch(workspace, /mock-adapter|onRunLegacyAnalysis|loadProcessingJobs/);
  assert.match(documentApi, /\/ai\/document-intelligence\/analyze/);
  assert.match(documentApi, /options\?: Pick<RequestInit, "signal">/);
  assert.match(apiAdapter, /analyzeDocumentIntelligence/);
  assert.match(apiAdapter, /new AbortController\(\)/);
  assert.match(apiAdapter, /mapResponseToFindings/);
});

test("retains the current valid selection when a later file is rejected", () => {
  assert.match(workspace, /validateFiles\(files, documents\)/);
  assert.match(
    workspace,
    /setDocuments\(\(previous\) => \[\.\.\.previous, \.\.\.result\.documents\]\)/,
  );
  assert.match(
    workspace,
    /setIssues\(\(previous\) => \[\.\.\.previous, \.\.\.result\.issues\]\)/,
  );
});

test("keeps one upload layout for setup, processing, and findings", () => {
  assert.match(workspace, /<UploadPanel/);
  assert.match(workspace, /<ProcessingStatus/);
  assert.match(workspace, /<FindingsReviewPanel/);
  assert.doesNotMatch(workspace, /<JobHeader|<SpatialIndex|<TaskLanes|<ActivityTimeline|<HistoryPanel|<Inspector|<Sheet/);
});

test("returns terminal results to upload with findings below", () => {
  assert.match(workspace, /const terminalState = Boolean\(currentJob && isTerminal\(currentJob\.status\)\)/);
  assert.match(workspace, /terminalState && currentJob \?/);
  assert.match(workspace, /currentJob && !terminalState \?/);
  assert.doesNotMatch(workspace, /<CompletedResults/);
});

test("scrolls to findings after a terminal transition", () => {
  assert.match(workspace, /previousJobStatusRef/);
  assert.match(workspace, /<div ref=\{findingsRef\}>/);
  assert.match(workspace, /scrollIntoView/);
  assert.match(workspace, /behavior: "auto"/);
  assert.doesNotMatch(workspace, /behavior: reduceMotion \? "auto" : "smooth"/);
});

test("keeps upload and processing accessible for keyboard and reduced motion", () => {
  assert.match(uploadPanel, /tabIndex=\{-1\}/);
  assert.match(uploadPanel, /useReducedMotion/);
  assert.match(processingActivity, /role="progressbar"/);
  assert.match(processingActivity, /aria-live="polite"/);
  assert.match(processingActivity, /reduceMotion \? "auto" : "smooth"/);
  assert.match(spatialIndex, /layout=\{!reduceMotion\}/);
});

test("uses a single headerless workspace layout", () => {
  assert.doesNotMatch(workspace, /CollectionPageHeader/);
  assert.doesNotMatch(workspace, /showTitle/);
});

test("uses Indonesian workflow labels and discoverable history actions", () => {
  assert.match(workspace, /Batalkan proses/);
  assert.match(workspace, /Analisis sedang diproses/);
  assert.match(completedResults, /Temuan untuk ditinjau/);
  assert.match(completedResults, /<span className="text-muted-foreground">Sumber<\/span>/);
  assert.match(completedResults, /<span className="inline-flex items-center gap-1\.5 font-medium text-foreground/);
  assert.match(completedResults, />\s*Lihat\s*\n\s*<ChevronDown/);
  assert.match(completedResults, /variant="outline" size="sm" className="gap-2 border-0 border-shadow"/);
  assert.match(completedResults, /border-t border-dashed/);
  assert.match(completedResults, /border-t border-border\/70 bg-table-header/);
  assert.match(completedResults, /grid-rows-\[0fr\]/);
  assert.match(completedResults, /grid-rows-\[1fr\]/);
  assert.match(completedResults, /transition-\[grid-template-rows\] duration-200 ease-\(--ease-out\)/);
  assert.match(completedResults, /transition-opacity duration-150 ease-\(--ease-out\)/);
  assert.match(completedResults, /<div className="mt-3 space-y-1 text-xs text-muted-foreground">/);
  assert.doesNotMatch(completedResults, /\by:|\bscale:/);
  assert.match(completedResults, /<button[\s\S]*aria-expanded=\{open\}/);
  assert.doesNotMatch(completedResults, /<details|<summary/);
  assert.match(completedResults, /<motion\.section/);
  assert.match(completedResults, /useReducedMotion/);
});

test("uses compositor-safe motion and gentle reduced-motion fallbacks", () => {
  assert.match(workspace, /transform: `scaleX\(\$\{job\.progress \/ 100\}\)`/);
  assert.match(workspace, /transition-transform duration-200 ease-\(--ease-out\)/);
  assert.doesNotMatch(workspace, /transition-\[width\]/);
  assert.match(completedResults, /reduceMotion \? \{ opacity: 0 \}/);
  assert.match(completedResults, /transform: "translateY\(10px\) scale\(0\.98\)"/);
  assert.match(completedResults, /aria-hidden=\{!open\}/);
  assert.match(uploadPanel, /duration: reduceMotion \? 0\.12 : 0\.18/);
  assert.doesNotMatch(uploadPanel, /layout=|type: "spring"|\by:/);
});

test("bridges transient document intelligence states without decorative motion", () => {
  assert.match(workspace, /document-processing-status-enter/);
  assert.match(globalStyles, /@starting-style[\s\S]*\.document-processing-status-enter[\s\S]*translateY\(8px\)/);
  assert.match(globalStyles, /prefers-reduced-motion: reduce[\s\S]*\.document-processing-status-enter[\s\S]*opacity 120ms/);
  assert.match(workspace, /transition=\{\{ duration: reduceMotion \? 0\.12 : 0\.15/);
  assert.match(uploadPanel, /aria-label=\{processing \? "Menyiapkan analisis" : "Mulai analisis"\}/);
  assert.match(uploadPanel, /col-start-1 row-start-1 transition-opacity duration-\[120ms\] ease-\(--ease-out\)/);
  assert.match(uploadPanel, /function IssueList[\s\S]*<AnimatePresence initial=\{false\}>/);
  assert.doesNotMatch(workspace, /staggerChildren|delayChildren/);
});

test("keeps confidence metadata and left-aligns finding summaries", () => {
  assert.match(completedResults, /<p className="mt-2 text-left text-xs leading-5 text-muted-foreground">\{finding\.summary\}<\/p>/);
  assert.match(completedResults, /<span className="tabular-nums">Keyakinan/);
  assert.doesNotMatch(completedResults, /<span>\{finding\.source\.documentName\}<\/span>/);
  assert.doesNotMatch(completedResults, /<span className="font-medium text-foreground">Sumber:<\/span>/);
  assert.doesNotMatch(completedResults, /border-l-2 border-border pl-3 italic/);
});

test("uses the design-system badge primitive for finding severity", () => {
  assert.match(completedResults, /import \{ Badge \} from "@\/components\/shared\/design-system"/);
  assert.match(completedResults, /<Badge tone=\{meta\.tone\} size="micro">/);
  assert.doesNotMatch(completedResults, /<Badge variant="outline" tone=\{meta\.tone\}/);
});

test("keeps findings flat without a priority grouping or outer card wrapper", () => {
  assert.match(completedResults, /job\.findings\.map/);
  assert.doesNotMatch(completedResults, /findingGroups|Prioritas tinggi|Prioritas sedang|Prioritas rendah|Ringkasan tingkat/);
  assert.match(completedResults, /className="space-y-4"/);
  assert.match(completedResults, /rounded-lg border border-border\/80 bg-card p-4/);
  assert.doesNotMatch(completedResults, /rounded-lg border border-border\/80 bg-background p-4/);
  assert.doesNotMatch(completedResults, /className="rounded-lg border border-border\/80 bg-card p-4 sm:p-5"/);
  assert.doesNotMatch(completedResults, /rounded-md border border-border bg-card/);
});

test("uses an outlined action for risk drafts", () => {
  assert.match(completedResults, /Buat draf risiko/);
  assert.match(completedResults, /variant="outline"/);
  assert.doesNotMatch(completedResults, /variant="ghost"/);
});

test("keeps mitigation reporting in the findings flow", () => {
  assert.match(completedResults, /onUseMitigationReport/);
  assert.match(completedResults, /Gunakan untuk laporan/);
  assert.match(completedResults, /Sudah dilaporkan/);
});

test("opens a focused risk draft modal with the minimum save fields", () => {
  assert.match(importSopPage, /<RiskDraftDialog/);
  assert.doesNotMatch(importSopPage, /useRouter|router\.push/);
  assert.match(riskDraftDialog, /Buat draf risiko/);
  assert.match(riskDraftDialog, /document-risk-draft-title/);
  assert.match(riskDraftDialog, /document-risk-draft-description/);
  assert.match(riskDraftDialog, /document-risk-draft-category/);
  assert.match(riskDraftDialog, /buildRiskRegisterPayload/);
  assert.match(riskDraftDialog, /await api\.post\("\/risks"/);
  assert.match(riskDraftDialog, /status:.*draft|,\s*"draft"/s);
});

test("keeps operational metadata at twelve pixels or larger", () => {
  for (const source of [uploadPanel, processingActivity, spatialIndex, historyPanel, completedResults]) {
    assert.doesNotMatch(source, /text-\[(?:8|9|10|11)px\]/);
  }
});

test("documents the upload-first pattern in both design-system sources", () => {
  assert.match(designSystemPage, /upload-first/);
  assert.match(designSystemDocument, /upload-first/);
  assert.match(designSystemDocument, /destination-specific/);
  assert.match(designSystemDocument, /global `AppHeader`/);
  assert.match(designSystemDocument, /programmatically activated file input stays outside[\s\S]*tab order/);
  assert.match(designSystemDocument, /suppress the duplicate global `AppHeader` and local `CollectionPageHeader`/);
  assert.match(designSystemDocument, /one centered upload-first layout for setup, active processing, and completed findings/);
  assert.match(designSystemDocument, /When analysis reaches a terminal state, keep the same upload-first layout/);
  assert.match(designSystemDocument, /show only the `Temuan untuk ditinjau` panel below it/);
  assert.match(designSystemDocument, /move the viewport directly to the findings panel/);
  assert.match(designSystemDocument, /200ms `Accordion \/ Collapse` continuity transition/);
  assert.match(designSystemDocument, /150ms opacity `Fade in \/ Fade out`/);
  assert.match(designSystemPage, /indikatornya memakai transform scaleX/);
});

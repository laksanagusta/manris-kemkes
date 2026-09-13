import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const uploadPanel = readSource(
  "./intelligence/document-processing/upload-panel.tsx",
);
const workspace = readSource(
  "./intelligence/document-processing/document-processing-workspace.tsx",
);
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
const designSystemPage = readSource("../app/(app)/design-system/page.tsx");
const designSystemDocument = readSource("../../../DESIGN.md");

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

test("keeps analysis controls visible above upload without setup accordions", () => {
  assert.match(workspace, /<fieldset className="space-y-3" aria-labelledby="analysis-mode-label">/);
  assert.match(workspace, /<RadioGroup/);
  assert.match(workspace, /<UploadPanel/);
  assert.ok(workspace.indexOf('id="analysis-mode-label"') < workspace.indexOf("<UploadPanel"));
  assert.doesNotMatch(workspace, /Tahapan proses, kontrol, dan risiko per tahap\./);
  assert.doesNotMatch(workspace, /<Label htmlFor="period"/);
  assert.doesNotMatch(workspace, /<Select/);
  assert.doesNotMatch(workspace, /<CollapsibleCard\.Root/);
  assert.doesNotMatch(workspace, /Riwayat pemrosesan/);
  assert.match(workspace, /<HistoryPanel/);
});

test("limits analysis modes to SOP and mitigation reports", () => {
  assert.match(workspace, /title: "SOP"/);
  assert.match(workspace, /title: "Laporan Mitigasi"/);
  assert.match(workspace, /Temukan risiko, kontrol, dan langkah proses dari SOP/);
  assert.match(workspace, /Petakan realisasi mitigasi, bukti, dan status tindak lanjut/);
  assert.doesNotMatch(workspace, /shadow-\[0_8px_24px/);
  assert.doesNotMatch(workspace, /Audit Finding|Struktur Kinerja|Mitigation Report Draft/);
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

test("preserves processing, result, and inspector capabilities", () => {
  for (const component of [
    "JobHeader",
    "SpatialIndex",
    "TaskLanes",
    "ActivityTimeline",
    "CompletedResults",
    "Inspector",
  ]) {
    assert.match(workspace, new RegExp(`<${component}`));
  }
});

test("keeps upload and processing accessible for keyboard and reduced motion", () => {
  assert.match(uploadPanel, /tabIndex=\{-1\}/);
  assert.match(uploadPanel, /useReducedMotion/);
  assert.match(processingActivity, /role="progressbar"/);
  assert.match(processingActivity, /aria-live="polite"/);
  assert.match(processingActivity, /reduceMotion \? "auto" : "smooth"/);
  assert.match(spatialIndex, /layout=\{!reduceMotion\}/);
});

test("uses a local workspace header and a responsive inspector sheet", () => {
  assert.match(workspace, /showTitle/);
  assert.match(workspace, /className="space-y-12"/);
  assert.match(workspace, /<Sheet open=\{inspectorOpen\}/);
  assert.match(workspace, /<SheetTitle className="sr-only">Pemeriksa dokumen/);
});

test("uses Indonesian workflow labels and discoverable history actions", () => {
  assert.match(workspace, /Batalkan proses/);
  assert.match(processingActivity, /Pemrosesan paralel/);
  assert.match(completedResults, /Temuan untuk ditinjau/);
  assert.match(historyPanel, /Tindakan untuk \$\{job\.name\}/);
  assert.doesNotMatch(historyPanel, /opacity-0/);
});

test("keeps operational metadata at twelve pixels or larger", () => {
  for (const source of [uploadPanel, processingActivity, spatialIndex, historyPanel, completedResults]) {
    assert.doesNotMatch(source, /text-\[(?:8|9|10|11)px\]/);
  }
});

test("documents the upload-first pattern in both design-system sources", () => {
  assert.match(designSystemPage, /upload-first/);
  assert.match(designSystemDocument, /upload-first/);
  assert.match(designSystemDocument, /Mode analisis/);
  assert.match(designSystemDocument, /global `AppHeader`/);
  assert.match(designSystemDocument, /modal Sheet/);
  assert.match(designSystemDocument, /input file.*urutan Tab/);
});

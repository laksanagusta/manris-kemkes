import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const source = readSource("./page.tsx");
const designSystemBarrel = readSource(
  "../../../../../components/shared/design-system/index.ts",
);
const designSystemPage = readSource("../../../design-system/page.tsx");
const designSystemDocument = readSource("../../../../../../../DESIGN.md");

test("risk charter uses the canonical desktop document editor", () => {
  assert.match(source, /<FormPage className="space-y-0">/);
  assert.match(source, /<DocumentFormSection/);
  assert.match(source, /<DocumentListSection/);
  assert.equal((source.match(/<DocumentListSection/g) ?? []).length, 3);
  assert.match(source, /openLegalEditor/);
  assert.match(source, /openStakeholderEditor/);
  assert.match(source, /openUPREditor/);
  assert.match(source, /open=\{Boolean\(listEditor\)\}/);
  assert.doesNotMatch(source, /<DirtyActionBar/);
  assert.match(source, /<div className="px-6 pb-6 lg:px-8">\s*<FormHeader/);
  assert.match(source, /backActionPlacement="local"/);
  assert.match(source, /showTitle/);
  assert.doesNotMatch(source, /Versi \{charter\.versionNumber\}/);
  assert.match(source, /title="Detail Piagam"[\s\S]*subtitle="Tinjau mandat dan ruang lingkup piagam manajemen risiko\."/);
  assert.match(source, /disabled={!isDirty}/);
  assert.match(source, /actionsPlacement="header"/);
  assert.match(source, /variant="secondary"/);
  assert.match(source, /variant="primary"\s+size="primary"[\s\S]*icon=\{<Check/);
  assert.match(source, /label="Tindakan Piagam"/);
  assert.match(source, /showDivider=\{false\}/);
  assert.match(source, /stacked/);
  assert.match(source, /<div className="space-y-3 pb-8 lg:pb-10">/);
  assert.equal((source.match(/className="gap-1 py-0 lg:py-0"/g) ?? []).length, 0);
  assert.equal(
    (source.match(/className="!mt-6 gap-3 py-0 lg:py-0"/g) ?? []).length,
    3,
  );
  assert.equal((source.match(/mx-6(?: !mt-6)? lg:mx-8/g) ?? []).length, 3);
  assert.equal((source.match(/className="mx-6 !mt-6 lg:mx-8"/g) ?? []).length, 3);
  assert.equal((source.match(/titleId="charter-/g) ?? []).length, 3);
  assert.equal((source.match(/aria-labelledby="charter-/g) ?? []).length, 3);
  assert.doesNotMatch(source, /className="sr-only"/);
  assert.match(source, /<Label htmlFor="charter-title">[\s\S]*Judul Piagam/);
  assert.match(source, /<div className="flex flex-col gap-3">/);
  assert.doesNotMatch(source, /upr-name-modal|upr-position-modal/);
  assert.match(source, /nama dan jabatan terisi otomatis/);
  assert.match(source, /rows=\{1\}/);
  assert.match(source, /resize-none[\s\S]*rounded-none border-0 bg-transparent/);
  assert.doesNotMatch(source, /<DocumentForm>/);
  assert.doesNotMatch(source, /<dl/);
  for (const subtitle of [
    "Jelaskan proses, unit, area kerja",
    "Catat referensi regulasi",
    "Ringkas struktur, kapasitas",
    "Ringkas faktor regulasi",
    "Identifikasi pihak di luar organisasi",
    "Tetapkan tepat satu ketua",
  ]) {
    assert.doesNotMatch(source, new RegExp(subtitle));
  }
  assert.doesNotMatch(source, /xl:grid-cols-/);
  assert.doesNotMatch(source, /const isCreateMode/);

  const orderedSections = [
    "Ruang Lingkup",
    "Dasar Hukum",
    "Konteks Internal",
    "Konteks Eksternal",
    "Stakeholder Eksternal",
    "Struktur UPR",
  ];
  let previousIndex = -1;
  for (const title of orderedSections) {
    const nextIndex = source.indexOf(`title="${title}"`);
    assert.ok(nextIndex > previousIndex, `${title} must follow the approved order`);
    previousIndex = nextIndex;
  }
});

test("draft persistence and finalization are explicit and separate", () => {
  assert.match(source, /updateRiskCharter/);
  assert.match(source, /finalizeRiskCharter/);
  assert.match(source, /Simpan draf/);
  assert.match(source, /Simpan perubahan sebelum finalisasi/);
  assert.match(source, /window\.addEventListener\("beforeunload"/);
  assert.match(source, /event\.metaKey \|\| event\.ctrlKey/);
  assert.doesNotMatch(source, /autosave/i);
});

test("versioning and lifecycle actions remain available from detail", () => {
  for (const symbol of [
    "createRiskCharterRevision",
    "listRiskCharterVersions",
    "archiveRiskCharter",
    "restoreRiskCharter",
    "deleteRiskCharterDraft",
    "VersionTimeline",
  ]) {
    assert.match(source, new RegExp(symbol));
  }
  assert.match(source, /Minimal 10 karakter/);
  assert.match(source, /Hapus draf secara permanen/);
});

test("all charter dialogs follow the mitigation-report modal shell", () => {
  assert.match(source, /<DialogContent className="max-w-2xl no-scrollbar" showCloseButton=\{false\}>/);
  assert.match(source, /<AlertDialogContent className="max-w-2xl no-scrollbar">/);
  assert.match(source, /<SheetContent className="sm:max-w-md" showCloseButton=\{false\}>/);
  assert.match(source, /<CollectionDialogCancel/);
  assert.match(source, /smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300\/30/);
  assert.match(source, /size="primary"/);
});

test("risk charter form primitives are synchronized with the design system", () => {
  for (const component of [
    "DocumentForm",
    "DocumentFormSection",
    "DocumentListSection",
    "AlertDialog",
    "Sheet",
    "Select",
  ]) {
    assert.match(designSystemBarrel, new RegExp(component));
  }
  assert.match(designSystemPage, /Form Piagam Manris/);
  assert.match(designSystemPage, /satu kolom/);
  assert.match(designSystemDocument, /\*\*Piagam Manris form:\*\*/);
  assert.match(designSystemDocument, /single-column/);
});

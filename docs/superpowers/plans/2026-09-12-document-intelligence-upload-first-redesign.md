# Document Intelligence Upload-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remake the Document Intelligence setup experience as a minimal, reference-led upload-first canvas while preserving every existing processing, history, result, export, recovery, and inspector capability.

**Architecture:** Keep `DocumentIntelligencePage` as the API and navigation boundary, and keep `DocumentProcessingWorkspace` as the job-state owner. Concentrate the visual remake in `UploadPanel`, then compose the existing analysis controls and history inside shared `CollapsibleCard` disclosures so the setup state is calm without changing the processing adapter or domain types.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Motion, Base UI/Radix-derived shared primitives, Node test runner, ESLint.

---

## File Map

- Create `frontend/src/components/document-intelligence-upload-first.test.ts`: source-level regression tests for the upload-first layout, progressive disclosure, preserved workspace capabilities, and design-system synchronization.
- Modify `frontend/src/components/intelligence/document-processing/upload-panel.tsx`: new reference-led empty and selected-file states; preserve upload validation and callbacks.
- Modify `frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx`: center the setup canvas, move analysis controls and history into progressive disclosures, and leave processing/results behavior intact.
- Modify `frontend/src/app/(app)/design-system/page.tsx`: update the production pattern description for the upload-first setup.
- Modify `DESIGN.md`: replace the existing Document Intelligence setup rule with the approved upload-first contract.

### Task 1: Lock the Visual and Behavioral Contract with a Failing Test

**Files:**
- Create: `frontend/src/components/document-intelligence-upload-first.test.ts`
- Read: `frontend/src/components/intelligence/document-processing/upload-panel.tsx`
- Read: `frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx`

- [ ] **Step 1: Write the source-level contract test**

```ts
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
const designSystemPage = readSource("../app/(app)/design-system/page.tsx");
const designSystemDocument = readSource("../../../DESIGN.md");

test("uses a centered upload-first setup with a functional blue upload accent", () => {
  assert.match(workspace, /max-w-3xl/);
  assert.match(uploadPanel, /border-dashed/);
  assert.match(uploadPanel, /bg-blue-600/);
  assert.match(uploadPanel, /Tarik dan lepas dokumen/);
  assert.match(uploadPanel, /Maksimal \{formatFileSize\(MAX_FILE_SIZE\)\}/);
});

test("turns the selected document into a single reference-led file row", () => {
  assert.match(uploadPanel, /Dokumen siap dianalisis/);
  assert.match(uploadPanel, /aria-label=\{`Hapus \$\{document\.name\}`\}/);
  assert.match(uploadPanel, /<FileReadinessRail/);
  assert.match(uploadPanel, /Mulai analisis/);
  assert.doesNotMatch(uploadPanel, /sm:grid-cols-2 2xl:grid-cols-3/);
});

test("keeps settings and history available through progressive disclosure", () => {
  assert.match(workspace, /<CollapsibleCard\.Root/);
  assert.match(workspace, /Pengaturan analisis/);
  assert.match(workspace, /Riwayat pemrosesan/);
  assert.match(workspace, /<HistoryPanel/);
});

test("retains the current valid selection when a later file is rejected", () => {
  assert.match(workspace, /validateFiles\(files, documents\)/);
  assert.match(
    workspace,
    /setDocuments\(\(previous\) => \[\.\.\.previous, \.\.\.result\.documents\]\)/,
  );
  assert.match(workspace, /setIssues\(\(previous\) => \[\.\.\.previous, \.\.\.result\.issues\]\)/);
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

test("documents the upload-first pattern in both design-system sources", () => {
  assert.match(designSystemPage, /upload-first/);
  assert.match(designSystemDocument, /upload-first/);
  assert.match(designSystemDocument, /Pengaturan analisis/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the intended missing UI**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/document-intelligence-upload-first.test.ts
```

Expected: FAIL on the new `max-w-3xl`, blue upload accent, Indonesian copy, `FileReadinessRail`, disclosure labels, and upload-first documentation assertions.

- [ ] **Step 3: Commit the failing contract test**

```bash
git add frontend/src/components/document-intelligence-upload-first.test.ts
git commit -m "test: define document intelligence upload-first contract"
```

### Task 2: Remake the Empty and Selected Upload States

**Files:**
- Modify: `frontend/src/components/intelligence/document-processing/upload-panel.tsx`
- Test: `frontend/src/components/document-intelligence-upload-first.test.ts`

- [ ] **Step 1: Replace the oversized icon tile with the reference-led document/upload mark**

Add `ArrowUp` to the existing icon import and introduce a focused visual helper:

```tsx
function UploadDocumentMark() {
  return (
    <div className="relative mb-7 h-16 w-20" aria-hidden="true">
      <div className="absolute left-3 top-0 flex h-14 w-11 items-center justify-center rounded-md border border-border bg-card shadow-sm">
        <FileText className="size-5 text-muted-foreground/55" strokeWidth={1.6} />
      </div>
      <span className="absolute bottom-0 right-2 flex size-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_6px_16px_rgba(37,99,235,0.24)]">
        <ArrowUp className="size-5" strokeWidth={2} />
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Recompose `DropZone` as the restrained upload-first surface**

Keep its hidden input and all pointer, keyboard, and drag handlers. Replace only the visible content and class composition with:

```tsx
className={cn(
  "group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center outline-none transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-ring/40 sm:min-h-[340px] sm:px-10 motion-reduce:transition-none",
  dragActive
    ? "scale-[1.008] border-blue-500/60 bg-blue-50/45 shadow-[0_12px_30px_rgba(37,99,235,0.08)]"
    : "border-border bg-card hover:border-foreground/25 hover:bg-state-surface",
)}
```

Use this visible hierarchy after the hidden input:

```tsx
<UploadDocumentMark />
<h2 className="text-lg font-medium tracking-[-0.015em] text-foreground sm:text-xl">
  Tarik dan lepas dokumen
</h2>
<p className="mt-2 text-sm leading-6 text-secondary-foreground">
  atau klik area ini untuk memilih file dari perangkat
</p>
<p className="mt-6 text-xs leading-5 text-muted-foreground">
  PDF, JPG, PNG, DOCX, XLSX, atau CSV
  <br />
  Maksimal {formatFileSize(MAX_FILE_SIZE)}
</p>
```

Remove the separate “Pilih file” button and format badges because the full drop zone already owns the action and the metadata copy communicates supported formats more quietly.

- [ ] **Step 3: Add a truthful readiness rail for the selected-file state**

```tsx
function FileReadinessRail({ invalid }: { invalid: boolean }) {
  return (
    <div
      className="mt-4 h-1 overflow-hidden rounded-full bg-muted"
      aria-label={invalid ? "Dokumen perlu diperbaiki" : "Dokumen siap dianalisis"}
    >
      <div
        className={cn(
          "h-full rounded-full",
          invalid ? "w-1/3 bg-destructive" : "w-full bg-blue-600",
        )}
      />
    </div>
  );
}
```

This rail represents validation readiness, not fabricated network upload progress.

- [ ] **Step 4: Replace the selected-file card grid with one file row**

Render each current document as a vertically stacked `motion.article` so the implementation remains safe if the maximum changes later, while visually presenting the current one-document contract:

```tsx
<div className="space-y-3">
  <AnimatePresence initial={false} mode="popLayout">
    {documents.map((document) => (
      <motion.article
        key={document.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        className={cn(
          "rounded-xl border bg-card p-4 shadow-[var(--shadow-custom)] sm:p-5",
          document.error ? "border-destructive/35" : "border-border",
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <DocumentThumbnail document={document} compact />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" title={document.name}>
              {document.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {document.extension.toUpperCase()} · {formatFileSize(document.size)}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Hapus ${document.name}`}
            title={`Hapus ${document.name}`}
            onClick={() => onRemove(document.id)}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-[background-color,color,border-color] hover:border-foreground/20 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96]"
          >
            <X className="size-4" />
          </button>
        </div>
        <FileReadinessRail invalid={Boolean(document.error)} />
      </motion.article>
    ))}
  </AnimatePresence>
</div>
```

- [ ] **Step 5: Simplify the selected-file footer without changing callback behavior**

Use the heading “Dokumen siap dianalisis”, keep `IssueList`, and change the primary button label to:

```tsx
{processing ? "Menyiapkan..." : "Mulai analisis"}
```

Keep `disabled={!validDocuments.length || processing}` and `onClick={onStart}` unchanged.

- [ ] **Step 6: Run the focused test**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/document-intelligence-upload-first.test.ts
```

Expected: upload-panel assertions PASS; workspace and documentation assertions still FAIL.

- [ ] **Step 7: Commit the upload-state remake**

```bash
git add frontend/src/components/intelligence/document-processing/upload-panel.tsx frontend/src/components/document-intelligence-upload-first.test.ts
git commit -m "feat: remake document upload states"
```

### Task 3: Convert Setup and History to Progressive Disclosure

**Files:**
- Modify: `frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx`
- Test: `frontend/src/components/document-intelligence-upload-first.test.ts`

- [ ] **Step 1: Replace the form-section dependency with the shared collapsible primitive**

Change imports to include:

```tsx
import {
  CollectionPageHeader,
  CollapsibleCard,
  PageStack,
} from "@/components/shared/design-system";
```

Remove the now-unused `FormSection` import.

- [ ] **Step 2: Recompose the no-job state into a centered setup column**

Replace the current fragment containing `FormSection`, introduction copy, and `UploadPanel` with:

```tsx
<div className="mx-auto w-full max-w-3xl space-y-4 py-2 sm:py-5">
  <div className="mb-8 max-w-2xl sm:mb-10">
    <h2 className="text-lg font-medium tracking-[-0.015em] text-foreground">
      Analisis dokumen menjadi temuan risiko
    </h2>
    <p className="mt-2 text-sm leading-6 text-secondary-foreground">
      Unggah satu dokumen. Manris akan mengelompokkan halaman dan menghubungkan temuan dengan sumbernya.
    </p>
  </div>

  <UploadPanel
    documents={documents}
    issues={issues}
    dragActive={dragActive}
    onFiles={addFiles}
    onRemove={removeDocument}
    onDragActive={setDragActive}
    onStart={startProcessing}
    processing={false}
  />

  <CollapsibleCard.Root defaultOpen={false}>
    <CollapsibleCard.Trigger>
      <CollapsibleCard.Header>
        <CollapsibleCard.Icon />
        <CollapsibleCard.Text>
          <CollapsibleCard.Title>Pengaturan analisis</CollapsibleCard.Title>
          <CollapsibleCard.Description>
            {selectedMode.title} · {period}
          </CollapsibleCard.Description>
        </CollapsibleCard.Text>
      </CollapsibleCard.Header>
    </CollapsibleCard.Trigger>
    <CollapsibleCard.Content>
      <CollapsibleCard.Body className="grid gap-5 border-t border-border/70 p-4 sm:grid-cols-2 sm:p-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="analysis-mode" className="text-sm font-medium text-foreground">
            Mode analisis
          </Label>
          <Select value={mode} onValueChange={(value) => setMode(value as DocumentAnalysisMode)}>
            <SelectTrigger id="analysis-mode" className="h-10 text-sm">
              <SelectValue placeholder="Pilih mode analisis" />
            </SelectTrigger>
            <SelectContent>
              {modeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">
            {selectedMode.description}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="period" className="text-sm font-medium text-foreground">
            Periode kuartal
          </Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger id="period" className="h-10 text-sm">
              <SelectValue placeholder="Pilih periode kuartal" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">
            Mengikuti siklus penilaian kuartalan Manris.
          </p>
        </div>
      </CollapsibleCard.Body>
    </CollapsibleCard.Content>
  </CollapsibleCard.Root>

  <CollapsibleCard.Root defaultOpen={false}>
    <CollapsibleCard.Trigger>
      <CollapsibleCard.Header>
        <CollapsibleCard.Icon />
        <CollapsibleCard.Text>
          <CollapsibleCard.Title>Riwayat pemrosesan</CollapsibleCard.Title>
          <CollapsibleCard.Description>
            {jobs.length ? `${jobs.length} proses terakhir tersimpan` : "Belum ada proses tersimpan"}
          </CollapsibleCard.Description>
        </CollapsibleCard.Text>
      </CollapsibleCard.Header>
    </CollapsibleCard.Trigger>
    <CollapsibleCard.Content>
      <CollapsibleCard.Body className="border-t border-border/70 p-4 sm:p-5">
        <HistoryPanel
          jobs={jobs}
          activeJobId={activeJobId}
          onNewProcess={startNewProcess}
          onOpen={openJob}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </CollapsibleCard.Body>
    </CollapsibleCard.Content>
  </CollapsibleCard.Root>
</div>
```

- [ ] **Step 3: Keep history visible in the active processing workspace**

The centered disclosures apply only when `!currentJob`. Keep one neutral history section at the end of the active-job main column so users can switch jobs during processing or review:

```tsx
{currentJob ? (
  <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5">
    <HistoryPanel
      jobs={jobs}
      activeJobId={activeJobId}
      onNewProcess={startNewProcess}
      onOpen={openJob}
      onRename={handleRename}
      onDelete={handleDelete}
    />
  </section>
) : null}
```

- [ ] **Step 4: Run the focused contract test**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/document-intelligence-upload-first.test.ts
```

Expected: upload and workspace assertions PASS; documentation assertions still FAIL.

- [ ] **Step 5: Run ESLint on the two implementation files**

Run:

```bash
cd frontend
npx eslint src/components/intelligence/document-processing/upload-panel.tsx src/components/intelligence/document-processing/document-processing-workspace.tsx
```

Expected: exit code 0 with no lint errors.

- [ ] **Step 6: Commit the workspace composition**

```bash
git add frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx frontend/src/components/document-intelligence-upload-first.test.ts
git commit -m "feat: add upload-first document workflow"
```

### Task 4: Synchronize the Design System Sources

**Files:**
- Modify: `frontend/src/app/(app)/design-system/page.tsx`
- Modify: `DESIGN.md`
- Test: `frontend/src/components/document-intelligence-upload-first.test.ts`

- [ ] **Step 1: Update the Document Intelligence section on the design-system page**

Replace the setup-specific sentences in “Document Intelligence Workspace” with this copy while retaining the processing-state guidance that follows:

```tsx
Document Intelligence uses an upload-first setup: a centered, constrained
canvas gives the large dashed drop zone visual priority, with the document
glyph and blue upload indicator acting as the only non-semantic setup accent.
After selection, one compact file row shows the file identity, readiness rail,
validation, removal action, and the primary Mulai analisis action. Pengaturan
analisis and Riwayat pemrosesan remain available in collapsed shared surfaces
below the upload workflow so capability is preserved without form-heavy visual
noise.
```

- [ ] **Step 2: Update the canonical `DESIGN.md` rule**

Within `**Document Intelligence workspace:**`, replace the empty/setup-state clauses with:

```markdown
The new-process state uses an upload-first composition inside a centered `max-w-3xl` column. Give one large neutral `rounded-xl` dashed drop zone visual priority; use a document glyph plus a compact blue upload indicator as the only non-semantic accent, concise Indonesian instructions, keyboard activation, visible focus, and reduced-motion-safe drag feedback. After a valid selection, replace the drop zone with one compact file row containing type thumbnail, filename, extension, size, removal control, validation feedback, and a truthful readiness rail; do not simulate network upload progress. Keep `Pengaturan analisis` and `Riwayat pemrosesan` in collapsed shared surfaces below the upload workflow. Preserve the valid selected file when an invalid additional file is attempted, retain the one-document and 1 MB limits, and make `Mulai analisis` the sole primary setup action.
```

Retain all existing rules describing the active processing layout, spatial index, findings, recovery, results, and adapter persistence.

- [ ] **Step 3: Run the complete contract test**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/document-intelligence-upload-first.test.ts
```

Expected: all six tests PASS.

- [ ] **Step 4: Confirm existing user changes remain outside this feature diff**

Run:

```bash
git diff -- DESIGN.md frontend/src/app/'(app)'/design-system/page.tsx
```

Expected: the diff includes the upload-first additions alongside any pre-existing user edits; no unrelated lines are reverted.

- [ ] **Step 5: Commit the synchronized design-system contract**

```bash
git add DESIGN.md 'frontend/src/app/(app)/design-system/page.tsx' frontend/src/components/document-intelligence-upload-first.test.ts
git commit -m "docs: document upload-first workspace pattern"
```

### Task 5: Verify the Finished Redesign

**Files:**
- Verify: `frontend/src/components/intelligence/document-processing/upload-panel.tsx`
- Verify: `frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx`
- Verify: `frontend/src/components/document-intelligence-upload-first.test.ts`
- Verify: `frontend/src/app/(app)/design-system/page.tsx`
- Verify: `DESIGN.md`

- [ ] **Step 1: Run the complete frontend test suite**

Run:

```bash
cd frontend
npm test
```

Expected: all Node tests PASS.

- [ ] **Step 2: Run frontend lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: exit code 0 with no ESLint errors.

- [ ] **Step 3: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js production build completes successfully with no TypeScript or route-generation errors.

- [ ] **Step 4: Inspect the running page at desktop and narrow widths**

Run:

```bash
cd frontend
npm run dev
```

Open `/intelligence/document` and verify:

- Desktop: the setup content is centered, the upload surface dominates, and settings/history are quiet collapsed rows.
- Narrow viewport: the upload copy wraps cleanly, the selected file row retains its remove action, and no horizontal scrolling appears.
- Keyboard: Tab reaches the drop zone and Enter/Space opens the file picker; disclosure triggers and remove action have visible focus.
- Drag state: the border and surface respond without bounce or excessive scaling.
- Selected file: filename, extension, size, readiness, removal, validation, and “Mulai analisis” are visible.
- Processing/results: spatial index, tasks, timeline, history, findings, exports, new-process action, and inspector remain available.

- [ ] **Step 5: Review the final diff for scope and whitespace errors**

Run:

```bash
git diff --check
git status --short
git diff -- frontend/src/components/intelligence/document-processing/upload-panel.tsx frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx frontend/src/components/document-intelligence-upload-first.test.ts DESIGN.md 'frontend/src/app/(app)/design-system/page.tsx'
```

Expected: no whitespace errors, no accidental generated files, and only approved Document Intelligence plus design-system synchronization changes in the reviewed feature diff.

- [ ] **Step 6: Commit any verification-only corrections**

If verification required corrections, stage only the five feature files and commit:

```bash
git add frontend/src/components/intelligence/document-processing/upload-panel.tsx frontend/src/components/intelligence/document-processing/document-processing-workspace.tsx frontend/src/components/document-intelligence-upload-first.test.ts DESIGN.md 'frontend/src/app/(app)/design-system/page.tsx'
git commit -m "fix: polish document intelligence upload workflow"
```

If verification required no corrections, do not create an empty commit.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../app/(app)/minutes/[id]/page.tsx", import.meta.url),
  "utf8",
);

test("uses the shared briefing detail reading pattern", () => {
  assert.match(source, /<FormPage className="space-y-0">/);
  assert.match(source, /<Card className="gap-0 overflow-hidden p-0">/);
  assert.match(source, /border-t border-dashed border-border\/70/);
  assert.match(source, /divide-y divide-dashed divide-border\/70/);
  assert.match(
    source,
    /<dl className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">/,
  );
  assert.match(source, /<BriefingSection title="Ringkasan">/);
  assert.match(source, /<BriefingSection title="Tindak lanjut">/);
  assert.match(source, /<BriefingSection title="Risiko terkait"/);
  assert.doesNotMatch(source, /<LabeledList/);
  assert.doesNotMatch(source, /<FormSection/);
  assert.doesNotMatch(source, /title="Metadata"/);
});

test("keeps briefing content editorial and low-noise", () => {
  assert.match(source, /<p className="text-sm leading-6 text-muted-foreground">/);
  assert.match(source, /<ul className="space-y-2">\s*\{minutes\.agenda\.map/);
  assert.doesNotMatch(source, /max-w-\[75ch\]/);
  assert.doesNotMatch(source, /<Badge/);
  assert.doesNotMatch(source, /<Circle/);
  assert.match(source, /className="group block w-full rounded-md px-3 py-3/);
  assert.match(source, /className="block font-mono text-xs leading-5 text-muted-foreground"/);
});

test("keeps detail actions behind a compact options menu", () => {
  assert.match(source, /<DropdownMenu>/);
  assert.match(source, /<ActionIconButton\s+aria-label="Tindakan notulen"/);
  assert.match(source, /<DropdownMenuItem onSelect=\{handleExport\}>/);
  assert.doesNotMatch(source, /<ActionButton icon=\{<Download/);
  assert.match(source, /<CollectionDialogCancel/);
  assert.match(source, /<DestructiveButton/);
});

test("uses the reference-style properties hierarchy without decorative metadata icons", () => {
  assert.match(
    source,
    /<h2 className="text-lg font-medium tracking-tight text-foreground">Properti<\/h2>/,
  );
  assert.match(
    source,
    /<dt className="text-xs font-medium uppercase tracking-\[0\.08em\] text-muted-foreground">/,
  );
  assert.match(source, /<dd className="mt-2 min-w-0 text-sm font-medium leading-5 text-foreground">/);
  assert.match(source, /<BriefingProperty label="Judul notulen">/);
  assert.doesNotMatch(source, /<BriefingProperty icon=/);
});

test("keeps detail states recoverable and participant identity accessible", () => {
  assert.match(source, /role="status"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /motion-safe:animate-spin/);
  assert.match(source, /setReloadKey\(\(current\) => current \+ 1\)/);
  assert.match(source, /Coba lagi/);
  assert.match(source, /minutes\.participants\.map/);
  assert.doesNotMatch(source, /title=\{minutes\.participants\.join/);
});

test("keeps destructive confirmation open on failure without a duplicate close action", () => {
  assert.match(source, /<DialogContent showCloseButton=\{false\}>/);
  assert.match(source, /setDeleteError\(actionableMessage\)/);
  assert.match(source, /role="alert"/);
  assert.doesNotMatch(source, /setIsDeleting\(false\);\s*setShowDeleteConfirm\(false\)/);
});

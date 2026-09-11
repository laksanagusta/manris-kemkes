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
  assert.match(source, /<dl className="mt-6 grid gap-x-12 gap-y-4 lg:grid-cols-2">/);
  assert.match(source, /<BriefingSection title="Ringkasan">/);
  assert.match(source, /<BriefingSection title="Tindak lanjut">/);
  assert.match(source, /<BriefingSection title="Risiko terkait"/);
  assert.doesNotMatch(source, /<LabeledList/);
  assert.doesNotMatch(source, /<FormSection/);
  assert.doesNotMatch(source, /title="Metadata"/);
});

test("uses shared actions for the header and destructive confirmation", () => {
  assert.match(source, /<ActionButton icon=\{<Download/);
  assert.match(source, /<CollectionDialogCancel/);
  assert.match(source, /<DestructiveButton/);
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

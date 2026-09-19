import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./monitoring-actions-menu.tsx", import.meta.url),
  "utf8",
);

test("monitoring actions open source details in a Vaul drawer", () => {
  assert.match(source, /aria-label="Tindakan pemantauan"/);
  assert.match(source, />\s*Detail Risiko\s*</);
  assert.match(source, />\s*Hapus draf\s*</);
  assert.match(source, /<Drawer open=\{isRiskDrawerOpen\}/);
  assert.match(source, /<DrawerTitle>Detail Risiko<\/DrawerTitle>/);
  assert.match(source, /Properti Sumber/);
  assert.match(source, />Kode<\/dt>/);
  assert.match(source, />Kategori<\/dt>/);
  assert.match(source, />Versi<\/dt>/);
  assert.match(source, /Probabilitas/);
  assert.match(source, />Dampak<\/dt>/);
  assert.match(source, />Skor<\/dt>/);
  assert.match(source, />Status<\/dt>/);
  assert.match(source, /<Badge tone=\{statusTone\} size="compact">/);
});

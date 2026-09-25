import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./monitoring-actions-menu.tsx", import.meta.url),
  "utf8",
);
const detailDrawerSource = readFileSync(
  new URL("../../../../../components/shared/design-system/domain/risk-detail-drawer.tsx", import.meta.url),
  "utf8",
);

test("monitoring actions open source details in a Vaul drawer", () => {
  assert.match(source, /aria-label="Tindakan pemantauan"/);
  assert.match(source, />\s*Detail Risiko\s*</);
  assert.match(source, />\s*Hapus draf\s*</);
  assert.match(source, /<RiskDetailDrawer[\s\S]*open=\{isRiskDrawerOpen\}/);
  assert.match(detailDrawerSource, /<DrawerTitle>Detail Risiko<\/DrawerTitle>/);
  assert.match(detailDrawerSource, /Properti sumber/);
  assert.match(detailDrawerSource, /label="Kode"/);
  assert.match(detailDrawerSource, /label="Kategori"/);
  assert.match(detailDrawerSource, /label="Versi"/);
  assert.match(detailDrawerSource, /Probabilitas/);
  assert.match(detailDrawerSource, /Dampak/);
  assert.match(detailDrawerSource, /Skor inheren/);
  assert.match(detailDrawerSource, /Status sumber/);
  assert.match(detailDrawerSource, /bg-green-50 text-green-700/);
});

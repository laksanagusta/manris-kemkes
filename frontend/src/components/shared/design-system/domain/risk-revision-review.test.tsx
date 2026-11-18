import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RiskCreationContext, RiskFinalizationReview } from "./risk-creation-guidance";

const revision = { version: 2, reason: "Koreksi pengendalian distribusi", previousProbability: 3, previousImpact: 3, probability: 3, impact: 3 };

test("revision context keeps the active profile until finalization", () => {
 const html = renderToStaticMarkup(<RiskCreationContext saveMessage="Tersimpan" revisionVersion={2} />);
 assert.match(html, /draf versi v2/);
 assert.match(html, /Profil aktif tetap berlaku sampai revisi difinalisasi/);
 assert.doesNotMatch(html, /Triwulan|Periode profil/);
});

test("revision confirmation omits the duplicate summary required only for initial profiles", () => {
 for (const probability of [2, 3]) {
  const html = renderToStaticMarkup(<RiskFinalizationReview score={11} target={4} level="Sedang" mitigationCount={2} revision={{...revision, probability}} />);
  assert.equal(html, "");
 }
});

test("initial risk finalization omits the legacy quarterly period", () => {
 const html = renderToStaticMarkup(<RiskFinalizationReview score={11} target={4} level="Sedang" mitigationCount={2} />);
 assert.match(html, /Skor risiko/);
 assert.doesNotMatch(html, /Triwulan|Periode berlaku/);
});

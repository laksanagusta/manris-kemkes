import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RiskCreationContext, RiskFinalizationReview } from "./risk-creation-guidance";
import { canSubmitRiskRevision, getRiskRevisionChanges } from "@/lib/risk-revision-review";

test("revision submission requires a profile change and a valid reason", () => {
 const profile = { title: "Risiko distribusi", probability: 3, impact: 3 };
 const reason = "Koreksi pengendalian distribusi";
 const unchanged = getRiskRevisionChanges(profile, { ...profile, title: " Risiko distribusi " });
 const changed = getRiskRevisionChanges(profile, { ...profile, impact: 4 });
 assert.deepEqual(unchanged, []);
 assert.equal(canSubmitRiskRevision(unchanged, reason), false);
 assert.equal(canSubmitRiskRevision(null, reason), false);
 assert.equal(canSubmitRiskRevision(changed, "  singkat  "), false);
 assert.equal(canSubmitRiskRevision(changed, reason), true);
});

test("revision context keeps the active profile until finalization", () => {
 const html = renderToStaticMarkup(<RiskCreationContext saveMessage="Tersimpan" revisionVersion={2} />);
 assert.match(html, /draf versi v2/);
 assert.match(html, /Profil aktif tetap berlaku sampai revisi difinalisasi/);
 assert.doesNotMatch(html, /Triwulan|Periode profil/);
});

test("revision summary compares the last final assessment and recognizes legacy values", () => {
 const plan = { action: "Rekonsiliasi", owner: "Unit distribusi", treatmentOwnerId: "pic-1" };
 const changes = getRiskRevisionChanges(
  { title: "Risiko distribusi", cause: "Stok rendah\n", probability: 2, impact: 3, currentAssessment: { probability: 4, impact: 3 }, mitigations: [plan] },
  { title: "Risiko distribusi", cause: ["Stok rendah"], probability: 3, impact: 3, mitigations: [{ ...plan, ownerUserId: "pic-1", targetCost: 0, mitigationType: "reduce_probability" }] },
 );
 assert.deepEqual(changes, [{ field: "probability", label: "Probabilitas", before: "4", after: "3" }]);
});

test("revision summary exposes treatment changes even when the score stays the same", () => {
 const plan = { action: "Rekonsiliasi", owner: "Unit distribusi" };
 const changes = getRiskRevisionChanges(
  { probability: 3, impact: 3, mitigations: [plan] },
  { probability: 3, impact: 3, mitigations: [{ ...plan, mitigationType: "reduce_impact" }] },
 );
 assert.deepEqual(changes.map(change => change.field), ["mitigations"]);
 assert.match(changes[0].before, /Turunkan probabilitas/);
 assert.match(changes[0].after, /Turunkan dampak/);
});

test("initial risk finalization omits the legacy quarterly period", () => {
 const html = renderToStaticMarkup(<RiskFinalizationReview score={11} target={4} level="Sedang" mitigationCount={2} />);
 assert.match(html, /Skor risiko/);
 assert.doesNotMatch(html, /Triwulan|Periode berlaku/);
});

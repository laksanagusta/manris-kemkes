## 2026-04-09T00:00:00Z Task: initialization
- Final/primary score = reviewed/effective score.
- Inherent = secondary comparison/history only.
- Finalized heatmap/matrix placement = reviewed probability/impact.
- Preserve target/residual semantics.
- Allow explicit compatibility fallback for approved legacy records missing reviewed fields.

## 2026-04-09T00:00:00Z Task 1 implementation
- Canonical finalized status remains `approved` only; `in_approval` may hold reviewed values but must continue exposing inherent/preliminary values as primary.
- Reviewed final-score activation requires the full reviewed score bundle (`ReviewedProbability`, `ReviewedImpact`, `ReviewedWeight`, `ReviewedNilai`, `ReviewedScore`).

## 2026-04-09T00:00:00Z Task 2 implementation
- Preserve historical/comparison functions as inherent-score based snapshots.
- Keep `in_approval` rows on preliminary semantics unless a query is explicitly approved/finalized, while approved complete bundles switch to reviewed/effective semantics.

## 2026-04-09T00:00:00Z Task 3 implementation
- Keep the Task 3 fix repository-local by extracting a `GetHeatmapVelocity` query builder instead of changing usecase/report consumers.
- Preserve `CompareCycles` as the explicit historical exception path; only velocity semantics align to finalized placement and finalized score deltas.

## 2026-04-09T00:00:00Z Task 4 implementation
- Keep Task 4 production code unchanged unless regression tests expose a real mismatch; current report, PDF, and detailed comparison code already satisfies the reviewed-primary vs inherent-history contract.
- Use structure-level PDF tests inside `pdfreport` as the smallest reliable seam for locking renderer semantics without introducing new PDF parsing dependencies.

## 2026-04-09T00:00:00Z Task 5 implementation
- Keep the frontend helper surface centered on one resolver return object instead of multiple score helpers, so later page rewires can consume `effective/primary` and `inherent` snapshots from one source of truth.
- Derive frontend level/priority/matrix metadata from the chosen effective bundle via existing `getRiskLevelFromNilai`, `getRiskPriority`, and label helpers rather than introducing a parallel scoring path.

## 2026-04-09T00:00:00Z Task 6 implementation
- Keep overview exposure/trend semantics score-driven by feeding `resolveRiskScoreSemantics` into the existing `levelFromScore` / `weightFor` aggregation path, rather than introducing a second overview-only classification scheme.
- Preserve movement/history widgets and backend heatmap payload semantics exactly as-is for Task 6; only the current-state overview consumers switch to effective/final scoring.

## 2026-04-09T00:00:00Z Task 7 implementation
- Treat register list rows and approved detail summaries as current-state consumers of `resolveRiskScoreSemantics`, but preserve reviewer cards, review side panel evidence, and history pages as explicit comparison surfaces.
- Fix the review side panel regression at the call site instead of changing panel semantics: `inherentScore` must continue to receive the preliminary/inherent score so `Skor Awal` and `Skor Review` remain genuinely side-by-side.

## 2026-04-09T00:00:00Z Task 10 verification
- Keep Task 10 scoped to release verification: use minimal unblocker fixes for failing gates, but avoid broad unrelated frontend lint cleanup or score-semantics changes.
- Record the frontend lint backlog as warnings via config rather than refactoring unrelated pages during this release-evidence step, because the goal is to verify the reviewed-score contract rather than remediate general repo hygiene.

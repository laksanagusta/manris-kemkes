- Existing KRI API uses query params for IDs in create/list while body parsing is used for payload fields; archive endpoint currently follows this mixed style and accepts optional JSON body reason.
- Workspace-wide `go test ./...` currently fails in `internal/usecase/risk/list_cycle_snapshot_test.go` due pre-existing `RiskRepository` mock mismatch (`ListApprovedRisks` missing); KRI-report package tests and backend binary builds still pass.
- `go test ./internal/usecase/risk` still fails for pre-existing `fakeCycleSnapshotRiskRepo` interface drift (missing `ListApprovedRisks`), unrelated to KRI report workflow changes in this task.
- `go test ./internal/usecase/kri_report ./internal/usecase/risk -run TestBuildKRISemesterSummary -v` originally failed due pre-existing `fakeCycleSnapshotRiskRepo` interface drift; fixed by adding `ListApprovedRisks` stub in risk test fake.
- `npm test` continues to emit existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings because frontend tests use ESM syntax without `"type": "module"`; warning is non-blocking and tests still pass.
- Task-7 verification outputs were captured at `.sisyphus/evidence/task-7-kri-review.txt` and `.sisyphus/evidence/task-7-kri-review-error.txt`; no new frontend test/build blockers were found.
- Task-9 terminology update changed `formatSemesterSummary` wording from `revision` to `revision requested`; the existing unit test expectation needed update in `frontend/src/lib/kri-reporting.test.ts`.
- Frontend `npm test` still emits baseline `MODULE_TYPELESS_PACKAGE_JSON` warnings (non-blocking); regressions pass regardless.
- Code quality review found residual debug logging in scoped workflow files: `backend/internal/usecase/kri_report/usecases.go` uses `fmt.Printf(...)` in generation flow and multiple frontend KRI surfaces still use `console.error(...)`.
- `backend/internal/repository/postgres/kri_report.go` `ListByUser(...)` currently ignores `userID` and returns reports by status only, which does not align with endpoint intent (`/kri-reports/my`) and risks over-broad data exposure.
- Backend coverage remains uneven in reviewed scope: `internal/usecase/kri` 16.7%, while handler/repository packages are 0% statement coverage.

- 2026-04-03 Plan compliance audit: mandatory UI QA evidence is non-compliant for Tasks 6-9. Required screenshot/error evidence files (, , , , ) are missing; substitute  build/test logs do not satisfy the plan.
- 2026-04-03 Plan compliance audit: KRI report access is role-gated but not org-scoped.  still notes "For now, show all pending reports (can scope to org later)" and the list queries do not constrain by accessible organization.

- 2026-04-03 Plan compliance audit: mandatory UI QA evidence is non-compliant for Tasks 6-9. Required screenshot/error evidence files task-6-kri-detail.png, task-7-kri-review.png, task-8-kri-reassessment.png, task-9-kri-consistency.png, and task-9-kri-consistency-error.txt are missing; substitute text build/test logs do not satisfy the plan.
- 2026-04-03 Plan compliance audit: KRI report access is role-gated but not org-scoped. backend/internal/repository/postgres/kri_report.go still notes that org scoping can be added later, and the list queries do not constrain by accessible organization.

- 2026-04-03 Manual QA setup exposed role string mismatch between seeded users (`superadmin`) and KRI-report permission helper checks (`super_admin`), causing super admin to be blocked from submit/review actions in runtime.
- 2026-04-03 KRI create/get flow is fragile when `organization_id` is null: repository scans `o.name` into `string` (non-nullable), which can break list/get behavior for KRIs without org linkage.
- 2026-04-03 Follow-up fix landed: `kri_report.ListByUser` now scopes by requestor organization (`k.organization_id = requestor.organization_id`), closing prior broad-read risk on `/kri-reports/my`.
- 2026-04-03 Follow-up fix landed: accept flow now returns explicit error and rolls report back to pre-accept state when KRI value update fails.

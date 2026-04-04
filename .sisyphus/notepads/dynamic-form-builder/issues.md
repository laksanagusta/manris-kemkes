# Issues — Dynamic Form Builder

## Pre-existing LSP Errors (NOT caused by us)

Pre-existing test mock errors in backend — fake repository stubs missing `GetHeatmapVelocity` method:
- `backend/internal/usecase/approval/action_test.go`
- `backend/internal/usecase/approval/submit_test.go`
- `backend/internal/usecase/risk/list_cycle_snapshot_test.go`
- `backend/internal/usecase/risk/category_persistence_test.go`
- `backend/internal/usecase/risk/compare_cycle_detail_test.go`

These are pre-existing — NOT introduced by this feature. Do NOT fix them in this plan.

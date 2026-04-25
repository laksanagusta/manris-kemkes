# T6 - risk_write.go MCP Tools

## Decisions
- `RiskGetUseCaseI` was already redefined in `risk_query.go` with `(ctx, uuid.UUID, []uuid.UUID)` signature (NOT the plan's `(ctx, string, *entity.UserPublic)`). Reused as-is.
- Used `submitOutput.ApprovalID == ""` as `workflow_skipped` signal (matches SubmitApprovalUC auto-approve branch which sets ApprovalID="" when flag=false).
- Forced `input.Status = entity.RiskStatusDraft` in update handler to prevent client-driven status transitions.
- Re-fetch via getUC AFTER both create+submit and update to return canonical post-mutation state.

## Issues Encountered
- `mocks_test.go` was deleted externally between runs — recreated with all 6 mocks (Create/Update/Get/List/Reassessment/ApprovalSubmit).
- `risk_monitoring_test.go` had stale references (entity import, mockRiskUpdateUC{risk:...}); resolved externally during session.
- `cmd/mcp/main.go` has many compile errors — these are T8 (registration) territory, NOT T6 scope. `go build ./...` fails on cmd/mcp; `go build ./internal/mcp/...` and `go vet ./internal/mcp/tools/...` pass.

## Verification
- `go vet ./internal/mcp/tools/...`: clean
- `go test ./internal/mcp/tools/...`: 17 tests pass (6 risk_write + 4 risk_query + 4 risk_monitoring + 5 auth — but auth has 5, total 17 incl Login×5)
- Guardrails:
  - No `ApprovalActionUseCase` or `ApproveAction(` calls in risk_write.go (only mention is in a docstring comment explicitly stating it is NOT called).
  - Exactly 1 `submitUC.Execute` call.

## Test Coverage (risk_write_test.go = 6 tests)
1. `TestHandleCreateAndApproveRisk_Success`
2. `TestHandleCreateAndApproveRisk_NoSession`
3. `TestHandleCreateAndApproveRisk_CreateUseCaseError`
4. `TestHandleUpdateRiskDraft_Success`
5. `TestHandleUpdateRiskDraft_NoSession`
6. `TestHandleUpdateRiskDraft_NotDraftStatus` (validates ErrRiskNotDraft on approved risk)

## Files Touched
- `backend/internal/mcp/tools/risk_write.go` (existed, kept current correct version)
- `backend/internal/mcp/tools/risk_write_test.go` (added 2 new tests + errors import)
- `backend/internal/mcp/tools/mocks_test.go` (recreated after external deletion)

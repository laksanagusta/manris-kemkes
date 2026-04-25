# mcp-server T7 — Learnings

## Reusable patterns discovered

- **Reassessment = monitoring/penilaian in Manris.** No separate `monitoring` usecase package exists. The flow is: `CreateRiskReassessmentUseCase` (creates a new risk version with same `version_group_id`) → optional `RiskUpdateUseCase` to apply review fields → `SubmitApprovalUseCase` with `RequestType:"assessment"`.
- **Auto-approval is implicit.** When the org's risk approval workflow flag is disabled, `SubmitApprovalUseCase` returns `ApprovalID:""` and the entity is already in approved status — the caller never invokes any "approve action" usecase. Surface this to the client via a `workflow_skipped` boolean derived from `ApprovalID == ""`.
- **Status preservation guard.** Both `HandleMonitorAndApproveRisk` (when applying review fields) and `HandleUpdateMonitoringDraft` must explicitly set `input.Status = entity.RiskStatusDraft` AFTER calling `mapping.ToUpdateRiskInput`, to defeat any client-supplied status transition. This is a security invariant — without it the MCP tool becomes a status-bypass primitive.
- **Mock reuse.** The existing `mockRiskReassessmentUC` in `mocks_test.go` already matches the new `RiskReassessUseCaseI` signature. No mock changes needed for T7.
- **Field-key catalog for `hasReviewFields`.** Drives whether the optional update step runs. Mirrors the union of all keys consumed by `mapping.ToUpdateRiskInput`. When new review fields are added to `UpdateRiskInput`, this list must be extended.

## Verification commands that worked

```bash
cd backend
go build ./internal/mcp/...
go vet ./internal/mcp/...
go test ./internal/mcp/tools/... -count=1 -v
grep -rn '"assessment"' internal/mcp/tools/   # must include monitoring.go
grep -n 'ApprovalActionUseCase\|ApproveAction(' internal/mcp/tools/monitoring.go  # must be empty
```

## Final Verification Remediation (12 BLOCKING fixes)

- **Tool registration extraction (B2 root cause).** Inline registration in `cmd/mcp/main.go` made unsafe `req.Params.Arguments.(map[string]interface{})` assertions and unchecked `json.Marshal` results unavoidable. Solution: extract into `internal/mcp/tools/register.go` with shared `argsMap()` (comma-ok assertion → empty map fallback) and `successResult()`/`errorResult()` helpers. main.go drops to ~67 lines and only wires deps + calls 4 `Register*` functions. This pattern (registration helpers per package) should be the default for any future tool group.
- **Status invariant for `update_monitoring_draft` (B6).** Without fetching the current risk via `getUC` and asserting `entity.RiskStatusDraft`, the tool was a status-laundering primitive — clients could mutate approved/in-review monitoring records. The exported `ErrMonitoringNotDraft` sentinel mirrors the same guard already present in `update_risk_draft` and lets tests assert on the precise failure mode.
- **`SessionTTL` zero-value fallback (B4).** Auth handler defaulted to a stale hardcoded value when `Deps.SessionTTL == 0`. Fix: keep zero-value valid by falling back to 24h inside `HandleLogin` rather than failing config validation. Lets bootstrap stay simple while production code can override via env.
- **e2e harness binary path (B12).** Renaming `build-mcp` → `mcp-build` and outputting at `bin/mcp` (instead of repo-root `server-mcp`) required updating `findMCPBinary()` location list in `e2e_test.go`. Lesson: integration test discovery paths are coupled to Makefile output paths — change them together or e2e silently skips.
- **`.env` loading in MCP main (B11).** `godotenv.Load()` must be called BEFORE `bootstrap.New()` reads env vars. Error from Load is logged but ignored (env vars may legitimately come from parent process / launcher config like opencode.json). Pattern: `if err := godotenv.Load(); err != nil { log.Printf("note: .env not loaded: %v", err) }`.
- **Docs colocated with package (B10).** Moving `MCP_README.md` from repo root to `backend/internal/mcp/README.md` keeps documentation discoverable next to code via `go doc` workflows and IDE navigation. After move, `sed` over the file to rewrite `server-mcp` → `bin/mcp` and `build-mcp`/`test-mcp` → `mcp-build`/`mcp-test` is cheaper than manual edits.

## Verification commands (full remediation cycle)

```bash
cd backend
go build ./...
go vet ./...
go test ./internal/mcp/... -count=1
make mcp-build && ls -la bin/mcp
make mcp-test
git diff --stat HEAD -- backend/internal/usecase/ backend/internal/handler/ backend/internal/repository/ backend/internal/domain/ frontend/ .sisyphus/plans/mcp-server.md  # MUST be empty
```

## Post-completion polish: Env file auto-discovery for MCP binary

**Pattern:** When a binary may be spawned from arbitrary working directories (e.g., by LLM clients like opencode/Claude Code), implement a fallback chain for loading `.env`:
1. Check `MANRIS_ENV_FILE` env var (explicit override)
2. Try `.env` in cwd (supports local overrides)
3. Try `.env` in binary's directory (for self-contained deployments)
4. Try `.env` in parent of binary's directory (our use case: binary at `backend/bin/mcp`, config at `backend/.env`)

**Implementation:** Extract into a helper function `loadEnvFile()` that returns the resolved absolute path and logs each attempt. Call before `config.Load()`. Missing `.env` is not fatal — env vars may come from parent process or explicit `env` block in client config.

**Verification:** Test from `/tmp` to confirm binary finds config relative to its own location, not cwd. Eliminates need for users to duplicate env vars in MCP client configs like opencode.json.

**User feedback addressed:** "kenapa aku harus memasukkan env ke configurasi di LLMnya ya?" → With this fix, MCP config becomes just `{"command": "/path/to/bin/mcp"}` without needing to duplicate DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, etc.

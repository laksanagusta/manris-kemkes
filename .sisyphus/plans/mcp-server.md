# MCP Server for Manris v2 Backend (Risk + Monitoring Tools)

## TL;DR

> **Quick Summary**: Build a Go MCP (Model Context Protocol) stdio server at `cmd/mcp/main.go` that exposes existing Manris usecases as 7 tools for AI coding agents (opencode, Claude Code), with `RISK_APPROVAL_WORKFLOW_ENABLED=false` so create/monitoring flows auto-approve in a single tool call.
>
> **Deliverables**:
> - `internal/bootstrap/bootstrap.go` - mechanical DI extraction (shared by server + mcp)
> - `internal/mcp/session/` - in-memory session manager (single-session for stdio)
> - `internal/mcp/mapping/` - tool args → usecase input transformers
> - `internal/mcp/tools/` - 7 tool handlers (login, create_and_approve_risk, update_risk_draft, monitor_and_approve_risk, update_monitoring_draft, get_risk, list_risks)
> - `cmd/mcp/main.go` - stdio MCP server binary
> - `Makefile` targets: `build-mcp`, `run-mcp`
> - Integration tests + agent QA scenarios via JSON-RPC over stdio
> - README with opencode/Claude Code config snippet
>
> **Estimated Effort**: Medium (~1-1.5 days)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Wave 1 (bootstrap+session+mapping) → Wave 2 (read tools+write tools) → Wave 3 (binary+config) → Final QA

---

## Context

### Original Request
Implementasi MCP server pada backend Go yang reuse fungsi existing dengan 7 tools awal, embeddable ke opencode/Claude Code, dengan `RISK_APPROVAL_WORKFLOW_ENABLED=false`.

### Interview Summary

**Decisions**:
- **SDK**: `github.com/mark3labs/mcp-go` v0.49.0 (8.6k stars, builder API, mature)
- **Transport**: stdio only (MVP) - universal for opencode/Claude Code/Cursor
- **Auth**: `login` tool stores session in-memory; subsequent tools read session automatically
- **Backend integration**: direct usecase calls (in-process), share DB pool
- **Test strategy**: tests-after for handlers + TDD for pure logic (session, mapping) + mandatory agent QA via JSON-RPC scenarios
- **"Hingga approved"**: single tool call. Internal: 2-call composition (`Create/Update` → `SubmitApproval`). `SubmitApprovalUseCase` SELF-APPROVES when flag=false (verified at `internal/usecase/approval/submit.go:98-122`).

### Research Findings

**Backend usecases (verified file:line)**:
- `authuc.LoginUseCase.Execute(ctx, LoginInput) → *entity.AuthToken` — `internal/usecase/auth/login.go:42`
- `riskuc.CreateRiskUseCase.Execute(ctx, CreateRiskInput) → *CreateRiskOutput` — `internal/usecase/risk/create.go:80`
- `riskuc.UpdateRiskUseCase.Execute(ctx, UpdateRiskInput, orgIDs) → *UpdateRiskOutput` — `internal/usecase/risk/update.go:91`
- `riskuc.GetRiskUseCase.Execute(ctx, id, orgIDs) → *entity.Risk` — `internal/usecase/risk/get.go:23`
- `riskuc.ListRisksUseCase.Execute(ctx, ListRisksInput) → []*entity.Risk` — `internal/usecase/risk/list.go:29`
- `approvaluc.SubmitApprovalUseCase.Execute(ctx, SubmitApprovalInput) → *SubmitApprovalOutput` — `internal/usecase/approval/submit.go:59`

**Critical correction from Metis**: `SubmitApprovalUseCase` short-circuits when `riskApprovalWorkflowEnabled=false`:
- `RequestType="risk"` → directly sets `risk.Status=approved`, no approval record created
- `RequestType="assessment"` → calls `riskRepo.ActivateApprovedVersion`, no approval record created
- **`ApprovalActionUseCase` MUST NOT be called** in this flow (no approval record exists)

**Monitoring/Pemantauan mapping** (CONFIRMED): No separate module. Same Risk row carries review-cycle fields (`ReviewType`, `ChangeReason`, `ReviewSummary`, `AssessmentCycle`). Both `CreateRiskInput` and `UpdateRiskInput` accept these. `RequestType="assessment"` in approval workflow.

### Metis Review

**Identified Gaps (addressed)**:
- ❌ User's "3-call" mental model → ✅ corrected to 2-call composition
- ❌ Multi-session race conditions → ✅ stdio = single-session, single `*atomic.Pointer[Session]`
- ❌ Working paper repo (`wpRepo`) skipped → ✅ full DI parity, wire wpRepo in bootstrap
- ❌ JWT redundant in-process → ✅ store `AuthToken.User` snapshot in session, expire per `JWT_EXPIRY_HOURS`
- ❌ Audit trail gap risk → ✅ usecases own audit logging (verified in clean architecture)
- ❌ Bootstrap refactor scope creep → ✅ MECHANICAL move only, no new abstractions
- ❌ Tool description bloat → ✅ ≤200-char descriptions with concrete examples
- ❌ Flag-flip silent behavior change → ✅ `create_and_approve_risk` checks flag at startup, fails-loud if true

---

## Work Objectives

### Core Objective
Add a Go MCP stdio server binary that exposes 7 risk-management tools to AI coding agents by composing existing usecases — without modifying existing usecase or handler behavior, and with full DI parity to the HTTP server.

### Concrete Deliverables
- `backend/internal/bootstrap/bootstrap.go` — DI extraction (struct returning all repos, services, usecases, pool)
- `backend/cmd/server/main.go` — refactored to call `bootstrap.Build(cfg)` (zero behavior change)
- `backend/internal/mcp/session/session.go` — single-session manager with expiry
- `backend/internal/mcp/mapping/risk.go` — args ↔ `CreateRiskInput`/`UpdateRiskInput`/`ListRisksInput` mappers
- `backend/internal/mcp/tools/{auth,risk,monitoring,query}.go` — 7 tool handlers
- `backend/cmd/mcp/main.go` — stdio MCP server entry, registers all tools
- `backend/Makefile` — `build-mcp`, `run-mcp` targets
- `backend/cmd/mcp/README.md` — opencode/Claude Code config snippet, tool catalog
- `backend/cmd/mcp/integration_test.go` — `// +build integration` end-to-end JSON-RPC tests

### Definition of Done
- [ ] `go build ./...` clean
- [ ] `go vet ./...` clean
- [ ] All existing tests pass: `go test ./internal/...`
- [ ] New unit tests pass: `go test ./internal/mcp/...`
- [ ] Integration test passes: `go test -tags=integration ./cmd/mcp/...`
- [ ] Binary runs: `make build-mcp && ./bin/mcp` (waits on stdin)
- [ ] All 7 tools listable via `tools/list` JSON-RPC over stdio
- [ ] All 7 tools executable end-to-end with DB assertions

### Must Have
- All 7 tools wired to existing usecases (no logic duplication)
- `RISK_APPROVAL_WORKFLOW_ENABLED=false` causes `create_and_approve_risk` and `monitor_and_approve_risk` to produce risks with `Status=approved` in single tool call
- Session expiry enforced per `JWT_EXPIRY_HOURS`
- Working paper lock check (`wpRepo.HasBlockingDocumentLink`) honored in update tools (parity with HTTP)
- Domain errors (`ErrRiskNotFound`, `ErrInvalidStatus`, etc.) mapped to MCP `IsError=true` results with structured content
- Full org-scope filtering using `session.AccessibleOrgIDs` for get/list/update
- Bootstrap refactor is mechanical (zero behavior change to existing server)
- README has working `~/.config/opencode/opencode.json` and Claude Code mcp config snippets

### Must NOT Have (Guardrails)
- ❌ NO modifications to existing usecase signatures or behavior
- ❌ NO new domain entities, new repos, new HTTP endpoints
- ❌ NO new abstractions (interfaces, factories, options patterns) in bootstrap refactor
- ❌ NO call to `ApprovalActionUseCase` in `create_and_approve_risk` or `monitor_and_approve_risk` (auto-approve happens inside `SubmitApprovalUseCase`)
- ❌ NO multi-session map (stdio is single-client; one `*atomic.Pointer[Session]` only)
- ❌ NO returning JWT string to LLM (security; only return user metadata)
- ❌ NO caching, retry, rate-limiting, telemetry beyond what usecases already do
- ❌ NO HTTP/SSE transport in this iteration (stdio only)
- ❌ NO incident/KRI/control/AI/dashboard tools in this iteration
- ❌ NO logout tool (process restart resets session; documented in README)
- ❌ NO update on already-approved risk (return clear error suggesting future revision flow); revision flow is OUT OF SCOPE
- ❌ NO mixing bootstrap refactor with new MCP code in the same commit (atomic commits required)

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - all verification agent-executed.

### Test Decision
- **Infrastructure exists**: YES (`go test`, table-driven pattern; existing tests in `internal/usecase/risk/*_test.go` and `internal/usecase/auth/*_test.go`)
- **Automated tests**:
  - **TDD** for `internal/mcp/session` and `internal/mcp/mapping` (pure logic — easy to test-first)
  - **Tests-after** for tool handlers (with stub session + real usecase signatures)
- **Framework**: Go stdlib testing
- **Integration tests**: build-tag `integration`, spawn the MCP binary and pipe JSON-RPC over stdin/stdout

### QA Policy
Every tool task includes JSON-RPC over stdio QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{slug}.{txt,json}`.

- **MCP tool QA**: Use `Bash` to spawn `./bin/mcp` as subprocess, write JSON-RPC requests to stdin, read responses from stdout, assert response shape using `jq`
- **DB QA**: After tool execution, query Postgres via `psql $DATABASE_URL -c "..."` to confirm row state
- **Negative QA**: Each tool must have at least one failure scenario (invalid auth, missing field, status conflict, etc.)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (foundation, MAX PARALLEL):
├── Task 1: Add mcp-go dependency + bootstrap extraction [quick]
├── Task 2: Session manager package (TDD) [quick]
└── Task 3: Mapping helpers package (TDD) [quick]

Wave 2 (tools, depend on 1+2+3):
├── Task 4: Auth tool (login) [quick]
├── Task 5: Query tools (get_risk, list_risks) [quick]
├── Task 6: Risk write tools (create_and_approve_risk, update_risk_draft) [unspecified-high]
└── Task 7: Monitoring tools (monitor_and_approve_risk, update_monitoring_draft) [unspecified-high]

Wave 3 (integration):
├── Task 8: cmd/mcp/main.go binary + tool registration [quick]
├── Task 9: Makefile + README + opencode/Claude Code config snippets [writing]
└── Task 10: Integration test harness (JSON-RPC over stdio) [unspecified-high]

Wave FINAL (4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
→ Present results → Wait for user okay

Critical Path: T1 → T6 → T8 → T10 → F1-F4 → user okay
Parallel Speedup: ~50% faster than sequential (10 tasks, 4 waves)
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

- **T1** (bootstrap+dep): - → T4-T8, blocks all
- **T2** (session): - → T4-T7
- **T3** (mapping): - → T6, T7
- **T4** (auth tool): T1, T2 → T8, T10
- **T5** (query tools): T1, T2 → T8, T10
- **T6** (risk write): T1, T2, T3 → T8, T10
- **T7** (monitoring): T1, T2, T3 → T8, T10
- **T8** (main+register): T4, T5, T6, T7 → T10
- **T9** (docs): T8 → F-wave
- **T10** (integration test): T8 → F-wave
- **F1-F4**: T1-T10 → user okay

### Agent Dispatch Summary
- **Wave 1**: 3 — T1→`quick`, T2→`quick`, T3→`quick`
- **Wave 2**: 4 — T4→`quick`, T5→`quick`, T6→`unspecified-high`, T7→`unspecified-high`
- **Wave 3**: 3 — T8→`quick`, T9→`writing`, T10→`unspecified-high`
- **FINAL**: 4 — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> Every task has: Recommended Agent Profile + Parallelization + QA Scenarios.

- [x] 1. **Add mcp-go dependency + extract DI to `internal/bootstrap`**

  **What to do**:
  - Add dependency: `cd backend && go get github.com/mark3labs/mcp-go@v0.49.0` (run `go mod tidy`)
  - Create `backend/internal/bootstrap/bootstrap.go` with:
    - Type `Container` struct holding: `Pool *pgxpool.Pool`, `Cfg *config.Config`, all repos (UserRepository, RiskRepository, ApprovalRepository, OrgRepository, WorkingPaperRepository, IncidentRepository, etc.), `OrgHierarchySvc *service.OrganizationHierarchy`, all auth usecases (LoginUseCase, MeUseCase, ChangePasswordUseCase, UpdateProfileUseCase), all risk usecases (Create/Update/Get/List/Delete), all approval usecases (Submit/Action/List/GetDetail)
    - Function `Build(ctx context.Context, cfg *config.Config) (*Container, error)` that performs ALL the wiring currently in `cmd/server/main.go` lines 60–250 (DB pool, repos, services, usecases)
    - Function `(c *Container) Close()` to close pool
  - Refactor `backend/cmd/server/main.go` to call `bootstrap.Build(ctx, cfg)` and use `container.AuthLoginUC`, `container.RiskCreateUC`, etc. for handler instantiation. **Behavior must be identical.**
  - Run all existing tests + start server, hit `/api/v1/auth/login` and `/api/v1/risks` to confirm no regression

  **Must NOT do**:
  - NO new interfaces, factories, options patterns, or "improvements" — purely mechanical move
  - NO renaming existing usecase types
  - NO behavior change in `cmd/server/main.go`
  - NO mixing this work with MCP code (separate commit)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical refactor with deterministic outcome — no novel logic
  - **Skills**: [`backend-go`, `golang-pro`]
    - `backend-go`: Clean architecture conventions for Go backends
    - `golang-pro`: Idiomatic Go for the wiring patterns

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundational; all other tasks depend on this)
  - **Parallel Group**: Wave 1 (alongside T2, T3 which don't depend on bootstrap directly)
  - **Blocks**: T4, T5, T6, T7, T8
  - **Blocked By**: None

  **References**:
  - Pattern: `backend/cmd/server/main.go:60-250` — ALL wiring code to be extracted
  - Repos location: `backend/internal/repository/postgres/*.go` — constructors
  - Usecases: `backend/internal/usecase/{auth,risk,approval}/*.go` — `New*UseCase()` constructors
  - Service: `backend/internal/domain/service/organization_hierarchy.go`
  - Config: `backend/internal/config/config.go` — `Config` struct shape
  - External: `https://github.com/mark3labs/mcp-go` — README for SDK install

  **Acceptance Criteria**:
  - [ ] `go get github.com/mark3labs/mcp-go@v0.49.0` succeeds; `go.mod` updated
  - [ ] File `backend/internal/bootstrap/bootstrap.go` exists with `Container` type and `Build`/`Close` functions
  - [ ] `cmd/server/main.go` line count REDUCED (wiring moved out)
  - [ ] `go build ./...` clean
  - [ ] `go vet ./...` clean
  - [ ] `go test ./internal/...` all pass

  **QA Scenarios**:

  ```
  Scenario: Existing server still boots and serves login identically
    Tool: Bash
    Preconditions: DB running, .env present with valid DATABASE_URL
    Steps:
      1. cd backend && make migrate-up
      2. cd backend && go build -o bin/server cmd/server/main.go
      3. ./bin/server & sleep 2
      4. curl -s -X POST http://localhost:8080/api/v1/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | jq .
      5. kill %1
    Expected Result: Step 4 returns JSON with `token` field (non-empty) and `user.id` field
    Failure Indicators: 500 error, missing token field, panic in server logs
    Evidence: .sisyphus/evidence/task-1-login-parity.json

  Scenario: Bootstrap refactor is mechanical — no diff in behavior
    Tool: Bash
    Preconditions: T1 implementation complete
    Steps:
      1. cd backend && git diff main -- cmd/server/main.go | grep -E '^\+' | grep -vE 'bootstrap\.|container\.|//' | wc -l
      2. cd backend && go test ./internal/usecase/...
    Expected Result: Step 1 outputs ≤ 5 (only mechanical replacement lines added). Step 2 all PASS.
    Evidence: .sisyphus/evidence/task-1-mechanical-check.txt
  ```

  **Commit**: YES (standalone)
  - Message: `refactor(backend): extract DI to internal/bootstrap`
  - Files: `backend/internal/bootstrap/bootstrap.go`, `backend/cmd/server/main.go`, `backend/go.mod`, `backend/go.sum`
  - Pre-commit: `go build ./... && go vet ./... && go test ./internal/...`

- [x] 2. **Session manager package (TDD)**

  **What to do**:
  - Create `backend/internal/mcp/session/session.go` with:
    - Type `Session struct { UserID uuid.UUID; Username, Name, Role string; AccessibleOrgIDs []uuid.UUID; ExpiresAt time.Time }`
    - Type `Manager struct { current atomic.Pointer[Session] }`
    - Method `Set(s *Session)`
    - Method `Get() (*Session, error)` — returns `ErrNoSession` if nil, `ErrSessionExpired` if past `ExpiresAt`
    - Method `Clear()`
    - Sentinel errors: `ErrNoSession`, `ErrSessionExpired`
  - Write `backend/internal/mcp/session/session_test.go` FIRST (TDD): table-driven tests covering: empty manager → ErrNoSession; valid session → Get returns it; expired → ErrSessionExpired; Clear resets
  - Implement to make tests pass

  **Must NOT do**:
  - NO map of sessions keyed by anything (single-session model)
  - NO mutex (use `atomic.Pointer`)
  - NO storing JWT string in session (only user metadata + expiry)
  - NO depending on MCP SDK or any usecase package

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure logic, small surface, perfect TDD fit
  - **Skills**: [`test-driven-development`, `golang-pro`]
    - `test-driven-development`: RED-GREEN-REFACTOR for pure logic
    - `golang-pro`: idiomatic atomic.Pointer + sentinel errors

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T1, T3)
  - **Parallel Group**: Wave 1
  - **Blocks**: T4, T5, T6, T7
  - **Blocked By**: None

  **References**:
  - Pattern: `backend/internal/usecase/auth/login.go` — session/expiry concept
  - Entity: `backend/internal/domain/entity/auth_token.go` (or `user.go`) — `UserPublic` struct shape for fields to copy into session
  - External: `https://pkg.go.dev/sync/atomic#Pointer` — atomic.Pointer usage

  **Acceptance Criteria**:
  - [ ] `session.go` and `session_test.go` exist
  - [ ] `go test ./internal/mcp/session/` all PASS (≥ 5 test cases)
  - [ ] No imports from `internal/usecase/*` or `mark3labs/mcp-go` in this package

  **QA Scenarios**:

  ```
  Scenario: Session lifecycle (set, get, expire, clear)
    Tool: Bash
    Steps:
      1. cd backend && go test -v -run TestSessionManager ./internal/mcp/session/
    Expected Result: All subtests PASS, including expired session returns ErrSessionExpired
    Evidence: .sisyphus/evidence/task-2-session-tests.txt

  Scenario: Get on empty manager returns ErrNoSession
    Tool: Bash
    Steps:
      1. cd backend && go test -v -run TestSessionManager_GetEmpty ./internal/mcp/session/
    Expected Result: PASS, error == session.ErrNoSession
    Evidence: .sisyphus/evidence/task-2-empty-session.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add session manager with expiry`
  - Files: `backend/internal/mcp/session/session.go`, `backend/internal/mcp/session/session_test.go`
  - Pre-commit: `go test ./internal/mcp/session/`

- [x] 3. **Mapping helpers (args ↔ usecase Inputs) TDD**

  **What to do**:
  - Create `backend/internal/mcp/mapping/risk.go` with pure functions:
    - `ToCreateRiskInput(args map[string]any, session *session.Session) (riskuc.CreateRiskInput, error)` — populates OrganizationID from args (validated against `session.AccessibleOrgIDs`), all 5-section form fields with safe type assertions
    - `ToUpdateRiskInput(args map[string]any, session *session.Session) (riskuc.UpdateRiskInput, error)` — same shape, includes ID + Status + review fields
    - `ToListRisksInput(args map[string]any, session *session.Session) (riskuc.ListRisksInput, error)` — defaults `OrgIDs = session.AccessibleOrgIDs` when args don't override; supports `Status`, `Category` filters
    - Helper `parseUUID(args, key) (uuid.UUID, error)`, `parseStringSlice(args, key)`, `parseFloat(args, key)`
  - Write `risk_test.go` FIRST: table-driven tests for happy path + missing required field + invalid UUID + org-scope rejection
  - Implement to pass

  **Must NOT do**:
  - NO calls to usecase or repository — pure transformation only
  - NO panics on bad input — all errors must be returned
  - NO silently dropping unknown fields (return error for unknown required field)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure transformation logic
  - **Skills**: [`test-driven-development`, `golang-pro`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: T6, T7
  - **Blocked By**: None

  **References**:
  - Input shape: `backend/internal/usecase/risk/create.go:33` — `CreateRiskInput` fields
  - Input shape: `backend/internal/usecase/risk/update.go:39` — `UpdateRiskInput` fields
  - Input shape: `backend/internal/usecase/risk/list.go:23` — `ListRisksInput` fields
  - Pattern: existing handler arg parsing in `backend/internal/handler/http/risk.go` — type assertion patterns to mirror

  **Acceptance Criteria**:
  - [ ] `mapping/risk.go` and `risk_test.go` exist
  - [ ] `go test ./internal/mcp/mapping/` PASS (≥ 8 test cases including failure paths)
  - [ ] No imports from `mark3labs/mcp-go` (keep mapping framework-agnostic)

  **QA Scenarios**:

  ```
  Scenario: ToCreateRiskInput happy path with all required fields
    Tool: Bash
    Steps:
      1. cd backend && go test -v -run TestToCreateRiskInput_Happy ./internal/mcp/mapping/
    Expected Result: PASS; output struct matches expected fields
    Evidence: .sisyphus/evidence/task-3-mapping-create.txt

  Scenario: ToListRisksInput rejects org outside session.AccessibleOrgIDs
    Tool: Bash
    Steps:
      1. cd backend && go test -v -run TestToListRisksInput_OrgScope ./internal/mcp/mapping/
    Expected Result: PASS; returns error "organization not accessible"
    Evidence: .sisyphus/evidence/task-3-mapping-orgscope.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add usecase input mapping helpers`
  - Files: `backend/internal/mcp/mapping/risk.go`, `backend/internal/mcp/mapping/risk_test.go`
  - Pre-commit: `go test ./internal/mcp/mapping/`

- [x] 4. **Auth tool: `login`**

  **What to do**:
  - Create `backend/internal/mcp/tools/auth.go` exposing `RegisterAuthTools(srv *server.MCPServer, deps Deps)`.
  - Inputs (struct via mcp-go typed handler): `email string` (required), `password string` (required).
  - Implementation: call `deps.AuthUC.Login(ctx, email, password)`. On success: store `session.Set(authResult)` (User snapshot only; do NOT persist token). Return `mcp.NewToolResultStructured(...)` with `{ user_id, name, email, role, organization_id, expires_at }`.
  - On error: return `mcp.NewToolResultError(err.Error())` (do NOT leak stack/internals).
  - Tool description ≤200 chars. Annotations: `ReadOnlyHint=false`, `IdempotentHint=false`.

  **Must NOT do**:
  - Do NOT include `token` in the tool result payload (security guardrail).
  - Do NOT call HTTP layer / re-implement password validation.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single-file thin wrapper around existing `LoginUseCase`.
  - **Skills**: [`golang-pro`]
    - `golang-pro`: Idiomatic mcp-go typed handlers + struct tags.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 6, 7)
  - **Blocks**: Task 8 (registration)
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `backend/internal/usecase/auth/login.go:42` - `LoginUseCase.Execute(ctx, email, password) (*AuthToken, error)` - signature to call.
  - `backend/internal/usecase/auth/login.go` - `AuthToken` struct shape (User field) - what to snapshot into session.
  - `backend/internal/middleware/auth.go:34` - `JWTClaims` shape - reference only, NOT to be mutated.
  - mcp-go docs: https://mcp-go.dev/servers/tools - `mcp.NewTool`, typed handlers, `mcp.NewToolResultStructured`.
  - Task 2 output: `backend/internal/mcp/session.Manager.Set/Get/Clear` - session API contract.

  **Acceptance Criteria**:
  - [ ] `go build ./internal/mcp/tools/...` PASS
  - [ ] `go vet ./internal/mcp/tools/...` PASS
  - [ ] grep confirms zero occurrences of `"token"` key in `auth.go` result payload

  **QA Scenarios**:

  ```
  Scenario: Login succeeds with valid credentials
    Tool: Bash (curl-like JSON-RPC over stdio harness from Task 10)
    Preconditions: backend DB has user admin@manris.local / Admin123! (seeded migration)
    Steps:
      1. Send tools/call {name:"login", arguments:{email:"admin@manris.local", password:"Admin123!"}}
      2. Parse JSON-RPC response
      3. Assert result.structuredContent.email == "admin@manris.local"
      4. Assert result.structuredContent has NO "token" key
    Expected Result: success result with user fields, no token leak
    Evidence: .sisyphus/evidence/task-4-login-success.json

  Scenario: Login fails with wrong password
    Tool: Bash (JSON-RPC harness)
    Preconditions: same user exists
    Steps:
      1. Send tools/call {name:"login", arguments:{email:"admin@manris.local", password:"WRONG"}}
      2. Assert result.isError == true
      3. Assert content[0].text contains "invalid" (case-insensitive)
    Expected Result: error result, no session mutation
    Evidence: .sisyphus/evidence/task-4-login-fail.json
  ```

  **Commit**: YES
  - Message: `feat(mcp): add login tool`
  - Files: `backend/internal/mcp/tools/auth.go`
  - Pre-commit: `go build ./... && go vet ./...`

- [x] 5. **Query tools: `get_risk` + `list_risks`**

  **What to do**:
  - Create `backend/internal/mcp/tools/risk_query.go` exposing `RegisterRiskQueryTools(srv, deps)`.
  - **`get_risk`**: input `{id string}`. Require active session (`session.Get()` non-nil); else return `mcp.NewToolResultError("not authenticated; call login first")`. Call `deps.RiskUC.GetByID(ctx, id, currentUser)`. Map output via Task 3 `mapping.RiskToOutput`.
  - **`list_risks`**: inputs `{status?, organization_id?, owner_id?, page?=1, page_size?=20}`. Build `risk.ListRisksInput` via `mapping.ToListRisksInput`. Call `deps.RiskUC.List(ctx, input, currentUser)`. Map result list + pagination meta.
  - Annotations: both `ReadOnlyHint=true`, `IdempotentHint=true`.

  **Must NOT do**:
  - Do NOT bypass org scoping — always pass `currentUser` from session.
  - Do NOT add filters not present in existing `ListRisksInput`.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two thin read-only wrappers; logic already in mapping (Task 3).
  - **Skills**: [`golang-pro`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `backend/internal/usecase/risk/get.go:23` - `GetByID(ctx, id, user) (*Risk, error)`.
  - `backend/internal/usecase/risk/list.go:29` - `List(ctx, input, user) (*ListRisksOutput, error)`.
  - `backend/internal/usecase/risk/list.go` - `ListRisksInput` field names (status, OrganizationID, OwnerID, Page, PageSize) - argument keys must match semantically.
  - Task 3 output: `mapping.RiskToOutput`, `mapping.ToListRisksInput`.

  **Acceptance Criteria**:
  - [ ] `go build ./internal/mcp/tools/...` PASS
  - [ ] grep `currentUser` in `risk_query.go` — appears in BOTH handlers (org scope enforced)

  **QA Scenarios**:

  ```
  Scenario: list_risks honors session org scope
    Tool: Bash (JSON-RPC harness)
    Preconditions: login as unit user of org A; org B has 5 risks; org A has 2 risks
    Steps:
      1. Call login (unit-A user)
      2. Call list_risks {page:1, page_size:50}
      3. Assert result.total == 2
      4. Assert all items have organization_id == orgA UUID
    Expected Result: only org A risks returned
    Evidence: .sisyphus/evidence/task-5-list-orgscope.json

  Scenario: get_risk without login fails
    Tool: Bash (JSON-RPC harness, fresh stdio session)
    Preconditions: no prior login call
    Steps:
      1. Call get_risk {id:"<any-uuid>"}
      2. Assert result.isError == true
      3. Assert content text contains "not authenticated"
    Expected Result: error result
    Evidence: .sisyphus/evidence/task-5-getrisk-noauth.json
  ```

  **Commit**: YES
  - Message: `feat(mcp): add get_risk and list_risks tools`
  - Files: `backend/internal/mcp/tools/risk_query.go`
  - Pre-commit: `go build ./... && go vet ./...`

- [x] 6. **Risk write tools: `create_and_approve_risk` + `update_risk_draft`**

  **What to do**:
  - Create `backend/internal/mcp/tools/risk_write.go`.
  - **`create_and_approve_risk`**: inputs match `risk.CreateRiskInput` semantics (title, description, category, likelihood, impact, organization_id?, owner_id?, treatment_strategy?, mitigation_plan?, due_date?). Require session.
    1. Build input via `mapping.ToCreateRiskInput`.
    2. Call `deps.RiskUC.Create(ctx, input, currentUser)` → returns `*Risk`.
    3. Call `deps.ApprovalUC.SubmitApproval(ctx, approval.SubmitInput{EntityType:"risk", EntityID: risk.ID, Action:"submit_for_approval"}, currentUser)`. Per `backend/internal/usecase/approval/submit.go:98-122`, when `RISK_APPROVAL_WORKFLOW_ENABLED=false` this auto-transitions risk to `approved`.
    4. Re-fetch risk via `RiskUC.GetByID` to get final status; map via `mapping.RiskToOutput`.
    5. Result: `{ risk: <output>, workflow_skipped: true|false, final_status: "approved"|"in_review" }`.
  - **`update_risk_draft`**: inputs `{id, ...partial fields}`. Build via `mapping.ToUpdateRiskInput`. Call `deps.RiskUC.Update(ctx, input, currentUser)`. Reject (return error result) if current status != `assessment_draft` (defense-in-depth; usecase already validates).
  - Annotations: `ReadOnlyHint=false`, `DestructiveHint=false`, `IdempotentHint=false`.

  **Must NOT do**:
  - Do NOT call `ApprovalActionUseCase` directly (only `SubmitApprovalUseCase`) — Metis-mandated guardrail.
  - Do NOT short-circuit the SubmitApproval call when flag=false; let the usecase decide.
  - Do NOT swallow errors from any step — return first error encountered.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 2-call composition with status re-fetch; touches workflow semantics.
  - **Skills**: [`golang-pro`, `backend-go`]
    - `backend-go`: clean architecture boundary discipline (no leaking domain).

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 7)
  - **Blocks**: Task 8, Task 10
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `backend/internal/usecase/risk/create.go:80` - `Create(ctx, CreateRiskInput, user) (*Risk, error)` - signature.
  - `backend/internal/usecase/risk/update.go:91` - `Update(ctx, UpdateRiskInput, user) (*Risk, error)`.
  - `backend/internal/usecase/approval/submit.go:59` - `SubmitApproval(ctx, SubmitInput, user)` entry point.
  - `backend/internal/usecase/approval/submit.go:98-122` - **CRITICAL**: auto-approve branch when `RISK_APPROVAL_WORKFLOW_ENABLED=false`; this is why composition is 2-call not 3-call.
  - `backend/internal/domain/risk` - status enum `assessment_draft | assessment_in_review | approved`.

  **Acceptance Criteria**:
  - [ ] `go build ./internal/mcp/tools/...` PASS
  - [ ] grep in `risk_write.go`: zero matches for `ApprovalActionUseCase` or `ApproveAction(` (guardrail)
  - [ ] grep: exactly ONE call to `SubmitApproval(` per create handler

  **QA Scenarios**:

  ```
  Scenario: create_and_approve_risk auto-approves when flag=false
    Tool: Bash (JSON-RPC harness)
    Preconditions: env RISK_APPROVAL_WORKFLOW_ENABLED=false; logged in as unit user
    Steps:
      1. Call create_and_approve_risk {title:"Cyber breach test", description:"...", category:"operational", likelihood:3, impact:4}
      2. Assert result.structuredContent.final_status == "approved"
      3. Assert workflow_skipped == true
      4. Query DB: SELECT status FROM risks WHERE id=<returned id> → "approved"
    Expected Result: single tool call yields approved risk; one risk row, status=approved
    Evidence: .sisyphus/evidence/task-6-create-approved.json + db-row.txt

  Scenario: update_risk_draft rejects non-draft risk
    Tool: Bash (JSON-RPC harness)
    Preconditions: risk created and approved (from prior scenario)
    Steps:
      1. Call update_risk_draft {id:<approved-risk-id>, title:"new"}
      2. Assert result.isError == true
      3. Assert content text mentions "draft" or "status"
    Expected Result: error returned; DB row unchanged (verify SELECT title)
    Evidence: .sisyphus/evidence/task-6-update-nondraft.json
  ```

  **Commit**: YES
  - Message: `feat(mcp): add risk write tools (create+approve, update draft)`
  - Files: `backend/internal/mcp/tools/risk_write.go`
  - Pre-commit: `go build ./... && go vet ./...`

- [x] 7. **Monitoring tools: `monitor_and_approve_risk` + `update_monitoring_draft`**

  **What to do**:
  - Create `backend/internal/mcp/tools/monitoring.go`.
  - **`monitor_and_approve_risk`**: inputs `{risk_id, period, residual_likelihood, residual_impact, effectiveness_notes?, evidence_url?}`. Require session.
    1. Build `monitoring.CreateMonitoringInput` via `mapping.ToCreateMonitoringInput`.
    2. Call `deps.MonitoringUC.Create(ctx, input, currentUser)` → returns monitoring record.
    3. Call `deps.ApprovalUC.SubmitApproval(ctx, approval.SubmitInput{EntityType:"monitoring", EntityID: monitoring.ID, Action:"submit_for_approval"}, currentUser)`. With flag=false, auto-approves.
    4. Re-fetch via `MonitoringUC.GetByID`; map output.
    5. Result: `{ monitoring: <output>, workflow_skipped, final_status }`.
  - **`update_monitoring_draft`**: inputs `{id, ...partial fields}`. Call `deps.MonitoringUC.Update`. Defense-in-depth: only allow when status is draft.
  - Annotations: `ReadOnlyHint=false`, `IdempotentHint=false`.

  **Must NOT do**:
  - Do NOT bypass approval submission for monitoring entity.
  - Do NOT couple monitoring tools to risk write tool internals — share only via `mapping/` and `Deps`.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Mirrors Task 6 pattern with different entity type.
  - **Skills**: [`golang-pro`, `backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 4, 5, 6)
  - **Blocks**: Task 8, Task 10
  - **Blocked By**: Tasks 1, 2, 3

  **References**:
  - `backend/internal/usecase/monitoring/` - locate `Create`, `Update`, `GetByID` (explore session ses_23ad250f0ffeh2gu5ys1iv5i2Z confirmed presence).
  - `backend/internal/usecase/approval/submit.go:59` - same submit entry, `EntityType:"monitoring"`.
  - `backend/internal/domain/monitoring` - status enum (`draft | in_review | approved`) — confirm exact values via Read before coding.

  **Acceptance Criteria**:
  - [ ] `go build ./internal/mcp/tools/...` PASS
  - [ ] grep: `EntityType: "monitoring"` appears in `monitoring.go` SubmitInput construction
  - [ ] grep: zero direct `ApprovalActionUseCase` references

  **QA Scenarios**:

  ```
  Scenario: monitor_and_approve_risk creates approved monitoring record
    Tool: Bash (JSON-RPC harness)
    Preconditions: an approved risk exists (from Task 6 scenario); flag=false
    Steps:
      1. Call monitor_and_approve_risk {risk_id:<id>, period:"2026-Q2", residual_likelihood:2, residual_impact:3}
      2. Assert final_status == "approved"
      3. SELECT status FROM monitoring WHERE id=<returned> → "approved"
    Expected Result: monitoring record approved in single call
    Evidence: .sisyphus/evidence/task-7-monitor-approved.json

  Scenario: update_monitoring_draft on approved monitoring fails
    Tool: Bash (JSON-RPC harness)
    Preconditions: approved monitoring record from prior scenario
    Steps:
      1. Call update_monitoring_draft {id:<approved-id>, effectiveness_notes:"new"}
      2. Assert isError == true
    Expected Result: error returned; DB unchanged
    Evidence: .sisyphus/evidence/task-7-update-nondraft.json
  ```

  **Commit**: YES
  - Message: `feat(mcp): add monitoring tools (monitor+approve, update draft)`
  - Files: `backend/internal/mcp/tools/monitoring.go`
  - Pre-commit: `go build ./... && go vet ./...`

- [x] 8. **MCP server binary: `cmd/mcp/main.go` + tool registration**

  **What to do**:
  - Create `backend/cmd/mcp/main.go`:
    1. Load `.env` via `godotenv` (same as `cmd/server/main.go`).
    2. Force/assert `RISK_APPROVAL_WORKFLOW_ENABLED=false` for MVP — log a startup line `mcp: approval workflow disabled (MVP)`.
    3. Call `bootstrap.New(ctx)` (from Task 1) → returns `Container` with all usecases + DB pool.
    4. Build `Deps` struct: `{AuthUC, RiskUC, ApprovalUC, MonitoringUC, Session: session.NewManager()}`.
    5. Create `srv := server.NewMCPServer("manris-mcp", "0.1.0", server.WithToolCapabilities(true), server.WithLogging())`.
    6. Register all tools: `tools.RegisterAuthTools(srv, deps)`, `RegisterRiskQueryTools`, `RegisterRiskWriteTools`, `RegisterMonitoringTools`.
    7. `server.ServeStdio(srv)` — block on stdio loop.
    8. On signal (SIGINT/SIGTERM): graceful shutdown — close DB pool from container, then exit.
  - Logs MUST go to stderr (stdout is reserved for JSON-RPC frames).

  **Must NOT do**:
  - Do NOT import or initialize Fiber/HTTP layer.
  - Do NOT write any log to stdout — corrupts MCP protocol.
  - Do NOT register tools inline; use the `Register*` functions only.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Wiring + lifecycle (signals, stderr logging) requires care.
  - **Skills**: [`golang-pro`, `backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential after Wave 3)
  - **Blocks**: Task 9, Task 10
  - **Blocked By**: Tasks 1, 2, 3, 4, 5, 6, 7

  **References**:
  - `backend/cmd/server/main.go:1-60` - env loading + godotenv pattern.
  - Task 1 output: `backend/internal/bootstrap/bootstrap.go` `New(ctx) (*Container, error)`.
  - mcp-go: `server.NewMCPServer`, `server.ServeStdio`, `server.WithLogging` - see https://mcp-go.dev/servers/basics.
  - Tasks 4-7 outputs: `Register*` functions.

  **Acceptance Criteria**:
  - [ ] `go build -o bin/mcp ./cmd/mcp` PASS
  - [ ] `./bin/mcp 2>/tmp/mcp.err <<< '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}'` returns valid initialize response on stdout
  - [ ] `/tmp/mcp.err` contains "mcp: approval workflow disabled (MVP)"
  - [ ] grep `cmd/mcp/main.go`: zero matches for `os.Stdout` or `fmt.Println`

  **QA Scenarios**:

  ```
  Scenario: tools/list returns all 7 tools
    Tool: Bash (JSON-RPC harness)
    Preconditions: binary built; DB reachable
    Steps:
      1. Spawn ./bin/mcp; send initialize, then initialized notification, then tools/list
      2. Parse response; collect tool names
      3. Assert exactly these 7 names: login, get_risk, list_risks, create_and_approve_risk, update_risk_draft, monitor_and_approve_risk, update_monitoring_draft
    Expected Result: 7 tools listed, no extras, no omissions
    Evidence: .sisyphus/evidence/task-8-tools-list.json

  Scenario: graceful shutdown on SIGINT
    Tool: Bash + interactive_bash (tmux)
    Preconditions: binary running in tmux pane
    Steps:
      1. Start ./bin/mcp in tmux pane
      2. Send SIGINT (Ctrl+C)
      3. Assert process exits with code 0 within 3s
      4. Assert stderr contains "shutdown" log line
    Expected Result: clean exit, DB pool closed
    Evidence: .sisyphus/evidence/task-8-shutdown.txt
  ```

  **Commit**: YES
  - Message: `feat(mcp): add cmd/mcp stdio server binary`
  - Files: `backend/cmd/mcp/main.go`
  - Pre-commit: `go build ./...`

- [x] 9. **Makefile target + README + client config snippets**

  **What to do**:
  - Edit `backend/Makefile`: add `mcp-build` (`go build -o bin/mcp ./cmd/mcp`) and `mcp-run` (`./bin/mcp`) targets. Add `mcp-test` target running `go test -tags=integration ./cmd/mcp/...`.
  - Create `backend/internal/mcp/README.md` with:
    - Overview (1 paragraph)
    - Architecture diagram (ASCII): MCP client → stdio → cmd/mcp → bootstrap → usecases → repos → DB
    - Tool reference table: name | description | inputs | output shape | auth required
    - Build & run: `make mcp-build && ./bin/mcp`
    - **opencode config snippet** (`opencode.json`):
      ```json
      { "mcpServers": { "manris": { "command": "/abs/path/backend/bin/mcp", "env": { "DATABASE_URL": "...", "RISK_APPROVAL_WORKFLOW_ENABLED": "false" } } } }
      ```
    - **Claude Code config snippet** (`~/.claude/mcp_servers.json`): equivalent format.
    - Troubleshooting: stdout pollution, DB connectivity, session expiry.

  **Must NOT do**:
  - Do NOT duplicate API documentation already in main `AGENTS.md`.
  - Do NOT include real credentials in snippets (use placeholders).

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation-heavy; minimal code.
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 10)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Task 8

  **References**:
  - `backend/Makefile` - existing target structure (migrate-up, run).
  - opencode docs: https://opencode.ai/docs/mcp-servers (verify URL via librarian if uncertain).
  - Claude Code MCP docs: https://docs.claude.com/en/docs/claude-code/mcp

  **Acceptance Criteria**:
  - [ ] `make mcp-build` PASS
  - [ ] `make mcp-test` PASS (after Task 10 lands)
  - [ ] README contains both opencode and Claude Code snippets, both with `RISK_APPROVAL_WORKFLOW_ENABLED=false`

  **QA Scenarios**:

  ```
  Scenario: opencode config snippet is valid JSON
    Tool: Bash
    Preconditions: README.md exists
    Steps:
      1. Extract opencode JSON snippet via awk between fence markers
      2. Pipe to `jq .` — must succeed
      3. Assert .mcpServers.manris.env.RISK_APPROVAL_WORKFLOW_ENABLED == "false"
    Expected Result: jq exits 0; assertion passes
    Evidence: .sisyphus/evidence/task-9-opencode-config.json

  Scenario: make mcp-build succeeds from clean state
    Tool: Bash
    Preconditions: rm -f backend/bin/mcp
    Steps:
      1. cd backend && make mcp-build
      2. Assert backend/bin/mcp exists and is executable
    Expected Result: binary present, mode 0755
    Evidence: .sisyphus/evidence/task-9-build.txt
  ```

  **Commit**: YES
  - Message: `docs(mcp): add Makefile targets, README, client configs`
  - Files: `backend/Makefile`, `backend/internal/mcp/README.md`
  - Pre-commit: `make mcp-build`

- [x] 10. **Integration test harness (JSON-RPC over stdio, build tag `integration`)**

  **What to do**:
  - Create `backend/cmd/mcp/integration_test.go` with `//go:build integration`.
  - Helper: `spawnServer(t)` — `exec.Command("go","run","./cmd/mcp")` with stdin/stdout pipes; returns `(stdin io.Writer, stdout *json.Decoder, cleanup func())`.
  - Helper: `call(t, stdin, stdout, method, params) result` — send JSON-RPC frame, read response, fail t on error.
  - Test scenarios (mirror QA evidence in Tasks 4-8):
    1. `TestMCP_Initialize` — handshake completes, capabilities returned.
    2. `TestMCP_ToolsList_Returns7Tools` — exact name set.
    3. `TestMCP_LoginThenListRisks_OrgScoped` — login as unit user; list_risks returns only own org.
    4. `TestMCP_CreateAndApprove_FlagFalse` — create returns final_status=approved.
    5. `TestMCP_UpdateMonitoringDraft_RejectsApproved` — error returned.
  - Use a real test DB seeded by existing migrations + a fixture SQL script `backend/cmd/mcp/testdata/seed.sql` (users + 1 org).
  - DB connection via env `TEST_DATABASE_URL` (default to local manris_test).

  **Must NOT do**:
  - Do NOT mock usecases — this is end-to-end.
  - Do NOT hard-code UUIDs; query them post-seed.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Process spawning + JSON-RPC framing + DB seeding.
  - **Skills**: [`test-driven-development`, `golang-pro`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 9)
  - **Parallel Group**: Wave 5
  - **Blocks**: None
  - **Blocked By**: Tasks 6, 7, 8

  **References**:
  - mcp-go protocol version: `2024-11-05`.
  - JSON-RPC 2.0 framing: newline-delimited JSON over stdio.
  - `backend/db/migrations/000001_initial_schema.up.sql` - seed user pattern.

  **Acceptance Criteria**:
  - [ ] `cd backend && go test -tags=integration ./cmd/mcp/...` PASS (all 5 tests)
  - [ ] Tests gated by build tag — default `go test ./...` does NOT run them
  - [ ] Each test produces evidence file in `.sisyphus/evidence/task-10-<name>.json` via t.Logf or os.WriteFile

  **QA Scenarios**:

  ```
  Scenario: full integration suite green
    Tool: Bash
    Preconditions: TEST_DATABASE_URL set, migrations applied, seed.sql ran
    Steps:
      1. cd backend && go test -tags=integration -v ./cmd/mcp/... 2>&1 | tee /tmp/mcp-int.log
      2. grep "^--- PASS:" /tmp/mcp-int.log | wc -l → expect 5
      3. grep "^--- FAIL:" /tmp/mcp-int.log → expect empty
    Expected Result: 5 PASS, 0 FAIL
    Evidence: .sisyphus/evidence/task-10-integration-suite.log

  Scenario: default go test excludes integration tests
    Tool: Bash
    Preconditions: clean repo
    Steps:
      1. cd backend && go test ./cmd/mcp/... 2>&1 | tee /tmp/mcp-default.log
      2. Assert "[no test files]" or "PASS" with 0 tests run for cmd/mcp
    Expected Result: integration tests skipped without tag
    Evidence: .sisyphus/evidence/task-10-default-skip.log
  ```

  **Commit**: YES
  - Message: `test(mcp): add JSON-RPC stdio integration tests`
  - Files: `backend/cmd/mcp/integration_test.go`, `backend/cmd/mcp/testdata/seed.sql`
  - Pre-commit: `go test -tags=integration ./cmd/mcp/...`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read this plan end-to-end. For each "Must Have": verify implementation exists (read file, run binary, assert behavior). For each "Must NOT Have": grep codebase for forbidden patterns (calls to `ApprovalActionUseCase` from MCP layer, multi-session map, JWT in tool output, modifications to existing usecase files outside bootstrap.go) — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `go build ./...`, `go vet ./...`, `go test ./...`, `go test -tags=integration ./cmd/mcp/...`. Review all new files for: empty error returns, `interface{}` abuse, leftover `fmt.Println`, commented-out code, AI slop (over-abstraction, generic names like `data/result/item/temp`, redundant comments), tool description bloat (>200 chars).
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Set `RISK_APPROVAL_WORKFLOW_ENABLED=false`, build binary, execute EVERY QA scenario from EVERY task via JSON-RPC over stdin. Verify DB state via psql. Test sequence: login → list_risks → create_and_approve_risk (assert status=approved) → get_risk → update_risk_draft (on a draft) → monitor_and_approve_risk → update_monitoring_draft. Save raw JSON-RPC traces to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Negative [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git log/diff`). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec (no creep). Special check: bootstrap refactor commit MUST be mechanical only (no new interfaces/abstractions). Verify no usecase code was modified outside DI wiring. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Bootstrap [MECHANICAL/IMPURE] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

Atomic, single-purpose commits. **MUST NOT squash** bootstrap refactor with MCP code.

1. **T1**: `refactor(backend): extract DI to internal/bootstrap` — mechanical only, all existing tests pass, server runs identical
2. **T2**: `feat(mcp): add session manager with expiry` — pure package + unit tests
3. **T3**: `feat(mcp): add usecase input mapping helpers` — table-driven tests
4. **T4+T5**: `feat(mcp): add auth and query tools` — login, get_risk, list_risks
5. **T6**: `feat(mcp): add risk write tools` — create_and_approve_risk, update_risk_draft
6. **T7**: `feat(mcp): add monitoring tools` — monitor_and_approve_risk, update_monitoring_draft
7. **T8+T10**: `feat(mcp): add cmd/mcp binary and integration tests` — main.go + JSON-RPC harness
8. **T9**: `docs(mcp): add README with opencode/Claude Code config and tool catalog`

Each commit MUST: build green, vet clean, existing tests pass.

---

## Success Criteria

### Verification Commands
```bash
# Build
cd backend && go build ./...                            # Expected: clean
go vet ./...                                            # Expected: clean

# Tests
go test ./internal/...                                  # Expected: all PASS
go test -tags=integration ./cmd/mcp/...                 # Expected: all PASS

# Binary
make build-mcp                                          # Expected: bin/mcp created
ls -lh bin/mcp                                          # Expected: ~15-25MB

# Smoke test (list tools)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | RISK_APPROVAL_WORKFLOW_ENABLED=false ./bin/mcp \
  | jq '.result.tools | length'                         # Expected: 7

# End-to-end (login + create + verify approved)
# See task QA scenarios for full JSON-RPC flow
```

### Final Checklist
- [ ] All 7 tools registered and listable via `tools/list`
- [ ] `RISK_APPROVAL_WORKFLOW_ENABLED=false` causes auto-approval
- [ ] Session expiry enforced
- [ ] All "Must NOT Have" guardrails verified absent
- [ ] opencode config snippet in README works (manual sanity check by user post-merge)
- [ ] `cmd/server/main.go` still runs identically (no behavior regression)

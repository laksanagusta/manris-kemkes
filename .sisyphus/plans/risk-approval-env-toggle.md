# Risk Approval Env Toggle

## TL;DR
> **Summary**: Add a backend-only env flag that disables risk/assessment approval workflow, makes new submissions land directly in `approved`, and exposes an explicit capability so frontend hides approval-line UI and review actions without deleting dormant approval code.
> **Deliverables**:
> - Backend env flag `RISK_APPROVAL_WORKFLOW_ENABLED` with fail-safe default `true`
> - Auth/session capability contract for frontend consumption
> - Risk + assessment submit bypass that skips approval request creation
> - Frontend register/assessment/monitoring surfaces that follow backend capability
> - Dual-mode regression coverage for enabled and disabled modes
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: 1 → 2 → 3 → 4 → 5/6/7

## Context
### Original Request
- Hide the approval line temporarily for risk registration and risk monitoring.
- When a risk is processed, it should go straight to approved.
- Do not remove the approval feature permanently.
- Backend must be the source of truth and frontend must follow backend behavior.
- Final infrastructure choice: use an env toggle, not Firebase and not runtime DB settings.

### Interview Summary
- Scope is limited to **risk** and **assessment/pemantauan** approval workflow.
- Incident, KRI, working paper, and other approval systems stay unchanged.
- The toggle is deploy-time only: changing it requires backend restart/redeploy.
- Existing dormant approval components must remain in code so the feature can be re-enabled later.
- Existing pending approval rows created before the toggle is disabled are preserved; the bypass only affects **new** risk/assessment submissions.

### Metis Review (gaps addressed)
- Expose an **explicit capability** from backend; frontend must not infer disablement from missing `approvalId` or missing workflow payloads.
- Keep backend safe for stale clients: old UI posting `/approvals/submit` must still produce a correct end state instead of creating stuck review state.
- Reuse the existing terminal domain status `approved`; do not invent a bypass-only status.
- Because the current frontend has no DOM test harness, extract pure decision logic where needed and cover it with `node:test`; use agent-executed browser QA for rendered behavior.

## Work Objectives
### Core Objective
Implement a narrow, reversible env-controlled bypass for risk and assessment approvals so new submissions auto-approve on the backend while frontend hides approval-specific UI based on backend-provided capability.

### Deliverables
- Backend config support for `RISK_APPROVAL_WORKFLOW_ENABLED`
- Auth payload support for `capabilities.riskApprovalWorkflowEnabled`
- Backend submit behavior branch for `requestType in [risk, assessment]`
- Frontend capability plumbing in auth context
- Registration page changes to hide reviewer/approval-line editors and skip `/approvals/submit`
- Assessment page and review side panel changes to hide approval workflow when disabled
- Monitoring panel copy/behavior updates for direct-approval mode
- Regression tests for both modes

### Definition of Done (verifiable conditions with commands)
- `go test ./internal/config ./internal/usecase/auth ./internal/usecase/approval ./internal/handler/http`
- `node --test --experimental-specifier-resolution=node src/lib/risk-approval-line.test.ts src/lib/review-side-panel-access.test.ts src/lib/risk-approval-capability.test.ts` (run in `frontend/`)
- `npm run build` (run in `frontend/`)
- With env disabled, submitting a new risk or assessment creates no pending approval and ends with status `approved`
- With env enabled, existing approval workflow behavior remains intact

### Must Have
- Backend-only env flag; no frontend env flag
- Fail-safe default: unset/invalid env keeps approval workflow enabled
- Capability available in both `/auth/login` session payload and `/auth/me`
- Disabled mode only applies to `risk` and `assessment`
- Existing pending approvals remain processable

### Must NOT Have
- No Firebase, Remote Config, or third-party feature-flag system
- No new status such as `auto_approved`
- No deletion of approval entities, handlers, or UI components
- No change to incident approval behavior
- No frontend heuristics based on absent approval data

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **TDD** with Go unit/integration-style tests plus frontend `node:test`; browser verification is agent-executed Playwright/manual QA because no committed FE DOM harness exists.
- QA policy: Every task includes happy-path and edge/failure validation.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
Wave 1: backend contract + backend bypass foundation (Tasks 1-4)
Wave 2: frontend capability consumers + monitoring regressions (Tasks 5-7)

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2-7
- Task 2 blocks Tasks 5-7
- Task 3 blocks Task 4 and informs Tasks 6-7
- Task 4 blocks Tasks 6-7
- Task 5 blocks Tasks 6-7
- Tasks 6 and 7 can run in parallel after Tasks 1-5

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 4 tasks → `unspecified-high`, `quick`
- Wave 2 → 3 tasks → `unspecified-high`
- Final Verification → 4 tasks → `oracle`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Add backend env flag for risk approval workflow

  **What to do**: Extend `backend/internal/config/config.go` with a boolean `RiskApprovalWorkflowEnabled` loaded from env variable `RISK_APPROVAL_WORKFLOW_ENABLED`. Use fail-safe parsing: if env is unset or invalid, resolve to `true`. Add/update config tests and `.env.example` so the variable is documented with default enabled.
  **Must NOT do**: Do not add a generic `APPROVAL_WORKFLOW_ENABLED` that would disable incident approvals. Do not add any frontend env variable.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: small bounded backend config slice with tests
  - Skills: [`backend-go`, `test-driven-development`] - enforce idiomatic Go config parsing and test-first flow
  - Omitted: [`react-expert`] - no frontend work in this task

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2,3,4,5,6,7] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/config/config.go:11-19` - existing config struct fields
  - Pattern: `backend/internal/config/config.go:45-58` - current `Load()` construction pattern
  - Pattern: `.env.example:13-21` - current backend/frontend env documentation block

  **Acceptance Criteria** (agent-executable only):
  - [ ] `go test ./internal/config` passes with new env-flag coverage
  - [ ] Unset env resolves to enabled (`true`)
  - [ ] Invalid env value resolves to enabled (`true`)
  - [ ] `.env.example` documents `RISK_APPROVAL_WORKFLOW_ENABLED=true`

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Env flag defaults safely
    Tool: Bash
    Steps: Run `go test ./internal/config -run TestLoadRiskApprovalWorkflowEnabledDefaultsToTrue`
    Expected: PASS; output includes `ok` for `./internal/config`
    Evidence: .sisyphus/evidence/task-1-risk-approval-config.txt

  Scenario: Invalid env does not disable approvals accidentally
    Tool: Bash
    Steps: Run `go test ./internal/config -run TestLoadRiskApprovalWorkflowEnabledInvalidFallsBackToTrue`
    Expected: PASS; loader keeps enabled=true on malformed input
    Evidence: .sisyphus/evidence/task-1-risk-approval-config-invalid.txt
  ```

  **Commit**: YES | Message: `feat(config): add risk approval env flag` | Files: [`backend/internal/config/config.go`, `backend/internal/config/config_test.go`, `.env.example`]

- [ ] 2. Expose backend approval capability in auth/session payloads

  **What to do**: Add a nested capability field `capabilities.riskApprovalWorkflowEnabled` to the backend auth payload types used by `/auth/login` and `/auth/me`. Populate it from the config flag in both `buildAuthToken(...)` and `GetCurrentUserUseCase.Execute(...)`. Update auth unit/handler tests to assert the new field in both session restoration and login flows.
  **Must NOT do**: Do not create a new `/capabilities` endpoint. Do not expose a top-level flag outside the user/session payload. Do not leave login payload behind `/auth/me` semantics.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: cross-cutting auth contract change with tests
  - Skills: [`backend-go`, `test-driven-development`] - auth/session contract is backend-owned
  - Omitted: [`react-expert`] - frontend consumption happens later

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [5,6,7] | Blocked By: [1]

  **References**:
  - API/Type: `backend/internal/domain/entity/auth.go:10-39` - auth/session payload structs to extend for login responses
  - API/Type: `backend/internal/domain/entity/auth.go:58-96` - user profile struct returned by `/auth/me`
  - Pattern: `backend/internal/usecase/auth/session.go:12-64` - login/change-password session payload builder
  - Pattern: `backend/internal/usecase/auth/me.go:32-66` - `/auth/me` user profile builder
  - Test: `backend/internal/usecase/auth/me_test.go:57-192` - user profile assertions pattern
  - Test: `backend/internal/handler/http/auth_test.go:22-112` - login payload assertions pattern
  - Test: `backend/internal/handler/http/auth_test.go:114-198` - full-session payload assertions pattern

  **Acceptance Criteria**:
  - [ ] `go test ./internal/usecase/auth ./internal/handler/http -run 'Test(GetCurrentUser|AuthHandlerLogin|AuthHandlerChangePassword)'` passes
  - [ ] `/auth/me` returns `capabilities.riskApprovalWorkflowEnabled=false` when env is disabled
  - [ ] `/auth/login` session payload returns the same capability field
  - [ ] Existing auth fields (`mustChangePassword`, org scope, identity fields) remain unchanged

  **QA Scenarios**:
  ```
  Scenario: Session payload includes explicit capability
    Tool: Bash
    Steps: Run `go test ./internal/handler/http -run TestAuthHandlerLoginReturnsRiskApprovalCapability`
    Expected: PASS; login payload contains `user.capabilities.riskApprovalWorkflowEnabled`
    Evidence: .sisyphus/evidence/task-2-auth-login-capability.txt

  Scenario: /auth/me preserves legacy fields while adding capability
    Tool: Bash
    Steps: Run `go test ./internal/usecase/auth -run TestGetCurrentUserIncludesRiskApprovalCapability`
    Expected: PASS; capability is present and prior scope/profile assertions still pass
    Evidence: .sisyphus/evidence/task-2-auth-me-capability.txt
  ```

  **Commit**: YES | Message: `feat(auth): expose risk approval capability` | Files: [`backend/internal/domain/entity/auth.go`, `backend/internal/usecase/auth/session.go`, `backend/internal/usecase/auth/me.go`, `backend/internal/usecase/auth/me_test.go`, `backend/internal/handler/http/auth_test.go`]

- [ ] 3. Bypass new risk submissions when approval workflow is disabled

  **What to do**: Branch `SubmitApprovalUseCase.Execute(...)` so when `requestType == "risk"` and the env-backed capability is disabled, the use case does not create approval requests/steps/history and instead sets the risk status directly to `approved`. Return a success payload that callers can treat as completed submission. Preserve current behavior for enabled mode and all non-risk request types.
  **Must NOT do**: Do not bypass incidents. Do not write approval rows in disabled mode. Do not return `assessment_in_review` in disabled mode.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: workflow behavior change with persistence impact
  - Skills: [`backend-go`, `test-driven-development`] - usecase behavior must be covered first
  - Omitted: [`react-expert`] - no frontend changes here

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [4,6,7] | Blocked By: [1]

  **References**:
  - Pattern: `backend/internal/usecase/approval/submit.go:74-103` - current validation and forced `assessment_in_review` status write
  - Pattern: `backend/internal/usecase/approval/submit.go:156-193` - current approval request creation and success payload
  - API/Type: `backend/internal/domain/entity/risk.go:20-25` - canonical risk statuses
  - Test: `backend/internal/usecase/approval/submit_test.go:198-250` - existing submit behavior tests
  - Test: `backend/internal/usecase/approval/submit_test.go:252-345` - existing multi-step review submission patterns

  **Acceptance Criteria**:
  - [ ] `go test ./internal/usecase/approval -run 'TestSubmitApprovalUseCase_'` passes
  - [ ] Disabled mode with `requestType=risk` creates no approval request and leaves risk status `approved`
  - [ ] Enabled mode retains existing pending approval flow
  - [ ] Incident submissions remain on legacy approval behavior

  **QA Scenarios**:
  ```
  Scenario: Disabled mode auto-approves new risk submission
    Tool: Bash
    Steps: Run `go test ./internal/usecase/approval -run TestSubmitApprovalUseCase_DisabledRiskWorkflowAutoApprovesRisk`
    Expected: PASS; fake approval repo records no created request and fake risk repo records status `approved`
    Evidence: .sisyphus/evidence/task-3-risk-bypass.txt

  Scenario: Enabled mode still creates pending approval
    Tool: Bash
    Steps: Run `go test ./internal/usecase/approval -run TestSubmitApprovalUseCase_SubmitDraftRisk_UpdatesStatusToInReview`
    Expected: PASS; current pending review path remains unchanged
    Evidence: .sisyphus/evidence/task-3-risk-bypass-regression.txt
  ```

  **Commit**: YES | Message: `feat(approval): bypass risk submissions when disabled` | Files: [`backend/internal/usecase/approval/submit.go`, `backend/internal/usecase/approval/submit_test.go`]

- [ ] 4. Extend bypass coverage to assessment submissions and stale-client safety

  **What to do**: Apply the same disabled-mode bypass to `requestType == "assessment"`. Confirm stale clients calling `/approvals/submit` for assessments still end in a correct `approved` state with no pending approval rows. Keep `ApprovalActionUseCase` behavior unchanged for pre-existing pending approvals created before the toggle changed. Add regression coverage so historical pending approvals can still be acted on.
  **Must NOT do**: Do not block approval actions for already-existing pending approvals. Do not rewrite list/count semantics.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: approval workflow edge-case handling across request types
  - Skills: [`backend-go`, `test-driven-development`] - stale-client/backend safety is the core risk here
  - Omitted: [`react-expert`] - no frontend work here

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [6,7] | Blocked By: [1,3]

  **References**:
  - Pattern: `backend/internal/usecase/approval/submit.go:69-90` - request type validation and existing pending check
  - Pattern: `backend/internal/usecase/approval/action.go:87-149` - current approve/reject finalization for existing pending approvals
  - Pattern: `backend/internal/usecase/approval/action.go:164-176` - risk status update path
  - Test: `backend/internal/usecase/approval/action_test.go:186-258` - existing approval finalization regression patterns
  - Test: `backend/internal/usecase/approval/get_by_entity_test.go:125-187` - assessment-scoped approval lookups

  **Acceptance Criteria**:
  - [ ] `go test ./internal/usecase/approval -run 'Test(SubmitApprovalUseCase_|ApprovalActionUseCase_|GetApprovalByEntityUseCase_)'` passes
  - [ ] Disabled mode with `requestType=assessment` creates no pending approval rows and lands the draft in `approved`
  - [ ] Existing pending approvals still complete through `ApprovalActionUseCase`
  - [ ] No new list/count branching is introduced for incidents or legacy approvals

  **QA Scenarios**:
  ```
  Scenario: Disabled mode auto-approves reassessment submit from stale client
    Tool: Bash
    Steps: Run `go test ./internal/usecase/approval -run TestSubmitApprovalUseCase_DisabledRiskWorkflowAutoApprovesAssessment`
    Expected: PASS; assessment submission returns success with no pending approval rows
    Evidence: .sisyphus/evidence/task-4-assessment-bypass.txt

  Scenario: Existing pending approvals still work after toggle introduction
    Tool: Bash
    Steps: Run `go test ./internal/usecase/approval -run TestApprovalActionUseCase_ApproveReassessmentActivatesNewCurrentVersion`
    Expected: PASS; pre-existing pending reassessment approvals remain actionable
    Evidence: .sisyphus/evidence/task-4-assessment-existing-pending.txt
  ```

  **Commit**: YES | Message: `feat(approval): auto-approve assessments when disabled` | Files: [`backend/internal/usecase/approval/submit.go`, `backend/internal/usecase/approval/submit_test.go`, `backend/internal/usecase/approval/action_test.go`, `backend/internal/usecase/approval/get_by_entity_test.go`]

- [ ] 5. Add frontend capability parsing and shared pure decision helpers

  **What to do**: Extend the auth context user model so it stores `capabilities.riskApprovalWorkflowEnabled` from backend auth payloads. Extract a small pure helper module (e.g. `frontend/src/lib/risk-approval-capability.ts`) that centralizes decisions such as whether to show approval-line editors, whether to call `/approvals/submit`, and whether direct-save copy should be used. Cover the helper with `node:test`.
  **Must NOT do**: Do not add a frontend env. Do not infer disablement from `approvalId` absence. Do not embed capability branching separately in each page without a shared helper.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: shared frontend state contract that multiple pages depend on
  - Skills: [`react-expert`, `test-driven-development`] - TypeScript state + pure helper extraction
  - Omitted: [`frontend-design`] - no visual redesign

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [6,7] | Blocked By: [1,2]

  **References**:
  - Pattern: `frontend/src/contexts/auth-context.tsx:21-37` - current `User` shape
  - Pattern: `frontend/src/contexts/auth-context.tsx:38-83` - raw → parsed user mapping
  - Pattern: `frontend/src/contexts/auth-context.tsx:120-140` - auth payload normalization path
  - Pattern: `frontend/src/contexts/auth-context.tsx:236-256` - `/auth/me` restore session flow
  - Test: `frontend/src/lib/review-side-panel-access.test.ts:8-52` - node:test style for pure decision logic
  - Test: `frontend/src/lib/risk-approval-line.test.ts:93-187` - helper extraction and assertion style

  **Acceptance Criteria**:
  - [ ] `node --test --experimental-specifier-resolution=node src/lib/risk-approval-capability.test.ts src/lib/review-side-panel-access.test.ts src/lib/risk-approval-line.test.ts` passes in `frontend/`
  - [ ] Auth context stores backend capability without breaking existing login/session restore behavior
  - [ ] Shared helper returns explicit booleans for register, assessment, and monitoring decisions

  **QA Scenarios**:
  ```
  Scenario: Frontend parses backend capability correctly
    Tool: Bash
    Steps: Run `node --test --experimental-specifier-resolution=node src/lib/risk-approval-capability.test.ts`
    Expected: PASS; helper covers enabled and disabled payload shapes
    Evidence: .sisyphus/evidence/task-5-frontend-capability-tests.txt

  Scenario: Legacy helper behavior remains stable
    Tool: Bash
    Steps: Run `node --test --experimental-specifier-resolution=node src/lib/review-side-panel-access.test.ts src/lib/risk-approval-line.test.ts`
    Expected: PASS; existing pure helper regressions continue to pass
    Evidence: .sisyphus/evidence/task-5-frontend-helper-regression.txt
  ```

  **Commit**: YES | Message: `feat(frontend): parse risk approval capability` | Files: [`frontend/src/contexts/auth-context.tsx`, `frontend/src/lib/risk-approval-capability.ts`, `frontend/src/lib/risk-approval-capability.test.ts`]

- [ ] 6. Update risk register page to follow backend capability

  **What to do**: Change the new risk registration flow so when `riskApprovalWorkflowEnabled` is false it hides the reviewer picker and `OrderedUserSelectionTable`, saves the risk directly, skips `/approvals/submit`, and uses direct-approval success copy. When enabled, preserve the existing reviewer/approval-line validation and submit behavior. Keep the dormant approval UI code path behind the capability branch.
  **Must NOT do**: Do not remove the approval-line components. Do not leave validation requiring reviewer/approver when disabled. Do not change draft save semantics.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: large page-level orchestration change with conditional UX
  - Skills: [`react-expert`, `test-driven-development`] - page branching and helper use
  - Omitted: [`frontend-design`] - wording/visibility only, not a redesign

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: [1,2,3,5]

  **References**:
  - Pattern: `frontend/src/app/(app)/risk/register/new/page.tsx:1269-1359` - draft payload currently includes `draftApprovalLine`
  - Pattern: `frontend/src/app/(app)/risk/register/new/page.tsx:1361-1430` - current save vs submit flow and `/approvals/submit` call
  - Pattern: `frontend/src/app/(app)/risk/register/new/page.tsx:2946-2975` - approval-line editor block to hide when disabled
  - Pattern: `frontend/src/app/(app)/risk/register/new/page.tsx:3023-3033` - review side panel placement
  - Pattern: `frontend/src/lib/api.ts:1-31` - frontend API base and request helper

  **Acceptance Criteria**:
  - [ ] `npm run build` passes in `frontend/`
  - [ ] Disabled mode no longer requires reviewer/approval line to submit a new risk
  - [ ] Disabled mode does not call `/approvals/submit`
  - [ ] Enabled mode still requires reviewer/approval line and still posts `/approvals/submit`

  **QA Scenarios**:
  ```
  Scenario: Disabled mode hides approval line on new risk registration
    Tool: Playwright
    Steps: Log in with backend env disabled; open `/risk/register/new`; assert text `Approval Line (Pimpinan)` is absent; fill minimum required risk fields; click button `Ajukan review`; wait for navigation to `/risk/register`
    Expected: No request to `/approvals/submit`; success toast reflects direct approval/save path
    Evidence: .sisyphus/evidence/task-6-register-disabled.png

  Scenario: Enabled mode keeps legacy approval submission path
    Tool: Playwright
    Steps: Log in with backend env enabled; open `/risk/register/new`; assert text `Approval Line (Pimpinan)` is visible; select a reviewer; add one approver row; click button `Ajukan review`; confirm the submit dialog if shown
    Expected: Request to `/approvals/submit` occurs and success toast mentions review/approval submission
    Evidence: .sisyphus/evidence/task-6-register-enabled.png
  ```

  **Commit**: YES | Message: `feat(risk): follow approval capability on register page` | Files: [`frontend/src/app/(app)/risk/register/new/page.tsx`, `frontend/src/lib/risk-approval-capability.ts`]

- [ ] 7. Update assessment and monitoring surfaces to follow backend capability

  **What to do**: Apply the same capability branch to the assessment page and shared `ReviewSidePanel`. In disabled mode, hide the reviewer/approval-line editors on assessment, hide approval action controls in `ReviewSidePanel`, and update monitoring panel copy so it no longer tells users to expect a pending-approval stage for new cycles. Preserve existing pending-approval badges/Inbox links for legacy rows that already exist.
  **Must NOT do**: Do not blanket-hide existing pending items in monitoring or inbox. Do not break `ReviewSidePanel` for records that still have real approval workflow data.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multiple frontend surfaces with shared approval behavior
  - Skills: [`react-expert`, `test-driven-development`] - coordinated page/component changes
  - Omitted: [`frontend-design`] - no layout redesign required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: [1,2,4,5]

  **References**:
  - Pattern: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx:547-587` - current assessment submit payload and `/approvals/submit` call
  - Pattern: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx:1067-1094` - assessment approval-line editor block
  - Pattern: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx:1118-1128` - shared review panel usage
  - Pattern: `frontend/src/components/risk/review-side-panel.tsx:82-129` - current workflow-stage resolution and early-return behavior
  - Pattern: `frontend/src/components/risk/review-side-panel.tsx:142-189` - current approve/reject action posts
  - Pattern: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:394-423` - monitoring helper text referencing pending approval
  - Pattern: `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx:594-615` - pending approval CTA and status badge behavior
  - Pattern: `frontend/src/app/(app)/inbox/page.tsx:56-70` - legacy approval request shape; preserve compatibility for existing pending rows

  **Acceptance Criteria**:
  - [ ] `npm run build` passes in `frontend/`
  - [ ] Disabled mode assessment page hides reviewer/approval-line editors and skips `/approvals/submit`
  - [ ] Disabled mode `ReviewSidePanel` does not render approval actions for new bypassed records
  - [ ] Monitoring helper text stops implying that new reassessments will enter `pending_approval` while disabled
  - [ ] Existing pending rows still show status/Inbox affordances

  **QA Scenarios**:
  ```
  Scenario: Disabled mode hides assessment approval controls
    Tool: Playwright
    Steps: Log in with backend env disabled; open an assessment draft page `/risk/assessment/{id}`; assert text `Approval Line (Pimpinan)` is absent; click button `Ajukan review`; reload the page
    Expected: No `/approvals/submit` request occurs; page shows approved/final state without review action buttons
    Evidence: .sisyphus/evidence/task-7-assessment-disabled.png

  Scenario: Legacy pending rows still surface correctly in monitoring
    Tool: Playwright
    Steps: Seed or reuse a record already in `pending_approval`; open `/compliance/monitoring`; filter status to `Pending Approval`; inspect the matching row
    Expected: The row still shows badge `Pending Approval` and Inbox link even when the env flag is disabled for new submissions
    Evidence: .sisyphus/evidence/task-7-monitoring-legacy-pending.png
  ```

  **Commit**: YES | Message: `feat(risk): follow approval capability on assessment` | Files: [`frontend/src/app/(app)/risk/assessment/[id]/page.tsx`, `frontend/src/components/risk/review-side-panel.tsx`, `frontend/src/app/(app)/compliance/_components/risk-review-panel.tsx`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after every numbered task.
- Keep commit boundaries aligned with the task list above.
- Do not squash backend contract, backend bypass, and frontend consumer changes into one commit.

## Success Criteria
- New risk submissions with `RISK_APPROVAL_WORKFLOW_ENABLED=false` become `approved` without approval rows.
- New assessment submissions with `RISK_APPROVAL_WORKFLOW_ENABLED=false` become `approved` without approval rows.
- Register/assessment pages hide approval-line UI when the backend capability is false.
- Frontend behavior is driven only by backend-provided capability, not by local env or inferred payload absence.
- Enabled mode remains backward compatible for risk/assessment approval workflows.
- Existing legacy pending approvals remain viewable/actionable until manually resolved.

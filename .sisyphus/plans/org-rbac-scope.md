# Organization-Scoped RBAC for Parent/Child Organizations

## TL;DR
> **Summary**: Enforce organization-based data isolation at the backend as the source of truth, then align frontend behavior so each user only sees data from their own organization while parent-organization users gain read-only visibility into descendant child data.
> **Deliverables**:
> - Request-scoped backend access-scope contract derived from JWT + organization hierarchy
> - Scope enforcement across protected read/detail/dashboard/report/mutate flows
> - Frontend session/UI alignment with backend org scope and read-only parent-child behavior
> - Focused regression tests and agent-executed QA evidence for leak prevention
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2 → 4/5/6/7/8 → 9

## Context
### Original Request
Implement RBAC starting with organization access rules: every user can only access data from their own organization, and users whose organization is a parent can see all data from child organizations.

### Interview Summary
- Phase 1 scope is **backend + frontend consistency**.
- Parent → child inheritance is **read-only only** in phase 1.
- Parent users do **not** inherit create/update/delete/approve rights over child data.
- Verification strategy is **minimal automated tests** plus agent-executed QA on critical paths.

### Metis Review (gaps addressed)
- Use a **single backend access-scope source of truth**; do not trust client-supplied `org_id` for authorization.
- Apply **deny-by-default** behavior when a protected request lacks a valid organization context.
- Normalize or centralize role checks because current code mixes `superadmin`, `super_admin`, and `admin` role handling.
- Treat client org filters as **narrowing-only** within accessible descendants, never as scope expansion.
- Keep phase 1 focused on **business-data resources**; do not expand into unrelated delegated-admin redesign.

## Work Objectives
### Core Objective
Make organization scope mandatory and consistent for protected data access across backend and frontend, with backend enforcement derived from the authenticated user’s organization and descendant hierarchy.

### Deliverables
- Shared backend access-scope contract containing authenticated user identity, normalized role, root organization ID, and accessible descendant organization IDs.
- Scope-aware handler/usecase/repository flow for protected resources: risks, incidents, controls, KRIs, lessons, meeting minutes, forms, dashboards, and reports.
- Explicit policy split between read inheritance and write/approve permissions.
- Frontend auth/session behavior that uses backend-provided org context and avoids presenting out-of-scope data affordances.
- Regression coverage and QA evidence for sibling isolation, parent-child visibility, detail endpoint hardening, and aggregate/report leakage prevention.

### Definition of Done (verifiable conditions with commands)
- Protected backend list/detail/report/dashboard endpoints derive authorization from JWT org context instead of trusting arbitrary client org filters.
- Parent-org users can read descendant data but cannot mutate or approve descendant-owned records in this wave.
- Unauthorized direct-object access is indistinguishable from not-found behavior on protected detail endpoints.
- Frontend build succeeds and frontend automated tests covering org-scope helpers/auth shape pass.
- Backend automated tests covering scope derivation and protected-path regressions pass.
- Suggested verification commands:
  - `go test ./internal/domain/service ./internal/usecase/auth ./internal/usecase/risk ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson ./internal/usecase/form ./internal/usecase/meeting_minute ./internal/usecase/report ./internal/repository/postgres`
  - `npm test`
  - `npm run build`

### Must Have
- Backend remains the authorization source of truth.
- Descendant access uses existing organization hierarchy service and recursive descendant lookup.
- All protected aggregates/dashboards/reports use the same accessible-org calculation as list/detail flows.
- Role alias handling is centralized to avoid bypasses caused by inconsistent strings.
- Client-requested organization filters only narrow within already-accessible organizations.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No frontend-only filtering used as the security boundary.
- No silent global bypass for protected business data because of legacy admin-role shortcuts.
- No parent-child inherited write/delete/approve access in this wave.
- No new multi-org-membership model, sharing model, or delegated-admin redesign.
- No expansion into unrelated source-code cleanup outside the touched authorization paths.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **Minimal automated tests** using existing Go unit/integration patterns plus frontend `node --test`; no new e2e framework setup in this wave.
- QA policy: Every task includes agent-executed scenarios for both happy-path and failure-path behavior.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: T1 access-scope contract, T2 scope-aware usecase/repository pattern, T3 handler/org-filter normalization

Wave 2: T4 risk/dashboard/report enforcement, T5 incident enforcement, T6 control/KRI/lesson enforcement, T7 form/meeting-minute enforcement, T8 frontend alignment

Wave 3: T9 focused regression coverage and leak checks

### Dependency Matrix (full, all tasks)
- T1 blocks T2-T9
- T2 blocks T3-T9
- T3 blocks T4-T8
- T4 blocks T9
- T5 blocks T9
- T6 blocks T9
- T7 blocks T9
- T8 blocks T9
- T9 blocks final verification wave

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `backend-go`, `deep`
- Wave 2 → 5 tasks → `backend-go`, `react-expert`, `unspecified-high`
- Wave 3 → 1 task → `backend-go`, `react-expert`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Build the backend access-scope contract

  **What to do**: Introduce a shared backend authorization contract (for example `AccessScope`) that is resolved once per protected request from JWT locals + organization hierarchy. The contract must contain authenticated user ID, raw role, normalized role, root organization ID, and descendant `accessible_org_ids`. Normalize current role aliases so `superadmin`, `super_admin`, and `admin` do not diverge in enforcement code. Extend the authenticated user shape returned to the frontend (`/auth/me` and login response if needed) with the minimum org-scope metadata required for UI consistency; do not expose write inheritance because phase 1 is read-only only.
  **Must NOT do**: Do not add multi-org membership, org switching, or delegated-admin rules. Do not leave protected requests working with a nil org scope unless the endpoint is explicitly marked out of scope for phase 1.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is cross-cutting authorization plumbing spanning middleware, auth usecases, and shared policy types.
  - Skills: [`backend-go`] - needed for idiomatic Go contracts, dependency flow, and test design.
  - Omitted: [`api-designer`] - no public API redesign beyond auth payload enrichment.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 5, 6, 7, 8, 9] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/middleware/auth.go:13-20` - JWT claims already carry `userId`, `role`, and `organizationId`.
  - Pattern: `backend/internal/middleware/auth.go:38-64` - current middleware stores auth claims in Fiber locals; this is the handoff point for scope resolution.
  - Pattern: `backend/internal/domain/service/organization_hierarchy.go:22-52` - existing descendant lookup already models “own org + descendants”.
  - Pattern: `backend/internal/repository/postgres/organization.go:94-128` - recursive CTE for descendant org IDs; reuse instead of inventing a new tree traversal.
  - Pattern: `backend/internal/domain/entity/user.go:17-19` - canonical user org fields already exist.
  - Guardrail: `backend/internal/domain/entity/user.go:42-74` - current role helpers use `superadmin`, which conflicts with other code paths.
  - Guardrail: `backend/internal/usecase/form/list.go:41-45` - existing form access treats `super_admin` and `admin` as special cases; this must be normalized through one shared role policy.
  - API/Type: `backend/internal/usecase/auth/me.go:31-56` - `/auth/me` response is the safest place to expose derived org-scope metadata to the frontend.
  - API/Type: `backend/internal/usecase/auth/login.go:66-97` - login response currently returns only token + basic user info.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A shared backend access-scope type exists and is used as the source of truth for protected org authorization.
  - [ ] Role normalization is centralized and covered by automated tests for `superadmin`, `super_admin`, and `admin` alias handling.
  - [ ] Protected requests without a valid organization context fail closed unless explicitly marked out of scope.
  - [ ] Auth payload(s) expose enough org-scope metadata for frontend read-only rendering without creating write inheritance.
  - [ ] `go test ./internal/domain/service ./internal/usecase/auth` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Access scope resolves own org plus descendants
    Tool: Bash
    Steps: Run `go test ./internal/domain/service ./internal/usecase/auth -run 'TestResolveAccessScopeIncludesDescendants|TestNormalizeRoleAliases' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm descendant org IDs are included and role aliases normalize to one policy branch
    Evidence: .sisyphus/evidence/task-1-access-scope.txt

  Scenario: Protected request without org fails closed
    Tool: Bash
    Steps: Run `go test ./internal/usecase/auth -run 'TestResolveAccessScopeRejectsMissingProtectedOrg' -count=1` from `backend/`
    Expected: Exit code 0; test proves missing protected org context is rejected instead of falling back to global access
    Evidence: .sisyphus/evidence/task-1-access-scope-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): add request-scoped organization access context` | Files: [backend/internal/middleware/auth.go, backend/internal/domain/service/*, backend/internal/usecase/auth/*, backend/internal/domain/entity/user.go]

- [x] 2. Make protected repository and usecase reads scope-aware by default

  **What to do**: Change the protected backend access pattern so direct-object reads cannot bypass organization scope. For protected business-data repositories (risks, incidents, controls, KRIs, lessons, meeting minutes, forms where applicable), make `GetByID`-style access scope-aware by accepting accessible org IDs directly or by introducing a single shared scoped-read helper that the usecase must call before returning data. Use the stricter option: change protected repository detail methods to require `orgIDs []uuid.UUID` and update usecases to pass the resolved access scope. For create/update/delete paths, validate the target record’s org ownership with scoped detail reads before performing mutation; do not rely on UI or handler filtering.
  **Must NOT do**: Do not leave old unscoped `GetByID` calls on protected paths. Do not change mutation semantics so parent users gain inherited write/delete/approve access.

  **Recommended Agent Profile**:
  - Category: `backend-go` - Reason: interface changes ripple through multiple Go usecases and repositories.
  - Skills: [`backend-go`] - needed for interface refactors, repository contracts, and focused regression tests.
  - Omitted: [`microservices-architect`] - no service-boundary redesign is needed.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3, 4, 5, 6, 7, 8, 9] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - API/Type: `backend/internal/domain/repository/risk.go:10-39` - current risk repository already scopes list-style methods but leaves `GetByID`, `Update`, and `Delete` unscoped.
  - Pattern: `backend/internal/usecase/incident/basic.go:14-32` - incident detail currently calls unscoped `GetByID`.
  - Pattern: `backend/internal/usecase/incident/basic.go:108-159` - incident update fetches and mutates records without org authorization.
  - Pattern: `backend/internal/usecase/incident/basic.go:195-214` - incident delete fetches unscoped existence before deletion.
  - Pattern: `backend/internal/usecase/control/basic.go:14-68` - control detail/list split mirrors the same list-scoped vs detail-unscoped gap.
  - Pattern: `backend/internal/usecase/control/basic.go:110-194` - control update/delete paths currently only check existence.
  - Pattern: `backend/internal/usecase/kri/basic.go:14-68` - KRI detail is unscoped while list is org-aware.
  - Pattern: `backend/internal/usecase/kri/basic.go:109-187` - KRI update/delete paths currently validate existence, not access scope.
  - Pattern: `backend/internal/usecase/lesson/basic.go:14-68` - lesson detail is unscoped while list is org-aware.
  - Pattern: `backend/internal/usecase/lesson/basic.go:108-218` - lesson update/delete/dashboard need the same scoped-read pattern.
  - Pattern: `backend/internal/usecase/meeting_minute/list.go:32-39` - meeting-minute list forwards caller-supplied org filters without a shared access-scope contract yet.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Protected detail access requires backend org scope and no longer returns sibling-organization records.
  - [ ] Protected update/delete flows verify scoped ownership before mutating records.
  - [ ] Parent-org users remain read-only on child-owned records even when the record is discoverable.
  - [ ] Out-of-scope detail access resolves to not-found semantics on protected business-data resources.
  - [ ] `go test ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Scoped detail read succeeds only inside accessible descendants
    Tool: Bash
    Steps: Run `go test ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson -run 'Test.*ScopedGetByIDAllowsAccessibleOrg|Test.*ScopedGetByIDReturnsNotFoundForSiblingOrg' -count=1` from `backend/`
    Expected: Exit code 0; tests prove direct detail fetches are denied for sibling org data and allowed for own/descendant org data
    Evidence: .sisyphus/evidence/task-2-scoped-detail.txt

  Scenario: Parent cannot mutate descendant-owned records
    Tool: Bash
    Steps: Run `go test ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson -run 'Test.*ParentCannot(Update|Delete|Approve)ChildOwnedRecord' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm read-only inheritance is preserved across mutation paths
    Evidence: .sisyphus/evidence/task-2-scoped-detail-error.txt
  ```

  **Commit**: YES | Message: `refactor(authz): require scoped detail reads for protected resources` | Files: [backend/internal/domain/repository/*, backend/internal/usecase/incident/*, backend/internal/usecase/control/*, backend/internal/usecase/kri/*, backend/internal/usecase/lesson/*, backend/internal/usecase/meeting_minute/*]

- [x] 3. Route protected handlers through server-derived org scope and narrowing-only filters

  **What to do**: Update protected HTTP handlers and usecase inputs so authorization is derived from the authenticated access scope, not from client-provided `org_id`. When a request omits `org_id`, use the authenticated root org and descendants automatically. When a request provides `org_id`, validate that it belongs to the caller’s `accessible_org_ids`; if valid, treat it as a narrowing filter, not a privilege expansion. Return `403` for explicit out-of-scope org filter requests, but continue using `404`-style behavior for direct protected object access. Keep organization master-data endpoints (`organization/list`, user/org administration) out of this wave except for whatever auth payload support is required by T1.
  **Must NOT do**: Do not remove useful narrowing filters for legitimate descendants. Do not retrofit unrelated admin master-data flows into the same wave.

  **Recommended Agent Profile**:
  - Category: `backend-go` - Reason: handler-to-usecase input normalization is a backend plumbing refactor with consistent error semantics.
  - Skills: [`backend-go`] - needed for handler parsing, auth-local usage, and precise HTTP error semantics.
  - Omitted: [`api-designer`] - endpoint shapes remain materially the same.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4, 5, 6, 7, 8, 9] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/middleware/auth.go:59-64` - current auth middleware already exposes `userId`, `role`, and `organizationId` through Fiber locals.
  - Pattern: `backend/internal/usecase/risk/list.go:31-47` - risk listing already converts one org into descendant org IDs; refactor callers so the org comes from access scope by default.
  - Pattern: `backend/internal/usecase/incident/basic.go:51-67` - incident list uses the same descendant conversion pattern.
  - Pattern: `backend/internal/usecase/control/basic.go:51-68` - control list already supports org-based list narrowing.
  - Pattern: `backend/internal/usecase/kri/basic.go:51-68` - KRI list mirrors the same pattern.
  - Pattern: `backend/internal/usecase/lesson/basic.go:51-68` - lesson list mirrors the same pattern.
  - Pattern: `backend/internal/usecase/meeting_minute/list.go:32-39` - meeting-minute listing still forwards raw org filters.
  - Guardrail: `backend/internal/usecase/organization/list.go:22-30` - organization master-data listing is currently global and is intentionally excluded from phase 1 hardening.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Protected handlers no longer require callers to supply their own organization for baseline authorization.
  - [ ] Caller-supplied org filters are accepted only when they narrow inside accessible descendants.
  - [ ] Explicit out-of-scope org filter requests return `403`, while protected object access continues to return not-found semantics.
  - [ ] Organization master-data listing remains intentionally unchanged and explicitly excluded from phase 1.
  - [ ] `go test ./internal/usecase/risk ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson ./internal/usecase/meeting_minute` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Missing org filter falls back to authenticated org scope
    Tool: Bash
    Steps: Run `go test ./internal/usecase/risk ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson ./internal/usecase/meeting_minute -run 'Test.*DefaultsToAuthenticatedOrgScope' -count=1` from `backend/`
    Expected: Exit code 0; tests prove list endpoints still return only own/descendant data when `org_id` is omitted
    Evidence: .sisyphus/evidence/task-3-handler-scope.txt

  Scenario: Explicit sibling org filter is rejected
    Tool: Bash
    Steps: Run `go test ./internal/usecase/risk ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson ./internal/usecase/meeting_minute -run 'Test.*RejectsOutOfScopeOrgFilter' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm sibling-org filter requests produce forbidden semantics instead of widened access
    Evidence: .sisyphus/evidence/task-3-handler-scope-error.txt
  ```

  **Commit**: YES | Message: `refactor(authz): derive protected org filters from auth scope` | Files: [backend/internal/handler/http/*, backend/internal/usecase/risk/*, backend/internal/usecase/incident/*, backend/internal/usecase/control/*, backend/internal/usecase/kri/*, backend/internal/usecase/lesson/*, backend/internal/usecase/meeting_minute/*]

- [x] 4. Enforce org scope for risks, executive dashboards, and report generation

  **What to do**: Apply the scoped access contract to all risk-centric user-facing flows. Keep existing list-style org filtering, but ensure risk detail reads, review queues, approved-risk lists, and any dashboard/report queries derive `orgIDs` from the authenticated access scope. Replace the current `nil` org usage in executive dashboard and report generation with scoped descendant org IDs so counts, heatmaps, trend lines, and top-risk outputs cannot leak sibling-org data. Where repo dashboard methods currently lack org parameters, add scoped variants and route user-facing calls through them. If a method truly must remain global for a non-user-facing internal path, document it as internal-only and keep it off protected routes.
  **Must NOT do**: Do not keep any user-facing risk analytics path on `nil` org scope. Do not let parent users mutate or approve child-owned risks in this wave.

  **Recommended Agent Profile**:
  - Category: `backend-go` - Reason: risk, dashboard, and report hardening is backend-heavy and touches repository/query boundaries.
  - Skills: [`backend-go`] - needed for interface/query updates and regression coverage.
  - Omitted: [`postgres-pro`] - SQL optimization is not the goal; correctness and isolation are.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/risk/list.go:31-47` - canonical descendant-scope pattern already exists for risk lists.
  - API/Type: `backend/internal/domain/repository/risk.go:11-38` - repository contract still mixes scoped list methods with unscoped detail/analytics methods.
  - Guardrail: `backend/internal/usecase/risk/dashboard_phase2.go:70-77` - action-pressure analytics currently call incident/task repos with unscoped inputs.
  - Guardrail: `backend/internal/usecase/risk/dashboard_phase2.go:135-151` - executive alerts currently load snapshots, comparisons, and approved risks with `nil` org scope.
  - Guardrail: `backend/internal/usecase/report/generate.go:37-93` - report generation ignores `input.OrgID` and loads risk/report data globally.
  - Guardrail: `backend/internal/usecase/report/generate.go:153-190` - incident/KRI report helpers currently load unscoped data and filter in memory.
  - Guardrail: `backend/internal/usecase/report/generate.go:192-239` - trend computation currently uses unscoped approved risks.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Risk detail, review, dashboard, and report endpoints all enforce org scope derived from access scope.
  - [ ] No user-facing risk/report flow passes `nil` org IDs into scoped repository methods.
  - [ ] Aggregate outputs (counts, heatmaps, trend data, executive alerts) exclude sibling-org data.
  - [ ] Parent users can read descendant risk/report data but cannot mutate or approve child-owned risks in this wave.
  - [ ] `go test ./internal/usecase/risk ./internal/usecase/report ./internal/repository/postgres` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Parent can read descendant risk dashboards without sibling leakage
    Tool: Bash
    Steps: Run `go test ./internal/usecase/risk ./internal/usecase/report -run 'Test(Risk|Report).*ParentSeesDescendantDataOnly|Test.*DashboardExcludesSiblingOrgAggregates' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm aggregates and reports include descendant data only and exclude sibling-org rows/counts
    Evidence: .sisyphus/evidence/task-4-risk-scope.txt

  Scenario: Risk/report paths do not accept unscoped global fallback
    Tool: Bash
    Steps: Run `go test ./internal/usecase/risk ./internal/usecase/report -run 'Test.*RejectsNilOrgScopeForUserFacingAnalytics|Test.*OutOfScopeRiskDetailReturnsNotFound' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm user-facing analytics cannot run globally and direct out-of-scope risk access returns not-found semantics
    Evidence: .sisyphus/evidence/task-4-risk-scope-error.txt
  ```

  **Commit**: YES | Message: `fix(risk): enforce org scope on detail dashboard and reports` | Files: [backend/internal/usecase/risk/*, backend/internal/usecase/report/*, backend/internal/domain/repository/risk.go, backend/internal/repository/postgres/risk.go]

- [x] 5. Enforce org scope for incidents, including summaries and linked-risk validation

  **What to do**: Make incident detail, list, update, delete, and summary flows use the shared access scope. Scoped detail reads must gate update/delete paths. Incident summary counters must accept only authenticated/narrowed descendant org scope, not arbitrary org strings. When an incident references linked risks, validate that those linked risks are also readable within the same accessible org scope so a parent cannot attach sibling-org risks or mutate descendant data outside phase-1 rules.
  **Must NOT do**: Do not preserve any path where incident existence is checked globally before authorization. Do not allow cross-org linked-risk references through update flows.

  **Recommended Agent Profile**:
  - Category: `backend-go` - Reason: incident access control crosses detail, list, summary, and mutation logic.
  - Skills: [`backend-go`] - needed for usecase-level authorization and regression tests.
  - Omitted: [`api-designer`] - no new endpoint family is required.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/incident/basic.go:14-32` - incident detail is currently unscoped.
  - Pattern: `backend/internal/usecase/incident/basic.go:51-67` - incident list already supports descendant org filtering.
  - Guardrail: `backend/internal/usecase/incident/basic.go:108-159` - incident update performs global existence checks and linked-risk validation without org scope.
  - Guardrail: `backend/internal/usecase/incident/basic.go:176-178` - incident summary currently trusts raw `OrgID` input.
  - Guardrail: `backend/internal/usecase/incident/basic.go:195-214` - incident delete only checks existence, not access scope.
  - Dependency: `backend/internal/domain/repository/risk.go:11-17` - linked-risk validation must use scoped reads, not the current global `GetByID` behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Incident detail/update/delete flows reject sibling-org access and preserve not-found semantics for out-of-scope records.
  - [ ] Incident summary endpoints use authenticated org scope or narrowing-only descendant filters.
  - [ ] Linked-risk validation rejects cross-org associations outside accessible descendant scope.
  - [ ] Parent-org users can read descendant incidents but cannot update/delete descendant-owned incidents in this wave.
  - [ ] `go test ./internal/usecase/incident` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Incident list/detail/summary respect descendant read-only scope
    Tool: Bash
    Steps: Run `go test ./internal/usecase/incident -run 'TestIncident(Detail|List|Summary).*UsesAccessScope|TestIncidentParentCanReadDescendantOnly' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm parent users can read descendant incidents while sibling data stays hidden
    Evidence: .sisyphus/evidence/task-5-incident-scope.txt

  Scenario: Cross-org mutation and linked-risk attachment are blocked
    Tool: Bash
    Steps: Run `go test ./internal/usecase/incident -run 'TestIncident(Update|Delete).*RejectsOutOfScopeRecord|TestIncidentUpdateRejectsSiblingLinkedRisk' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm parent users cannot mutate descendant incidents and cannot link sibling-org risks
    Evidence: .sisyphus/evidence/task-5-incident-scope-error.txt
  ```

  **Commit**: YES | Message: `fix(incident): enforce org scope on detail and mutation flows` | Files: [backend/internal/usecase/incident/*, backend/internal/repository/postgres/incident.go]

- [x] 6. Enforce org scope for controls, KRIs, and lessons

  **What to do**: Apply the same scoped-read and read-only inheritance policy to controls, KRIs, and lessons. Their list/dashboard paths already accept org descendants, but detail/update/delete flows still use global existence checks. Update these domains so detail reads, dashboard metrics, and mutations all derive from access scope. For KRI/control flows that validate linked risks or organizations, ensure those validations also stay inside accessible descendants. Keep create/update/delete/approve semantics local to the owning org in phase 1.
  **Must NOT do**: Do not stop at list endpoints. Do not treat parent read inheritance as permission to update descendant compliance data.

  **Recommended Agent Profile**:
  - Category: `backend-go` - Reason: three similar Go domains can be hardened in one consistent pass.
  - Skills: [`backend-go`] - needed for uniform usecase/repository updates and table-driven tests.
  - Omitted: [`postgres-pro`] - query tuning is unnecessary here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/control/basic.go:14-68` - controls already have list/dashboard descendant filtering but unscoped detail access.
  - Guardrail: `backend/internal/usecase/control/basic.go:110-194` - control update/delete paths currently validate existence only.
  - Pattern: `backend/internal/usecase/kri/basic.go:14-68` - KRIs mirror the same list/detail gap.
  - Guardrail: `backend/internal/usecase/kri/basic.go:109-187` - KRI update/delete flows currently mutate after global existence checks.
  - Pattern: `backend/internal/usecase/lesson/basic.go:14-68` - lessons mirror the same list/detail gap.
  - Guardrail: `backend/internal/usecase/lesson/basic.go:108-218` - lesson update/delete/dashboard flows need the same scoped-read treatment.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Control, KRI, and lesson detail endpoints are scope-aware and preserve not-found semantics for out-of-scope access.
  - [ ] Their dashboard/summary paths use authenticated descendant scope consistently.
  - [ ] Parent-org users can read descendant compliance data but cannot mutate descendant-owned controls/KRIs/lessons in this wave.
  - [ ] Linked-risk and organization validations stay inside accessible descendant scope.
  - [ ] `go test ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Compliance detail and dashboard flows respect descendant read scope
    Tool: Bash
    Steps: Run `go test ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson -run 'Test(Control|KRI|Lesson).*(Detail|Dashboard).*UsesAccessScope|Test.*ParentCanReadDescendantOnly' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm descendant read-only access without sibling leakage across all three domains
    Evidence: .sisyphus/evidence/task-6-compliance-scope.txt

  Scenario: Compliance mutation remains local to owning org
    Tool: Bash
    Steps: Run `go test ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson -run 'Test(Control|KRI|Lesson).*(Update|Delete).*RejectsOutOfScopeRecord' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm parent users cannot mutate descendant-owned controls/KRIs/lessons
    Evidence: .sisyphus/evidence/task-6-compliance-scope-error.txt
  ```

  **Commit**: YES | Message: `fix(compliance): enforce org scope on controls kris and lessons` | Files: [backend/internal/usecase/control/*, backend/internal/usecase/kri/*, backend/internal/usecase/lesson/*, backend/internal/repository/postgres/control.go, backend/internal/repository/postgres/kri.go, backend/internal/repository/postgres/lesson.go]

- [x] 7. Enforce org scope for forms and meeting minutes

  **What to do**: Harden the remaining org-sensitive flows that are neither classic CRUD nor pure dashboards. For forms, replace the current special-case admin bypass with the shared access-scope policy, then make descendant read visibility explicit: parent users may read child-assigned and child-created forms, but create/update/publish/assignment actions remain limited to the form-owning organization only in this wave. For meeting minutes, route organization filtering through access scope so list/detail access cannot be widened via raw `OrganizationID`, `CreatedBy`, or `RiskID` combinations.
  **Must NOT do**: Do not keep `super_admin`/`admin` global-read shortcuts for protected business data. Do not let meeting-minute filters combine into sibling-org leakage.

  **Recommended Agent Profile**:
  - Category: `backend-go` - Reason: these are special-case flows with existing custom org logic and need careful policy alignment.
  - Skills: [`backend-go`] - needed for consistent scope policy and targeted tests.
  - Omitted: [`react-expert`] - this task is backend authorization, not UI rendering.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/form/list.go:41-90` - current form visibility branches on role and direct organization assignments.
  - Guardrail: `backend/internal/usecase/form/list.go:42-45` - forms currently allow `super_admin` and `admin` special cases outside shared org-scope rules.
  - Pattern: `backend/internal/usecase/meeting_minute/list.go:19-47` - meeting-minute listing currently forwards raw filters without a shared access-scope gate.
  - Pattern: `backend/internal/domain/service/organization_hierarchy.go:22-52` - descendant read visibility must use the same hierarchy source as every other protected domain.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Form visibility uses the shared access-scope policy and no longer depends on ad hoc global admin bypasses for protected business data.
  - [ ] Parent users can read descendant form/meeting-minute data only where phase-1 read policy allows it.
  - [ ] Meeting-minute filters cannot widen access beyond accessible descendants.
  - [ ] Mutation/publish/assignment rights remain local to the owning organization only; no inherited write rights are introduced.
  - [ ] `go test ./internal/usecase/form ./internal/usecase/meeting_minute` passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Parent reads descendant forms and meeting minutes without sibling leakage
    Tool: Bash
    Steps: Run `go test ./internal/usecase/form ./internal/usecase/meeting_minute -run 'Test(Form|MeetingMinute).*ParentCanReadDescendantOnly|Test.*FiltersStayWithinAccessibleOrgScope' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm descendant read visibility works and raw filters do not leak sibling-org data
    Evidence: .sisyphus/evidence/task-7-forms-meetings.txt

  Scenario: Legacy global admin bypass is removed for protected business data
    Tool: Bash
    Steps: Run `go test ./internal/usecase/form ./internal/usecase/meeting_minute -run 'TestFormRejectsGlobalBypassWithoutAccessibleOrgScope|TestMeetingMinuteRejectsOutOfScopeCombinationFilters' -count=1` from `backend/`
    Expected: Exit code 0; tests confirm legacy global-read shortcuts and combination-filter leaks are blocked
    Evidence: .sisyphus/evidence/task-7-forms-meetings-error.txt
  ```

  **Commit**: YES | Message: `fix(forms): scope form and meeting-minute access by organization` | Files: [backend/internal/usecase/form/*, backend/internal/usecase/meeting_minute/*, backend/internal/repository/postgres/form.go, backend/internal/repository/postgres/meeting_minute.go]

- [x] 8. Align frontend auth state and UI behavior with backend org scope

  **What to do**: Update frontend auth/session handling to consume the backend-provided org-scope metadata from T1 and make UI behavior consistent with backend enforcement. The frontend must treat backend org scope as authoritative: default list/detail screens should request data without forcing users to choose an org first, render only the authenticated org subtree as available filter options, and mark descendant data as read-only for parent users. Use the existing organization tree helpers to display descendant choices safely; never allow the UI to construct sibling-org filters. Keep security server-side, but remove misleading UI affordances that would always fail because of org boundaries.
  **Must NOT do**: Do not introduce client-only authorization logic. Do not let the frontend invent additional org scope beyond what `/auth/me` returns.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: the task is primarily frontend state/UX alignment around authorization constraints.
  - Skills: [`react-expert`] - needed for context updates, typed auth state, and safe UI gating.
  - Omitted: [`frontend-design`] - this is a behavior/alignment pass, not a visual redesign.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9] | Blocked By: [1, 2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `frontend/src/contexts/auth-context.tsx:17-24` - current auth context only stores `user`, `token`, and `loading`; it needs scoped metadata from backend auth payloads.
  - Pattern: `frontend/src/contexts/auth-context.tsx:35-83` - session restore/login/logout flow is the integration point for new org-scope data.
  - Pattern: `frontend/src/lib/organization.ts:41-145` - existing org-tree helpers already support descendant-tree and parent-option logic; reuse them for allowed-org rendering.
  - Guardrail: `frontend/src/lib/organization.ts:171-205` - existing error messaging already distinguishes invalid parent/descendant logic; keep hierarchy semantics consistent.
  - Verification: `frontend/package.json:5-11` - existing frontend verification path is `npm test` plus `npm run build`; no separate component/e2e framework exists yet.
  - API/Type: `backend/internal/usecase/auth/me.go:31-56` - auth payload shape must remain compatible with frontend session restoration.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Frontend auth state stores and exposes backend-provided org-scope metadata needed for read-only descendant rendering.
  - [ ] Org filters shown in the UI are limited to the authenticated org subtree.
  - [ ] Parent users see descendant data as read-only and are not presented with child-mutation affordances on the updated org-scoped list/detail pages for risks, incidents, controls, KRIs, lessons, forms, and meeting minutes.
  - [ ] Frontend behavior remains functional when no explicit org filter is selected.
  - [ ] `npm test` and `npm run build` pass in `frontend/`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Frontend auth and org-tree helpers expose only allowed descendant scope
    Tool: Bash
    Steps: Run `node --test src/**/*.test.ts --test-name-pattern 'Auth scope|organization tree|read-only descendant'` from `frontend/`
    Expected: Exit code 0; tests confirm frontend scope helpers/context never expose sibling-org filters and flag descendant data as read-only
    Evidence: .sisyphus/evidence/task-8-frontend-scope.txt

  Scenario: Frontend still builds after auth payload changes
    Tool: Bash
    Steps: Run `npm run build` from `frontend/`
    Expected: Exit code 0; build succeeds with updated auth types and org-scope UI behavior
    Evidence: .sisyphus/evidence/task-8-frontend-scope-error.txt
  ```

  **Commit**: YES | Message: `feat(frontend): align auth session and org-scoped UI behavior` | Files: [frontend/src/contexts/auth-context.tsx, frontend/src/lib/organization.ts, frontend/src/types/*, frontend/src/app/**/*]

- [x] 9. Add focused regression coverage and leakage checks across the RBAC boundary

  **What to do**: Add a final targeted regression layer that proves organization isolation across the most leak-prone paths: scoped detail access, sibling-org denial, parent descendant read-only behavior, dashboard aggregate isolation, report isolation, filter narrowing, and frontend scope rendering. Use the existing backend Go test patterns and frontend `node --test` setup. Add one concise smoke-test matrix that names each protected domain so future contributors can detect a missing org-scope hook quickly.
  **Must NOT do**: Do not add a brand-new e2e framework in this wave. Do not rely only on domain-local tests without a cross-domain leakage matrix.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is a cross-cutting verification pass spanning multiple backend and frontend areas.
  - Skills: [`backend-go`, `react-expert`] - needed for Go regression tests plus frontend scope checks.
  - Omitted: [`playwright`] - no committed browser suite exists; use existing automated layers and agent QA instead.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [Final Verification Wave] | Blocked By: [4, 5, 6, 7, 8]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/risk/list.go:31-47` - baseline descendant filtering behavior to preserve across domains.
  - Guardrail: `backend/internal/usecase/risk/dashboard_phase2.go:135-151` - aggregate/report leakage is a must-test area.
  - Guardrail: `backend/internal/usecase/report/generate.go:37-93` - report isolation must stay covered by regression tests.
  - Pattern: `backend/internal/usecase/incident/basic.go:14-32` - detail endpoint hardening must be verified explicitly.
  - Pattern: `backend/internal/usecase/form/list.go:41-90` - legacy role bypass risk needs explicit regression coverage.
  - Pattern: `frontend/src/contexts/auth-context.tsx:35-83` - auth state changes need frontend regression coverage.
  - Verification: `frontend/package.json:5-11` - use existing frontend test/build commands, not new tooling.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A named regression matrix covers sibling denial, parent descendant read-only access, aggregate/report isolation, and narrowing-only filters.
  - [ ] Backend targeted test suites pass for all hardened domains.
  - [ ] Frontend targeted scope tests and production build pass.
  - [ ] The full verification command set completes successfully without manual intervention.
  - [ ] Evidence files are generated for the full test/build run.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full automated regression matrix passes
    Tool: Bash
    Steps: Run `go test ./internal/domain/service ./internal/usecase/auth ./internal/usecase/risk ./internal/usecase/incident ./internal/usecase/control ./internal/usecase/kri ./internal/usecase/lesson ./internal/usecase/form ./internal/usecase/meeting_minute ./internal/usecase/report ./internal/repository/postgres && cd ../frontend && npm test && npm run build` from `backend/`
    Expected: Exit code 0; all protected-domain tests, frontend tests, and frontend build succeed in one pass
    Evidence: .sisyphus/evidence/task-9-regression-matrix.txt

  Scenario: Leak-focused smoke tests prove sibling denial and parent read-only inheritance
    Tool: Bash
    Steps: Run `go test ./internal/usecase/... -run 'Test.*(SiblingOrgDenied|ParentCanReadDescendantOnly|OutOfScopeDetailReturnsNotFound|RejectsOutOfScopeOrgFilter)' -count=1` from `backend/`
    Expected: Exit code 0; focused smoke tests confirm the highest-risk leak paths stay closed
    Evidence: .sisyphus/evidence/task-9-regression-matrix-error.txt
  ```

  **Commit**: YES | Message: `test(rbac): add organization isolation regression coverage` | Files: [backend/internal/**/*_test.go, frontend/src/**/*.test.ts]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Use atomic commits aligned to T1-T9; do not combine unrelated domains in one commit.
- Preferred sequence:
  - `feat(auth): add request-scoped organization access context`
  - `refactor(authz): route protected flows through scoped org filters`
  - `fix(risk): enforce org scope on detail dashboard and reports`
  - `fix(incident): enforce org scope on detail and mutation flows`
  - `fix(compliance): enforce org scope on controls kris and lessons`
  - `fix(forms): scope form and meeting-minute access by organization`
  - `feat(frontend): align auth session and org-scoped UI behavior`
  - `test(rbac): add organization isolation regression coverage`

## Success Criteria
- A user can never retrieve sibling-organization data through list, detail, dashboard, or report endpoints.
- A parent-organization user can read descendant-child data without gaining write/delete/approve powers over that child data.
- Protected handlers remain functional when the caller omits `org_id`; authorization falls back to authenticated org scope automatically.
- Out-of-scope direct-object access returns not-found semantics for protected resources.
- Frontend behavior matches backend scope and does not encourage actions the backend will reject because of org boundaries.

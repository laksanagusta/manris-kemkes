# Admin-Created User Onboarding Activation Flow

## TL;DR
> **Summary**: Add ministry-internal user provisioning with superadmin-created temporary credentials, setup-only first login, forced password change, and activation only after password change completes.
> **Deliverables**:
> - New user lifecycle model with `pending_activation`, `active`, `inactive`, plus `must_change_password`
> - Backend auth + user provisioning contract for setup-only sessions and first-password-change activation
> - Frontend forced-password-change flow plus admin user-management UI cleanup
> - Automated backend tests and agent-executed API/Playwright QA evidence
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 5

## Context
### Original Request
- Decide best way to add users into application for internal kementerian deployment.
- Confirmed decisions: no public self-signup, full admin-create onboarding, account becomes active only after first password change.

### Interview Summary
- Repo already follows admin-led onboarding: public auth surface is only `/api/v1/auth/login`, while user CRUD is protected in `backend/cmd/server/main.go:385-417`.
- Login copy in both `frontend/src/app/(public)/login/page.tsx:85-89` and `frontend/src/app/page.tsx:79-82` tells users to use credentials from administrator.
- Canonical backend roles remain `superadmin`, `unit`, `reviewer`, `pimpinan` in `backend/internal/domain/entity/user.go:10-15`; frontend `viewer` option is invalid and must be removed.
- User selected ministry-internal model: superadmin creates account, assigns role + org, provides temporary password manually, user must change password before normal access.

### Metis Review (gaps addressed)
- Locked first-login mechanism to **temporary password → setup-only JWT session**. No invite link, no email delivery, no forgot-password work in this plan.
- Locked provisioning authority to **superadmin only** for user CRUD and admin user-management screens.
- Locked canonical route naming to **`/admin/users`** in the application; breadcrumb/navigation aliases should align to that path.
- Locked migration strategy to **new migration `000035_add_user_onboarding_state.*`**, never editing `000001_initial_schema.up.sql` in place.

## Work Objectives
### Core Objective
Implement a secure admin-created onboarding flow where new ministry-internal users authenticate with a temporary password, receive a setup-only session, must change the password immediately, and only then become fully active.

### Deliverables
- Backend schema + domain model for onboarding state
- Superadmin-only user provisioning contract that accepts plain temporary password and hashes it server-side
- Setup-only login response, auth middleware gate, and first-password-change endpoint
- Frontend auth-state support for forced password change and setup-only redirects
- Admin user-management UI updates for temporary-password onboarding and pending-activation visibility
- Verification artifacts in `.sisyphus/evidence/`

### Definition of Done (verifiable conditions with commands)
- `backend`: `go test ./internal/usecase/auth ./internal/usecase/user ./internal/handler/http ./internal/repository/postgres ./internal/domain/entity ./internal/domain/service`
- `frontend`: `npm run lint && npm run build`
- API verification proves:
  - superadmin can create `pending_activation` user with supported role only
  - login with temporary password returns setup-only session metadata
  - setup-only token is rejected from normal protected APIs with `403`
  - password change activates account and returns a full-access token
  - old temporary password stops working immediately after activation
- Playwright verification proves browser redirect path `/login` → `/change-password` → `/overview`

### Must Have
- New statuses: `pending_activation`, `active`, `inactive`
- New boolean gate: `must_change_password`
- Setup-only JWT claim and backend middleware enforcement
- `POST /api/v1/auth/change-password` for first-login activation only
- Superadmin-only protection on `/api/v1/users` routes
- Frontend removal of unsupported `viewer` role
- Pending-activation status visible in admin list UI

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No public signup page or `/auth/register` endpoint
- No invite email, magic link, forgot-password, MFA, or session-revocation overhaul
- No edit to historical migration `backend/db/migrations/000001_initial_schema.up.sql`
- No full-access JWT issued before password change completes
- No frontend-only enforcement without matching backend guard
- No change to canonical route away from `/admin/users` during this feature

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **TDD for backend auth/user slices**, then frontend build/lint + Playwright/API verification for UI integration
- QA policy: Every task has agent-executed happy-path and failure-path scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: backend foundation and contract lock (`1-3`)
- Task 1: schema + domain lifecycle state
- Task 2: provisioning contract + repository alignment
- Task 3: setup-only login contract + auth payload

Wave 2: dependent enforcement and frontend integration (`4-6`)
- Task 4: change-password activation endpoint + middleware gate
- Task 5: auth context + forced-password-change UI flow
- Task 6: admin user-management UI + navigation cleanup

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | None | 2, 3, 4, 5, 6 |
| 2 | 1 | 6 |
| 3 | 1 | 4, 5 |
| 4 | 1, 3 | 5 |
| 5 | 3, 4 | F1-F4 |
| 6 | 1, 2 | F1-F4 |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → `unspecified-high` with `backend-go`, `test-driven-development`
- Wave 2 → 3 tasks → `unspecified-high` for backend enforcement, `visual-engineering` for frontend/auth UI tasks
- Final Verification Wave → 4 tasks → `oracle`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add onboarding lifecycle state to schema and domain

  **What to do**: Create `backend/db/migrations/000035_add_user_onboarding_state.up.sql` and `.down.sql` to expand `users.status` from `active|inactive` to `pending_activation|active|inactive`, add `must_change_password BOOLEAN NOT NULL DEFAULT false`, and preserve existing users as `active` with `must_change_password=false`. Update `backend/internal/domain/entity/user.go` to add status constants, `MustChangePassword` field, and helper methods for `IsPendingActivation` / `CanUseFullSession`. Update `backend/internal/domain/entity/auth.go` so auth payloads can expose `status` and `mustChangePassword` to the frontend. Add or extend entity tests so invalid status values are rejected and normalized role behavior still passes.
  **Must NOT do**: Do not edit `000001_initial_schema.up.sql`; do not add invite-token, expiry, or email-delivery columns; do not remove existing `active`/`inactive` semantics for already-provisioned users.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: backend schema + domain contract change touches auth and persistence boundaries.
  - Skills: [`backend-go`, `test-driven-development`] - enforce idiomatic Go entities and test-first state-model changes.
  - Omitted: [`react-expert`] - no frontend work in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 5, 6] | Blocked By: [none]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/db/migrations/000001_initial_schema.up.sql:10-20` - current `users` table shape and existing status constraint to extend safely.
  - Pattern: `backend/db/migrations/000034_add_user_profile_fields.up.sql:1-5` - latest user-table migration style; follow additive migration pattern instead of rewriting base schema.
  - API/Type: `backend/internal/domain/entity/user.go:27-43` - current domain user shape where `Status` exists and new `MustChangePassword` must be added.
  - API/Type: `backend/internal/domain/entity/auth.go:10-25` - current auth response DTOs that need onboarding-state metadata.
  - Test: `backend/internal/domain/entity/access_scope_test.go:136-158` - table-driven entity test style for enum/normalization behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `backend/db/migrations/000035_add_user_onboarding_state.up.sql` and `backend/db/migrations/000035_add_user_onboarding_state.down.sql` exist and define reversible schema changes for `pending_activation` and `must_change_password`.
  - [ ] `go test ./internal/domain/entity ./internal/domain/service` passes from `backend/`.
  - [ ] `grep -n "pending_activation\|must_change_password" backend/db/migrations/000035_add_user_onboarding_state.up.sql` returns the expected lifecycle fields from `backend/`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Lifecycle schema and entity model added
    Tool: Bash
    Steps: Run `go test ./internal/domain/entity ./internal/domain/service` in `backend/`; run `grep -n "pending_activation\|must_change_password" backend/db/migrations/000035_add_user_onboarding_state.up.sql`
    Expected: Go tests PASS; grep output shows new status value and boolean column in migration file
    Evidence: .sisyphus/evidence/task-1-onboarding-lifecycle.txt

  Scenario: Invalid lifecycle state rejected
    Tool: Bash
    Steps: Run targeted negative test such as `go test ./internal/domain/entity -run TestUserValidateRejectsUnknownStatus -v` in `backend/`
    Expected: Test PASS by proving invalid status is rejected by domain validation
    Evidence: .sisyphus/evidence/task-1-onboarding-lifecycle-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): add onboarding account state` | Files: [`backend/db/migrations/000035_add_user_onboarding_state.up.sql`, `backend/db/migrations/000035_add_user_onboarding_state.down.sql`, `backend/internal/domain/entity/user.go`, `backend/internal/domain/entity/auth.go`, `backend/internal/domain/entity/*_test.go`]

- [x] 2. Align user provisioning contract with backend-owned temporary passwords

  **What to do**: Update `backend/internal/handler/http/user.go`, `backend/internal/usecase/user/create.go`, and `backend/internal/repository/postgres/user.go` so the create-user API accepts plain `password`, hashes it server-side with bcrypt, stores only `password_hash`, defaults new users to `status="pending_activation"` and `must_change_password=true`, and rejects unsupported roles such as `viewer`. Add superadmin-only protection to all `/api/v1/users` routes in `backend/cmd/server/main.go`. Create backend tests for: successful superadmin provisioning, duplicate username/email rejection, invalid role rejection, org-required-for-non-superadmin validation, and forbidden non-superadmin access at the HTTP layer.
  **Must NOT do**: Do not keep `PasswordHash` in the external HTTP payload; do not persist raw passwords; do not allow non-superadmins to create or manage users; do not auto-generate or send credentials by email.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: crosses route wiring, use case validation, and repository persistence.
  - Skills: [`backend-go`, `test-driven-development`] - required for bcrypt handling, validation, and handler tests.
  - Omitted: [`react-expert`] - frontend form changes are handled later after backend contract is stable.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [6] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/user/create.go:29-113` - current create contract incorrectly expects `PasswordHash` and defaults users to `active`.
  - Pattern: `backend/internal/handler/http/user.go:35-48` - current handler body-parses directly into usecase input; update request contract carefully.
  - Pattern: `backend/internal/repository/postgres/user.go:23-37` - current insert statement for `users`; extend it with `must_change_password` without changing raw-password handling.
  - Pattern: `backend/cmd/server/main.go:412-417` - current `/users` routes lack explicit role guard; lock them to `superadmin` here.
  - Pattern: `backend/internal/handler/http/working_paper_test.go:122-188` - Fiber handler test style using `app.Test` and concrete request bodies.
  - Test: `backend/internal/usecase/auth/me_test.go:13-114` - lightweight stub-repository pattern for usecase testing.
  - External: `https://pkg.go.dev/golang.org/x/crypto/bcrypt` - bcrypt usage contract for password hashing and comparison.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `go test ./internal/usecase/user ./internal/handler/http` passes from `backend/`.
  - [ ] `curl -s -o /tmp/create-user.json -w "%{http_code}" -X POST http://localhost:8080/api/v1/users -H "Authorization: Bearer $SUPERADMIN_TOKEN" -H "Content-Type: application/json" --data '{"name":"Unit Test User","username":"unit-test-user","email":"unit-test-user@manris.local","password":"TempPass123!","role":"unit","organizationId":"'$ORG_ID'"}'` returns `201` after the task is implemented.
  - [ ] Equivalent create-user request using a non-superadmin token returns `403`.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Superadmin provisions pending-activation user
    Tool: Bash
    Steps: Run `go test ./internal/usecase/user ./internal/handler/http` in `backend/`; with backend running, POST `/api/v1/users` using `$SUPERADMIN_TOKEN` and payload `{name:"Unit Test User",username:"unit-test-user",email:"unit-test-user@manris.local",password:"TempPass123!",role:"unit",organizationId:"$ORG_ID"}`
    Expected: Tests PASS; API returns `201`; stored user defaults to `pending_activation` with `mustChangePassword=true`
    Evidence: .sisyphus/evidence/task-2-provisioning-contract.txt

  Scenario: Unsupported role or caller rejected
    Tool: Bash
    Steps: POST `/api/v1/users` once with `role:"viewer"`; POST again with valid payload but `$UNIT_TOKEN` instead of `$SUPERADMIN_TOKEN`
    Expected: Invalid role request returns `400`; non-superadmin request returns `403`; no user is created
    Evidence: .sisyphus/evidence/task-2-provisioning-contract-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): harden user provisioning contract` | Files: [`backend/cmd/server/main.go`, `backend/internal/handler/http/user.go`, `backend/internal/usecase/user/create.go`, `backend/internal/repository/postgres/user.go`, `backend/internal/usecase/user/create_test.go`, `backend/internal/handler/http/user_test.go`]

- [x] 3. Introduce setup-only login sessions for pending activation users

  **What to do**: Update `backend/internal/usecase/auth/login.go`, `backend/internal/handler/http/auth.go`, `backend/internal/domain/entity/auth.go`, and `backend/internal/middleware/auth.go` so login behavior branches by lifecycle state: `inactive` still fails, `pending_activation` with correct temporary password succeeds but returns a **setup-only** JWT plus auth payload fields such as `mustChangePassword=true`, `sessionMode="setup"`, and user status metadata, while `active` users keep receiving full sessions. Extend JWT claims and token generation helpers to carry a `setupOnly` claim without breaking existing active-user login behavior. Add tests for active login, pending-activation setup login, inactive-user rejection, and token-claim parsing.
  **Must NOT do**: Do not grant `pending_activation` users full app access; do not regress active-user login; do not hide setup state only in frontend without emitting it from backend auth payloads.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: authentication contract change affects JWT shape, handlers, and auth consumers.
  - Skills: [`backend-go`, `test-driven-development`] - needed for auth state branching and JWT contract tests.
  - Omitted: [`react-expert`] - frontend consumption happens in Task 5 after backend contract settles.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [4, 5] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/internal/usecase/auth/login.go:40-96` - current login rejects any non-`active` account; this is the core branching point.
  - Pattern: `backend/internal/handler/http/auth.go:26-50` - login response currently returns only `{data: result}`; keep envelope but extend payload.
  - API/Type: `backend/internal/domain/entity/auth.go:10-25` - auth response DTOs where `sessionMode`, `status`, and `mustChangePassword` should live.
  - Pattern: `backend/internal/middleware/auth.go:23-46` - current JWT claims and token generator; add `setupOnly` claim here.
  - Test: `backend/internal/usecase/auth/me_test.go:47-114` - stubbed auth/usecase test style to follow for login tests.
  - External: `https://pkg.go.dev/github.com/golang-jwt/jwt/v5` - JWT claims extension pattern.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `go test ./internal/usecase/auth ./internal/handler/http` passes from `backend/`.
  - [ ] `curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" --data '{"username":"unit-test-user","password":"TempPass123!"}' | jq '.data.mustChangePassword, .data.sessionMode, .data.user.status'` returns `true`, `"setup"`, and `"pending_activation"` after the task is implemented.
  - [ ] Login for an `inactive` user returns `401`/inactive error and does not issue a token.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Pending-activation login gets setup-only session
    Tool: Bash
    Steps: Run `go test ./internal/usecase/auth ./internal/handler/http` in `backend/`; with backend running, POST `/api/v1/auth/login` using `{username:"unit-test-user",password:"TempPass123!"}` and inspect JSON fields `mustChangePassword`, `sessionMode`, and `user.status`
    Expected: Tests PASS; login returns `200`; payload contains `mustChangePassword=true`, `sessionMode="setup"`, `user.status="pending_activation"`
    Evidence: .sisyphus/evidence/task-3-setup-login.txt

  Scenario: Inactive user still blocked
    Tool: Bash
    Steps: POST `/api/v1/auth/login` with credentials for an `inactive` fixture user or run targeted test `go test ./internal/usecase/auth -run TestLoginRejectsInactiveUser -v`
    Expected: API or test confirms inactive users are rejected and no token is returned
    Evidence: .sisyphus/evidence/task-3-setup-login-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): add setup-only login session` | Files: [`backend/internal/usecase/auth/login.go`, `backend/internal/domain/entity/auth.go`, `backend/internal/handler/http/auth.go`, `backend/internal/middleware/auth.go`, `backend/internal/usecase/auth/login_test.go`, `backend/internal/handler/http/auth_test.go`]

- [x] 4. Add first-password-change activation endpoint and full-session gate

  **What to do**: Implement `POST /api/v1/auth/change-password` as the only endpoint available to setup-only sessions besides `/auth/me`. Create the use case, handler wiring, and route registration so setup-only tokens can change password, flip the user to `status="active"`, clear `must_change_password`, hash and store the new password, and return a fresh full-access auth payload/JWT. Add middleware enforcement so setup-only tokens receive `403` on normal protected routes (`/users`, `/dashboard/*`, `/risks`, etc.) while still allowing `/auth/me` and `/auth/change-password`. Add tests that prove: setup-only token cannot call a normal protected route, password change activates the account, old temporary password no longer works, and `/auth/me` reflects the active state after password change.
  **Must NOT do**: Do not turn this into a generic forgot-password or profile-password-change feature; do not leave setup-only authorization enforced only by UI routing; do not keep the setup-only token as a valid full-access token after activation.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: combines auth use case, middleware, and route-group restructuring.
  - Skills: [`backend-go`, `test-driven-development`] - required for secure password transition and middleware coverage.
  - Omitted: [`react-expert`] - browser flow consumption is handled in Task 5.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [5] | Blocked By: [1, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `backend/cmd/server/main.go:391-417` - current protected-route grouping; split this so setup-only tokens can reach `/auth/me` and `/auth/change-password` but not the rest.
  - Pattern: `backend/internal/handler/http/auth.go:53-80` - existing `/auth/me` handler; preserve this route while adding change-password handling.
  - Pattern: `backend/internal/middleware/auth.go:48-122` - current auth middleware and locals plumbing; extend this with a full-session guard.
  - API/Type: `backend/internal/repository/postgres/user.go:39-84` - current read/update persistence paths; password/status updates should remain repository-owned and avoid raw-password storage.
  - Test: `backend/internal/handler/http/working_paper_test.go:163-188` - Fiber route + middleware test pattern for protected endpoints.
  - Test: `backend/internal/usecase/auth/me_test.go:47-114` - usecase test style for auth state transitions and profile assertions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `go test ./internal/usecase/auth ./internal/handler/http ./internal/repository/postgres` passes from `backend/`.
  - [ ] Using a setup-only token, `curl -s -o /tmp/setup-block.json -w "%{http_code}" http://localhost:8080/api/v1/dashboard/summary -H "Authorization: Bearer $SETUP_TOKEN"` returns `403`.
  - [ ] `curl -s -X POST http://localhost:8080/api/v1/auth/change-password -H "Authorization: Bearer $SETUP_TOKEN" -H "Content-Type: application/json" --data '{"newPassword":"N3wPassw0rd!2026","confirmPassword":"N3wPassw0rd!2026"}' | jq '.data.mustChangePassword, .data.sessionMode, .data.user.status'` returns `false`, `"full"`, and `"active"`.
  - [ ] Re-login with `TempPass123!` returns `401` after activation.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Password change activates account and upgrades session
    Tool: Bash
    Steps: Run `go test ./internal/usecase/auth ./internal/handler/http ./internal/repository/postgres` in `backend/`; login as `unit-test-user` to obtain `$SETUP_TOKEN`; POST `/api/v1/auth/change-password` with `{newPassword:"N3wPassw0rd!2026",confirmPassword:"N3wPassw0rd!2026"}`
    Expected: Tests PASS; endpoint returns `200`; response contains `mustChangePassword=false`, `sessionMode="full"`, `user.status="active"`
    Evidence: .sisyphus/evidence/task-4-change-password.txt

  Scenario: Setup-only token cannot bypass full-session gate
    Tool: Bash
    Steps: Use `$SETUP_TOKEN` to call `/api/v1/dashboard/summary`; then attempt login with old temp password after password change
    Expected: Dashboard call returns `403` because setup-only sessions cannot access normal app APIs; old temporary password login returns `401`
    Evidence: .sisyphus/evidence/task-4-change-password-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): activate users on password change` | Files: [`backend/cmd/server/main.go`, `backend/internal/handler/http/auth.go`, `backend/internal/usecase/auth/change_password.go`, `backend/internal/usecase/auth/change_password_test.go`, `backend/internal/middleware/auth.go`, `backend/internal/repository/postgres/user.go`, `backend/internal/handler/http/auth_test.go`]

- [x] 5. Add frontend forced-password-change flow for setup-only sessions

  **What to do**: Update `frontend/src/contexts/auth-context.tsx` so auth state tracks `mustChangePassword`, `sessionMode`, and refreshed user status from login + `/auth/me`; add a context method for completing first-login password change and swapping in the full-access token returned by `/auth/change-password`. Create `frontend/src/app/(public)/change-password/page.tsx` for the forced first-login form with `newPassword` + `confirmPassword`, clear validation, and redirect to `/overview` only after successful activation. Update both login surfaces (`frontend/src/app/(public)/login/page.tsx` and `frontend/src/app/page.tsx`) to route setup-only users to `/change-password` instead of `/overview`. Add setup-only redirect protection in `frontend/src/components/app-shell.tsx` and/or `frontend/src/app/(app)/layout.tsx` so users with `mustChangePassword=true` cannot remain inside the app shell. Keep `frontend/src/lib/api.ts` response handling aligned with the extended `{data: ...}` auth payload.
  **Must NOT do**: Do not create a forgot-password flow; do not allow `/overview` or `(app)` pages to stay visible for setup-only users; do not duplicate auth state logic across both login pages.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: user-facing auth flow, redirect states, and dedicated password-change screen.
  - Skills: [`react-expert`, `shadcn`] - needed for Next.js App Router auth state wiring and UI form composition.
  - Omitted: [`backend-go`] - backend contract is already defined in Tasks 3-4.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [F1-F4] | Blocked By: [3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `frontend/src/contexts/auth-context.tsx:41-90` - current auth context only tracks `user`, `token`, and `isAuthenticated`; extend this rather than creating a second auth store.
  - Pattern: `frontend/src/lib/api.ts:15-58` - API helper unwraps `{data: ...}` automatically; preserve this contract when consuming auth responses.
  - Pattern: `frontend/src/app/(public)/login/page.tsx:22-41` - current login page always redirects to `/overview`; branch on setup-only auth here.
  - Pattern: `frontend/src/app/page.tsx:22-41` - duplicate landing-page login flow must stay behaviorally identical.
  - Pattern: `frontend/src/components/app-shell.tsx:11-47` - current app shell fetches protected data immediately; add redirect guard before those calls for setup-only sessions.
  - Pattern: `frontend/src/app/(app)/layout.tsx:1-16` - app-shell entry point for `(app)` routes.
  - API/Type: `backend/internal/domain/entity/auth.go:10-25` - frontend payload expectations must match backend auth DTO changes.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run lint && npm run build` passes from `frontend/`.
  - [ ] Playwright flow using a `pending_activation` user lands on `/change-password` immediately after login and reaches `/overview` only after successful password change.
  - [ ] Setup-only session reload on `/change-password` keeps user on the password-change page instead of redirecting to `/login` or rendering the app shell.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Browser forces first password change before app access
    Tool: Playwright
    Steps: Open `/login`; submit `unit-test-user` / `TempPass123!`; verify redirect to `/change-password`; fill `N3wPassw0rd!2026` in both fields; submit; verify redirect to `/overview`
    Expected: Login never lands on `/overview` before password change; successful change lands on `/overview` with authenticated app shell visible
    Evidence: .sisyphus/evidence/task-5-forced-change-flow.png

  Scenario: Password confirmation mismatch stays in setup flow
    Tool: Playwright
    Steps: Login as `unit-test-user` with temporary password; on `/change-password`, enter `N3wPassw0rd!2026` and `Mismatch123!`; submit
    Expected: User remains on `/change-password`; validation/error message is shown; no full-access redirect occurs
    Evidence: .sisyphus/evidence/task-5-forced-change-flow-error.png
  ```

  **Commit**: YES | Message: `feat(auth): add forced password change flow` | Files: [`frontend/src/contexts/auth-context.tsx`, `frontend/src/app/(public)/change-password/page.tsx`, `frontend/src/app/(public)/login/page.tsx`, `frontend/src/app/page.tsx`, `frontend/src/components/app-shell.tsx`, `frontend/src/app/(app)/layout.tsx`, `frontend/src/lib/api.ts`]

- [x] 6. Align admin user-management UI and navigation with onboarding rules

  **What to do**: Update `frontend/src/app/(app)/admin/users/new/page.tsx` to use the backend’s final create-user contract (`password` as temporary password, no `viewer` role, role/org validation copy, and explicit onboarding notice that accounts remain pending until first password change). Update `frontend/src/app/(app)/admin/users/page.tsx` so status badges distinguish `pending_activation`, `active`, and `inactive`, and show temporary-password onboarding outcomes clearly after user creation. Hide or redirect superadmin-only admin screens for non-superadmin users using `useAuth()` checks, and update `frontend/src/components/app-sidebar.tsx` so the Administration group only renders for superadmins. Normalize breadcrumb/navigation metadata in `frontend/src/lib/app-navigation.ts` to `/admin/users` while preserving any legacy `/management/users` breadcrumb alias only if needed for backward-compatible display.
  **Must NOT do**: Do not reintroduce `viewer`; do not leave admin navigation visible to non-superadmins; do not rename the live route away from `/admin/users`; do not add unrelated organization-management redesign.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: admin-facing forms, tables, navigation visibility, and UX copy updates.
  - Skills: [`react-expert`, `shadcn`, `clarify`] - required for App Router client pages and clear Indonesian onboarding copy.
  - Omitted: [`backend-go`] - backend route enforcement already lands in Tasks 2-4.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [F1-F4] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `frontend/src/app/(app)/admin/users/new/page.tsx:52-79` - current form posts plain `password` but needs onboarding-specific copy and backend-aligned role list.
  - Pattern: `frontend/src/app/(app)/admin/users/new/page.tsx:203-230` - remove unsupported `viewer` option here.
  - Pattern: `frontend/src/app/(app)/admin/users/page.tsx:179-198` - current status badge only differentiates `active` vs other; expand for `pending_activation`.
  - Pattern: `frontend/src/components/app-sidebar.tsx:95-102` - Administration group currently renders unconditionally; gate it by `user.role === "superadmin"`.
  - Pattern: `frontend/src/lib/app-navigation.ts:38-73` - breadcrumb map still uses `/management/users`; normalize it to `/admin/users`.
  - Context: `prd.md:333-341` - PRD documents superadmin-only user management and explains why this screen stays admin-controlled.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run lint && npm run build` passes from `frontend/`.
  - [ ] Playwright verification as superadmin confirms `/admin/users/new` has no `viewer` role, labels password as temporary/onboarding password, and newly created users appear with `Menunggu Aktivasi`-style status.
  - [ ] Playwright verification as non-superadmin confirms Administration nav is hidden and direct access to `/admin/users` redirects away or shows an authorization guard state.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Superadmin sees updated provisioning UI and pending status
    Tool: Playwright
    Steps: Login as superadmin; open `/admin/users/new`; verify role list excludes `viewer`; create `pending-ui-user`; return to `/admin/users`
    Expected: Form copy describes temporary password onboarding; list page shows the new user with pending-activation badge/text instead of generic inactive
    Evidence: .sisyphus/evidence/task-6-admin-ui.png

  Scenario: Non-superadmin cannot access admin user management
    Tool: Playwright
    Steps: Login as a `unit` user with active password; inspect sidebar; manually navigate browser to `/admin/users`
    Expected: Administration nav group is hidden; direct URL access redirects to `/overview` or displays an explicit unauthorized guard state
    Evidence: .sisyphus/evidence/task-6-admin-ui-error.png
  ```

  **Commit**: YES | Message: `feat(admin): align onboarding user management UI` | Files: [`frontend/src/app/(app)/admin/users/new/page.tsx`, `frontend/src/app/(app)/admin/users/page.tsx`, `frontend/src/components/app-sidebar.tsx`, `frontend/src/lib/app-navigation.ts`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- `feat(auth): add onboarding account state`
- `feat(auth): enforce setup-only first login`
- `feat(auth): activate users on password change`
- `feat(admin): align user provisioning UI`
- `test(auth): verify onboarding activation flow`

## Success Criteria
- New users created by superadmin default to `pending_activation` with `must_change_password=true`
- Temporary password can authenticate only into setup flow
- Setup-only token cannot access `/overview`, `/users`, dashboard, or other normal app APIs
- Password change returns full-access auth payload, flips user to `active`, and invalidates temporary-password login
- Admin UI no longer exposes `viewer`, shows pending activation state, and remains on `/admin/users`

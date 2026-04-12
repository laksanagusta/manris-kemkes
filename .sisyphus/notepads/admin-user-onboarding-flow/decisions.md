## 2026-04-12T05:01:35.884Z Task: startup
- Selected plan: admin-user-onboarding-flow
- Lifecycle target: pending_activation -> active -> inactive
- Provisioning authority: superadmin only
- First-login mechanism: temporary password -> setup-only JWT -> forced password change -> full JWT
- Canonical user-management route: /admin/users
- Out of scope: self-signup, invite email, forgot-password, MFA, auth rewrite

## 2026-04-12T05:30:00Z Task: task-1 schema and domain lifecycle state
- Kept the database default for `users.status` as `active` in migration `000035`; Task 1 only expands allowed lifecycle values and adds `must_change_password`, while Task 2 will intentionally set onboarding defaults in the provisioning path.
- Added canonical entity constants for `pending_activation`, `active`, and `inactive`, plus helper methods `IsPendingActivation()` and `CanUseFullSession()` so later auth and middleware tasks share one lifecycle contract.
- Rollback maps `pending_activation` back to `active` before restoring the old `users_status_check`, preserving reversibility without introducing an unsupported legacy status.

## 2026-04-12T06:10:00Z Task: task-2 provisioning contract
- The create-user use case now owns temporary-password hashing with `bcrypt.GenerateFromPassword(..., bcrypt.DefaultCost)` and always provisions accounts as `pending_activation` with `must_change_password=true`.
- Unsupported roles are rejected in the use case against the canonical backend role set after `entity.NormalizeRole(...)`, instead of widening the entity model or trusting frontend options.
- Username and email uniqueness checks both reuse `UserRepository.GetByUsername`, with repository no-row handling fixed so duplicate detection stays in the use case without adding a new repository method in this task.

## 2026-04-12T06:28:00Z Task: task-2 regression fix
- Kept `UserRepository.GetByUsername` on its original wrapped-error contract for unknown users and added explicit `errors.Is(err, pgx.ErrNoRows)` handling only inside `CreateUserUseCase.lookupExistingUser`, which fixes Task 2 duplicate checks without broad auth changes.

## 2026-04-12T07:24:00Z Task: task-3 setup-only login session
- Kept the login HTTP envelope as `{"data": ...}` and extended only the auth payload: `AuthToken` now carries `sessionMode` plus top-level `mustChangePassword`, while nested `user` continues to expose lifecycle state.
- Treated setup-only eligibility as `pending_activation` or otherwise not eligible for full session via `!user.CanUseFullSession()`, but preserved a hard inactive rejection so `inactive` users never receive a token.
- Extended `middleware.JWTClaims` with a plain `setupOnly bool` claim and surfaced it as `c.Locals("setupOnly")`, deferring any route gating to Task 4.

## 2026-04-12T07:36:00Z Task: task-3 oracle follow-up
- Narrowed setup-only session issuance to `pending_activation` only so all `active` users continue receiving full sessions for Task 3, even if a future flow sets `must_change_password=true` while status remains active.
- Preserved additive `/auth/me` semantics by populating `MustChangePassword` in `GetCurrentUserUseCase` rather than changing the response envelope.

## 2026-04-12T05:58:37Z Task: task-4 change-password activation and gate
- Split auth routing in `backend/cmd/server/main.go` into an `authProtected` group for `/api/v1/auth/me` and `/api/v1/auth/change-password`, while all other protected APIs now flow through `middleware.RequireFullSession()` before org-scope resolution.
- Kept password persistence on the existing `UserRepository.Update` contract by extending the PostgreSQL update statement to write `password_hash`; this avoided introducing a second repository method just for activation while still keeping hashing inside the auth use case.
- Reused the Task 3 `setupOnly` JWT claim as the only backend gate signal, so setup-only denial stays server-enforced and composable instead of creating a parallel session-mode mechanism.

## 2026-04-12T08:45:00Z Task: task-6 admin user-management UI and navigation cleanup
- Kept `/admin/users` as the only user-management route in shared navigation metadata by adding the admin breadcrumb entries to `frontend/src/lib/app-navigation.ts` and removing the old `/management/users` dependency from `frontend/src/components/app-header.tsx`.
- Used one reusable `AdminOnlyState` component for both admin-user pages instead of adding a broader route-guard system, because this task only needed minimal frontend enforcement for non-superadmin access.
- Removed the unsupported `viewer` option entirely and restored the missing canonical `reviewer` role in the create-user form so the UI matches the backend-owned role contract exactly.

## 2026-04-12T08:25:00Z Task: task-5 forced password change flow
- Centralized frontend onboarding state in `frontend/src/contexts/auth-context.tsx` by tracking `sessionMode`, `mustChangePassword`, `hasFullSession`, and `postAuthRedirectPath`; both login surfaces now depend on the same context-returned redirect target instead of each hardcoding `/overview`.
- Implemented the forced first-login form as a dedicated public route at `frontend/src/app/(public)/change-password/page.tsx`, keeping it accessible to setup-only sessions but redirecting full sessions to `/overview` and unauthenticated users back to `/login`.
- Put the primary full-session redirect guard in `frontend/src/app/(app)/layout.tsx` and left `frontend/src/components/app-shell.tsx` responsible only for full-session-only shell side effects, which keeps setup-only enforcement explicit without creating a second auth store.

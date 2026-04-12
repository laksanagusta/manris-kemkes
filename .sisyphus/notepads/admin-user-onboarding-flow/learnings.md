## 2026-04-12T05:01:35.884Z Task: startup
- Existing repo already uses admin-provided credentials on both login surfaces.
- Backend currently rejects any non-active user during login, so pending_activation requires explicit auth-path changes.
- Frontend currently exposes unsupported viewer role; cleanup must stay aligned with backend canonical roles.

## 2026-04-12T05:08:00Z Task: scout synthesis
- Migration pattern to reuse for status evolution: drop/recreate CHECK constraint with data-safe backfill similar to backend/db/migrations/000029_risk_status_in_review_in_approval.*.
- Latest additive user-table migration style is backend/db/migrations/000034_add_user_profile_fields.up.sql.
- backend/internal/domain/entity/auth.go already exposes status in UserProfile but not in UserPublic; Task 1 should expand auth DTOs there.
- backend/internal/middleware/auth.go JWTClaims currently has no setupOnly field; Task 3 will need custom claim extension.
- frontend auth/admin gotchas: app shell has no real route guard, admin sidebar renders unconditionally, login logic duplicated in frontend/src/app/page.tsx and frontend/src/app/(public)/login/page.tsx.

## 2026-04-12T05:30:00Z Task: task-1 schema and domain lifecycle state
- `backend/internal/usecase/user/create.go` already defaults blank user status to `active`, so entity-level status validation can become strict without breaking the current create flow before Task 2 changes provisioning defaults.
- `UserPublic` now needs the same lifecycle metadata as `UserProfile`; copying `status` and `mustChangePassword` in `ToPublic()` keeps later auth/UI tasks from inferring onboarding state indirectly.
- `CanUseFullSession()` is safest as `status == active && !must_change_password`, which keeps setup-only eligibility expressible in the entity layer before JWT branching is added in Task 3.

## 2026-04-12T06:10:00Z Task: task-2 provisioning contract
- The cleanest way to keep the HTTP contract plain-password only was to stop body-parsing directly into `CreateUserInput` and introduce a handler-only request DTO in `backend/internal/handler/http/user.go`.
- `backend/internal/repository/postgres/user.go` now needs to treat `GetByUsername` no-row lookups as `nil, nil`; otherwise username/email duplicate checks in the use case cannot distinguish “not found” from real repository failures.
- Grouping `/api/v1/users` under a dedicated `users := protected.Group("/users", middleware.RoleGuard("superadmin"))` block in `backend/cmd/server/main.go` keeps the authorization requirement obvious for future route additions.

## 2026-04-12T06:28:00Z Task: task-2 regression fix
- Reverting repository no-row semantics was safer than patching auth callers: `LoginUseCase` already depends on `GetByUsername` returning an error for unknown users, so duplicate-check tolerance now lives only in the Task 2 create-user path.

## 2026-04-12T07:24:00Z Task: task-3 setup-only login session
- `backend/internal/usecase/auth/login.go` needed the lifecycle branch after bcrypt verification, not before it: `pending_activation` must still prove the temporary password, while `inactive` remains blocked.
- The login response contract was missing lifecycle/session metadata even though the entity DTOs already carried user-level fields; adding top-level `sessionMode` and `mustChangePassword` to `entity.AuthToken` kept the HTTP envelope unchanged while making setup-only state explicit.
- The safest JWT extension was a direct bool custom claim `setupOnly`; `middleware.AuthRequired` can parse it and expose it via Fiber locals without changing existing `userId`/`role`/`organizationId` consumers.

## 2026-04-12T07:36:00Z Task: task-3 oracle follow-up
- Using `!user.CanUseFullSession()` for Task 3 was too broad because it could downgrade an `active` user with `must_change_password=true` into a setup-only session; the login branch needed to stay scoped to `pending_activation` only.
- `backend/internal/usecase/auth/me.go` also needed to copy `MustChangePassword` into `entity.UserProfile` so `/auth/me` stays consistent with the enriched login payload.

## 2026-04-12T05:58:37Z Task: task-4 change-password activation and gate
- The cleanest activation flow was a dedicated `ChangePasswordUseCase` that mutates the loaded pending user, hashes the new password with bcrypt, flips lifecycle flags, persists through `UserRepository.Update`, and then issues a brand-new full-session auth payload via the same auth-token builder used by login.
- Putting `RequireFullSession()` before `ResolveOrgScope(...)` on the main protected route group short-circuits setup-only traffic early and keeps `/auth/me` plus `/auth/change-password` reachable without forcing the setup flow through org-scope middleware it does not need.
- A stateful in-memory user repository stub was enough to prove the critical regression case: after activation, old temporary credentials fail login immediately while the new password returns a full session and `/auth/me` reflects `active` plus `mustChangePassword=false`.

## 2026-04-12T08:45:00Z Task: task-6 admin user-management UI and navigation cleanup
- The frontend still had two breadcrumb sources: `frontend/src/lib/app-navigation.ts` and a stale local map in `frontend/src/components/app-header.tsx`; importing the shared map into the header was the smallest way to keep `/admin/users` canonical without widening scope.
- Guarding the `/admin/users` pages in the page components themselves, while also hiding the Administration sidebar group for non-superadmins, keeps the UI aligned with the backend-only authorization rule even though the frontend app shell still lacks a centralized role gate.
- Reframing the admin list summary cards around lifecycle state (`pending_activation`, `active`, `inactive`) made the onboarding flow visible without adding a new page or changing backend contracts.

## 2026-04-12T08:25:00Z Task: task-5 forced password change flow
- The safest frontend shape was to let `AuthProvider` normalize both auth payload styles—login/change-password responses with `{ token, sessionMode, mustChangePassword, user }` and `/auth/me` session-restore responses with user-only data—so login pages and protected layouts never infer setup state differently.
- Guarding `(app)` routes in `frontend/src/app/(app)/layout.tsx` prevents the shell from mounting for setup-only sessions, while separately skipping the inbox-count fetch in `frontend/src/components/app-shell.tsx` avoids protected API calls if a partial session ever reaches the shell during state transitions.
- The frontend test harness currently targets pure `src/lib/*.test.ts` modules only, so this task’s strongest verification path remains file diagnostics plus fresh `npm run lint` and `npm run build` from `frontend/`.

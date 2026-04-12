## 2026-04-12T05:08:00Z Task: scout synthesis
- Current repo lacks dedicated login/auth handler tests; nearest handler test pattern is backend/internal/handler/http/working_paper_test.go.
- Current login usecase rejects all non-active statuses before password verification, so pending_activation cannot work until auth branching is changed.
- There is no centralized bcrypt hash-generation helper in repo; provisioning path must hash server-side explicitly.

## 2026-04-12T05:30:00Z Task: task-1 schema and domain lifecycle state
- No new blocking issue in Task 1, but rollout currently remains split across layers: schema/domain can represent `pending_activation`, while login behavior still rejects non-active users until Task 3 updates auth branching.

## 2026-04-12T05:42:00Z Task: task-1 verification
- `go test ./...` in backend still fails in `internal/repository/postgres` because local PostgreSQL at `localhost:5439` did not respond within test timeout during `TestFormCreateGetByIDRoundtrip`; unrelated to Task 1 files, but broad-suite verification remains environment-limited.

## 2026-04-12T06:10:00Z Task: task-2 provisioning contract
- Full-backend verification is still intentionally limited to targeted packages for this task because the known environment-bound PostgreSQL integration failure in broader repository tests remains unrelated to the provisioning contract change.

## 2026-04-12T06:28:00Z Task: task-2 regression fix
- Task 2 briefly introduced a login regression by making `GetByUsername` return `nil, nil` on `pgx.ErrNoRows`; existing auth code still dereferences `user.Status` after checking only `err`, so preserving repository contract compatibility was required.

## 2026-04-12T06:45:00Z Task: task-2 verification
- Targeted Task 2 packages and `go build ./...` passed, but `go test ./...` still fails in `internal/repository/postgres` because local PostgreSQL at `localhost:5439` is not responding.
- Live `curl` QA for `/api/health` and `/api/v1/users` could not run because `go run cmd/server/main.go` did not bring up a reachable local server in this environment within the verification window; strongest available runtime evidence remains handler-level `app.Test` coverage.

## 2026-04-12T07:24:00Z Task: task-3 verification
- Targeted auth package verification passed with `go test ./internal/usecase/auth ./internal/handler/http` and the JWT parsing seam passed with `go test ./internal/middleware`, but broader backend integration coverage remains limited by the same local PostgreSQL connectivity issue noted in Task 2.

## 2026-04-12T07:38:00Z Task: task-3 runtime verification
- Live `curl` QA for `/api/health` and `/api/v1/auth/login` could not run because `go run cmd/server/main.go` again did not produce a reachable local server on `localhost:8080` in this environment during the verification window; strongest runtime evidence remains targeted handler/middleware coverage.

## 2026-04-12T07:36:00Z Task: task-3 oracle follow-up verification
- Oracle review surfaced one Task 3 edge-case regression (active users with `must_change_password=true` could be downgraded to setup-only) and one `/auth/me` consistency gap; both were covered with focused failing tests first, then fixed and re-verified in the same targeted package set.

## 2026-04-12T05:58:37Z Task: task-4 verification
- Task 4 targeted verification passed for `./internal/usecase/auth`, `./internal/handler/http`, and `./internal/middleware`, and `go build ./...` succeeded from `backend/`; no dedicated `internal/repository/postgres` user-repository test existed to exercise the password-hash update path in isolation.

## 2026-04-12T08:02:00Z Task: task-4 runtime verification
- Live `curl` QA for `/api/health` and `/api/v1/auth/change-password` could not run because `go run cmd/server/main.go` again did not produce a reachable local server on `localhost:8080` during the verification window; strongest runtime evidence remains targeted handler/middleware coverage.

## 2026-04-12T08:45:00Z Task: task-6 admin user-management UI and navigation cleanup
- The frontend still duplicates some navigation concerns across shared components (`app-navigation` and sidebar/header consumers), so keeping `/admin/users` canonical in this task required touching both the metadata source and one breadcrumb consumer.

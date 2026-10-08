# Shared identity authentication

Auth is a shared identity service hosted inside the Manris repository. Manris and external applications consume the same accounts, profiles, organizations, organization hierarchy, and **global roles** (`superadmin`, `unit`, `reviewer`, `pimpinan`). There is no application-specific role assignment.

## Boundaries

- `backend/internal/identity/domain`: canonical user, organization, global role, shared profile, application, and session types.
- `backend/internal/identity/service`: login, live identity validation, profile/password changes, app credential lifecycle, and session revocation. No risk features or Manris feature flags.
- `backend/internal/identity/client`: HTTP validator for another backend consuming `/auth/me`.
- `backend/internal/repository/postgres/identity_auth.go`: shared session/app storage and directory adapter.
- `backend/internal/handler/http/identity_auth.go`: shared HTTP contract. Its Manris response adapter adds `capabilities.riskApprovalWorkflowEnabled`; external profiles omit Manris feature flags.
- `backend/internal/middleware/identity_auth.go`: the Manris consumer. It validates a `manris` session and builds access scope from the current shared profile, never stale JWT role claims.

Existing `domain/entity.User` and `Organization` are compatibility aliases to the identity-owned types. The existing `users` and `organizations` tables remain canonical: no duplicate directory, changed user IDs, or migration of business foreign keys. Existing administrative user/organization endpoints still manage those same identity records. The legacy auth usecases remain for compatibility, but runtime login, me, password and profile endpoints now use the shared service.

Manris currently uses a trusted in-process adapter. Its browser does not receive an APP_KEY. Other application backends authenticate with their own APP_KEY. The HTTP validator implements the same `Validator` interface for the future service split. Moving to another project still requires moving directory administration and replacing local directory repositories and database foreign keys with service contracts/stable IDs; this change does not pretend that cross-database extraction is already complete.

## Setup and rollout

1. Configure a random `JWT_SECRET` of at least 32 bytes on the auth backend only. Never distribute this signing secret to consuming applications.
2. Run migration `000071_shared_identity_auth` using the existing migration runner, e.g. `make migrate-up` from `backend`.
3. Restart the backend and sign in again. Old JWTs are intentionally rejected because they have no application binding or revocable session.

Token lifetime is configured with `AUTH_TOKEN_EXPIRY_MINUTES`. When unset, it inherits `JWT_EXPIRY_HOURS` (24 hours by default), preserving the existing login lifetime. Set `AUTH_TOKEN_EXPIRY_MINUTES=15` for 15-minute tokens. No refresh-token endpoint is introduced; users must log in again after expiry. Validate each protected request without caching if role updates and revocation must be immediate. Auth/storage outages stop protected requests with `503`.

All deployed auth traffic must use HTTPS. APP_KEY belongs in the consumer backend's secret configuration, never browser code, mobile bundles, URLs, or request logs. The password-proxy login flow assumes a trusted consumer backend: that backend sees the user's password. APP_KEY does not remove that trust requirement. This is a custom application-bound auth API, not a claim of OIDC/OAuth conformance.

## Register an application

Sign in to Manris as an active global superadmin. With the resulting Manris token:

```http
POST /api/v1/auth/apps
Authorization: Bearer <MANRIS_TOKEN>
Content-Type: application/json

{"id":"products","name":"Products application"}
```

Response:

```json
{
  "data": {
    "application": {
      "id": "products",
      "name": "Products application",
      "active": true
    },
    "appKey": "<ONE_TIME_SECRET>"
  }
}
```

The application ID uses 2–64 lowercase letters/digits/underscore/hyphen, beginning with a letter. `manris` is reserved and seeded by the migration. Store `appKey` as `APP_KEY` in the external backend. Only its SHA-256 hash is persisted, and subsequent listings do not expose it.

| Method | Path | Meaning |
| --- | --- | --- |
| GET | `/api/v1/auth/apps` | List application metadata |
| POST | `/api/v1/auth/apps` | Register application and return its key once |
| POST | `/api/v1/auth/apps/:id/rotate-key` | Return replacement key; invalidate old key and all prior app sessions |
| DELETE | `/api/v1/auth/apps/:id` | Disable application and invalidate its sessions |

Management requires a live, full Manris session and a current global superadmin role. App changes are recorded in `auth_application_events`. Manris cannot be disabled through this API; its key can be provisioned/rotated when introducing an HTTP consumer. Rotating its key also invalidates existing Manris sessions.

## External login and validation

The consumer backend receives a login request and forwards credentials to auth:

```http
POST /api/v1/auth/login
X-App-Key: <APP_KEY>
Content-Type: application/json

{"nip":"<NIP>","password":"<PASSWORD>"}
```

```json
{
  "data": {
    "token": "<USER_TOKEN>",
    "appId": "products",
    "expiresAt": "<UTC_TIMESTAMP>",
    "sessionMode": "full",
    "mustChangePassword": false,
    "user": {
      "id": "<STABLE_USER_UUID>",
      "name": "Dika",
      "role": "reviewer",
      "organizationId": "<ORGANIZATION_UUID>",
      "organization": {"id":"<ORGANIZATION_UUID>","name":"Direktorat A"},
      "accessibleOrgIds": ["<ORGANIZATION_UUID>","<DESCENDANT_UUID>"],
      "isGlobal": false,
      "status": "active"
    }
  }
}
```

The actual profile also includes email, NIP, job/rank/contact fields and timestamps when available. Password hashes and Manris feature flags are never exposed in external identity responses.

When the user calls the consumer's `/products`, its middleware calls:

```http
GET /api/v1/auth/me
Authorization: Bearer <USER_TOKEN>
X-App-Key: <APP_KEY>
```

A `200` response contains `{ "data": <shared profile> }` and an `X-Auth-App-Id` header identifying the validated application. Consumers must check that this header matches their configured application ID; the supplied Go client does this. The auth service verifies the key, token algorithm/signature/issuer/audience/expiry, persisted session, current key version, current password snapshot, active user, global role, and current organization membership. It reloads the directory every time, so profile/role/organization updates are shared immediately.

Only call the product handler after a successful valid response. Store the returned identity in request context and enforce that application's business permissions and resource organization boundaries. Never derive trusted identity from browser-provided role/org headers. Forward `401` for invalid credentials, use `403` for denied business permissions, and stop with `503` for auth timeouts/errors. An external token is rejected by Manris data APIs even when its user is a global superadmin.

The backend Go validator is available as:

```go
validator, err := client.New("https://auth.example/api/v1", "products", appKey)
// Handle err. appKey is loaded from server-only configuration.
identity, err := validator.Validate(ctx, "products", userToken)
// Handle err before accessing identity.Profile or running the business handler.
```

This client has a 3-second timeout, checks successful response shape, limits response size, and does not follow redirects. HTTP is accepted only for loopback development.

## Other shared endpoints

All external calls below require the app key and matching user token:

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/v1/auth/roles` | Shared global role vocabulary |
| GET | `/api/v1/auth/organizations` | Organizations within the user's current scope; all organizations for global superadmin |
| PUT | `/api/v1/auth/me` | Update name/email/NIP/job/rank; cannot self-assign role, organization or status |
| POST | `/api/v1/auth/change-password` | Verify current password, update password, invalidate all old sessions and issue replacement token for the same app |
| POST | `/api/v1/auth/logout` | Revoke this app session |

Profile update body: `name`, `email`, `nip`, `jabatan`, `pangkat`.
Password body: `currentPassword`, `newPassword`, `confirmPassword`.

A user requiring a password change gets a restricted Manris setup session and must change the password before accessing business APIs or external login. The restricted setup session already proves the temporary password was verified, so setup may omit `currentPassword`; full sessions must supply it. Pending/inactive accounts cannot log in. The Manris frontend now calls logout on the backend as well as removing local state. A failed network request cannot guarantee remote logout; token expiry remains the upper bound.

Successful identity responses use `Cache-Control: no-store`. Login is limited to 20 attempts per minute per IP, per server process. This can affect many users behind one external backend IP; review limits for the deployment and add a shared gateway limit when running multiple auth instances. Session records persist for audit/revocation: schedule retention cleanup of expired sessions using `auth_sessions.expires_at` rather than allowing the table to grow indefinitely.

## Validation

Targeted HTTP tests cover global identity consistency, app isolation, shared profile changes, live role/organization changes, revoked/expired/malformed tokens, disabled users/apps, key rotation, password-change revocation, setup restrictions, error handling and login rate limits. PostgreSQL integration tests apply both migration directions in a disposable schema and verify actual key/session persistence and audit events.

```sh
go test ./internal/identity/... ./internal/middleware ./internal/handler/http ./internal/usecase/auth
# Use a disposable test database, never a production database:
go test -tags=integration ./internal/repository/postgres -run TestIdentityAuthPostgresMigrationAndLifecycle
```

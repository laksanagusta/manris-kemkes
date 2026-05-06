# NIP Auth Hard Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace username-based authentication and registration with NIP-based identity across database, backend, frontend, and tests, while removing username from user-facing APIs and forms.

**Architecture:** The cutover keeps the `users` table as the source of truth but promotes `nip` to the only login identifier and removes `username` from request and response contracts that serve the app UI. The change lands in one vertical slice: migration first, then backend auth and user management, then frontend forms and session typing, then regression coverage.

**Tech Stack:** Go 1.25, Fiber, pgx/PostgreSQL, Next.js 16, React 19, TypeScript 5, Node test runner, Go test

---

### Task 1: Enforce NIP as the canonical database identifier

**Files:**
- Create: `backend/db/migrations/000055_users_nip_hard_cutover.up.sql`
- Create: `backend/db/migrations/000055_users_nip_hard_cutover.down.sql`
- Modify: `backend/db/migrations/000034_add_user_profile_fields.up.sql`
- Test: `backend/internal/repository/postgres/user.go`

- [ ] **Step 1: Write the migration with a fail-fast data guard**

```sql
-- backend/db/migrations/000055_users_nip_hard_cutover.up.sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users
        WHERE TRIM(COALESCE(nip, '')) = ''
    ) THEN
        RAISE EXCEPTION 'cannot cut over to NIP login: users with empty NIP still exist';
    END IF;

    IF EXISTS (
        SELECT nip
        FROM users
        GROUP BY nip
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'cannot cut over to NIP login: duplicate NIP values still exist';
    END IF;
END $$;

ALTER TABLE users
    ALTER COLUMN nip DROP DEFAULT,
    ALTER COLUMN nip SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_nip_unique_idx ON users (nip);

ALTER TABLE users
    ALTER COLUMN username DROP NOT NULL;
```

- [ ] **Step 2: Write the rollback migration**

```sql
-- backend/db/migrations/000055_users_nip_hard_cutover.down.sql
DROP INDEX IF EXISTS users_nip_unique_idx;

ALTER TABLE users
    ALTER COLUMN username SET NOT NULL;

ALTER TABLE users
    ALTER COLUMN nip SET DEFAULT '',
    ALTER COLUMN nip SET NOT NULL;
```

- [ ] **Step 3: Keep historical migrations untouched except comments**

```sql
-- backend/db/migrations/000034_add_user_profile_fields.up.sql
-- Keep this migration immutable except clarifying comments.
-- The hard cutover constraints belong in 000055_users_nip_hard_cutover.
ALTER TABLE users ADD COLUMN nip TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN jabatan TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN pangkat TEXT NOT NULL DEFAULT '';
```

- [ ] **Step 4: Run migrations on a local database**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && make migrate-up`

Expected: latest migration applies successfully, or fails with the explicit empty/duplicate NIP error if seed data is not ready.

- [ ] **Step 5: Verify the schema shape**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && psql "$DATABASE_URL" -c "\\d users"`

Expected: `nip` is `not null`, a unique index exists on `nip`, and `username` is nullable.

- [ ] **Step 6: Commit**

```bash
git add backend/db/migrations/000055_users_nip_hard_cutover.up.sql backend/db/migrations/000055_users_nip_hard_cutover.down.sql backend/db/migrations/000034_add_user_profile_fields.up.sql
git commit -m "feat: promote nip as canonical user identifier"
```

### Task 2: Cut backend auth and user contracts over to NIP

**Files:**
- Modify: `backend/internal/domain/entity/auth.go`
- Modify: `backend/internal/domain/entity/user.go`
- Modify: `backend/internal/domain/errors/errors.go`
- Modify: `backend/internal/domain/repository/user.go`
- Modify: `backend/internal/handler/http/auth.go`
- Modify: `backend/internal/handler/http/user.go`
- Modify: `backend/internal/repository/postgres/user.go`
- Modify: `backend/internal/usecase/auth/login.go`
- Modify: `backend/internal/usecase/auth/payload.go`
- Modify: `backend/internal/usecase/auth/register.go`
- Modify: `backend/internal/usecase/auth/update_profile.go`
- Modify: `backend/internal/usecase/user/create.go`
- Modify: `backend/internal/repository/user_legacy.go`

- [ ] **Step 1: Write a failing backend auth test for NIP login**

```go
func TestLoginExecuteUsesNIPAsIdentifier(t *testing.T) {
    passwordHash, _ := bcrypt.GenerateFromPassword([]byte("TempPass123!"), bcrypt.DefaultCost)
    uc := NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
        ID:           uuid.New(),
        NIP:          "199001012020122001",
        Name:         "Active User",
        Role:         entity.RoleUnit,
        Status:       entity.UserStatusActive,
        PasswordHash: string(passwordHash),
    }}, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24, true)

    result, err := uc.Execute(context.Background(), LoginInput{
        NIP:      "199001012020122001",
        Password: "TempPass123!",
    })

    if err != nil {
        t.Fatalf("expected no error, got %v", err)
    }
    if result == nil || result.User == nil || result.User.NIP != "199001012020122001" {
        t.Fatal("expected login result to be keyed by NIP")
    }
}
```

- [ ] **Step 2: Run the focused backend auth tests and confirm they fail**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && go test ./internal/usecase/auth -run TestLoginExecuteUsesNIPAsIdentifier -v`

Expected: FAIL because `LoginInput` and the repository lookup still use `Username`.

- [ ] **Step 3: Replace username-centric contracts with NIP-centric ones**

```go
// backend/internal/domain/entity/auth.go
type LoginCredentials struct {
    NIP      string `json:"nip"`
    Password string `json:"password"`
}

func (c *LoginCredentials) Validate() error {
    if c.NIP == "" {
        return errors.Wrap(errors.ErrInvalidInput, "nip cannot be empty")
    }
    if c.Password == "" {
        return errors.ErrInvalidPassword
    }
    return nil
}

type UserPublic struct {
    ID                 uuid.UUID        `json:"id"`
    Name               string           `json:"name"`
    Email              string           `json:"email"`
    Role               string           `json:"role"`
    NIP                string           `json:"nip"`
    OrganizationID     *uuid.UUID       `json:"organizationId,omitempty"`
    OrgName            string           `json:"orgName,omitempty"`
    AccessibleOrgIDs   []uuid.UUID      `json:"accessibleOrgIds,omitempty"`
    IsGlobal           bool             `json:"isGlobal"`
    Status             string           `json:"status"`
    Jabatan            string           `json:"jabatan,omitempty"`
    Pangkat            string           `json:"pangkat,omitempty"`
    PhoneNumber        string           `json:"phoneNumber,omitempty"`
    Capabilities       UserCapabilities `json:"capabilities"`
    MustChangePassword bool             `json:"mustChangePassword"`
}
```

```go
// backend/internal/usecase/auth/login.go
type LoginInput struct {
    NIP      string
    Password string
}

func (uc *LoginUseCase) Execute(ctx context.Context, input LoginInput) (*entity.AuthToken, error) {
    if err := validateLoginInput(input); err != nil {
        return nil, err
    }

    user, err := uc.userRepo.GetByNIP(ctx, input.NIP)
    if err != nil || user == nil {
        return nil, errors.ErrInvalidCredentials
    }

    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
        return nil, errors.ErrInvalidCredentials
    }

    if user.Status == entity.UserStatusInactive {
        return nil, errors.ErrAccountInactive
    }
    if user.IsPendingActivation() {
        return nil, errors.ErrAccountPendingApproval
    }

    return buildAuthToken(ctx, uc.hierarchySvc, uc.jwtSecret, uc.jwtExpiry, uc.riskApprovalWorkflowEnabled, user, entity.AuthSessionModeFull, false)
}
```

```go
// backend/internal/handler/http/auth.go
type LoginRequest struct {
    NIP      string `json:"nip"`
    Password string `json:"password"`
}

type RegisterRequest struct {
    Name            string `json:"name"`
    Email           string `json:"email"`
    Password        string `json:"password"`
    ConfirmPassword string `json:"confirmPassword"`
    OrganizationID  string `json:"organizationId"`
    NIP             string `json:"nip"`
    Jabatan         string `json:"jabatan"`
    Pangkat         string `json:"pangkat"`
    PhoneNumber     string `json:"phoneNumber"`
}
```

```go
// backend/internal/usecase/user/create.go
type CreateUserInput struct {
    Name           string
    Email          string
    Password       string
    Role           string
    OrganizationID *uuid.UUID
    NIP            string
    Jabatan        string
    Pangkat        string
    PhoneNumber    string
}

if input.NIP == "" {
    return nil, errors.Wrap(errors.ErrInvalidInput, "nip cannot be empty")
}

existingUser, err := uc.userRepo.GetByNIP(ctx, input.NIP)
if existingUser != nil {
    return nil, errors.Wrap(errors.ErrInvalidInput, "nip already exists")
}
```

- [ ] **Step 4: Remove username from user-facing payload builders but keep the internal model compiling**

```go
// backend/internal/usecase/auth/payload.go
func buildUserProfile(user *entity.User, scope *entity.AccessScope, riskApprovalWorkflowEnabled bool) *entity.UserProfile {
    return &entity.UserProfile{
        ID:               user.ID,
        Name:             user.Name,
        Email:            user.Email,
        Role:             user.Role,
        NIP:              user.NIP,
        OrganizationID:   user.OrganizationID,
        OrgName:          user.OrgName,
        AccessibleOrgIDs: scope.AccessibleOrgIDs,
        IsGlobal:         scope.IsGlobal,
        Status:           user.Status,
        Jabatan:          user.Jabatan,
        Pangkat:          user.Pangkat,
        PhoneNumber:      user.PhoneNumber,
        Capabilities: entity.UserCapabilities{
            RiskApprovalWorkflowEnabled: riskApprovalWorkflowEnabled,
        },
        MustChangePassword: user.MustChangePassword,
        CreatedAt:          user.CreatedAt,
        UpdatedAt:          user.UpdatedAt,
    }
}
```

```go
// backend/internal/domain/entity/user.go
type User struct {
    ID                 uuid.UUID  `json:"id"`
    Name               string     `json:"name"`
    Email              string     `json:"email"`
    PasswordHash       string     `json:"-"`
    Role               string     `json:"role"`
    OrganizationID     *uuid.UUID `json:"organizationId,omitempty"`
    OrgName            string     `json:"orgName,omitempty"`
    Status             string     `json:"status"`
    MustChangePassword bool       `json:"mustChangePassword"`
    NIP                string     `json:"nip"`
    Jabatan            string     `json:"jabatan"`
    Pangkat            string     `json:"pangkat"`
    PhoneNumber        string     `json:"phoneNumber"`
    CreatedAt          time.Time  `json:"createdAt"`
    UpdatedAt          time.Time  `json:"updatedAt"`
}
```

- [ ] **Step 5: Update repository queries and search behavior**

```go
// backend/internal/repository/postgres/user.go
func (r *userRepository) GetByNIP(ctx context.Context, nip string) (*entity.User, error) {
    user := &entity.User{}
    err := r.pool.QueryRow(ctx,
        `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.organization_id, COALESCE(o.name, '') as org_name, u.status, u.must_change_password, u.nip, u.jabatan, u.pangkat, u.phone_number, u.created_at, u.updated_at
         FROM users u LEFT JOIN organizations o ON u.organization_id = o.id
         WHERE u.nip = $1`, nip,
    ).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.Role, &user.OrganizationID, &user.OrgName, &user.Status, &user.MustChangePassword, &user.NIP, &user.Jabatan, &user.Pangkat, &user.PhoneNumber, &user.CreatedAt, &user.UpdatedAt)
    if err != nil {
        return nil, fmt.Errorf("find user by nip: %w", err)
    }
    return user, nil
}

if filter.Q != "" {
    f := fmt.Sprintf(" AND (u.name ILIKE $%d OR u.nip ILIKE $%d OR u.email ILIKE $%d)", argIdx, argIdx, argIdx)
    countQuery += f
    dataQuery += f
    args = append(args, "%"+filter.Q+"%")
    argIdx++
}
```

- [ ] **Step 6: Run focused backend tests**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && go test ./internal/usecase/auth ./internal/usecase/user ./internal/handler/http ./internal/mcp/tools -v`

Expected: PASS with login/register/create-user contracts using `nip`.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/entity/auth.go backend/internal/domain/entity/user.go backend/internal/domain/errors/errors.go backend/internal/domain/repository/user.go backend/internal/handler/http/auth.go backend/internal/handler/http/user.go backend/internal/repository/postgres/user.go backend/internal/usecase/auth/login.go backend/internal/usecase/auth/payload.go backend/internal/usecase/auth/register.go backend/internal/usecase/auth/update_profile.go backend/internal/usecase/user/create.go backend/internal/repository/user_legacy.go
git commit -m "refactor: switch backend auth and user flows to nip"
```

### Task 3: Rewrite backend tests, MCP auth tooling, and fixtures around NIP

**Files:**
- Modify: `backend/internal/usecase/auth/login_test.go`
- Modify: `backend/internal/usecase/auth/register_test.go`
- Modify: `backend/internal/usecase/auth/change_password_test.go`
- Modify: `backend/internal/handler/http/auth_test.go`
- Modify: `backend/internal/mcp/tools/auth.go`
- Modify: `backend/internal/mcp/tools/auth_test.go`
- Modify: `backend/internal/mcp/README.md`
- Modify: `backend/internal/mcp/integration/e2e_test.go`

- [ ] **Step 1: Write the failing MCP/auth handler tests first**

```go
func TestHandleLoginRequiresNIPAndPassword(t *testing.T) {
    _, err := HandleLogin(context.Background(), deps, "", "pass")
    if err != ErrMissingCredentials {
        t.Fatalf("expected ErrMissingCredentials, got %v", err)
    }
}

func TestAuthLoginHandlerParsesNIPField(t *testing.T) {
    body := `{"nip":"199001012020122001","password":"TempPass123!"}`
    // assert handler forwards LoginInput{NIP: "..."}
}
```

- [ ] **Step 2: Run the targeted backend tests and confirm they fail**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && go test ./internal/mcp/tools ./internal/handler/http -run 'TestHandleLoginRequiresNIPAndPassword|TestAuthLoginHandlerParsesNIPField' -v`

Expected: FAIL because the tools and handlers still speak `username`/`email`.

- [ ] **Step 3: Update the MCP login tool and docs to use `nip`**

```go
// backend/internal/mcp/tools/auth.go
var (
    ErrMissingCredentials = errors.New("nip and password required")
    ErrUserNotFound       = errors.New("user not found")
)

func HandleLogin(ctx context.Context, deps Deps, nip, password string) (map[string]interface{}, error) {
    if nip == "" || password == "" {
        return nil, ErrMissingCredentials
    }

    result, err := deps.AuthLoginUC.Execute(ctx, authuc.LoginInput{
        NIP:      nip,
        Password: password,
    })
    if err != nil {
        return nil, err
    }

    output := map[string]interface{}{
        "user_id":              result.User.ID.String(),
        "nip":                  result.User.NIP,
        "name":                 result.User.Name,
        "email":                result.User.Email,
        "role":                 result.User.Role,
        "organization_id":      orgIDStr,
        "accessible_org_ids":   orgIDStrs,
        "is_global":            result.User.IsGlobal,
        "session_expires_at":   expiryTime.Format(time.RFC3339),
        "must_change_password": result.User.MustChangePassword,
    }
    return output, nil
}
```

```md
<!-- backend/internal/mcp/README.md -->
{
  "nip": "199001012020122001",
  "password": "TempPass123!"
}
```

- [ ] **Step 4: Replace username-based test fixtures and assertions**

```go
// backend/internal/usecase/auth/login_test.go
uc := NewLoginUseCase(&loginStubUserRepo{user: &entity.User{
    ID:           uuid.New(),
    NIP:          "199001012020122001",
    Name:         "Active User",
    Role:         entity.RoleSuperAdmin,
    Status:       entity.UserStatusActive,
    PasswordHash: string(passwordHash),
}}, hierarchySvc, "secret", 24, true)

result, err := uc.Execute(context.Background(), LoginInput{
    NIP:      "199001012020122001",
    Password: "TempPass123!",
})
```

- [ ] **Step 5: Run the full backend test suite**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && go test ./...`

Expected: PASS. Any remaining failure mentioning `username` should be fixed before moving on.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/usecase/auth/login_test.go backend/internal/usecase/auth/register_test.go backend/internal/usecase/auth/change_password_test.go backend/internal/handler/http/auth_test.go backend/internal/mcp/tools/auth.go backend/internal/mcp/tools/auth_test.go backend/internal/mcp/README.md backend/internal/mcp/integration/e2e_test.go
git commit -m "test: update backend auth fixtures for nip login"
```

### Task 4: Cut frontend auth, registration, and admin user creation over to NIP

**Files:**
- Modify: `frontend/src/components/login-screen.tsx`
- Modify: `frontend/src/components/register-screen.tsx`
- Modify: `frontend/src/contexts/auth-context.tsx`
- Modify: `frontend/src/lib/api/auth.ts`
- Modify: `frontend/src/lib/api/users.ts`
- Modify: `frontend/src/app/(app)/admin/users/new/page.tsx`
- Modify: `frontend/src/app/(app)/admin/users/page.tsx`
- Modify: `frontend/src/lib/auth-helpers.test.ts`
- Modify: `frontend/src/lib/api/auth.test.ts`

- [ ] **Step 1: Write the failing frontend API contract test**

```ts
test("registerUser sends nip without username", async () => {
  await authApi.registerUser({
    name: "Siti Rahma",
    email: "siti@kemenkes.go.id",
    phoneNumber: "081234567890",
    password: "TempPass123!",
    confirmPassword: "TempPass123!",
    organizationId: "org-1",
    nip: "199001012020122001",
    jabatan: "Staf",
    pangkat: "III/a",
  });

  assert.deepEqual(calls[0]?.body, {
    name: "Siti Rahma",
    email: "siti@kemenkes.go.id",
    phoneNumber: "081234567890",
    password: "TempPass123!",
    confirmPassword: "TempPass123!",
    organizationId: "org-1",
    nip: "199001012020122001",
    jabatan: "Staf",
    pangkat: "III/a",
  });
});
```

- [ ] **Step 2: Run the focused frontend tests and confirm they fail**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/frontend && node --test src/lib/api/auth.test.ts`

Expected: FAIL because the payload still includes `username`.

- [ ] **Step 3: Switch the auth context and login UI to NIP**

```tsx
// frontend/src/components/login-screen.tsx
const [nip, setNip] = useState("");

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);
  try {
    const result = await login(nip, password);
    router.replace(result.redirectTo);
  } catch (err: unknown) {
    setError(getErrorMessage(err));
  } finally {
    setIsLoading(false);
  }
};

<Label htmlFor="nip" className="text-xs font-medium">NIP</Label>
<Input
  id="nip"
  placeholder="masukkan NIP"
  required
  value={nip}
  onChange={(event) => setNip(event.target.value)}
/>
```

```tsx
// frontend/src/contexts/auth-context.tsx
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  nip: string;
  // keep the remaining fields that are actually used by the app
};

const login = useCallback(async (nip: string, password: string) => {
  const res = await api.post<AuthPayload>("/auth/login", {
    nip,
    password,
  });
  return applyAuthState(res, res.token);
}, [applyAuthState]);
```

- [ ] **Step 4: Remove username from registration and admin create-user forms**

```tsx
// frontend/src/lib/api/auth.ts
export interface RegisterInput {
  name: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword?: string;
  organizationId: string;
  nip: string;
  jabatan?: string;
  pangkat?: string;
}

return api.post<RegisterResponse>("/auth/register", {
  name: input.name,
  email: input.email,
  phoneNumber: input.phoneNumber,
  password: input.password,
  confirmPassword: input.confirmPassword ?? input.password,
  organizationId: input.organizationId,
  nip: input.nip,
  jabatan: input.jabatan ?? "",
  pangkat: input.pangkat ?? "",
});
```

```tsx
// frontend/src/app/(app)/admin/users/new/page.tsx
const [nip, setNip] = useState("");

if (!name || !email || !phoneNumber || !password || !nip) {
  toast.error("Lengkapi nama, NIP, email, phone number, dan password terlebih dahulu.");
  return;
}

await api.post("/users", {
  name,
  email,
  password,
  role,
  organizationId: role === "superadmin" ? null : orgId,
  phoneNumber,
  nip,
  jabatan,
  pangkat,
}, token || undefined);
```

- [ ] **Step 5: Update user list typing and search copy**

```ts
// frontend/src/lib/api/users.ts
export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  role: string;
  status: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
  orgName?: string | null;
}
```

```tsx
// frontend/src/app/(app)/admin/users/page.tsx
placeholder="Cari pengguna, NIP, atau email"
```

- [ ] **Step 6: Run the relevant frontend checks**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/frontend && npm run lint`

Expected: PASS with no unused `username` state, props, or types in auth and admin-user flows.

Run: `cd /Users/dikalaksana/Engineering/manris-v2/frontend && npm run build`

Expected: PASS with `login-screen`, `register-screen`, admin create user, and auth context all compiling against `nip`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/login-screen.tsx frontend/src/components/register-screen.tsx frontend/src/contexts/auth-context.tsx frontend/src/lib/api/auth.ts frontend/src/lib/api/users.ts 'frontend/src/app/(app)/admin/users/new/page.tsx' 'frontend/src/app/(app)/admin/users/page.tsx' frontend/src/lib/auth-helpers.test.ts frontend/src/lib/api/auth.test.ts
git commit -m "feat: switch frontend auth and registration to nip"
```

### Task 5: Remove residual username usage from app-facing types and finish verification

**Files:**
- Modify: `frontend/src/lib/risk-register-user-picker.ts`
- Modify: `frontend/src/app/(app)/risk/working-papers/new/page.tsx`
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/lib/risk-approval-line.ts`
- Modify: `frontend/src/lib/risk-approval-line.test.ts`
- Modify: `frontend/src/lib/auth-helpers.test.ts`

- [ ] **Step 1: Search for remaining app-facing `username` references**

Run: `cd /Users/dikalaksana/Engineering/manris-v2 && rg -n "\\busername\\b" backend frontend`

Expected: results should be limited to intentionally retained internals only. Anything still exposed in app-facing auth/user types moves into this task.

- [ ] **Step 2: Remove username from frontend helper types that model user identity**

```ts
// frontend/src/lib/risk-register-user-picker.ts
export type RiskRegisterUserOption = {
  id: string;
  name: string;
  nip?: string | null;
  email?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
};
```

```ts
// frontend/src/lib/risk-approval-line.ts
export type ApprovalLineMember = {
  id: string;
  name: string;
  nip?: string | null;
  role?: string | null;
  email?: string | null;
};
```

- [ ] **Step 3: Update page-level mapping code that still copies `user.username`**

```tsx
// frontend/src/app/(app)/risk/register/new/page.tsx
const currentUser = {
  id: user.id,
  name: user.name,
  nip: user.nip,
  email: user.email,
  role: user.role,
};
```

- [ ] **Step 4: Re-run the project-wide regression checks**

Run: `cd /Users/dikalaksana/Engineering/manris-v2/backend && go test ./...`

Expected: PASS.

Run: `cd /Users/dikalaksana/Engineering/manris-v2/frontend && npm run lint && npm run build`

Expected: PASS.

- [ ] **Step 5: Smoke-test the main user journeys manually**

Run:

```bash
cd /Users/dikalaksana/Engineering/manris-v2/backend && make run
cd /Users/dikalaksana/Engineering/manris-v2/frontend && npm run dev
```

Manual checklist:
- Login screen accepts `NIP` and rejects wrong password.
- Self-registration submits without a username field.
- Super Admin can create a user without a username field.
- Newly created user can log in with NIP and is still forced through first-password change.
- Admin user list still loads and searching by NIP works.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/risk-register-user-picker.ts frontend/src/app/(app)/risk/working-papers/new/page.tsx frontend/src/app/(app)/risk/assessment/[id]/page.tsx frontend/src/app/(app)/risk/register/new/page.tsx frontend/src/lib/risk-approval-line.ts frontend/src/lib/risk-approval-line.test.ts frontend/src/lib/auth-helpers.test.ts
git commit -m "refactor: remove residual username usage from app flows"
```

### Task 6: Final review, release notes, and deployment safety

**Files:**
- Modify: `docs/superpowers/plans/2026-05-06-nip-auth-hard-cutover.md`
- Optional: team release note or deployment checklist document if one exists

- [ ] **Step 1: Capture the rollout caveats in the plan footer**

```md
## Deployment Notes

- Run `make migrate-up` before deploying the backend.
- Do not deploy this change until every existing user record has a unique non-empty `nip`.
- If migration 000055 fails, repair the offending data first rather than bypassing the guard.
- After deploy, notify users that login identifiers changed from username/email to NIP.
```

- [ ] **Step 2: Re-run a final grep for auth payload regressions**

Run: `cd /Users/dikalaksana/Engineering/manris-v2 && rg -n '"/auth/login"|json:"username"|username:' backend frontend`

Expected: only intentionally retained legacy/internal references remain. There should be no app-facing login/register contract still using `username`.

- [ ] **Step 3: Prepare the final integration summary**

```md
Done when all of the following are true:
- database migration 000055 applies cleanly
- backend test suite passes
- frontend lint and build pass
- manual login/register/admin-create-user smoke tests pass
- app-facing auth payloads only use `nip`
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-05-06-nip-auth-hard-cutover.md
git commit -m "docs: finalize nip auth cutover plan"
```

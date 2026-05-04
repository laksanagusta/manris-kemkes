# Self-Registration With Superadmin Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public self-registration for `unit` users, keep those accounts blocked until superadmin approval, and let superadmins approve or reject registrations from the existing users admin page.

**Architecture:** Persist pending registrations directly in the existing `users` table, extend the auth domain with a dedicated public registration use case, and change login so `pending_activation` users are rejected instead of receiving a setup session. For admin review, add explicit superadmin-only approval and rejection actions so the admin UI can transition pending users safely without reusing the generic full-profile update flow.

**Tech Stack:** Go 1.26, Fiber, pgx/PostgreSQL, Next.js 16 App Router, React 19, TypeScript, node:test.

---

## File Map

### Backend

- `backend/db/migrations/000048_add_user_phone_number.up.sql`
  Add `phone_number` to `users`, backfill existing rows with a safe default, and keep admin-created users compatible.
- `backend/db/migrations/000048_add_user_phone_number.down.sql`
  Roll back the schema change cleanly.
- `backend/internal/domain/entity/user.go`
  Add `PhoneNumber` to the domain model.
- `backend/internal/domain/entity/auth.go`
  Expose `PhoneNumber` in public auth/profile payloads where needed.
- `backend/internal/domain/errors/errors.go`
  Add an explicit pending-approval auth error and keep error mapping consistent.
- `backend/internal/domain/repository/user.go`
  Add `GetByNIP` and any contract needed by registration review.
- `backend/internal/repository/postgres/user.go`
  Read/write `phone_number`, implement `GetByNIP`, and keep list/filter queries aligned.
- `backend/internal/usecase/auth/register.go`
  Create the public self-registration use case.
- `backend/internal/usecase/auth/register_test.go`
  Cover success, duplicate identity data, password mismatch, organization validation, and forced `unit` role behavior.
- `backend/internal/usecase/auth/login.go`
  Reject `pending_activation` at login time.
- `backend/internal/usecase/auth/login_test.go`
  Replace the current setup-session expectation with a pending-approval rejection expectation.
- `backend/internal/handler/http/auth.go`
  Add the register request DTO and `Register` handler.
- `backend/internal/handler/http/auth_test.go`
  Verify the new public registration endpoint and the login rejection behavior.
- `backend/internal/usecase/user/approve_registration.go`
  Activate a pending user.
- `backend/internal/usecase/user/approve_registration_test.go`
  Cover success and non-pending rejection.
- `backend/internal/usecase/user/reject_registration.go`
  Delete only pending registrations.
- `backend/internal/usecase/user/reject_registration_test.go`
  Cover success and non-pending rejection.
- `backend/internal/handler/http/user.go`
  Add dedicated approval/rejection handlers for pending registrations.
- `backend/internal/handler/http/user_test.go`
  Verify superadmin-only access and pending-only review actions.
- `backend/internal/bootstrap/bootstrap.go`
  Wire the new use cases into the container.
- `backend/cmd/server/main.go`
  Register the new auth and admin review routes.

### Frontend

- `frontend/src/lib/api/auth.ts`
  Add the public registration API client and unauthenticated organization lookup helper.
- `frontend/src/lib/api/auth.test.ts`
  Verify the registration request path and payload shape.
- `frontend/src/components/register-screen.tsx`
  Build the public registration form and confirmation state.
- `frontend/src/app/(public)/register/page.tsx`
  Expose the new public registration route.
- `frontend/src/components/login-screen.tsx`
  Link to registration and show the pending-approval error cleanly.
- `frontend/src/lib/api/users.ts`
  Add pending-registration review actions and include `phoneNumber` in list items.
- `frontend/src/lib/admin-user-registration.ts`
  Keep pending-review row logic in a small pure helper.
- `frontend/src/lib/admin-user-registration.test.ts`
  Verify action gating for pending vs non-pending users.
- `frontend/src/app/(app)/admin/users/page.tsx`
  Show phone information, render approve/reject controls for pending users, and refresh the table after actions.

## Task 1: Expand the user model for self-registration data

**Files:**
- Create: `backend/db/migrations/000048_add_user_phone_number.up.sql`
- Create: `backend/db/migrations/000048_add_user_phone_number.down.sql`
- Modify: `backend/internal/domain/entity/user.go`
- Modify: `backend/internal/domain/entity/auth.go`
- Modify: `backend/internal/domain/repository/user.go`
- Modify: `backend/internal/repository/postgres/user.go`
- Modify: `backend/internal/usecase/user/create_test.go`

- [x] **Step 1: Add failing coverage for `PhoneNumber` persistence in the existing user creation test.**

```go
result, err := uc.Execute(context.Background(), CreateUserInput{
	Name:        "Unit Test User",
	Username:    "unit-test-user",
	Email:       "unit-test-user@manris.local",
	Password:    "TempPass123!",
	Role:        entity.RoleUnit,
	OrganizationID: &orgID,
	PhoneNumber: "081234567890",
})

if userRepo.created.PhoneNumber != "081234567890" {
	t.Fatalf("expected phone number to be persisted, got %q", userRepo.created.PhoneNumber)
}
```

- [x] **Step 2: Run the focused backend test and confirm it fails because the model/input/repository contract does not know about `PhoneNumber` yet.**

Run: `go test ./internal/usecase/user -run TestCreateUserExecuteHashesPasswordAndSetsOnboardingDefaults -v`  
Expected: FAIL with compile errors for missing `PhoneNumber` fields or assertions.

- [x] **Step 3: Implement the minimal schema and repository contract changes.**

```sql
ALTER TABLE users
ADD COLUMN phone_number TEXT NOT NULL DEFAULT '';
```

```go
type User struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Username    string    `json:"username"`
	Email       string    `json:"email"`
	PhoneNumber string    `json:"phoneNumber"`
	Role        string    `json:"role"`
	Status      string    `json:"status"`
}

type UserRepository interface {
	Create(ctx context.Context, user *entity.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	GetByUsername(ctx context.Context, username string) (*entity.User, error)
	GetByNIP(ctx context.Context, nip string) (*entity.User, error)
	Update(ctx context.Context, user *entity.User) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context) ([]*entity.User, error)
	ListWithFilter(ctx context.Context, filter UserListFilter) ([]*entity.User, int, error)
}
```

```go
`INSERT INTO users (name, username, email, password_hash, role, organization_id, status, must_change_password, nip, jabatan, pangkat, phone_number, created_at, updated_at)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())`
```

- [x] **Step 4: Re-run the same test and confirm it passes with the new field flowing through the user model.**

Run: `go test ./internal/usecase/user -run TestCreateUserExecuteHashesPasswordAndSetsOnboardingDefaults -v`  
Expected: PASS.

- [x] **Step 5: Commit the schema-contract checkpoint.**

```bash
git add backend/db/migrations/000048_add_user_phone_number.up.sql \
  backend/db/migrations/000048_add_user_phone_number.down.sql \
  backend/internal/domain/entity/user.go \
  backend/internal/domain/entity/auth.go \
  backend/internal/domain/repository/user.go \
  backend/internal/repository/postgres/user.go \
  backend/internal/usecase/user/create_test.go
git commit -m "feat: add phone number to user model"
```

## Task 2: Build the public registration backend flow

**Files:**
- Create: `backend/internal/usecase/auth/register.go`
- Create: `backend/internal/usecase/auth/register_test.go`
- Modify: `backend/internal/usecase/user/create.go`
- Modify: `backend/internal/domain/errors/errors.go`

- [x] **Step 1: Write failing registration use-case tests for success, duplicate NIP, password mismatch, and forced `unit` role.**

```go
func TestRegisterUseCaseCreatesPendingUnitUser(t *testing.T) {
	orgID := uuid.New()
	uc := NewRegisterUseCase(userRepo, orgRepo)

	result, err := uc.Execute(context.Background(), RegisterInput{
		Name:            "Siti Rahma",
		Email:           "siti@kemenkes.go.id",
		Username:        "siti.rahma",
		Password:        "TempPass123!",
		ConfirmPassword: "TempPass123!",
		OrganizationID:  orgID,
		NIP:             "199001012020122001",
		PhoneNumber:     "081234567890",
	})

	if err != nil { t.Fatalf("expected no error, got %v", err) }
	if userRepo.created.Role != entity.RoleUnit { t.Fatalf("expected forced unit role, got %q", userRepo.created.Role) }
	if userRepo.created.Status != entity.UserStatusPendingActivation { t.Fatalf("expected pending activation") }
	if userRepo.created.MustChangePassword { t.Fatalf("expected mustChangePassword false") }
}
```

```go
func TestRegisterUseCaseRejectsDuplicateNIP(t *testing.T) {
	orgID := uuid.New()
	_, err := uc.Execute(context.Background(), RegisterInput{
		Name:            "Siti Rahma",
		Email:           "siti.rahma.2@kemenkes.go.id",
		Username:        "siti.rahma.2",
		Password:        "TempPass123!",
		ConfirmPassword: "TempPass123!",
		OrganizationID:  orgID,
		NIP:             "199001012020122001",
		PhoneNumber:     "081234567891",
	})
	if err == nil { t.Fatal("expected error") }
}
```

- [x] **Step 2: Run the new use-case test file and confirm it fails because `RegisterUseCase` does not exist yet.**

Run: `go test ./internal/usecase/auth -run TestRegisterUseCase -v`  
Expected: FAIL with missing type/function errors.

- [x] **Step 3: Implement the registration use case with duplicate checks for username, email, and NIP, plus password confirmation validation.**

```go
type RegisterInput struct {
	Name            string
	Email           string
	Username        string
	Password        string
	ConfirmPassword string
	OrganizationID  uuid.UUID
	NIP             string
	Jabatan         string
	Pangkat         string
	PhoneNumber     string
}

func (uc *RegisterUseCase) Execute(ctx context.Context, input RegisterInput) (*RegisterOutput, error) {
	if input.Password != input.ConfirmPassword {
		return nil, errors.Wrap(errors.ErrInvalidInput, "password confirmation does not match")
	}

	if existing, _ := uc.userRepo.GetByNIP(ctx, input.NIP); existing != nil {
		return nil, errors.Wrap(errors.ErrInvalidInput, "nip already exists")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.Wrap(err, "failed to hash password")
	}

	user := &entity.User{
		Name:               input.Name,
		Email:              input.Email,
		Username:           input.Username,
		Role:               entity.RoleUnit,
		Status:             entity.UserStatusPendingActivation,
		MustChangePassword: false,
		NIP:                input.NIP,
		Jabatan:            input.Jabatan,
		Pangkat:            input.Pangkat,
		PhoneNumber:        input.PhoneNumber,
		OrganizationID:     &input.OrganizationID,
		PasswordHash:       string(passwordHash),
	}

	if err := uc.userRepo.Create(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to create user")
	}

	return &RegisterOutput{ID: user.ID, Message: "Registration submitted successfully"}, nil
}
```

- [x] **Step 4: Re-run the registration use-case tests and confirm they pass.**

Run: `go test ./internal/usecase/auth -run TestRegisterUseCase -v`  
Expected: PASS.

- [x] **Step 5: Commit the self-registration core logic.**

```bash
git add backend/internal/usecase/auth/register.go \
  backend/internal/usecase/auth/register_test.go \
  backend/internal/usecase/user/create.go \
  backend/internal/domain/errors/errors.go
git commit -m "feat: add self-registration use case"
```

## Task 3: Expose public registration and block pending-account login

**Files:**
- Modify: `backend/internal/usecase/auth/login.go`
- Modify: `backend/internal/usecase/auth/login_test.go`
- Modify: `backend/internal/handler/http/auth.go`
- Modify: `backend/internal/handler/http/auth_test.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: Replace the current pending-login success expectation with failing tests that require a pending-approval rejection.**

```go
func TestLoginExecuteRejectsPendingActivationUser(t *testing.T) {
	_, err := uc.Execute(context.Background(), LoginInput{
		Username: "pending-user",
		Password: "TempPass123!",
	})

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if err != domainErrors.ErrAccountPendingApproval {
		t.Fatalf("expected ErrAccountPendingApproval, got %v", err)
	}
}
```

```go
if resp.StatusCode != fiber.StatusForbidden {
	t.Fatalf("expected status 403, got %d", resp.StatusCode)
}
```

- [x] **Step 2: Run the focused auth tests and confirm they fail because login still returns a setup session and the register route is not wired.**

Run: `go test ./internal/usecase/auth ./internal/handler/http -run 'Test(LoginExecuteRejectsPendingActivationUser|AuthHandlerRegister|AuthHandlerLoginRejectsPendingActivationUser)' -v`  
Expected: FAIL.

- [x] **Step 3: Add the handler and route wiring for `POST /api/v1/auth/register` plus a public organization lookup route, then change login to reject pending users with a dedicated error.**

```go
type RegisterRequest struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirmPassword"`
	OrganizationID  string `json:"organizationId"`
	NIP             string `json:"nip"`
	Jabatan         string `json:"jabatan"`
	Pangkat         string `json:"pangkat"`
	PhoneNumber     string `json:"phoneNumber"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	orgID, err := uuid.Parse(req.OrganizationID)
	if err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid organization ID")
	}

	result, err := h.registerUC.Execute(c.Context(), RegisterInput{
		Name:            req.Name,
		Email:           req.Email,
		Username:        req.Username,
		Password:        req.Password,
		ConfirmPassword: req.ConfirmPassword,
		OrganizationID:  orgID,
		NIP:             req.NIP,
		Jabatan:         req.Jabatan,
		Pangkat:         req.Pangkat,
		PhoneNumber:     req.PhoneNumber,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": result})
}
```

```go
if user.Status == entity.UserStatusPendingActivation {
	return nil, errors.ErrAccountPendingApproval
}
```

```go
api.Post("/auth/register", cleanAuthHandler.Register)
api.Get("/auth/register/organizations", cleanOrgHandler.List)
```

- [x] **Step 4: Re-run the focused auth tests and confirm registration plus pending-login rejection now pass.**

Run: `go test ./internal/usecase/auth ./internal/handler/http -run 'Test(RegisterUseCase|LoginExecuteRejectsPendingActivationUser|AuthHandlerRegister|AuthHandlerLoginRejectsPendingActivationUser)' -v`  
Expected: PASS.

- [x] **Step 5: Commit the public auth surface changes.**

```bash
git add backend/internal/usecase/auth/login.go \
  backend/internal/usecase/auth/login_test.go \
  backend/internal/handler/http/auth.go \
  backend/internal/handler/http/auth_test.go \
  backend/internal/bootstrap/bootstrap.go \
  backend/cmd/server/main.go
git commit -m "feat: expose public registration endpoint"
```

## Task 4: Add superadmin review actions for pending registrations

**Files:**
- Create: `backend/internal/usecase/user/approve_registration.go`
- Create: `backend/internal/usecase/user/approve_registration_test.go`
- Create: `backend/internal/usecase/user/reject_registration.go`
- Create: `backend/internal/usecase/user/reject_registration_test.go`
- Modify: `backend/internal/handler/http/user.go`
- Modify: `backend/internal/handler/http/user_test.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: Write failing use-case tests for approve/reject success and non-pending rejection.**

```go
func TestApproveRegistrationExecuteActivatesPendingUser(t *testing.T) {
	user := &entity.User{ID: uuid.New(), Status: entity.UserStatusPendingActivation}
	result, err := uc.Execute(context.Background(), user.ID)
	if err != nil { t.Fatalf("expected no error, got %v", err) }
	if repo.updated.Status != entity.UserStatusActive { t.Fatalf("expected active, got %q", repo.updated.Status) }
	if result.Message != "Registration approved successfully" { t.Fatalf("unexpected message: %q", result.Message) }
}

func TestRejectRegistrationExecuteRejectsNonPendingUser(t *testing.T) {
	user := &entity.User{ID: uuid.New(), Status: entity.UserStatusActive}
	_, err := uc.Execute(context.Background(), user.ID)
	if err == nil { t.Fatal("expected error") }
}
```

- [x] **Step 2: Run the user use-case tests and confirm they fail because the review use cases do not exist yet.**

Run: `go test ./internal/usecase/user -run 'Test(ApproveRegistration|RejectRegistration)' -v`  
Expected: FAIL.

- [x] **Step 3: Implement dedicated review use cases and handlers with superadmin-only routes.**

```go
func (uc *ApproveRegistrationUseCase) Execute(ctx context.Context, id uuid.UUID) (*ApproveRegistrationOutput, error) {
	user, err := uc.userRepo.GetByID(ctx, id)
	if err != nil { return nil, errors.ErrNotFound }
	if user.Status != entity.UserStatusPendingActivation { return nil, errors.ErrNotPending }

	user.Status = entity.UserStatusActive
	user.MustChangePassword = false

	if err := uc.userRepo.Update(ctx, user); err != nil { return nil, err }
	return &ApproveRegistrationOutput{Message: "Registration approved successfully"}, nil
}
```

```go
usersAdmin.Post("/:id/approve-registration", cleanUserHandler.ApproveRegistration)
usersAdmin.Delete("/:id/reject-registration", cleanUserHandler.RejectRegistration)
```

- [x] **Step 4: Re-run the user use-case and handler tests and confirm pending-only review behavior passes.**

Run: `go test ./internal/usecase/user ./internal/handler/http -run 'Test(ApproveRegistration|RejectRegistration|UserRoutesRequireSuperadmin)' -v`  
Expected: PASS.

- [x] **Step 5: Commit the admin review backend.**

```bash
git add backend/internal/usecase/user/approve_registration.go \
  backend/internal/usecase/user/approve_registration_test.go \
  backend/internal/usecase/user/reject_registration.go \
  backend/internal/usecase/user/reject_registration_test.go \
  backend/internal/handler/http/user.go \
  backend/internal/handler/http/user_test.go \
  backend/internal/bootstrap/bootstrap.go \
  backend/cmd/server/main.go
git commit -m "feat: add registration review actions"
```

## Task 5: Build the public registration frontend

**Files:**
- Create: `frontend/src/lib/api/auth.ts`
- Create: `frontend/src/lib/api/auth.test.ts`
- Create: `frontend/src/components/register-screen.tsx`
- Create: `frontend/src/app/(public)/register/page.tsx`
- Modify: `frontend/src/components/login-screen.tsx`

- [x] **Step 1: Write a failing API helper test for the new registration endpoint.**

```ts
import assert from "node:assert/strict";
import test from "node:test";

test("registerSelfServiceUser posts to /auth/register", async () => {
  const calls: Array<{ url: string; body: string }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: String(init?.body) });
    return new Response(JSON.stringify({ data: { message: "ok" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await registerSelfServiceUser({
      name: "Siti Rahma",
      email: "siti@kemenkes.go.id",
      username: "siti.rahma",
      password: "TempPass123!",
      confirmPassword: "TempPass123!",
      organizationId: "11111111-1111-1111-1111-111111111111",
      nip: "199001012020122001",
      jabatan: "",
      pangkat: "",
      phoneNumber: "081234567890",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0]?.url, "http://localhost:8080/api/v1/auth/register");
});

test("listRegistrationOrganizations reads the public registration organization route", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return new Response(JSON.stringify({ data: [], total: 0, page: 1, limit: 100 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    await listRegistrationOrganizations();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls[0], "http://localhost:8080/api/v1/auth/register/organizations?page=1&limit=100");
});
```

- [x] **Step 2: Run the frontend test and confirm it fails because the auth API helper does not exist yet.**

Run: `node --test --experimental-specifier-resolution=node frontend/src/lib/api/auth.test.ts`  
Expected: FAIL with missing module or symbol errors.

- [x] **Step 3: Implement the API helper, the `/register` page, and the form success state.**

```ts
export type RegisterSelfServiceInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  organizationId: string;
  nip: string;
  jabatan?: string;
  pangkat?: string;
  phoneNumber: string;
};

export function registerSelfServiceUser(input: RegisterSelfServiceInput) {
  return api.post("/auth/register", input);
}

export async function listRegistrationOrganizations() {
  return collectAllOrganizations(({ page, limit }) =>
    api.get(`/auth/register/organizations?page=${page}&limit=${limit}`),
  );
}
```

```tsx
useEffect(() => {
  void listRegistrationOrganizations()
    .then(setOrganizations)
    .catch(() => setError("Daftar unit kerja belum berhasil dimuat."));
}, []);

const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  if (form.password !== form.confirmPassword) {
    setError("Konfirmasi password belum sama.");
    return;
  }
  await registerSelfServiceUser(form);
  setSubmitted(true);
};
```

```tsx
<Link
  href="/register"
  className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
>
  Belum punya akun? Ajukan registrasi
</Link>
```

- [x] **Step 4: Re-run the frontend test and a production build to confirm the public registration UI compiles.**

Run: `node --test --experimental-specifier-resolution=node frontend/src/lib/api/auth.test.ts`  
Expected: PASS.

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS.

- [x] **Step 5: Commit the public registration UI.**

```bash
git add frontend/src/lib/api/auth.ts \
  frontend/src/lib/api/auth.test.ts \
  frontend/src/components/register-screen.tsx \
  frontend/src/app/(public)/register/page.tsx \
  frontend/src/components/login-screen.tsx
git commit -m "feat: add public registration page"
```

## Task 6: Add pending-registration review controls to the admin users page

**Files:**
- Create: `frontend/src/lib/admin-user-registration.ts`
- Create: `frontend/src/lib/admin-user-registration.test.ts`
- Modify: `frontend/src/lib/api/users.ts`
- Modify: `frontend/src/app/(app)/admin/users/page.tsx`

- [x] **Step 1: Write a failing pure-helper test for pending-review action gating.**

```ts
import assert from "node:assert/strict";
import test from "node:test";

test("canReviewPendingRegistration returns true only for pending unit users", () => {
  assert.equal(
    canReviewPendingRegistration({ role: "unit", status: "pending_activation" }),
    true,
  );
  assert.equal(
    canReviewPendingRegistration({ role: "unit", status: "active" }),
    false,
  );
  assert.equal(
    canReviewPendingRegistration({ role: "reviewer", status: "pending_activation" }),
    false,
  );
});
```

- [x] **Step 2: Run the helper test and confirm it fails because the admin review helper does not exist yet.**

Run: `node --test --experimental-specifier-resolution=node frontend/src/lib/admin-user-registration.test.ts`  
Expected: FAIL.

- [x] **Step 3: Implement the helper, add approve/reject API clients, and update the users page to surface pending registrations clearly.**

```ts
export function canReviewPendingRegistration(user: { role: string; status: string }) {
  return user.role === "unit" && user.status === "pending_activation";
}

export async function approveRegistration(token: string, id: string) {
  return api.post(`/users/${id}/approve-registration`, {}, token);
}

export async function rejectRegistration(token: string, id: string) {
  return api.delete(`/users/${id}/reject-registration`, undefined, token);
}
```

```tsx
{canReviewPendingRegistration(managedUser) ? (
  <div className="flex gap-2">
    <Button size="xs" onClick={() => handleApprove(managedUser.id)}>Setujui</Button>
    <Button size="xs" variant="destructive" onClick={() => handleReject(managedUser.id)}>Tolak</Button>
  </div>
) : (
  <Button variant="ghost" size="icon-xs" disabled aria-label={`Opsi untuk ${managedUser.name}`}>
    <MoreHorizontal className="size-3.5" />
  </Button>
)}
```

```tsx
<p className="truncate text-[10px] text-muted-foreground">
  {managedUser.email}
</p>
<p className="truncate text-[10px] text-muted-foreground/80">
  {managedUser.phoneNumber || "Nomor telepon belum diisi"}
</p>
```

- [x] **Step 4: Re-run the helper test and a frontend build to confirm the admin review UI is type-safe.**

Run: `node --test --experimental-specifier-resolution=node frontend/src/lib/admin-user-registration.test.ts`  
Expected: PASS.

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS.

- [x] **Step 5: Commit the admin review UI.**

```bash
git add frontend/src/lib/admin-user-registration.ts \
  frontend/src/lib/admin-user-registration.test.ts \
  frontend/src/lib/api/users.ts \
  frontend/src/app/\(app\)/admin/users/page.tsx
git commit -m "feat: add admin registration review actions"
```

## Task 7: Full verification and release-readiness pass

**Files:**
- Modify only if verification reveals issues.

- [x] **Step 1: Run the backend test suite for the touched auth and user packages.**

Run: `go test ./internal/usecase/auth ./internal/usecase/user ./internal/handler/http -v`  
Workdir: `backend`  
Expected: PASS.

- [x] **Step 2: Run the frontend unit tests added in this feature.**

Run: `npm test`  
Workdir: `frontend`  
Expected: PASS, including `auth.test.ts` and `admin-user-registration.test.ts`.

- [x] **Step 3: Run a production build for the frontend.**

Run: `npm run build`  
Workdir: `frontend`  
Expected: PASS.

- [x] **Step 4: Perform a manual smoke checklist in a local environment.**

```text
1. Open /register and submit a valid unit registration.
2. Confirm the success state says the account is waiting for superadmin approval.
3. Attempt login before approval and confirm the pending-approval error appears.
4. Log in as superadmin and open /admin/users?status=pending_activation.
5. Approve one pending account and confirm login succeeds with the chosen password.
6. Reject another pending account and confirm a new registration with the same identity can be submitted again.
```

- [x] **Step 5: Commit the verification fixes, if any were needed.**

```bash
git add -A
git commit -m "test: verify self-registration approval flow"
```

# Organization Context Module

## TL;DR

> **Quick Summary**: Add a free-text `context` field to organizations so all AI prompts are enriched with the unit's visi-misi, tupoksi, sektor, and lokasi — making AI responses relevant to each organization.
> 
> **Deliverables**:
> - DB migration adding `context` TEXT column to `organizations`
> - Backend CRUD for org context (extend existing org update endpoint)
> - AI prompt injection via modified `callOpenAI()` signature
> - Frontend settings page for editing org context
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 5 → Task 7

---

## Context

### Original Request
User wants a module to store organizational context (visi-misi, tupoksi, sektor kerja, lokasi, dll.) as free-text per unit, which gets injected into all AI prompts so generated responses are relevant to the organization.

### Interview Summary
**Key Discussions**:
- **Format**: Single free-text field, NOT structured fields
- **Granularity**: Per organization/unit (independent)
- **Access**: Super Admin edits all orgs, Unit edits own org only
- **UI**: Dedicated settings/admin page with textarea
- **Tests**: No automated unit tests
- **Char limit**: 2000 chars max (from Metis review)

**Research Findings**:
- All 11 AI features funnel through single `callOpenAI()` at `ai.go:327`
- `cba.go:36` calls `r.ai.callOpenAI()` (same method via struct field, not separate)
- AI handlers currently don't pass org ID for most features (fishbone, impact, mitigation, minutes, etc.)
- `AccessScope` from middleware has `OrganizationID *uuid.UUID` — available in all protected handlers
- Organization entity currently: `ID`, `Name`, `ParentID`, `CreatedAt`
- Hardcoded context like "sektor kesehatan pemerintahan" exists in some system messages

### Metis Review
**Identified Gaps** (addressed):
- **Token budget**: Added 2000 char limit to prevent cost blowup
- **Empty context**: Defined as no-op (zero behavior change)
- **CBA callOpenAI path**: Confirmed same method via `r.ai.callOpenAI()` — same injection point
- **Hardcoded prompts**: Explicitly excluded from scope (separate task)
- **Super Admin across orgs**: AI uses risk/incident's org context, not admin's own org

---

## Work Objectives

### Core Objective
Enable per-organization AI context injection so all AI-generated content (fishbone, impact, mitigation, KRI, etc.) reflects the specific organization's domain, mission, and operational context.

### Concrete Deliverables
- Migration `000042_add_context_to_organizations.{up,down}.sql`
- Updated `Organization` entity with `Context string` field
- Updated org repository (postgres) queries to include context column
- Updated org update usecase/handler to accept context field
- New `GetContext(ctx, orgID) string` method on org repository
- Modified `AIRepository` interface: all methods accept `orgContext string`
- Modified `callOpenAI()` to prepend org context to system message
- All 11 AI usecases threaded with `orgRepo` to fetch org context
- All AI handlers pass `scope.OrganizationID` to usecases
- Frontend settings page at `/admin/settings` (or new tab) with textarea + save

### Definition of Done
- [x] `make migrate-up` succeeds
- [x] `go build ./...` succeeds with all changes
- [x] `curl PUT /api/v1/organizations/:id` with `context` field saves and retrieves correctly
- [x] `curl PUT` with >2000 chars returns 400
- [x] Any AI endpoint called after setting context includes that context in AI system message
- [x] Empty context = no injection (existing behavior preserved)
- [x] `npm run build` succeeds for frontend

### Must Have
- Single `context` TEXT column (nullable)
- 2000 char limit enforced at API + UI level
- Org context prepended to system message in `callOpenAI()`
- Empty/null context = silent no-op
- Access control: Super Admin writes all, Unit writes own org

### Must NOT Have (Guardrails)
- ❌ Structured fields (separate visi, misi, tupoksi columns)
- ❌ Rich text editor — plain textarea only
- ❌ Context versioning/history
- ❌ Context templates or examples
- ❌ Per-feature context customization
- ❌ Replace existing hardcoded prompt strings (e.g., "sektor kesehatan pemerintahan")
- ❌ Caching layer for org context lookups
- ❌ Context preview/test in UI
- ❌ Changes to AI repository interface beyond adding `orgContext string` param

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Go test framework)
- **Automated tests**: None (user decision)
- **Framework**: N/A

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Build**: Use Bash — `go build`, `npm run build`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: DB migration (add context column) [quick]
├── Task 2: Update Organization entity + repository [quick]
└── Task 3: Frontend org context settings page (can scaffold with mock) [visual-engineering]

Wave 2 (After Wave 1 — core backend, MAX PARALLEL):
├── Task 4: Update org usecase/handler for context CRUD [quick]
├── Task 5: Modify AIRepository interface + callOpenAI signature [unspecified-high]
└── Task 6: Thread org context through all 11 AI usecases [unspecified-high]

Wave 3 (After Wave 2 — integration):
├── Task 7: Update all AI handlers to pass orgID + wire everything in main.go [deep]
└── Task 8: Connect frontend to real API + final build verification [visual-engineering]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 4/5 → Task 6 → Task 7 → Task 8 → F1-F4 → user okay
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 3 (Wave 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2, 4 |
| 2 | 1 | 4, 5, 6 |
| 3 | — | 8 |
| 4 | 2 | 7 |
| 5 | 2 | 6, 7 |
| 6 | 2, 5 | 7 |
| 7 | 4, 5, 6 | 8 |
| 8 | 3, 7 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T3 → `visual-engineering`
- **Wave 2**: 3 tasks — T4 → `quick`, T5 → `unspecified-high`, T6 → `unspecified-high`
- **Wave 3**: 2 tasks — T7 → `deep`, T8 → `visual-engineering`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. DB Migration: Add `context` column to organizations

  **What to do**:
  - Create `backend/db/migrations/000042_add_context_to_organizations.up.sql`:
    ```sql
    ALTER TABLE organizations ADD COLUMN context TEXT;
    ```
  - Create `backend/db/migrations/000042_add_context_to_organizations.down.sql`:
    ```sql
    ALTER TABLE organizations DROP COLUMN IF EXISTS context;
    ```
  - Run `make migrate-up` to apply

  **Must NOT do**:
  - Do NOT add NOT NULL constraint (nullable by design)
  - Do NOT add default value
  - Do NOT add any indexes on context column

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 2, 4
  - **Blocked By**: None

  **References**:
  - `backend/db/migrations/000041_update_risk_treatment_options.up.sql` — Latest migration, follow naming convention
  - `backend/Makefile` — `migrate-up` and `migrate-new` targets

  **QA Scenarios**:

  ```
  Scenario: Migration applies successfully
    Tool: Bash
    Preconditions: Database running, previous migrations applied
    Steps:
      1. Run: cd backend && make migrate-up
      2. Assert exit code 0
      3. Run: psql $DATABASE_URL -c "\d organizations" | grep context
      4. Assert output contains: context | text
    Expected Result: Column exists as nullable TEXT type
    Evidence: .sisyphus/evidence/task-1-migration-up.txt

  Scenario: Migration rolls back successfully
    Tool: Bash
    Preconditions: Migration 42 applied
    Steps:
      1. Run: cd backend && make migrate-down
      2. Assert exit code 0
      3. Run: psql $DATABASE_URL -c "\d organizations" | grep context
      4. Assert output is empty (column removed)
      5. Run: cd backend && make migrate-up (reapply)
    Expected Result: Column is removed, then reapplied cleanly
    Evidence: .sisyphus/evidence/task-1-migration-rollback.txt
  ```

  **Commit**: YES (group with Task 2)
  - Message: `feat(org): add context column to organizations table`
  - Files: `backend/db/migrations/000042_*`
  - Pre-commit: `make migrate-up`

- [x] 2. Update Organization entity + postgres repository to include context

  **What to do**:
  - Add `Context string` field to `entity.Organization` struct with json tag `"context,omitempty"`
  - Update `organizationRepository.Create()` — add `context` to INSERT query + params
  - Update `organizationRepository.GetByID()` — add `context` to SELECT + Scan
  - Update `organizationRepository.Update()` — add `context` to UPDATE SET + params
  - Update `organizationRepository.List()` and `ListWithFilter()` — add `context` to SELECT + Scan
  - Add `GetContext(ctx context.Context, orgID uuid.UUID) (string, error)` method to `OrganizationRepository` interface and postgres implementation — simple SELECT context FROM organizations WHERE id = $1, return empty string if NULL

  **Must NOT do**:
  - Do NOT add validation for context in `entity.Validate()` (context is optional)
  - Do NOT add context length validation here (that's usecase layer)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (after Task 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: Task 1

  **References**:
  - `backend/internal/domain/entity/organization.go` — Current entity (4 fields: ID, Name, ParentID, CreatedAt)
  - `backend/internal/domain/repository/organization.go` — Interface to add `GetContext` method
  - `backend/internal/repository/postgres/organization.go` — Postgres impl, all SQL queries to update
  - `backend/internal/repository/postgres/organization.go:24-35` — Create pattern to follow
  - `backend/internal/repository/postgres/organization.go:38-48` — GetByID pattern (SELECT + Scan)

  **QA Scenarios**:

  ```
  Scenario: Go code builds with new context field
    Tool: Bash
    Preconditions: Task 1 migration applied
    Steps:
      1. Run: cd backend && go build ./...
      2. Assert exit code 0
    Expected Result: No compilation errors
    Evidence: .sisyphus/evidence/task-2-build.txt

  Scenario: GetContext returns empty string for org without context
    Tool: Bash
    Preconditions: Org exists with NULL context
    Steps:
      1. Run: cd backend && go test ./internal/repository/postgres/ -run TestGetContext -v 2>&1 || echo "No test - verify via curl in Task 4"
    Expected Result: Verified in Task 4 QA
    Evidence: .sisyphus/evidence/task-2-build.txt
  ```

  **Commit**: YES (group with Task 1)
  - Message: `feat(org): add context field to organization entity and repository`
  - Files: `backend/internal/domain/entity/organization.go`, `backend/internal/domain/repository/organization.go`, `backend/internal/repository/postgres/organization.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 3. Frontend: Organization context settings page

  **What to do**:
  - Create new page at `frontend/src/app/(app)/admin/settings/organization-context/page.tsx`
  - OR add a new section/tab to existing `frontend/src/app/(app)/admin/settings/page.tsx`
  - UI: Card with title "Konteks Organisasi", textarea (max 2000 chars), character counter, save button
  - Use shadcn/ui components: Card, Textarea, Button, Label
  - Add loading state and success/error toast on save
  - Fetch current context on page load via GET `/api/v1/organizations/:id`
  - Save via PUT `/api/v1/organizations/:id` with `context` field
  - Get org ID from auth context (current user's organization)
  - For Super Admin: add org selector dropdown to choose which org to edit
  - Add navigation link in sidebar under Admin section

  **Must NOT do**:
  - Do NOT use rich text editor — plain `<Textarea>` only
  - Do NOT add context preview/test feature
  - Do NOT add templates or examples

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`, `shadcn`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (can scaffold independently)
  - **Blocks**: Task 8
  - **Blocked By**: None (can use mock data initially)

  **References**:
  - `frontend/src/app/(app)/admin/settings/page.tsx` — Existing settings page (228 lines, uses Card, Badge, Button, Input, Textarea, Separator)
  - `frontend/src/components/app-sidebar.tsx` — Sidebar navigation, add link here
  - `frontend/src/contexts/` — Auth context for getting current user's org ID
  - `frontend/src/components/ui/` — shadcn/ui components available
  - `frontend/src/lib/utils.ts` — `cn()` utility for classnames

  **QA Scenarios**:

  ```
  Scenario: Settings page renders with textarea
    Tool: Playwright
    Preconditions: Frontend dev server running, user logged in
    Steps:
      1. Navigate to /admin/settings/organization-context (or settings page with context section)
      2. Wait for page load (timeout: 10s)
      3. Assert textarea element exists with selector: textarea[name="context"] or similar
      4. Assert save button exists
      5. Assert character counter shows "0 / 2000"
    Expected Result: Page renders with empty textarea, save button, and character counter
    Evidence: .sisyphus/evidence/task-3-settings-page.png

  Scenario: Character counter updates and enforces limit
    Tool: Playwright
    Preconditions: Page loaded
    Steps:
      1. Type "Test context" into textarea
      2. Assert character counter shows "12 / 2000"
      3. Type 2001 characters into textarea
      4. Assert textarea value is truncated to 2000 chars OR save button is disabled
    Expected Result: Character limit enforced at UI level
    Evidence: .sisyphus/evidence/task-3-char-limit.png
  ```

  **Commit**: YES (group with Task 8)
  - Message: `feat(frontend): add organization context settings page`
  - Files: `frontend/src/app/(app)/admin/settings/organization-context/page.tsx`, `frontend/src/components/app-sidebar.tsx`
  - Pre-commit: `cd frontend && npm run build`

- [x] 4. Update org usecase + handler to support context in CRUD

  **What to do**:
  - Update `UpdateOrganizationInput` to include `Context *string` (pointer for optional)
  - Update `UpdateOrganizationOutput` to include `Context string`
  - Update `UpdateOrganizationUseCase.Execute()` to set `existingOrg.Context = *input.Context` when provided
  - Add validation: if context provided AND len > 2000, return `errors.ErrInvalidInput` with message "context must not exceed 2000 characters"
  - Update `CreateOrganizationInput` to include optional `Context string`
  - Update handler `Update()` to include context in response
  - Update handler `Get()` response to include context
  - Ensure `GetByID` response now shows context (automatic from entity change in Task 2)

  **Must NOT do**:
  - Do NOT create a separate endpoint for context — use existing org update endpoint
  - Do NOT add auth checks beyond existing ones (existing Update already requires appropriate access)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6 after Task 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Task 2

  **References**:
  - `backend/internal/usecase/organization/update.go` — Current update usecase (81 lines). `UpdateOrganizationInput` has `ID`, `Name`, `ParentID`. Add `Context *string`.
  - `backend/internal/usecase/organization/create.go` — Create usecase to also update
  - `backend/internal/handler/http/organization.go:83-102` — Update handler, already parses body into `UpdateOrganizationInput`
  - `backend/internal/domain/errors/` — Error constants for validation errors

  **QA Scenarios**:

  ```
  Scenario: Update org with context succeeds
    Tool: Bash (curl)
    Preconditions: Backend running, valid auth token, org exists
    Steps:
      1. curl -X PUT http://localhost:8080/api/v1/organizations/{id} -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"Test Unit","context":"Kami adalah unit pelayanan kesehatan masyarakat di wilayah Jakarta Selatan."}'
      2. Assert HTTP status 200
      3. Assert response body contains "context":"Kami adalah unit pelayanan kesehatan masyarakat di wilayah Jakarta Selatan."
      4. curl -X GET http://localhost:8080/api/v1/organizations/{id} -H "Authorization: Bearer $TOKEN"
      5. Assert response includes context field with saved value
    Expected Result: Context saved and retrievable
    Evidence: .sisyphus/evidence/task-4-update-context.txt

  Scenario: Update org with context >2000 chars fails
    Tool: Bash (curl)
    Preconditions: Backend running, valid auth token
    Steps:
      1. Generate 2001-char string: LONG=$(python3 -c "print('A'*2001)")
      2. curl -X PUT http://localhost:8080/api/v1/organizations/{id} -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Test\",\"context\":\"$LONG\"}"
      3. Assert HTTP status 400
      4. Assert response contains error about context length
    Expected Result: 400 Bad Request with validation error
    Evidence: .sisyphus/evidence/task-4-context-too-long.txt

  Scenario: Get org returns context (including empty)
    Tool: Bash (curl)
    Preconditions: Org with no context set
    Steps:
      1. curl -X GET http://localhost:8080/api/v1/organizations/{id} -H "Authorization: Bearer $TOKEN"
      2. Assert response has context field (empty string or omitted)
    Expected Result: Org endpoint includes context in response
    Evidence: .sisyphus/evidence/task-4-get-context.txt
  ```

  **Commit**: YES (group with Tasks 5, 6)
  - Message: `feat(org): support context field in organization CRUD`
  - Files: `backend/internal/usecase/organization/update.go`, `backend/internal/usecase/organization/create.go`, `backend/internal/handler/http/organization.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 5. Modify AIRepository interface + callOpenAI to accept org context

  **What to do**:
  - Update `callOpenAI` signature: add `orgContext string` as 5th parameter
    ```go
    func (r *aiRepository) callOpenAI(ctx context.Context, prompt string, systemMessage string, feature string, orgContext string) (string, error) {
    ```
  - At top of `callOpenAI`, prepend org context to system message:
    ```go
    if orgContext != "" {
        systemMessage = "Konteks Organisasi:\n" + orgContext + "\n\n" + systemMessage
    }
    ```
  - Update ALL 11 callers of `callOpenAI` in `ai.go` to pass `""` (empty string) as 5th arg temporarily — this preserves existing behavior until Task 6 threads real context
  - Update `cba.go:36` caller to pass `""` as well
  - Update `AIRepository` interface in `domain/repository/ai.go` — add `orgContext string` param to ALL method signatures:
    - `GenerateFishbone(ctx, req, orgContext) → (...)`
    - `GenerateImpact(ctx, req, orgContext) → (...)`
    - `GenerateMitigation(ctx, req, orgContext) → (...)`
    - `GenerateMeetingMinutes(ctx, transcript, orgContext) → (...)`
    - `AnalyzeTranscript(ctx, transcript, orgContext) → (...)`
    - `GeneratePredictive(ctx, risks, orgContext) → (...)`
    - `GenerateRiskSuggestions(ctx, orgContext) → (...)`
    - `GenerateKRI(ctx, req, orgContext) → (...)`
    - `GenerateIncidentBatchExtraction(ctx, req, orgContext) → (...)`
    - `GenerateManualIncidentRiskSuggestions(ctx, req, orgContext) → (...)`
  - Update ALL implementations in `ai.go` to accept `orgContext string` and pass it to `callOpenAI`
  - Update CBA repository struct/methods similarly

  **Must NOT do**:
  - Do NOT inject org repo into AI repo (context comes as string param)
  - Do NOT change existing system message content
  - Do NOT add context fetching logic here (that's Task 6's job)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, after Task 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 2

  **References**:
  - `backend/internal/domain/repository/ai.go` — AIRepository interface (40 lines, 10 methods)
  - `backend/internal/repository/openai/ai.go:327-349` — `callOpenAI` implementation
  - `backend/internal/repository/openai/ai.go:53` — First caller: GenerateFishbone → `r.callOpenAI(ctx, prompt, "...", "cause")`
  - `backend/internal/repository/openai/ai.go:75` — GenerateImpact caller
  - `backend/internal/repository/openai/ai.go:91` — GenerateMitigation caller
  - `backend/internal/repository/openai/ai.go:116` — GenerateMinutes caller
  - `backend/internal/repository/openai/ai.go:164` — AnalyzeTranscript caller
  - `backend/internal/repository/openai/ai.go:199` — GeneratePredictive caller
  - `backend/internal/repository/openai/ai.go:246` — GenerateRiskSuggestions caller
  - `backend/internal/repository/openai/ai.go:275` — GenerateIncidentBatchExtraction caller
  - `backend/internal/repository/openai/ai.go:303` — GenerateManualIncidentRiskSuggestions caller
  - `backend/internal/repository/openai/ai.go:762` — GenerateKRI caller
  - `backend/internal/repository/openai/cba.go:36` — CBA caller: `r.ai.callOpenAI(ctx, prompt, "...", "cba")`

  **QA Scenarios**:

  ```
  Scenario: Backend builds with updated signatures
    Tool: Bash
    Preconditions: Task 2 complete
    Steps:
      1. Run: cd backend && go build ./...
      2. Assert exit code 0
      3. Run: cd backend && go vet ./...
      4. Assert exit code 0
    Expected Result: All code compiles with new signatures
    Evidence: .sisyphus/evidence/task-5-build.txt

  Scenario: callOpenAI prepends context when provided
    Tool: Bash
    Preconditions: Backend code updated
    Steps:
      1. Verify via code inspection that callOpenAI has orgContext param
      2. Verify the prepend logic: if orgContext != "" { systemMessage = "Konteks Organisasi:\n" + orgContext + "\n\n" + systemMessage }
      3. grep -n "Konteks Organisasi" backend/internal/repository/openai/ai.go
      4. Assert match found in callOpenAI function
    Expected Result: Context prepend logic exists in callOpenAI
    Evidence: .sisyphus/evidence/task-5-injection-logic.txt
  ```

  **Commit**: YES (group with Tasks 4, 6)
  - Message: `feat(ai): add orgContext parameter to all AI repository methods`
  - Files: `backend/internal/domain/repository/ai.go`, `backend/internal/repository/openai/ai.go`, `backend/internal/repository/openai/cba.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 6. Thread org context through all AI usecases

  **What to do**:
  - For EACH of the 11 AI usecases, add `orgRepo repository.OrganizationRepository` to the struct and constructor
  - For EACH usecase Input struct, add `OrganizationID *uuid.UUID` field
  - In each `Execute()` method:
    1. If `input.OrganizationID != nil`, call `orgRepo.GetContext(ctx, *input.OrganizationID)` to get org context string
    2. If nil or error, use empty string (fail silently — no-op)
    3. Pass org context string to the AI repo method call
  - Usecases to update (all in `backend/internal/usecase/ai/`):
    - `fishbone.go` — `GenerateFishboneUseCase`
    - `impact.go` — `GenerateImpactUseCase`
    - `mitigation.go` — `GenerateMitigationUseCase`
    - `minutes.go` — `GenerateMinutesUseCase`
    - `transcript.go` — `AnalyzeTranscriptUseCase`
    - `predictive.go` — `GeneratePredictiveUseCase`
    - `suggestion.go` — `GenerateRiskSuggestionsUseCase`
    - `kri.go` — `GenerateKRIUseCase`
    - `extract_batch.go` — `GenerateIncidentBatchExtractionUseCase`
    - `incident_risk_suggestion.go` — `GenerateManualIncidentRiskSuggestionsUseCase`
  - Also update CBA usecase if it exists as separate usecase, or handle in cba handler

  **Must NOT do**:
  - Do NOT fail the AI call if org context fetch fails — use empty string fallback
  - Do NOT cache org context

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 5 completing)
  - **Parallel Group**: Wave 2 (after Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 5

  **References**:
  - `backend/internal/usecase/ai/fishbone.go` — Pattern: struct has `aiRepo`, constructor `NewGenerateFishboneUseCase(aiRepo)`, Execute calls `uc.aiRepo.GenerateFishbone(ctx, req)`. Add `orgRepo` field, add `OrganizationID` to input, fetch context, pass to repo.
  - `backend/internal/usecase/ai/impact.go` — Same pattern
  - `backend/internal/usecase/ai/mitigation.go` — Same pattern
  - `backend/internal/usecase/ai/minutes.go` — Same pattern
  - `backend/internal/usecase/ai/transcript.go` — Same pattern
  - `backend/internal/usecase/ai/predictive.go` — Same pattern
  - `backend/internal/usecase/ai/suggestion.go` — Same pattern
  - `backend/internal/usecase/ai/kri.go` — Same pattern
  - `backend/internal/usecase/ai/extract_batch.go` — May already have OrganizationID in request entity
  - `backend/internal/usecase/ai/incident_risk_suggestion.go` — Same
  - `backend/internal/domain/repository/organization.go` — `GetContext` method added in Task 2

  **QA Scenarios**:

  ```
  Scenario: All usecases compile with orgRepo dependency
    Tool: Bash
    Preconditions: Tasks 2 and 5 complete
    Steps:
      1. Run: cd backend && go build ./...
      2. Assert exit code 0
    Expected Result: No compilation errors
    Evidence: .sisyphus/evidence/task-6-build.txt

  Scenario: Usecase fetches org context when OrganizationID provided
    Tool: Bash
    Preconditions: Code updated
    Steps:
      1. grep -n "GetContext" backend/internal/usecase/ai/fishbone.go
      2. Assert match found (usecase calls orgRepo.GetContext)
      3. grep -rn "GetContext" backend/internal/usecase/ai/ | wc -l
      4. Assert count >= 10 (all usecases call GetContext)
    Expected Result: All usecases fetch org context
    Evidence: .sisyphus/evidence/task-6-threading.txt
  ```

  **Commit**: YES (group with Tasks 4, 5)
  - Message: `feat(ai): thread organization context through all AI usecases`
  - Files: `backend/internal/usecase/ai/*.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 7. Wire everything in AI handlers + main.go

  **What to do**:
  - Update ALL AI handler methods to extract `scope.OrganizationID` from middleware and pass to usecase input
  - For handlers that already get `scope` (e.g., predictive, riskSuggestion): add `OrganizationID` to usecase input
  - For handlers that DON'T get scope yet (fishbone, impact, mitigation, minutes, kri): add `scope := middleware.GetAccessScope(c)` and pass `scope.OrganizationID` to input
  - **IMPORTANT for Super Admin**: When AI is called for a specific risk/incident, use THAT entity's org ID, not the admin's own org. For general features (fishbone, impact, mitigation based on free text), use the user's own org ID.
  - Update `cmd/server/main.go` to pass `orgRepo` to all AI usecase constructors: `NewGenerateFishboneUseCase(aiRepo, orgRepo)` etc.
  - Update CBA handler similarly if applicable
  - Ensure `go build ./...` passes

  **Must NOT do**:
  - Do NOT change route definitions
  - Do NOT change middleware order
  - Do NOT add new middleware

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`backend-go`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 4, 5, 6

  **References**:
  - `backend/internal/handler/http/ai.go:85-103` — GenerateCause handler: currently does NOT get scope. Need to add `scope := middleware.GetAccessScope(c)` and pass `scope.OrganizationID` to input.
  - `backend/internal/handler/http/ai.go:231` — Predictive handler: already gets scope
  - `backend/internal/handler/http/ai.go:276` — RiskSuggestion handler: already gets scope
  - `backend/internal/handler/http/ai.go:309` — IncidentBatchExtraction: has `OrganizationID *uuid.UUID` in request
  - `backend/internal/middleware/auth.go:132-133` — `GetAccessScope(c)` returns `*entity.AccessScope`
  - `backend/internal/domain/entity/access_scope.go:14` — `OrganizationID *uuid.UUID`
  - `backend/cmd/server/main.go` — Wiring point for all usecase constructors
  - `backend/internal/handler/http/cba.go` — CBA handler to update similarly

  **QA Scenarios**:

  ```
  Scenario: Full stack builds after wiring
    Tool: Bash
    Preconditions: Tasks 1-6 complete
    Steps:
      1. Run: cd backend && go build ./...
      2. Assert exit code 0
      3. Run: cd backend && go vet ./...
      4. Assert exit code 0
    Expected Result: Everything compiles
    Evidence: .sisyphus/evidence/task-7-build.txt

  Scenario: AI fishbone endpoint includes org context in prompt
    Tool: Bash (curl)
    Preconditions: Backend running, org has context set ("Unit pelayanan kesehatan Jakarta")
    Steps:
      1. Set org context: curl -X PUT http://localhost:8080/api/v1/organizations/{id} -H "Authorization: Bearer $TOKEN" -d '{"name":"Test","context":"Unit pelayanan kesehatan masyarakat Jakarta Selatan, fokus pada penyakit tropis."}'
      2. Call fishbone: curl -X POST http://localhost:8080/api/v1/ai/causes -H "Authorization: Bearer $TOKEN" -d '{"title":"Keterlambatan pelaporan","description":"Laporan insiden sering terlambat"}'
      3. Assert HTTP status 200
      4. Assert response contains fishbone analysis (JSON with categories)
      5. Check server logs for "Konteks Organisasi:" in system message (or verify response relevance mentions "Jakarta Selatan" or "penyakit tropis")
    Expected Result: AI response is contextually relevant to the organization
    Evidence: .sisyphus/evidence/task-7-ai-with-context.txt

  Scenario: AI endpoint works without org context (no-op)
    Tool: Bash (curl)
    Preconditions: Backend running, org has NO context set (null)
    Steps:
      1. Call fishbone for org without context
      2. Assert HTTP status 200
      3. Assert response is valid fishbone JSON
    Expected Result: AI works normally when no context is set
    Evidence: .sisyphus/evidence/task-7-ai-without-context.txt
  ```

  **Commit**: YES
  - Message: `feat(ai): wire org context from handlers through usecases to AI prompts`
  - Files: `backend/internal/handler/http/ai.go`, `backend/internal/handler/http/cba.go`, `backend/cmd/server/main.go`
  - Pre-commit: `cd backend && go build ./...`

- [x] 8. Connect frontend to real API + final build verification

  **What to do**:
  - Wire frontend settings page (Task 3) to real API endpoints:
    - GET `/api/v1/organizations/:id` → load current context into textarea
    - PUT `/api/v1/organizations/:id` with `{ name, context }` → save context
  - Get org ID from auth context (user's organizationId from login response)
  - For Super Admin: implement org selector using GET `/api/v1/organizations` list endpoint
  - Add proper error handling: network errors, 400 (too long), 403 (unauthorized)
  - Add success toast on save
  - Run `npm run build` to verify no build errors

  **Must NOT do**:
  - Do NOT change existing API client patterns
  - Do NOT add new npm dependencies (use existing toast/notification system)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`react-expert`, `shadcn`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3, 7

  **References**:
  - `frontend/src/app/(app)/admin/settings/page.tsx` — Existing settings page for UI patterns
  - `frontend/src/contexts/` — Auth context with user's org ID
  - `frontend/src/lib/` — Existing API utility functions (fetch patterns, base URL)
  - Task 3 output — The scaffolded settings page to wire up

  **QA Scenarios**:

  ```
  Scenario: Save and reload org context
    Tool: Playwright
    Preconditions: Frontend + backend running, user logged in as Unit user
    Steps:
      1. Navigate to org context settings page
      2. Type "Kami adalah unit pelayanan kesehatan masyarakat" into textarea
      3. Click save button
      4. Wait for success indication (toast or status message)
      5. Reload page
      6. Assert textarea contains "Kami adalah unit pelayanan kesehatan masyarakat"
    Expected Result: Context persists across page reloads
    Evidence: .sisyphus/evidence/task-8-save-reload.png

  Scenario: Frontend build passes
    Tool: Bash
    Preconditions: All frontend changes complete
    Steps:
      1. Run: cd frontend && npm run build
      2. Assert exit code 0
    Expected Result: No build errors
    Evidence: .sisyphus/evidence/task-8-build.txt
  ```

  **Commit**: YES
  - Message: `feat(frontend): connect org context settings to API`
  - Files: `frontend/src/app/(app)/admin/settings/organization-context/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `go build ./...` + `go vet ./...` + `npm run build`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Frontend Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (set context → call AI → verify context in prompt). Test edge cases: empty context, 2001 chars, special characters. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Content | Pre-commit |
|--------|---------|------------|
| 1 | Tasks 1-2: Migration + entity/repo update | `make migrate-up && go build ./...` |
| 2 | Tasks 4-6: Org context CRUD + AI interface threading | `go build ./...` |
| 3 | Task 7: AI handlers wiring + main.go | `go build ./...` |
| 4 | Tasks 3, 8: Frontend settings page | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Backend builds
cd backend && go build ./...  # Expected: no errors

# Migration applies
cd backend && make migrate-up  # Expected: exit 0

# Frontend builds
cd frontend && npm run build  # Expected: exit 0

# API: Set org context
curl -X PUT http://localhost:8080/api/v1/organizations/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Unit Test","context":"Kami adalah unit pelayanan kesehatan masyarakat..."}' \
  # Expected: 200, response includes context field

# API: Context too long (>2000 chars)
curl -X PUT http://localhost:8080/api/v1/organizations/{id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Unit Test","context":"<2001 chars>"}' \
  # Expected: 400

# API: AI endpoint includes context
# (Verify via server logs that system message now includes org context)
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] `go build ./...` passes
- [x] `npm run build` passes
- [x] Migration applies and rolls back cleanly

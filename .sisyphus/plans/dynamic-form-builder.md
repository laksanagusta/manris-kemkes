# Dynamic Form Builder — Manris v2

## TL;DR

> **Quick Summary**: Build a Google Forms-style dynamic form builder integrated into Manris v2. Super Admins create forms with sections and fields (5 types), Unit/Reviewer/Pimpinan users fill assigned forms, and response data is analyzed with summary stats and charts.
> 
> **Deliverables**:
> - Database migration for forms, sections, fields, responses, assignments
> - Backend Clean Architecture: domain entities, repository, usecases, HTTP handlers
> - Frontend Form Builder UI with drag-and-drop (admin)
> - Frontend Form Filler UI with conditional logic (all assigned users)
> - Analytics Dashboard with bar, pie, and line trend charts
> - Navigation integration and RBAC enforcement
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Migration → Domain + Repo → Usecases → Handlers → Frontend Types + Nav → Form Builder UI → Form Filler UI → Analytics

---

## Context

### Original Request
Admin ingin bisa membuat form dinamis seperti Google Forms dengan sections dan komponen (textbox, checkbox, option, dll). Form ini diisi oleh unit-unit sebagai pelaporan, dan data form bisa dianalisa.

### Interview Summary
**Key Discussions**:
- **Field types**: Basic only — Textbox, Textarea, Checkbox, Radio Button, Dropdown
- **Conditional logic**: Basic — show/hide field when another field equals a specific value. Checkbox cannot be a conditional source.
- **Validation**: Required/Optional toggle per field only. No min/max/pattern rules.
- **Form lifecycle**: draft → published → closed. Manual close only, no deadline/period.
- **Versioning**: Form LOCKED after any response exists. Admin must create a new form to make changes.
- **Target audience**: Admin can assign to ALL units or SPECIFIC units. All assigned roles (unit, reviewer, pimpinan) can fill.
- **Multiple responses**: One response per user per form (UNIQUE constraint).
- **Submission**: No approval workflow. Submit → stored immediately. No editing after submit.
- **Analytics**: Summary statistics + Charts (bar for multi-option, pie for single-select, line trend for answer distribution over time).
- **Reorder**: Drag-and-drop within sections only (not cross-section). Using @dnd-kit.
- **Save UX**: Manual save button for form builder (no auto-save).
- **Form builder access**: Super Admin only.

**Research Findings**:
- Codebase follows Clean Architecture (risk feature as canonical example)
- JSONB already used in migrations (meeting_minutes action_items)
- JSONB outperforms EAV 2-5x for dynamic form responses
- GIN index with `jsonb_path_ops` recommended for analytics queries
- `@dnd-kit/react` (new API with `DragDropProvider`) required for React 19 compatibility
- Registry pattern for dynamic field rendering is industry standard
- Missing shadcn/ui components needed: `radio-group`, `checkbox`, `accordion`/`collapsible`
- Latest migration is `000019_risk_category_contract`

### Metis Review
**Identified Gaps** (addressed):
- Multiple responses ambiguity → Confirmed: 1 per user per form
- Which roles fill forms → Confirmed: All assigned roles (unit, reviewer, pimpinan)
- Cross-section drag → Confirmed: Within section only
- Form save mechanism → Confirmed: Manual save button
- Line chart data → Confirmed: Answer distribution trend over time
- Checkbox as conditional source → Excluded (array comparison ambiguity)
- Conditional logic on hidden required fields → Hidden fields skip validation, answers omitted
- Empty form publish → Validation: ≥1 section with ≥1 field required
- Options-based fields → Validation: ≥2 options required for radio/checkbox/dropdown
- Concurrent editing → Accepted as known limitation for v1 (last-write-wins)
- Closed form reopening → Not allowed. Must create new form.

---

## Work Objectives

### Core Objective
Build a complete dynamic form builder system integrated into Manris v2, enabling Super Admins to create structured forms and all assigned users to submit responses, with analytics dashboards for data visualization.

### Concrete Deliverables
- Migration `000020_dynamic_forms.up.sql` / `.down.sql`
- Backend: `domain/entity/form.go`, `domain/repository/form.go`, `repository/postgres/form.go`, `usecase/form/*.go`, `handler/http/form.go`
- Frontend: Form Builder page (`/admin/forms/new`, `/admin/forms/[id]/edit`), Form List page (`/admin/forms`), Form Filler page (`/forms/[id]/fill`), Form Analytics page (`/admin/forms/[id]/analytics`), My Forms page (`/forms`)
- Navigation entries for both admin and user roles
- TypeScript types in `types/form.ts`

### Definition of Done
- [ ] Super Admin can create a form with sections, fields (5 types), required/optional, conditional logic, and save as draft
- [ ] Super Admin can publish a form, assigning it to all or specific units
- [ ] Assigned users can view their forms list and fill a published form
- [ ] Form submission stores JSONB response with UNIQUE constraint per user per form
- [ ] Published form with responses is locked from editing
- [ ] Super Admin can close a form to stop new submissions
- [ ] Analytics page shows summary stats, bar/pie charts per field, and line trend over time
- [ ] RBAC enforced: only Super Admin can CRUD forms, all authenticated users can fill assigned forms
- [ ] All endpoints return proper error responses following RFC 7807

### Must Have
- 5 field types: text, textarea, checkbox, radio, dropdown
- Sections with drag-and-drop reorder (within section for fields, order for sections)
- Required/optional toggle per field
- Basic conditional logic (show/hide when field equals value)
- Form lifecycle: draft → published → closed
- Form locking after first response
- Unit assignment (all or specific)
- 1 response per user per form
- Analytics with summary + bar/pie/line charts

### Must NOT Have (Guardrails)
- ❌ Field types beyond the 5 specified (no date picker, number, rating, file upload, signature, matrix)
- ❌ Advanced validation (no min/max, pattern, regex, custom rules)
- ❌ Advanced conditional logic (no AND/OR, no nested conditions, no "not equals"/"contains")
- ❌ Checkbox fields as conditional logic source
- ❌ CSV/Excel export
- ❌ AI analysis of responses
- ❌ Approval workflow for submissions
- ❌ Response editing or deletion after submit
- ❌ Form templates / form duplication
- ❌ Auto-save (neither form builder nor form filler)
- ❌ Undo/redo in form builder
- ❌ Keyboard shortcuts
- ❌ Form reopening after close
- ❌ Cross-section drag-and-drop
- ❌ Zustand or any external state management library (use useReducer)
- ❌ Anonymous responses
- ❌ Notifications (email/push) for form assignment
- ❌ Custom form theming/branding
- ❌ Pagination on response list in v1
- ❌ Separate `field_options` table — options stored as JSONB on form_fields
- ❌ `@dnd-kit/core` legacy API — must use `@dnd-kit/react` new API

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Go testing framework)
- **Automated tests**: None — Agent QA only
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend API**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Database**: Use Bash (psql) — Query tables, verify schema, check constraints

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: Database migration (forms, sections, fields, responses, assignments) [quick]
├── Task 2: Install missing shadcn/ui components + @dnd-kit/react [quick]
└── Task 3: TypeScript types + form field type registry definition [quick]

Wave 2 (Backend Core — after Wave 1):
├── Task 4: Domain entities + repository interfaces (depends: 1) [unspecified-high]
├── Task 5: PostgreSQL repository — form CRUD (depends: 4) [unspecified-high]
├── Task 6: PostgreSQL repository — responses + analytics queries (depends: 4) [deep]
├── Task 7: Frontend navigation + page scaffolds (depends: 2, 3) [quick]
└── Task 8: Frontend field renderer components (depends: 2, 3) [visual-engineering]

Wave 3 (Backend Usecases + Handlers + Frontend UI — after Wave 2):
├── Task 9: Usecases — form CRUD + lifecycle (depends: 5) [unspecified-high]
├── Task 10: Usecases — response submission + analytics (depends: 6) [deep]
├── Task 11: HTTP handlers + route registration (depends: 9, 10) [unspecified-high]
├── Task 12: Form Builder UI — sections + fields + config panel (depends: 7, 8) [visual-engineering]
└── Task 13: Form Builder UI — drag-and-drop reorder (depends: 12) [visual-engineering]

Wave 4 (Frontend Integration + Analytics — after Wave 3):
├── Task 14: Form List + Lifecycle Management pages (depends: 11, 7) [visual-engineering]
├── Task 15: Form Filler UI with conditional logic (depends: 8, 11) [deep]
├── Task 16: Form Analytics Dashboard with charts (depends: 11) [visual-engineering]
└── Task 17: End-to-end wiring + polish (depends: 14, 15, 16) [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 4, 5, 6 | 1 |
| 2 | — | 7, 8, 12, 13 | 1 |
| 3 | — | 7, 8 | 1 |
| 4 | 1 | 5, 6 | 2 |
| 5 | 4 | 9 | 2 |
| 6 | 4 | 10 | 2 |
| 7 | 2, 3 | 12, 14 | 2 |
| 8 | 2, 3 | 12, 15 | 2 |
| 9 | 5 | 11 | 3 |
| 10 | 6 | 11 | 3 |
| 11 | 9, 10 | 14, 15, 16 | 3 |
| 12 | 7, 8 | 13 | 3 |
| 13 | 12 | 17 | 3 |
| 14 | 11, 7 | 17 | 4 |
| 15 | 8, 11 | 17 | 4 |
| 16 | 11 | 17 | 4 |
| 17 | 14, 15, 16 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: **3 tasks** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **5 tasks** — T4 → `unspecified-high`, T5 → `unspecified-high`, T6 → `deep`, T7 → `quick`, T8 → `visual-engineering`
- **Wave 3**: **5 tasks** — T9 → `unspecified-high`, T10 → `deep`, T11 → `unspecified-high`, T12 → `visual-engineering`, T13 → `visual-engineering`
- **Wave 4**: **4 tasks** — T14 → `visual-engineering`, T15 → `deep`, T16 → `visual-engineering`, T17 → `deep`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Database Migration — Dynamic Forms Schema

  **What to do**:
  - Create `backend/db/migrations/000020_dynamic_forms.up.sql` with the following tables:
    - `forms` — id (UUID PK), title (VARCHAR 255 NOT NULL), description (TEXT), status (VARCHAR 20 DEFAULT 'draft' CHECK IN ('draft','published','closed')), target_audience (VARCHAR 20 DEFAULT 'all' CHECK IN ('all','specific')), created_by (UUID REFERENCES users(id)), created_at (TIMESTAMPTZ DEFAULT now()), updated_at (TIMESTAMPTZ DEFAULT now())
    - `form_sections` — id (UUID PK), form_id (UUID REFERENCES forms(id) ON DELETE CASCADE), title (VARCHAR 255 NOT NULL), description (TEXT), position (INTEGER NOT NULL DEFAULT 0), created_at (TIMESTAMPTZ DEFAULT now())
    - `form_fields` — id (UUID PK), section_id (UUID REFERENCES form_sections(id) ON DELETE CASCADE), form_id (UUID REFERENCES forms(id) ON DELETE CASCADE), field_type (VARCHAR 20 NOT NULL CHECK IN ('text','textarea','radio','checkbox','dropdown')), field_key (VARCHAR 100 NOT NULL), label (TEXT NOT NULL), placeholder (TEXT), is_required (BOOLEAN DEFAULT false), options (JSONB DEFAULT '[]'::jsonb), position (INTEGER NOT NULL DEFAULT 0), condition_source_field_id (UUID REFERENCES form_fields(id) ON DELETE SET NULL), condition_value (TEXT), created_at (TIMESTAMPTZ DEFAULT now())
    - `form_responses` — id (UUID PK), form_id (UUID REFERENCES forms(id) ON DELETE CASCADE), respondent_id (UUID REFERENCES users(id)), answers (JSONB NOT NULL DEFAULT '{}'::jsonb), submitted_at (TIMESTAMPTZ DEFAULT now()). Add UNIQUE constraint on (form_id, respondent_id).
    - `form_assignments` — id (UUID PK), form_id (UUID REFERENCES forms(id) ON DELETE CASCADE), organization_id (UUID REFERENCES organizations(id) ON DELETE CASCADE), created_at (TIMESTAMPTZ DEFAULT now()). Add UNIQUE constraint on (form_id, organization_id).
  - Create indexes:
    - `idx_form_sections_form_id` on form_sections(form_id)
    - `idx_form_fields_section_id` on form_fields(section_id)
    - `idx_form_fields_form_id` on form_fields(form_id)
    - `idx_form_responses_form_id` on form_responses(form_id)
    - `idx_form_responses_answers` on form_responses USING GIN(answers jsonb_path_ops)
    - `idx_form_assignments_form_id` on form_assignments(form_id)
    - `idx_form_assignments_org_id` on form_assignments(organization_id)
  - Create `backend/db/migrations/000020_dynamic_forms.down.sql` that drops all tables in reverse order

  **Must NOT do**:
  - Do NOT create a separate `field_options` table — options are JSONB on `form_fields`
  - Do NOT add `deadline`, `scheduled_publish`, or any time-period columns
  - Do NOT add `condition_operator` column — only "equals" is supported, hardcoded in application logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single migration file creation following established patterns
  - **Skills**: []
    - No special skills needed — follows existing migration pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend/db/migrations/000001_initial_schema.up.sql` — UUID PK pattern with `gen_random_uuid()`, TIMESTAMPTZ defaults, CHECK constraints, TEXT arrays, foreign key patterns
  - `backend/db/migrations/000015_meeting_minutes.up.sql` — JSONB column patterns (`action_items JSONB DEFAULT '[]'::jsonb`)
  - `backend/db/migrations/000007_risk_versioning.up.sql` — ALTER TABLE patterns, conditional indexes, backfill strategy

  **External References**:
  - PostgreSQL GIN index docs: use `jsonb_path_ops` operator class for containment queries

  **WHY Each Reference Matters**:
  - `000001` shows the canonical table creation pattern with UUID PKs, timestamp defaults, and CHECK constraints that ALL new tables must follow
  - `000015` shows JSONB column declaration with defaults — critical for `options`, `answers` columns
  - `000007` shows the down migration pattern and conditional unique indexes

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Migration applies cleanly
    Tool: Bash
    Preconditions: PostgreSQL running, database exists, at migration version 000019
    Steps:
      1. cd backend && make migrate-up
      2. psql $DATABASE_URL -c "\dt form*" — verify 5 tables exist (forms, form_sections, form_fields, form_responses, form_assignments)
      3. psql $DATABASE_URL -c "\d forms" — verify columns match spec
      4. psql $DATABASE_URL -c "\d form_fields" — verify field_type CHECK constraint includes all 5 types
      5. psql $DATABASE_URL -c "\di" | grep form — verify all 7 indexes created
      6. psql $DATABASE_URL -c "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_form_responses_answers'" — verify GIN jsonb_path_ops
    Expected Result: All tables, columns, constraints, and indexes created. Zero errors.
    Failure Indicators: Any SQL error, missing table, missing constraint, wrong column type
    Evidence: .sisyphus/evidence/task-1-migration-up.txt

  Scenario: Migration rolls back cleanly
    Tool: Bash
    Preconditions: Migration 000020 applied
    Steps:
      1. cd backend && make migrate-down
      2. psql $DATABASE_URL -c "\dt form*" — verify 0 tables with 'form' prefix
    Expected Result: All form tables dropped. No orphaned indexes or constraints.
    Failure Indicators: Any table still exists, foreign key error during drop
    Evidence: .sisyphus/evidence/task-1-migration-down.txt

  Scenario: UNIQUE constraints enforced
    Tool: Bash
    Preconditions: Migration applied, test data inserted
    Steps:
      1. INSERT a form_response with form_id=X, respondent_id=Y
      2. INSERT another form_response with same form_id=X, respondent_id=Y
      3. Expected: second INSERT fails with unique violation
      4. INSERT a form_assignment with form_id=X, organization_id=Z
      5. INSERT another form_assignment with same form_id=X, organization_id=Z
      6. Expected: second INSERT fails with unique violation
    Expected Result: Both duplicate inserts fail with "duplicate key value violates unique constraint"
    Failure Indicators: Second insert succeeds
    Evidence: .sisyphus/evidence/task-1-unique-constraints.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-migration-up.txt
  - [ ] task-1-migration-down.txt
  - [ ] task-1-unique-constraints.txt

  **Commit**: YES
  - Message: `feat(db): add dynamic forms migration`
  - Files: `backend/db/migrations/000020_dynamic_forms.up.sql`, `backend/db/migrations/000020_dynamic_forms.down.sql`
  - Pre-commit: `cd backend && make migrate-up`

---

- [x] 2. Install Missing shadcn/ui Components + @dnd-kit

  **What to do**:
  - In the `frontend/` directory, install missing shadcn/ui components:
    - `npx shadcn@latest add radio-group`
    - `npx shadcn@latest add checkbox`
    - `npx shadcn@latest add accordion`
  - Install @dnd-kit for React 19:
    - `npm install @dnd-kit/react @dnd-kit/dom`
  - Verify all components install correctly and the project still builds

  **Must NOT do**:
  - Do NOT install `@dnd-kit/core` or `@dnd-kit/sortable` (legacy packages)
  - Do NOT install Zustand or any other state management library
  - Do NOT modify any existing component files

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package installation only, no custom code
  - **Skills**: [`shadcn`]
    - `shadcn`: Needed for correct shadcn component installation commands

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 7, 8, 12, 13
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/components/ui/` — Existing shadcn components directory to verify installation target
  - `frontend/package.json` — Current dependencies to verify no conflicts

  **External References**:
  - @dnd-kit docs: https://dndkit.com — verify correct package names for React 19

  **WHY Each Reference Matters**:
  - `components/ui/` confirms the target directory for shadcn components — new components must appear here
  - `package.json` must be checked for version conflicts, especially React 19 compatibility

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All components installed and project builds
    Tool: Bash
    Preconditions: frontend/ directory exists with package.json
    Steps:
      1. cd frontend && npm run build
      2. ls src/components/ui/radio-group.tsx — verify file exists
      3. ls src/components/ui/checkbox.tsx — verify file exists
      4. ls src/components/ui/accordion.tsx — verify file exists
      5. grep "@dnd-kit/react" package.json — verify dependency present
      6. grep "@dnd-kit/dom" package.json — verify dependency present
    Expected Result: Build succeeds. All 3 shadcn component files exist. @dnd-kit packages in package.json.
    Failure Indicators: Build fails, component files missing, packages not in dependencies
    Evidence: .sisyphus/evidence/task-2-install-verify.txt

  Scenario: No legacy @dnd-kit packages installed
    Tool: Bash
    Preconditions: Installation complete
    Steps:
      1. grep "@dnd-kit/core" frontend/package.json — should NOT match
      2. grep "@dnd-kit/sortable" frontend/package.json — should NOT match
    Expected Result: Neither legacy package is present
    Failure Indicators: Legacy packages found in dependencies
    Evidence: .sisyphus/evidence/task-2-no-legacy-dndkit.txt
  ```

  **Evidence to Capture:**
  - [ ] task-2-install-verify.txt
  - [ ] task-2-no-legacy-dndkit.txt

  **Commit**: YES
  - Message: `feat(frontend): install shadcn components and dnd-kit`
  - Files: `frontend/package.json`, `frontend/package-lock.json`, `frontend/src/components/ui/radio-group.tsx`, `frontend/src/components/ui/checkbox.tsx`, `frontend/src/components/ui/accordion.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

- [x] 3. TypeScript Types + Form Field Registry Definition

  **What to do**:
  - Create `frontend/src/types/form.ts` with all TypeScript types:
    - `FormFieldType = "text" | "textarea" | "radio" | "checkbox" | "dropdown"`
    - `FormStatus = "draft" | "published" | "closed"`
    - `TargetAudience = "all" | "specific"`
    - `FormFieldOption` — `{ value: string; label: string }`
    - `ConditionalLogic` — `{ sourceFieldId: string; value: string }` (equals operator is implicit)
    - `FormField` — id, sectionId, formId, fieldType, fieldKey, label, placeholder, isRequired, options, position, conditionalLogic
    - `FormSection` — id, formId, title, description, position, fields
    - `Form` — id, title, description, status, targetAudience, sections, createdBy, createdAt, updatedAt
    - `FormResponse` — id, formId, respondentId, answers (Record<string, unknown>), submittedAt
    - `FormAssignment` — id, formId, organizationId, createdAt
    - `FormAnalyticsSummary` — totalResponses, fields: FormFieldAnalytics[]
    - `FormFieldAnalytics` — fieldId, fieldKey, label, fieldType, summary: Record<string, number>, trend: TrendPoint[]
    - `TrendPoint` — period (string), values: Record<string, number>
    - DTO types for create/update requests: `CreateFormDTO`, `UpdateFormDTO`, `SubmitResponseDTO`
  - Create `frontend/src/lib/form-field-registry.ts`:
    - Define `FIELD_TYPE_CONFIG` map with label, icon (Lucide icon name), defaultPlaceholder for each field type
    - Export `getFieldTypeConfig(type: FormFieldType)` helper
    - Export `FIELD_TYPES` array of all available types for the type selector UI

  **Must NOT do**:
  - Do NOT add field types beyond the 5 specified
  - Do NOT import React components here — registry is data-only, component mapping is in Task 8
  - Do NOT add validation rule types (min/max/pattern) — only `isRequired` boolean

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure TypeScript type definitions, no complex logic
  - **Skills**: []
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `frontend/src/types/incident.ts` — TypeScript type definition pattern with interfaces, union types, optional fields, and `null` handling
  - `frontend/src/types/risk.ts` — Another type file showing how DTOs vs display types are separated

  **API/Type References**:
  - Database schema from Task 1 — types must map 1:1 to database columns (snake_case in DB → camelCase in TS)

  **External References**:
  - Lucide React icons: `Type` (text), `AlignLeft` (textarea), `CheckSquare` (checkbox), `Circle` (radio), `ChevronDown` (dropdown) — for field type config

  **WHY Each Reference Matters**:
  - `incident.ts` shows the convention for nullable fields (`string | null`), optional fields (`?`), and how to separate the API response type from the draft/create type
  - Database schema ensures types match exactly — fieldType maps to `field_type` column CHECK constraint values

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Types compile and project builds
    Tool: Bash
    Preconditions: frontend/ exists
    Steps:
      1. cd frontend && npm run build
      2. Verify no TypeScript errors related to form.ts
    Expected Result: Build succeeds with zero type errors
    Failure Indicators: Build fails with TS errors in form.ts or form-field-registry.ts
    Evidence: .sisyphus/evidence/task-3-build-check.txt

  Scenario: Field type registry has all 5 types
    Tool: Bash
    Preconditions: form-field-registry.ts created
    Steps:
      1. grep -c "text\|textarea\|radio\|checkbox\|dropdown" frontend/src/lib/form-field-registry.ts
      2. Verify all 5 types present in FIELD_TYPES export
    Expected Result: All 5 field types present with config entries
    Failure Indicators: Missing field type, extra field type beyond 5
    Evidence: .sisyphus/evidence/task-3-registry-check.txt
  ```

  **Evidence to Capture:**
  - [ ] task-3-build-check.txt
  - [ ] task-3-registry-check.txt

  **Commit**: YES
  - Message: `feat(frontend): add form TypeScript types and field registry`
  - Files: `frontend/src/types/form.ts`, `frontend/src/lib/form-field-registry.ts`
  - Pre-commit: `cd frontend && npm run build`

---

- [x] 4. Backend Domain Entities + Repository Interfaces

  **What to do**:
  - Create `backend/internal/domain/entity/form.go`:
    - `Form` struct — ID, Title, Description, Status, TargetAudience, CreatedBy (uuid.UUID), Sections []FormSection, CreatedAt, UpdatedAt (time.Time)
    - `FormSection` struct — ID, FormID, Title, Description, Position (int), Fields []FormField
    - `FormField` struct — ID, SectionID, FormID, FieldType, FieldKey, Label, Placeholder, IsRequired (bool), Options ([]FieldOption as JSON), Position (int), ConditionSourceFieldID (*uuid.UUID), ConditionValue (*string)
    - `FieldOption` struct — Value, Label (string)
    - `FormResponse` struct — ID, FormID, RespondentID (uuid.UUID), Answers (json.RawMessage), SubmittedAt (time.Time)
    - `FormAssignment` struct — ID, FormID, OrganizationID (uuid.UUID)
    - Constants: `FormStatusDraft`, `FormStatusPublished`, `FormStatusClosed`
    - Constants: `FieldTypeText`, `FieldTypeTextarea`, `FieldTypeRadio`, `FieldTypeCheckbox`, `FieldTypeDropdown`
    - Validation methods: `(f *Form) ValidateForPublish() error` — checks ≥1 section, each section has ≥1 field, options-based fields have ≥2 options, no circular conditional references, conditional sources must reference valid field IDs within the same form, checkbox fields cannot be conditional sources
    - `(f *Form) IsEditable() bool` — returns true only if status == "draft"
    - `(f *Form) IsAcceptingResponses() bool` — returns true only if status == "published"
  - Create `backend/internal/domain/repository/form.go`:
    - `FormRepository` interface with methods: Create, GetByID, Update, Delete, List (with filters: status, createdBy), UpdateStatus, GetResponseCount, HasResponses
    - `FormResponseRepository` interface with methods: Create, GetByFormID (list), GetByFormAndRespondent, CountByFormID, GetFieldAggregations (for analytics), GetFieldTrends (for line chart)
    - `FormAssignmentRepository` interface with methods: SetAssignments (bulk replace), GetByFormID, GetFormIDsForOrganization
  - Create `backend/internal/domain/errors/form_errors.go`:
    - `ErrFormNotFound`, `ErrFormLocked` (has responses), `ErrFormNotPublished`, `ErrFormClosed`, `ErrFormAlreadyPublished`, `ErrDuplicateResponse`, `ErrFormNotAssigned`, `ErrInvalidFormTitle`, `ErrEmptySection`, `ErrFieldMissingOptions`, `ErrInvalidFieldType`, `ErrInvalidConditionalSource`

  **Must NOT do**:
  - Do NOT add `Deadline`, `ScheduledAt`, or any time-period fields
  - Do NOT add `condition_operator` field — equals is the only operator, hardcoded
  - Do NOT add validation rules beyond `IsRequired`
  - Do NOT import pgx or any DB-specific packages in domain layer

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple files with complex type definitions and validation logic. Requires careful domain modeling.
  - **Skills**: [`backend-go`]
    - `backend-go`: Go clean architecture patterns, entity design, interface definitions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8) — but T5 and T6 depend on T4
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `backend/internal/domain/entity/risk.go` — Entity struct pattern with JSON tags, validation methods, business logic methods, constants
  - `backend/internal/domain/repository/risk.go` — Repository interface pattern with context.Context params, uuid.UUID types, error returns
  - `backend/internal/domain/errors/errors.go` — AppError type, domain error variables, Wrap function, Is* check functions

  **API/Type References**:
  - Database schema from Task 1 — entities must map 1:1 to DB tables

  **WHY Each Reference Matters**:
  - `risk.go` entity shows exact struct tag conventions (`json:"fieldName"`), how to define status constants, and the validation pattern that returns domain errors
  - `risk.go` repository shows the interface signature convention: `context.Context` first param, return `(*Entity, error)` or `([]*Entity, error)`
  - `errors.go` shows how to define domain-specific errors that the handler layer can map to HTTP status codes via `handleError()`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Domain package compiles
    Tool: Bash
    Preconditions: Task 1 migration files exist (for reference, not required for compilation)
    Steps:
      1. cd backend && go build ./internal/domain/...
      2. Verify zero compilation errors
    Expected Result: All domain packages compile cleanly
    Failure Indicators: Any compilation error
    Evidence: .sisyphus/evidence/task-4-domain-build.txt

  Scenario: ValidateForPublish catches invalid forms
    Tool: Bash
    Preconditions: Entity code compiled
    Steps:
      1. Create a simple Go test script (or use go run) that:
         - Creates a Form with zero sections → ValidateForPublish() returns error
         - Creates a Form with a section that has zero fields → returns error
         - Creates a Form with a radio field with only 1 option → returns error
         - Creates a Form with a checkbox field as conditional source → returns error
         - Creates a valid Form with 1 section, 1 text field → returns nil
      2. Run the verification
    Expected Result: All invalid cases return appropriate errors, valid case returns nil
    Failure Indicators: Valid form rejected or invalid form accepted
    Evidence: .sisyphus/evidence/task-4-validation-check.txt
  ```

  **Evidence to Capture:**
  - [ ] task-4-domain-build.txt
  - [ ] task-4-validation-check.txt

  **Commit**: YES
  - Message: `feat(backend): add form domain entities and repository interfaces`
  - Files: `backend/internal/domain/entity/form.go`, `backend/internal/domain/repository/form.go`, `backend/internal/domain/errors/form_errors.go`
  - Pre-commit: `cd backend && go build ./internal/domain/...`

---

- [x] 5. PostgreSQL Repository — Form CRUD

  **What to do**:
  - Create `backend/internal/repository/postgres/form.go` implementing `FormRepository` and `FormAssignmentRepository` interfaces:
    - `NewFormRepository(pool *pgxpool.Pool)` constructor
    - `Create(ctx, form)` — INSERT form → INSERT sections (loop) → INSERT fields (nested loop). Use single transaction (`pool.Begin()`). Return created form with IDs populated.
    - `GetByID(ctx, id)` — SELECT form JOIN sections JOIN fields. Assemble nested struct. Include sections ordered by position, fields ordered by position within each section.
    - `Update(ctx, form)` — Within transaction: DELETE existing sections/fields for form_id, then re-INSERT all sections/fields (simpler than diffing). Update form title/description/target_audience. Only allowed when form has no responses (check in usecase, not here).
    - `Delete(ctx, id)` — DELETE FROM forms WHERE id = $1 (CASCADE handles sections, fields, responses, assignments)
    - `List(ctx, filters)` — SELECT with optional WHERE clauses for status, created_by. Return list without nested sections/fields (lightweight).
    - `UpdateStatus(ctx, id, newStatus)` — UPDATE forms SET status = $1, updated_at = now() WHERE id = $2
    - `HasResponses(ctx, formID)` — SELECT EXISTS(SELECT 1 FROM form_responses WHERE form_id = $1)
    - `GetResponseCount(ctx, formID)` — SELECT COUNT(*) FROM form_responses WHERE form_id = $1
    - `SetAssignments(ctx, formID, orgIDs)` — Within transaction: DELETE existing assignments for form_id, INSERT new assignments. Handle empty orgIDs (clear all assignments).
    - `GetByFormID(ctx, formID)` — SELECT * FROM form_assignments WHERE form_id = $1
    - `GetFormIDsForOrganization(ctx, orgID)` — SELECT form_id FROM form_assignments WHERE organization_id = $1
  - Use `mustJSON()` helper (already exists in codebase) for encoding field options to JSONB
  - Use `json.Unmarshal()` for decoding JSONB options back to `[]FieldOption`
  - Use positional parameters ($1, $2, ...) for ALL queries — no string interpolation

  **Must NOT do**:
  - Do NOT add any query methods for analytics — that's Task 6
  - Do NOT add SQL string concatenation — all queries must use parameterized inputs
  - Do NOT implement optimistic locking or ETag — accept last-write-wins for v1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex SQL with transactions, JOINs, JSONB handling, and multiple interface implementations
  - **Skills**: [`backend-go`, `postgres-pro`]
    - `backend-go`: Clean architecture repository implementation patterns
    - `postgres-pro`: PostgreSQL transaction patterns, JSONB operations, query optimization

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 4)
  - **Parallel Group**: Wave 2 (starts after Task 4 completes)
  - **Blocks**: Task 9
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/risk.go` — Canonical repository implementation: constructor, `pool.QueryRow()` for single inserts with RETURNING, `pool.Query()` for lists, `mustJSON()` for JSONB encoding, `json.Unmarshal()` for JSONB decoding, `Scan()` patterns, error wrapping with `fmt.Errorf("operation: %w", err)`
  - `backend/internal/repository/postgres/risk.go:Create()` — Shows pattern for inserting parent + children in sequence (risk → mitigations)

  **API/Type References**:
  - `backend/internal/domain/repository/form.go` — Interface to implement (from Task 4)
  - `backend/internal/domain/entity/form.go` — Entity structs to use (from Task 4)

  **WHY Each Reference Matters**:
  - `risk.go` repository is the EXACT pattern to copy: how to initialize with `pgxpool.Pool`, how to use `QueryRow` + `Scan` for inserts, how to handle JSONB with `mustJSON()`, and how to loop for child entities. The form CRUD follows the same parent-children pattern (form → sections → fields).

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Repository compiles with interface satisfaction
    Tool: Bash
    Preconditions: Task 4 domain layer exists
    Steps:
      1. cd backend && go build ./internal/repository/postgres/...
      2. Verify the concrete type satisfies FormRepository and FormAssignmentRepository interfaces
    Expected Result: Compilation succeeds with no "does not implement" errors
    Failure Indicators: Interface not satisfied, missing methods
    Evidence: .sisyphus/evidence/task-5-build.txt

  Scenario: Create and GetByID roundtrip preserves data
    Tool: Bash
    Preconditions: Migration applied, backend running
    Steps:
      1. Write a small Go integration test or main script that:
         - Creates a Form with 2 sections, 3 fields (text, radio with options, required checkbox)
         - Calls GetByID with the returned ID
         - Verifies all sections, fields, options, and field ordering preserved
      2. Run and capture output
    Expected Result: All data roundtrips correctly — sections ordered by position, fields ordered by position, JSONB options decoded correctly
    Failure Indicators: Missing sections/fields, wrong order, options not decoded
    Evidence: .sisyphus/evidence/task-5-roundtrip.txt
  ```

  **Evidence to Capture:**
  - [ ] task-5-build.txt
  - [ ] task-5-roundtrip.txt

  **Commit**: YES
  - Message: `feat(backend): implement form CRUD PostgreSQL repository`
  - Files: `backend/internal/repository/postgres/form.go`
  - Pre-commit: `cd backend && go build ./...`

---

- [x] 6. PostgreSQL Repository — Form Responses + Analytics Queries

  **What to do**:
  - Create `backend/internal/repository/postgres/form_response.go` implementing `FormResponseRepository` interface:
    - `NewFormResponseRepository(pool *pgxpool.Pool)` constructor
    - `Create(ctx, response)` — INSERT INTO form_responses. Handle unique violation (form_id, respondent_id) by returning `ErrDuplicateResponse`.
    - `GetByFormID(ctx, formID)` — SELECT all responses for a form, ordered by submitted_at DESC. Return list with respondent info.
    - `GetByFormAndRespondent(ctx, formID, respondentID)` — SELECT single response, return nil if not found.
    - `CountByFormID(ctx, formID)` — SELECT COUNT(*)
    - `GetFieldAggregations(ctx, formID, fields []FormField)` — For each field, generate appropriate aggregation query:
      - For radio/dropdown (single-value): `SELECT answers->>$fieldKey as value, COUNT(*) FROM form_responses WHERE form_id = $1 GROUP BY answers->>$fieldKey`
      - For checkbox (multi-value array): `SELECT value, COUNT(*) FROM form_responses, jsonb_array_elements_text(answers->$fieldKey) as value WHERE form_id = $1 GROUP BY value`
      - For text/textarea: `SELECT COUNT(*) as total, COUNT(CASE WHEN answers->>$fieldKey != '' AND answers->>$fieldKey IS NOT NULL THEN 1 END) as filled` (just filled vs empty count)
      - Return `[]FormFieldAnalytics` with field metadata + summary map
    - `GetFieldTrends(ctx, formID, fields []FormField, period string)` — For option-based fields:
      - `SELECT date_trunc($period, submitted_at) as period, answers->>$fieldKey as value, COUNT(*) FROM form_responses WHERE form_id = $1 GROUP BY period, value ORDER BY period`
      - For checkbox fields use `jsonb_array_elements_text()` same as aggregations
      - Return `[]TrendPoint` per field
  - Handle JSONB query edge cases:
    - NULL answers for a field (field was hidden by conditional logic or not filled)
    - Empty string vs null distinction
    - Checkbox stored as JSON array: `{"field_key": ["opt1", "opt2"]}`

  **Must NOT do**:
  - Do NOT create materialized views or pre-aggregation tables — compute on-the-fly for v1
  - Do NOT add pagination for responses — return all for v1
  - Do NOT use string interpolation for field keys — use parameterized queries or safely quote field keys

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex JSONB aggregation queries, array handling, edge cases, requires deep PostgreSQL knowledge
  - **Skills**: [`backend-go`, `postgres-pro`]
    - `backend-go`: Repository implementation patterns
    - `postgres-pro`: JSONB querying, aggregation functions, jsonb_array_elements_text, date_trunc

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 4)
  - **Parallel Group**: Wave 2 (can run parallel with Task 5 after Task 4)
  - **Blocks**: Task 10
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `backend/internal/repository/postgres/risk.go` — Query patterns with pgx, error wrapping, Scan usage
  - `backend/db/migrations/000020_dynamic_forms.up.sql` (from Task 1) — GIN index definition for `form_responses.answers`

  **External References**:
  - PostgreSQL JSONB operators: `->>` for text extraction, `->` for JSONB element access
  - `jsonb_array_elements_text()` — Expands JSONB array to set of text values, needed for checkbox analytics
  - `date_trunc('week', submitted_at)` — Time bucketing for trend charts

  **WHY Each Reference Matters**:
  - `risk.go` shows how to structure complex queries with pgx, especially the `rows.Scan()` pattern for multi-column results
  - The GIN index from Task 1 ensures analytics queries on `answers` column are performant — use `@>` containment where possible
  - `jsonb_array_elements_text()` is CRITICAL for checkbox field analytics — without it, checkbox multi-select values cannot be individually counted

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Response creation with duplicate detection
    Tool: Bash
    Preconditions: Migration applied, a published form exists
    Steps:
      1. INSERT a response for user A on form X → succeeds (201)
      2. INSERT another response for user A on form X → fails with ErrDuplicateResponse
      3. INSERT a response for user B on form X → succeeds (different user)
    Expected Result: First and third succeed, second returns duplicate error
    Failure Indicators: Duplicate insert succeeds, or different-user insert fails
    Evidence: .sisyphus/evidence/task-6-duplicate-detection.txt

  Scenario: Analytics aggregation returns correct counts
    Tool: Bash
    Preconditions: Form with radio field "color" (options: red, blue, green). 5 responses: 2 red, 2 blue, 1 green.
    Steps:
      1. Call GetFieldAggregations for the form
      2. Verify radio field returns {"red": 2, "blue": 2, "green": 1}
      3. Verify total_responses = 5
    Expected Result: Aggregation counts match exactly
    Failure Indicators: Wrong counts, missing options, null handling errors
    Evidence: .sisyphus/evidence/task-6-analytics-aggregation.txt

  Scenario: Checkbox multi-select aggregation works
    Tool: Bash
    Preconditions: Form with checkbox field "features" (options: A, B, C). 3 responses: [A,B], [B,C], [A]
    Steps:
      1. Call GetFieldAggregations
      2. Verify checkbox field returns {"A": 2, "B": 2, "C": 1} (each option counted individually)
    Expected Result: jsonb_array_elements_text correctly unpacks and counts each selected option
    Failure Indicators: Array treated as single value, wrong counts
    Evidence: .sisyphus/evidence/task-6-checkbox-aggregation.txt
  ```

  **Evidence to Capture:**
  - [ ] task-6-duplicate-detection.txt
  - [ ] task-6-analytics-aggregation.txt
  - [ ] task-6-checkbox-aggregation.txt

  **Commit**: YES
  - Message: `feat(backend): implement form response and analytics repository`
  - Files: `backend/internal/repository/postgres/form_response.go`
  - Pre-commit: `cd backend && go build ./...`

---

- [x] 7. Frontend Navigation + Page Scaffolds

  **What to do**:
  - Add navigation entries in `frontend/src/lib/app-navigation.ts`:
    - Under admin section: "Form Builder" → `/admin/forms` with icon `FileText` (or appropriate Lucide icon)
    - Under main/user section: "My Forms" → `/forms` with icon `ClipboardList`
  - Create page scaffold files (minimal "use client" page with title, ready for implementation):
    - `frontend/src/app/(app)/admin/forms/page.tsx` — Admin Form List (list all forms with status)
    - `frontend/src/app/(app)/admin/forms/new/page.tsx` — Create New Form
    - `frontend/src/app/(app)/admin/forms/[id]/edit/page.tsx` — Edit Existing Form
    - `frontend/src/app/(app)/admin/forms/[id]/analytics/page.tsx` — Form Analytics
    - `frontend/src/app/(app)/admin/forms/[id]/responses/page.tsx` — Form Response List
    - `frontend/src/app/(app)/forms/page.tsx` — User's Assigned Forms List
    - `frontend/src/app/(app)/forms/[id]/fill/page.tsx` — Form Filler
  - Each scaffold should import `FormPage` and `FormHeader` from `components/shared/form-shell.tsx` and render a placeholder title
  - Add API helper functions in `frontend/src/lib/api/forms.ts`:
    - `fetchForms(token, filters?)` → `api.get<Form[]>("/forms", token)`
    - `fetchForm(id, token)` → `api.get<Form>("/forms/" + id, token)`
    - `createForm(data, token)` → `api.post<{id: string}>("/forms", data, token)`
    - `updateForm(id, data, token)` → `api.put("/forms/" + id, data, token)`
    - `deleteForm(id, token)` → `api.delete("/forms/" + id, token)`
    - `publishForm(id, token)` → `api.put("/forms/" + id + "/publish", {}, token)`
    - `closeForm(id, token)` → `api.put("/forms/" + id + "/close", {}, token)`
    - `submitResponse(formId, answers, token)` → `api.post("/forms/" + formId + "/responses", { answers }, token)`
    - `fetchFormResponses(formId, token)` → `api.get<FormResponse[]>("/forms/" + formId + "/responses", token)`
    - `fetchFormAnalytics(formId, token)` → `api.get<FormAnalyticsSummary>("/forms/" + formId + "/analytics", token)`
    - `fetchMyForms(token)` → `api.get<Form[]>("/forms/assigned", token)`

  **Must NOT do**:
  - Do NOT implement actual page content — just scaffolds with placeholder headings
  - Do NOT add routes for templates, export, or any excluded features
  - Do NOT modify existing navigation items

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Scaffold files with minimal content, navigation config, API helpers
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 8)
  - **Blocks**: Tasks 12, 14
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `frontend/src/lib/app-navigation.ts` — Navigation definition pattern, icon string mapping
  - `frontend/src/components/shared/form-shell.tsx` — `FormPage`, `FormHeader` reusable components
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — Page scaffold pattern with "use client", imports, and layout
  - `frontend/src/lib/api.ts` — API client `api.get/post/put/delete` signatures

  **WHY Each Reference Matters**:
  - `app-navigation.ts` shows exact structure for adding new nav items — must match the icon string mapping pattern used by `iconMap` in sidebar
  - `form-shell.tsx` provides `FormPage` and `FormHeader` that ALL new pages should use for layout consistency
  - `api.ts` shows the generic signature `api.get<T>(path, token)` that all API helpers must follow

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All pages render without errors
    Tool: Bash
    Preconditions: Dependencies installed (Task 2)
    Steps:
      1. cd frontend && npm run build
      2. Verify no build errors for any new page files
      3. grep -r "Form Builder" src/lib/app-navigation.ts — nav entry exists
      4. grep -r "My Forms" src/lib/app-navigation.ts — nav entry exists
    Expected Result: All 7 pages compile, navigation entries present
    Failure Indicators: Build errors, missing pages, navigation not updated
    Evidence: .sisyphus/evidence/task-7-scaffolds-build.txt

  Scenario: API helper functions are type-safe
    Tool: Bash
    Preconditions: Types from Task 3 exist
    Steps:
      1. cd frontend && npm run build — TypeScript verifies all api helper return types match Form types
    Expected Result: Zero type errors in api/forms.ts
    Failure Indicators: Type mismatch between API helpers and form types
    Evidence: .sisyphus/evidence/task-7-api-types.txt
  ```

  **Evidence to Capture:**
  - [ ] task-7-scaffolds-build.txt
  - [ ] task-7-api-types.txt

  **Commit**: YES
  - Message: `feat(frontend): add form navigation and page scaffolds`
  - Files: `frontend/src/lib/app-navigation.ts`, `frontend/src/lib/api/forms.ts`, `frontend/src/app/(app)/admin/forms/**`, `frontend/src/app/(app)/forms/**`
  - Pre-commit: `cd frontend && npm run build`

---

- [x] 8. Frontend Field Renderer Components

  **What to do**:
  - Create `frontend/src/components/form-builder/field-renderers/` directory with individual renderer components:
    - `text-field.tsx` — Renders `<Input>` with label, placeholder, required indicator
    - `textarea-field.tsx` — Renders `<Textarea>` with label, placeholder, required indicator
    - `radio-field.tsx` — Renders `<RadioGroup>` with options using shadcn RadioGroup component
    - `checkbox-field.tsx` — Renders multiple `<Checkbox>` items with labels for each option
    - `dropdown-field.tsx` — Renders `<Select>` with `<SelectItem>` options using shadcn Select component
  - Create `frontend/src/components/form-builder/field-renderers/index.tsx` — Registry component that maps `FormFieldType` → renderer component:
    ```tsx
    const FIELD_RENDERER_MAP: Record<FormFieldType, React.ComponentType<FieldRendererProps>> = {
      text: TextField,
      textarea: TextareaField,
      radio: RadioField,
      checkbox: CheckboxField,
      dropdown: DropdownField,
    };
    export function FieldRenderer({ field, value, onChange, error, disabled }: FieldRendererProps) { ... }
    ```
  - Define `FieldRendererProps` interface: `{ field: FormField; value: unknown; onChange: (value: unknown) => void; error?: string; disabled?: boolean }`
  - Each renderer must:
    - Display the field label with required asterisk (*) if `isRequired`
    - Display placeholder text if provided
    - Show error message below field if `error` prop is set
    - Support `disabled` prop for read-only/preview mode
    - Use consistent spacing and styling matching existing shadcn form patterns

  **Must NOT do**:
  - Do NOT add renderers for field types beyond the 5 specified
  - Do NOT add inline validation logic — validation is handled by the form filler (Task 15)
  - Do NOT add conditional logic evaluation — that's Task 15
  - Do NOT hardcode styles — use TailwindCSS utility classes matching existing components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI components with consistent styling, shadcn/ui composition
  - **Skills**: [`shadcn`, `react-expert`]
    - `shadcn`: Correct usage of RadioGroup, Checkbox, Select components
    - `react-expert`: React component composition, TypeScript generics for props

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 7)
  - **Blocks**: Tasks 12, 15
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — Controller + shadcn component patterns (Select, Input, Textarea usage with error states)
  - `frontend/src/components/ui/radio-group.tsx` — shadcn RadioGroup component API (installed in Task 2)
  - `frontend/src/components/ui/checkbox.tsx` — shadcn Checkbox component API (installed in Task 2)
  - `frontend/src/components/ui/select.tsx` — Existing Select component with SelectTrigger, SelectValue, SelectContent, SelectItem pattern
  - `frontend/src/components/ui/input.tsx` — Input component with className prop
  - `frontend/src/components/ui/textarea.tsx` — Textarea component

  **API/Type References**:
  - `frontend/src/types/form.ts` (from Task 3) — `FormField`, `FormFieldType`, `FieldOption` types
  - `frontend/src/lib/form-field-registry.ts` (from Task 3) — Field type config for labels and icons

  **WHY Each Reference Matters**:
  - `risk/register/new/page.tsx` shows the exact pattern for how Select, Input, and Textarea are composed with labels and error messages in this codebase — renderers must match this visual style exactly
  - shadcn component files show the actual API surface (props, events, variants) for each UI component
  - `form.ts` types define the `FormField` shape that renderers receive as props

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All renderers compile and export correctly
    Tool: Bash
    Preconditions: Tasks 2 and 3 complete
    Steps:
      1. cd frontend && npm run build
      2. Verify FieldRenderer component exported from index.tsx
      3. Verify all 5 individual renderer files exist
    Expected Result: Build succeeds, all components compile
    Failure Indicators: Build errors, missing exports, type mismatches
    Evidence: .sisyphus/evidence/task-8-renderers-build.txt

  Scenario: Registry covers all field types
    Tool: Bash
    Preconditions: Components created
    Steps:
      1. grep "text:" frontend/src/components/form-builder/field-renderers/index.tsx
      2. grep "textarea:" frontend/src/components/form-builder/field-renderers/index.tsx
      3. grep "radio:" frontend/src/components/form-builder/field-renderers/index.tsx
      4. grep "checkbox:" frontend/src/components/form-builder/field-renderers/index.tsx
      5. grep "dropdown:" frontend/src/components/form-builder/field-renderers/index.tsx
    Expected Result: All 5 types mapped in FIELD_RENDERER_MAP
    Failure Indicators: Missing type mapping, extra types
    Evidence: .sisyphus/evidence/task-8-registry-check.txt
  ```

  **Evidence to Capture:**
  - [ ] task-8-renderers-build.txt
  - [ ] task-8-registry-check.txt

  **Commit**: YES
  - Message: `feat(frontend): implement field renderer components`
  - Files: `frontend/src/components/form-builder/field-renderers/*.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

- [x] 9. Backend Usecases — Form CRUD + Lifecycle

  **What to do**:
  - Create `backend/internal/usecase/form/` directory with separate files per operation:
    - `create.go` — `CreateFormUseCase` with `CreateFormInput` (title, description, sections with fields, targetAudience, organizationIDs) and `CreateFormOutput` (id, status, createdAt). Validates input, generates field_key for each field (slugified label or auto-generated), calls repo.Create.
    - `get.go` — `GetFormUseCase`. Fetches full form with sections and fields. For non-admin users: check if form is published AND (targetAudience="all" OR user's org is assigned).
    - `list.go` — `ListFormsUseCase`. For admin: list all forms with optional status filter. For non-admin: list only assigned published forms via `GetFormIDsForOrganization`.
    - `update.go` — `UpdateFormUseCase`. Check form is in "draft" status AND has no responses (via HasResponses). If locked, return `ErrFormLocked`. Validate sections/fields same as create.
    - `delete.go` — `DeleteFormUseCase`. Only allow deleting forms in "draft" status. Published/closed forms cannot be deleted.
    - `publish.go` — `PublishFormUseCase`. Check status is "draft". Run `ValidateForPublish()` on entity. If target_audience="specific", verify at least 1 assignment exists. Transition to "published".
    - `close.go` — `CloseFormUseCase`. Check status is "published". Transition to "closed".
  - Each usecase follows the pattern: struct with repo dependencies, `NewXxxUseCase()` constructor, `Execute(ctx, input) (*output, error)` method
  - Inject `FormRepository`, `FormAssignmentRepository`, `UserRepository` (for creator validation), `OrganizationRepository` (for org validation in assignments)

  **Must NOT do**:
  - Do NOT add "reopen" usecase — closed forms stay closed
  - Do NOT add template/duplicate usecase
  - Do NOT add bulk operations
  - Do NOT add response-related usecases here — that's Task 10

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple usecase files with business logic, validation, and authorization checks
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture usecase patterns, dependency injection

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11, 12, 13)
  - **Blocks**: Task 11
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/create.go` — Canonical usecase pattern: Input/Output structs, NewXxxUseCase constructor, Execute method with validation → entity building → repo call → return output
  - `backend/internal/usecase/risk/list.go` — List usecase with filters and role-based filtering
  - `backend/internal/usecase/approval/submit.go` — Usecase with status transition validation pattern

  **API/Type References**:
  - `backend/internal/domain/entity/form.go` (Task 4) — Entity types and validation methods
  - `backend/internal/domain/repository/form.go` (Task 4) — Repository interfaces to inject
  - `backend/internal/domain/errors/form_errors.go` (Task 4) — Error types to return

  **WHY Each Reference Matters**:
  - `risk/create.go` shows the exact Input/Output struct convention, how to validate, build entity, call repo, and return — every form usecase follows this shape
  - `approval/submit.go` shows status transition validation (draft→published is similar to risk approval flow)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All usecases compile
    Tool: Bash
    Steps:
      1. cd backend && go build ./internal/usecase/form/...
    Expected Result: Zero compilation errors, all 7 usecase files compile
    Evidence: .sisyphus/evidence/task-9-build.txt

  Scenario: Publish validates form completeness
    Tool: Bash
    Steps:
      1. Create form with empty section (no fields) via CreateFormUseCase
      2. Call PublishFormUseCase → Expected: error (empty section)
      3. Add a radio field with only 1 option, try publish → Expected: error (need ≥2 options)
      4. Fix form (add valid fields), publish → Expected: success, status = "published"
    Expected Result: Publish blocks invalid forms, succeeds for valid ones
    Evidence: .sisyphus/evidence/task-9-publish-validation.txt

  Scenario: Update blocked when form has responses
    Tool: Bash
    Steps:
      1. Create form, publish it
      2. Submit a response to it (via direct DB insert or Task 10)
      3. Try to update form → Expected: ErrFormLocked
    Expected Result: Update returns ErrFormLocked
    Evidence: .sisyphus/evidence/task-9-form-locking.txt
  ```

  **Evidence to Capture:**
  - [ ] task-9-build.txt
  - [ ] task-9-publish-validation.txt
  - [ ] task-9-form-locking.txt

  **Commit**: YES
  - Message: `feat(backend): add form CRUD and lifecycle usecases`
  - Files: `backend/internal/usecase/form/*.go`
  - Pre-commit: `cd backend && go build ./...`

---

- [x] 10. Backend Usecases — Response Submission + Analytics

  **What to do**:
  - Create additional files in `backend/internal/usecase/form/`:
    - `submit_response.go` — `SubmitResponseUseCase`:
      - Validate form exists and status is "published"
      - Check user's organization is assigned (if target_audience="specific") or form is "all"
      - Check user hasn't already submitted (GetByFormAndRespondent)
      - Validate required fields are present in answers JSONB. **CRITICAL**: Skip validation for fields hidden by conditional logic — evaluate conditions server-side to determine which fields are visible given the submitted answers.
      - Validate field values match expected types: text/textarea → string, radio/dropdown → string matching one of the options, checkbox → array of strings each matching an option
      - Store response via repo.Create
    - `list_responses.go` — `ListResponsesUseCase`: Get all responses for a form. Admin only.
    - `analytics.go` — `FormAnalyticsUseCase`:
      - Fetch form definition (to get field metadata: type, label, options)
      - Call GetFieldAggregations for summary data per field
      - Call GetFieldTrends for time-series data per field (weekly buckets)
      - Assemble `FormAnalyticsSummary` with total_responses + per-field analytics
      - For text/textarea fields: return filled count and empty count only
      - For radio/dropdown: return count per option
      - For checkbox: return count per option (individual selection count)

  **Must NOT do**:
  - Do NOT add response editing or deletion usecases
  - Do NOT add export (CSV/Excel) functionality
  - Do NOT add AI analysis integration
  - Do NOT add pagination for responses

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex validation logic (conditional field visibility evaluation server-side), JSONB value type checking, analytics assembly
  - **Skills**: [`backend-go`]
    - `backend-go`: Clean architecture patterns, Go type assertion for dynamic JSONB validation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11, 12, 13)
  - **Blocks**: Task 11
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `backend/internal/usecase/risk/create.go` — Input validation and entity creation pattern
  - `backend/internal/domain/entity/form.go` (Task 4) — `IsAcceptingResponses()` method for status check

  **API/Type References**:
  - `backend/internal/domain/repository/form.go` (Task 4) — `FormResponseRepository` interface
  - `backend/internal/repository/postgres/form_response.go` (Task 6) — Analytics query methods

  **WHY Each Reference Matters**:
  - `risk/create.go` shows how to validate input, check related entities exist, and return structured errors
  - The entity `IsAcceptingResponses()` is the single source of truth for whether form accepts submissions — usecase must call it

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Response submission validates correctly
    Tool: Bash
    Steps:
      1. Submit response to draft form → Expected: ErrFormNotPublished
      2. Submit response to closed form → Expected: ErrFormClosed
      3. Submit response missing required field → Expected: validation error
      4. Submit response with invalid radio value (not in options) → Expected: validation error
      5. Submit valid response → Expected: success, response stored
      6. Submit again with same user → Expected: ErrDuplicateResponse
    Expected Result: All validation scenarios return expected errors
    Evidence: .sisyphus/evidence/task-10-submission-validation.txt

  Scenario: Analytics returns correct aggregations
    Tool: Bash
    Steps:
      1. Create published form with: 1 radio field (red/blue/green), 1 checkbox field (A/B/C), 1 text field
      2. Submit 5 responses with varied answers
      3. Call analytics usecase
      4. Verify: total_responses=5, radio counts match, checkbox counts match (individual), text filled/empty counts match
    Expected Result: All aggregation numbers correct
    Evidence: .sisyphus/evidence/task-10-analytics-accuracy.txt

  Scenario: Conditional field validation skips hidden fields
    Tool: Bash
    Steps:
      1. Create form with field A (radio: yes/no) and field B (text, required, condition: A=yes)
      2. Submit response with A="no", B=undefined → Expected: success (B is hidden, not required)
      3. Submit response with A="yes", B=undefined → Expected: error (B is visible and required)
      4. Submit response with A="yes", B="something" → Expected: success
    Expected Result: Required validation respects conditional visibility
    Evidence: .sisyphus/evidence/task-10-conditional-validation.txt
  ```

  **Evidence to Capture:**
  - [ ] task-10-submission-validation.txt
  - [ ] task-10-analytics-accuracy.txt
  - [ ] task-10-conditional-validation.txt

  **Commit**: YES
  - Message: `feat(backend): add response submission and analytics usecases`
  - Files: `backend/internal/usecase/form/submit_response.go`, `backend/internal/usecase/form/list_responses.go`, `backend/internal/usecase/form/analytics.go`
  - Pre-commit: `cd backend && go build ./...`

---

- [x] 11. HTTP Handlers + Route Registration

  **What to do**:
  - Create `backend/internal/handler/http/form.go`:
    - `FormHandler` struct with all form usecases injected
    - `NewFormHandler(...)` constructor
    - Handler methods:
      - `CreateForm(c *fiber.Ctx) error` — Parse body, get userID from c.Locals, call CreateFormUseCase, return 201 + {data: {id, status}}
      - `GetForm(c *fiber.Ctx) error` — Parse :id param, get userID + role from Locals, call GetFormUseCase, return 200
      - `ListForms(c *fiber.Ctx) error` — Parse query params (status filter), call ListFormsUseCase, return 200
      - `UpdateForm(c *fiber.Ctx) error` — Parse :id + body, call UpdateFormUseCase, return 200
      - `DeleteForm(c *fiber.Ctx) error` — Parse :id, call DeleteFormUseCase, return 204
      - `PublishForm(c *fiber.Ctx) error` — Parse :id, call PublishFormUseCase, return 200 + {data: {status: "published"}}
      - `CloseForm(c *fiber.Ctx) error` — Parse :id, call CloseFormUseCase, return 200
      - `SubmitResponse(c *fiber.Ctx) error` — Parse :id + body (answers JSONB), get userID, call SubmitResponseUseCase, return 201
      - `ListResponses(c *fiber.Ctx) error` — Parse :id, call ListResponsesUseCase, return 200
      - `GetAnalytics(c *fiber.Ctx) error` — Parse :id, call FormAnalyticsUseCase, return 200
      - `ListAssignedForms(c *fiber.Ctx) error` — Get orgID from Locals, call ListFormsUseCase with org filter, return 200
    - Error mapping: Use existing `handleError()` function. Add mappings for new form domain errors → HTTP status codes:
      - ErrFormNotFound → 404
      - ErrFormLocked → 409 Conflict
      - ErrFormNotPublished → 409
      - ErrFormClosed → 409
      - ErrDuplicateResponse → 409
      - ErrFormNotAssigned → 403
      - Validation errors → 422
  - Register routes in `backend/cmd/server/main.go`:
    - Wire up all repositories → usecases → handler (dependency injection)
    - Admin routes (with `RoleGuard("superadmin")`):
      - `POST /api/v1/forms` — CreateForm
      - `GET /api/v1/forms` — ListForms (admin sees all)
      - `GET /api/v1/forms/:id` — GetForm
      - `PUT /api/v1/forms/:id` — UpdateForm
      - `DELETE /api/v1/forms/:id` — DeleteForm
      - `PUT /api/v1/forms/:id/publish` — PublishForm
      - `PUT /api/v1/forms/:id/close` — CloseForm
      - `GET /api/v1/forms/:id/responses` — ListResponses
      - `GET /api/v1/forms/:id/analytics` — GetAnalytics
    - User routes (authenticated, no role guard):
      - `GET /api/v1/forms/assigned` — ListAssignedForms
      - `GET /api/v1/forms/:id` — GetForm (usecase handles access control)
      - `POST /api/v1/forms/:id/responses` — SubmitResponse

  **Must NOT do**:
  - Do NOT add endpoints for template, export, or any excluded features
  - Do NOT add rate limiting (out of scope for v1)
  - Do NOT add response editing/deletion endpoints

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple handler methods, route registration, dependency wiring, error mapping
  - **Skills**: [`backend-go`]
    - `backend-go`: Fiber handler patterns, route registration, middleware usage

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (starts after Tasks 9 and 10 complete)
  - **Blocks**: Tasks 14, 15, 16
  - **Blocked By**: Tasks 9, 10

  **References**:

  **Pattern References**:
  - `backend/internal/handler/http/risk.go` — Handler struct, constructor, method signatures, BodyParser, c.Locals("userId"), c.Params("id"), uuid.Parse, sendProblemDetails, handleError
  - `backend/internal/handler/http/response.go` — `sendProblemDetails()` and `handleError()` functions for RFC 7807 error responses
  - `backend/cmd/server/main.go:327-371` — Dependency injection and route registration pattern: repo → usecase → handler → app.Method(path, handler.Method)

  **API/Type References**:
  - All usecase Input/Output types from Tasks 9 and 10

  **WHY Each Reference Matters**:
  - `risk.go` handler is the template to copy: every method follows parse → validate → execute usecase → return JSON pattern. Error handling uses the same `handleError()` function.
  - `main.go` route registration shows the EXACT pattern: where to add the DI wiring and which middleware to apply

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CRUD endpoints work end-to-end
    Tool: Bash (curl)
    Preconditions: Backend running with migration applied
    Steps:
      1. POST /api/v1/forms with admin token, body: {"title":"Test Form","description":"A test","sections":[{"title":"Section 1","fields":[{"fieldType":"text","label":"Name","isRequired":true}]}]} → Expected: 201 + id returned
      2. GET /api/v1/forms/:id with admin token → Expected: 200 + full form with sections/fields
      3. PUT /api/v1/forms/:id with updated title → Expected: 200
      4. DELETE /api/v1/forms/:id → Expected: 204
    Expected Result: All CRUD operations succeed with correct status codes
    Evidence: .sisyphus/evidence/task-11-crud-endpoints.txt

  Scenario: RBAC enforcement
    Tool: Bash (curl)
    Preconditions: Admin token and unit token available
    Steps:
      1. POST /api/v1/forms with unit token → Expected: 403
      2. PUT /api/v1/forms/:id/publish with unit token → Expected: 403
      3. GET /api/v1/forms/assigned with unit token → Expected: 200
      4. POST /api/v1/forms/:id/responses with unit token → Expected: 201 (if form is published and assigned)
    Expected Result: Admin-only endpoints reject non-admin, user endpoints accessible to all authenticated users
    Evidence: .sisyphus/evidence/task-11-rbac.txt

  Scenario: Lifecycle transitions and locking
    Tool: Bash (curl)
    Steps:
      1. Create form → status: draft
      2. PUT /api/v1/forms/:id/publish → status: published
      3. PUT /api/v1/forms/:id/publish again → Expected: 409 (already published)
      4. POST response to published form → 201
      5. PUT /api/v1/forms/:id (try to update) → Expected: 409 (locked, has responses)
      6. PUT /api/v1/forms/:id/close → status: closed
      7. POST response to closed form → Expected: 409 (form closed)
    Expected Result: All lifecycle transitions enforced correctly
    Evidence: .sisyphus/evidence/task-11-lifecycle.txt
  ```

  **Evidence to Capture:**
  - [ ] task-11-crud-endpoints.txt
  - [ ] task-11-rbac.txt
  - [ ] task-11-lifecycle.txt

  **Commit**: YES
  - Message: `feat(backend): add form HTTP handlers and register routes`
  - Files: `backend/internal/handler/http/form.go`, `backend/cmd/server/main.go`
  - Pre-commit: `cd backend && go build ./...`

---

- [x] 12. Form Builder UI — Sections + Fields + Config Panel

  **What to do**:
  - Implement `frontend/src/app/(app)/admin/forms/new/page.tsx` — Full form builder page:
    - **Top bar**: Form title input, description input, target audience selector (all/specific with org multi-select), Save Draft button
    - **Main content**: List of sections, each rendered as a Card/Accordion:
      - Section header: title input, description input, delete section button
      - Section body: List of fields within the section
      - Each field: type icon + label + required badge + edit/delete buttons
      - "Add Field" button at bottom of each section (opens field type selector)
    - **Add Section** button at bottom of the page
    - **Field Config Panel**: When a field is selected for editing, show a side panel or dialog:
      - Label input
      - Placeholder input (for text/textarea/dropdown)
      - Required toggle (Switch component)
      - Options editor (for radio/checkbox/dropdown): list of value/label pairs with add/remove buttons, minimum 2 enforced
      - Conditional logic config: Enable toggle → "Show when" [field selector dropdown] equals [value input]. Only show non-checkbox fields in the source field selector.
    - **State management**: Use `useReducer` with actions: ADD_SECTION, REMOVE_SECTION, UPDATE_SECTION, ADD_FIELD, REMOVE_FIELD, UPDATE_FIELD, REORDER_SECTIONS, REORDER_FIELDS
    - **Save flow**: On "Save Draft" click, serialize state to `CreateFormDTO` / `UpdateFormDTO`, call API helper from Task 7, show toast on success/error
  - Implement `frontend/src/app/(app)/admin/forms/[id]/edit/page.tsx`:
    - Same UI as new page, but loads existing form data via `fetchForm(id, token)` on mount
    - If form has responses (check via API), show "locked" state — disable all editing, show info message
    - Populate reducer state from loaded form data

  **Must NOT do**:
  - Do NOT add drag-and-drop yet — that's Task 13. Use simple ordered list with manual position management for now.
  - Do NOT add undo/redo
  - Do NOT add auto-save or debounced save
  - Do NOT add preview mode
  - Do NOT add field types beyond the 5 specified
  - Do NOT use Zustand — use `useReducer` for all form builder state

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex interactive UI with state management, multiple sub-components, form composition
  - **Skills**: [`shadcn`, `react-expert`, `frontend-design`]
    - `shadcn`: Card, Accordion, Dialog, Input, Select, Switch, Button composition
    - `react-expert`: useReducer patterns, complex state management, component decomposition
    - `frontend-design`: Layout design for builder interface

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10, 11)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 7, 8

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — Complex form page with multiple sections, dynamic arrays (causes, mitigations), save/submit flow, toast notifications, error handling
  - `frontend/src/components/shared/form-shell.tsx` — FormPage and FormHeader for page layout
  - `frontend/src/app/(app)/incidents/new/page.tsx` — Another form page pattern with different field types

  **API/Type References**:
  - `frontend/src/types/form.ts` (Task 3) — All form types
  - `frontend/src/lib/api/forms.ts` (Task 7) — createForm, updateForm, fetchForm API helpers
  - `frontend/src/lib/form-field-registry.ts` (Task 3) — FIELD_TYPES and getFieldTypeConfig for type selector

  **External References**:
  - React useReducer docs — for complex state management pattern

  **WHY Each Reference Matters**:
  - `risk/register/new/page.tsx` is the closest existing UI pattern — it has dynamic arrays (add/remove causes), multi-step form, save as draft, and toast notifications. The form builder follows the same structure but with more complex nesting (form → sections → fields).
  - `form-shell.tsx` ensures visual consistency with other form pages in the app

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create a form with sections and fields
    Tool: Playwright
    Preconditions: Frontend and backend running, logged in as Super Admin
    Steps:
      1. Navigate to /admin/forms/new
      2. Enter title "Quarterly Report Form" in title input
      3. Click "Add Section" → section 1 appears
      4. Enter section title "General Info"
      5. Click "Add Field" in section 1 → field type selector appears
      6. Select "Text" → text field added to section 1
      7. Click edit on the field → config panel opens
      8. Enter label "Full Name", toggle required ON
      9. Click "Add Field" again → select "Radio"
      10. Configure radio with label "Status", add options "Active" and "Inactive"
      11. Click "Save Draft" button
      12. Verify toast shows success message
      13. Verify URL updates with form ID parameter
    Expected Result: Form saved successfully with 1 section containing 2 fields
    Failure Indicators: Save fails, fields not persisting, config panel not working
    Evidence: .sisyphus/evidence/task-12-create-form.png

  Scenario: Edit existing form loads data correctly
    Tool: Playwright
    Preconditions: A draft form exists
    Steps:
      1. Navigate to /admin/forms/[id]/edit
      2. Verify title field populated with form title
      3. Verify sections render with their titles
      4. Verify fields render within sections with correct types and labels
      5. Click edit on a field → verify config panel shows saved values
    Expected Result: All form data loaded and displayed correctly
    Evidence: .sisyphus/evidence/task-12-edit-form.png

  Scenario: Conditional logic configuration
    Tool: Playwright
    Steps:
      1. Add a radio field "Do you agree?" with options "Yes", "No"
      2. Add a text field "Please explain"
      3. Edit "Please explain" → enable conditional logic
      4. Select source field "Do you agree?", set value "Yes"
      5. Save form
      6. Verify conditional config persisted after reload
    Expected Result: Conditional logic saved and loaded correctly
    Evidence: .sisyphus/evidence/task-12-conditional-config.png
  ```

  **Evidence to Capture:**
  - [ ] task-12-create-form.png
  - [ ] task-12-edit-form.png
  - [ ] task-12-conditional-config.png

  **Commit**: YES
  - Message: `feat(frontend): implement form builder with sections and fields`
  - Files: `frontend/src/app/(app)/admin/forms/new/page.tsx`, `frontend/src/app/(app)/admin/forms/[id]/edit/page.tsx`, `frontend/src/components/form-builder/*.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

 - [x] 13. Form Builder UI — Drag-and-Drop Reorder

  **What to do**:
  - Add drag-and-drop functionality to the form builder (Task 12) using `@dnd-kit/react`:
    - **Section reorder**: Sections can be dragged to reorder their position. Use `DragDropProvider` wrapper around sections list, `useSortable` hook for each section.
    - **Field reorder within section**: Fields within each section can be reordered via drag. Each section is a separate sortable group. Fields CANNOT be dragged between sections.
    - Implementation:
      - Create `frontend/src/components/form-builder/sortable-section.tsx` — Wraps section Card with `useSortable`, adds drag handle icon
      - Create `frontend/src/components/form-builder/sortable-field.tsx` — Wraps field row with `useSortable`, adds drag handle icon (GripVertical from Lucide)
      - Update form builder page to wrap sections list and fields lists with `DragDropProvider`
      - On drag end: update position values in reducer state, persist new order on next save
    - Use `@dnd-kit/react` NEW API:
      - `DragDropProvider` (NOT legacy `DndContext`)
      - `useSortable` hook with `group` prop to separate section vs field sorting
      - Proper accessibility: keyboard support comes built-in with @dnd-kit

  **Must NOT do**:
  - Do NOT allow cross-section field dragging
  - Do NOT use legacy `@dnd-kit/core` or `@dnd-kit/sortable` packages
  - Do NOT add undo for drag operations
  - Do NOT add animation beyond what @dnd-kit provides by default

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Drag-and-drop UI integration requiring correct library API usage
  - **Skills**: [`react-expert`]
    - `react-expert`: React 19 hooks, state management integration with drag events

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 12)
  - **Blocks**: Task 17
  - **Blocked By**: Task 12

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/admin/forms/new/page.tsx` (Task 12) — Form builder page to integrate DnD into

  **External References**:
  - @dnd-kit/react docs: https://dndkit.com/react/guides/sortable-state-management — New API with DragDropProvider, useSortable, sortable groups
  - @dnd-kit React 19 compatibility: Uses `DragDropProvider` wrapper, NOT legacy `DndContext`

  **WHY Each Reference Matters**:
  - @dnd-kit docs are CRITICAL — the API changed significantly from v1 to the React-specific package. Using wrong API will cause runtime errors with React 19.
  - Task 12 builder page is the integration target — DnD wraps existing section/field components

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Sections can be reordered via drag
    Tool: Playwright
    Preconditions: Form with 3 sections exists in builder
    Steps:
      1. Navigate to form builder page with 3 sections
      2. Identify drag handle on Section 2
      3. Drag Section 2 above Section 1
      4. Verify visual order changes: Section 2 is now first
      5. Click "Save Draft"
      6. Reload page → verify order persisted (Section 2 still first)
    Expected Result: Section order updates visually and persists after save
    Failure Indicators: Drag doesn't work, order doesn't persist, visual glitch
    Evidence: .sisyphus/evidence/task-13-section-reorder.png

  Scenario: Fields reorder within section only
    Tool: Playwright
    Steps:
      1. Section 1 has: Field A, Field B, Field C
      2. Drag Field C above Field A within Section 1
      3. Verify new order: Field C, Field A, Field B
      4. Verify Section 2's fields are unaffected
      5. Save and reload → verify order persisted
    Expected Result: Fields reorder within section, other sections unaffected
    Failure Indicators: Cross-section drag possible, wrong section affected
    Evidence: .sisyphus/evidence/task-13-field-reorder.png

  Scenario: Build succeeds after DnD integration
    Tool: Bash
    Steps:
      1. cd frontend && npm run build
    Expected Result: Zero build errors
    Evidence: .sisyphus/evidence/task-13-build.txt
  ```

  **Evidence to Capture:**
  - [ ] task-13-section-reorder.png
  - [ ] task-13-field-reorder.png
  - [ ] task-13-build.txt

  **Commit**: YES
  - Message: `feat(frontend): add drag-and-drop reorder to form builder`
  - Files: `frontend/src/components/form-builder/sortable-section.tsx`, `frontend/src/components/form-builder/sortable-field.tsx`, `frontend/src/app/(app)/admin/forms/new/page.tsx` (updated), `frontend/src/app/(app)/admin/forms/[id]/edit/page.tsx` (updated)
  - Pre-commit: `cd frontend && npm run build`

---

 - [x] 14. Form List + Lifecycle Management Pages

  **What to do**:
  - Implement `frontend/src/app/(app)/admin/forms/page.tsx` — Admin Form List:
    - Fetch all forms via `fetchForms(token)` API helper
    - Display as a Table (shadcn Table component) with columns: Title, Status (badge with color: draft=gray, published=green, closed=red), Target, Responses count, Created date, Actions
    - Actions column: View/Edit (link to edit page), Analytics (link to analytics page), Publish button (if draft), Close button (if published), Delete button (if draft, with confirmation Dialog)
    - Add "Create New Form" button at top linking to `/admin/forms/new`
    - Status filter dropdown at top (All, Draft, Published, Closed)
  - Implement `frontend/src/app/(app)/forms/page.tsx` — User's Assigned Forms:
    - Fetch assigned forms via `fetchMyForms(token)` API helper
    - Display as Cards grid showing: form title, description snippet, status badge, "Fill Form" button (links to `/forms/[id]/fill`)
    - If user already submitted response for a form, show "Submitted" badge instead of fill button
    - Only show published forms (API already filters)

  **Must NOT do**:
  - Do NOT add form template functionality
  - Do NOT add bulk actions (bulk delete, bulk publish)
  - Do NOT add pagination — show all forms for v1
  - Do NOT add search/filter beyond status filter on admin page

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Table and Card grid UI composition with status badges and action buttons
  - **Skills**: [`shadcn`, `react-expert`]
    - `shadcn`: Table, Badge, Button, Dialog, Card component composition
    - `react-expert`: Data fetching patterns, state management

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 15, 16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 11, 7

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/page.tsx` — Table list page pattern with status badges, action buttons, filters (if exists — otherwise look for any list page in the app)
  - `frontend/src/components/ui/table.tsx` — shadcn Table component
  - `frontend/src/components/ui/badge.tsx` — Badge for status display

  **API/Type References**:
  - `frontend/src/lib/api/forms.ts` (Task 7) — fetchForms, fetchMyForms, publishForm, closeForm, deleteForm
  - `frontend/src/types/form.ts` (Task 3) — Form, FormStatus types

  **WHY Each Reference Matters**:
  - Existing list pages show the convention for data fetching (useEffect + useState), table rendering, and action button patterns in this codebase
  - API helpers ensure correct endpoint usage and type safety

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin form list displays all forms
    Tool: Playwright
    Preconditions: 3 forms exist (1 draft, 1 published, 1 closed), logged in as Super Admin
    Steps:
      1. Navigate to /admin/forms
      2. Verify table shows 3 rows
      3. Verify draft form has gray "Draft" badge
      4. Verify published form has green "Published" badge
      5. Verify closed form has red "Closed" badge
      6. Click status filter → select "Published" → verify only 1 row shown
      7. Click "Create New Form" → verify navigation to /admin/forms/new
    Expected Result: All forms listed with correct status badges, filter works
    Evidence: .sisyphus/evidence/task-14-admin-list.png

  Scenario: Lifecycle actions work from list page
    Tool: Playwright
    Steps:
      1. Find draft form → click "Publish" button → confirm dialog → verify badge changes to "Published"
      2. Find published form → click "Close" button → confirm → verify badge changes to "Closed"
      3. Find draft form → click "Delete" → confirm → verify form removed from list
    Expected Result: All lifecycle actions succeed with immediate UI update
    Evidence: .sisyphus/evidence/task-14-lifecycle-actions.png

  Scenario: User sees only assigned forms
    Tool: Playwright
    Preconditions: Logged in as unit user, 2 forms published (1 assigned to user's org, 1 not)
    Steps:
      1. Navigate to /forms
      2. Verify only 1 form card displayed (the assigned one)
      3. Verify "Fill Form" button visible
    Expected Result: Only assigned published forms shown to user
    Evidence: .sisyphus/evidence/task-14-user-forms.png
  ```

  **Evidence to Capture:**
  - [ ] task-14-admin-list.png
  - [ ] task-14-lifecycle-actions.png
  - [ ] task-14-user-forms.png

  **Commit**: YES
  - Message: `feat(frontend): implement form list and lifecycle management`
  - Files: `frontend/src/app/(app)/admin/forms/page.tsx`, `frontend/src/app/(app)/forms/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

 - [x] 15. Form Filler UI with Conditional Logic

  **What to do**:
  - Implement `frontend/src/app/(app)/forms/[id]/fill/page.tsx` — Form Filler:
    - On mount: fetch form via `fetchForm(id, token)`. If form is not published or user not assigned, show error and redirect.
    - Check if user already submitted: fetch via API. If already submitted, show read-only view of their response.
    - Render form sections as Card components, each section showing its title and description
    - Render fields within sections using `FieldRenderer` from Task 8
    - **State management**: Use React Hook Form with Zod dynamic schema:
      - Build Zod schema dynamically from form field definitions:
        - Text/textarea required: `z.string().min(1, "Required")`
        - Text/textarea optional: `z.string().optional()`
        - Radio/dropdown required: `z.string().min(1, "Required")`
        - Checkbox required: `z.array(z.string()).min(1, "Select at least one")`
        - Checkbox optional: `z.array(z.string()).optional()`
      - Use `zodResolver(dynamicSchema)` with React Hook Form
    - **Conditional logic evaluation** (client-side):
      - Create `useConditionalVisibility(fields, formValues)` hook
      - Watch all form values via `useWatch()` from React Hook Form
      - For each field with conditionalLogic: check if `formValues[sourceFieldId] === conditionValue`
      - If condition NOT met: hide the field, exclude from validation
      - Use `useMemo` to avoid unnecessary recalculations
      - **CRITICAL**: When a field is hidden, clear its value from form state (so it's not submitted)
    - **Submit flow**:
      - Build answers object: `{ [fieldKey]: value }` where value is string for text/radio/dropdown, string[] for checkbox
      - Call `submitResponse(formId, answers, token)` API helper
      - On success: show toast, redirect to `/forms` (my forms list)
      - On duplicate (409): show error toast "You have already submitted this form"
    - **Read-only mode**: If user already submitted, render FieldRenderer with `disabled={true}` and populate with their saved answers

  **Must NOT do**:
  - Do NOT add auto-save for form responses
  - Do NOT add response editing — submitted is final
  - Do NOT add "beforeunload" browser warning (accept data loss for v1)
  - Do NOT add progress indicator or multi-step wizard
  - Do NOT add file upload capability

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Dynamic Zod schema generation, conditional logic evaluation with memoization, complex form state management
  - **Skills**: [`react-expert`, `shadcn`]
    - `react-expert`: Dynamic React Hook Form + Zod, useWatch, useMemo, conditional rendering
    - `shadcn`: Component composition for form layout

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 16)
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 8, 11

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/risk/register/new/page.tsx` — React Hook Form + Zod resolver pattern, Controller components, error display, submit handling with toast
  - `frontend/src/app/(app)/incidents/new/page.tsx` — Another form submission pattern
  - `frontend/src/components/form-builder/field-renderers/index.tsx` (Task 8) — FieldRenderer component to render each field

  **API/Type References**:
  - `frontend/src/lib/api/forms.ts` (Task 7) — fetchForm, submitResponse API helpers
  - `frontend/src/types/form.ts` (Task 3) — Form, FormField, ConditionalLogic types

  **External References**:
  - React Hook Form `useWatch` — For observing form values to evaluate conditional logic
  - Zod dynamic schema — Build schema from field definitions at runtime

  **WHY Each Reference Matters**:
  - `risk/register/new/page.tsx` shows the exact pattern for React Hook Form + Zod + Controller that this page must follow — same resolver pattern, same error display, same toast notification pattern
  - FieldRenderer from Task 8 handles the actual input rendering — the filler page just orchestrates form state and passes value/onChange to each renderer

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Fill and submit a form successfully
    Tool: Playwright
    Preconditions: Published form with 1 text (required) + 1 radio + 1 checkbox field, user assigned
    Steps:
      1. Navigate to /forms/[id]/fill
      2. Verify form title and sections render
      3. Leave required text field empty → click Submit → verify error message "Required" on field
      4. Fill in text field "John Doe"
      5. Select radio option "Active"
      6. Check checkbox options "A" and "B"
      7. Click Submit
      8. Verify success toast
      9. Verify redirect to /forms
    Expected Result: Form validates required fields, submits successfully, redirects
    Failure Indicators: Validation doesn't trigger, submit fails, wrong redirect
    Evidence: .sisyphus/evidence/task-15-fill-submit.png

  Scenario: Conditional logic hides and shows fields
    Tool: Playwright
    Preconditions: Form with radio "Agree?" (Yes/No), text "Reason" (required, conditional: Agree?=Yes)
    Steps:
      1. Navigate to fill page
      2. Verify "Reason" field is NOT visible (no selection yet)
      3. Select "No" on "Agree?" → verify "Reason" still hidden
      4. Select "Yes" on "Agree?" → verify "Reason" field appears
      5. Leave "Reason" empty → Submit → verify error on "Reason" (now visible and required)
      6. Fill "Reason" → Submit → verify success
    Expected Result: Field visibility toggles correctly based on condition
    Evidence: .sisyphus/evidence/task-15-conditional-logic.png

  Scenario: Duplicate submission blocked
    Tool: Playwright
    Preconditions: User already submitted a response for this form
    Steps:
      1. Navigate to /forms/[id]/fill
      2. Verify read-only mode: fields disabled, values populated from previous response
      3. Verify no Submit button visible (or disabled)
    Expected Result: Previously submitted form shows in read-only mode
    Evidence: .sisyphus/evidence/task-15-duplicate-blocked.png
  ```

  **Evidence to Capture:**
  - [ ] task-15-fill-submit.png
  - [ ] task-15-conditional-logic.png
  - [ ] task-15-duplicate-blocked.png

  **Commit**: YES
  - Message: `feat(frontend): implement form filler with conditional logic`
  - Files: `frontend/src/app/(app)/forms/[id]/fill/page.tsx`, `frontend/src/hooks/use-conditional-visibility.ts`
  - Pre-commit: `cd frontend && npm run build`

---

 - [x] 16. Form Analytics Dashboard with Charts

  **What to do**:
  - Implement `frontend/src/app/(app)/admin/forms/[id]/analytics/page.tsx`:
    - On mount: fetch form definition + analytics data via `fetchFormAnalytics(id, token)`
    - **Top section**: Summary cards showing:
      - Total responses count
      - Form status badge
      - Form title
    - **Per-field analytics sections**: For each field in the form, render appropriate chart:
      - **Radio/Dropdown fields**: Bar chart (horizontal) showing count per option. Also render a Pie chart showing percentage distribution.
      - **Checkbox fields**: Bar chart showing count per option (individual selection counts). Note: percentages are per-response, not per-total.
      - **Text/Textarea fields**: Simple stat card showing "X filled / Y total responses"
    - **Trend section**: For option-based fields (radio, dropdown, checkbox), render a Line chart:
      - X-axis: time periods (weekly)
      - Y-axis: count per option
      - Multiple lines, one per option value
      - Use Recharts `<LineChart>` with `<Line>` per option
    - **Chart library**: Use Recharts (already installed in the project):
      - `<BarChart>`, `<Bar>`, `<XAxis>`, `<YAxis>`, `<Tooltip>`, `<Legend>`
      - `<PieChart>`, `<Pie>`, `<Cell>` with color palette
      - `<LineChart>`, `<Line>` with date X-axis
    - **Layout**: Use a grid layout — 2 columns for charts on desktop, 1 column on mobile
    - Add "Back to Form List" link and "View Responses" link at top

  **Must NOT do**:
  - Do NOT add CSV/Excel export
  - Do NOT add AI analysis or insights
  - Do NOT add comparison across forms
  - Do NOT add custom date range filter for trends (use all-time data with weekly buckets)
  - Do NOT add real-time updates or polling

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Chart rendering with Recharts, responsive grid layout, data visualization
  - **Skills**: [`react-expert`, `shadcn`]
    - `react-expert`: Recharts composition, data transformation for chart formats
    - `shadcn`: Card, Badge components for layout

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 14, 15)
  - **Blocks**: Task 17
  - **Blocked By**: Task 11

  **References**:

  **Pattern References**:
  - `frontend/src/app/(app)/dashboard/page.tsx` — If dashboard exists with Recharts usage, follow same chart patterns
  - Look for existing Recharts usage: `grep -r "recharts" frontend/src/` to find chart component patterns already in the codebase

  **API/Type References**:
  - `frontend/src/lib/api/forms.ts` (Task 7) — fetchFormAnalytics helper
  - `frontend/src/types/form.ts` (Task 3) — FormAnalyticsSummary, FormFieldAnalytics, TrendPoint types

  **External References**:
  - Recharts docs: https://recharts.org — BarChart, PieChart, LineChart examples
  - Recharts already in project package.json — no installation needed

  **WHY Each Reference Matters**:
  - Existing dashboard pages show how Recharts is used in this project — import patterns, responsive container usage, color palette conventions
  - The analytics types from Task 3 define the exact data shape the charts receive — no transformation should be needed if types match API response

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Analytics renders charts for all field types
    Tool: Playwright
    Preconditions: Published form with radio, checkbox, text fields. 10+ responses submitted.
    Steps:
      1. Navigate to /admin/forms/[id]/analytics
      2. Verify total responses count shows correct number
      3. Verify radio field has Bar chart with correct option counts
      4. Verify radio field has Pie chart with percentage labels
      5. Verify checkbox field has Bar chart with individual option counts
      6. Verify text field shows "X filled / Y total" stat
      7. Verify at least one Line chart exists showing trend over time
    Expected Result: All charts render with correct data, no empty/broken charts
    Failure Indicators: Charts don't render, wrong numbers, missing chart types
    Evidence: .sisyphus/evidence/task-16-analytics-charts.png

  Scenario: Analytics works for form with no responses
    Tool: Playwright
    Preconditions: Published form with 0 responses
    Steps:
      1. Navigate to /admin/forms/[id]/analytics
      2. Verify "Total Responses: 0" displayed
      3. Verify empty state message or zero-value charts (no errors/crashes)
    Expected Result: Page renders gracefully with zero data — no runtime errors
    Failure Indicators: Page crashes, undefined errors, broken chart
    Evidence: .sisyphus/evidence/task-16-empty-analytics.png
  ```

  **Evidence to Capture:**
  - [ ] task-16-analytics-charts.png
  - [ ] task-16-empty-analytics.png

  **Commit**: YES
  - Message: `feat(frontend): implement form analytics dashboard`
  - Files: `frontend/src/app/(app)/admin/forms/[id]/analytics/page.tsx`
  - Pre-commit: `cd frontend && npm run build`

---

 - [x] 17. End-to-End Wiring + Polish

  **What to do**:
  - Verify end-to-end flow works completely:
    1. Admin creates form with sections and fields → Save Draft
    2. Admin publishes form (assigns to specific units)
    3. Unit user sees form in "My Forms" page
    4. Unit user fills and submits form
    5. Admin views responses list
    6. Admin views analytics with charts
    7. Admin closes form
    8. Unit user sees form as "Closed" (no fill button)
  - Fix any integration issues discovered:
    - API request/response shape mismatches between frontend types and backend handlers
    - Navigation links between pages (form list → edit → back to list, analytics → response list)
    - Error handling for edge cases: 404 for deleted forms, 403 for unauthorized access, 409 for duplicates
  - Implement `frontend/src/app/(app)/admin/forms/[id]/responses/page.tsx` — Response List:
    - Table showing: Respondent name/email, Submitted at, View button
    - View button opens a Dialog or navigates to a detail view showing the full response with field labels and answers formatted nicely
  - Polish UI:
    - Consistent loading states (Skeleton or Spinner) on all pages
    - Empty states for: no forms, no responses, no assigned forms
    - Confirm dialogs for destructive actions (delete, close)
    - Breadcrumb navigation on nested pages
    - Mobile responsiveness check on all pages

  **Must NOT do**:
  - Do NOT add new features beyond what's specified
  - Do NOT add response export
  - Do NOT add response editing/deletion
  - Do NOT refactor existing code outside the form builder feature

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Full integration testing, bug fixing across backend and frontend, comprehensive edge case handling
  - **Skills**: [`react-expert`, `shadcn`, `backend-go`]
    - `react-expert`: Integration debugging, state management fixes
    - `shadcn`: UI polish, loading states, empty states
    - `backend-go`: Backend fixes if integration issues found

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Tasks 14, 15, 16 all complete)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 14, 15, 16

  **References**:

  **Pattern References**:
  - All previous tasks' output files
  - `frontend/src/components/shared/form-shell.tsx` — FormPage layout consistency
  - `frontend/src/components/ui/skeleton.tsx` — Loading state patterns (if exists)

  **WHY Each Reference Matters**:
  - This task is the integration glue — it references ALL previous tasks to verify they work together. No new patterns, just verification and bug fixes.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Complete end-to-end happy path
    Tool: Playwright
    Preconditions: Backend and frontend running, admin and unit user accounts exist
    Steps:
      1. Login as Super Admin
      2. Navigate to /admin/forms → Click "Create New Form"
      3. Create form: title "Monthly Report", 2 sections, 4 fields (text required, radio, checkbox, dropdown)
      4. Configure conditional logic on one field
      5. Save as draft → verify in list with "Draft" badge
      6. Click Publish → assign to specific unit → verify "Published" badge
      7. Login as Unit user
      8. Navigate to /forms → verify "Monthly Report" visible
      9. Click "Fill Form" → fill all fields → Submit
      10. Navigate to /forms → verify "Submitted" badge on the form
      11. Login as Super Admin again
      12. Navigate to /admin/forms/[id]/responses → verify 1 response
      13. Navigate to /admin/forms/[id]/analytics → verify charts show data
      14. Click "Close Form" → verify "Closed" badge
      15. Login as Unit user → navigate to /forms → verify form shows "Closed"
    Expected Result: Complete lifecycle works without errors
    Failure Indicators: Any step fails, navigation broken, data mismatch
    Evidence: .sisyphus/evidence/task-17-e2e-flow.png

  Scenario: Error handling for edge cases
    Tool: Playwright + Bash (curl)
    Steps:
      1. Navigate to /forms/nonexistent-uuid/fill → verify 404 or redirect with error
      2. As unit user, try to access /admin/forms → verify redirect or 403
      3. Submit duplicate response → verify error toast "Already submitted"
      4. Try to edit published form with responses → verify locked message
    Expected Result: All edge cases handled gracefully with appropriate messages
    Evidence: .sisyphus/evidence/task-17-error-handling.png

  Scenario: Both builds succeed
    Tool: Bash
    Steps:
      1. cd backend && go build ./...
      2. cd frontend && npm run build
    Expected Result: Both compile cleanly
    Evidence: .sisyphus/evidence/task-17-builds.txt
  ```

  **Evidence to Capture:**
  - [ ] task-17-e2e-flow.png
  - [ ] task-17-error-handling.png
  - [ ] task-17-builds.txt

  **Commit**: YES
  - Message: `feat: wire form builder end-to-end and polish`
  - Files: `frontend/src/app/(app)/admin/forms/[id]/responses/page.tsx`, various fixes across form builder files
  - Pre-commit: `cd backend && go build ./... && cd ../frontend && npm run build`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `go vet ./...` + `go build ./...` in backend. Run `npm run build` in frontend. Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in production code, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic variable names (`data`/`result`/`item`/`temp`).
  Output: `Build [PASS/FAIL] | Vet [PASS/FAIL] | Frontend Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: create form → publish → fill → view analytics. Test edge cases: empty form publish attempt, duplicate response attempt, locked form edit attempt. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (`git log`/`diff`). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit Check |
|--------|---------|-------|-----------------|
| 1 | `feat(db): add dynamic forms migration` | `backend/db/migrations/000020_*` | `make migrate-up` |
| 2 | `feat(frontend): install shadcn components and dnd-kit` | `frontend/package.json`, `frontend/src/components/ui/*` | `npm run build` |
| 3 | `feat(frontend): add form TypeScript types and field registry` | `frontend/src/types/form.ts`, `frontend/src/lib/form-field-registry.ts` | `npm run build` |
| 4 | `feat(backend): add form domain entities and repository interfaces` | `backend/internal/domain/entity/form.go`, `backend/internal/domain/repository/form.go`, `backend/internal/domain/errors/form_errors.go` | `go build ./...` |
| 5 | `feat(backend): implement form CRUD PostgreSQL repository` | `backend/internal/repository/postgres/form.go` | `go build ./...` |
| 6 | `feat(backend): implement form response and analytics repository` | `backend/internal/repository/postgres/form_response.go` | `go build ./...` |
| 7 | `feat(frontend): add form navigation and page scaffolds` | `frontend/src/lib/app-navigation.ts`, `frontend/src/app/(app)/admin/forms/*`, `frontend/src/app/(app)/forms/*` | `npm run build` |
| 8 | `feat(frontend): implement field renderer components` | `frontend/src/components/form-builder/*` | `npm run build` |
| 9 | `feat(backend): add form CRUD and lifecycle usecases` | `backend/internal/usecase/form/*.go` | `go build ./...` |
| 10 | `feat(backend): add response submission and analytics usecases` | `backend/internal/usecase/form/submit_response.go`, `backend/internal/usecase/form/analytics.go` | `go build ./...` |
| 11 | `feat(backend): add form HTTP handlers and register routes` | `backend/internal/handler/http/form.go`, `backend/cmd/server/main.go` | `go build ./...` |
| 12 | `feat(frontend): implement form builder with sections and fields` | `frontend/src/app/(app)/admin/forms/new/page.tsx`, `frontend/src/app/(app)/admin/forms/[id]/edit/page.tsx` | `npm run build` |
| 13 | `feat(frontend): add drag-and-drop reorder to form builder` | `frontend/src/components/form-builder/sortable-*.tsx` | `npm run build` |
| 14 | `feat(frontend): implement form list and lifecycle management` | `frontend/src/app/(app)/admin/forms/page.tsx`, `frontend/src/app/(app)/forms/page.tsx` | `npm run build` |
| 15 | `feat(frontend): implement form filler with conditional logic` | `frontend/src/app/(app)/forms/[id]/fill/page.tsx` | `npm run build` |
| 16 | `feat(frontend): implement form analytics dashboard` | `frontend/src/app/(app)/admin/forms/[id]/analytics/page.tsx` | `npm run build` |
| 17 | `feat: wire form builder end-to-end and polish` | Various | `go build ./... && npm run build` |

---

## Success Criteria

### Verification Commands
```bash
# Backend builds
cd backend && go build ./...

# Frontend builds
cd frontend && npm run build

# Migration applies cleanly
cd backend && make migrate-up

# API endpoints respond correctly
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/forms -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"title":"Test"}' # Expected: 201
curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:8080/api/v1/forms -H "Authorization: Bearer $ADMIN_TOKEN" # Expected: 200
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/v1/forms -H "Authorization: Bearer $UNIT_TOKEN" -H "Content-Type: application/json" -d '{"title":"Test"}' # Expected: 403
```

### Final Checklist
- [ ] All "Must Have" features implemented and verified
- [ ] All "Must NOT Have" guardrails respected (no scope creep)
- [ ] Backend builds with `go build ./...`
- [ ] Frontend builds with `npm run build`
- [ ] Migration applies and rolls back cleanly
- [ ] RBAC enforced on all endpoints
- [ ] Analytics charts render with real data

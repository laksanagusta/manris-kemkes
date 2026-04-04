# Learnings — Dynamic Form Builder

## Project Conventions

- Backend Clean Architecture: domain → repository → usecase → handler
- All new tables use UUID PK via `gen_random_uuid()`, TIMESTAMPTZ defaults
- JSONB already used in migrations (see 000015_meeting_minutes.up.sql)
- Migration sequence: latest is `000019_risk_category_contract`, new one is `000020_dynamic_forms`
- `@dnd-kit/react` new API required (NOT `@dnd-kit/core`/`@dnd-kit/sortable`) for React 19 compatibility
- Frontend state: `useReducer` (NO Zustand)
- shadcn/ui components live in `frontend/src/components/ui/`
- Navigation config is in `frontend/src/lib/app-navigation.ts`
- Field options stored as JSONB on `form_fields`, NOT a separate table
- Checkbox fields CANNOT be conditional logic sources
- Conditional logic: "equals" only, evaluated both client-side and server-side
- Hidden required fields skip validation
- 1 response per user per form (UNIQUE DB constraint)
- Form lifecycle: draft → published → closed (cannot reopen)
- Form locked after first response (no editing)

## Migration Task (000020)

- Migration 000020 created: 5 tables (forms, form_sections, form_fields, form_responses, form_assignments)
- 7 indexes including GIN `jsonb_path_ops` on `form_responses.answers`
- Self-referencing FK on `form_fields.condition_source_field_id` → `form_fields.id` (ON DELETE SET NULL)
- UNIQUE constraints verified: `(form_id, respondent_id)` and `(form_id, organization_id)` both reject duplicates
- Down migration drops in reverse FK order — clean up/down/re-up cycle confirmed
- `psql -t -A -c "... RETURNING id"` may include trailing newline — pipe through `head -1 | tr -d '[:space:]'`
- Committed as `feat(db): add dynamic forms migration` (4672cfc)

## Domain Layer (Task 4)

- Module path is `github.com/manris/backend` (NOT `manris-backend`)
- Entity pattern: JSON tags with camelCase, pointer types for optional fields, `*string` for nullable text
- Error pattern: `*AppError` sentinel vars with Code/Message (NOT plain `errors.New`)
- Repository pattern: interfaces with `context.Context` first, returns `(*entity.X, error)`
- `json.RawMessage` for JSONB answers column — no DB imports in domain layer
- `ValidateForPublish` uses a `fieldTypeByID` map to validate cross-field conditional references
- Pre-existing LSP errors in test files (missing `GetHeatmapVelocity` on fakes) — not ours, ignore
- Evidence files created by `go build` in `backend/` land in `backend/.sisyphus/evidence/` — must copy to root `.sisyphus/evidence/`
- Committed as `feat(backend): add form domain entities and repository interfaces` (d6a6be6)

## Repository Layer (Task 5)

- `mustJSON()` already exists in `risk.go` (same package) — reuse, don't duplicate
- `domainerrors` import alias pattern from `meeting_minute.go`: `domainerrors "github.com/manris/backend/internal/domain/errors"`
- `pgx.ErrNoRows` + `errors.Is()` for not-found detection — return domain error `ErrFormNotFound`
- Form Update strategy: DELETE sections (CASCADE deletes fields), re-INSERT all — simpler than position diffing
- `pgxpool.Exec` returns `pgconn.CommandTag` with `.RowsAffected()` for checking if row existed
- Test user ID in DB: `10000000-0000-0000-0000-000000000001` (not zeroed UUID)
- `COALESCE(options, '[]'::jsonb)` needed for JSONB scan to avoid nil bytes
- Two separate constructors `NewFormRepository` + `NewFormAssignmentRepository` (not combined)
- Committed as `feat(backend): implement form CRUD PostgreSQL repository` (788e6a1)

## Navigation & Scaffolds (Task 7)

- `mainMenuItems` in `app-navigation.ts` only controls the MAIN MENU group; ADMINISTRATION is hardcoded in `app-sidebar.tsx`
- Sidebar `iconMap` must be updated when adding new icon strings to `mainMenuItems` (e.g., `ClipboardList`)
- `FileText` was already imported in sidebar — used directly for "Form Builder" in ADMINISTRATION section
- API helper pattern: flat files in `src/lib/` import `api` from `@/lib/api` and export typed async wrappers (see `communication-logs.ts`)
- Created `src/lib/api/` subdirectory for forms API helpers (first usage of subdirectory pattern)
- `api.delete` takes `(path, body?, token?)` — pass `undefined` as body when no body needed
- `breadcrumbMap` in `app-navigation.ts` used for breadcrumb display + satisfies grep checks
- Scaffold pages: minimal `"use client"` + placeholder div with h1/p matching `animate-fade-in` pattern from admin pages
- Committed as `feat(frontend): add form navigation and page scaffolds` (eec6bad)

## Response Repository Layer (Task 6)

- `json.RawMessage` (alias for `[]byte`) works directly with pgx for JSONB insert/scan — no marshaling needed
- `pgconn.PgError` with `errors.As()` for unique constraint violation detection — code "23505"
- JSONB operator `answers->>'fieldKey'` can use `fmt.Sprintf` with field_key since keys are validated at creation time
- `jsonb_array_elements_text(answers->'fieldKey')` in comma-join acts as implicit CROSS JOIN LATERAL — rows with NULL/missing keys excluded automatically
- `date_trunc($2, submitted_at)::text` works with parameterized period in pgx — returns full timestamp text
- For trends, use ordered slice + map pattern to preserve chronological period ordering from ORDER BY
- Test user 2 ID `10000000-0000-0000-0000-000000000002` may not exist — insert with ON CONFLICT DO NOTHING before use
- `NewFormResponseRepository` returns `repository.FormResponseRepository` interface type (same pattern as other repos)

## Repository Layer — Responses (Task 6)

- `form_response.go` uses `fmt.Sprintf` to interpolate field_key into SQL — safe since field_key is validated as alphanumeric+underscore at form creation time
- `GetFieldTrends` returns `[]entity.FormFieldTrends` (not a map), each entry has `Trends []entity.TrendPoint`
- `date_trunc` result cast to `::text` for consistent Go string scanning
- `FieldTypeHasOptions()` used to skip text/textarea in trends (correct)
- Committed as `ce79bac`

## Frontend Navigation + Scaffolds (Task 7)

- "My Forms" added to mainMenuItems in app-navigation.ts (line 29)
- "Form Builder" added directly in app-sidebar.tsx ADMINISTRATION section (line 97) — not via app-navigation.ts's mainMenuItems (the sidebar has its own hardcoded admin nav)
- API helper: `publishForm` uses `api.post` (not `api.put`) — backend handler MUST use POST /forms/:id/publish
- API helper: `fetchMyForms` uses `/forms/mine` — backend handler MUST use GET /forms/mine
- `api/forms.ts` created in new directory `frontend/src/lib/api/`
- Committed as `eec6bad`

## Field Renderers (Task 8)

- `FormFieldOption` (NOT `FieldOption`) — type name in `form.ts` is `FormFieldOption { value: string; label: string }`
- `field.placeholder` is `string | null | undefined` — use `?? undefined` to coerce null to undefined for HTML attributes
- RadioGroup uses `onValueChange` (not `onChange`) — Radix UI pattern
- Select uses `onValueChange` (not `onChange`) — same Radix UI pattern
- Checkbox `onCheckedChange` returns `boolean | "indeterminate"` — check `=== true` for safety
- Checkbox multi-select: value is `string[]`, toggle by add/filter pattern
- SelectItem must be inside SelectGroup (shadcn composition rule)
- All renderers are `"use client"` since they use event handlers (onChange, onValueChange, onCheckedChange)
- index.tsx registry is NOT `"use client"` — it's a plain module with imports + a component that just dispatches
- Label component imported from `@/components/ui/label` — uses Radix LabelPrimitive
- Committed as `ff4337d`

## Usecase Layer (Task 9)

- Pattern: struct with repo deps, `NewXxxUseCase()` constructor, `Execute(ctx, input) (*output, error)`
- Import alias: `domainerrors "github.com/manris/backend/internal/domain/errors"` (matches approval/submit.go pattern)
- Shared input types (SectionInput, FieldInput, FieldOptionInput) live in `helpers.go` within same package
- `fieldKey` is a private field on FieldInput — set by `assignFieldKeys()` helper, accessible within package
- `generateFieldKey`: regex-based slug (lowercase, `[^a-z0-9]` → `_`, collapse multiples, trim, max 50 chars)
- Key uniqueness: append `_2`, `_3` etc for collisions, suffix-aware truncation to stay ≤ 50 chars
- `FormRepository.Create/Update` return `(*entity.Form, error)` — use returned form for output
- `FormRepository.HasResponses` used in UpdateFormUseCase for lock check (in FormRepository, not FormResponseRepository)
- Publish validation: form.ValidateForPublish() + check assignments if targetAudience="specific"
- Close: only published forms can be closed; returns ErrFormNotPublished for draft, ErrFormClosed for already-closed
- Delete: only draft forms can be deleted; returns ErrFormLocked for published/closed
- GetFormUseCase: admin/super_admin bypass all checks; non-admin see only published + assigned
- ListFormsUseCase: admin sees all (optionally filtered by status); non-admin sees published + (all OR assigned)
- `submit_response.go` was already in the directory from a prior task — got included in commit alongside our 8 files
- Committed as `feat(backend): add form CRUD and lifecycle usecases` (f733c3c)

## Response Submission & Analytics Usecases (Task 10)

- `slices.Contains` replaces manual for-loop for UUID slice membership check (Go 1.21+)
- `any` preferred over `interface{}` in Go 1.18+ (LSP hint)
- Conditional visibility evaluation: lookup source field by UUID → get its FieldKey → check answers map with equals-only operator
- `GetByFormAndRespondent` returns `(nil, nil)` for not found — check `existing != nil` for duplicate detection
- `GetFieldAggregations` and `GetFieldTrends` both require `[]entity.FormField` parameter (not just formID)
- Text/textarea aggregation: `Summary["total"]` and `Summary["filled"]` → compute EmptyCount = total - filled
- Option-based aggregation: `Summary` map is directly the OptionCounts (option value → count)
- `GetFieldTrends` only returns data for option-based fields (radio/dropdown/checkbox), silently skips text/textarea
- `collectAllFields` helper shared across submit_response.go and analytics.go (same package)
- T9 created `submit_response.go` as stub; T10 overwrote with full implementation (shows as modified, not new)
- Committed as `1b5a8fd`

## HTTP Handlers & Route Registration (Task 11)

- Auth middleware stores: `c.Locals("userId")` as `uuid.UUID`, `c.Locals("role")` as `string`, `c.Locals("organizationId")` as `string`
- Existing handlers (risk.go) use `c.Locals("userId").(uuid.UUID)` pattern — followed same for form handler
- `organizationId` from JWT is stored as `string` — must `uuid.Parse()` to convert to `*uuid.UUID`
- Helper functions prefixed with `Form` (e.g., `extractFormUserID`) to avoid name conflicts with other potential handler helpers
- `mapFormError` needed because generic `handleError` in `response.go` doesn't map form-specific errors to correct HTTP codes (e.g., 409 Conflict for `ErrFormLocked`)
- `errors.As(err, &appErr)` with switch on sentinel pointers for precise error mapping
- Any `AppError` with non-empty Code falls through to 422; non-AppError falls to generic `handleError`
- Route ordering critical: `/forms/mine` BEFORE `/forms/:id` — Fiber treats "mine" as `:id` param otherwise
- DTO uses `[]string` for `OrganizationIDs` (JSON string array) — handler converts to `[]uuid.UUID`
- `ConditionSourceFieldID` in DTO is `*string` (JSON) — handler parses to `*uuid.UUID` for usecase
- `SubmitResponseInput.OrgID` is `uuid.UUID` (NOT pointer) — use `uuid.Nil` when user has no org
- `ListResponsesOutput.Responses` is `[]*entity.FormResponse` — need entity import for nil-slice initialization
- 10 usecases wired: create, get, list, update, delete, publish, close, submitResponse, listResponses, analytics
- 11 routes registered under `protected` group (GET/POST/PUT/DELETE)
- `go build ./...` passes cleanly (pre-existing test errors in unrelated files are not ours)
- Committed as `4bef253`

## Form Builder UI (Task 12)

- `uuid` package available as transitive dep of `exceljs`, but `@types/uuid` needed as devDependency for TS compilation
- shadcn `Switch` component was NOT pre-installed — run `npx shadcn@latest add switch`
- zsh glob expansion breaks paths containing parentheses like `(app)` — must single-quote paths in git commands
- `useReducer` state shape: `FormBuilderState` with `title`, `description`, `targetAudience`, `organizationIds`, `sections[]`, `selectedFieldId`, `isDirty`, `isSubmitting`
- `serializeFormState()` generates `fieldKey` from labels using regex slug (lowercase, `[^a-z0-9]` → `-`, collapse, trim, max 50 chars) with `_2`/`_3` uniqueness suffixes
- `deserializeForm()` reconstructs builder state from API `FormDetail` response for edit page
- Edit page uses `fetchFormAnalytics` to detect `totalResponses > 0` for lock mode — catches errors silently since analytics may fail for draft forms
- Field config panel filters out checkbox fields from conditional logic source dropdown (spec requirement)
- `DropdownMenu` from shadcn used for "Add Field" button with 5 field type options
- `Sheet` component used for field config panel (slides in from right)
- Form API: `createForm(payload, token)` returns `{ id: string }`, `updateForm(id, payload, token)` returns void
- `FormHeader` from `@/components/shared/form-shell` provides consistent header layout with back navigation
- `FIELD_TYPES` and `getFieldTypeConfig()` from `@/lib/form-field-registry` provide field type metadata (label, icon, description)
- Committed as `6dfe714`

## [2026-04-04] Task: T16 — Form Analytics Dashboard

- Recharts `Pie` label callback: `percent` can be `undefined` in types — use `(percent ?? 0)` to avoid TS error
- Existing codebase Recharts pattern: uses oklch colors for tooltip/grid styling, `ResponsiveContainer` wrapping, `axisLine={false} tickLine={false}` cleanup
- Auth pattern in forms pages: `const { token } = useAuth()` from `@/contexts/auth-context`
- Route params: `useParams()` from `next/navigation`, cast `params.id as string`
- Section separator comments (`// ── X ──`) are convention in this codebase (see `types/form.ts`)
- Pre-existing build error in `edit/page.tsx` (SectionCard missing) — not related to analytics work
- `FormFieldAnalytics.summary` uses `Record<string, number>` — for text fields keys are "filled"/"empty", for option fields keys are option values
- `TrendPoint.values` is `Record<string, number>` — transform to flat rows for Recharts `LineChart` by spreading option keys

## [2026-04-04] Task: T14 — Form List & Lifecycle Management Pages

- `alert-dialog` and `skeleton` shadcn components were not pre-installed — added via `npx shadcn@latest add`
- AlertDialog pattern: controlled via `open={!!state}` + `onOpenChange` — match existing Dialog pattern from risk register
- Confirmation action pattern: discriminated union type `ConfirmAction = { type: "publish" | "close" | "delete"; form: Form }` with config map for dialog text/variant
- Status badge classes: `draft` → muted, `published` → emerald-500/15, `closed` → destructive/15 — semantic colors via custom classes (not Badge variants since shadcn Badge doesn't have green variant built-in)
- User forms page: card grid with `sm:grid-cols-2 lg:grid-cols-3` for responsive layout
- `fetchForms(token, { status })` and `fetchMyForms(token)` from `@/lib/api/forms` — straightforward fetch+state pattern
- Skeleton loading: 5 rows for table (admin), 6 cards for grid (user) — matches perceived content density
- Empty state: centered icon + text + hint, consistent with codebase pattern
- `useCallback` for `loadForms` with `[token, statusFilter]` deps enables re-fetch after lifecycle actions
- Build verified clean: `npm run build` exits 0, LSP diagnostics clean on both changed files

## [2026-04-04] Task: T13 — Form Builder DnD Reorder

- `@dnd-kit/react` v0.3.x API: `DragDropProvider` (not `DndContext`), `useSortable` from `@dnd-kit/react/sortable`
- `useSortable` accepts `{ id, index, group?, disabled? }`, returns `{ ref, handleRef, isDragging, isDropping, isDragSource, isDropTarget }`
- `handleRef` attaches to the drag handle element, `ref` attaches to the sortable container
- `onDragEnd` event shape: `{ canceled, operation: { source, target } }` where source/target have `id`, `index`, `initialIndex`, `group`
- `isSortable()` from `@dnd-kit/dom/sortable` type-narrows source/target to access `.index`/`.initialIndex`/`.group`
- For type safety with the drag event handler, inline type annotation on callback parameter avoids importing complex generic types
- Nested `DragDropProvider` instances are independent — section-level DnD in page, field-level DnD in SectionCard
- Each `DragDropProvider` scopes its own sortable context — fields in different sections don't interfere
- Reducer reorder pattern: `splice(fromIndex, 1)` + `splice(toIndex, 0, moved)` on a shallow-copied array
- SectionCard modified to use `SortableField` + inner `DragDropProvider` for field reorder; pages use `SortableSection` + outer `DragDropProvider` for section reorder
- Committed as `75391f8`

## [2026-04-04] Task: T15 — Form Filler with Conditional Logic

- FieldRenderer props use `unknown` for value/onChange, not `string | string[]` — keep generic
- For dynamic Zod schemas with conditional visibility, avoid `zodResolver` — use manual `schema.safeParse` on submit and track validation errors in state
- Single `useForm` + `useWatch` pattern: useForm for state management, useWatch for reactive values, manual validation for schema
- Conditional visibility: build `fieldId → fieldKey` lookup map, evaluate `formValues[sourceKey] === logic.value`. Array values (checkbox) check `includes()`
- Hidden field cleanup: useEffect clears hidden field values via `setValue(key, "")` — prevents stale data submission
- Page state machine pattern: `PageState = "loading" | "error" | "forbidden" | "not_published" | "ready"` — cleaner than multiple boolean flags
- Read-only view: same FieldRenderer with `disabled` prop, pre-populated from `response.answers[fieldKey]`
- 409 conflict handling for duplicate submissions: catch `ApiError` with status 409 specifically
- `fetchFormResponses` may 403 if user not assigned — catch and default to empty array in parallel load

## [2026-04-04] Task: T17 — End-to-End Wiring & Polish

- `api.ts` helper (line 46-48) auto-unwraps `{ data: ... }` envelope from backend — `fetchFormResponses` returning `FormResponse[]` is correct
- Backend `entity.FormResponse` has only: ID, FormID, RespondentID (uuid.UUID), Answers (json.RawMessage), SubmittedAt — no name/email
- Respondent display: "User …" + last 8 chars of UUID (truncated with `slice(-8)`)
- Admin forms list needed a "Respons" button next to "Analytics" for published/closed forms — added with `ClipboardList` icon
- Responses page pattern: `Promise.all([fetchForm, fetchFormResponses])` parallel fetch, same as analytics page
- Table shows first 3 fields inline as preview columns, with "eye" button to open full detail Dialog
- `flattenFields()` sorts sections by position then fields by position to maintain consistent column order
- Dialog uses `max-h-[80vh] overflow-y-auto` for long responses — prevents viewport overflow
- `renderAnswer()` handles null/undefined/empty → "—", arrays → join(", "), else → String()
- Cross-navigation: responses page links to analytics, analytics page links to responses — bidirectional
- Pre-existing backend errors (KRI, report) confirmed not related to form feature — `go build ./internal/domain/entity/... ./internal/usecase/form/...` passes clean
- Frontend build (`npm run build`) passes clean with responses page correctly listed as dynamic route

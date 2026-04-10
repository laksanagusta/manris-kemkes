## T1: Build backend access-scope contract — VERIFIED COMPLETE (pre-existing)

### Key Files
- `backend/internal/domain/entity/access_scope.go` — AccessScope struct with CanRead, CanWrite, NarrowToOrg methods
- `backend/internal/domain/entity/access_scope_test.go` — Comprehensive tests (158 lines)
- `backend/internal/middleware/auth.go` — ScopeResolver interface, ResolveOrgScope middleware, GetAccessScope helper
- `backend/internal/domain/service/organization_hierarchy.go` — ResolveAccessScope implementation
- `backend/internal/domain/entity/user.go` — NormalizeRole function with alias handling

### Patterns & Conventions
- AccessScope stored in Fiber locals via `middleware.AccessScopeKey` ("accessScope")
- Use `middleware.GetAccessScope(c)` in handlers to retrieve scope
- `CanRead(targetOrgID)` for read checks, `CanWrite(targetOrgID)` for mutation checks
- `NarrowToOrg(requestedOrgID)` for validating client-supplied org filters
- IsGlobal=true for superadmin bypasses read/write checks
- Phase 1: CanWrite only returns true for user's OWN org (no descendant write)
- Role normalization: "superadmin", "super_admin", "admin" all → "superadmin"
- ResolveAccessScope returns error for non-superadmin users with nil orgID (fail-closed)

### Test Results
- `go test ./internal/domain/entity/ -run 'TestAccessScope|TestNormalizeRoleAliases'` → PASS
- `go test ./internal/domain/service ./internal/usecase/auth` → PASS (all 8 tests)

## T4: Fix org scope leaks in report generation — VERIFIED COMPLETE

### Bug
`filterIncidentsByRiskIDs` and `filterKRIsByRiskIDs` in `generate.go` called repo `.List()` with `nil` orgIDs, leaking data from ALL organizations including siblings.

### Fix
- Added `orgIDs []uuid.UUID` parameter to both filter methods
- Passed `input.OrgIDs` from `Execute()` call sites instead of nil
- Repo calls now scoped: `uc.incidentRepo.List(ctx, orgIDs)` and `uc.kriRepo.List(ctx, orgIDs, false)`

### Test
- `TestReportExcludesSiblingOrgData` — creates incidents/KRIs for orgA and orgB, requests report with OrgIDs=[orgA], asserts orgB data is excluded
- Fake repos fail-fast if called with nil/empty orgIDs (catches regressions)

### Pattern
- When threading orgIDs through usecase internal methods, add it as last param to match repo interface convention
- Test fakes should guard against nil orgIDs to catch scope leaks early

## T5+T6: Fix linked-risk validation scope leaks in Update flows — VERIFIED COMPLETE

### Bug
Three Update usecases passed `nil` orgIDs when validating linked risks, allowing cross-org risk references:
- `incident/basic.go:115` — `uc.riskRepo.GetByID(ctx, riskID, nil)`
- `control/basic.go:112` — `uc.riskRepo.GetByID(ctx, *input.RiskID, nil)`
- `kri/basic.go:109` — `uc.riskRepo.GetByID(ctx, input.RiskID, nil)`

### Fix
Changed all three to pass the `orgIDs` parameter already available in each Update method signature:
- `uc.riskRepo.GetByID(ctx, riskID, orgIDs)`
- `uc.riskRepo.GetByID(ctx, *input.RiskID, orgIDs)`
- `uc.riskRepo.GetByID(ctx, input.RiskID, orgIDs)`

### Tests Added
- `TestIncidentUpdateRejectsSiblingLinkedRisk` — uses `scopeAwareRiskRepo` that filters by orgIDs
- `TestControlUpdateRejectsSiblingLinkedRisk` — uses `scopeAwareCtrlRiskRepo`
- `TestKRIUpdateRejectsSiblingLinkedRisk` — uses `scopeAwareKRIRiskRepo`

### Pattern
- Existing test risk repo fakes (`scopeRiskRepo`, etc.) always return success — they're suitable for tests where linked risk validation isn't the focus
- For scope-leak tests, create a separate `scopeAware*RiskRepo` that embeds the permissive fake and overrides only `GetByID` with orgIDs filtering
- The `orgIDs` parameter is already threaded into all Update method signatures from T1-T3 work — just needs to be used consistently for ALL repo calls, not just the primary record fetch

## T7: Form & Meeting Minute scope tests — VERIFIED COMPLETE

### Files Created
- `backend/internal/usecase/form/scope_test.go` — 12 tests covering all form usecase scope behaviors
- `backend/internal/usecase/meeting_minute/scope_test.go` — 2 tests covering meeting minute list scoping

### Form Scope Tests (12 tests)
- **List**: `TestFormListRejectsNilScope`, `TestFormListScopedExcludesSiblingOrgs`
- **Get**: `TestFormGetParentCanReadDescendantForm`, `TestFormGetRejectsNilScope`
- **Update**: `TestFormUpdateRejectsParentWritingChildOwnedForm`, `TestFormUpdateRejectsNilScope`, `TestFormUpdateAllowsOwnerWrite`
- **Publish**: `TestFormPublishRejectsParentOnChildOwnedForm`, `TestFormPublishRejectsNilScope`, `TestFormPublishAllowsOwner`
- **Delete**: `TestFormDeleteRejectsParentOnChildOwnedForm`, `TestFormDeleteRejectsNilScope`

### Meeting Minute Scope Tests (2 tests)
- `TestMeetingMinuteListPassesScopedOrgIDs` — captures OrgIDs passed to repo, asserts non-nil
- `TestMeetingMinuteListScopesToAccessibleOrgsOnly` — asserts sibling org data excluded

### Patterns
- Form usecase scope checks: nil scope → ErrForbidden, write ops use `CanWrite(orgID)` which returns false for child orgs (Phase 1)
- Form get allows parent to read child-owned published forms via `AccessibleOrgIDs` match
- Meeting minute list passes OrgIDs directly to repo via `ListMeetingMinutesOptions.OrgIDs`
- Fake repos in tests implement full repository interface with filtering by OrganizationIDs
- `validDraftForm()` helper creates a minimal form with valid sections/fields that passes `ValidateForPublish()`
- `scopeListMMRepo.capturedOrgIDs` pattern captures repo call arguments for assertion

### Frontend Alignment (T8)

- **UI Helper Enforcement**: Added `isReadOnlyForOrg` check to `src/app/(app)/minutes/[id]/page.tsx` and `src/app/(app)/minutes/page.tsx` to conditionally hide the 'Delete' button for users without write access to the meeting minute's organization.
- **Organization Selectors Standardization**: Replaced manual filtering loops (`res.filter(...)`) with the `filterToAccessibleOrgs` utility in:
  - `src/app/(app)/admin/users/new/page.tsx`
  - `src/app/(app)/compliance/_components/risk-review-panel.tsx`
  - `src/app/(app)/risk/register/new/page.tsx`
  - `src/app/(app)/reports/risk-cycle-detail-report.tsx`
- **Build & Tests**: Ran `npm test` and `npm run build`, all 72 tests passed correctly and build succeeded without any TypeScript errors or runtime warnings. The frontend properly uses the backend's provided organizational context (`accessibleOrgIds` and `isGlobal`) to drive a consistent UX.

## T9: Cross-domain RBAC Regression Matrix — VERIFIED COMPLETE

### File Created
- `backend/internal/usecase/rbac_regression_test.go` — 4 test functions, 32 subtests across 8 domains

### Test Functions
- `TestRBACMatrix_SiblingOrgDenied` — 8 subtests proving sibling org isolation per domain
- `TestRBACMatrix_ParentCanReadDescendantOnly` — 9 subtests proving read-allowed + write-denied for descendants
- `TestRBACMatrix_OutOfScopeDetailReturnsNotFound` — 7 subtests proving not-found masking (not forbidden)
- `TestRBACMatrix_RejectsOutOfScopeOrgFilter` — 8 subtests proving NarrowToOrg rejects inaccessible orgs

### Domains Covered
risk, incident, control, kri, lesson, form, meeting_minute, report — all 8 protected domains

### Architecture Decisions
- Used `package usecase_test` (external test package) since `backend/internal/usecase/` has no .go source files
- Noop base repos embed pattern: each domain gets a `noopXRepo` satisfying full interface, then `scopedXRepo` embeds it and overrides only `GetByID` with org-aware filtering
- Form domain tested differently: repo returns form unconditionally, scope check is in use case via `AccessScope.AccessibleOrgIDs` match — matches production behavior
- Report domain tested via `ListCycleSnapshot` override on scopedRiskRepo — empty result triggers not-found error in use case
- Incident uses `string` ID (not `uuid.UUID`) unlike all other domains — requires `.String()` conversion in test

### Patterns
- Scoped fake repos use `orgIDs != nil` guard to catch regressions where orgIDs accidentally becomes nil
- Not-found masking: all Get usecases wrap repo errors as domain not-found (ErrRiskNotFound, ErrIncidentNotFound, ErrNotFound) — NOT ErrForbidden. This prevents information leakage.
- `NarrowToOrg` is tested per-domain via table-driven loop, proving the contract applies uniformly
- RiskRepository has 28 methods — largest interface to fake; embedding noop base makes this manageable

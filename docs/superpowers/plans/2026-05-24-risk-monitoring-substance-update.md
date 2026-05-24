# Risk Monitoring Substance Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secondary substance-update section to risk monitoring drafts while keeping score reassessment as the primary workflow and preserving approved-risk baselines.

**Architecture:** Keep the existing risk versioning model. Backend detects substance changes against the previous approved version for reassessment drafts and requires `changeReason` when substance changes exist. Frontend adds a collapsed secondary section in the monitoring form and uses shared diff helpers for payload construction and review summaries.

**Tech Stack:** Go 1.25, Fiber, pgx repository pattern, Next.js 16, React 19, TypeScript, React Hook Form, Zod, shadcn/ui, node:test.

---

## File Structure

- Modify: `backend/internal/usecase/risk/update.go`
  - Load previous approved risk for reassessment drafts.
  - Require `changeReason` when substance fields differ.
  - Return non-blocking warnings for fundamental-looking changes.
- Create: `backend/internal/usecase/risk/substance_change.go`
  - Pure comparison helpers for substance fields.
  - No database access.
- Create: `backend/internal/usecase/risk/substance_change_test.go`
  - Unit tests for diff and warning classification.
- Modify: `backend/internal/usecase/risk/review_schedule_text_test.go`
  - Add update-usecase integration tests using existing fake repository.
- Create: `frontend/src/lib/risk-assessment-substance.ts`
  - Frontend substance form defaults, diff helpers, payload merge helper, readiness helper.
- Create: `frontend/src/lib/risk-assessment-substance.test.ts`
  - Unit tests for diff, change reason requirement, and payload merge.
- Create: `frontend/src/components/risk/risk-substance-fields.tsx`
  - Reusable secondary substance field group extracted from the existing risk register form patterns.
  - Uses existing shared controls such as `EditableItemsTable`, `EditableList`, and `MitigationTable`.
- Modify: `frontend/src/lib/api/risk-assessment.ts`
  - Extend update data type for substance fields and warnings.
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
  - Add secondary accordion section for substance updates.
  - Store substance form state.
  - Build payload from draft plus optional substance edits.
  - Show review summary in confirmation dialog.

---

### Task 1: Backend Substance Diff Helper

**Files:**
- Create: `backend/internal/usecase/risk/substance_change.go`
- Test: `backend/internal/usecase/risk/substance_change_test.go`

- [ ] **Step 1: Write failing tests**

Create `backend/internal/usecase/risk/substance_change_test.go`:

```go
package risk

import (
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestDetectSubstanceChangesIgnoresScoreOnlyChanges(t *testing.T) {
	previous := &entity.Risk{
		Title:                "Risiko A",
		Description:          "Deskripsi A",
		Category:             entity.RiskCategoryOperasional,
		Cause:                []string{"Penyebab A"},
		RiskSource:           "internal",
		Controllability:      "C",
		ImpactDesc:           []string{"Dampak A"},
		ExistingControl:      "SOP A",
		ControlEffectiveness: "efektif",
		TreatmentOption:      "mitigasi",
		RiskOwnerID:          ptrUUID(uuid.MustParse("11111111-1111-1111-1111-111111111111")),
		ControlOwnerID:       ptrUUID(uuid.MustParse("22222222-2222-2222-2222-222222222222")),
		Mitigations: []entity.Mitigation{
			{Action: "Aksi A", Owner: "PIC A"},
		},
		Probability: 3,
		Impact:      3,
	}
	candidate := cloneReviewScheduleRisk(previous)
	candidate.Probability = 4
	candidate.Impact = 4

	changes := DetectSubstanceChanges(previous, candidate)
	if len(changes) != 0 {
		t.Fatalf("expected no substance changes, got %#v", changes)
	}
}

func TestDetectSubstanceChangesFindsSubstanceFields(t *testing.T) {
	previous := &entity.Risk{
		Title:                "Risiko lama",
		Description:          "Deskripsi lama",
		Category:             entity.RiskCategoryOperasional,
		Cause:                []string{"Penyebab lama"},
		RiskSource:           "internal",
		Controllability:      "C",
		ImpactDesc:           []string{"Dampak lama"},
		ExistingControl:      "Kontrol lama",
		ControlEffectiveness: "tidak_efektif",
		TreatmentOption:      "mitigasi",
		Mitigations: []entity.Mitigation{
			{Action: "Aksi lama", Owner: "PIC lama"},
		},
	}
	candidate := cloneReviewScheduleRisk(previous)
	candidate.Title = "Risiko baru"
	candidate.Cause = []string{"Penyebab lama", "Penyebab baru"}
	candidate.ExistingControl = "Kontrol baru"
	candidate.Mitigations = []entity.Mitigation{
		{Action: "Aksi baru", Owner: "PIC baru"},
	}

	changes := DetectSubstanceChanges(previous, candidate)
	got := make(map[string]bool, len(changes))
	for _, change := range changes {
		got[change.Field] = true
	}

	for _, field := range []string{"title", "cause", "existingControl", "mitigations"} {
		if !got[field] {
			t.Fatalf("expected field %q in changes, got %#v", field, changes)
		}
	}
}

func TestBuildSubstanceChangeWarningsFlagsFundamentalChanges(t *testing.T) {
	previousOwner := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	nextOwner := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	previous := &entity.Risk{
		Title:       "Risiko lama",
		Description: "Deskripsi lama",
		RiskSource:  "internal",
		RiskOwnerID: &previousOwner,
	}
	candidate := cloneReviewScheduleRisk(previous)
	candidate.Title = "Risiko baru"
	candidate.Description = "Deskripsi baru"
	candidate.RiskSource = "eksternal"
	candidate.RiskOwnerID = &nextOwner

	warnings := BuildSubstanceChangeWarnings(previous, candidate)
	if len(warnings) != 1 {
		t.Fatalf("expected 1 warning, got %#v", warnings)
	}
	if warnings[0] != "Perubahan judul, deskripsi, sumber risiko, dan pemilik risiko sekaligus dapat menandakan risiko baru. Pastikan objek risiko masih sama sebelum diajukan." {
		t.Fatalf("unexpected warning: %q", warnings[0])
	}
}

func ptrUUID(id uuid.UUID) *uuid.UUID {
	return &id
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'TestDetectSubstanceChanges|TestBuildSubstanceChangeWarnings' -count=1
```

Expected: FAIL with undefined `DetectSubstanceChanges` and `BuildSubstanceChangeWarnings`.

- [ ] **Step 3: Implement diff helper**

Create `backend/internal/usecase/risk/substance_change.go`:

```go
package risk

import (
	"reflect"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type SubstanceChange struct {
	Field string `json:"field"`
	Label string `json:"label"`
}

func DetectSubstanceChanges(previous, candidate *entity.Risk) []SubstanceChange {
	if previous == nil || candidate == nil {
		return nil
	}

	checks := []struct {
		field   string
		label   string
		changed bool
	}{
		{"title", "Judul Risiko", trim(previous.Title) != trim(candidate.Title)},
		{"description", "Deskripsi Risiko", trim(previous.Description) != trim(candidate.Description)},
		{"category", "Kategori Risiko", previous.Category != candidate.Category},
		{"cause", "Penyebab", !stringSlicesEqual(previous.Cause, candidate.Cause)},
		{"riskSource", "Sumber Risiko", previous.RiskSource != candidate.RiskSource},
		{"controllability", "Controllability", previous.Controllability != candidate.Controllability},
		{"impactDesc", "Uraian Dampak", !stringSlicesEqual(previous.ImpactDesc, candidate.ImpactDesc)},
		{"existingControl", "Kontrol Eksisting", trim(previous.ExistingControl) != trim(candidate.ExistingControl)},
		{"controlEffectiveness", "Efektivitas Kontrol", previous.ControlEffectiveness != candidate.ControlEffectiveness},
		{"treatmentOption", "Opsi Penanganan", previous.TreatmentOption != candidate.TreatmentOption},
		{"riskOwnerId", "Pemilik Risiko", !uuidPtrEqual(previous.RiskOwnerID, candidate.RiskOwnerID)},
		{"controlOwnerId", "Pemilik Kontrol", !uuidPtrEqual(previous.ControlOwnerID, candidate.ControlOwnerID)},
		{"mitigations", "Rencana Penanganan", !mitigationsEqual(previous.Mitigations, candidate.Mitigations)},
	}

	changes := make([]SubstanceChange, 0, len(checks))
	for _, check := range checks {
		if check.changed {
			changes = append(changes, SubstanceChange{Field: check.field, Label: check.label})
		}
	}
	return changes
}

func BuildSubstanceChangeWarnings(previous, candidate *entity.Risk) []string {
	if previous == nil || candidate == nil {
		return nil
	}

	changedTitle := trim(previous.Title) != trim(candidate.Title)
	changedDescription := trim(previous.Description) != trim(candidate.Description)
	changedSource := previous.RiskSource != candidate.RiskSource
	changedOwner := !uuidPtrEqual(previous.RiskOwnerID, candidate.RiskOwnerID)

	if changedTitle && changedDescription && changedSource && changedOwner {
		return []string{
			"Perubahan judul, deskripsi, sumber risiko, dan pemilik risiko sekaligus dapat menandakan risiko baru. Pastikan objek risiko masih sama sebelum diajukan.",
		}
	}
	return nil
}

func trim(value string) string {
	return strings.TrimSpace(value)
}

func stringSlicesEqual(a, b []string) bool {
	normalize := func(values []string) []string {
		out := make([]string, 0, len(values))
		for _, value := range values {
			value = strings.TrimSpace(value)
			if value != "" {
				out = append(out, value)
			}
		}
		return out
	}
	return reflect.DeepEqual(normalize(a), normalize(b))
}

func uuidPtrEqual(a, b *uuid.UUID) bool {
	if a == nil || b == nil {
		return a == nil && b == nil
	}
	return *a == *b
}

func mitigationsEqual(a, b []entity.Mitigation) bool {
	normalize := func(items []entity.Mitigation) []map[string]any {
		out := make([]map[string]any, 0, len(items))
		for _, item := range items {
			if strings.TrimSpace(item.Action) == "" && strings.TrimSpace(item.Owner) == "" {
				continue
			}
			out = append(out, map[string]any{
				"action":                 strings.TrimSpace(item.Action),
				"owner":                  strings.TrimSpace(item.Owner),
				"dueDate":                item.DueDate,
				"mitigationType":         item.MitigationType,
				"activityStage":          strings.TrimSpace(item.ActivityStage),
				"expectedOutput":         strings.TrimSpace(item.ExpectedOutput),
				"quantitativeTarget":     strings.TrimSpace(item.QuantitativeTarget),
				"supportingUnit":         strings.TrimSpace(item.SupportingUnit),
				"resourcesRequired":      strings.TrimSpace(item.ResourcesRequired),
				"contingencyPlan":        strings.TrimSpace(item.ContingencyPlan),
				"potentialObstacle":      strings.TrimSpace(item.PotentialObstacle),
				"costBenefitNote":        strings.TrimSpace(item.CostBenefitNote),
				"isBreakthroughActivity": item.IsBreakthroughActivity,
				"isExistingControl":      item.IsExistingControl,
			})
		}
		return out
	}
	return reflect.DeepEqual(normalize(a), normalize(b))
}
```

- [ ] **Step 4: Run tests to verify helper passes**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'TestDetectSubstanceChanges|TestBuildSubstanceChangeWarnings' -count=1
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/usecase/risk/substance_change.go backend/internal/usecase/risk/substance_change_test.go
git commit -m "feat(risk): detect monitoring substance changes"
```

---

### Task 2: Backend Update Guardrail

**Files:**
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/usecase/risk/review_schedule_text_test.go`

- [ ] **Step 1: Write failing update-usecase tests**

Append these tests to `backend/internal/usecase/risk/review_schedule_text_test.go` before `cloneReviewScheduleRisk`:

```go
func TestUpdateRiskUseCase_RequiresChangeReasonForSubstanceChangeInReassessment(t *testing.T) {
	riskID := uuid.New()
	previousRiskID := uuid.New()
	versionGroupID := uuid.New()
	organizationID := uuid.New()
	repo := &reviewScheduleRiskRepo{
		byID: &entity.Risk{
			ID:             riskID,
			PreviousRiskID: &previousRiskID,
			Code:           "R-001",
			Title:          "Existing reassessment",
			Description:    "Old description",
			Category:       entity.RiskCategoryOperasional,
			Status:         entity.RiskStatusDraft,
			VersionGroupID: versionGroupID,
			OrganizationID: &organizationID,
			Probability:    3,
			Impact:         3,
		},
	}
	repo.versions = []*entity.Risk{{
		ID:             previousRiskID,
		Code:           "R-001",
		Title:          "Existing reassessment",
		Description:    "Old description",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: versionGroupID,
		OrganizationID: &organizationID,
		Probability:    3,
		Impact:         3,
	}}
	uc := NewUpdateRiskUseCase(repo, &reviewScheduleUserRepo{}, &reviewScheduleOrgRepo{}, nil, &reviewScheduleTaskRepo{})

	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Existing reassessment",
		Description:    "New description",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusDraft,
		OrganizationID: &organizationID,
		Probability:    4,
		Impact:         3,
		ChangeReason:   "",
	}, nil)
	if err == nil {
		t.Fatal("expected error for missing change reason")
	}
	if repo.updated != nil {
		t.Fatal("expected update to be blocked")
	}
}

func TestUpdateRiskUseCase_AllowsScoreOnlyReassessmentWithoutSubstanceReason(t *testing.T) {
	riskID := uuid.New()
	previousRiskID := uuid.New()
	versionGroupID := uuid.New()
	organizationID := uuid.New()
	repo := &reviewScheduleRiskRepo{
		byID: &entity.Risk{
			ID:             riskID,
			PreviousRiskID: &previousRiskID,
			Code:           "R-001",
			Title:          "Existing reassessment",
			Description:    "Same description",
			Category:       entity.RiskCategoryOperasional,
			Status:         entity.RiskStatusDraft,
			VersionGroupID: versionGroupID,
			OrganizationID: &organizationID,
			Probability:    3,
			Impact:         3,
		},
	}
	repo.versions = []*entity.Risk{{
		ID:             previousRiskID,
		Code:           "R-001",
		Title:          "Existing reassessment",
		Description:    "Same description",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusApproved,
		VersionGroupID: versionGroupID,
		OrganizationID: &organizationID,
		Probability:    3,
		Impact:         3,
	}}
	uc := NewUpdateRiskUseCase(repo, &reviewScheduleUserRepo{}, &reviewScheduleOrgRepo{}, nil, &reviewScheduleTaskRepo{})

	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:             riskID,
		Title:          "Existing reassessment",
		Description:    "Same description",
		Category:       entity.RiskCategoryOperasional,
		Status:         entity.RiskStatusDraft,
		OrganizationID: &organizationID,
		Probability:    4,
		Impact:         3,
		ChangeReason:   "",
	}, nil)
	if err != nil {
		t.Fatalf("expected no error for score-only update, got %v", err)
	}
	if repo.updated == nil {
		t.Fatal("expected risk update")
	}
}
```

Also extend `reviewScheduleRiskRepo` near its struct definition:

```go
	versions []*entity.Risk
```

Replace its `GetByID` and `ListVersions` implementations with:

```go
func (r *reviewScheduleRiskRepo) GetByID(_ context.Context, id uuid.UUID, _ []uuid.UUID) (*entity.Risk, error) {
	if r.byID != nil && (id == uuid.Nil || r.byID.ID == id) {
		return cloneReviewScheduleRisk(r.byID), nil
	}
	for _, version := range r.versions {
		if version.ID == id {
			return cloneReviewScheduleRisk(version), nil
		}
	}
	return nil, nil
}

func (r *reviewScheduleRiskRepo) ListVersions(_ context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	result := make([]*entity.Risk, 0, len(r.versions))
	for _, version := range r.versions {
		if version.VersionGroupID == versionGroupID {
			result = append(result, cloneReviewScheduleRisk(version))
		}
	}
	return result, nil
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'TestUpdateRiskUseCase_(RequiresChangeReasonForSubstanceChangeInReassessment|AllowsScoreOnlyReassessmentWithoutSubstanceReason)' -count=1
```

Expected: first test FAILS because `UpdateRiskUseCase` currently allows substance changes without `changeReason`.

- [ ] **Step 3: Extend update output and guardrail**

Modify `backend/internal/usecase/risk/update.go`.

Change `UpdateRiskOutput` to:

```go
type UpdateRiskOutput struct {
	ID        uuid.UUID    `json:"id"`
	Code      string       `json:"code"`
	Message   string       `json:"message"`
	UpdatedAt fmt.Stringer `json:"updatedAt"` // time.Time implements Stringer
	Warnings  []string     `json:"warnings,omitempty"`
}
```

In `Execute`, after `existingRisk.Mitigations = input.Mitigations` and `existingRisk.CalculateAll()`, add:

```go
	var warnings []string
	if existingRisk.PreviousRiskID != nil {
		previousRisk, prevErr := uc.riskRepo.GetByID(ctx, *existingRisk.PreviousRiskID, orgIDs)
		if prevErr != nil {
			return nil, errors.Wrap(prevErr, "failed to load previous risk version")
		}
		substanceChanges := DetectSubstanceChanges(previousRisk, existingRisk)
		if len(substanceChanges) > 0 && strings.TrimSpace(input.ChangeReason) == "" {
			return nil, errors.Wrap(errors.ErrInvalidInput, "changeReason is required when monitoring changes risk substance")
		}
		warnings = BuildSubstanceChangeWarnings(previousRisk, existingRisk)
	}
```

Change the return value to include warnings:

```go
	return &UpdateRiskOutput{
		ID:        existingRisk.ID,
		Code:      existingRisk.Code,
		Message:   "Risk updated successfully",
		UpdatedAt: existingRisk.UpdatedAt,
		Warnings:  warnings,
	}, nil
```

- [ ] **Step 4: Run focused backend tests**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run 'TestUpdateRiskUseCase_(RequiresChangeReasonForSubstanceChangeInReassessment|AllowsScoreOnlyReassessmentWithoutSubstanceReason|ExecuteActivatesApprovedReassessmentVersion|ExecutePersistsReviewScheduleText)' -count=1
```

Expected: PASS.

- [ ] **Step 5: Run risk usecase package tests**

Run:

```bash
cd backend
go test ./internal/usecase/risk -count=1
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/usecase/risk/update.go backend/internal/usecase/risk/review_schedule_text_test.go
git commit -m "feat(risk): require reason for substance changes"
```

---

### Task 3: Frontend Substance Helpers

**Files:**
- Create: `frontend/src/lib/risk-assessment-substance.ts`
- Test: `frontend/src/lib/risk-assessment-substance.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/lib/risk-assessment-substance.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

const lib = await import(
  new URL("./risk-assessment-substance", import.meta.url).href
);

const {
  buildSubstanceDefaults,
  buildSubstancePayload,
  diffRiskSubstance,
  needsSubstanceChangeReason,
} = lib;

const sourceRisk = {
  title: "Risiko lama",
  description: "Deskripsi lama",
  category: "operasional",
  cause: ["Penyebab lama"],
  riskSource: "internal",
  controllability: "C",
  impactDesc: ["Dampak lama"],
  existingControl: "Kontrol lama",
  controlEffectiveness: "tidak_efektif",
  treatmentOption: "mitigasi",
  mitigations: [{ action: "Aksi lama", owner: "PIC lama", dueDate: "2026-06-30" }],
};

test("diffRiskSubstance ignores score-only changes", () => {
  const draft = { ...sourceRisk, probability: 4, impact: 5 };
  assert.deepEqual(diffRiskSubstance(sourceRisk, draft), []);
});

test("diffRiskSubstance reports changed substance fields", () => {
  const draft = {
    ...sourceRisk,
    description: "Deskripsi baru",
    cause: ["Penyebab lama", "Penyebab baru"],
  };
  const fields = diffRiskSubstance(sourceRisk, draft).map((item: { field: string }) => item.field);
  assert.deepEqual(fields, ["description", "cause"]);
});

test("needsSubstanceChangeReason only requires reason when substance edit is enabled and changed", () => {
  const defaults = buildSubstanceDefaults(sourceRisk);
  assert.equal(needsSubstanceChangeReason(sourceRisk, defaults, false), false);
  assert.equal(needsSubstanceChangeReason(sourceRisk, defaults, true), false);
  assert.equal(
    needsSubstanceChangeReason(sourceRisk, { ...defaults, existingControl: "Kontrol baru" }, true),
    true,
  );
});

test("buildSubstancePayload merges edited substance only when enabled", () => {
  const defaults = buildSubstanceDefaults(sourceRisk);
  const disabledPayload = buildSubstancePayload(sourceRisk, {
    enabled: false,
    values: { ...defaults, description: "Deskripsi baru" },
  });
  assert.equal(disabledPayload.description, "Deskripsi lama");

  const enabledPayload = buildSubstancePayload(sourceRisk, {
    enabled: true,
    values: { ...defaults, description: "Deskripsi baru" },
  });
  assert.equal(enabledPayload.description, "Deskripsi baru");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend
npm test -- src/lib/risk-assessment-substance.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Implement helper**

Create `frontend/src/lib/risk-assessment-substance.ts`:

```ts
import type { Risk, RiskMitigation } from "@/types/risk";

export type RiskSubstanceValues = {
  title: string;
  description: string;
  category: string;
  cause: string[];
  riskSource: string;
  controllability: string;
  impactDesc: string[];
  existingControl: string;
  controlEffectiveness: string;
  treatmentOption: string;
  mitigations: RiskMitigation[];
};

export type RiskSubstanceDiff = {
  field: string;
  label: string;
  before: unknown;
  after: unknown;
};

const substanceFields: Array<{
  field: keyof RiskSubstanceValues;
  label: string;
}> = [
  { field: "title", label: "Judul Risiko" },
  { field: "description", label: "Deskripsi Risiko" },
  { field: "category", label: "Kategori Risiko" },
  { field: "cause", label: "Penyebab" },
  { field: "riskSource", label: "Sumber Risiko" },
  { field: "controllability", label: "Controllability" },
  { field: "impactDesc", label: "Uraian Dampak" },
  { field: "existingControl", label: "Kontrol Eksisting" },
  { field: "controlEffectiveness", label: "Efektivitas Kontrol" },
  { field: "treatmentOption", label: "Opsi Penanganan" },
  { field: "mitigations", label: "Rencana Penanganan" },
];

export function buildSubstanceDefaults(risk: Partial<Risk>): RiskSubstanceValues {
  return {
    title: risk.title ?? "",
    description: risk.description ?? "",
    category: risk.category ?? "",
    cause: [...(risk.cause ?? [])],
    riskSource: risk.riskSource ?? "",
    controllability: risk.controllability ?? "",
    impactDesc: [...(risk.impactDesc ?? [])],
    existingControl: risk.existingControl ?? "",
    controlEffectiveness: risk.controlEffectiveness ?? "",
    treatmentOption: risk.treatmentOption ?? "",
    mitigations: [...(risk.mitigations ?? (risk.mitigation ? [risk.mitigation] : []))],
  };
}

export function diffRiskSubstance(
  previous: Partial<Risk>,
  candidate: Partial<Risk> | RiskSubstanceValues,
): RiskSubstanceDiff[] {
  const before = buildSubstanceDefaults(previous);
  const after = isSubstanceValues(candidate)
    ? candidate
    : buildSubstanceDefaults(candidate);

  return substanceFields
    .filter(({ field }) => !sameValue(before[field], after[field]))
    .map(({ field, label }) => ({
      field,
      label,
      before: before[field],
      after: after[field],
    }));
}

export function needsSubstanceChangeReason(
  previous: Partial<Risk>,
  values: RiskSubstanceValues,
  enabled: boolean,
) {
  return enabled && diffRiskSubstance(previous, values).length > 0;
}

export function buildSubstancePayload(
  risk: Partial<Risk>,
  input: { enabled: boolean; values: RiskSubstanceValues },
) {
  const values = input.enabled ? input.values : buildSubstanceDefaults(risk);
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    cause: values.cause.filter((item) => item.trim()),
    riskSource: values.riskSource,
    controllability: values.controllability,
    impactDesc: values.impactDesc.filter((item) => item.trim()),
    existingControl: values.existingControl,
    controlEffectiveness: values.controlEffectiveness,
    treatmentOption: values.treatmentOption,
    mitigations: values.mitigations,
  };
}

function isSubstanceValues(value: Partial<Risk> | RiskSubstanceValues): value is RiskSubstanceValues {
  return Array.isArray((value as RiskSubstanceValues).cause);
}

function sameValue(a: unknown, b: unknown) {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalize(item))
      .filter((item) => {
        if (typeof item === "string") return item.trim() !== "";
        if (item && typeof item === "object") return Object.keys(item).length > 0;
        return item !== null && item !== undefined;
      });
  }
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([key]) => !["id", "riskId", "createdAt", "updatedAt"].includes(key))
      .map(([key, item]) => [key, normalize(item)])
      .filter(([, item]) => item !== "" && item !== null && item !== undefined);
    return Object.fromEntries(entries);
  }
  return value;
}
```

- [ ] **Step 4: Run frontend helper tests**

Run:

```bash
cd frontend
npm test -- src/lib/risk-assessment-substance.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/risk-assessment-substance.ts frontend/src/lib/risk-assessment-substance.test.ts
git commit -m "feat(risk): add substance diff helpers"
```

---

### Task 4: API Type Contract

**Files:**
- Modify: `frontend/src/lib/api/risk-assessment.ts`

- [ ] **Step 1: Extend API types**

Modify `RiskAssessmentUpdateData` in `frontend/src/lib/api/risk-assessment.ts`:

```ts
export interface RiskAssessmentUpdateData {
  title?: string;
  description?: string;
  category?: string;
  organizationId?: string | null;
  cause?: string[];
  riskSource?: string;
  controllability?: string;
  impactDesc?: string[];
  existingControl?: string;
  controlEffectiveness?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  nilai?: number;
  inherentScore?: number;
  inherent_score?: number;
  riskPriority?: number;
  riskAppetite?: string;
  treatmentOption?: string;
  mitigations?: unknown[];
  targetProbability?: number;
  targetImpact?: number;
  targetWeight?: number;
  targetNilai?: number;
  assessmentCycle?: string;
  reviewType?: string;
  changeReason?: string;
  change_reason?: string;
  reviewSummary?: string;
  review_summary?: string;
  draftApprovalLine?: Array<{ id: string; name: string; type?: string }>;
}
```

Add an output type:

```ts
export interface RiskAssessmentUpdateResult {
  id: string;
  code: string;
  message: string;
  updatedAt?: string;
  warnings?: string[];
}
```

Change `updateRiskAssessment` return type:

```ts
export async function updateRiskAssessment(
  token: string,
  riskId: string,
  data: RiskAssessmentUpdateData & Record<string, unknown>,
): Promise<RiskAssessmentUpdateResult> {
  return api.put<RiskAssessmentUpdateResult>(
    `/risks/${riskId}`,
    data,
    token,
  );
}
```

- [ ] **Step 2: Run TypeScript build**

Run:

```bash
cd frontend
npm run build
```

Expected: build may fail later because the page still assumes no warnings are returned. If it fails only on unused imports or incompatible result type from this file, fix those directly in this task. If it fails on the assessment page feature not being implemented yet, continue to Task 5.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/risk-assessment.ts
git commit -m "feat(risk): type assessment update response"
```

---

### Task 5: Extract Reusable Substance Fields

**Files:**
- Create: `frontend/src/components/risk/risk-substance-fields.tsx`
- Reference: `frontend/src/app/(app)/risk/register/new/page.tsx`

- [ ] **Step 1: Create reusable field component**

Create `frontend/src/components/risk/risk-substance-fields.tsx` by extracting the same field patterns already used in `frontend/src/app/(app)/risk/register/new/page.tsx` for identification, control, treatment, and mitigation fields:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EditableItemsTable } from "@/components/shared/editable-items-table";
import { EditableList } from "@/components/shared/editable-list";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import type { RiskSubstanceValues } from "@/lib/risk-assessment-substance";

type RemoteUserPickerResult = {
  options: UserPickerOption[];
  total: number;
  page: number;
  limit: number;
};

type RiskSubstanceFieldsProps = {
  values: RiskSubstanceValues;
  disabled?: boolean;
  onChange: (values: RiskSubstanceValues) => void;
  loadPicOptions?: (params: {
    q: string;
    page: number;
    limit: number;
  }) => Promise<RemoteUserPickerResult>;
};

const riskCategoryOptions = [
  { value: "kebijakan", label: "Kebijakan" },
  { value: "operasional", label: "Operasional" },
  { value: "kepatuhan", label: "Kepatuhan" },
  { value: "fraud_korupsi", label: "Fraud/Korupsi" },
  { value: "reputasi", label: "Reputasi" },
  { value: "legal", label: "Legal" },
] as const;

const treatmentOptionOptions = [
  { value: "avoid", label: "Menghindari risiko" },
  { value: "transfer", label: "Berbagi risiko" },
  { value: "mitigate", label: "Mitigasi" },
  { value: "accept", label: "Menerima risiko" },
] as const;

export function RiskSubstanceFields({
  values,
  disabled,
  onChange,
  loadPicOptions,
}: RiskSubstanceFieldsProps) {
  const update = <K extends keyof RiskSubstanceValues>(
    field: K,
    value: RiskSubstanceValues[K],
  ) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label>Judul Risiko</Label>
        <Input
          value={values.title}
          disabled={disabled}
          onChange={(event) => update("title", event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Deskripsi Risiko</Label>
        <Textarea
          value={values.description}
          disabled={disabled}
          className="min-h-[120px]"
          onChange={(event) => update("description", event.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label>Kategori Risiko</Label>
        <Select
          value={values.category}
          onValueChange={(value) => update("category", value)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih kategori risiko" />
          </SelectTrigger>
          <SelectContent>
            {riskCategoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Penyebab</Label>
        <EditableItemsTable
          items={values.cause.map((text, index) => ({ id: `cause-${index}`, text }))}
          onChange={(items) => update("cause", items.map((item) => item.text))}
          placeholder="Tulis penyebab..."
          addItemLabel="Tambah Sebab"
          emptyMessage="Belum ada sebab"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Sumber Risiko</Label>
          <Select
            value={values.riskSource}
            onValueChange={(value) => update("riskSource", value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih sumber risiko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal</SelectItem>
              <SelectItem value="eksternal">Eksternal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Tingkat Kendali</Label>
          <Select
            value={values.controllability}
            onValueChange={(value) => update("controllability", value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih tingkat kendali" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="C">Controllable</SelectItem>
              <SelectItem value="UC">Uncontrollable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Uraian Dampak</Label>
        <EditableItemsTable
          items={values.impactDesc.map((text, index) => ({ id: `impact-${index}`, text }))}
          onChange={(items) => update("impactDesc", items.map((item) => item.text))}
          placeholder="Tulis dampak..."
          addItemLabel="Tambah Dampak"
          emptyMessage="Belum ada dampak"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-2">
        <Label>Pengendalian yang Ada</Label>
        <EditableList
          value={values.existingControl}
          onChange={(value) => update("existingControl", value)}
          placeholder="Tulis pengendalian yang sudah berjalan..."
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label>Efektivitas Pengendalian</Label>
          <Select
            value={values.controlEffectiveness}
            onValueChange={(value) => update("controlEffectiveness", value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Belum dinilai" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efektif">Efektif</SelectItem>
              <SelectItem value="tidak_efektif">Tidak efektif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Pilihan Penanganan</Label>
          <Select
            value={values.treatmentOption}
            onValueChange={(value) => update("treatmentOption", value)}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih penanganan" />
            </SelectTrigger>
            <SelectContent>
              {treatmentOptionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Rencana Penanganan</Label>
        <MitigationTable
          items={values.mitigations as MitigationItem[]}
          onChange={(items) => update("mitigations", items)}
          disabled={disabled}
          loadPicOptions={loadPicOptions}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS. If imports for `EditableItemsTable` or `EditableList` differ, inspect their existing import paths from `frontend/src/app/(app)/risk/register/new/page.tsx` and update this file to match.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/risk/risk-substance-fields.tsx
git commit -m "feat(risk): extract substance fields"
```

---

### Task 6: Monitoring Page Secondary Substance Section

**Files:**
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

- [ ] **Step 1: Add imports**

In `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`, extend lucide imports:

```ts
import {
  ArrowLeft,
  Loader2,
  Save,
  Send,
  SlidersHorizontal,
} from "lucide-react";
```

import { Switch } from "@/components/ui/switch";

Add helper imports:

```ts
import {
  buildSubstanceDefaults,
  buildSubstancePayload,
  diffRiskSubstance,
  needsSubstanceChangeReason,
  type RiskSubstanceValues,
} from "@/lib/risk-assessment-substance";
```

Add the extracted field component:

```ts
import { RiskSubstanceFields } from "@/components/risk/risk-substance-fields";
```

- [ ] **Step 2: Extend component state**

After `sourceRisk` state, add:

```ts
  const [substanceEditEnabled, setSubstanceEditEnabled] = useState(false);
  const [substanceValues, setSubstanceValues] = useState<RiskSubstanceValues>(
    () => buildSubstanceDefaults({}),
  );
```

After `computedNilai`, add:

```ts
  const substanceDiffs = sourceRisk
    ? diffRiskSubstance(sourceRisk, substanceValues)
    : [];
  const requiresSubstanceReason = sourceRisk
    ? needsSubstanceChangeReason(sourceRisk, substanceValues, substanceEditEnabled)
    : false;
  const isSubstanceSectionReady =
    !requiresSubstanceReason || Boolean(form.watch("changeReason")?.trim());
```

Change `defaultAccordionSections` to include the secondary section only when enabled:

```ts
  const defaultAccordionSections =
    riskApprovalCapabilityBehavior.showsApprovalLineEditor
      ? ["hasil-pemantauan", "approval-line"]
      : ["hasil-pemantauan"];
```

Keep this default unchanged. The secondary section should stay collapsed by default.

- [ ] **Step 3: Initialize substance defaults after risk load**

Inside `loadRiskData`, after `setDraftRisk(draft);` and `setSourceRisk(source);`, add:

```ts
        setSubstanceValues(buildSubstanceDefaults(draft));
        setSubstanceEditEnabled(false);
```

If variable names differ, place this immediately after the code that sets both draft and source risk.

- [ ] **Step 4: Keep field editing inside the extracted component**

No per-field update helpers are needed in `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`. The page owns only:

```ts
  const [substanceEditEnabled, setSubstanceEditEnabled] = useState(false);
  const [substanceValues, setSubstanceValues] = useState<RiskSubstanceValues>(
    () => buildSubstanceDefaults({}),
  );
```

The extracted `RiskSubstanceFields` component receives `onChange={setSubstanceValues}` and owns the local field update logic.

- [ ] **Step 5: Block submit when substance reason is missing**

In `onSubmit`, after the locked check and before `setIsSaving(true)`, add:

```ts
    if (requiresSubstanceReason && !values.changeReason.trim()) {
      toast.error("Alasan perubahan wajib diisi jika substansi risiko diubah.");
      return;
    }
```

- [ ] **Step 6: Merge substance payload**

In `onSubmit`, before `const payload = {`, add:

```ts
      const substancePayload = buildSubstancePayload(draftRisk, {
        enabled: substanceEditEnabled,
        values: substanceValues,
      });
```

Then replace these fields inside `payload`:

```ts
        title: draftRisk.title,
        description: draftRisk.description,
        category: draftRisk.category,
        cause: draftRisk.cause || [],
        riskSource: draftRisk.riskSource || "",
        controllability: draftRisk.controllability || "",
        impactDesc: draftRisk.impactDesc || [],
        existingControl: draftRisk.existingControl || "",
        controlEffectiveness: draftRisk.controlEffectiveness || "",
        treatmentOption: draftRisk.treatmentOption || "",
        mitigations: draftRisk.mitigations?.length
          ? draftRisk.mitigations
          : draftRisk.mitigation
            ? [draftRisk.mitigation]
            : [],
```

with:

```ts
        ...substancePayload,
```

Keep score, target, review, and approval fields as they are.

After `const result = await updateRiskAssessment(token, id, payload);`, add:

```ts
      if (result.warnings?.length) {
        toast.warning(result.warnings[0]);
      }
```

- [ ] **Step 7: Render secondary accordion**

Add this `AccordionItem` after the `hasil-pemantauan` item and before the approval-line item:

```tsx
            <AccordionItem
              value="substansi-risiko"
              className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 transition-all"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                      2
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                        Pembaruan Substansi Risiko
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Opsional, hanya jika konteks risiko berubah.
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                      substanceEditEnabled && substanceDiffs.length > 0
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    <span className="hidden sm:inline">
                      {substanceEditEnabled && substanceDiffs.length > 0
                        ? `${substanceDiffs.length} perubahan`
                        : "Tidak wajib"}
                    </span>
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-background px-4 py-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-foreground">
                      Ada perubahan substansi risiko?
                    </Label>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Aktifkan hanya jika penyebab, dampak, kontrol, opsi penanganan, atau rencana mitigasi perlu diperbarui.
                    </p>
                  </div>
                  <Switch
                    checked={substanceEditEnabled}
                    disabled={isAssessmentLocked}
                    onCheckedChange={setSubstanceEditEnabled}
                  />
                </div>

                {substanceEditEnabled && (
                  <div className="grid gap-4">
                    <RiskSubstanceFields
                      values={substanceValues}
                      disabled={isAssessmentLocked}
                      onChange={setSubstanceValues}
                    />

                    {substanceDiffs.length > 0 && (
                      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800">
                        <p className="font-medium">Perubahan substansi terdeteksi:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {substanceDiffs.map((diff) => (
                            <li key={diff.field}>{diff.label}</li>
                          ))}
                        </ul>
                        {!isSubstanceSectionReady && (
                          <p className="mt-3 text-xs font-medium">
                            Isi alasan perubahan skor/substansi sebelum mengajukan review.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
```

- [ ] **Step 8: Adjust approval-line numbering**

In the approval-line accordion trigger, change the number from `2` to `3`:

```tsx
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          3
                        </div>
```

- [ ] **Step 9: Add confirmation summary**

Inside the submit confirmation dialog body, before the approval-line summary block, add:

```tsx
          {substanceEditEnabled && substanceDiffs.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800">
              <p className="font-medium">Perubahan substansi yang akan diajukan:</p>
              <ul className="list-disc space-y-1 pl-5">
                {substanceDiffs.map((diff) => (
                  <li key={diff.field}>{diff.label}</li>
                ))}
              </ul>
            </div>
          )}
```

- [ ] **Step 10: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS. If TypeScript reports `MitigationTable` item type mismatch, map `substanceValues.mitigations` to `MitigationItem[]` with the same mapping already used for the read-only mitigation table in the page.

- [ ] **Step 11: Commit**

```bash
git add 'frontend/src/app/(app)/risk/assessment/[id]/page.tsx'
git commit -m "feat(risk): add monitoring substance section"
```

---

### Task 7: End-to-End Verification

**Files:**
- No code files expected unless verification finds defects.

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual browser check**

Start the frontend:

```bash
cd frontend
npm run dev
```

Open the monitoring draft page for an existing draft:

```text
http://localhost:3000/risk/assessment/<draft-risk-id>
```

Verify:

- `Hasil Pemantauan` opens by default.
- `Pembaruan Substansi Risiko` exists and is collapsed by default.
- Toggle enables substance fields.
- Changing a substance field shows a change summary.
- Submit is blocked when substance changed and `Alasan Perubahan Skor` is empty.
- Save draft sends changed substance fields.
- Approved or in-review drafts keep fields disabled.

- [ ] **Step 5: Commit verification fixes if needed**

If verification requires fixes:

```bash
git add <fixed-files>
git commit -m "fix(risk): polish monitoring substance update"
```

If no fixes are needed, skip this commit.

---

## Self-Review

Spec coverage:

- Secondary substance section: Task 6.
- Score reassessment remains primary: Task 6 keeps default accordion on `hasil-pemantauan`.
- Approved risks locked: Task 6 respects `isAssessmentLocked`; backend continues using draft update flow.
- Versioning preserved: Task 2 only updates the reassessment draft; existing approval activation remains unchanged.
- `changeReason` required for substance changes: Task 2 backend, Task 6 frontend.
- Before/after summary: Task 3 diff helper, Task 6 dialog and section summary.
- Fundamental-change warning: Task 1 helper, Task 2 response warning, Task 6 toast.
- Reuse of old implementation: Task 5 extracts the existing risk register field patterns instead of copying ad hoc inputs into the monitoring page.
- Testing: Tasks 1, 2, 3, and 7.

Placeholder scan:

- No implementation placeholders are left. The only optional branch is the explicit Task 6 verification-fix commit.

Type consistency:

- Backend uses `ChangeReason`, `PreviousRiskID`, `RiskOwnerID`, and `ControlOwnerID` from existing `entity.Risk`.
- Frontend uses existing `Risk`, `RiskMitigation`, `updateRiskAssessment`, and `MitigationTable`.
- Payload keys match current backend `UpdateRiskInput` JSON tags.

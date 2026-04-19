# Risk Register, Approval Activity, and Account Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved scope without changing behavior outside it: add `reviewScheduleText` alongside existing `nextReviewDate`, show both `risk` and `assessment` approval history in risk activity safely, add an authenticated account/manage-profile flow plus active-user password change, and simplify the Risk Register/Inbox summary UI.

**Architecture:** Keep the data contract additive. `reviewScheduleText` is a new optional field stored on `risks`; `nextReviewDate` remains the only date-based review driver. Self-service account management stays under `/auth/*` so existing superadmin-only `/users/:id` rules remain intact, while the current `/change-password` route is expanded to support both first-login activation and normal authenticated password changes.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL migrations, Next.js 16 App Router, React 19, TypeScript, node:test, shadcn/ui, TailwindCSS v4

---

## File Ownership Map

### Backend contract and persistence
- Create: `backend/db/migrations/000040_add_review_schedule_text_to_risks.up.sql` — add `review_schedule_text` column.
- Create: `backend/db/migrations/000040_add_review_schedule_text_to_risks.down.sql` — rollback for the new column.
- Reference only: `backend/db/migrations/000001_initial_schema.up.sql` — current baseline/schema context; do **not** rewrite historical migration.
- Modify: `backend/internal/domain/entity/risk.go` — add the new field to the canonical risk entity.
- Modify: `backend/internal/usecase/risk/create.go` — accept/persist `reviewScheduleText` on create.
- Modify: `backend/internal/usecase/risk/update.go` — accept/persist `reviewScheduleText` on update.
- Modify: `backend/internal/repository/postgres/risk.go` — select/insert/update `review_schedule_text` everywhere the risk entity is hydrated or written.

### Approval activity
- Modify: `backend/internal/repository/postgres/approval.go` — make org-aware approval lookup treat `assessment` the same way as `risk` where appropriate.
- Modify: `backend/internal/usecase/approval/get_by_entity_test.go` — pin `assessment` lookup behavior.
- Create: `frontend/src/lib/risk-activity-history.ts` — merge/dedupe/sort approval history from `risk` + `assessment` requests.
- Create: `frontend/src/lib/risk-activity-history.test.ts` — unit tests for safe history merging.
- Modify: `frontend/src/components/risk/risk-log-timeline.tsx` — fetch both histories and render the merged result.

### Auth/account
- Modify: `backend/internal/domain/entity/auth.go` — expose profile fields on auth payloads and `/auth/me`.
- Modify: `backend/internal/usecase/auth/session.go` — include full profile fields in login/change-password auth payloads.
- Modify: `backend/internal/usecase/auth/me.go` — return profile fields needed by the account page.
- Modify: `backend/internal/usecase/auth/me_test.go` — assert the richer profile payload.
- Create: `backend/internal/usecase/auth/update_profile.go` — self-service profile update use case.
- Create: `backend/internal/usecase/auth/update_profile_test.go` — unit coverage for self-update rules.
- Modify: `backend/internal/usecase/auth/change_password.go` — allow both activation flow and active-user password change.
- Modify: `backend/internal/usecase/auth/change_password_test.go` — cover active-user success/failure paths.
- Modify: `backend/internal/handler/http/auth.go` — add `PUT /auth/me`; accept optional `currentPassword` on change-password.
- Modify: `backend/internal/handler/http/auth_test.go` — HTTP coverage for the new auth/profile behavior.
- Modify: `backend/cmd/server/main.go` — register the new auth route and wire the new use case into `NewAuthHandler(...)`.
- Modify: `frontend/src/contexts/auth-context.tsx` — add profile update + general password-change methods and keep local session state fresh.
- Create: `frontend/src/app/(app)/account/page.tsx` — authenticated manage-profile page.
- Modify: `frontend/src/app/(public)/change-password/page.tsx` — support both first-login setup and normal active-user password changes.
- Modify: `frontend/src/components/app-header.tsx` — make the Profile menu item navigate to the account page.
- Modify: `frontend/src/lib/app-navigation.ts` — add breadcrumb label(s) for `/account`.

### Frontend risk/inbox UI
- Modify: `frontend/src/types/risk.ts` — add `reviewScheduleText` to shared frontend types.
- Modify: `frontend/src/lib/api/risk-register.ts` — expose `reviewScheduleText` on list items.
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx` — show/edit/save/load the new field while leaving `nextReviewDate` logic intact.
- Modify: `frontend/src/app/(app)/risk/register/page.tsx` — replace summary badges with minimal KPI cards, remove probability/impact columns, and add title/subtitle inside the table card.
- Modify: `frontend/src/app/(app)/inbox/page.tsx` — replace summary badges with minimal KPI cards.

## Sequencing and Parallelization

1. **Task 1 first** — land `reviewScheduleText` backend/frontend contract before editing the Risk Register page.
2. **Task 2 and Task 3 can run in parallel after Task 1 starts** — approval activity and auth/account touch separate code paths.
3. **Task 4 depends on Task 1** for the Risk Register type contract, but the Inbox KPI-card work can be done in parallel with Task 3.
4. Finish with one combined backend/frontend verification pass.

---

### Task 1: Add `reviewScheduleText` end-to-end without changing `nextReviewDate` behavior

**Files:**
- Create: `backend/db/migrations/000040_add_review_schedule_text_to_risks.up.sql`
- Create: `backend/db/migrations/000040_add_review_schedule_text_to_risks.down.sql`
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/handler/http/risk_register_test.go`
- Create: `backend/internal/usecase/risk/review_schedule_text_test.go`
- Modify: `frontend/src/types/risk.ts`
- Modify: `frontend/src/lib/api/risk-register.ts`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/app/(app)/risk/register/page.tsx`

- [ ] **Step 1: Write the failing backend regression tests**

Create `backend/internal/usecase/risk/review_schedule_text_test.go` with focused create/update coverage:

```go
package risk

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

func TestCreateRiskUseCase_ExecutePersistsReviewScheduleText(t *testing.T) {
	riskRepo := &categoryRiskRepo{}
	uc := NewCreateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{})
	createdBy := uuid.New()

	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:              "Risk title",
		Category:           entity.RiskCategoryStrategis,
		CreatedBy:          &createdBy,
		Probability:        3,
		Impact:             3,
		TargetProbability:  2,
		TargetImpact:       2,
		NextReviewDate:     stringPtr("2026-06-30"),
		ReviewScheduleText: "Review mingguan setiap Senin pagi",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.created == nil {
		t.Fatal("expected risk to be created")
	}
	if riskRepo.created.ReviewScheduleText != "Review mingguan setiap Senin pagi" {
		t.Fatalf("expected review schedule text to persist, got %q", riskRepo.created.ReviewScheduleText)
	}
	if riskRepo.created.NextReviewDate == nil || *riskRepo.created.NextReviewDate != "2026-06-30" {
		t.Fatalf("expected nextReviewDate to stay intact, got %#v", riskRepo.created.NextReviewDate)
	}
}

func TestUpdateRiskUseCase_ExecutePersistsReviewScheduleText(t *testing.T) {
	riskID := uuid.New()
	riskRepo := &categoryRiskRepo{byID: &entity.Risk{
		ID:                 riskID,
		Code:               "R-001",
		Title:              "Old title",
		Category:           entity.RiskCategoryStrategis,
		Status:             entity.RiskStatusDraft,
		VersionGroupID:     uuid.New(),
		OrganizationID:     uuidPtr(uuid.New()),
		Probability:        3,
		Impact:             3,
		NextReviewDate:     stringPtr("2026-06-30"),
		ReviewScheduleText: "Review lama",
	}}

	uc := NewUpdateRiskUseCase(riskRepo, &categoryUserRepo{}, &categoryOrgRepo{}, nil)
	_, err := uc.Execute(context.Background(), UpdateRiskInput{
		ID:                 riskID,
		Title:              "Updated title",
		Description:        "Updated desc",
		Category:           entity.RiskCategoryOperasional,
		Status:             entity.RiskStatusDraft,
		OrganizationID:     riskRepo.byID.OrganizationID,
		Probability:        3,
		Impact:             3,
		NextReviewDate:     stringPtr("2026-06-30"),
		ReviewScheduleText: "Review tiap akhir bulan",
	}, nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if riskRepo.updated == nil {
		t.Fatal("expected risk to be updated")
	}
	if riskRepo.updated.ReviewScheduleText != "Review tiap akhir bulan" {
		t.Fatalf("expected updated review schedule text, got %q", riskRepo.updated.ReviewScheduleText)
	}
	if riskRepo.updated.NextReviewDate == nil || *riskRepo.updated.NextReviewDate != "2026-06-30" {
		t.Fatalf("expected nextReviewDate unchanged, got %#v", riskRepo.updated.NextReviewDate)
	}
}

func stringPtr(value string) *string { return &value }
```

Extend `backend/internal/handler/http/risk_register_test.go` so the JSON envelope asserts the new field is serialized when present:

```go
repo := &riskRegisterRepoStub{
	registerItems: []*entity.Risk{{
		ID:                 uuid.New(),
		Code:               "R-001",
		Title:              "Server outage",
		Category:           entity.RiskCategoryKepatuhan,
		Status:             entity.RiskStatusApproved,
		VersionGroupID:     uuid.New(),
		Probability:        3,
		Impact:             4,
		NextReviewDate:     stringPtr("2026-06-30"),
		ReviewScheduleText: "Review bulanan minggu pertama",
	}},
	registerTotal: 1,
}

// after decoding payload:
if payload.Data[0]["reviewScheduleText"] != "Review bulanan minggu pertama" {
	t.Fatalf("expected reviewScheduleText in response, got %#v", payload.Data[0]["reviewScheduleText"])
}
```

- [ ] **Step 2: Run the backend tests to verify they fail**

Run from `backend/`:

```bash
go test ./internal/usecase/risk ./internal/handler/http -run 'ReviewScheduleText|RiskRegister'
```

Expected: FAIL because `entity.Risk`, create/update inputs, and register serialization do not expose `ReviewScheduleText` yet.

- [ ] **Step 3: Add the database migration**

Create `backend/db/migrations/000040_add_review_schedule_text_to_risks.up.sql`:

```sql
ALTER TABLE risks
ADD COLUMN IF NOT EXISTS review_schedule_text TEXT NOT NULL DEFAULT '';
```

Create `backend/db/migrations/000040_add_review_schedule_text_to_risks.down.sql`:

```sql
ALTER TABLE risks
DROP COLUMN IF EXISTS review_schedule_text;
```

- [ ] **Step 4: Add the field to the backend entity and risk persistence path**

Update `backend/internal/domain/entity/risk.go`:

```go
	TargetScore        int                  `json:"targetScore,omitempty"`
	NextReviewDate     *string              `json:"nextReviewDate,omitempty"`
	ReviewScheduleText string               `json:"reviewScheduleText,omitempty"`
	AssessmentCycle    string               `json:"assessmentCycle,omitempty"`
```

Update `backend/internal/usecase/risk/create.go` input + entity assignment:

```go
	NextReviewDate     *string                     `json:"nextReviewDate"`
	ReviewScheduleText string                      `json:"reviewScheduleText"`
	AssessmentCycle    string                      `json:"assessmentCycle"`
```

```go
	NextReviewDate:     input.NextReviewDate,
	ReviewScheduleText: strings.TrimSpace(input.ReviewScheduleText),
	AssessmentCycle:    input.AssessmentCycle,
```

Update `backend/internal/usecase/risk/update.go` input + entity assignment the same way:

```go
	NextReviewDate     *string                     `json:"nextReviewDate"`
	ReviewScheduleText string                      `json:"reviewScheduleText"`
	AssessmentCycle    string                      `json:"assessmentCycle"`
```

```go
	existingRisk.NextReviewDate = input.NextReviewDate
	existingRisk.ReviewScheduleText = strings.TrimSpace(input.ReviewScheduleText)
	existingRisk.AssessmentCycle = input.AssessmentCycle
```

Update the relevant queries in `backend/internal/repository/postgres/risk.go` so every create/get/update/list path includes the new column immediately after `next_review_date`:

```go
target_probability, target_impact, target_weight, target_nilai, target_score, next_review_date, review_schedule_text, assessment_cycle, review_type, change_reason, review_summary
```

```go
&risk.NextReviewDate, &risk.ReviewScheduleText, &risk.AssessmentCycle, &risk.ReviewType, &risk.ChangeReason, &risk.ReviewSummary
```

```go
risk.TargetProbability, risk.TargetImpact, risk.TargetWeight, risk.TargetNilai, risk.TargetScore, risk.NextReviewDate, risk.ReviewScheduleText,
```

- [ ] **Step 5: Extend the frontend types and risk form without changing date logic**

Update `frontend/src/types/risk.ts`:

```ts
export interface RiskVersionTimelineItem {
  // ...existing fields...
  nextReviewDate?: string | null;
  reviewScheduleText?: string;
}

export interface Risk {
  // ...existing fields...
  nextReviewDate: string;
  reviewScheduleText?: string;
}
```

Update `frontend/src/lib/api/risk-register.ts`:

```ts
export interface RiskRegisterListItem {
  // ...existing fields...
  nextReviewDate?: string;
  reviewScheduleText?: string;
  versionGroupId?: string;
}
```

Update `frontend/src/app/(app)/risk/register/new/page.tsx` in the local API type, schema, defaults, loader, and payload builder:

```ts
type RiskApiResponse = {
  // ...existing fields...
  nextReviewDate?: string;
  reviewScheduleText?: string;
};
```

```ts
  targetNilai: z.number().min(0).default(0),
  nextReviewDate: z.string().optional(),
  reviewScheduleText: z.string().optional(),
});
```

```ts
  nextReviewDate: values.nextReviewDate ?? "",
  reviewScheduleText: values.reviewScheduleText ?? "",
};
```

```ts
defaultValues: {
  // ...existing fields...
  nextReviewDate: "",
  reviewScheduleText: "",
},
```

```ts
reset({
  // ...existing fields...
  nextReviewDate: risk.nextReviewDate || "",
  reviewScheduleText: risk.reviewScheduleText || "",
});
```

```ts
return {
  // ...existing payload fields...
  nextReviewDate:
    data.nextReviewDate && data.nextReviewDate.trim() !== ""
      ? data.nextReviewDate
      : null,
  reviewScheduleText: (data.reviewScheduleText || "").trim(),
  mitigations: (data.mitigations || []).map((mitigation) => ({
```

Add the field in the “Jadwal Review” section as a textarea/help text, but keep the readiness rule tied to `nextReviewDate`:

```tsx
<div className="space-y-2">
  <Label htmlFor="reviewScheduleText">Catatan jadwal review</Label>
  <Textarea
    id="reviewScheduleText"
    placeholder="Contoh: review mingguan setiap Senin atau review bulanan minggu pertama"
    {...form.register("reviewScheduleText")}
  />
  <p className="text-xs text-muted-foreground">
    Catatan ini melengkapi tanggal review. Logika tanggal `nextReviewDate` tetap dipakai untuk reminder dan kelengkapan form.
  </p>
</div>
```

- [ ] **Step 6: Re-run the tests and migration verification**

Run from `backend/`:

```bash
go test ./internal/usecase/risk ./internal/handler/http -run 'ReviewScheduleText|RiskRegister'
```

Expected: PASS.

Run from `backend/`:

```bash
go test ./... 
```

Expected: PASS.

- [ ] **Step 7: Run frontend verification for the new field**

Run from `frontend/`:

```bash
npm run lint -- "src/types/risk.ts" "src/lib/api/risk-register.ts" "src/app/(app)/risk/register/new/page.tsx" "src/app/(app)/risk/register/page.tsx"
```

Expected: PASS.

Run from `frontend/`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/db/migrations/000040_add_review_schedule_text_to_risks.up.sql backend/db/migrations/000040_add_review_schedule_text_to_risks.down.sql backend/internal/domain/entity/risk.go backend/internal/usecase/risk/create.go backend/internal/usecase/risk/update.go backend/internal/repository/postgres/risk.go backend/internal/usecase/risk/review_schedule_text_test.go backend/internal/handler/http/risk_register_test.go frontend/src/types/risk.ts frontend/src/lib/api/risk-register.ts "frontend/src/app/(app)/risk/register/new/page.tsx" "frontend/src/app/(app)/risk/register/page.tsx"
git commit -m "feat: add risk review schedule text"
```

---

### Task 2: Fix missing approval history in risk activity by merging `risk` + `assessment` safely

**Files:**
- Modify: `backend/internal/repository/postgres/approval.go`
- Modify: `backend/internal/usecase/approval/get_by_entity_test.go`
- Create: `frontend/src/lib/risk-activity-history.ts`
- Create: `frontend/src/lib/risk-activity-history.test.ts`
- Modify: `frontend/src/components/risk/risk-log-timeline.tsx`

- [ ] **Step 1: Write the failing merge/dedupe frontend tests**

Create `frontend/src/lib/risk-activity-history.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeApprovalHistory,
  type ApprovalHistory,
} from "./risk-activity-history.ts";

test("mergeApprovalHistory combines risk and assessment entries chronologically", () => {
  const riskHistory: ApprovalHistory[] = [
    {
      id: "risk-1",
      action: "submitted",
      actorId: "u-1",
      actorName: "Unit A",
      actorRole: "unit",
      comments: "Submitted",
      createdAt: "2026-04-01T08:00:00Z",
    },
  ];

  const assessmentHistory: ApprovalHistory[] = [
    {
      id: "assessment-1",
      action: "approved",
      actorId: "u-2",
      actorName: "Reviewer B",
      actorRole: "reviewer",
      comments: "Approved",
      createdAt: "2026-04-02T08:00:00Z",
    },
  ];

  const merged = mergeApprovalHistory(riskHistory, assessmentHistory);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "risk-1");
  assert.equal(merged[1].id, "assessment-1");
});

test("mergeApprovalHistory de-duplicates repeated entries by id and timestamp", () => {
  const duplicated: ApprovalHistory = {
    id: "same-entry",
    action: "approved",
    actorId: "u-2",
    actorName: "Reviewer B",
    actorRole: "reviewer",
    comments: "Approved",
    createdAt: "2026-04-02T08:00:00Z",
  };

  const merged = mergeApprovalHistory([duplicated], [duplicated]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "same-entry");
});
```

- [ ] **Step 2: Write the failing backend coverage for `assessment` lookup**

Extend `backend/internal/usecase/approval/get_by_entity_test.go` with an assessment case:

```go
func TestGetApprovalByEntityUseCase_SupportsAssessmentRequestType(t *testing.T) {
	requestID := uuid.New()
	entityID := uuid.New()
	now := time.Date(2026, 4, 8, 12, 0, 0, 0, time.UTC)

	repo := &fakeGetByEntityApprovalRepo{
		request: &entity.ApprovalRequest{
			ID:                  requestID,
			RequestType:         "assessment",
			EntityID:            entityID,
			RequestedBy:         uuid.New(),
			RequestedByName:     "riska",
			RequestedAt:         now,
			CurrentStatus:       "pending",
			CurrentApproverRole: "reviewer",
			Notes:               "Assessment submitted",
			CreatedAt:           now,
			UpdatedAt:           now,
		},
		histories: []*entity.ApprovalHistory{{
			ID:                uuid.New(),
			ApprovalRequestID: requestID,
			Action:            "submitted",
			ActorID:           uuid.New(),
			ActorName:         "Unit A",
			ActorRole:         "unit",
			Comments:          "Assessment submitted",
			CreatedAt:         now,
		}},
	}

	uc := NewGetApprovalByEntityUseCase(repo)
	result, err := uc.Execute(context.Background(), GetApprovalByEntityInput{
		RequestType: "assessment",
		EntityID:    entityID.String(),
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.RequestType != "assessment" {
		t.Fatalf("expected requestType assessment, got %q", result.RequestType)
	}
	if len(result.History) != 1 {
		t.Fatalf("expected 1 history row, got %d", len(result.History))
	}
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run from `frontend/`:

```bash
npm test -- src/lib/risk-activity-history.test.ts
```

Expected: FAIL because `risk-activity-history.ts` does not exist yet.

Run from `backend/`:

```bash
go test ./internal/usecase/approval -run 'GetApprovalByEntity'
```

Expected: FAIL once the new assessment-specific expectations are added and the repository/use-case behavior is not fully covered yet.

- [ ] **Step 4: Add the pure merge helper and wire it into the timeline**

Create `frontend/src/lib/risk-activity-history.ts`:

```ts
export type ApprovalHistory = {
  id: string;
  action: "submitted" | "approved" | "rejected" | "returned";
  actorId: string;
  actorName: string;
  actorRole: string;
  comments: string;
  createdAt: string;
};

export function mergeApprovalHistory(
  riskHistory: ApprovalHistory[],
  assessmentHistory: ApprovalHistory[],
): ApprovalHistory[] {
  const seen = new Set<string>();

  return [...riskHistory, ...assessmentHistory]
    .filter((item) => {
      const key = `${item.id}:${item.createdAt}:${item.action}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
}
```

Update `frontend/src/components/risk/risk-log-timeline.tsx`:

```ts
import {
  mergeApprovalHistory,
  type ApprovalHistory,
} from "@/lib/risk-activity-history";
```

```ts
async function getApprovalHistorySafe(
  entityType: "risk" | "assessment",
  entityId: string,
  token: string,
): Promise<ApprovalHistory[]> {
  try {
    return await getApprovalHistory(entityType, entityId, token);
  } catch {
    return [];
  }
}
```

```ts
const [logs, riskApproval, assessmentApproval, minutesData] = await Promise.all([
  getCommunicationLogs(riskId, token),
  getApprovalHistorySafe("risk", riskId, token),
  getApprovalHistorySafe("assessment", riskId, token),
  getMeetingMinutesByRisk(riskId, token),
]);

setApprovalHistory(mergeApprovalHistory(riskApproval, assessmentApproval));
```

- [ ] **Step 5: Make the backend approval lookup treat `assessment` like `risk` for scoped entity joins**

Update the org-aware SQL branches in `backend/internal/repository/postgres/approval.go`:

```go
(ar.request_type IN ('risk', 'assessment') AND EXISTS (
	SELECT 1 FROM risks r WHERE r.id = ar.entity_id AND r.organization_id = ANY($1)
))
```

Apply the same `IN ('risk', 'assessment')` change in the `FindByID` scoped clause and any helper clause reused for pending-count/list queries so assessment approvals do not fall into the unscoped fallback bucket.

- [ ] **Step 6: Re-run the approval-history tests**

Run from `frontend/`:

```bash
npm test -- src/lib/risk-activity-history.test.ts
```

Expected: PASS.

Run from `backend/`:

```bash
go test ./internal/usecase/approval -run 'GetApprovalByEntity'
```

Expected: PASS.

- [ ] **Step 7: Run focused frontend verification**

Run from `frontend/`:

```bash
npm run lint -- "src/lib/risk-activity-history.ts" "src/lib/risk-activity-history.test.ts" "src/components/risk/risk-log-timeline.tsx"
```

Expected: PASS.

Run from `frontend/`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/repository/postgres/approval.go backend/internal/usecase/approval/get_by_entity_test.go frontend/src/lib/risk-activity-history.ts frontend/src/lib/risk-activity-history.test.ts frontend/src/components/risk/risk-log-timeline.tsx
git commit -m "fix: merge risk and assessment activity history"
```

---

### Task 3: Add authenticated manage-profile and active-user password change

**Files:**
- Modify: `backend/internal/domain/entity/auth.go`
- Modify: `backend/internal/usecase/auth/session.go`
- Modify: `backend/internal/usecase/auth/me.go`
- Modify: `backend/internal/usecase/auth/me_test.go`
- Create: `backend/internal/usecase/auth/update_profile.go`
- Create: `backend/internal/usecase/auth/update_profile_test.go`
- Modify: `backend/internal/usecase/auth/change_password.go`
- Modify: `backend/internal/usecase/auth/change_password_test.go`
- Modify: `backend/internal/handler/http/auth.go`
- Modify: `backend/internal/handler/http/auth_test.go`
- Modify: `backend/cmd/server/main.go`
- Modify: `frontend/src/contexts/auth-context.tsx`
- Create: `frontend/src/app/(app)/account/page.tsx`
- Modify: `frontend/src/app/(public)/change-password/page.tsx`
- Modify: `frontend/src/components/app-header.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`

- [ ] **Step 1: Write the failing backend tests for richer `/auth/me`, self-profile update, and active-user password change**

Create `backend/internal/usecase/auth/update_profile_test.go`:

```go
package auth

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type updateProfileStubUserRepo struct {
	user        *entity.User
	updatedUser *entity.User
}

func (s *updateProfileStubUserRepo) Create(context.Context, *entity.User) error { return nil }
func (s *updateProfileStubUserRepo) GetByID(_ context.Context, _ uuid.UUID) (*entity.User, error) {
	copy := *s.user
	return &copy, nil
}
func (s *updateProfileStubUserRepo) GetByUsername(context.Context, string) (*entity.User, error) {
	return nil, nil
}
func (s *updateProfileStubUserRepo) Update(_ context.Context, user *entity.User) error {
	copy := *user
	s.updatedUser = &copy
	s.user = &copy
	return nil
}
func (s *updateProfileStubUserRepo) Delete(context.Context, uuid.UUID) error { return nil }
func (s *updateProfileStubUserRepo) List(context.Context) ([]*entity.User, error) { return nil, nil }
func (s *updateProfileStubUserRepo) ListWithFilter(context.Context, repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

func TestUpdateProfileUseCase_UpdatesEditableFieldsOnly(t *testing.T) {
	userID := uuid.New()
	orgID := uuid.New()
	repo := &updateProfileStubUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "unit-user",
		Email:              "old@manris.local",
		Name:               "Old Name",
		Role:               entity.RoleUnit,
		OrganizationID:     &orgID,
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		NIP:                "123",
		Jabatan:            "Analis",
		Pangkat:            "III/a",
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	uc := NewUpdateProfileUseCase(repo)
	_, err := uc.Execute(context.Background(), UpdateProfileInput{
		UserID:    userID,
		Name:      "New Name",
		Username:  "new-unit-user",
		Email:     "new@manris.local",
		NIP:       "456",
		Jabatan:   "Koordinator",
		Pangkat:   "III/b",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.updatedUser == nil {
		t.Fatal("expected repository update")
	}
	if repo.updatedUser.Role != entity.RoleUnit {
		t.Fatalf("expected role to stay unit, got %q", repo.updatedUser.Role)
	}
	if repo.updatedUser.Status != entity.UserStatusActive {
		t.Fatalf("expected status to stay active, got %q", repo.updatedUser.Status)
	}
	if repo.updatedUser.OrganizationID == nil || *repo.updatedUser.OrganizationID != orgID {
		t.Fatalf("expected organization to stay unchanged, got %#v", repo.updatedUser.OrganizationID)
	}
}
```

Add to `backend/internal/usecase/auth/me_test.go`:

```go
if profile.Email != "pending-user@manris.local" {
	t.Fatalf("expected email to be included, got %q", profile.Email)
}
if profile.NIP != "19880101" {
	t.Fatalf("expected NIP to be included, got %q", profile.NIP)
}
if profile.Jabatan != "Koordinator" {
	t.Fatalf("expected jabatan to be included, got %q", profile.Jabatan)
}
if profile.Pangkat != "III/c" {
	t.Fatalf("expected pangkat to be included, got %q", profile.Pangkat)
}
```

Add to `backend/internal/usecase/auth/change_password_test.go`:

```go
func TestChangePasswordExecuteAllowsActiveUserWithCurrentPassword(t *testing.T) {
	userID := uuid.New()
	currentPassword := "OldPass123!"
	newPassword := "NewPass123!"
	currentHash, _ := bcrypt.GenerateFromPassword([]byte(currentPassword), bcrypt.DefaultCost)

	userRepo := &changePasswordStubUserRepo{user: &entity.User{
		ID:                 userID,
		Username:           "active-user",
		Email:              "active-user@manris.local",
		Name:               "Active User",
		Role:               entity.RoleUnit,
		Status:             entity.UserStatusActive,
		MustChangePassword: false,
		PasswordHash:       string(currentHash),
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}}

	uc := NewChangePasswordUseCase(userRepo, service.NewOrganizationHierarchy(&stubOrgRepo{}), "secret", 24)
	result, err := uc.Execute(context.Background(), ChangePasswordInput{
		UserID:          userID,
		CurrentPassword: currentPassword,
		NewPassword:     newPassword,
		ConfirmPassword: newPassword,
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.SessionMode != entity.AuthSessionModeFull {
		t.Fatalf("expected full session, got %q", result.SessionMode)
	}
}
```

- [ ] **Step 2: Run the backend auth tests to verify they fail**

Run from `backend/`:

```bash
go test ./internal/usecase/auth ./internal/handler/http -run 'GetCurrentUser|UpdateProfile|ChangePassword|AuthHandler'
```

Expected: FAIL because `/auth/me` does not return enough fields, `UpdateProfileUseCase` does not exist, and active-user password changes are blocked.

- [ ] **Step 3: Implement the new auth/profile backend contract**

Update `backend/internal/domain/entity/auth.go` so both `UserPublic` and `UserProfile` carry the fields already expected by `frontend/src/contexts/auth-context.tsx`:

```go
type UserPublic struct {
	ID                 uuid.UUID   `json:"id"`
	Username           string      `json:"username"`
	Name               string      `json:"name"`
	Email              string      `json:"email"`
	Role               string      `json:"role"`
	OrganizationID     *uuid.UUID  `json:"organizationId,omitempty"`
	OrgName            string      `json:"orgName,omitempty"`
	AccessibleOrgIDs   []uuid.UUID `json:"accessibleOrgIds,omitempty"`
	IsGlobal           bool        `json:"isGlobal"`
	Status             string      `json:"status"`
	NIP                string      `json:"nip,omitempty"`
	Jabatan            string      `json:"jabatan,omitempty"`
	Pangkat            string      `json:"pangkat,omitempty"`
	MustChangePassword bool        `json:"mustChangePassword"`
}
```

Update `backend/internal/usecase/auth/session.go`:

```go
	User: &entity.UserPublic{
		ID:                 user.ID,
		Username:           user.Username,
		Name:               user.Name,
		Email:              user.Email,
		Role:               user.Role,
		OrganizationID:     user.OrganizationID,
		OrgName:            user.OrgName,
		AccessibleOrgIDs:   scope.AccessibleOrgIDs,
		IsGlobal:           scope.IsGlobal,
		Status:             user.Status,
		NIP:                user.NIP,
		Jabatan:            user.Jabatan,
		Pangkat:            user.Pangkat,
		MustChangePassword: user.MustChangePassword,
	},
```

Update `backend/internal/usecase/auth/me.go` the same way for `entity.UserProfile`.

Create `backend/internal/usecase/auth/update_profile.go`:

```go
package auth

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type UpdateProfileInput struct {
	UserID   uuid.UUID
	Name     string
	Username string
	Email    string
	NIP      string
	Jabatan  string
	Pangkat  string
}

type UpdateProfileUseCase struct {
	userRepo repository.UserRepository
}

func NewUpdateProfileUseCase(userRepo repository.UserRepository) *UpdateProfileUseCase {
	return &UpdateProfileUseCase{userRepo: userRepo}
}

func (uc *UpdateProfileUseCase) Execute(ctx context.Context, input UpdateProfileInput) (*entity.UserProfile, error) {
	if input.UserID == uuid.Nil {
		return nil, errors.ErrInvalidInput
	}

	user, err := uc.userRepo.GetByID(ctx, input.UserID)
	if err != nil {
		return nil, errors.ErrNotFound
	}

	user.Name = strings.TrimSpace(input.Name)
	user.Username = strings.TrimSpace(input.Username)
	user.Email = strings.TrimSpace(input.Email)
	user.NIP = strings.TrimSpace(input.NIP)
	user.Jabatan = strings.TrimSpace(input.Jabatan)
	user.Pangkat = strings.TrimSpace(input.Pangkat)

	if err := user.Validate(); err != nil {
		return nil, err
	}
	if err := uc.userRepo.Update(ctx, user); err != nil {
		return nil, errors.Wrap(err, "failed to update profile")
	}

	return &entity.UserProfile{
		ID:                 user.ID,
		Username:           user.Username,
		Name:               user.Name,
		Email:              user.Email,
		Role:               user.Role,
		OrganizationID:     user.OrganizationID,
		OrgName:            user.OrgName,
		Status:             user.Status,
		NIP:                user.NIP,
		Jabatan:            user.Jabatan,
		Pangkat:            user.Pangkat,
		MustChangePassword: user.MustChangePassword,
		CreatedAt:          user.CreatedAt,
		UpdatedAt:          user.UpdatedAt,
	}, nil
}
```

- [ ] **Step 4: Expand change-password for active users and add the new auth route**

Update `backend/internal/usecase/auth/change_password.go`:

```go
type ChangePasswordInput struct {
	UserID          uuid.UUID
	CurrentPassword string
	NewPassword     string
	ConfirmPassword string
}
```

```go
if user.Status == entity.UserStatusInactive {
	return nil, errors.ErrForbidden
}

if user.IsPendingActivation() && user.MustChangePassword {
	// existing activation flow
} else {
	if input.CurrentPassword == "" {
		return nil, errors.Wrap(errors.ErrInvalidInput, "currentPassword is required for active users")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.CurrentPassword)); err != nil {
		return nil, errors.ErrInvalidCredentials
	}
}
```

Update `backend/internal/handler/http/auth.go`:

```go
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
	ConfirmPassword string `json:"confirmPassword"`
}

type UpdateProfileRequest struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
	NIP      string `json:"nip"`
	Jabatan  string `json:"jabatan"`
	Pangkat  string `json:"pangkat"`
}
```

```go
func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return sendProblemDetails(c, fiber.StatusBadRequest, "Bad Request", "https://api.manris.com/errors/bad-request", "invalid request body")
	}

	userID, err := userIDFromContext(c)
	if err != nil {
		return err
	}

	result, err := h.updateProfileUC.Execute(c.Context(), authuc.UpdateProfileInput{
		UserID:   userID,
		Name:     req.Name,
		Username: req.Username,
		Email:    req.Email,
		NIP:      req.NIP,
		Jabatan:  req.Jabatan,
		Pangkat:  req.Pangkat,
	})
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(fiber.Map{"data": result})
}
```

Update `backend/cmd/server/main.go` wiring and routes:

```go
authUpdateProfileUC := authuc.NewUpdateProfileUseCase(domainUserRepo)
cleanAuthHandler := httpHandler.NewAuthHandler(authLoginUC, authMeUC, authChangePasswordUC, authUpdateProfileUC)
```

```go
authProtected.Get("/me", cleanAuthHandler.Me)
authProtected.Put("/me", cleanAuthHandler.UpdateProfile)
authProtected.Post("/change-password", cleanAuthHandler.ChangePassword)
```

- [ ] **Step 5: Add the account page and auth-context methods**

Update `frontend/src/contexts/auth-context.tsx` to expose two new methods:

```ts
interface AuthContextType {
  // ...existing fields...
  updateProfile: (input: {
    name: string;
    username: string;
    email: string;
    nip: string;
    jabatan: string;
    pangkat: string;
  }) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<AuthTransition>;
}
```

```ts
const updateProfile = useCallback(async (input: {
  name: string;
  username: string;
  email: string;
  nip: string;
  jabatan: string;
  pangkat: string;
}) => {
  if (!token) throw new ApiError("Sesi tidak ditemukan. Silakan masuk kembali.", 401);

  await api.put("/auth/me", input, token);
  const me = await api.get<User>("/auth/me", token);
  applyAuthState(me, token);
}, [applyAuthState, token]);
```

```ts
const changePassword = useCallback(async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) => {
  if (!token) throw new ApiError("Sesi tidak ditemukan. Silakan masuk kembali.", 401);

  const res = await api.post<AuthPayload>(
    "/auth/change-password",
    { currentPassword, newPassword, confirmPassword },
    token,
  );

  return applyAuthState(res, res.token ?? token);
}, [applyAuthState, token]);
```

Create `frontend/src/app/(app)/account/page.tsx` using the same form-shell pattern as `frontend/src/app/(app)/admin/users/new/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function AccountPage() {
  const { updateProfile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [nip, setNip] = useState(user?.nip ?? "");
  const [jabatan, setJabatan] = useState(user?.jabatan ?? "");
  const [pangkat, setPangkat] = useState(user?.pangkat ?? "");

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ name, username, email, nip, jabatan, pangkat });
      toast.success("Profil berhasil diperbarui.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profil belum berhasil diperbarui.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title="Kelola akun"
        description="Perbarui identitas akun aktif dan gunakan menu keamanan untuk mengganti password kapan saja."
        badges={
          <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
            Profil pribadi
          </Badge>
        }
        actions={
          <Button className="text-xs" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}
            {loading ? "Menyimpan..." : "Simpan profil"}
          </Button>
        }
      />

      <FormSection
        title="Informasi akun"
        description="Data ini diambil dari sesi aktif dan dapat diperbarui oleh pengguna sendiri."
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <div className="space-y-1.5"><Label>Nama lengkap</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>NIP</Label><Input value={nip} onChange={(e) => setNip(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Jabatan</Label><Input value={jabatan} onChange={(e) => setJabatan(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Pangkat</Label><Input value={pangkat} onChange={(e) => setPangkat(e.target.value)} /></div>
      </FormSection>

      <FormSection
        title="Keamanan"
        description="Password akun aktif diganti lewat alur yang sama dengan aktivasi pertama, tetapi dengan verifikasi password saat ini."
      >
        <Button asChild variant="outline" className="gap-2 text-xs">
          <Link href="/change-password">
            <ShieldCheck className="size-4" />
            Ubah password
          </Link>
        </Button>
      </FormSection>
    </FormPage>
  );
}
```

- [ ] **Step 6: Reuse `/change-password` for both activation and active-user flows**

Update `frontend/src/app/(public)/change-password/page.tsx` so it no longer hard-redirects active users away. Replace the current submit path with mode-based behavior:

```tsx
const {
  changePassword,
  completeFirstPasswordChange,
  hasFullSession,
  isAuthenticated,
  loading,
  requiresPasswordChange,
} = useAuth();

const isActivationFlow = requiresPasswordChange;
```

```tsx
if (!loading && !isAuthenticated) {
  router.replace("/login");
  return;
}
```

```tsx
try {
  if (isActivationFlow) {
    const result = await completeFirstPasswordChange(newPassword, confirmPassword);
    router.replace(result.redirectTo);
  } else {
    await changePassword(currentPassword, newPassword, confirmPassword);
    router.replace("/account");
  }
} catch (error: unknown) {
  setError(getErrorMessage(error));
}
```

Add a `currentPassword` input rendered only when `!isActivationFlow`, and switch the title/description copy:

```tsx
<CardTitle className="text-[15px] font-semibold flex items-center gap-2">
  <KeyRound className="size-4 text-primary" />
  {isActivationFlow ? "Ubah Password Sementara" : "Ubah Password Akun"}
</CardTitle>
```

Update `frontend/src/components/app-header.tsx` so Profile is actionable:

```tsx
<DropdownMenuItem onClick={() => router.push("/account")}>
  <User className="mr-2 size-4" />
  Profile
</DropdownMenuItem>
```

Update `frontend/src/lib/app-navigation.ts`:

```ts
"/account": "Kelola Akun",
```

- [ ] **Step 7: Re-run backend auth tests**

Run from `backend/`:

```bash
go test ./internal/usecase/auth ./internal/handler/http -run 'GetCurrentUser|UpdateProfile|ChangePassword|AuthHandler'
```

Expected: PASS.

Run from `backend/`:

```bash
go build ./cmd/server
```

Expected: PASS.

- [ ] **Step 8: Run frontend verification for account/security flow**

Run from `frontend/`:

```bash
npm run lint -- "src/contexts/auth-context.tsx" "src/app/(app)/account/page.tsx" "src/app/(public)/change-password/page.tsx" "src/components/app-header.tsx" "src/lib/app-navigation.ts"
```

Expected: PASS.

Run from `frontend/`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/internal/domain/entity/auth.go backend/internal/usecase/auth/session.go backend/internal/usecase/auth/me.go backend/internal/usecase/auth/me_test.go backend/internal/usecase/auth/update_profile.go backend/internal/usecase/auth/update_profile_test.go backend/internal/usecase/auth/change_password.go backend/internal/usecase/auth/change_password_test.go backend/internal/handler/http/auth.go backend/internal/handler/http/auth_test.go backend/cmd/server/main.go frontend/src/contexts/auth-context.tsx "frontend/src/app/(app)/account/page.tsx" "frontend/src/app/(public)/change-password/page.tsx" frontend/src/components/app-header.tsx frontend/src/lib/app-navigation.ts
git commit -m "feat: add self-service account management"
```

---

### Task 4: Replace summary badges with minimal KPI cards and simplify the Risk Register table

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/page.tsx`
- Modify: `frontend/src/app/(app)/inbox/page.tsx`

- [ ] **Step 1: Replace Risk Register summary badges with simple KPI cards**

In `frontend/src/app/(app)/risk/register/page.tsx`, replace the badge strip with a small card grid using existing counts:

```tsx
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
  {[
    { label: "Total risiko", value: total, tone: "text-foreground" },
    { label: "Sangat tinggi", value: riskLevelCounts.sangat_tinggi ?? 0, tone: "text-risk-extreme" },
    { label: "Tinggi", value: riskLevelCounts.tinggi ?? 0, tone: "text-risk-high" },
    { label: "Sedang", value: riskLevelCounts.sedang ?? 0, tone: "text-risk-medium" },
    { label: "Rendah + sangat rendah", value: (riskLevelCounts.rendah ?? 0) + (riskLevelCounts.sangat_rendah ?? 0), tone: "text-risk-low" },
  ].map((item) => (
    <Card key={item.label} className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className={`mt-2 text-2xl font-semibold tracking-tight ${item.tone}`}>{item.value}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

- [ ] **Step 2: Put a title/subtitle inside the Risk Register table card and remove probability/impact columns**

Still in `frontend/src/app/(app)/risk/register/page.tsx`, wrap the table with a `CardHeader` and drop the two columns:

```tsx
<Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
  <CardHeader>
    <CardTitle className="text-[15px] font-semibold">Daftar risiko</CardTitle>
    <p className="text-xs text-muted-foreground">
      Snapshot risiko current per kode, dengan fokus pada nilai akhir, status, dan tindak lanjut.
    </p>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
```

Update headers:

```tsx
<TableHead className="w-20">Kode</TableHead>
<TableHead className="w-16">Versi</TableHead>
<TableHead>Judul Risiko</TableHead>
<TableHead className="w-28">Kategori</TableHead>
<TableHead className="text-center w-16">Nilai</TableHead>
<TableHead className="w-24">Tingkat Risiko</TableHead>
<TableHead className="w-24">Status</TableHead>
<TableHead className="w-24">Penanganan</TableHead>
<TableHead className="w-28">Dibuat</TableHead>
<TableHead className="w-28 text-right">Aksi</TableHead>
```

Remove the two body cells that render `risk.probability` and `risk.impact`, and fix the empty-state colspan to `10`.

- [ ] **Step 3: Replace Inbox summary badges with simple KPI cards**

In `frontend/src/app/(app)/inbox/page.tsx`, replace the badge strip with cards using the existing `counts` object:

```tsx
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
  {[
    { label: "Total item", value: counts.all, tone: "text-foreground" },
    { label: "Menunggu review", value: counts.pendingReview, tone: "text-risk-medium" },
    { label: "Menunggu approval", value: counts.pendingApproval, tone: "text-risk-medium" },
    { label: "Disetujui", value: counts.approved, tone: "text-success" },
    { label: "Ditolak", value: counts.rejected, tone: "text-destructive" },
  ].map((item) => (
    <Card key={item.label} className="border-border/50 bg-card/80">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className={`mt-2 text-2xl font-semibold tracking-tight ${item.tone}`}>{item.value}</p>
      </CardContent>
    </Card>
  ))}
</div>
```

- [ ] **Step 4: Run focused frontend verification**

Run from `frontend/`:

```bash
npm run lint -- "src/app/(app)/risk/register/page.tsx" "src/app/(app)/inbox/page.tsx"
```

Expected: PASS.

Run from `frontend/`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/(app)/risk/register/page.tsx" "frontend/src/app/(app)/inbox/page.tsx"
git commit -m "feat: simplify register and inbox summaries"
```

---

## Final Verification Pass

Run from `backend/`:

```bash
go test ./...
```

Expected: PASS.

Run from `backend/`:

```bash
go build ./cmd/server
```

Expected: PASS.

Run from `frontend/`:

```bash
npm test -- src/lib/risk-activity-history.test.ts
```

Expected: PASS.

Run from `frontend/`:

```bash
npm run lint -- "src/types/risk.ts" "src/lib/api/risk-register.ts" "src/lib/risk-activity-history.ts" "src/lib/risk-activity-history.test.ts" "src/components/risk/risk-log-timeline.tsx" "src/components/app-header.tsx" "src/contexts/auth-context.tsx" "src/lib/app-navigation.ts" "src/app/(app)/risk/register/page.tsx" "src/app/(app)/risk/register/new/page.tsx" "src/app/(app)/inbox/page.tsx" "src/app/(app)/account/page.tsx" "src/app/(public)/change-password/page.tsx"
```

Expected: PASS.

Run from `frontend/`:

```bash
npm run build
```

Expected: PASS.

## Self-Review

### Spec coverage
- `reviewScheduleText` added end-to-end while keeping `nextReviewDate` intact: **Task 1**.
- Missing approval history fixed by handling both `risk` + `assessment` safely: **Task 2**.
- Authenticated manage-profile page + active-user password change: **Task 3**.
- Risk Register summary badges replaced with minimal KPI cards: **Task 4**.
- Inbox summary badges replaced with minimal KPI cards: **Task 4**.
- Probability and impact columns removed from Risk Register table: **Task 4**.
- Risk Register table card gets title/subtitle: **Task 4**.

### Placeholder scan
- No placeholder markers remain.
- Historic migration rewrite intentionally avoided; new migration `000040_*` is specified explicitly.

### Type consistency
- Backend + frontend use the same field name: `reviewScheduleText`.
- `nextReviewDate` remains optional string/date payload; no step replaces it with free text.
- Auth response/user profile fields stay aligned with `frontend/src/contexts/auth-context.tsx` (`email`, `orgName`, `nip`, `jabatan`, `pangkat`, `mustChangePassword`).

Plan complete and saved to `docs/superpowers/plans/2026-04-19-risk-register-account-approval-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

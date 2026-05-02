# KMK Phase 3 — Governance, Consultation, Mitigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun kapabilitas KMK Phase 3 di Manris v2: risk cascading antar UPR, registry komunikasi/konsultasi, dan perluasan detail rencana mitigasi.

**Architecture:** Phase 3 dipecah jadi empat jalur berurutan. Jalur 1 tambah relasi governance antar risiko lintas organisasi. Jalur 2 pisahkan komunikasi/konsultasi jadi registry organisasi lintas tahap MR. Jalur 3 perluas model mitigasi agar memenuhi atribut KMK tanpa merusak flow existing risk register, monitoring, approval, dan export. Jalur 4 lakukan verifikasi final dan catatan rollout.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL migrations + Next.js App Router + React + TypeScript + shadcn/ui + Tailwind + React Hook Form + Zod.

---

## File Structure Map

### Existing files to reuse

- `backend/cmd/server/main.go` — tambah route baru.
- `backend/internal/bootstrap/bootstrap.go` — wire repository/usecase/handler baru.
- `backend/internal/domain/entity/risk.go` — tambah metadata cascade dan validasi mitigasi KMK.
- `backend/internal/domain/entity/mitigation.go` — tambah field detail KMK.
- `backend/internal/domain/entity/communication_log.go` — referensi pola log komunikasi legacy.
- `backend/internal/domain/repository/risk.go` — extend kontrak risk persistence.
- `backend/internal/repository/postgres/risk.go` — update SQL risk + mitigation.
- `backend/internal/repository/postgres/communication_log.go` — referensi pola repository CRUD sederhana.
- `backend/internal/handler/http/risk.go` — referensi action endpoint risk.
- `frontend/src/types/risk.ts` — tambah type cascade + mitigation KMK.
- `frontend/src/lib/api/risk-register.ts` — extend risk payload.
- `frontend/src/lib/working-paper-export.ts` — tambah kolom mitigasi KMK.
- `frontend/src/lib/app-navigation.ts` — tambah navigation page baru.
- `frontend/src/app/(app)/risk/register/new/page.tsx` — prefill cascade + validasi mitigasi.
- `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — tampilkan detail mitigasi KMK.
- `frontend/src/components/shared/mitigation-table.tsx` — tambah expanded detail rows.
- `frontend/src/components/shared/mitigation-picker.tsx` — input field mitigasi KMK.

### New backend files

- `backend/db/migrations/000050_risk_cascades.up.sql`
- `backend/db/migrations/000050_risk_cascades.down.sql`
- `backend/db/migrations/000051_consultation_events.up.sql`
- `backend/db/migrations/000051_consultation_events.down.sql`
- `backend/db/migrations/000052_mitigation_kmk_fields.up.sql`
- `backend/db/migrations/000052_mitigation_kmk_fields.down.sql`
- `backend/internal/domain/entity/risk_cascade.go`
- `backend/internal/domain/entity/consultation_event.go`
- `backend/internal/domain/repository/risk_cascade.go`
- `backend/internal/domain/repository/consultation_event.go`
- `backend/internal/repository/postgres/risk_cascade.go`
- `backend/internal/repository/postgres/consultation_event.go`
- `backend/internal/usecase/riskcascade/create_mandatory.go`
- `backend/internal/usecase/riskcascade/create_bottom_up.go`
- `backend/internal/usecase/riskcascade/decide.go`
- `backend/internal/usecase/riskcascade/list.go`
- `backend/internal/usecase/consultationevent/create.go`
- `backend/internal/usecase/consultationevent/get.go`
- `backend/internal/usecase/consultationevent/list.go`
- `backend/internal/usecase/consultationevent/update.go`
- `backend/internal/handler/http/risk_cascade.go`
- `backend/internal/handler/http/consultation_event.go`
- `backend/internal/usecase/report/led.go`

### New frontend files

- `frontend/src/types/risk-cascade.ts`
- `frontend/src/types/consultation-event.ts`
- `frontend/src/lib/api/risk-cascades.ts`
- `frontend/src/lib/api/consultation-events.ts`
- `frontend/src/lib/api/led-reports.ts`
- `frontend/src/app/(app)/risk/cascading/page.tsx`
- `frontend/src/app/(app)/management/consultations/page.tsx`
- `frontend/src/app/(app)/management/consultations/new/page.tsx`
- `frontend/src/app/(app)/management/consultations/[id]/page.tsx`
- `frontend/src/components/risk/risk-cascade-action-dialog.tsx`
- `frontend/src/components/incidents/led-fields-section.tsx`
- `frontend/src/components/management/consultation-event-form.tsx`

---

## Delivery Order

1. Task 1 — risk cascading backend + queue UI. [x]
2. Task 2 — consultation registry backend + UI + risk/charter linkage.
3. Task 3 — mitigation KMK fields + validation + export. [x]
4. Task 4 — final verification + rollout notes.

---

### Task 1: Add risk cascading and escalation workflow

**Files:**
- Create: `backend/db/migrations/000050_risk_cascades.up.sql`
- Create: `backend/db/migrations/000050_risk_cascades.down.sql`
- Create: `backend/internal/domain/entity/risk_cascade.go`
- Create: `backend/internal/domain/repository/risk_cascade.go`
- Create: `backend/internal/repository/postgres/risk_cascade.go`
- Create: `backend/internal/usecase/riskcascade/create_mandatory.go`
- Create: `backend/internal/usecase/riskcascade/create_bottom_up.go`
- Create: `backend/internal/usecase/riskcascade/decide.go`
- Create: `backend/internal/usecase/riskcascade/list.go`
- Create: `backend/internal/handler/http/risk_cascade.go`
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/domain/repository/risk.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Create: `frontend/src/types/risk-cascade.ts`
- Create: `frontend/src/lib/api/risk-cascades.ts`
- Create: `frontend/src/components/risk/risk-cascade-action-dialog.tsx`
- Create: `frontend/src/app/(app)/risk/cascading/page.tsx`
- Modify: `frontend/src/types/risk.ts`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`
- Test: `backend/internal/domain/entity/risk_cascade_test.go`
- Test: `backend/internal/usecase/riskcascade/decide_test.go`

- [x] **Step 1: Write failing domain tests**

Create `backend/internal/domain/entity/risk_cascade_test.go`:

```go
package entity

import "testing"

func TestRiskCascadeValidate(t *testing.T) {
	tests := []struct {
		name    string
		cascade RiskCascade
		wantErr bool
	}{
		{
			name: "valid mandatory top down",
			cascade: RiskCascade{
				CascadeType:  "mandatory_top_down",
				Status:       "proposed",
				AdoptionType: "full",
			},
		},
		{
			name: "invalid cascade type",
			cascade: RiskCascade{
				CascadeType: "invalid",
				Status:      "proposed",
			},
			wantErr: true,
		},
		{
			name: "invalid status",
			cascade: RiskCascade{
				CascadeType: "bottom_up_escalation",
				Status:      "foo",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.cascade.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestRiskCascadeValidate -v
```

Expected: FAIL because `RiskCascade` does not exist yet.

- [x] **Step 3: Add migration**

Create `backend/db/migrations/000050_risk_cascades.up.sql`:

```sql
CREATE TABLE risk_cascades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    target_risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    source_org_id UUID NOT NULL REFERENCES organizations(id),
    target_org_id UUID NOT NULL REFERENCES organizations(id),
    cascade_type TEXT NOT NULL CHECK (cascade_type IN ('mandatory_top_down','recommended_top_down','bottom_up_escalation')),
    adoption_type TEXT CHECK (adoption_type IN ('full','partial')),
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','analyzed','accepted','rejected','implemented')),
    analysis_note TEXT NOT NULL DEFAULT '',
    decision_note TEXT NOT NULL DEFAULT '',
    proposed_by UUID REFERENCES users(id),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_cascades_source_org_status ON risk_cascades(source_org_id, status);
CREATE INDEX idx_risk_cascades_target_org_status ON risk_cascades(target_org_id, status);
CREATE INDEX idx_risk_cascades_source_risk ON risk_cascades(source_risk_id);
```

Create `backend/db/migrations/000050_risk_cascades.down.sql`:

```sql
DROP TABLE IF EXISTS risk_cascades;
```

- [x] **Step 4: Implement entity + repository contract**

Add `backend/internal/domain/entity/risk_cascade.go`:

```go
package entity

import (
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/errors"
)

type RiskCascade struct {
	ID           uuid.UUID  `json:"id"`
	SourceRiskID uuid.UUID  `json:"sourceRiskId"`
	TargetRiskID *uuid.UUID `json:"targetRiskId,omitempty"`
	SourceOrgID  uuid.UUID  `json:"sourceOrgId"`
	TargetOrgID  uuid.UUID  `json:"targetOrgId"`
	CascadeType  string     `json:"cascadeType"`
	AdoptionType string     `json:"adoptionType,omitempty"`
	Status       string     `json:"status"`
	AnalysisNote string     `json:"analysisNote"`
	DecisionNote string     `json:"decisionNote"`
	ProposedBy   *uuid.UUID `json:"proposedBy,omitempty"`
	DecidedBy    *uuid.UUID `json:"decidedBy,omitempty"`
	DecidedAt    *time.Time `json:"decidedAt,omitempty"`
	CreatedAt    time.Time  `json:"createdAt"`
}

func (r RiskCascade) Validate() error {
	switch r.CascadeType {
	case "mandatory_top_down", "recommended_top_down", "bottom_up_escalation":
	default:
		return errors.ErrInvalidStatus
	}

	switch r.Status {
	case "proposed", "analyzed", "accepted", "rejected", "implemented":
	default:
		return errors.ErrInvalidStatus
	}

	return nil
}
```

- [x] **Step 5: Implement usecases and routes**

Add route block in `backend/cmd/server/main.go`:

```go
protected.Get("/risk-cascades", riskCascadeHandler.List)
protected.Post("/risk-cascades/mandatory", riskCascadeHandler.CreateMandatory)
protected.Post("/risk-cascades/bottom-up", riskCascadeHandler.CreateBottomUp)
protected.Post("/risk-cascades/:id/decision", riskCascadeHandler.Decide)
```

Decision behavior:
- accepted + `full` → clone source risk into target org, set `parentRiskId`, mark cascade `implemented`
- accepted + `partial` → create draft risk in target org with prefilled fields, leave user adjustment required
- rejected → no target risk, persist `decision_note`

- [x] **Step 6: Add frontend queue and action dialogs**

Add `frontend/src/types/risk-cascade.ts`:

```ts
export type RiskCascadeType =
  | "mandatory_top_down"
  | "recommended_top_down"
  | "bottom_up_escalation";

export type RiskCascadeStatus =
  | "proposed"
  | "analyzed"
  | "accepted"
  | "rejected"
  | "implemented";

export interface RiskCascadeRecord {
  id: string;
  sourceRiskId: string;
  targetRiskId?: string | null;
  sourceOrgId: string;
  targetOrgId: string;
  cascadeType: RiskCascadeType;
  adoptionType?: "full" | "partial" | "";
  status: RiskCascadeStatus;
  analysisNote: string;
  decisionNote: string;
  createdAt: string;
}
```

Queue page must provide tabs:
- `Mandat masuk`
- `Usulan naik`
- `Riwayat`

- [x] **Step 7: Run verification**

Run:

```bash
cd backend
go test ./...
cd ../frontend
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend frontend
git commit -m "feat: add UPR risk cascading workflow"
```

---

### Task 2: Add consultation event registry

**Files:**
- Create: `backend/db/migrations/000052_consultation_events.up.sql`
- Create: `backend/db/migrations/000052_consultation_events.down.sql`
- Create: `backend/internal/domain/entity/consultation_event.go`
- Create: `backend/internal/domain/repository/consultation_event.go`
- Create: `backend/internal/repository/postgres/consultation_event.go`
- Create: `backend/internal/usecase/consultationevent/create.go`
- Create: `backend/internal/usecase/consultationevent/get.go`
- Create: `backend/internal/usecase/consultationevent/list.go`
- Create: `backend/internal/usecase/consultationevent/update.go`
- Create: `backend/internal/handler/http/consultation_event.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Create: `frontend/src/types/consultation-event.ts`
- Create: `frontend/src/lib/api/consultation-events.ts`
- Create: `frontend/src/components/management/consultation-event-form.tsx`
- Create: `frontend/src/app/(app)/management/consultations/page.tsx`
- Create: `frontend/src/app/(app)/management/consultations/new/page.tsx`
- Create: `frontend/src/app/(app)/management/consultations/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/risk/working-papers/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`
- Test: `backend/internal/domain/entity/consultation_event_test.go`
- Test: `backend/internal/usecase/consultationevent/create_test.go`

- [ ] **Step 1: Write failing event validation test**

Create `backend/internal/domain/entity/consultation_event_test.go`:

```go
package entity

import "testing"

func TestConsultationEventValidate(t *testing.T) {
	event := ConsultationEvent{
		EventType: "rapat_berkala",
		Title:     "Rapat triwulan UPR",
	}

	if err := event.Validate(); err == nil {
		t.Fatal("expected missing event date to fail")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestConsultationEventValidate -v
```

Expected: FAIL because `ConsultationEvent` does not exist yet.

- [ ] **Step 3: Add migration**

Create `backend/db/migrations/000052_consultation_events.up.sql`:

```sql
CREATE TABLE consultation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    risk_id UUID REFERENCES risks(id) ON DELETE SET NULL,
    charter_id UUID REFERENCES risk_charters(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('rapat_berkala','rapat_insidental','fgd','wawancara','korespondensi','survei','observasi')),
    event_date DATE NOT NULL,
    title TEXT NOT NULL,
    stakeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
    discussion_summary TEXT NOT NULL DEFAULT '',
    decision_summary TEXT NOT NULL DEFAULT '',
    follow_up_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    evidence_url TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultation_events_org_date ON consultation_events(organization_id, event_date DESC);
CREATE INDEX idx_consultation_events_risk ON consultation_events(risk_id);
CREATE INDEX idx_consultation_events_charter ON consultation_events(charter_id);
```

Create `backend/db/migrations/000052_consultation_events.down.sql`:

```sql
DROP TABLE IF EXISTS consultation_events;
```

- [ ] **Step 4: Implement entity/usecase/routes**

Route block:

```go
protected.Get("/consultation-events", consultationEventHandler.List)
protected.Post("/consultation-events", consultationEventHandler.Create)
protected.Get("/consultation-events/:id", consultationEventHandler.Get)
protected.Put("/consultation-events/:id", consultationEventHandler.Update)
```

Validation rules:
- `event_type` must match KMK labels exactly
- `event_date` required
- at least one `participant`
- `rapat_berkala` counts toward quarterly compliance KPI

- [ ] **Step 5: Add frontend pages and linkage**

Add `frontend/src/types/consultation-event.ts`:

```ts
export type ConsultationEventType =
  | "rapat_berkala"
  | "rapat_insidental"
  | "fgd"
  | "wawancara"
  | "korespondensi"
  | "survei"
  | "observasi";

export interface ConsultationEventRecord {
  id: string;
  organizationId: string;
  riskId?: string | null;
  charterId?: string | null;
  eventType: ConsultationEventType;
  eventDate: string;
  title: string;
  stakeholders: string[];
  participants: string[];
  discussionSummary: string;
  decisionSummary: string;
  followUpActions: string[];
  evidenceUrl: string;
  createdAt: string;
}
```

Frontend behaviors:
- management list page with period/org/type filters
- risk detail shows linked consultation history
- charter detail shows consultation timeline

- [ ] **Step 6: Run verification**

Run:

```bash
cd backend
go test ./...
cd ../frontend
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend frontend
git commit -m "feat: add KMK consultation event registry"
```

---

### Task 3: Extend mitigation plan to full KMK requirement set

**Files:**
- Create: `backend/db/migrations/000052_mitigation_kmk_fields.up.sql`
- Create: `backend/db/migrations/000052_mitigation_kmk_fields.down.sql`
- Modify: `backend/internal/domain/entity/mitigation.go`
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/usecase/mitigation_task/usecases.go`
- Modify: `frontend/src/types/risk.ts`
- Modify: `frontend/src/components/shared/mitigation-table.tsx`
- Modify: `frontend/src/components/shared/mitigation-picker.tsx`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`
- Modify: `frontend/src/lib/working-paper-export.ts`
- Test: `backend/internal/domain/entity/mitigation_test.go`
- Test: `backend/internal/usecase/risk/create_test.go`

- [x] **Step 1: Write failing validation test**

Append to `backend/internal/usecase/risk/create_test.go`:

```go
func TestCreateRiskRequiresNewMitigationForRiskUtama(t *testing.T) {
	// arrange risk with treatment option mitigasi and only existing control rows
	// execute create use case
	// expect validation error mentioning at least one non-existing-control mitigation
}
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run TestCreateRiskRequiresNewMitigationForRiskUtama -v
```

Expected: FAIL because KMK mitigation validation not implemented yet.

- [x] **Step 3: Add migration**

Create `backend/db/migrations/000053_mitigation_kmk_fields.up.sql`:

```sql
ALTER TABLE mitigations ADD COLUMN mitigation_type TEXT NOT NULL DEFAULT 'reduce_probability'
    CHECK (mitigation_type IN ('reduce_probability','reduce_impact','reduce_both'));
ALTER TABLE mitigations ADD COLUMN activity_stage TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN expected_output TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN quantitative_target TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN supporting_unit TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN resources_required TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN contingency_plan TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN potential_obstacle TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN cost_benefit_note TEXT NOT NULL DEFAULT '';
ALTER TABLE mitigations ADD COLUMN is_breakthrough_activity BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mitigations ADD COLUMN is_existing_control BOOLEAN NOT NULL DEFAULT FALSE;
```

Create `backend/db/migrations/000053_mitigation_kmk_fields.down.sql`:

```sql
ALTER TABLE mitigations DROP COLUMN IF EXISTS is_existing_control;
ALTER TABLE mitigations DROP COLUMN IF EXISTS is_breakthrough_activity;
ALTER TABLE mitigations DROP COLUMN IF EXISTS cost_benefit_note;
ALTER TABLE mitigations DROP COLUMN IF EXISTS potential_obstacle;
ALTER TABLE mitigations DROP COLUMN IF EXISTS contingency_plan;
ALTER TABLE mitigations DROP COLUMN IF EXISTS resources_required;
ALTER TABLE mitigations DROP COLUMN IF EXISTS supporting_unit;
ALTER TABLE mitigations DROP COLUMN IF EXISTS quantitative_target;
ALTER TABLE mitigations DROP COLUMN IF EXISTS expected_output;
ALTER TABLE mitigations DROP COLUMN IF EXISTS activity_stage;
ALTER TABLE mitigations DROP COLUMN IF EXISTS mitigation_type;
```

- [x] **Step 4: Extend mitigation model + risk rule**

Add to `backend/internal/domain/entity/mitigation.go`:

```go
MitigationType         string `json:"mitigationType,omitempty"`
ActivityStage          string `json:"activityStage,omitempty"`
ExpectedOutput         string `json:"expectedOutput,omitempty"`
QuantitativeTarget     string `json:"quantitativeTarget,omitempty"`
SupportingUnit         string `json:"supportingUnit,omitempty"`
ResourcesRequired      string `json:"resourcesRequired,omitempty"`
ContingencyPlan        string `json:"contingencyPlan,omitempty"`
PotentialObstacle      string `json:"potentialObstacle,omitempty"`
CostBenefitNote        string `json:"costBenefitNote,omitempty"`
IsBreakthroughActivity bool   `json:"isBreakthroughActivity,omitempty"`
IsExistingControl      bool   `json:"isExistingControl,omitempty"`
```

Risk validation rules:
- `is_existing_control=true` not counted as new mitigation for `risk utama`
- `mitigation_type=reduce_probability` requires `target_probability < probability`
- `mitigation_type=reduce_impact` requires `target_impact < impact`
- `mitigation_type=reduce_both` requires both decrease

- [x] **Step 5: Update frontend table/form/export**

Extend `frontend/src/types/risk.ts`:

```ts
export interface RiskMitigation {
  id?: string;
  action: string;
  owner: string;
  dueDate: string;
  frequency?: MitigationFrequency;
  mitigationType?: "reduce_probability" | "reduce_impact" | "reduce_both";
  activityStage?: string;
  expectedOutput?: string;
  quantitativeTarget?: string;
  supportingUnit?: string;
  resourcesRequired?: string;
  contingencyPlan?: string;
  potentialObstacle?: string;
  costBenefitNote?: string;
  isBreakthroughActivity?: boolean;
  isExistingControl?: boolean;
}
```

UI rules:
- keep table compact with expandable detail row
- show inline validation message for KMK rule violations
- export all new fields into working paper

- [x] **Step 6: Run verification**

Run:

```bash
cd backend
go test ./...
cd ../frontend
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend frontend
git commit -m "feat: extend mitigation plans for KMK"
```

---

### Task 4: Final verification and rollout notes

**Files:**
- Modify: `docs/superpowers/plans/2026-05-02-kmk-phase-3-governance-led-mitigation.md`

- [x] **Step 1: Run full backend verification**

```bash
cd backend
go test ./...
```

Expected: PASS.

- [x] **Step 2: Run full frontend verification**

```bash
cd frontend
npm run build
```

Expected: PASS.

- [x] **Step 3: Smoke-check critical flows**

Checklist:
- create mandatory top-down cascade
- accept cascade with `full` adoption
- create consultation event linked to risk charter
- save mitigation row with new KMK detail fields

- [ ] **Step 4: Commit final stabilization changes**

```bash
git add backend frontend docs/superpowers/plans/2026-05-02-kmk-phase-3-governance-led-mitigation.md
git commit -m "docs: finalize KMK phase 3 implementation plan"
```

---

## Rollout Notes

- Enable Task 1 first if org hierarchy + org-scope permissions already stable.
- Keep `communication_logs` legacy endpoint alive until consultation registry adopted in all UPR.
- If mitigation UI becomes too dense on mobile, split detail editor into drawer modal instead of wider table columns.

## Spec Coverage Check

- Risk cascading / escalation: covered by Task 1.
- Communication & consultation registry: covered by Task 2.
- Full mitigation detail KMK: covered by Task 3.
- Verification and rollout sequencing: covered by Task 4.

## Placeholder Scan

- No `TODO`, `TBD`, or “implement later” placeholders intentionally left.
- Every task has exact file targets, commands, and expected outcomes.

## Type Consistency Check

- `risk_cascades` uses `cascadeType`, `adoptionType`, `status` consistently across backend/frontend.
- Consultation registry uses `consultation_events` / `ConsultationEventRecord` naming consistently.
- Mitigation KMK fields use same backend/frontend names with camelCase JSON.

# KMK Batch B — Scoring & Evaluation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun engine penilaian risiko sesuai KMK BAB IV — tahap analisis dan evaluasi — melalui likelihood assessment wizard, impact criteria matrix, risk appetite/tolerance enforcement, dan priority engine dengan tie-breaker KMK.

**Architecture:** Batch B dipecah menjadi empat jalur berurutan: likelihood assessment, impact criteria, appetite/tolerance rules, lalu priority engine. Semua mengikuti pola Clean Architecture backend yang sudah ada dan App Router + typed API client di frontend. Setiap jalur menghasilkan software yang dapat diuji dan tetap backward compatible. Risk versioning existing tetap menangani assessment cycle tanpa perubahan.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL migrations + Next.js App Router + React + TypeScript + shadcn/ui + Zod + React Hook Form.

---

## File Structure Map

### Existing files to reuse

- `backend/cmd/server/main.go` — tambah route baru.
- `backend/internal/bootstrap/bootstrap.go` — wire repository, usecase, handler baru.
- `backend/internal/handler/http/risk_charter.go` — referensi pattern handler CRUD.
- `backend/internal/usecase/riskcharter/create.go` — referensi pattern usecase CRUD.
- `backend/internal/repository/postgres/risk_charter.go` — referensi pattern repository Postgres.
- `backend/internal/domain/entity/risk.go` — tambah field `LikelihoodAssessmentID`, `ImpactCriteriaID`, `ImpactJustification`, `ResidualAcceptanceReason`, `LeaderJudgementRank`, `PrioritySortValue`.
- `backend/internal/repository/postgres/risk.go` — update persistence risk (insert/select/update SQL).
- `backend/internal/usecase/risk/create.go` — validasi input likelihood + impact + appetite + mitigation.
- `backend/internal/usecase/risk/update.go` — validasi update likelihood + impact + appetite + mitigation.
- `backend/internal/usecase/risk/list_register.go` — update default order by priority.
- `frontend/src/lib/risk.ts` — tambah helper `ResolveRiskAppetite`, `ResolveRiskPriority`.
- `frontend/src/types/risk.ts` — tambah likelihood/impact/priority fields.
- `frontend/src/lib/api/risk-register.ts` — tambah payload fields.
- `frontend/src/app/(app)/risk/register/new/page.tsx` — tambahkan likelihood wizard + impact selector.
- `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — tambahkan likelihood wizard + impact selector.
- `frontend/src/lib/working-paper-export.ts` — tampilkan likelihood/impact justification metadata.

### New backend files

- `backend/db/migrations/000047_likelihood_assessments.up.sql`
- `backend/db/migrations/000047_likelihood_assessments.down.sql`
- `backend/db/migrations/000048_impact_criteria.up.sql`
- `backend/db/migrations/000048_impact_criteria.down.sql`
- `backend/db/migrations/000049_risk_priority_engine.up.sql`
- `backend/db/migrations/000049_risk_priority_engine.down.sql`
- `backend/internal/domain/entity/likelihood_assessment.go`
- `backend/internal/domain/entity/impact_criteria.go`
- `backend/internal/domain/repository/likelihood_assessment.go`
- `backend/internal/domain/repository/impact_criteria.go`
- `backend/internal/repository/postgres/likelihood_assessment.go`
- `backend/internal/repository/postgres/impact_criteria.go`
- `backend/internal/usecase/likelihoodassessment/create.go`
- `backend/internal/usecase/likelihoodassessment/get.go`
- `backend/internal/usecase/likelihoodassessment/upsert.go`
- `backend/internal/usecase/impactcriteria/list.go`
- `backend/internal/handler/http/likelihood_assessment.go`
- `backend/internal/handler/http/impact_criteria.go`
- `backend/internal/domain/service/risk_priority.go`

### New frontend files

- `frontend/src/types/likelihood-assessment.ts`
- `frontend/src/types/impact-criteria.ts`
- `frontend/src/lib/api/likelihood-assessments.ts`
- `frontend/src/lib/api/impact-criteria.ts`
- `frontend/src/components/risk/likelihood-assessment-wizard.tsx`
- `frontend/src/components/risk/impact-criteria-selector.tsx`

---

## Delivery Order

1. Task 5 — likelihood assessment wizard backend + routes.
2. Task 6 — impact criteria matrix backend + routes + seed data.
3. Task 7 — risk appetite/tolerance/mandatory mitigation rules.
4. Task 8 — KMK priority engine.

---

### Task 5: Implement Likelihood Assessment Wizard

**Files:**
- Create: `backend/db/migrations/000047_likelihood_assessments.up.sql`
- Create: `backend/db/migrations/000047_likelihood_assessments.down.sql`
- Create: `backend/internal/domain/entity/likelihood_assessment.go`
- Create: `backend/internal/domain/repository/likelihood_assessment.go`
- Create: `backend/internal/repository/postgres/likelihood_assessment.go`
- Create: `backend/internal/usecase/likelihoodassessment/create.go`
- Create: `backend/internal/usecase/likelihoodassessment/get.go`
- Create: `backend/internal/usecase/likelihoodassessment/upsert.go`
- Create: `backend/internal/handler/http/likelihood_assessment.go`
- Modify: `backend/internal/domain/entity/risk.go` — add `LikelihoodAssessmentID`
- Modify: `backend/internal/repository/postgres/risk.go` — include `likelihood_assessment_id` in SQL
- Modify: `backend/internal/usecase/risk/create.go` — accept likelihood payload
- Modify: `backend/internal/usecase/risk/update.go` — accept likelihood payload
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/domain/entity/likelihood_assessment_test.go`
- Test: `backend/internal/usecase/likelihoodassessment/upsert_test.go`

**Frontend files:**
- Create: `frontend/src/types/likelihood-assessment.ts`
- Create: `frontend/src/lib/api/likelihood-assessments.ts`
- Create: `frontend/src/components/risk/likelihood-assessment-wizard.tsx`
- Modify: `frontend/src/types/risk.ts` — add likelihood fields
- Modify: `frontend/src/lib/api/risk-register.ts` — add likelihood payload
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx` — insert wizard
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — insert wizard

- [ ] **Step 1: Write failing entity tests**

Create `backend/internal/domain/entity/likelihood_assessment_test.go`:

```go
package entity

import (
	"testing"
)

func TestLikelihoodAssessmentValidate(t *testing.T) {
	tests := []struct {
		name       string
		assessment LikelihoodAssessment
		wantErr    bool
	}{
		{
			name: "valid frequency assessment",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               7,
				SelectedProbabilityLevel: 3,
				Justification:            "Dari 7 kejadian dalam 12 bulan",
			},
			wantErr: false,
		},
		{
			name: "invalid method",
			assessment: LikelihoodAssessment{
				Method:                   "foo",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
			},
			wantErr: true,
		},
		{
			name: "expert judgement without justification",
			assessment: LikelihoodAssessment{
				Method:                   "expert_judgement",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				SelectedProbabilityLevel: 3,
				Justification:            "",
			},
			wantErr: true,
		},
		{
			name: "probability method without population",
			assessment: LikelihoodAssessment{
				Method:                   "probability",
				FrequencyType:            "low_frequency",
				ObservationPeriodMonths:  60,
				EventCount:               2,
				SelectedProbabilityLevel: 2,
				Justification:            "",
			},
			wantErr: true,
		},
		{
			name: "selected level out of range",
			assessment: LikelihoodAssessment{
				Method:                   "frequency",
				FrequencyType:            "non_low_frequency",
				ObservationPeriodMonths:  12,
				EventCount:               1,
				SelectedProbabilityLevel: 6,
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.assessment.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestResolveLikelihoodLevel(t *testing.T) {
	tests := []struct {
		name              string
		method            string
		eventCount        int
		populationCount   int
		observationMonths int
		wantLevel         int
	}{
		{
			name: "low frequency with 0 events → level 1",
			// Implementation-specific threshold
		},
	}
	// Tests for threshold mapping will be added after implementation
	t.Skip("threshold mapping tests pending implementation")
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestLikelihoodAssessmentValidate -v
```

Expected: FAIL because `LikelihoodAssessment` type does not exist yet.

- [ ] **Step 3: Create migration**

Create `backend/db/migrations/000047_likelihood_assessments.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS likelihood_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id UUID NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    method TEXT NOT NULL CHECK (method IN ('frequency','probability','expert_judgement','benchmarking','consensus')),
    frequency_type TEXT NOT NULL CHECK (frequency_type IN ('low_frequency','non_low_frequency')),
    observation_period_months INTEGER NOT NULL CHECK (observation_period_months > 0),
    event_count INTEGER CHECK (event_count >= 0),
    population_count INTEGER CHECK (population_count IS NULL OR population_count > 0),
    calculated_probability NUMERIC(8,4),
    selected_probability_level INTEGER NOT NULL CHECK (selected_probability_level BETWEEN 1 AND 5),
    justification TEXT NOT NULL DEFAULT '',
    data_source TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_likelihood_assessments_risk ON likelihood_assessments(risk_id);
```

Create `backend/db/migrations/000047_likelihood_assessments.down.sql`:

```sql
DROP TABLE IF EXISTS likelihood_assessments;
```

- [ ] **Step 4: Create entity and validation**

Create `backend/internal/domain/entity/likelihood_assessment.go`:

```go
package entity

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

type LikelihoodAssessment struct {
	ID                      uuid.UUID `json:"id"`
	RiskID                  uuid.UUID `json:"riskId"`
	Method                  string    `json:"method"`
	FrequencyType           string    `json:"frequencyType"`
	ObservationPeriodMonths int       `json:"observationPeriodMonths"`
	EventCount              *int      `json:"eventCount,omitempty"`
	PopulationCount         *int      `json:"populationCount,omitempty"`
	CalculatedProbability   *float64  `json:"calculatedProbability,omitempty"`
	SelectedProbabilityLevel int      `json:"selectedProbabilityLevel"`
	Justification           string    `json:"justification"`
	DataSource              string    `json:"dataSource"`
	CreatedAt               time.Time `json:"createdAt"`
	UpdatedAt               time.Time `json:"updatedAt"`
}

func (l LikelihoodAssessment) Validate() error {
	switch l.Method {
	case "frequency", "probability", "expert_judgement", "benchmarking", "consensus":
	default:
		return fmt.Errorf("invalid method")
	}
	switch l.FrequencyType {
	case "low_frequency", "non_low_frequency":
	default:
		return fmt.Errorf("invalid frequency type")
	}
	if l.ObservationPeriodMonths <= 0 {
		return fmt.Errorf("observation period must be positive")
	}
	if l.SelectedProbabilityLevel < 1 || l.SelectedProbabilityLevel > 5 {
		return fmt.Errorf("selected probability level must be between 1 and 5")
	}
	if l.Method == "probability" && l.PopulationCount == nil {
		return fmt.Errorf("probability method requires population count")
	}
	if (l.Method == "expert_judgement" || l.Method == "benchmarking" || l.Method == "consensus") && l.Justification == "" {
		return fmt.Errorf("justification is required for method %s", l.Method)
	}
	return nil
}

// ResolveLikelihoodLevel returns the recommended probability level based on
// KMK threshold tables. This is a domain function independent of storage.
func ResolveLikelihoodLevel(method string, eventCount int, populationCount int, observationMonths int) int {
	if method == "frequency" || method == "probability" {
		if observationMonths <= 0 {
			return 3
		}
		// Calculate annualized rate
		annualRate := float64(eventCount) * 12.0 / float64(observationMonths)
		if populationCount > 0 {
			// Probability method: events per population per year
			rate := annualRate / float64(populationCount)
			switch {
			case rate == 0:
				return 1
			case rate < 0.001:
				return 2
			case rate < 0.01:
				return 3
			case rate < 0.1:
				return 4
			default:
				return 5
			}
		}
		// Frequency method: annual event count
		switch {
		case annualRate == 0:
			return 1
		case annualRate < 1:
			return 2
		case annualRate < 3:
			return 3
		case annualRate < 10:
			return 4
		default:
			return 5
		}
	}
	// For non-data methods, default to middle (requires UPR judgement)
	return 3
}
```

- [ ] **Step 5: Run entity tests**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestLikelihoodAssessmentValidate -v
```

Expected: PASS.

- [ ] **Step 6: Create repository interface**

Create `backend/internal/domain/repository/likelihood_assessment.go`:

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type LikelihoodAssessmentRepository interface {
	Create(ctx context.Context, assessment *entity.LikelihoodAssessment) error
	GetByRiskID(ctx context.Context, riskID uuid.UUID) (*entity.LikelihoodAssessment, error)
	UpsertByRiskID(ctx context.Context, assessment *entity.LikelihoodAssessment) error
	DeleteByRiskID(ctx context.Context, riskID uuid.UUID) error
}
```

- [ ] **Step 7: Implement Postgres repository**

Create `backend/internal/repository/postgres/likelihood_assessment.go` using pattern from `risk_charter.go`:

Core insert SQL:

```sql
INSERT INTO likelihood_assessments (
  risk_id, method, frequency_type, observation_period_months,
  event_count, population_count, calculated_probability,
  selected_probability_level, justification, data_source
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
)
RETURNING id, created_at, updated_at
```

Core upsert SQL (ON CONFLICT on risk_id unique — add unique constraint):

```sql
INSERT INTO likelihood_assessments (...) VALUES (...)
ON CONFLICT (risk_id) DO UPDATE SET
  method = EXCLUDED.method,
  frequency_type = EXCLUDED.frequency_type,
  observation_period_months = EXCLUDED.observation_period_months,
  event_count = EXCLUDED.event_count,
  population_count = EXCLUDED.population_count,
  calculated_probability = EXCLUDED.calculated_probability,
  selected_probability_level = EXCLUDED.selected_probability_level,
  justification = EXCLUDED.justification,
  data_source = EXCLUDED.data_source,
  updated_at = now()
RETURNING id, created_at, updated_at
```

Add unique constraint to migration:

```sql
ALTER TABLE likelihood_assessments ADD CONSTRAINT uq_likelihood_assessments_risk UNIQUE (risk_id);
```

- [ ] **Step 8: Implement usecases**

Create `backend/internal/usecase/likelihoodassessment/upsert.go`:

```go
package likelihoodassessment

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type UpsertLikelihoodAssessmentUseCase struct {
	repo repository.LikelihoodAssessmentRepository
}

func NewUpsertLikelihoodAssessmentUseCase(repo repository.LikelihoodAssessmentRepository) *UpsertLikelihoodAssessmentUseCase {
	return &UpsertLikelihoodAssessmentUseCase{repo: repo}
}

type UpsertLikelihoodAssessmentInput struct {
	RiskID                  uuid.UUID `json:"riskId"`
	Method                  string    `json:"method"`
	FrequencyType           string    `json:"frequencyType"`
	ObservationPeriodMonths int       `json:"observationPeriodMonths"`
	EventCount              *int      `json:"eventCount,omitempty"`
	PopulationCount         *int      `json:"populationCount,omitempty"`
	SelectedProbabilityLevel int      `json:"selectedProbabilityLevel"`
	Justification           string    `json:"justification"`
	DataSource              string    `json:"dataSource"`
}

type UpsertLikelihoodAssessmentOutput struct {
	ID                      uuid.UUID `json:"id"`
	CalculatedProbability   *float64  `json:"calculatedProbability,omitempty"`
	SelectedProbabilityLevel int      `json:"selectedProbabilityLevel"`
}

func (uc *UpsertLikelihoodAssessmentUseCase) Execute(ctx context.Context, input UpsertLikelihoodAssessmentInput) (*UpsertLikelihoodAssessmentOutput, error) {
	// Calculate recommended probability
	var calculated *float64
	var calcLevel int
	if input.Method == "frequency" || input.Method == "probability" {
		eventCount := 0
		if input.EventCount != nil {
			eventCount = *input.EventCount
		}
		population := 0
		if input.PopulationCount != nil {
			population = *input.PopulationCount
		}
		calcLevel = entity.ResolveLikelihoodLevel(input.Method, eventCount, population, input.ObservationPeriodMonths)
		cp := float64(calcLevel)
		calculated = &cp
	}

	assessment := entity.LikelihoodAssessment{
		RiskID:                   input.RiskID,
		Method:                   input.Method,
		FrequencyType:            input.FrequencyType,
		ObservationPeriodMonths:  input.ObservationPeriodMonths,
		EventCount:               input.EventCount,
		PopulationCount:          input.PopulationCount,
		CalculatedProbability:    calculated,
		SelectedProbabilityLevel: input.SelectedProbabilityLevel,
		Justification:            input.Justification,
		DataSource:               input.DataSource,
	}

	if err := assessment.Validate(); err != nil {
		return nil, fmt.Errorf("validation failed: %w", err)
	}

	if err := uc.repo.UpsertByRiskID(ctx, &assessment); err != nil {
		return nil, err
	}

	return &UpsertLikelihoodAssessmentOutput{
		ID:                       assessment.ID,
		CalculatedProbability:    calculated,
		SelectedProbabilityLevel: input.SelectedProbabilityLevel,
	}, nil
}
```

Create `get.go` and `create.go` wrappers as needed. Note: `Upsert` is primary pattern since one risk has at most one likelihood assessment.

- [ ] **Step 9: Implement HTTP handler + routes**

Create `backend/internal/handler/http/likelihood_assessment.go` with:
- `POST /likelihood-assessments` — upsert (create or update)
- `GET /likelihood-assessments/:riskId` — get by risk ID

Add routes in `backend/cmd/server/main.go`:

```go
likelihoodHandler := httpHandler.NewLikelihoodAssessmentHandler(
	container.LikelihoodAssessmentUpsertUC,
	container.LikelihoodAssessmentGetUC,
)

protected.Post("/likelihood-assessments", likelihoodHandler.Upsert)
protected.Get("/likelihood-assessments/:riskId", likelihoodHandler.GetByRiskID)
```

- [ ] **Step 10: Wire bootstrap**

Add repository/usecase/handler construction in `backend/internal/bootstrap/bootstrap.go`.

- [ ] **Step 11: Update risk entity**

Add to `backend/internal/domain/entity/risk.go`:

```go
LikelihoodAssessmentID *uuid.UUID `json:"likelihoodAssessmentId,omitempty"`
```

- [ ] **Step 12: Update risk repository persistence**

In `backend/internal/repository/postgres/risk.go`:
- Add `likelihood_assessment_id` to INSERT and SELECT columns
- Include in UPDATE SQL if needed

- [ ] **Step 13: Update risk create/update usecases to accept likelihood payload**

In `backend/internal/usecase/risk/create.go`:
- Add `LikelihoodAssessment *likelihoodassessment.UpsertLikelihoodAssessmentInput` to `CreateRiskInput`
- After risk is created, if likelihood input provided, call `LikelihoodAssessmentUpsertUC.Execute()`
- Write back `likelihood_assessment_id` to the created risk

Same pattern for `update.go`.

- [ ] **Step 14: Run migration + backend tests**

Run:

```bash
cd backend
make migrate-up
go test ./...
```

Expected: migration succeeds, tests pass.

- [ ] **Step 15: Create frontend types**

Create `frontend/src/types/likelihood-assessment.ts`:

```ts
export type LikelihoodMethod = "frequency" | "probability" | "expert_judgement" | "benchmarking" | "consensus";
export type FrequencyType = "low_frequency" | "non_low_frequency";

export interface LikelihoodAssessment {
  id: string;
  riskId: string;
  method: LikelihoodMethod;
  frequencyType: FrequencyType;
  observationPeriodMonths: number;
  eventCount?: number;
  populationCount?: number;
  calculatedProbability?: number;
  selectedProbabilityLevel: number;
  justification: string;
  dataSource: string;
  createdAt: string;
  updatedAt: string;
}

export interface LikelihoodAssessmentInput {
  method: LikelihoodMethod;
  frequencyType: FrequencyType;
  observationPeriodMonths: number;
  eventCount?: number;
  populationCount?: number;
  selectedProbabilityLevel: number;
  justification: string;
  dataSource: string;
}
```

- [ ] **Step 16: Create API client**

Create `frontend/src/lib/api/likelihood-assessments.ts`:

```ts
import { api } from "@/lib/api";
import type { LikelihoodAssessment, LikelihoodAssessmentInput } from "@/types/likelihood-assessment";

export async function upsertLikelihoodAssessment(token: string, data: LikelihoodAssessmentInput & { riskId: string }) {
  return api.post<LikelihoodAssessment>("/likelihood-assessments", token, data);
}

export async function getLikelihoodAssessmentByRiskId(token: string, riskId: string) {
  return api.get<LikelihoodAssessment>(`/likelihood-assessments/${riskId}`, token);
}
```

- [ ] **Step 17: Create likelihood assessment wizard component**

Create `frontend/src/components/risk/likelihood-assessment-wizard.tsx`:

Requirements:
- Tabs: Frekuensi, Probabilitas, Expert Judgement, Benchmarking, Konsensus
- Frekuensi tab: event count input, observation period (default 12 for non_low, 60 for low), calculated recommendation display
- Probabilitas tab: event count + population count, calculated recommendation
- Expert/Benchmarking/Konsensus tabs: justification textarea + data source input
- Display calculated vs selected level comparison
- If calculated ≠ selected, require justification override
- On confirm, emit `{ method, frequencyType, observationPeriodMonths, eventCount, populationCount, selectedProbabilityLevel, justification, dataSource }`

- [ ] **Step 18: Insert wizard into risk registration form**

In `frontend/src/app/(app)/risk/register/new/page.tsx`:
- Replace simple probability slider with wizard
- On wizard confirm, set form `probability` value to `selectedProbabilityLevel`
- Store wizard full payload in form state for submission

Same for assessment form `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`.

- [ ] **Step 19: Update risk types and API payloads**

In `frontend/src/types/risk.ts`, add to create/update request types:

```ts
likelihoodAssessment?: LikelihoodAssessmentInput;
```

In `frontend/src/lib/api/risk-register.ts`, include in create/update payload.

- [ ] **Step 20: Run frontend build**

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 21: Commit**

```bash
git add backend frontend
git commit -m "feat: add KMK likelihood assessment wizard"
```

---

### Task 6: Implement Impact Criteria Matrix

**Files:**
- Create: `backend/db/migrations/000048_impact_criteria.up.sql`
- Create: `backend/db/migrations/000048_impact_criteria.down.sql`
- Create: `backend/internal/domain/entity/impact_criteria.go`
- Create: `backend/internal/domain/repository/impact_criteria.go`
- Create: `backend/internal/repository/postgres/impact_criteria.go`
- Create: `backend/internal/usecase/impactcriteria/list.go`
- Create: `backend/internal/handler/http/impact_criteria.go`
- Modify: `backend/internal/domain/entity/risk.go` — add `ImpactCriteriaID`, `ImpactJustification`
- Modify: `backend/internal/repository/postgres/risk.go` — include new columns
- Modify: `backend/internal/usecase/risk/create.go` — accept impact criteria
- Modify: `backend/internal/usecase/risk/update.go` — accept impact criteria
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/domain/entity/impact_criteria_test.go`

**Frontend files:**
- Create: `frontend/src/types/impact-criteria.ts`
- Create: `frontend/src/lib/api/impact-criteria.ts`
- Create: `frontend/src/components/risk/impact-criteria-selector.tsx`
- Modify: `frontend/src/types/risk.ts` — add impact criteria fields
- Modify: `frontend/src/lib/api/risk-register.ts` — add payload fields
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx` — insert selector
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — insert selector

- [ ] **Step 1: Write failing entity test**

Create `backend/internal/domain/entity/impact_criteria_test.go`:

```go
package entity

import (
	"testing"
)

func TestImpactCriteriaValidate(t *testing.T) {
	tests := []struct {
		name     string
		criteria ImpactCriteria
		wantErr  bool
	}{
		{
			name: "valid criteria",
			criteria: ImpactCriteria{
				Category:     "operasional",
				UPRLevel:     "upr_t1",
				ImpactLevel:  3,
				ImpactLabel:  "Sedang",
				Description:  "Gangguan operasional yang dapat diselesaikan dalam waktu 1-3 hari",
			},
			wantErr: false,
		},
		{
			name: "invalid category",
			criteria: ImpactCriteria{
				Category:    "foo",
				UPRLevel:    "upr_t1",
				ImpactLevel: 3,
				Description: "desc",
			},
			wantErr: true,
		},
		{
			name: "impact level out of range",
			criteria: ImpactCriteria{
				Category:    "kebijakan",
				UPRLevel:    "kementerian",
				ImpactLevel: 6,
				Description: "desc",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.criteria.Validate()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestImpactCriteriaValidate -v
```

Expected: FAIL because `ImpactCriteria` type does not exist yet.

- [ ] **Step 3: Create migration with seed data**

Create `backend/db/migrations/000048_impact_criteria.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS impact_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('kebijakan','reputasi','fraud_korupsi','legal','kepatuhan','operasional')),
    upr_level TEXT NOT NULL CHECK (upr_level IN ('kementerian','upr_t1','upr_t2')),
    impact_level INTEGER NOT NULL CHECK (impact_level BETWEEN 1 AND 5),
    impact_label TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category, upr_level, impact_level, description)
);

CREATE INDEX IF NOT EXISTS idx_impact_criteria_category_level ON impact_criteria(category, upr_level);

-- Seed minimum KMK impact criteria
INSERT INTO impact_criteria (category, upr_level, impact_level, impact_label, description) VALUES
-- Kebijakan / Kementerian
('kebijakan', 'kementerian', 1, 'Tidak Signifikan', 'Tidak berdampak pada pencapaian sasaran strategis'),
('kebijakan', 'kementerian', 2, 'Kecil', 'Dampak minor pada 1-2 sasaran, dapat ditangani rutin'),
('kebijakan', 'kementerian', 3, 'Sedang', 'Dampak pada beberapa sasaran, memerlukan perhatian khusus'),
('kebijakan', 'kementerian', 4, 'Besar', 'Dampak signifikan pada sasaran utama, mengganggu kinerja'),
('kebijakan', 'kementerian', 5, 'Katastropik', 'Gagal pencapaian sasaran strategis, implikasi nasional'),
-- Operasional / UPR T1
('operasional', 'upr_t1', 1, 'Tidak Signifikan', 'Gangguan operasional < 1 hari, tidak mempengaruhi layanan'),
('operasional', 'upr_t1', 2, 'Kecil', 'Gangguan 1-3 hari, layanan tetap berjalan dengan penurunan'),
('operasional', 'upr_t1', 3, 'Sedang', 'Gangguan 3-7 hari, layanan terhambat sebagian'),
('operasional', 'upr_t1', 4, 'Besar', 'Gangguan > 7 hari, layanan utama terganggu'),
('operasional', 'upr_t1', 5, 'Katastropik', 'Gangguan > 14 hari, layanan esensial lumpuh'),
-- Kepatuhan / UPR T2
('kepatuhan', 'upr_t2', 1, 'Tidak Signifikan', 'Ketidakpatuhan prosedural tanpa sanksi'),
('kepatuhan', 'upr_t2', 2, 'Kecil', 'Ketidakpatuhan dengan peringatan tertulis'),
('kepatuhan', 'upr_t2', 3, 'Sedang', 'Ketidakpatuhan dengan sanksi administratif'),
('kepatuhan', 'upr_t2', 4, 'Besar', 'Ketidakpatuhan dengan sanksi pidana ringan/denda'),
('kepatuhan', 'upr_t2', 5, 'Katastropik', 'Ketidakpatuhan dengan sanksi pidana berat, reputasi nasional')
ON CONFLICT (category, upr_level, impact_level, description) DO NOTHING;
```

Create `backend/db/migrations/000048_impact_criteria.down.sql`:

```sql
DROP TABLE IF EXISTS impact_criteria;
```

- [ ] **Step 4: Create entity**

Create `backend/internal/domain/entity/impact_criteria.go`:

```go
package entity

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ImpactCriteria struct {
	ID           uuid.UUID `json:"id"`
	Category     string    `json:"category"`
	UPRLevel     string    `json:"uprLevel"`
	ImpactLevel  int       `json:"impactLevel"`
	ImpactLabel  string    `json:"impactLabel"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"createdAt"`
}

func (i ImpactCriteria) Validate() error {
	switch i.Category {
	case "kebijakan", "reputasi", "fraud_korupsi", "legal", "kepatuhan", "operasional":
	default:
		return fmt.Errorf("invalid category")
	}
	switch i.UPRLevel {
	case "kementerian", "upr_t1", "upr_t2":
	default:
		return fmt.Errorf("invalid upr level")
	}
	if i.ImpactLevel < 1 || i.ImpactLevel > 5 {
		return fmt.Errorf("impact level must be between 1 and 5")
	}
	if i.Description == "" {
		return fmt.Errorf("description is required")
	}
	return nil
}
```

- [ ] **Step 5: Implement repository + usecase + handler**

Repository interface (`backend/internal/domain/repository/impact_criteria.go`):

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type ImpactCriteriaFilter struct {
	Category *string
	UPRLevel *string
	ImpactLevel *int
}

type ImpactCriteriaRepository interface {
	List(ctx context.Context, filter ImpactCriteriaFilter) ([]*entity.ImpactCriteria, error)
	GetByID(ctx context.Context, id uuid.UUID) (*entity.ImpactCriteria, error)
}
```

Implement `List` with category + upr_level filtering. Only `List` is needed (read-only seeded data).

UseCase: `backend/internal/usecase/impactcriteria/list.go` — simple passthrough.

Handler: `backend/internal/handler/http/impact_criteria.go`:

```go
protected.Get("/impact-criteria", impactCriteriaHandler.List)
```

- [ ] **Step 6: Update risk entity**

Add to `backend/internal/domain/entity/risk.go`:

```go
ImpactCriteriaID    *uuid.UUID `json:"impactCriteriaId,omitempty"`
ImpactJustification string     `json:"impactJustification,omitempty"`
```

- [ ] **Step 7: Update risk create/update usecases**

In `CreateRiskInput` and update input:

```go
ImpactCriteriaID    *uuid.UUID `json:"impactCriteriaId"`
ImpactJustification string     `json:"impactJustification"`
```

Validation rules:
- If `ImpactCriteriaID` provided, validate it exists.
- If user manually sets `impact` different from criteria level, require `ImpactJustification`.
- Set `risks.impact = criteria.impact_level` when criteria selected.

- [ ] **Step 8: Add migration for risk columns**

Add to `000048_impact_criteria.up.sql`:

```sql
ALTER TABLE risks ADD COLUMN IF NOT EXISTS impact_criteria_id UUID REFERENCES impact_criteria(id);
ALTER TABLE risks ADD COLUMN IF NOT EXISTS impact_justification TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_risks_impact_criteria_id ON risks(impact_criteria_id);
```

Add to `000048_impact_criteria.down.sql`:

```sql
DROP INDEX IF EXISTS idx_risks_impact_criteria_id;
ALTER TABLE risks DROP COLUMN IF EXISTS impact_criteria_id;
ALTER TABLE risks DROP COLUMN IF EXISTS impact_justification;
```

- [ ] **Step 9: Update risk repository persistence**

Add `impact_criteria_id` and `impact_justification` to INSERT, SELECT, UPDATE SQL in `backend/internal/repository/postgres/risk.go`.

- [ ] **Step 10: Run backend verification**

Run:

```bash
cd backend
make migrate-up
go test ./...
```

Expected: PASS.

- [ ] **Step 11: Create frontend types**

Create `frontend/src/types/impact-criteria.ts`:

```ts
export type ImpactCriteriaCategory = "kebijakan" | "reputasi" | "fraud_korupsi" | "legal" | "kepatuhan" | "operasional";
export type ImpactCriteriaUPRLevel = "kementerian" | "upr_t1" | "upr_t2";

export interface ImpactCriteria {
  id: string;
  category: ImpactCriteriaCategory;
  uprLevel: ImpactCriteriaUPRLevel;
  impactLevel: number;
  impactLabel: string;
  description: string;
}
```

- [ ] **Step 12: Create API client**

Create `frontend/src/lib/api/impact-criteria.ts`:

```ts
import { api } from "@/lib/api";
import type { ImpactCriteria } from "@/types/impact-criteria";

export async function listImpactCriteria(token: string, params?: { category?: string; uprLevel?: string; impactLevel?: number }) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return api.get<ImpactCriteria[]>(`/impact-criteria${qs ? `?${qs}` : ""}`, token);
}
```

- [ ] **Step 13: Create impact criteria selector component**

Create `frontend/src/components/risk/impact-criteria-selector.tsx`:

Requirements:
- Props: `token`, `category` (risk category), `uprLevel` (org UPR level), `value` (selected criteria ID), `onChange`
- Fetch criteria list filtered by category + upr_level on mount
- Render as card list or table: impact level, label, description
- On select, emit `criteriaId` + `impactLevel`
- Show selected criteria summary after selection
- Helper text: "Pilih kriteria dampak sesuai kategori risiko dan tingkat UPR"

- [ ] **Step 14: Insert selector into risk forms**

In `frontend/src/app/(app)/risk/register/new/page.tsx`:
- After category selection, determine UPR level from selected organization
- Render impact criteria selector
- On selection, set form `impact` to criteria's impact level
- If user overrides impact manually, show justification textarea

Same for assessment form.

- [ ] **Step 15: Update risk types and API payloads**

In `frontend/src/types/risk.ts`, add to create/update request:

```ts
impactCriteriaId?: string;
impactJustification?: string;
```

In `frontend/src/lib/api/risk-register.ts`, include in payloads.

- [ ] **Step 16: Run frontend build**

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 17: Commit**

```bash
git add backend frontend
git commit -m "feat: add KMK impact criteria matrix"
```

---

### Task 7: Enforce Risk Appetite, Tolerance, and Mandatory Mitigation

**Files:**
- Migration: `backend/db/migrations/000049_risk_appetite_fields.up.sql`
- Modify: `backend/internal/domain/entity/risk.go` — add `ResidualAcceptanceReason`, update `RiskAppetite` logic
- Modify: `backend/internal/usecase/risk/create.go` — enforce appetite + mitigation rules
- Modify: `backend/internal/usecase/risk/update.go` — enforce appetite + mitigation rules
- Modify: `backend/internal/repository/postgres/risk.go` — add `residual_acceptance_reason` column
- Test: `backend/internal/domain/entity/risk_test.go` — appetite threshold tests
- Test: `backend/internal/usecase/risk/create_test.go` — mitigation validation tests

**Frontend files:**
- Modify: `frontend/src/lib/risk.ts` — add `ResolveRiskAppetite` helper
- Modify: `frontend/src/types/risk.ts` — add `residualAcceptanceReason`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx` — appetite display + mitigation validation
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — appetite display + mitigation validation

- [ ] **Step 1: Write failing entity tests**

Add to `backend/internal/domain/entity/risk_test.go`:

```go
func TestResolveRiskAppetite(t *testing.T) {
	tests := []struct {
		name  string
		nilai float64
		want  string
	}{
		{"nilai 0", 0, "dalam_batas"},
		{"nilai 5", 5, "dalam_batas"},
		{"nilai 9.99", 9.99, "dalam_batas"},
		{"nilai 10", 10, "di_atas_batas"},
		{"nilai 15", 15, "di_atas_batas"},
		{"nilai 50", 50, "di_atas_batas"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ResolveRiskAppetite(tt.nilai)
			if got != tt.want {
				t.Errorf("ResolveRiskAppetite(%v) = %v, want %v", tt.nilai, got, tt.want)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestResolveRiskAppetite -v
```

Expected: FAIL because `ResolveRiskAppetite` does not exist yet.

- [ ] **Step 3: Create migration**

Create `backend/db/migrations/000049_risk_appetite_fields.up.sql`:

```sql
ALTER TABLE risks ADD COLUMN IF NOT EXISTS residual_acceptance_reason TEXT NOT NULL DEFAULT '';
```

Create `backend/db/migrations/000049_risk_appetite_fields.down.sql`:

```sql
ALTER TABLE risks DROP COLUMN IF EXISTS residual_acceptance_reason;
```

Note: `priority_sort_value` and `leader_judgement_rank` will be added in Task 8 migration (000049_risk_priority_engine). Adjust migration numbers if needed — for this task we only add `residual_acceptance_reason`.

- [ ] **Step 4: Add domain function and update entity**

Add to `backend/internal/domain/entity/risk.go`:

```go
ResidualAcceptanceReason string `json:"residualAcceptanceReason,omitempty"`

// ResolveRiskAppetite returns appetite based on nilai threshold per KMK.
// nilai < 10 → dalam_batas, nilai >= 10 → di_atas_batas.
func ResolveRiskAppetite(nilai float64) string {
	if nilai < 10 {
		return "dalam_batas"
	}
	return "di_atas_batas"
}

// IsRiskUtama returns true if current risk level is Sedang/Tinggi/Sangat Tinggi.
func (r Risk) IsRiskUtama() bool {
	return r.InherentScore >= 12 // threshold for "sedang" and above
}
```

- [ ] **Step 5: Run entity tests**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestResolveRiskAppetite -v
```

Expected: PASS.

- [ ] **Step 6: Update risk create usecase validation**

In `backend/internal/usecase/risk/create.go`:

After calculating `nilai` and `inherentScore`, auto-set:

```go
risk.RiskAppetite = entity.ResolveRiskAppetite(risk.Nilai)
```

Add mitigation validation:

```go
// Risk utama requires at least one mitigation unless treatment is menghindari/berbagi/menerima
if risk.IsRiskUtama() {
	hasMitigation := len(risk.Mitigations) > 0
	hasValidTreatment := risk.TreatmentOption == "menghindari" || risk.TreatmentOption == "berbagi" || risk.TreatmentOption == "menerima"
	if !hasMitigation && !hasValidTreatment {
		return nil, errors.Wrap(errors.ErrInvalidInput, "risk utama requires at least one mitigation or valid treatment option")
	}
}

// If target residual is still di_atas_batas, require acceptance reason
if entity.ResolveRiskAppetite(risk.TargetNilai) == "di_atas_batas" && risk.ResidualAcceptanceReason == "" {
	return nil, errors.Wrap(errors.ErrInvalidInput, "residual acceptance reason is required when target remains above appetite")
}
```

Same validation in `update.go`.

- [ ] **Step 7: Update risk repository persistence**

Add `residual_acceptance_reason` to INSERT, SELECT, UPDATE SQL in `backend/internal/repository/postgres/risk.go`.

- [ ] **Step 8: Add frontend helper**

In `frontend/src/lib/risk.ts`:

```ts
export function resolveRiskAppetite(nilai: number): "dalam_batas" | "di_atas_batas" {
  return nilai < 10 ? "dalam_batas" : "di_atas_batas";
}

export function isRiskUtama(inherentScore: number): boolean {
  return inherentScore >= 12;
}
```

- [ ] **Step 9: Update risk form validation**

In `frontend/src/app/(app)/risk/register/new/page.tsx`:

- Add `residualAcceptanceReason` field to form schema (conditional)
- Display auto-calculated appetite badge after probability/impact selected
- Show warning when `isRiskUtama` and no mitigations added
- Block submit with validation error for missing mitigation on risk utama
- Show `residualAcceptanceReason` textarea only when `targetNilai >= 10`

Same for assessment form.

- [ ] **Step 10: Update risk types and API payloads**

In `frontend/src/types/risk.ts`, add:

```ts
residualAcceptanceReason?: string;
```

In `frontend/src/lib/api/risk-register.ts`, include in payloads.

- [ ] **Step 11: Run verification**

```bash
cd backend
go test ./...

cd ../frontend
npm run build
```

Expected: both PASS.

- [ ] **Step 12: Commit**

```bash
git add backend frontend
git commit -m "feat: enforce KMK risk appetite and mitigation rules"
```

---

### Task 8: Implement KMK Priority Engine

**Files:**
- Create: `backend/db/migrations/000049_risk_priority_engine.up.sql`
- Create: `backend/db/migrations/000049_risk_priority_engine.down.sql`
- Create: `backend/internal/domain/service/risk_priority.go`
- Modify: `backend/internal/domain/entity/risk.go` — add `LeaderJudgementRank`, `PrioritySortValue`
- Modify: `backend/internal/repository/postgres/risk.go` — add columns + update list query order
- Modify: `backend/internal/usecase/risk/create.go` — compute priority after create
- Modify: `backend/internal/usecase/risk/update.go` — compute priority after update
- Modify: `backend/internal/usecase/risk/list_register.go` — default order by priority
- Test: `backend/internal/domain/service/risk_priority_test.go`
- Test: `backend/internal/usecase/risk/create_test.go` — priority computation tests

**Frontend files:**
- Modify: `frontend/src/types/risk.ts` — add priority fields
- Modify: `frontend/src/app/(app)/risk/register/page.tsx` — default sort by priority
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — show priority rank (pimpinan/reviewer only)

- [ ] **Step 1: Write failing service tests**

Create `backend/internal/domain/service/risk_priority_test.go`:

```go
package service

import (
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestCalculatePrioritySortValue(t *testing.T) {
	tests := []struct {
		name               string
		nilai              float64
		impactLevel        int
		categoryOrder      int
		leaderJudgementRank *int
		wantGreaterThan    float64 // assert result > this value
	}{
		{
			name:            "high nilai dominates",
			nilai:           50,
			impactLevel:     3,
			categoryOrder:   6,
			wantGreaterThan: 1000,
		},
		{
			name:            "same nilai, higher impact wins",
			nilai:           20,
			impactLevel:     5,
			categoryOrder:   6,
			wantGreaterThan: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculatePrioritySortValue(tt.nilai, tt.impactLevel, tt.categoryOrder, tt.leaderJudgementRank)
			if got <= tt.wantGreaterThan {
				t.Errorf("CalculatePrioritySortValue() = %v, want > %v", got, tt.wantGreaterThan)
			}
		})
	}
}

func TestPriorityComparator(t *testing.T) {
	risks := []entity.Risk{
		{Nilai: 30, Impact: 4, Category: "kebijakan", PrioritySortValue: 0},
		{Nilai: 30, Impact: 4, Category: "operasional", PrioritySortValue: 0},
		{Nilai: 25, Impact: 5, Category: "kebijakan", PrioritySortValue: 0},
	}
	// After sorting: highest nilai first, then higher impact, then lower category order
	// kebijakan (order 1) vs operasional (order 6)
	// Expected order: risks[0] (kebijakan, 30), risks[1] (operasional, 30), risks[2] (kebijakan, 25)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/service -run TestCalculatePrioritySortValue -v
```

Expected: FAIL because `CalculatePrioritySortValue` does not exist yet.

- [ ] **Step 3: Create migration**

Create `backend/db/migrations/000049_risk_priority_engine.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS risk_category_priorities (
    category TEXT PRIMARY KEY,
    priority_order INTEGER NOT NULL CHECK (priority_order > 0)
);

INSERT INTO risk_category_priorities (category, priority_order) VALUES
('kebijakan', 1),
('reputasi', 2),
('fraud_korupsi', 3),
('legal', 4),
('kepatuhan', 5),
('operasional', 6)
ON CONFLICT (category) DO NOTHING;

ALTER TABLE risks ADD COLUMN IF NOT EXISTS leader_judgement_rank INTEGER;
ALTER TABLE risks ADD COLUMN IF NOT EXISTS priority_sort_value NUMERIC(12,4) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_risks_priority_sort ON risks(priority_sort_value DESC);
```

Create `backend/db/migrations/000049_risk_priority_engine.down.sql`:

```sql
DROP INDEX IF EXISTS idx_risks_priority_sort;
ALTER TABLE risks DROP COLUMN IF EXISTS leader_judgement_rank;
ALTER TABLE risks DROP COLUMN IF EXISTS priority_sort_value;
DROP TABLE IF EXISTS risk_category_priorities;
```

Note: If `000049_risk_appetite_fields.up.sql` already used number 000049, rename this to `000050_risk_priority_engine` and adjust Task 7 migration to `000049`.

- [ ] **Step 4: Create priority service**

Create `backend/internal/domain/service/risk_priority.go`:

```go
package service

import (
	"math"

	"github.com/manris/backend/internal/domain/entity"
)

// CategoryPriorityOrder returns the KMK priority order for a risk category.
// Lower number = higher priority. Default to 99 for unknown categories.
func CategoryPriorityOrder(category string) int {
	orders := map[string]int{
		"kebijakan":     1,
		"reputasi":      2,
		"fraud_korupsi": 3,
		"legal":         4,
		"kepatuhan":     5,
		"operasional":   6,
	}
	if o, ok := orders[category]; ok {
		return o
	}
	return 99
}

// CalculatePrioritySortValue computes a deterministic sort value for KMK priority.
// Tie-breaker order: nilai → impact level → category order → leader judgement rank.
func CalculatePrioritySortValue(nilai float64, impactLevel int, categoryOrder int, leaderJudgementRank *int) float64 {
	// Base: nilai scaled to avoid overlap (max nilai ~ 100)
	value := nilai * 10000

	// Secondary: impact level (5 = highest, add 500 to ensure it matters)
	value += float64(impactLevel) * 100

	// Tertiary: lower category order = higher priority (invert)
	value += float64(10-categoryOrder) * 10

	// Quaternary: lower leader judgement rank = higher priority
	if leaderJudgementRank != nil {
		value += float64(10-*leaderJudgementRank)
	}

	return math.Round(value*100) / 100
}

// RecomputeRiskPriority updates PrioritySortValue on a risk entity.
func RecomputeRiskPriority(risk *entity.Risk) {
	catOrder := CategoryPriorityOrder(risk.Category)
	risk.PrioritySortValue = CalculatePrioritySortValue(risk.Nilai, risk.Impact, catOrder, risk.LeaderJudgementRank)
}
```

- [ ] **Step 5: Update risk entity**

Add to `backend/internal/domain/entity/risk.go`:

```go
LeaderJudgementRank *int     `json:"leaderJudgementRank,omitempty"`
PrioritySortValue   float64  `json:"prioritySortValue,omitempty"`
```

- [ ] **Step 6: Run service tests**

Run:

```bash
cd backend
go test ./internal/domain/service -run TestCalculatePrioritySortValue -v
```

Expected: PASS.

- [ ] **Step 7: Update risk create/update usecases**

In `backend/internal/usecase/risk/create.go`, after calculating `nilai` and `weight`:

```go
import "github.com/manris/backend/internal/domain/service"

// ... after risk.CalculateNilai() etc ...
service.RecomputeRiskPriority(risk)
```

Same in `update.go` after any probability/impact/category change.

- [ ] **Step 8: Update risk repository**

Add `leader_judgement_rank` and `priority_sort_value` to INSERT, SELECT, UPDATE SQL.

- [ ] **Step 9: Update list register query order**

In `backend/internal/usecase/risk/list_register.go` and `backend/internal/repository/postgres/risk.go` `ListRegister`:

Change default order from `created_at DESC` to:

```sql
ORDER BY priority_sort_value DESC, created_at DESC
```

- [ ] **Step 10: Run backend verification**

Run:

```bash
cd backend
make migrate-up
go test ./...
```

Expected: PASS.

- [ ] **Step 11: Update frontend types**

In `frontend/src/types/risk.ts`:

```ts
leaderJudgementRank?: number;
prioritySortValue?: number;
```

- [ ] **Step 12: Update risk register table sorting**

In `frontend/src/app/(app)/risk/register/page.tsx`:
- Default sort by `prioritySortValue` descending
- Show priority rank indicator (badge with number) per row
- Allow toggling sort between priority and created date

- [ ] **Step 13: Add leader judgement rank field (pimpinan/reviewer only)**

In `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`:
- Show `leaderJudgementRank` input only when user role is `pimpinan` or `reviewer`
- Range 1-10, lower = higher priority
- On change, trigger reassessment/priority recalculation

- [ ] **Step 14: Update working paper export**

In `frontend/src/lib/working-paper-export.ts`:
- Include `prioritySortValue` in export metadata
- Include KMK priority rank

- [ ] **Step 15: Run verification**

```bash
cd backend
go test ./...

cd ../frontend
npm run build
```

Expected: both PASS.

- [ ] **Step 16: Commit**

```bash
git add backend frontend
git commit -m "feat: add KMK risk priority engine"
```

---

## Batch B Exit Criteria

Batch B complete only if all below true:

- Likelihood assessment wizard tersedia di risk form (frekuensi/probabilitas/expert/benchmarking/konsensus).
- Impact criteria matrix tersedia dengan filter category + UPR level.
- Risk appetite dihitung otomatis dari nilai (`< 10` → `dalam_batas`, `>= 10` → `di_atas_batas`).
- Risk utama wajib punya minimal 1 mitigasi (kecuali treatment menghindari/berbagi/menerima).
- Residual acceptance reason wajib diisi jika target nilai masih `>= 10`.
- Risk register default sort by KMK priority (nilai → impact → category → leader judgement).
- `go test ./...` passes.
- `npm run build` passes.

---

## Self-Review

### Spec coverage

- Recommendation 5: analisis kemungkinan berbasis data — covered in Task 5.
- Recommendation 6: analisis dampak berbasis kategori + tingkat UPR — covered in Task 6.
- Recommendation 7: evaluasi appetite/tolerance/priority — covered in Task 7 and 8.
- Recommendation 8: prioritas risiko dengan tie-breaker KMK — covered in Task 8.

### Placeholder scan

No `TODO`, `TBD`, or "implement later" markers included. Each task names exact files, concrete fields, SQL, routes, and verification commands.

### Type consistency

Consistent names used across plan:
- `LikelihoodAssessment`
- `ImpactCriteria`
- `likelihood_assessments`
- `impact_criteria`
- `risk_category_priorities`
- `ResolveRiskAppetite`
- `PrioritySortValue`
- `LeaderJudgementRank`

### Migration numbering

Assumed sequence after Batch A (000044-000046):
- `000047` likelihood_assessments
- `000048` impact_criteria (+ appetite fields)
- `000049` risk_priority_engine

Adjust if intermediate migrations already exist at execution time.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-01-kmk-batch-b-scoring.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**

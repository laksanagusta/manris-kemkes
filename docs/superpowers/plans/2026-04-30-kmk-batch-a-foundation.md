# KMK Batch A Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi KMK untuk Manris v2 melalui penyelarasan istilah, modul Piagam/Konteks MR, master Sasaran/IKU, dan keterkaitan wajib antara risiko dengan sasaran organisasi.

**Architecture:** Batch A dipecah menjadi empat jalur berurutan: terminology alignment, charter module, objective module, lalu risk-objective linkage. Semua perubahan mengikuti pola Clean Architecture backend yang sudah ada dan App Router + typed API client di frontend. Setiap jalur menghasilkan software yang dapat diuji dan tetap backward compatible melalui feature flag untuk objective linkage.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL migrations + Next.js App Router + React + TypeScript + shadcn/ui + Zod + React Hook Form.

---

## File Structure Map

### Existing files to reuse

- `backend/cmd/server/main.go` — tambah route baru.
- `backend/internal/bootstrap/bootstrap.go` — wire repository, usecase, handler baru.
- `backend/internal/handler/http/organization.go` — referensi pattern handler CRUD.
- `backend/internal/usecase/organization/*.go` — referensi pattern usecase CRUD.
- `backend/internal/repository/postgres/organization.go` — referensi pattern repository Postgres.
- `backend/internal/domain/entity/risk.go` — tambah field `ObjectiveID` dan helper terkait.
- `backend/internal/repository/postgres/risk.go` — update persistence risk.
- `backend/internal/usecase/risk/create.go` — validasi input risk-objective.
- `backend/internal/usecase/risk/update.go` — validasi update risk-objective.
- `frontend/src/lib/risk.ts` — terminology labels.
- `frontend/src/types/risk.ts` — tambah objective payload.
- `frontend/src/lib/api/organizations.ts` — referensi API paginated list.
- `frontend/src/lib/api/risk-register.ts` — referensi list/register types.
- `frontend/src/app/(app)/risk/register/new/page.tsx` — tambahkan objective picker.
- `frontend/src/lib/working-paper-export.ts` — tampilkan objective metadata.
- `frontend/src/lib/app-navigation.ts` — navigation + breadcrumb.

### New backend files

- `backend/db/migrations/000044_risk_charters.up.sql`
- `backend/db/migrations/000044_risk_charters.down.sql`
- `backend/db/migrations/000045_risk_objectives.up.sql`
- `backend/db/migrations/000045_risk_objectives.down.sql`
- `backend/db/migrations/000046_risks_add_objective_id.up.sql`
- `backend/db/migrations/000046_risks_add_objective_id.down.sql`
- `backend/internal/domain/entity/risk_charter.go`
- `backend/internal/domain/entity/risk_objective.go`
- `backend/internal/domain/repository/risk_charter.go`
- `backend/internal/domain/repository/risk_objective.go`
- `backend/internal/repository/postgres/risk_charter.go`
- `backend/internal/repository/postgres/risk_objective.go`
- `backend/internal/usecase/riskcharter/create.go`
- `backend/internal/usecase/riskcharter/get.go`
- `backend/internal/usecase/riskcharter/list.go`
- `backend/internal/usecase/riskcharter/update.go`
- `backend/internal/usecase/riskobjective/create.go`
- `backend/internal/usecase/riskobjective/get.go`
- `backend/internal/usecase/riskobjective/list.go`
- `backend/internal/usecase/riskobjective/update.go`
- `backend/internal/usecase/riskobjective/delete.go`
- `backend/internal/handler/http/risk_charter.go`
- `backend/internal/handler/http/risk_objective.go`

### New frontend files

- `frontend/src/types/risk-charter.ts`
- `frontend/src/types/risk-objective.ts`
- `frontend/src/lib/api/risk-charters.ts`
- `frontend/src/lib/api/risk-objectives.ts`
- `frontend/src/app/(app)/management/charters/page.tsx`
- `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- `frontend/src/app/(app)/management/objectives/page.tsx`
- `frontend/src/app/(app)/management/objectives/new/page.tsx`
- `frontend/src/app/(app)/management/objectives/[id]/page.tsx`
- `frontend/src/components/risk/objective-picker.tsx`

---

## Delivery Order

1. Task 1 — terminology alignment.
2. Task 2 — `risk_charters` backend + routes.
3. Task 3 — charter UI + API client.
4. Task 4 — `risk_objectives` backend + routes.
5. Task 5 — objective UI + API client.
6. Task 6 — `risks.objective_id` backend linkage + feature flag.
7. Task 7 — risk form + export integration.
8. Task 8 — final verification + rollout notes.

---

### Task 1: Align UI terminology with KMK

**Files:**
- Modify: `frontend/src/lib/risk.ts`
- Modify: `frontend/src/lib/risk.test.ts`
- Search/modify: `frontend/src/**/*.{ts,tsx}` for display strings `Ekstrem`, `Sangat Jarang`, `Kadang-kadang`, `Sering`, `Sangat Berat`

- [x] **Step 1: Write failing test for KMK labels**

```ts
import { strict as assert } from "node:assert";
import test from "node:test";
import {
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  getRiskLevelDisplayLabel,
} from "./risk";

test("KMK probability labels use official wording", () => {
  assert.equal(PROBABILITY_LABELS[1], "Jarang");
  assert.equal(PROBABILITY_LABELS[2], "Kemungkinan Kecil");
  assert.equal(PROBABILITY_LABELS[3], "Kemungkinan Sedang");
  assert.equal(PROBABILITY_LABELS[4], "Kemungkinan Besar");
  assert.equal(PROBABILITY_LABELS[5], "Hampir Pasti Terjadi");
});

test("KMK impact labels use official wording", () => {
  assert.equal(IMPACT_LABELS[1], "Tidak Signifikan");
  assert.equal(IMPACT_LABELS[5], "Katastropik");
});

test("highest display label stays KMK-compatible", () => {
  assert.equal(getRiskLevelDisplayLabel("sangat_tinggi"), "Sangat Tinggi");
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd frontend
npm test -- risk.test.ts
```

Expected: FAIL because current labels still use non-KMK wording.

- [x] **Step 3: Update risk label constants**

Update `frontend/src/lib/risk.ts`:

```ts
export const PROBABILITY_LABELS: Record<number, string> = {
  1: "Jarang",
  2: "Kemungkinan Kecil",
  3: "Kemungkinan Sedang",
  4: "Kemungkinan Besar",
  5: "Hampir Pasti Terjadi",
};

export const IMPACT_LABELS: Record<number, string> = {
  1: "Tidak Signifikan",
  2: "Kecil",
  3: "Sedang",
  4: "Besar",
  5: "Katastropik",
};

export function getRiskLevelDisplayLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    sangat_tinggi: "Sangat Tinggi",
    tinggi: "Tinggi",
    sedang: "Sedang",
    rendah: "Rendah",
    sangat_rendah: "Sangat Rendah",
  };
  return labels[level] || level;
}
```

- [x] **Step 4: Replace legacy visible labels in UI**

Search and replace examples:

```bash
cd frontend
rg -n "Ekstrem|Sangat Jarang|Kadang-kadang|Sering|Sangat Berat" src
```

Replace with:
- `Ekstrem` → `Sangat Tinggi`
- `Sangat Jarang` → `Jarang`
- `Kadang-kadang` → `Kemungkinan Sedang`
- `Sering` → `Kemungkinan Besar`
- `Sangat Berat` → `Katastropik`

- [x] **Step 5: Run verification**

Run:

```bash
cd frontend
npm test -- risk.test.ts
npm run build
```

Expected: PASS, then successful build.

- [x] **Step 6: Commit**

```bash
git add frontend/src/lib/risk.ts frontend/src/lib/risk.test.ts frontend/src
git commit -m "fix: align risk terminology with KMK"
```

---

### Task 2: Add backend Risk Charter module

**Files:**
- Create: `backend/db/migrations/000044_risk_charters.up.sql`
- Create: `backend/db/migrations/000044_risk_charters.down.sql`
- Create: `backend/internal/domain/entity/risk_charter.go`
- Create: `backend/internal/domain/repository/risk_charter.go`
- Create: `backend/internal/repository/postgres/risk_charter.go`
- Create: `backend/internal/usecase/riskcharter/create.go`
- Create: `backend/internal/usecase/riskcharter/get.go`
- Create: `backend/internal/usecase/riskcharter/list.go`
- Create: `backend/internal/usecase/riskcharter/update.go`
- Create: `backend/internal/handler/http/risk_charter.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/domain/entity/risk_charter_test.go`
- Test: `backend/internal/handler/http/risk_charter_test.go`

- [x] **Step 1: Write failing entity tests**

Create `backend/internal/domain/entity/risk_charter_test.go`:

```go
package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestRiskCharterValidate(t *testing.T) {
	orgID := uuid.MustParse("11111111-1111-1111-1111-111111111111")

	tests := []struct {
		name    string
		charter RiskCharter
		wantErr bool
	}{
		{
			name: "valid charter",
			charter: RiskCharter{
				OrganizationID: orgID,
				UPRLevel:       "upr_t1",
				Period:         "2026-H1",
				RiskOwnerName:  "Direktur A",
				Status:         "draft",
			},
			wantErr: false,
		},
		{
			name: "invalid upr level",
			charter: RiskCharter{
				OrganizationID: orgID,
				UPRLevel:       "foo",
				Period:         "2026-H1",
				RiskOwnerName:  "Direktur A",
				Status:         "draft",
			},
			wantErr: true,
		},
		{
			name: "missing period",
			charter: RiskCharter{
				OrganizationID: orgID,
				UPRLevel:       "upr_t1",
				RiskOwnerName:  "Direktur A",
				Status:         "draft",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.charter.Validate()
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
go test ./internal/domain/entity -run TestRiskCharterValidate -v
```

Expected: FAIL because `RiskCharter` type does not exist yet.

- [x] **Step 3: Create migration**

Create `backend/db/migrations/000044_risk_charters.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS risk_charters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    upr_level TEXT NOT NULL CHECK (upr_level IN ('eksekutif','upr_t1','upr_t2')),
    period TEXT NOT NULL,
    risk_owner_name TEXT NOT NULL,
    risk_owner_user_id UUID REFERENCES users(id),
    risk_team_name TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL DEFAULT '',
    legal_basis TEXT NOT NULL DEFAULT '',
    internal_context TEXT NOT NULL DEFAULT '',
    external_context TEXT NOT NULL DEFAULT '',
    stakeholder_summary TEXT NOT NULL DEFAULT '',
    upr_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','archived')),
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period, upr_level)
);

CREATE INDEX IF NOT EXISTS idx_risk_charters_org_period ON risk_charters(organization_id, period);
CREATE INDEX IF NOT EXISTS idx_risk_charters_status ON risk_charters(status);
```

Create `backend/db/migrations/000044_risk_charters.down.sql`:

```sql
DROP TABLE IF EXISTS risk_charters;
```

- [x] **Step 4: Create entity and validation**

Create `backend/internal/domain/entity/risk_charter.go`:

```go
package entity

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RiskCharter struct {
	ID                 uuid.UUID       `json:"id"`
	OrganizationID     uuid.UUID       `json:"organizationId"`
	UPRLevel           string          `json:"uprLevel"`
	Period             string          `json:"period"`
	RiskOwnerName      string          `json:"riskOwnerName"`
	RiskOwnerUserID    *uuid.UUID      `json:"riskOwnerUserId,omitempty"`
	RiskTeamName       string          `json:"riskTeamName"`
	Scope              string          `json:"scope"`
	LegalBasis         string          `json:"legalBasis"`
	InternalContext    string          `json:"internalContext"`
	ExternalContext    string          `json:"externalContext"`
	StakeholderSummary string          `json:"stakeholderSummary"`
	UPRStructure       json.RawMessage `json:"uprStructure"`
	Status             string          `json:"status"`
	CreatedBy          *uuid.UUID      `json:"createdBy,omitempty"`
	ApprovedBy         *uuid.UUID      `json:"approvedBy,omitempty"`
	ApprovedAt         *time.Time      `json:"approvedAt,omitempty"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
}

func (r RiskCharter) Validate() error {
	if r.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(r.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if strings.TrimSpace(r.RiskOwnerName) == "" {
		return fmt.Errorf("risk owner name is required")
	}
	switch r.UPRLevel {
	case "eksekutif", "upr_t1", "upr_t2":
	default:
		return fmt.Errorf("invalid upr level")
	}
	switch r.Status {
	case "draft", "in_review", "approved", "archived":
	default:
		return fmt.Errorf("invalid status")
	}
	return nil
}
```

- [x] **Step 5: Run entity tests**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestRiskCharterValidate -v
```

Expected: PASS.

- [x] **Step 6: Create repository interface**

Create `backend/internal/domain/repository/risk_charter.go`:

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type RiskCharterListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	Page           int
	Limit          int
}

type RiskCharterRepository interface {
	Create(ctx context.Context, charter *entity.RiskCharter) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.RiskCharter, error)
	Update(ctx context.Context, charter *entity.RiskCharter) error
	List(ctx context.Context, filter RiskCharterListFilter) ([]*entity.RiskCharter, int, error)
	ExistsByOrgPeriodLevel(ctx context.Context, organizationID uuid.UUID, period, uprLevel string, excludeID *uuid.UUID) (bool, error)
}
```

- [x] **Step 7: Implement Postgres repository**

Use organization repository style. Include `Create`, `GetByID`, `Update`, `List`, and uniqueness check.

Core insert SQL to include:

```sql
INSERT INTO risk_charters (
  organization_id, upr_level, period, risk_owner_name, risk_owner_user_id,
  risk_team_name, scope, legal_basis, internal_context, external_context,
  stakeholder_summary, upr_structure, status, created_by, approved_by, approved_at
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
)
RETURNING id, created_at, updated_at
```

- [x] **Step 8: Implement usecases**

Create separate usecases matching existing pattern. Validation rules:
- create/update must call `Validate()`.
- uniqueness on `(organization_id, period, upr_level)`.
- approved charter cannot be edited except status change to archived.

Example create input:

```go
type CreateRiskCharterInput struct {
	OrganizationID     uuid.UUID        `json:"organizationId"`
	UPRLevel           string           `json:"uprLevel"`
	Period             string           `json:"period"`
	RiskOwnerName      string           `json:"riskOwnerName"`
	RiskOwnerUserID    *uuid.UUID       `json:"riskOwnerUserId"`
	RiskTeamName       string           `json:"riskTeamName"`
	Scope              string           `json:"scope"`
	LegalBasis         string           `json:"legalBasis"`
	InternalContext    string           `json:"internalContext"`
	ExternalContext    string           `json:"externalContext"`
	StakeholderSummary string           `json:"stakeholderSummary"`
	UPRStructure       json.RawMessage  `json:"uprStructure"`
	CreatedBy          *uuid.UUID       `json:"-"`
}
```

- [x] **Step 9: Implement HTTP handler + routes**

Create `backend/internal/handler/http/risk_charter.go` with methods `List`, `Create`, `Get`, `Update`.

Add routes in `backend/cmd/server/main.go`:

```go
cleanRiskCharterHandler := httpHandler.NewRiskCharterHandler(
	container.RiskCharterCreateUC,
	container.RiskCharterGetUC,
	container.RiskCharterUpdateUC,
	container.RiskCharterListUC,
)

protected.Get("/risk-charters", cleanRiskCharterHandler.List)
protected.Post("/risk-charters", cleanRiskCharterHandler.Create)
protected.Get("/risk-charters/:id", cleanRiskCharterHandler.Get)
protected.Put("/risk-charters/:id", cleanRiskCharterHandler.Update)
```

- [x] **Step 10: Wire bootstrap**

Add repository/usecase/handler construction in `backend/internal/bootstrap/bootstrap.go` and include fields in container as needed.

- [x] **Step 11: Run migration + backend tests**

Run:

```bash
cd backend
make migrate-up
go test ./...
```

Expected: migration succeeds, tests pass.

- [x] **Step 12: Commit**

```bash
git add backend
git commit -m "feat: add backend KMK risk charter module"
```

---

### Task 3: Add frontend Risk Charter UI and API client

**Files:**
- Create: `frontend/src/types/risk-charter.ts`
- Create: `frontend/src/lib/api/risk-charters.ts`
- Create: `frontend/src/app/(app)/management/charters/page.tsx`
- Create: `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`

- [x] **Step 1: Define frontend types**

Create `frontend/src/types/risk-charter.ts`:

```ts
export type RiskCharterStatus = "draft" | "in_review" | "approved" | "archived";
export type RiskCharterUPRLevel = "eksekutif" | "upr_t1" | "upr_t2";

export interface RiskCharter {
  id: string;
  organizationId: string;
  uprLevel: RiskCharterUPRLevel;
  period: string;
  riskOwnerName: string;
  riskOwnerUserId?: string;
  riskTeamName: string;
  scope: string;
  legalBasis: string;
  internalContext: string;
  externalContext: string;
  stakeholderSummary: string;
  uprStructure: Array<{ title: string; name: string }>;
  status: RiskCharterStatus;
  createdAt: string;
  updatedAt: string;
}
```

- [x] **Step 2: Add API client**

Create `frontend/src/lib/api/risk-charters.ts` using same style as organization API:

```ts
import { api } from "@/lib/api";
import type { RiskCharter } from "@/types/risk-charter";

export interface PaginatedRiskCharterResponse {
  data: RiskCharter[];
  total: number;
  page: number;
  limit: number;
}

export async function listRiskCharters(token: string, params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return api.get<PaginatedRiskCharterResponse>(`/risk-charters${qs ? `?${qs}` : ""}`, token);
}
```

- [x] **Step 3: Create list page**

Page requirements:
- filters: period, status
- columns: organization, UPR level, period, owner, status, updated at
- action: open detail page

Use existing card/table visual style from admin and working paper pages.

- [x] **Step 4: Create detail/edit page**

Use `FormPage`, `FormHeader`, `FormSection`. Sections:
- Identitas piagam
- Ruang lingkup
- Dasar hukum
- Konteks internal
- Konteks eksternal
- Ringkasan stakeholder
- Struktur UPR

- [x] **Step 5: Add navigation + breadcrumb**

Update `frontend/src/lib/app-navigation.ts`:

```ts
{
  title: "RISK GOVERNANCE",
  items: [
    { label: "Piagam MR", href: "/management/charters", icon: "ClipboardPenLine" },
    { label: "Sasaran & IKU", href: "/management/objectives", icon: "Goal" },
  ],
}
```

Also add breadcrumb labels.

- [x] **Step 6: Run frontend verification**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add frontend
git commit -m "feat: add frontend KMK risk charter pages"
```

---

### Task 4: Add backend Risk Objective module

**Files:**
- Create: `backend/db/migrations/000045_risk_objectives.up.sql`
- Create: `backend/db/migrations/000045_risk_objectives.down.sql`
- Create: `backend/internal/domain/entity/risk_objective.go`
- Create: `backend/internal/domain/repository/risk_objective.go`
- Create: `backend/internal/repository/postgres/risk_objective.go`
- Create: `backend/internal/usecase/riskobjective/create.go`
- Create: `backend/internal/usecase/riskobjective/get.go`
- Create: `backend/internal/usecase/riskobjective/list.go`
- Create: `backend/internal/usecase/riskobjective/update.go`
- Create: `backend/internal/usecase/riskobjective/delete.go`
- Create: `backend/internal/handler/http/risk_objective.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`
- Test: `backend/internal/domain/entity/risk_objective_test.go`

- [x] **Step 1: Write failing entity test**

Create `backend/internal/domain/entity/risk_objective_test.go`:

```go
package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestRiskObjectiveValidate(t *testing.T) {
	objective := RiskObjective{
		OrganizationID:        uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Period:                "2026-H1",
		Tujuan:                "Penguatan tata kelola",
		Sasaran:               "Peningkatan kepatuhan",
		IndikatorKinerjaUtama: "Persentase kepatuhan 95%",
	}
	if err := objective.Validate(); err != nil {
		t.Fatalf("Validate() unexpected error = %v", err)
	}
}
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/domain/entity -run TestRiskObjectiveValidate -v
```

Expected: FAIL because `RiskObjective` does not exist.

- [x] **Step 3: Create migration**

Create `backend/db/migrations/000045_risk_objectives.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS risk_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    charter_id UUID REFERENCES risk_charters(id),
    period TEXT NOT NULL,
    tujuan TEXT NOT NULL,
    sasaran TEXT NOT NULL,
    indikator_kinerja_utama TEXT NOT NULL,
    target TEXT NOT NULL DEFAULT '',
    program TEXT NOT NULL DEFAULT '',
    kegiatan TEXT NOT NULL DEFAULT '',
    process_business TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_objectives_org_period ON risk_objectives(organization_id, period);
CREATE INDEX IF NOT EXISTS idx_risk_objectives_charter ON risk_objectives(charter_id);
```

Create down migration:

```sql
DROP TABLE IF EXISTS risk_objectives;
```

- [x] **Step 4: Create entity**

Create `backend/internal/domain/entity/risk_objective.go`:

```go
package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type RiskObjective struct {
	ID                    uuid.UUID  `json:"id"`
	OrganizationID        uuid.UUID  `json:"organizationId"`
	CharterID             *uuid.UUID `json:"charterId,omitempty"`
	Period                string     `json:"period"`
	Tujuan                string     `json:"tujuan"`
	Sasaran               string     `json:"sasaran"`
	IndikatorKinerjaUtama string     `json:"indikatorKinerjaUtama"`
	Target                string     `json:"target"`
	Program               string     `json:"program"`
	Kegiatan              string     `json:"kegiatan"`
	ProcessBusiness       string     `json:"processBusiness"`
	CreatedBy             *uuid.UUID `json:"createdBy,omitempty"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

func (o RiskObjective) Validate() error {
	if o.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(o.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if strings.TrimSpace(o.Tujuan) == "" {
		return fmt.Errorf("tujuan is required")
	}
	if strings.TrimSpace(o.Sasaran) == "" {
		return fmt.Errorf("sasaran is required")
	}
	if strings.TrimSpace(o.IndikatorKinerjaUtama) == "" {
		return fmt.Errorf("indikator kinerja utama is required")
	}
	return nil
}
```

- [x] **Step 5: Implement repository + usecases + handler**

Mirror organization CRUD pattern. Include paginated list with filters:
- `organization_id`
- `period`
- `q` against `sasaran`, `indikator_kinerja_utama`, `program`, `kegiatan`

Add routes:

```go
cleanRiskObjectiveHandler := httpHandler.NewRiskObjectiveHandler(
	container.RiskObjectiveCreateUC,
	container.RiskObjectiveGetUC,
	container.RiskObjectiveUpdateUC,
	container.RiskObjectiveDeleteUC,
	container.RiskObjectiveListUC,
)

protected.Get("/risk-objectives", cleanRiskObjectiveHandler.List)
protected.Post("/risk-objectives", cleanRiskObjectiveHandler.Create)
protected.Get("/risk-objectives/:id", cleanRiskObjectiveHandler.Get)
protected.Put("/risk-objectives/:id", cleanRiskObjectiveHandler.Update)
protected.Delete("/risk-objectives/:id", cleanRiskObjectiveHandler.Delete)
```

- [x] **Step 6: Run backend verification**

Run:

```bash
cd backend
make migrate-up
go test ./...
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add backend
git commit -m "feat: add backend KMK risk objective module"
```

---

### Task 5: Add frontend Risk Objective UI and API client

**Files:**
- Create: `frontend/src/types/risk-objective.ts`
- Create: `frontend/src/lib/api/risk-objectives.ts`
- Create: `frontend/src/app/(app)/management/objectives/page.tsx`
- Create: `frontend/src/app/(app)/management/objectives/new/page.tsx`
- Create: `frontend/src/app/(app)/management/objectives/[id]/page.tsx`

- [x] **Step 1: Create type definitions**

Create `frontend/src/types/risk-objective.ts`:

```ts
export interface RiskObjective {
  id: string;
  organizationId: string;
  charterId?: string;
  period: string;
  tujuan: string;
  sasaran: string;
  indikatorKinerjaUtama: string;
  target: string;
  program: string;
  kegiatan: string;
  processBusiness: string;
  createdAt: string;
  updatedAt: string;
}
```

- [x] **Step 2: Create API client**

Create `frontend/src/lib/api/risk-objectives.ts`:

```ts
import { api } from "@/lib/api";
import type { RiskObjective } from "@/types/risk-objective";

export interface PaginatedRiskObjectiveResponse {
  data: RiskObjective[];
  total: number;
  page: number;
  limit: number;
}

export async function listRiskObjectives(token: string, params?: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return api.get<PaginatedRiskObjectiveResponse>(`/risk-objectives${qs ? `?${qs}` : ""}`, token);
}
```

- [x] **Step 3: Create objectives list page**

UI requirements:
- searchable table
- filters by period and org
- columns: sasaran, IKU, target, program, kegiatan
- CTA button `Tambah Sasaran`

- [x] **Step 4: Create new/edit page**

Form fields:
- period
- tujuan
- sasaran
- indikator kinerja utama
- target
- program
- kegiatan
- process business

Validation: tujuan/sasaran/IKU required.

- [x] **Step 5: Run frontend verification**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat: add frontend KMK objective pages"
```

---

### Task 6: Add backend risk-to-objective linkage and feature flag

**Files:**
- Create: `backend/db/migrations/000046_risks_add_objective_id.up.sql`
- Create: `backend/db/migrations/000046_risks_add_objective_id.down.sql`
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/domain/repository/risk.go` if request/filters expose objective
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/config/config.go`
- Modify: `backend/internal/bootstrap/bootstrap.go` if config injection needed
- Test: `backend/internal/usecase/risk/create_test.go`

- [ ] **Step 1: Write failing usecase test**

Add test case to `backend/internal/usecase/risk/create_test.go`:

```go
func TestCreateRisk_RequiresObjectiveWhenKMKFlagEnabled(t *testing.T) {
	creatorID := uuid.New()

	riskRepo := &stubRiskRepo{}
	userRepo := &stubUserRepo{}
	orgRepo := &stubOrganizationRepo{}

	uc := NewCreateRiskUseCase(riskRepo, userRepo, orgRepo)
	_, err := uc.Execute(context.Background(), CreateRiskInput{
		Title:             "Risiko uji",
		Description:       "Deskripsi risiko uji yang valid untuk kebutuhan pengujian",
		Category:          entity.RiskCategoryOperasional,
		CreatedBy:         &creatorID,
		Probability:       3,
		Impact:            3,
		TargetProbability: 2,
		TargetImpact:      2,
		RequireObjective:  true,
	})
	if err == nil {
		t.Fatal("expected error when objective is missing")
	}
}
```

If file does not already have test doubles, add concrete in-memory stubs in same test file before the test:

```go
type stubRiskRepo struct{}

func (s *stubRiskRepo) Create(ctx context.Context, risk *entity.Risk) error { return nil }
func (s *stubRiskRepo) GetByID(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	return nil, nil
}
func (s *stubRiskRepo) Update(ctx context.Context, risk *entity.Risk) error { return nil }
func (s *stubRiskRepo) Delete(ctx context.Context, id uuid.UUID) error { return nil }
func (s *stubRiskRepo) List(ctx context.Context, orgIDs []uuid.UUID, status string, category string) ([]*entity.Risk, error) {
	return nil, nil
}
func (s *stubRiskRepo) ListRegister(ctx context.Context, filter repository.RiskRegisterFilter) ([]*entity.Risk, int, error) {
	return nil, 0, nil
}
func (s *stubRiskRepo) ListMitigations(ctx context.Context, orgIDs []uuid.UUID) ([]*entity.MitigationAssoc, error) {
	return nil, nil
}
func (s *stubRiskRepo) NextRiskCode(ctx context.Context) (string, error) { return "R-999", nil }
func (s *stubRiskRepo) ListApprovedRisks(ctx context.Context, orgIDs []uuid.UUID, query string) ([]*entity.Risk, error) {
	return nil, nil
}
func (s *stubRiskRepo) DashboardSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.DashboardSummary, error) {
	return nil, nil
}
func (s *stubRiskRepo) DashboardCategoryCounts(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.DashboardCategoryCount, error) {
	return nil, nil
}
func (s *stubRiskRepo) HeatmapData(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.HeatmapCell, error) {
	return nil, nil
}
func (s *stubRiskRepo) HeatmapMultiPhase(ctx context.Context, year int, orgIDs []uuid.UUID) (*entity.HeatmapMultiPhase, error) {
	return nil, nil
}
func (s *stubRiskRepo) TopRisks(ctx context.Context, cycle string, limit int, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (s *stubRiskRepo) ListVersions(ctx context.Context, versionGroupID uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (s *stubRiskRepo) ListCycleSnapshot(ctx context.Context, cycle string, orgIDs []uuid.UUID) ([]*entity.Risk, error) {
	return nil, nil
}
func (s *stubRiskRepo) ActivateApprovedVersion(ctx context.Context, approvedRiskID uuid.UUID) error { return nil }
func (s *stubRiskRepo) ListReviewQueue(ctx context.Context, cycle string, orgIDs []uuid.UUID, status string, search string, page int, limit int) ([]*entity.RiskReviewQueueItem, int, error) {
	return nil, 0, nil
}
func (s *stubRiskRepo) CompareCycles(ctx context.Context, fromCycle string, toCycle string, orgIDs []uuid.UUID) ([]*entity.RiskCycleComparisonItem, error) {
	return nil, nil
}
func (s *stubRiskRepo) RiskReviewSummary(ctx context.Context, cycle string, orgIDs []uuid.UUID) (*entity.RiskReviewSummary, error) {
	return nil, nil
}
func (s *stubRiskRepo) GetHeatmapVelocity(ctx context.Context, fromCycle, toCycle string, orgIDs []uuid.UUID) ([]entity.HeatmapVelocityCell, error) {
	return nil, nil
}
func (s *stubRiskRepo) GetOverdueMitigationTimeline(ctx context.Context, orgIDs []uuid.UUID) ([]entity.OverdueMitigationTimelineItem, error) {
	return nil, nil
}
func (s *stubRiskRepo) GetKRIBreachSummary(ctx context.Context, orgIDs []uuid.UUID) ([]entity.KRIBreachItem, error) {
	return nil, nil
}
func (s *stubRiskRepo) GetUnitResponseTime(ctx context.Context, orgIDs []uuid.UUID) ([]entity.UnitResponseTime, error) {
	return nil, nil
}

type stubUserRepo struct{}

func (s *stubUserRepo) Create(ctx context.Context, user *entity.User) error { return nil }
func (s *stubUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	return &entity.User{ID: id, Name: "Tester"}, nil
}
func (s *stubUserRepo) GetByUsername(ctx context.Context, username string) (*entity.User, error) { return nil, nil }
func (s *stubUserRepo) Update(ctx context.Context, user *entity.User) error { return nil }
func (s *stubUserRepo) Delete(ctx context.Context, id uuid.UUID) error { return nil }
func (s *stubUserRepo) List(ctx context.Context) ([]*entity.User, error) { return nil, nil }
func (s *stubUserRepo) ListWithFilter(ctx context.Context, filter repository.UserListFilter) ([]*entity.User, int, error) {
	return nil, 0, nil
}

type stubOrganizationRepo struct{}

func (s *stubOrganizationRepo) Create(ctx context.Context, org *entity.Organization) error { return nil }
func (s *stubOrganizationRepo) GetByID(ctx context.Context, id uuid.UUID) (*entity.Organization, error) {
	return &entity.Organization{ID: id, Name: "Org Uji"}, nil
}
func (s *stubOrganizationRepo) Update(ctx context.Context, org *entity.Organization) error { return nil }
func (s *stubOrganizationRepo) Delete(ctx context.Context, id uuid.UUID) error { return nil }
func (s *stubOrganizationRepo) List(ctx context.Context) ([]*entity.Organization, error) { return nil, nil }
func (s *stubOrganizationRepo) ListWithFilter(ctx context.Context, filter repository.OrganizationListFilter) ([]*entity.Organization, int, error) {
	return nil, 0, nil
}
func (s *stubOrganizationRepo) GetContext(ctx context.Context, orgID uuid.UUID) (string, error) { return "", nil }
func (s *stubOrganizationRepo) GetDescendants(ctx context.Context, orgID uuid.UUID) ([]uuid.UUID, error) {
	return []uuid.UUID{orgID}, nil
}
```


- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend
go test ./internal/usecase/risk -run TestCreateRisk_RequiresObjectiveWhenKMKFlagEnabled -v
```

Expected: FAIL because `RequireObjective` and objective validation do not exist.

- [ ] **Step 3: Add migration**

Create `backend/db/migrations/000046_risks_add_objective_id.up.sql`:

```sql
ALTER TABLE risks ADD COLUMN IF NOT EXISTS objective_id UUID REFERENCES risk_objectives(id);
CREATE INDEX IF NOT EXISTS idx_risks_objective_id ON risks(objective_id);
```

Create down migration:

```sql
DROP INDEX IF EXISTS idx_risks_objective_id;
ALTER TABLE risks DROP COLUMN IF EXISTS objective_id;
```

- [ ] **Step 4: Update backend risk entity**

Add to `backend/internal/domain/entity/risk.go`:

```go
ObjectiveID *uuid.UUID `json:"objectiveId,omitempty"`
```

- [ ] **Step 5: Update create/update inputs**

Extend `CreateRiskInput` and update input struct with:

```go
ObjectiveID       *uuid.UUID `json:"objectiveId"`
RequireObjective  bool       `json:"-"`
```

Validation in create/update usecases:

```go
if input.RequireObjective && input.ObjectiveID == nil {
    return nil, errors.Wrap(errors.ErrInvalidInput, "objectiveId is required")
}
```

Also validate objective belongs to same organization when provided.

- [ ] **Step 6: Add config flag**

In `backend/internal/config/config.go` add:

```go
KMKObjectiveRequired bool
```

Load from env:

```go
KMKObjectiveRequired: getEnvBool("KMK_OBJECTIVE_REQUIRED", false),
```

Update `.env.example` manually during implementation to include:

```env
KMK_OBJECTIVE_REQUIRED=false
```

- [ ] **Step 7: Update risk repository persistence**

In `backend/internal/repository/postgres/risk.go` add `objective_id` to insert, select, and update SQL.

Insert section example:

```sql
INSERT INTO risks (
  code, title, description, category, status, version_group_id,
  previous_risk_id, is_current, is_cycle_current, version_number,
  archived_at, archived_reason, organization_id, created_by, objective_id,
  ...
)
```

- [ ] **Step 8: Run backend verification**

Run:

```bash
cd backend
make migrate-up
go test ./...
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add backend .env.example
git commit -m "feat: add backend risk objective linkage"
```

---

### Task 7: Add frontend objective picker to risk form and export metadata

**Files:**
- Create: `frontend/src/components/risk/objective-picker.tsx`
- Modify: `frontend/src/types/risk.ts`
- Modify: `frontend/src/lib/api/risk-register.ts`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/lib/working-paper-export.ts`

- [ ] **Step 1: Extend risk types**

Add to `frontend/src/types/risk.ts`:

```ts
export interface Risk {
  // existing fields...
  objectiveId?: string;
  objectiveSummary?: {
    tujuan?: string;
    sasaran?: string;
    indikatorKinerjaUtama?: string;
    target?: string;
    program?: string;
    kegiatan?: string;
  };
}
```

- [ ] **Step 2: Extend risk register API payloads**

Add to create/update request type in `frontend/src/lib/api/risk-register.ts`:

```ts
objectiveId?: string;
```

- [ ] **Step 3: Create objective picker component**

Create `frontend/src/components/risk/objective-picker.tsx` with props:

```ts
type ObjectivePickerProps = {
  token: string;
  organizationId?: string;
  period?: string;
  value?: string;
  onChange: (objectiveId: string, summary?: { sasaran?: string; indikatorKinerjaUtama?: string }) => void;
};
```

Render searchable select backed by `listRiskObjectives()`.

- [ ] **Step 4: Insert picker into risk form**

Place under Identifikasi section in `frontend/src/app/(app)/risk/register/new/page.tsx`.

Add form field in schema and default values:

```ts
objectiveId: z.string().optional(),
```

Render helper text:

```tsx
<p className="text-xs text-muted-foreground">
  Pilih sasaran organisasi yang terdampak langsung oleh risiko ini sesuai KMK.
</p>
```

- [ ] **Step 5: Show selected objective summary**

After selection, show read-only summary card with:
- Sasaran
- IKU
- Program
- Kegiatan

- [ ] **Step 6: Update working paper export metadata**

In `frontend/src/lib/working-paper-export.ts`, include objective fields in header/meta area if present:
- `Tujuan`
- `Sasaran`
- `Indikator Kinerja Utama`
- `Target`
- `Program`
- `Kegiatan`

- [ ] **Step 7: Run frontend verification**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend
git commit -m "feat: add objective picker to risk registration"
```

---

### Task 8: Batch A verification and rollout notes

**Files:**
- Modify: `docs/superpowers/plans/2026-04-30-kmk-alignment-roadmap.md`
- Optionally create: `docs/kmk-batch-a-rollout.md`

- [ ] **Step 1: Run full backend verification**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS.

- [ ] **Step 2: Run frontend build verification**

Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 3: Execute manual smoke test**

Manual flow:
1. Login as `superadmin`.
2. Open `/management/charters` and create one charter for one organization.
3. Open `/management/objectives/new` and create one objective linked to that organization.
4. Open `/risk/register/new`.
5. Pick organization and objective.
6. Save draft risk.
7. Open working paper export and verify objective metadata appears.

Expected:
- no 500 error,
- risk saved with `objectiveId`,
- pages load in sidebar/breadcrumb,
- export completes.

- [ ] **Step 4: Document rollout defaults**

Create note:

```md
- `KMK_OBJECTIVE_REQUIRED=false` on first release.
- Enable to `true` only after all active organizations already have at least one objective.
- Existing risks remain valid without backfill.
- New risks can start optional linkage during transition period.
```

- [ ] **Step 5: Final commit**

```bash
git add docs
git commit -m "docs: add Batch A rollout notes"
```

---

## Batch A Exit Criteria

Batch A complete only if all below true:

- UI labels use KMK wording.
- `risk_charters` CRUD works.
- `risk_objectives` CRUD works.
- Risk form accepts `objectiveId`.
- Backend stores `objective_id` in `risks`.
- Working paper/export includes objective metadata.
- `go test ./...` passes.
- `npm run build` passes.

---

## Self-Review

### Spec coverage

- Recommendation 1: terminology alignment — covered in Task 1.
- Recommendation 2: konteks & piagam MR — covered in Task 2 and 3.
- Recommendation 3: sasaran/IKU/program/kegiatan master — covered in Task 4 and 5.
- Recommendation 4: risk-to-objective linkage — covered in Task 6 and 7.
- Batch verification and release readiness — covered in Task 8.

### Placeholder scan

No `TODO`, `TBD`, or “implement later” markers included. Each task names exact files, concrete fields, SQL, routes, and verification commands.

### Type consistency

Consistent names used across plan:
- `RiskCharter`
- `RiskObjective`
- `objectiveId`
- `risk_charters`
- `risk_objectives`
- `KMK_OBJECTIVE_REQUIRED`

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-30-kmk-batch-a-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

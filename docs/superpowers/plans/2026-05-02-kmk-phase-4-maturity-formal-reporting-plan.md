# KMK Phase 4 Maturity and Formal Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun Phase 4 KMK Alignment: TMPMR per UPR/periode dan formal KMK reports yang bisa dihasilkan dari data sistem Manris.

**Architecture:** Phase ini menambahkan modul Clean Architecture baru untuk `tmpmr_assessments`, `tmpmr_items`, dan `formal_reports`, lalu memperluas usecase report supaya laporan formal mengambil data dari foundation KMK, risk register, KRI, working paper, consultation evidence, mitigasi, dan TMPMR. Frontend menambah workspace TMPMR di Risk Governance serta report cards formal di halaman Reports tanpa mengubah alur risk register existing.

**Tech Stack:** Backend Go + Fiber + PostgreSQL migrations + Clean Architecture; Frontend Next.js App Router + React + TypeScript + shadcn/ui + Tailwind; verification dengan `go test ./...`, `npm run build`, dan smoke test role superadmin/reviewer/unit.

---

## Scope

Dokumen ini adalah plan khusus untuk **Phase 4 — Maturity and Formal Reporting** dari roadmap utama `docs/superpowers/plans/2026-04-30-kmk-alignment-roadmap.md`.

Phase 4 hanya mencakup:

- TMPMR CRUD dan scoring.
- Review/approval status TMPMR.
- Formal report registry.
- Formal report generation endpoint.
- Reports page cards untuk laporan KMK.
- Export/download artefak laporan dari backend.

Phase 4 tidak mencakup implementasi ulang Phase 1-3. Bila data Phase 3 belum lengkap, report generator harus tetap bekerja dengan section kosong yang eksplisit, bukan gagal total.

## Existing Anchors

### Backend

- `backend/cmd/server/main.go` — registrasi route Fiber.
- `backend/internal/bootstrap/bootstrap.go` — dependency injection.
- `backend/db/migrations/` — migration terakhir saat plan dibuat adalah `000052_mitigation_kmk_fields`.
- `backend/internal/domain/entity/report.go` — existing `ReportData` untuk risk PDF.
- `backend/internal/domain/service/report.go` — interface renderer report.
- `backend/internal/usecase/report/generate.go` — existing risk report aggregator.
- `backend/internal/handler/http/report.go` — existing `GET /reports/risk-pdf`.
- `backend/internal/service/pdfreport/` — PDF renderer existing.
- `backend/internal/domain/entity/risk_charter.go` — pola entity KMK foundation.
- `backend/internal/domain/repository/risk_charter.go` — pola repository interface.
- `backend/internal/repository/postgres/risk_charter.go` — pola SQL repository.
- `backend/internal/usecase/riskcharter/` — pola usecase CRUD.

### Frontend

- `frontend/src/app/(app)/reports/page.tsx` — report dashboard existing.
- `frontend/src/lib/api.ts` — API helper/token error pattern.
- `frontend/src/lib/app-navigation.ts` — main navigation + breadcrumb.
- `frontend/src/app/(app)/management/charters/page.tsx` — pola management list page.
- `frontend/src/app/(app)/management/charters/[id]/page.tsx` — pola detail/edit page.
- `frontend/src/types/risk-charter.ts` — pola TypeScript type feature.

---

## Data Contract

### TMPMR dimensions

Gunakan enam dimensi default berikut untuk setiap assessment baru:

1. `governance` — Tata kelola.
2. `context_criteria` — Konteks dan kriteria.
3. `risk_assessment` — Penilaian risiko.
4. `risk_treatment` — Perlakuan risiko.
5. `monitoring_review` — Pemantauan dan reviu.
6. `recording_reporting` — Pencatatan dan pelaporan.

### TMPMR score mapping

```go
func TMPMRMaturityLevel(score float64) string {
	switch {
	case score < 1.50:
		return "Awal"
	case score < 2.50:
		return "Berkembang"
	case score < 3.50:
		return "Terdefinisi"
	case score < 4.50:
		return "Terkelola"
	default:
		return "Optimum"
	}
}
```

### Formal report types

- `annual_risk_profile` — Profil risiko tahunan.
- `semiannual_mr_implementation` — Laporan penerapan MR 6 bulanan.
- `semiannual_mr_supervision` — Laporan pengawasan MR oleh SPI/SKI.
- `tmpmr_report` — Laporan maturitas MR.

### Status values

TMPMR:

- `draft`
- `submitted`
- `reviewed`
- `approved`

Formal report:

- `draft`
- `generated`
- `submitted`
- `approved`

---

## File Structure

### Backend files to create

- `backend/db/migrations/000053_tmpmr_and_formal_reports.up.sql`
- `backend/db/migrations/000053_tmpmr_and_formal_reports.down.sql`
- `backend/internal/domain/entity/tmpmr.go`
- `backend/internal/domain/entity/tmpmr_test.go`
- `backend/internal/domain/entity/formal_report.go`
- `backend/internal/domain/entity/formal_report_test.go`
- `backend/internal/domain/repository/tmpmr.go`
- `backend/internal/domain/repository/formal_report.go`
- `backend/internal/repository/postgres/tmpmr.go`
- `backend/internal/repository/postgres/formal_report.go`
- `backend/internal/usecase/tmpmr/create.go`
- `backend/internal/usecase/tmpmr/get.go`
- `backend/internal/usecase/tmpmr/list.go`
- `backend/internal/usecase/tmpmr/update.go`
- `backend/internal/usecase/tmpmr/submit.go`
- `backend/internal/usecase/tmpmr/review.go`
- `backend/internal/usecase/tmpmr/approve.go`
- `backend/internal/usecase/tmpmr/score_test.go`
- `backend/internal/usecase/formalreport/generate.go`
- `backend/internal/usecase/formalreport/get.go`
- `backend/internal/usecase/formalreport/list.go`
- `backend/internal/usecase/formalreport/generate_test.go`
- `backend/internal/handler/http/tmpmr.go`
- `backend/internal/handler/http/formal_report.go`

### Backend files to modify

- `backend/internal/domain/entity/report.go`
- `backend/internal/domain/service/report.go`
- `backend/internal/usecase/report/generate.go`
- `backend/internal/service/pdfreport/renderer.go`
- `backend/internal/bootstrap/bootstrap.go`
- `backend/cmd/server/main.go`

### Frontend files to create

- `frontend/src/types/tmpmr.ts`
- `frontend/src/types/formal-report.ts`
- `frontend/src/lib/api/tmpmr.ts`
- `frontend/src/lib/api/formal-reports.ts`
- `frontend/src/app/(app)/management/tmpmr/page.tsx`
- `frontend/src/app/(app)/management/tmpmr/[id]/page.tsx`
- `frontend/src/app/(app)/reports/_components/formal-report-card.tsx`
- `frontend/src/app/(app)/reports/_components/formal-report-list.tsx`

### Frontend files to modify

- `frontend/src/app/(app)/reports/page.tsx`
- `frontend/src/lib/app-navigation.ts`

---

## Task 1: Add TMPMR and Formal Reports Schema

**Files:**

- Create: `backend/db/migrations/000053_tmpmr_and_formal_reports.up.sql`
- Create: `backend/db/migrations/000053_tmpmr_and_formal_reports.down.sql`

- [x] **Step 1: Create migration up file**

Use this SQL exactly:

```sql
CREATE TABLE tmpmr_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    assessor_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved')),
    score NUMERIC(6,2) NOT NULL DEFAULT 0,
    maturity_level TEXT NOT NULL DEFAULT 'Awal',
    review_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period)
);

CREATE TABLE tmpmr_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES tmpmr_assessments(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL CHECK (dimension IN (
        'governance',
        'context_criteria',
        'risk_assessment',
        'risk_treatment',
        'monitoring_review',
        'recording_reporting'
    )),
    question TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 5),
    evidence_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE formal_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN (
        'annual_risk_profile',
        'semiannual_mr_implementation',
        'semiannual_mr_supervision',
        'tmpmr_report'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','submitted','approved')),
    generated_file_url TEXT NOT NULL DEFAULT '',
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period, report_type)
);

CREATE INDEX idx_tmpmr_assessments_org_period ON tmpmr_assessments(organization_id, period);
CREATE INDEX idx_tmpmr_items_assessment ON tmpmr_items(assessment_id);
CREATE INDEX idx_formal_reports_org_period ON formal_reports(organization_id, period);
CREATE INDEX idx_formal_reports_type ON formal_reports(report_type);
```

- [x] **Step 2: Create migration down file**

```sql
DROP TABLE IF EXISTS formal_reports;
DROP TABLE IF EXISTS tmpmr_items;
DROP TABLE IF EXISTS tmpmr_assessments;
```

- [x] **Step 3: Run migration**

Run:

```bash
cd backend
make migrate-up
```

Expected: migration version advances to `53` without dirty state.

- [ ] **Step 4: Commit**

```bash
git add backend/db/migrations/000053_tmpmr_and_formal_reports.up.sql backend/db/migrations/000053_tmpmr_and_formal_reports.down.sql
git commit -m "feat: add TMPMR and formal report schema"
```

---

## Task 2: Implement TMPMR Domain and Scoring Rules

**Files:**

- Create: `backend/internal/domain/entity/tmpmr.go`
- Create: `backend/internal/domain/entity/tmpmr_test.go`

- [x] **Step 1: Add entity**

Define:

```go
package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type TMPMRStatus string

const (
	TMPMRStatusDraft     TMPMRStatus = "draft"
	TMPMRStatusSubmitted TMPMRStatus = "submitted"
	TMPMRStatusReviewed  TMPMRStatus = "reviewed"
	TMPMRStatusApproved  TMPMRStatus = "approved"
)

type TMPMRItem struct {
	ID           uuid.UUID `json:"id"`
	AssessmentID uuid.UUID `json:"assessmentId"`
	Dimension    string    `json:"dimension"`
	Question     string    `json:"question"`
	Score        int       `json:"score"`
	EvidenceURL  string    `json:"evidenceUrl"`
	Notes        string    `json:"notes"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type TMPMRAssessment struct {
	ID             uuid.UUID   `json:"id"`
	OrganizationID uuid.UUID   `json:"organizationId"`
	Period         string      `json:"period"`
	AssessorID     *uuid.UUID  `json:"assessorId,omitempty"`
	ReviewerID     *uuid.UUID  `json:"reviewerId,omitempty"`
	Status         TMPMRStatus `json:"status"`
	Score          float64     `json:"score"`
	MaturityLevel  string      `json:"maturityLevel"`
	ReviewNote     string      `json:"reviewNote"`
	Items          []TMPMRItem `json:"items"`
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
}

func DefaultTMPMRItems() []TMPMRItem {
	return []TMPMRItem{
		{Dimension: "governance", Question: "Tata kelola manajemen risiko telah ditetapkan dan dijalankan."},
		{Dimension: "context_criteria", Question: "Konteks, cakupan, dan kriteria risiko telah terdokumentasi."},
		{Dimension: "risk_assessment", Question: "Identifikasi, analisis, dan evaluasi risiko dilakukan berbasis sasaran."},
		{Dimension: "risk_treatment", Question: "Perlakuan risiko disusun, dipantau, dan memiliki penanggung jawab."},
		{Dimension: "monitoring_review", Question: "Pemantauan dan reviu risiko dilakukan secara berkala."},
		{Dimension: "recording_reporting", Question: "Pencatatan dan pelaporan risiko tersedia sebagai bukti audit."},
	}
}

func TMPMRMaturityLevel(score float64) string {
	switch {
	case score < 1.50:
		return "Awal"
	case score < 2.50:
		return "Berkembang"
	case score < 3.50:
		return "Terdefinisi"
	case score < 4.50:
		return "Terkelola"
	default:
		return "Optimum"
	}
}

func CalculateTMPMRScore(items []TMPMRItem) (float64, string) {
	if len(items) == 0 {
		return 0, "Awal"
	}
	total := 0
	for _, item := range items {
		total += item.Score
	}
	score := float64(total) / float64(len(items))
	return score, TMPMRMaturityLevel(score)
}

func (a TMPMRAssessment) Validate() error {
	if a.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(a.Period) == "" {
		return fmt.Errorf("period is required")
	}
	switch a.Status {
	case "", TMPMRStatusDraft, TMPMRStatusSubmitted, TMPMRStatusReviewed, TMPMRStatusApproved:
		return nil
	default:
		return fmt.Errorf("invalid tmpmr status")
	}
}
```

- [x] **Step 2: Add tests**

Test exact cases:

```go
func TestTMPMRMaturityLevel(t *testing.T) {
	tests := []struct {
		score float64
		want  string
	}{
		{0, "Awal"},
		{1.49, "Awal"},
		{1.50, "Berkembang"},
		{2.50, "Terdefinisi"},
		{3.50, "Terkelola"},
		{4.50, "Optimum"},
		{5, "Optimum"},
	}
	for _, tt := range tests {
		if got := TMPMRMaturityLevel(tt.score); got != tt.want {
			t.Fatalf("score %.2f got %s want %s", tt.score, got, tt.want)
		}
	}
}
```

- [x] **Step 3: Run tests**

```bash
cd backend
go test ./internal/domain/entity -run TMPMR -v
```

Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add backend/internal/domain/entity/tmpmr.go backend/internal/domain/entity/tmpmr_test.go
git commit -m "feat: add TMPMR domain scoring"
```

---

## Task 3: Implement TMPMR Repository, Usecases, and Handler

**Files:**

- Create: `backend/internal/domain/repository/tmpmr.go`
- Create: `backend/internal/repository/postgres/tmpmr.go`
- Create: `backend/internal/usecase/tmpmr/create.go`
- Create: `backend/internal/usecase/tmpmr/get.go`
- Create: `backend/internal/usecase/tmpmr/list.go`
- Create: `backend/internal/usecase/tmpmr/update.go`
- Create: `backend/internal/usecase/tmpmr/submit.go`
- Create: `backend/internal/usecase/tmpmr/review.go`
- Create: `backend/internal/usecase/tmpmr/approve.go`
- Create: `backend/internal/usecase/tmpmr/score_test.go`
- Create: `backend/internal/handler/http/tmpmr.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: Add repository interface**

Repository must expose:

```go
type TMPMRListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	Page           int
	Limit          int
}

type TMPMRRepository interface {
	Create(ctx context.Context, assessment *entity.TMPMRAssessment) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.TMPMRAssessment, error)
	Update(ctx context.Context, assessment *entity.TMPMRAssessment) error
	List(ctx context.Context, filter TMPMRListFilter) ([]*entity.TMPMRAssessment, int, error)
	ExistsByOrgPeriod(ctx context.Context, organizationID uuid.UUID, period string, excludeID *uuid.UUID) (bool, error)
}
```

- [x] **Step 2: Implement postgres repository**

Implementation requirements:

- `Create` inserts assessment and default items in one transaction.
- `GetByID` loads assessment and items ordered by dimension order.
- `Update` updates assessment fields and upserts item scores/evidence/notes.
- `List` supports org, period, status, pagination.
- Duplicate org+period returns repository error that usecase maps to invalid input.

- [x] **Step 3: Add usecase rules**

Rules:

- Create defaults to six TMPMR items when input items are empty.
- Draft can be updated.
- Submitted can be reviewed.
- Reviewed can be approved.
- Approved cannot be updated.
- Score and maturity level are recalculated on every item update.
- `Submit` requires every item to have `score > 0`.
- `Review` sets `reviewer_id`, `review_note`, status `reviewed`.
- `Approve` sets status `approved`.

- [x] **Step 4: Add HTTP routes**

Register under protected API:

```go
protected.Get("/tmpmr", tmpmrHandler.List)
protected.Post("/tmpmr", tmpmrHandler.Create)
protected.Get("/tmpmr/:id", tmpmrHandler.Get)
protected.Put("/tmpmr/:id", tmpmrHandler.Update)
protected.Post("/tmpmr/:id/submit", tmpmrHandler.Submit)
protected.Post("/tmpmr/:id/review", tmpmrHandler.Review)
protected.Post("/tmpmr/:id/approve", tmpmrHandler.Approve)
```

- [x] **Step 5: Run tests**

```bash
cd backend
go test ./internal/usecase/tmpmr ./internal/domain/entity -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/repository/tmpmr.go backend/internal/repository/postgres/tmpmr.go backend/internal/usecase/tmpmr backend/internal/handler/http/tmpmr.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: add TMPMR workflow"
```

---

## Task 4: Implement Formal Report Domain and Generation Usecase

**Files:**

- Create: `backend/internal/domain/entity/formal_report.go`
- Create: `backend/internal/domain/entity/formal_report_test.go`
- Create: `backend/internal/domain/repository/formal_report.go`
- Create: `backend/internal/repository/postgres/formal_report.go`
- Create: `backend/internal/usecase/formalreport/generate.go`
- Create: `backend/internal/usecase/formalreport/get.go`
- Create: `backend/internal/usecase/formalreport/list.go`
- Create: `backend/internal/usecase/formalreport/generate_test.go`
- Create: `backend/internal/handler/http/formal_report.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [x] **Step 1: Add entity**

Entity must include:

```go
type FormalReport struct {
	ID               uuid.UUID      `json:"id"`
	OrganizationID   uuid.UUID      `json:"organizationId"`
	Period           string         `json:"period"`
	ReportType       string         `json:"reportType"`
	Status           string         `json:"status"`
	GeneratedFileURL string         `json:"generatedFileUrl"`
	GeneratedBy       *uuid.UUID     `json:"generatedBy,omitempty"`
	GeneratedAt       *time.Time     `json:"generatedAt,omitempty"`
	Metadata          map[string]any `json:"metadata"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
}
```

- [x] **Step 2: Validate report types**

Tests must verify these are accepted and any other value is rejected:

- `annual_risk_profile`
- `semiannual_mr_implementation`
- `semiannual_mr_supervision`
- `tmpmr_report`

- [x] **Step 3: Add repository**

Repository must support:

```go
type FormalReportListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	ReportType     string
	Status         string
	Page           int
	Limit          int
}

type FormalReportRepository interface {
	UpsertGenerated(ctx context.Context, report *entity.FormalReport) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.FormalReport, error)
	List(ctx context.Context, filter FormalReportListFilter) ([]*entity.FormalReport, int, error)
}
```

- [x] **Step 4: Generate formal report**

`GenerateFormalReportUseCase` input:

```go
type GenerateFormalReportInput struct {
	OrganizationID uuid.UUID
	Period         string
	ReportType     string
	GeneratedBy    *uuid.UUID
}
```

Generation rules:

- Validate period and report type.
- Load source data best-effort by organization and period.
- Store generated metadata summary even if file rendering is minimal.
- Set status to `generated`.
- Set `generated_at` to current time.
- For initial implementation, use deterministic URL placeholder `/api/v1/formal-reports/{id}/download` until persistent file storage exists.

- [x] **Step 5: Add routes**

```go
protected.Post("/formal-reports/generate", formalReportHandler.Generate)
protected.Get("/formal-reports", formalReportHandler.List)
protected.Get("/formal-reports/:id", formalReportHandler.Get)
```

- [x] **Step 6: Run tests**

```bash
cd backend
go test ./internal/domain/entity ./internal/usecase/formalreport -run FormalReport -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/domain/entity/formal_report.go backend/internal/domain/entity/formal_report_test.go backend/internal/domain/repository/formal_report.go backend/internal/repository/postgres/formal_report.go backend/internal/usecase/formalreport backend/internal/handler/http/formal_report.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: add formal KMK report registry"
```

---

## Task 5: Extend Report Data Aggregation for KMK Formal Reports

**Files:**

- Modify: `backend/internal/domain/entity/report.go`
- Modify: `backend/internal/domain/service/report.go`
- Modify: `backend/internal/usecase/report/generate.go`
- Modify: `backend/internal/service/pdfreport/renderer.go`

- [x] **Step 1: Add KMK report aggregate types**

Add structs to `entity/report.go`:

```go
type KMKFormalReportData struct {
	Report        *FormalReport
	GeneratedAt   time.Time
	Organization  *Organization
	Period        string
	RiskSummary   ReportSummary
	TMPMR         *TMPMRAssessment
	SectionStatus []KMKReportSectionStatus
}

type KMKReportSectionStatus struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Available bool   `json:"available"`
	Count     int    `json:"count"`
	Note      string `json:"note"`
}
```

- [x] **Step 2: Extend renderer interface safely**

Keep existing risk PDF generation compatible. Add a new interface instead of changing the old one in-place:

```go
type FormalReportPDFRenderer interface {
	RenderFormal(ctx context.Context, data *entity.KMKFormalReportData) ([]byte, error)
}
```

- [x] **Step 3: Add renderer implementation**

Implement a first pass PDF with these sections:

- Cover: title, organization, period, generated date.
- Ringkasan profil risiko.
- Status piagam/konteks/sasaran.
- Status evidence pendukung lintas modul yang sudah tersedia.
- Status pemantauan mitigasi.
- TMPMR score and maturity level.
- Appendix section availability table.

- [x] **Step 4: Add tests**

Run existing renderer tests and add one smoke test for formal renderer:

```bash
cd backend
go test ./internal/service/pdfreport -v
```

Expected: PASS and generated bytes length is greater than zero.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/domain/entity/report.go backend/internal/domain/service/report.go backend/internal/usecase/report/generate.go backend/internal/service/pdfreport
git commit -m "feat: render KMK formal report PDFs"
```

---

## Task 6: Build Frontend TMPMR Workspace

**Files:**

- Create: `frontend/src/types/tmpmr.ts`
- Create: `frontend/src/lib/api/tmpmr.ts`
- Create: `frontend/src/app/(app)/management/tmpmr/page.tsx`
- Create: `frontend/src/app/(app)/management/tmpmr/[id]/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`

- [x] **Step 1: Add TypeScript types**

```ts
export type TMPMRStatus = "draft" | "submitted" | "reviewed" | "approved";

export type TMPMRItem = {
  id: string;
  assessmentId: string;
  dimension: string;
  question: string;
  score: number;
  evidenceUrl: string;
  notes: string;
};

export type TMPMRAssessment = {
  id: string;
  organizationId: string;
  period: string;
  assessorId?: string;
  reviewerId?: string;
  status: TMPMRStatus;
  score: number;
  maturityLevel: string;
  reviewNote: string;
  items: TMPMRItem[];
  createdAt: string;
  updatedAt: string;
};
```

- [x] **Step 2: Add API client**

Functions:

- `listTMPMRAssessments(token, filters)`
- `createTMPMRAssessment(token, payload)`
- `getTMPMRAssessment(token, id)`
- `updateTMPMRAssessment(token, id, payload)`
- `submitTMPMRAssessment(token, id)`
- `reviewTMPMRAssessment(token, id, payload)`
- `approveTMPMRAssessment(token, id)`

- [x] **Step 3: Build TMPMR list page**

UI requirements:

- Header title: `TMPMR`.
- Filters: period, status.
- Table columns: period, organization, score, maturity level, status, updated date.
- Primary action: create assessment.
- Row action: open detail.

- [x] **Step 4: Build TMPMR detail page**

UI requirements:

- Six dimension sections.
- Score input uses 0-5 select or stepper.
- Evidence URL input.
- Notes textarea.
- Summary panel with score and maturity level.
- Actions:
  - Save draft.
  - Submit.
  - Review.
  - Approve.
- Approved state is read-only.

- [x] **Step 5: Add navigation**

Add to `RISK GOVERNANCE`:

```ts
{
  label: "TMPMR",
  href: "/management/tmpmr",
  icon: "ClipboardList",
  matchHrefs: ["/management/tmpmr"],
}
```

Add breadcrumbs:

```ts
"/management/tmpmr": "TMPMR",
```

- [x] **Step 6: Run build**

```bash
cd frontend
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/tmpmr.ts frontend/src/lib/api/tmpmr.ts frontend/src/app/\\(app\\)/management/tmpmr frontend/src/lib/app-navigation.ts
git commit -m "feat: add TMPMR frontend workspace"
```

---

## Task 7: Add Formal KMK Reports to Reports Page

**Files:**

- Create: `frontend/src/types/formal-report.ts`
- Create: `frontend/src/lib/api/formal-reports.ts`
- Create: `frontend/src/app/(app)/reports/_components/formal-report-card.tsx`
- Create: `frontend/src/app/(app)/reports/_components/formal-report-list.tsx`
- Modify: `frontend/src/app/(app)/reports/page.tsx`

- [x] **Step 1: Add TypeScript types**

```ts
export type FormalReportType =
  | "annual_risk_profile"
  | "semiannual_mr_implementation"
  | "semiannual_mr_supervision"
  | "tmpmr_report";

export type FormalReport = {
  id: string;
  organizationId: string;
  period: string;
  reportType: FormalReportType;
  status: "draft" | "generated" | "submitted" | "approved";
  generatedFileUrl: string;
  generatedBy?: string;
  generatedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
```

- [x] **Step 2: Add API client**

Functions:

- `listFormalReports(token, filters)`
- `generateFormalReport(token, payload)`
- `getFormalReport(token, id)`

- [x] **Step 3: Add report cards**

Add cards for:

- Profil Risiko Tahunan.
- Laporan Penerapan MR Semesteran.
- Laporan Pengawasan MR Semesteran.
- Laporan TMPMR.

Each card has:

- report title,
- short KMK purpose,
- format badge `PDF`,
- generate button,
- disabled/loading state,
- latest generated timestamp if available.

- [x] **Step 4: Wire cards into reports page**

Place formal KMK reports below existing export controls and above analytic charts so formal reports are discoverable without hiding current reports.

- [x] **Step 5: Add list of generated reports**

Columns:

- period,
- report type,
- status,
- generated at,
- action download/open.

- [x] **Step 6: Run build**

```bash
cd frontend
npm run build
```

Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/formal-report.ts frontend/src/lib/api/formal-reports.ts frontend/src/app/\\(app\\)/reports/_components/formal-report-card.tsx frontend/src/app/\\(app\\)/reports/_components/formal-report-list.tsx frontend/src/app/\\(app\\)/reports/page.tsx
git commit -m "feat: expose formal KMK reports"
```

---

## Task 8: Final Integration and Verification

**Files:**

- Verify all changed backend/frontend files.

- [x] **Step 1: Run backend tests**

```bash
cd backend
go test ./...
```

Expected: PASS.

- [x] **Step 2: Run frontend build**

```bash
cd frontend
npm run build
```

Expected: build succeeds.

- [x] **Step 3: Manual smoke test**

With backend and frontend running:

1. Login as `superadmin`.
2. Open `/management/tmpmr`.
3. Create TMPMR for one organization and current period.
4. Fill six scores and evidence notes.
5. Save draft.
6. Submit assessment.
7. Review assessment.
8. Approve assessment.
9. Open `/reports`.
10. Generate `tmpmr_report`.
11. Generate `annual_risk_profile`.
12. Confirm generated report list shows both items.

- [x] **Step 4: Verify API manually**

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/tmpmr"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/api/v1/formal-reports"
```

Expected: both endpoints return JSON with list metadata.

- [ ] **Step 5: Final commit**

```bash
git status --short
git add backend frontend
git commit -m "feat: add KMK maturity and formal reporting"
```

---

## Release Exit Criteria

Phase 4 is complete only when:

- TMPMR assessment can be created per organization and period.
- TMPMR score is recalculated from item scores.
- TMPMR maturity level maps correctly to Awal, Berkembang, Terdefinisi, Terkelola, Optimum.
- TMPMR can move through draft → submitted → reviewed → approved.
- Formal reports can be generated for all four KMK report types in scope.
- Reports page exposes formal KMK reports.
- Existing `GET /reports/risk-pdf` still works.
- `cd backend && go test ./...` passes.
- `cd frontend && npm run build` passes.

## Rollback Notes

If migration rollback is needed during local development:

```bash
cd backend
make migrate-down
```

This drops `formal_reports`, `tmpmr_items`, and `tmpmr_assessments`. Do not run rollback in shared environments without confirming no TMPMR/report data must be preserved.

## Self-Review

### Spec coverage

- TMPMR assessment: covered by Tasks 1-3 and 6.
- TMPMR score and maturity level: covered by Task 2.
- Formal report registry: covered by Tasks 1 and 4.
- Formal report generation: covered by Tasks 4, 5, and 7.
- Reports page exposure: covered by Task 7.
- Verification: covered by Task 8.

### Placeholder scan

No task uses placeholder red flags. Each task names concrete files, commands, and expected behavior.

### Type consistency

The plan consistently uses `TMPMRAssessment`, `TMPMRItem`, `FormalReport`, `tmpmr_assessments`, `tmpmr_items`, and `formal_reports` across backend and frontend.

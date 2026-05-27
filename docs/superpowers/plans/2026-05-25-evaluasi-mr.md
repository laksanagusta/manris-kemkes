# Evaluasi MR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the **Evaluasi MR** module so evaluators can create, fill, finalize, reopen, and export Monitoring & Evaluation MR reports from normalized SQL evaluation data.

**Architecture:** Add a clean-architecture backend slice with SQL-backed templates and evaluation snapshots, then expose CRUD/finalize/reopen/export endpoints under `/api/v1/evaluations`. Reuse the existing formal monitoring evaluation PDF renderer by feeding it evaluation-derived `MonitoringEvaluationReportData`, while the frontend adds list, create, and detail pages under `/evaluations`.

**Tech Stack:** Go 1.25, Fiber, pgx, PostgreSQL, golang-migrate, Maroto PDF renderer, Next.js 16 App Router, React 19, TypeScript, TailwindCSS v4, shadcn/ui, lucide-react.

---

## Scope Notes

This plan implements [2026-05-25-evaluasi-mr-design.md](/Users/dikalaksana/Engineering/manris-v2/docs/superpowers/specs/2026-05-25-evaluasi-mr-design.md).

Included:

- SQL tables: `evaluation_templates`, `evaluation_template_sections`, `evaluation_template_items`, `evaluations`, `evaluation_sections`, `evaluation_items`.
- Seeded active KMK monitoring evaluation template.
- Evaluation workflow: create, list, get, update draft, finalize, reopen.
- PDF export from evaluation data.
- Frontend Evaluasi MR list/create/detail pages.
- Navigation entry.

Excluded:

- Approval/review workflow.
- Template editor UI.
- `evaluation_mitigation_summaries` table.
- Electronic signature integration.
- Evidence file lifecycle.

## File Structure

Backend files:

- Create `backend/db/migrations/000058_evaluations.up.sql`: schema and initial KMK template seed.
- Create `backend/db/migrations/000058_evaluations.down.sql`: drop evaluation tables.
- Create `backend/db/migrations/evaluations_test.go`: migration assertions for table names, constraints, seed, and absence of `evaluation_mitigation_summaries`.
- Create `backend/internal/domain/entity/evaluation.go`: evaluation statuses, template/section/item entities, validation helpers, default answer constants.
- Create `backend/internal/domain/repository/evaluation.go`: repository interface and list filter.
- Create `backend/internal/repository/postgres/evaluation.go`: PostgreSQL implementation for templates and evaluation snapshots.
- Create `backend/internal/usecase/evaluation/helpers.go`: access checks, normalization, validation, snapshot helpers.
- Create `backend/internal/usecase/evaluation/create.go`: create from active template.
- Create `backend/internal/usecase/evaluation/list.go`: list evaluations.
- Create `backend/internal/usecase/evaluation/get.go`: get evaluation detail.
- Create `backend/internal/usecase/evaluation/update.go`: update draft header/sections/items.
- Create `backend/internal/usecase/evaluation/finalize.go`: final status transition.
- Create `backend/internal/usecase/evaluation/reopen.go`: reopen final.
- Create `backend/internal/usecase/evaluation/export_pdf.go`: build PDF payload from evaluation.
- Create `backend/internal/usecase/evaluation/*_test.go`: focused fake-repo usecase tests.
- Create `backend/internal/handler/http/evaluation.go`: Fiber handler.
- Create `backend/internal/handler/http/evaluation_test.go`: route/access/status tests.
- Modify `backend/internal/bootstrap/bootstrap.go`: wire repository and usecases.
- Modify `backend/cmd/server/main.go`: register `/evaluations` routes.
- Modify `backend/internal/service/pdfreport/monitoring_evaluation.go`: ensure renderer consumes dynamic evaluation rows, dynamic conclusions, and evaluation status.
- Modify `backend/internal/domain/entity/report.go`: add conclusion/status fields to `MonitoringEvaluationReportData`.

Frontend files:

- Create `frontend/src/types/evaluation.ts`: DTOs and request types.
- Create `frontend/src/lib/api/evaluations.ts`: typed API client and PDF download helper.
- Create `frontend/src/lib/evaluations.ts`: status labels, filtering helpers, summary helpers.
- Create `frontend/src/lib/evaluations.test.ts`: utility tests.
- Create `frontend/src/app/(app)/evaluations/page.tsx`: list page.
- Create `frontend/src/app/(app)/evaluations/new/page.tsx`: create page.
- Create `frontend/src/app/(app)/evaluations/[id]/page.tsx`: detail/editor/export page.
- Modify `frontend/src/lib/app-navigation.ts`: menu item and breadcrumbs.
- Modify `frontend/src/app/(app)/reports/formal/page.tsx`: point Monitoring & Evaluation users toward Evaluasi MR instead of treating Reports as the primary input flow.

---

### Task 1: Database Schema And KMK Template Seed

**Files:**

- Create: `backend/db/migrations/000058_evaluations.up.sql`
- Create: `backend/db/migrations/000058_evaluations.down.sql`
- Create: `backend/db/migrations/evaluations_test.go`

- [ ] **Step 1: Write migration assertions first**

Create `backend/db/migrations/evaluations_test.go`:

```go
package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestEvaluationsMigrationDefinesExpectedTablesAndConstraints(t *testing.T) {
	sql, err := os.ReadFile("000058_evaluations.up.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	body := string(sql)

	required := []string{
		"CREATE TABLE evaluation_templates",
		"CREATE TABLE evaluation_template_sections",
		"CREATE TABLE evaluation_template_items",
		"CREATE TABLE evaluations",
		"CREATE TABLE evaluation_sections",
		"CREATE TABLE evaluation_items",
		"CHECK (status IN ('draft','active','archived'))",
		"CHECK (status IN ('draft','final'))",
		"CHECK (answer IN ('unset','yes','no'))",
		"UNIQUE (organization_id, period, template_id)",
		"monitoring_evaluation_kmk",
		"document_completeness",
		"infrastructure_adequacy",
		"implementation_result",
		"mitigation_monitoring",
	}
	for _, want := range required {
		if !strings.Contains(body, want) {
			t.Fatalf("migration missing %q", want)
		}
	}

	if strings.Contains(body, "evaluation_mitigation_summaries") {
		t.Fatal("migration must not create evaluation_mitigation_summaries")
	}
}

func TestEvaluationsDownMigrationDropsInDependencyOrder(t *testing.T) {
	sql, err := os.ReadFile("000058_evaluations.down.sql")
	if err != nil {
		t.Fatalf("read down migration: %v", err)
	}
	body := string(sql)

	order := []string{
		"DROP TABLE IF EXISTS evaluation_items",
		"DROP TABLE IF EXISTS evaluation_sections",
		"DROP TABLE IF EXISTS evaluations",
		"DROP TABLE IF EXISTS evaluation_template_items",
		"DROP TABLE IF EXISTS evaluation_template_sections",
		"DROP TABLE IF EXISTS evaluation_templates",
	}
	last := -1
	for _, stmt := range order {
		idx := strings.Index(body, stmt)
		if idx == -1 {
			t.Fatalf("down migration missing %q", stmt)
		}
		if idx < last {
			t.Fatalf("%q appears before dependency drop order", stmt)
		}
		last = idx
	}
}
```

- [ ] **Step 2: Run migration test and confirm failure**

Run:

```bash
cd backend/db/migrations
go test .
```

Expected: FAIL because `000058_evaluations.up.sql` and `.down.sql` do not exist.

- [ ] **Step 3: Add the up migration**

Create `backend/db/migrations/000058_evaluations.up.sql`:

```sql
CREATE TABLE evaluation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_key TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_key, version)
);

CREATE TABLE evaluation_template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, section_key)
);

CREATE TABLE evaluation_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES evaluation_template_sections(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    item_no TEXT NOT NULL,
    label TEXT NOT NULL,
    default_condition TEXT NOT NULL DEFAULT '',
    default_description TEXT NOT NULL DEFAULT '',
    default_analysis TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, item_key)
);

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES evaluation_templates(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
    report_number TEXT NOT NULL DEFAULT '',
    report_date DATE,
    assignment_letter_number TEXT NOT NULL DEFAULT '',
    assignment_letter_date DATE,
    monitoring_date_range TEXT NOT NULL DEFAULT '',
    unit_code TEXT NOT NULL DEFAULT '',
    unit_location TEXT NOT NULL DEFAULT '',
    unit_address TEXT NOT NULL DEFAULT '',
    unit_eselon_i TEXT NOT NULL DEFAULT '',
    unit_leader_name TEXT NOT NULL DEFAULT '',
    team_coordinator TEXT NOT NULL DEFAULT '',
    team_lead TEXT NOT NULL DEFAULT '',
    team_members TEXT NOT NULL DEFAULT '',
    problems TEXT NOT NULL DEFAULT '',
    recommendations TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period, template_id)
);

CREATE TABLE evaluation_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    template_section_id UUID REFERENCES evaluation_template_sections(id),
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    conclusion TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (evaluation_id, section_key)
);

CREATE TABLE evaluation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES evaluation_sections(id) ON DELETE CASCADE,
    template_item_id UUID REFERENCES evaluation_template_items(id),
    item_key TEXT NOT NULL,
    item_no TEXT NOT NULL,
    label TEXT NOT NULL,
    answer TEXT NOT NULL DEFAULT 'unset' CHECK (answer IN ('unset','yes','no')),
    condition TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    analysis TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, item_key)
);

CREATE INDEX idx_evaluations_org_period ON evaluations(organization_id, period);
CREATE INDEX idx_evaluations_status ON evaluations(status);
CREATE INDEX idx_evaluation_sections_evaluation ON evaluation_sections(evaluation_id);
CREATE INDEX idx_evaluation_items_section ON evaluation_items(section_id);

WITH tmpl AS (
    INSERT INTO evaluation_templates (template_key, name, version, status)
    VALUES ('monitoring_evaluation_kmk', 'Laporan Monitoring & Evaluasi MR - KMK', 1, 'active')
    RETURNING id
),
sections AS (
    INSERT INTO evaluation_template_sections (template_id, section_key, title, description, sort_order)
    SELECT tmpl.id, data.section_key, data.title, data.description, data.sort_order
    FROM tmpl
    CROSS JOIN (VALUES
        ('document_completeness', 'Kelengkapan dokumen pendukung pemantauan dan evaluasi penerapan manajemen risiko', '', 10),
        ('infrastructure_adequacy', 'Pengujian atas kecukupan infrastruktur / rancangan proses MR', '', 20),
        ('implementation_result', 'Pengujian atas hasil pelaksanaan manajemen risiko', '', 30),
        ('mitigation_monitoring', 'Format pemantauan pelaksanaan mitigasi risiko', '', 40)
    ) AS data(section_key, title, description, sort_order)
    RETURNING id, section_key
)
INSERT INTO evaluation_template_items (section_id, item_key, item_no, label, sort_order)
SELECT sections.id, item.item_key, item.item_no, item.label, item.sort_order
FROM sections
JOIN (VALUES
    ('document_completeness', 'policy_basis', '1', 'Kebijakan yang mendasari penerapan manajemen risiko', 10),
    ('document_completeness', 'risk_team_decree', '2', 'SK tim Penyelenggara Manajemen Risiko', 20),
    ('document_completeness', 'planning_document', '3', 'RAP untuk UPR-T.I, RAK/RSB untuk UPR-T.II', 30),
    ('document_completeness', 'annual_work_plan', '4', 'RKT untuk UPT, Renja K untuk Eselon II dan I (Awal dan Revisi)', 40),
    ('document_completeness', 'business_process', '5', 'Proses Bisnis / Strategi Maps', 50),
    ('document_completeness', 'risk_profile', '6', 'Profil Risiko UPR-T.I/UPR-T.II', 60),
    ('document_completeness', 'risk_communication', '7', 'Dokumen pengkomunikasian risiko kepada pihak terkait (contoh: pegawai, stakeholder dll)', 70),
    ('document_completeness', 'mitigation_evidence', '8', 'Dokumen Rencana Pengendalian/mitigasi dan bukti pelaksanaan', 80),
    ('document_completeness', 'periodic_mr_report', '9', 'Laporan Pelaksanaan Manajemen Risiko (Berkala)', 90),
    ('infrastructure_adequacy', 'leader_understanding', '1.a.1', 'Pemahaman pimpinan sebagai role model dan pemahaman pemilik risiko', 10),
    ('infrastructure_adequacy', 'risk_info_decision', '1.a.2', 'Menggunakan informasi terkait risiko dalam pengambilan keputusan', 20),
    ('infrastructure_adequacy', 'risk_culture', '1.a.3', 'Pimpinan mendorong penerapan MR dan budaya sadar risiko', 30),
    ('infrastructure_adequacy', 'competent_staff', '1.b.1', 'MR dikelola oleh pegawai yang berkompeten', 40),
    ('infrastructure_adequacy', 'capacity_building', '1.b.2', 'Pegawai mendapatkan kesempatan peningkatan kapasitas SDM dalam MR', 50),
    ('infrastructure_adequacy', 'training_program', '1.b.3', 'Memiliki program pelatihan/sertifikasi terkait MR', 60),
    ('infrastructure_adequacy', 'partnership_risk', '1.c', 'Kemitraan telah mengidentifikasi, menilai dan mengelola risiko terkait seluruh kemitraan', 70),
    ('infrastructure_adequacy', 'integrated_process', '1.d', 'Proses manajemen risiko telah terintegrasi dengan proses bisnis utama unit kerja', 80),
    ('infrastructure_adequacy', 'control_environment_weakness', '2.a', 'Identifikasi kelemahan lingkungan pengendalian', 90),
    ('infrastructure_adequacy', 'risk_assessment_done', '2.b', 'Penilaian Risiko telah dilakukan', 100),
    ('infrastructure_adequacy', 'mitigation_plan_done', '2.c', 'Rencana mitigasi risiko telah ditetapkan dan dilaksanakan', 110),
    ('infrastructure_adequacy', 'periodic_monitoring_done', '2.d', 'Pemantauan berkala pelaksanaan mitigasi telah dilakukan', 120),
    ('infrastructure_adequacy', 'periodic_report_done', '2.e', 'Laporan pemantauan berkala dan laporan akhir pelaksanaan manajemen risiko telah disusun', 130),
    ('implementation_result', 'mitigation_realized', '1.a', 'Aktivitas mitigasi risiko telah dijalankan atau direalisasikan sesuai dengan rencana', 10),
    ('implementation_result', 'post_mitigation_incident', '1.b', 'Terjadi kejadian risiko pasca penerapan mitigasi', 20),
    ('implementation_result', 'risk_level_below_tolerance', '1.c', 'Aktivitas mitigasi berhasil menurunkan level risiko di bawah garis toleransi risiko', 30),
    ('implementation_result', 'target_achieved', '2', 'Tujuan organisasi dan target kinerja organisasi tercapai', 40)
) AS item(section_key, item_key, item_no, label, sort_order)
ON item.section_key = sections.section_key;
```

- [ ] **Step 4: Add the down migration**

Create `backend/db/migrations/000058_evaluations.down.sql`:

```sql
DROP TABLE IF EXISTS evaluation_items;
DROP TABLE IF EXISTS evaluation_sections;
DROP TABLE IF EXISTS evaluations;
DROP TABLE IF EXISTS evaluation_template_items;
DROP TABLE IF EXISTS evaluation_template_sections;
DROP TABLE IF EXISTS evaluation_templates;
```

- [ ] **Step 5: Run migration test**

Run:

```bash
cd backend/db/migrations
go test .
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/db/migrations/000058_evaluations.up.sql backend/db/migrations/000058_evaluations.down.sql backend/db/migrations/evaluations_test.go
git commit -m "feat: add evaluation schema"
```

---

### Task 2: Domain Entities And Repository Contract

**Files:**

- Create: `backend/internal/domain/entity/evaluation.go`
- Create: `backend/internal/domain/repository/evaluation.go`
- Create: `backend/internal/domain/entity/evaluation_test.go`

- [ ] **Step 1: Write entity validation tests**

Create `backend/internal/domain/entity/evaluation_test.go`:

```go
package entity

import (
	"testing"

	"github.com/google/uuid"
)

func TestEvaluationValidateRequiresOrganizationPeriodTemplateAndStatus(t *testing.T) {
	evaluation := Evaluation{
		OrganizationID: uuid.New(),
		Period:         "2026-H1",
		TemplateID:     uuid.New(),
		Status:         EvaluationStatusDraft,
	}
	if err := evaluation.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}

	evaluation.Status = "submitted"
	if err := evaluation.Validate(); err == nil {
		t.Fatal("expected invalid status error")
	}
}

func TestEvaluationItemValidateAnswer(t *testing.T) {
	item := EvaluationItem{ItemKey: "policy_basis", ItemNo: "1", Label: "Policy", Answer: EvaluationAnswerUnset}
	if err := item.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
	item.Answer = "maybe"
	if err := item.Validate(); err == nil {
		t.Fatal("expected invalid answer error")
	}
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd backend
go test ./internal/domain/entity -run 'TestEvaluation'
```

Expected: FAIL because evaluation entity types do not exist.

- [ ] **Step 3: Add domain entities**

Create `backend/internal/domain/entity/evaluation.go`:

```go
package entity

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type EvaluationStatus string

const (
	EvaluationStatusDraft EvaluationStatus = "draft"
	EvaluationStatusFinal EvaluationStatus = "final"
)

type EvaluationTemplateStatus string

const (
	EvaluationTemplateStatusDraft    EvaluationTemplateStatus = "draft"
	EvaluationTemplateStatusActive   EvaluationTemplateStatus = "active"
	EvaluationTemplateStatusArchived EvaluationTemplateStatus = "archived"
)

type EvaluationAnswer string

const (
	EvaluationAnswerUnset EvaluationAnswer = "unset"
	EvaluationAnswerYes   EvaluationAnswer = "yes"
	EvaluationAnswerNo    EvaluationAnswer = "no"
)

type EvaluationTemplate struct {
	ID          uuid.UUID                `json:"id"`
	TemplateKey string                   `json:"templateKey"`
	Name        string                   `json:"name"`
	Version     int                      `json:"version"`
	Status      EvaluationTemplateStatus `json:"status"`
	Sections    []EvaluationTemplateSection `json:"sections,omitempty"`
	CreatedAt   time.Time               `json:"createdAt"`
	UpdatedAt   time.Time               `json:"updatedAt"`
}

type EvaluationTemplateSection struct {
	ID          uuid.UUID `json:"id"`
	TemplateID  uuid.UUID `json:"templateId"`
	SectionKey  string    `json:"sectionKey"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	SortOrder   int       `json:"sortOrder"`
	Items       []EvaluationTemplateItem `json:"items,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type EvaluationTemplateItem struct {
	ID                 uuid.UUID `json:"id"`
	SectionID          uuid.UUID `json:"sectionId"`
	ItemKey            string    `json:"itemKey"`
	ItemNo             string    `json:"itemNo"`
	Label              string    `json:"label"`
	DefaultCondition   string    `json:"defaultCondition"`
	DefaultDescription string    `json:"defaultDescription"`
	DefaultAnalysis    string    `json:"defaultAnalysis"`
	SortOrder          int       `json:"sortOrder"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type Evaluation struct {
	ID                     uuid.UUID          `json:"id"`
	OrganizationID         uuid.UUID          `json:"organizationId"`
	Period                 string             `json:"period"`
	TemplateID             uuid.UUID          `json:"templateId"`
	TemplateName           string             `json:"templateName,omitempty"`
	Status                 EvaluationStatus   `json:"status"`
	ReportNumber           string             `json:"reportNumber"`
	ReportDate             *time.Time         `json:"reportDate,omitempty"`
	AssignmentLetterNumber string             `json:"assignmentLetterNumber"`
	AssignmentLetterDate   *time.Time         `json:"assignmentLetterDate,omitempty"`
	MonitoringDateRange    string             `json:"monitoringDateRange"`
	UnitCode               string             `json:"unitCode"`
	UnitLocation           string             `json:"unitLocation"`
	UnitAddress            string             `json:"unitAddress"`
	UnitEselonI            string             `json:"unitEselonI"`
	UnitLeaderName         string             `json:"unitLeaderName"`
	TeamCoordinator        string             `json:"teamCoordinator"`
	TeamLead               string             `json:"teamLead"`
	TeamMembers            string             `json:"teamMembers"`
	Problems               string             `json:"problems"`
	Recommendations        string             `json:"recommendations"`
	CreatedBy              *uuid.UUID         `json:"createdBy,omitempty"`
	FinalizedAt            *time.Time         `json:"finalizedAt,omitempty"`
	Sections               []EvaluationSection `json:"sections,omitempty"`
	CreatedAt              time.Time          `json:"createdAt"`
	UpdatedAt              time.Time          `json:"updatedAt"`
}

type EvaluationSection struct {
	ID                uuid.UUID        `json:"id"`
	EvaluationID      uuid.UUID        `json:"evaluationId"`
	TemplateSectionID *uuid.UUID       `json:"templateSectionId,omitempty"`
	SectionKey        string           `json:"sectionKey"`
	Title             string           `json:"title"`
	Description       string           `json:"description"`
	Conclusion        string           `json:"conclusion"`
	SortOrder         int              `json:"sortOrder"`
	Items             []EvaluationItem `json:"items,omitempty"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
}

type EvaluationItem struct {
	ID             uuid.UUID        `json:"id"`
	SectionID      uuid.UUID        `json:"sectionId"`
	TemplateItemID *uuid.UUID       `json:"templateItemId,omitempty"`
	ItemKey        string           `json:"itemKey"`
	ItemNo         string           `json:"itemNo"`
	Label          string           `json:"label"`
	Answer         EvaluationAnswer `json:"answer"`
	Condition      string           `json:"condition"`
	Description    string           `json:"description"`
	Analysis       string           `json:"analysis"`
	SortOrder      int              `json:"sortOrder"`
	CreatedAt      time.Time        `json:"createdAt"`
	UpdatedAt      time.Time        `json:"updatedAt"`
}

func (e Evaluation) Validate() error {
	if e.OrganizationID == uuid.Nil {
		return fmt.Errorf("organization id is required")
	}
	if strings.TrimSpace(e.Period) == "" {
		return fmt.Errorf("period is required")
	}
	if e.TemplateID == uuid.Nil {
		return fmt.Errorf("template id is required")
	}
	switch e.Status {
	case "", EvaluationStatusDraft, EvaluationStatusFinal:
		return nil
	default:
		return fmt.Errorf("invalid evaluation status")
	}
}

func (i EvaluationItem) Validate() error {
	if strings.TrimSpace(i.ItemKey) == "" {
		return fmt.Errorf("item key is required")
	}
	if strings.TrimSpace(i.ItemNo) == "" {
		return fmt.Errorf("item number is required")
	}
	if strings.TrimSpace(i.Label) == "" {
		return fmt.Errorf("item label is required")
	}
	switch i.Answer {
	case "", EvaluationAnswerUnset, EvaluationAnswerYes, EvaluationAnswerNo:
		return nil
	default:
		return fmt.Errorf("invalid evaluation answer")
	}
}
```

- [ ] **Step 4: Add repository contract**

Create `backend/internal/domain/repository/evaluation.go`:

```go
package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

type EvaluationListFilter struct {
	OrganizationID *uuid.UUID
	Period         string
	Status         string
	Query          string
	Page           int
	Limit          int
}

type EvaluationRepository interface {
	GetActiveTemplate(ctx context.Context, templateKey string) (*entity.EvaluationTemplate, error)
	Create(ctx context.Context, evaluation *entity.Evaluation) error
	GetByID(ctx context.Context, id uuid.UUID) (*entity.Evaluation, error)
	Update(ctx context.Context, evaluation *entity.Evaluation) error
	List(ctx context.Context, filter EvaluationListFilter) ([]*entity.Evaluation, int, error)
	ExistsByOrgPeriodTemplate(ctx context.Context, orgID uuid.UUID, period string, templateID uuid.UUID, excludeID *uuid.UUID) (bool, error)
}
```

- [ ] **Step 5: Run tests**

Run:

```bash
cd backend
go test ./internal/domain/entity
go test ./internal/domain/repository
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/entity/evaluation.go backend/internal/domain/entity/evaluation_test.go backend/internal/domain/repository/evaluation.go
git commit -m "feat: add evaluation domain model"
```

---

### Task 3: PostgreSQL Evaluation Repository

**Files:**

- Create: `backend/internal/repository/postgres/evaluation.go`
- Create: `backend/internal/repository/postgres/evaluation_test.go`

- [ ] **Step 1: Write repository integration tests**

Create `backend/internal/repository/postgres/evaluation_test.go` using the same test database helper patterns already used in this package. The tests must include these assertions:

```go
func TestEvaluationRepositoryCreateCopiesAndReadsSections(t *testing.T) {
	got, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.OrganizationID != orgID {
		t.Fatalf("OrganizationID = %s, want %s", got.OrganizationID, orgID)
	}
	if len(got.Sections) == 0 {
		t.Fatal("expected copied evaluation sections")
	}
	if len(got.Sections[0].Items) == 0 {
		t.Fatal("expected copied evaluation items")
	}
	if got.Sections[0].Items[0].Answer != entity.EvaluationAnswerUnset {
		t.Fatalf("Answer = %q, want unset", got.Sections[0].Items[0].Answer)
	}
}

func TestEvaluationRepositoryRejectsDuplicateOrgPeriodTemplate(t *testing.T) {
	exists, err := repo.ExistsByOrgPeriodTemplate(ctx, orgID, "2026-H1", template.ID, nil)
	if err != nil {
		t.Fatalf("ExistsByOrgPeriodTemplate() error = %v", err)
	}
	if !exists {
		t.Fatal("expected duplicate to exist")
	}
	exists, err = repo.ExistsByOrgPeriodTemplate(ctx, orgID, "2026-H1", template.ID, &created.ID)
	if err != nil {
		t.Fatalf("ExistsByOrgPeriodTemplate(exclude) error = %v", err)
	}
	if exists {
		t.Fatal("expected excluded evaluation not to count as duplicate")
	}
}

func TestEvaluationRepositoryUpdateReplacesSnapshotFields(t *testing.T) {
	created.ReportNumber = "LHPE-001"
	created.Sections[0].Conclusion = "Dokumen belum lengkap."
	created.Sections[0].Items[0].Answer = entity.EvaluationAnswerNo
	created.Sections[0].Items[0].Condition = "SK tim belum tersedia."
	if err := repo.Update(ctx, created); err != nil {
		t.Fatalf("Update() error = %v", err)
	}
	got, err := repo.GetByID(ctx, created.ID)
	if err != nil {
		t.Fatalf("GetByID() error = %v", err)
	}
	if got.ReportNumber != "LHPE-001" {
		t.Fatalf("ReportNumber = %q", got.ReportNumber)
	}
	if got.Sections[0].Conclusion != "Dokumen belum lengkap." {
		t.Fatalf("Conclusion = %q", got.Sections[0].Conclusion)
	}
	if got.Sections[0].Items[0].Answer != entity.EvaluationAnswerNo {
		t.Fatalf("Answer = %q", got.Sections[0].Items[0].Answer)
	}
}
```

Use actual UUIDs and inserted rows rather than mocks. If existing repository tests require a live database, skip with the same helper behavior they use when `DATABASE_URL` is absent.

- [ ] **Step 2: Run repository tests to verify failure**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run 'TestEvaluationRepository'
```

Expected: FAIL because `NewEvaluationRepository` does not exist.

- [ ] **Step 3: Implement repository skeleton and constructor**

Create `backend/internal/repository/postgres/evaluation.go`:

```go
package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
)

type evaluationRepository struct {
	pool *pgxpool.Pool
}

func NewEvaluationRepository(pool *pgxpool.Pool) repository.EvaluationRepository {
	return &evaluationRepository{pool: pool}
}
```

- [ ] **Step 4: Implement template loading**

Add `GetActiveTemplate`, `listTemplateSections`, and `listTemplateItems`:

```go
func (r *evaluationRepository) GetActiveTemplate(ctx context.Context, templateKey string) (*entity.EvaluationTemplate, error) {
	template := &entity.EvaluationTemplate{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, template_key, name, version, status, created_at, updated_at
		FROM evaluation_templates
		WHERE template_key = $1 AND status = 'active'
		ORDER BY version DESC
		LIMIT 1
	`, strings.TrimSpace(templateKey)).Scan(
		&template.ID,
		&template.TemplateKey,
		&template.Name,
		&template.Version,
		&template.Status,
		&template.CreatedAt,
		&template.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("get active evaluation template: %w", err)
	}
	sections, err := r.listTemplateSections(ctx, template.ID)
	if err != nil {
		return nil, err
	}
	template.Sections = sections
	return template, nil
}
```

- [ ] **Step 5: Implement Create in one transaction**

Implement `Create(ctx, evaluation)` with this transaction structure:

```go
func (r *evaluationRepository) Create(ctx context.Context, evaluation *entity.Evaluation) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin evaluation create tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := tx.QueryRow(ctx, `
		INSERT INTO evaluations (
			organization_id, period, template_id, status, report_number, report_date,
			assignment_letter_number, assignment_letter_date, monitoring_date_range,
			unit_code, unit_location, unit_address, unit_eselon_i, unit_leader_name,
			team_coordinator, team_lead, team_members, problems, recommendations, created_by
		) VALUES (
			$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
		)
		RETURNING id, created_at, updated_at
	`, evaluation.OrganizationID, evaluation.Period, evaluation.TemplateID, evaluation.Status,
		evaluation.ReportNumber, evaluation.ReportDate, evaluation.AssignmentLetterNumber,
		evaluation.AssignmentLetterDate, evaluation.MonitoringDateRange, evaluation.UnitCode,
		evaluation.UnitLocation, evaluation.UnitAddress, evaluation.UnitEselonI,
		evaluation.UnitLeaderName, evaluation.TeamCoordinator, evaluation.TeamLead,
		evaluation.TeamMembers, evaluation.Problems, evaluation.Recommendations, evaluation.CreatedBy,
	).Scan(&evaluation.ID, &evaluation.CreatedAt, &evaluation.UpdatedAt); err != nil {
		return fmt.Errorf("create evaluation: %w", err)
	}

	for sectionIndex := range evaluation.Sections {
		section := &evaluation.Sections[sectionIndex]
		section.EvaluationID = evaluation.ID
		if section.ID == uuid.Nil {
			section.ID = uuid.New()
		}
		if err := tx.QueryRow(ctx, `
			INSERT INTO evaluation_sections (
				id, evaluation_id, template_section_id, section_key, title, description, conclusion, sort_order
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
			RETURNING created_at, updated_at
		`, section.ID, section.EvaluationID, section.TemplateSectionID, section.SectionKey,
			section.Title, section.Description, section.Conclusion, section.SortOrder,
		).Scan(&section.CreatedAt, &section.UpdatedAt); err != nil {
			return fmt.Errorf("create evaluation section: %w", err)
		}
		for itemIndex := range section.Items {
			item := &section.Items[itemIndex]
			item.SectionID = section.ID
			if item.ID == uuid.Nil {
				item.ID = uuid.New()
			}
			if err := tx.QueryRow(ctx, `
				INSERT INTO evaluation_items (
					id, section_id, template_item_id, item_key, item_no, label, answer,
					condition, description, analysis, sort_order
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
				RETURNING created_at, updated_at
			`, item.ID, item.SectionID, item.TemplateItemID, item.ItemKey, item.ItemNo,
				item.Label, item.Answer, item.Condition, item.Description, item.Analysis,
				item.SortOrder,
			).Scan(&item.CreatedAt, &item.UpdatedAt); err != nil {
				return fmt.Errorf("create evaluation item: %w", err)
			}
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit evaluation create tx: %w", err)
	}
	return nil
}
```

- [ ] **Step 6: Implement GetByID/List/Update/Exists**

Implementation requirements:

- `GetByID` loads header, joins template name, then loads sections/items ordered by `sort_order`.
- `List` supports `organization_id`, `period`, `status`, and fuzzy `query` against period.
- `Update` updates the header, upserts sections and items by `id`, and prunes removed rows for the evaluation using the TMPMR repository's `keepIDs` pattern.
- `ExistsByOrgPeriodTemplate` mirrors TMPMR uniqueness helper behavior.

- [ ] **Step 7: Run repository tests**

Run:

```bash
cd backend
go test ./internal/repository/postgres -run 'TestEvaluationRepository'
```

Expected: PASS when a test database is available, or the same skip behavior as adjacent repository tests when it is not.

- [ ] **Step 8: Commit**

```bash
git add backend/internal/repository/postgres/evaluation.go backend/internal/repository/postgres/evaluation_test.go
git commit -m "feat: add evaluation repository"
```

---

### Task 4: Evaluation Use Cases

**Files:**

- Create: `backend/internal/usecase/evaluation/helpers.go`
- Create: `backend/internal/usecase/evaluation/create.go`
- Create: `backend/internal/usecase/evaluation/list.go`
- Create: `backend/internal/usecase/evaluation/get.go`
- Create: `backend/internal/usecase/evaluation/update.go`
- Create: `backend/internal/usecase/evaluation/finalize.go`
- Create: `backend/internal/usecase/evaluation/reopen.go`
- Create: `backend/internal/usecase/evaluation/usecases_test.go`

- [ ] **Step 1: Write usecase tests with a fake repository**

Create `backend/internal/usecase/evaluation/usecases_test.go`. Include a fake repository with methods for every `repository.EvaluationRepository` function and tests for these behaviors:

```go
func TestCreateUseCaseCopiesActiveTemplateSnapshot(t *testing.T)
func TestCreateUseCaseRejectsDuplicateEvaluation(t *testing.T)
func TestUpdateUseCaseRejectsFinalEvaluation(t *testing.T)
func TestFinalizeUseCaseSetsFinalStatusAndTimestamp(t *testing.T)
func TestReopenUseCaseReturnsFinalToDraft(t *testing.T)
func TestListUseCaseRequiresReadableScope(t *testing.T)
```

The fake repository must store templates and evaluations in memory. Use `entity.AccessScope` values that match existing usecase tests.

- [ ] **Step 2: Run usecase tests to verify failure**

Run:

```bash
cd backend
go test ./internal/usecase/evaluation
```

Expected: FAIL because the package does not exist.

- [ ] **Step 3: Add helper functions**

Create `backend/internal/usecase/evaluation/helpers.go`:

```go
package evaluation

import (
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

const DefaultTemplateKey = "monitoring_evaluation_kmk"

func canRead(scope *entity.AccessScope, orgID uuid.UUID) bool {
	return scope != nil && scope.CanRead(orgID)
}

func canWrite(scope *entity.AccessScope, orgID uuid.UUID) bool {
	return scope != nil && scope.CanWrite(orgID)
}

func normalizeText(value string) string {
	return strings.TrimSpace(value)
}

func snapshotFromTemplate(template *entity.EvaluationTemplate) []entity.EvaluationSection {
	sections := make([]entity.EvaluationSection, 0, len(template.Sections))
	for _, templateSection := range template.Sections {
		templateSectionID := templateSection.ID
		section := entity.EvaluationSection{
			TemplateSectionID: &templateSectionID,
			SectionKey:        normalizeText(templateSection.SectionKey),
			Title:             normalizeText(templateSection.Title),
			Description:       normalizeText(templateSection.Description),
			SortOrder:         templateSection.SortOrder,
			Items:             make([]entity.EvaluationItem, 0, len(templateSection.Items)),
		}
		for _, templateItem := range templateSection.Items {
			templateItemID := templateItem.ID
			section.Items = append(section.Items, entity.EvaluationItem{
				TemplateItemID: &templateItemID,
				ItemKey:        normalizeText(templateItem.ItemKey),
				ItemNo:         normalizeText(templateItem.ItemNo),
				Label:          normalizeText(templateItem.Label),
				Answer:         entity.EvaluationAnswerUnset,
				Condition:      normalizeText(templateItem.DefaultCondition),
				Description:    normalizeText(templateItem.DefaultDescription),
				Analysis:       normalizeText(templateItem.DefaultAnalysis),
				SortOrder:      templateItem.SortOrder,
			})
		}
		sections = append(sections, section)
	}
	return sections
}
```

- [ ] **Step 4: Implement create/list/get/update/finalize/reopen**

Use these input structs and constructors:

```go
type CreateInput struct {
	OrganizationID uuid.UUID `json:"organizationId"`
	Period         string    `json:"period"`
	TemplateKey    string    `json:"templateKey"`
	CreatedBy      *uuid.UUID `json:"createdBy"`
	Scope          *entity.AccessScope
}

type UpdateInput struct {
	ID                     uuid.UUID `json:"-"`
	ReportNumber           string `json:"reportNumber"`
	ReportDate             *time.Time `json:"reportDate"`
	AssignmentLetterNumber string `json:"assignmentLetterNumber"`
	AssignmentLetterDate   *time.Time `json:"assignmentLetterDate"`
	MonitoringDateRange    string `json:"monitoringDateRange"`
	UnitCode               string `json:"unitCode"`
	UnitLocation           string `json:"unitLocation"`
	UnitAddress            string `json:"unitAddress"`
	UnitEselonI            string `json:"unitEselonI"`
	UnitLeaderName         string `json:"unitLeaderName"`
	TeamCoordinator        string `json:"teamCoordinator"`
	TeamLead               string `json:"teamLead"`
	TeamMembers            string `json:"teamMembers"`
	Problems               string `json:"problems"`
	Recommendations        string `json:"recommendations"`
	Sections               []SectionInput `json:"sections"`
	Scope                  *entity.AccessScope
}
```

Create these usecase files and constructors:

```go
func NewCreateUseCase(repo repository.EvaluationRepository) *CreateUseCase
func NewListUseCase(repo repository.EvaluationRepository) *ListUseCase
func NewGetUseCase(repo repository.EvaluationRepository) *GetUseCase
func NewUpdateUseCase(repo repository.EvaluationRepository) *UpdateUseCase
func NewFinalizeUseCase(repo repository.EvaluationRepository) *FinalizeUseCase
func NewReopenUseCase(repo repository.EvaluationRepository) *ReopenUseCase
```

Rules:

- Create loads active template using `TemplateKey`, defaulting to `monitoring_evaluation_kmk`.
- Create rejects duplicate organization/period/template.
- Update first loads existing evaluation, checks write scope, and rejects `final`.
- Finalize checks write scope, status draft, sections present, then sets `final` and `finalized_at`.
- Reopen checks write scope, status final, then sets `draft` and clears `finalized_at`.
- List uses access scope to limit non-global users to their organization when no explicit org filter is provided.
- Every usecase returns `errors.ErrForbidden` for inaccessible organizations and wraps invalid input with `errors.ErrInvalidInput`, following the TMPMR usecase pattern.

- [ ] **Step 5: Run usecase tests**

Run:

```bash
cd backend
go test ./internal/usecase/evaluation
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/usecase/evaluation
git commit -m "feat: add evaluation use cases"
```

---

### Task 5: HTTP Handler, Bootstrap, And Routes

**Files:**

- Create: `backend/internal/handler/http/evaluation.go`
- Create: `backend/internal/handler/http/evaluation_test.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write handler tests**

Create route tests covering:

```go
func TestEvaluationHandlerCreateReturnsCreated(t *testing.T)
func TestEvaluationHandlerUpdateRejectsInvalidID(t *testing.T)
func TestEvaluationHandlerFinalizeCallsUseCase(t *testing.T)
func TestEvaluationHandlerReopenCallsUseCase(t *testing.T)
func TestEvaluationHandlerListParsesFilters(t *testing.T)
```

Use fake usecase structs or direct handler dependencies following existing handler test style.

- [ ] **Step 2: Run handler tests to verify failure**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestEvaluationHandler'
```

Expected: FAIL because `EvaluationHandler` does not exist.

- [ ] **Step 3: Implement handler**

Create `backend/internal/handler/http/evaluation.go` with methods:

```go
func (h *EvaluationHandler) List(c *fiber.Ctx) error
func (h *EvaluationHandler) Create(c *fiber.Ctx) error
func (h *EvaluationHandler) Get(c *fiber.Ctx) error
func (h *EvaluationHandler) Update(c *fiber.Ctx) error
func (h *EvaluationHandler) Finalize(c *fiber.Ctx) error
func (h *EvaluationHandler) Reopen(c *fiber.Ctx) error
func (h *EvaluationHandler) ExportPDF(c *fiber.Ctx) error
```

Endpoint behavior:

- `POST /evaluations` returns `201` and `{ "data": evaluation }`.
- `GET /evaluations` returns paginated list from usecase.
- `GET /evaluations/:id` returns `{ "data": evaluation }`.
- `PUT /evaluations/:id` returns `{ "data": evaluation }`.
- `POST /evaluations/:id/finalize` returns `{ "data": evaluation }`.
- `POST /evaluations/:id/reopen` returns `{ "data": evaluation }`.
- `GET /evaluations/:id/export/pdf` returns `application/pdf`.

- [ ] **Step 4: Wire bootstrap**

Modify `backend/internal/bootstrap/bootstrap.go`:

- Add `evaluationuc` import alias.
- Add `EvaluationRepository domainrepo.EvaluationRepository`.
- Add usecase fields: `EvaluationCreateUC`, `EvaluationGetUC`, `EvaluationListUC`, `EvaluationUpdateUC`, `EvaluationFinalizeUC`, `EvaluationReopenUC`, `EvaluationExportPDFUC`.
- Instantiate `postgresrepo.NewEvaluationRepository(pool)`.
- Instantiate each usecase in `Build`.

- [ ] **Step 5: Register routes**

Modify `backend/cmd/server/main.go`:

```go
cleanEvaluationHandler := httpHandler.NewEvaluationHandler(
	container.EvaluationCreateUC,
	container.EvaluationGetUC,
	container.EvaluationListUC,
	container.EvaluationUpdateUC,
	container.EvaluationFinalizeUC,
	container.EvaluationReopenUC,
	container.EvaluationExportPDFUC,
)
```

Add protected routes near formal reports:

```go
protected.Get("/evaluations", cleanEvaluationHandler.List)
protected.Post("/evaluations", cleanEvaluationHandler.Create)
protected.Get("/evaluations/:id/export/pdf", cleanEvaluationHandler.ExportPDF)
protected.Get("/evaluations/:id", cleanEvaluationHandler.Get)
protected.Put("/evaluations/:id", cleanEvaluationHandler.Update)
protected.Post("/evaluations/:id/finalize", cleanEvaluationHandler.Finalize)
protected.Post("/evaluations/:id/reopen", cleanEvaluationHandler.Reopen)
```

Keep export route before `/:id` if route matching requires it.

- [ ] **Step 6: Run backend compile/tests**

Run:

```bash
cd backend
go test ./internal/handler/http -run 'TestEvaluationHandler'
go test ./internal/bootstrap ./cmd/server
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/handler/http/evaluation.go backend/internal/handler/http/evaluation_test.go backend/internal/bootstrap/bootstrap.go backend/cmd/server/main.go
git commit -m "feat: expose evaluation api"
```

---

### Task 6: Evaluation PDF Export Use Case

**Files:**

- Create: `backend/internal/usecase/evaluation/export_pdf.go`
- Create: `backend/internal/usecase/evaluation/export_pdf_test.go`
- Modify: `backend/internal/domain/entity/report.go`
- Modify: `backend/internal/service/pdfreport/monitoring_evaluation.go`

- [ ] **Step 1: Write export mapping tests**

Create `backend/internal/usecase/evaluation/export_pdf_test.go` with:

```go
func TestBuildMonitoringEvaluationDataUsesEvaluationRows(t *testing.T)
func TestBuildMonitoringEvaluationDataKeepsBlankOptionalMetadata(t *testing.T)
func TestBuildMonitoringEvaluationDataUsesLiveMitigationSummary(t *testing.T)
```

Assertions:

- `DocumentChecklist[0].Item` equals the evaluation item label.
- `DocumentChecklist[0].Yes` reflects `answer == yes`.
- `DocumentChecklist[0].NoChecked` reflects `answer == no`.
- Section conclusions come from `evaluation_sections.conclusion`.
- Mitigation summary is generated from supplied risks, not stored rows.

- [ ] **Step 2: Run export tests to verify failure**

Run:

```bash
cd backend
go test ./internal/usecase/evaluation -run 'TestBuildMonitoringEvaluationData'
```

Expected: FAIL because export builder is missing.

- [ ] **Step 3: Implement PDF payload builder**

Create `backend/internal/usecase/evaluation/export_pdf.go` with:

```go
type ExportPDFUseCase struct {
	evaluationRepo repository.EvaluationRepository
	orgRepo        repository.OrganizationRepository
	riskRepo       riskSummarySource
	renderer       service.FormalReportPDFRenderer
}

type ExportPDFInput struct {
	ID    uuid.UUID
	Scope *entity.AccessScope
}

type ExportPDFOutput struct {
	Bytes    []byte
	Filename string
}
```

Implementation flow:

1. Load evaluation.
2. Check read scope.
3. Load organization.
4. Load approved/current risk data for `organization_id` and period using the existing risk source used by formal report download.
5. Build `entity.MonitoringEvaluationReportData`.
6. Wrap into `entity.KMKFormalReportData`.
7. Render with existing formal report PDF renderer.
8. Return filename like `evaluasi-mr-2026-H1.pdf`.

- [ ] **Step 4: Refactor section mapping**

Add private helpers:

```go
func checklistRowsFromSection(section entity.EvaluationSection) []entity.MonitoringEvaluationChecklistRow
func answerFlags(answer entity.EvaluationAnswer) (yes bool, no bool)
func sectionByKey(evaluation *entity.Evaluation, key string) *entity.EvaluationSection
```

Map:

- `document_completeness` -> `DocumentChecklist`
- `infrastructure_adequacy` -> `InfrastructureChecklist`
- `implementation_result` -> `ResultChecklist`
- `mitigation_monitoring` remains live-generated mitigation summary, no checklist rows required.

- [ ] **Step 5: Add renderer support for dynamic conclusions**

Modify `backend/internal/domain/entity/report.go` so `MonitoringEvaluationReportData` carries evaluator-written conclusions and status:

```go
DocumentConclusion       string
InfrastructureConclusion string
ResultConclusion         string
MitigationConclusion     string
EvaluationStatus         string
```

Then update `backend/internal/service/pdfreport/monitoring_evaluation.go` so hard-coded conclusion sentences use these fields when non-empty. Keep the current hard-coded conclusion text as the fallback when the field is blank.

- [ ] **Step 6: Run export and renderer tests**

Run:

```bash
cd backend
go test ./internal/usecase/evaluation ./internal/service/pdfreport
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/internal/usecase/evaluation/export_pdf.go backend/internal/usecase/evaluation/export_pdf_test.go backend/internal/domain/entity/report.go backend/internal/service/pdfreport/monitoring_evaluation.go
git commit -m "feat: export evaluation pdf"
```

---

### Task 7: Frontend Types, API Client, And Utilities

**Files:**

- Create: `frontend/src/types/evaluation.ts`
- Create: `frontend/src/lib/api/evaluations.ts`
- Create: `frontend/src/lib/evaluations.ts`
- Create: `frontend/src/lib/evaluations.test.ts`

- [ ] **Step 1: Write utility tests**

Create `frontend/src/lib/evaluations.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluationStatusLabel,
  filterEvaluations,
  isEvaluationEditable,
} from "./evaluations";
import type { Evaluation } from "@/types/evaluation";

const base: Evaluation = {
  id: "eval-1",
  organizationId: "org-1",
  period: "2026-H1",
  templateId: "template-1",
  templateName: "Laporan Monitoring & Evaluasi MR - KMK",
  status: "draft",
  reportNumber: "",
  assignmentLetterNumber: "",
  monitoringDateRange: "",
  unitCode: "",
  unitLocation: "",
  unitAddress: "",
  unitEselonI: "",
  unitLeaderName: "",
  teamCoordinator: "",
  teamLead: "",
  teamMembers: "",
  problems: "",
  recommendations: "",
  sections: [],
  createdAt: "2026-05-25T00:00:00Z",
  updatedAt: "2026-05-25T00:00:00Z",
};

test("evaluation helpers label status", () => {
  assert.equal(evaluationStatusLabel.draft, "Draft");
  assert.equal(evaluationStatusLabel.final, "Final");
});

test("evaluation helpers detect editability", () => {
  assert.equal(isEvaluationEditable(base), true);
  assert.equal(isEvaluationEditable({ ...base, status: "final" }), false);
});

test("evaluation helpers filter by search, status, and period", () => {
  const result = filterEvaluations(
    [base, { ...base, id: "eval-2", period: "2026-H2", status: "final" }],
    { search: "h1", status: "draft", period: "2026-H1" },
  );
  assert.deepEqual(result.map((item) => item.id), ["eval-1"]);
});
```

- [ ] **Step 2: Run frontend test to verify failure**

Run:

```bash
cd frontend
npm test -- --run src/lib/evaluations.test.ts
```

Expected: FAIL because `frontend/src/lib/evaluations.ts` and `frontend/src/types/evaluation.ts` do not exist.

- [ ] **Step 3: Add TypeScript types**

Create `frontend/src/types/evaluation.ts`:

```ts
export type EvaluationStatus = "draft" | "final";
export type EvaluationAnswer = "unset" | "yes" | "no";

export type EvaluationItem = {
  id: string;
  sectionId: string;
  templateItemId?: string | null;
  itemKey: string;
  itemNo: string;
  label: string;
  answer: EvaluationAnswer;
  condition: string;
  description: string;
  analysis: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationSection = {
  id: string;
  evaluationId: string;
  templateSectionId?: string | null;
  sectionKey: string;
  title: string;
  description: string;
  conclusion: string;
  sortOrder: number;
  items: EvaluationItem[];
  createdAt: string;
  updatedAt: string;
};

export type Evaluation = {
  id: string;
  organizationId: string;
  period: string;
  templateId: string;
  templateName?: string;
  status: EvaluationStatus;
  reportNumber: string;
  reportDate?: string | null;
  assignmentLetterNumber: string;
  assignmentLetterDate?: string | null;
  monitoringDateRange: string;
  unitCode: string;
  unitLocation: string;
  unitAddress: string;
  unitEselonI: string;
  unitLeaderName: string;
  teamCoordinator: string;
  teamLead: string;
  teamMembers: string;
  problems: string;
  recommendations: string;
  createdBy?: string | null;
  finalizedAt?: string | null;
  sections: EvaluationSection[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedEvaluationResponse = {
  data: Evaluation[];
  total: number;
  page: number;
  limit: number;
};

export type ListEvaluationsParams = {
  organizationId?: string;
  period?: string;
  status?: EvaluationStatus;
  query?: string;
  page?: number;
  limit?: number;
};

export type CreateEvaluationRequest = {
  organizationId: string;
  period: string;
  templateKey?: string;
  createdBy?: string;
};

export type UpdateEvaluationRequest = Omit<
  Evaluation,
  | "id"
  | "organizationId"
  | "period"
  | "templateId"
  | "templateName"
  | "status"
  | "createdBy"
  | "finalizedAt"
  | "createdAt"
  | "updatedAt"
>;
```

- [ ] **Step 4: Add API client**

Create `frontend/src/lib/api/evaluations.ts`:

```ts
import { API_BASE, api } from "@/lib/api";
import type {
  CreateEvaluationRequest,
  Evaluation,
  ListEvaluationsParams,
  PaginatedEvaluationResponse,
  UpdateEvaluationRequest,
} from "@/types/evaluation";

function buildEvaluationQuery(params?: ListEvaluationsParams) {
  const searchParams = new URLSearchParams();
  if (params?.organizationId) searchParams.set("organization_id", params.organizationId);
  if (params?.period) searchParams.set("period", params.period);
  if (params?.status) searchParams.set("status", params.status);
  if (params?.query) searchParams.set("query", params.query);
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  return searchParams.toString();
}

export async function listEvaluations(
  token: string,
  params?: ListEvaluationsParams,
): Promise<PaginatedEvaluationResponse> {
  const qs = buildEvaluationQuery(params);
  return api.get<PaginatedEvaluationResponse>(`/evaluations${qs ? `?${qs}` : ""}`, token);
}

export async function createEvaluation(
  token: string,
  payload: CreateEvaluationRequest,
): Promise<Evaluation> {
  return api.post<Evaluation>("/evaluations", payload, token);
}

export async function getEvaluation(token: string, id: string): Promise<Evaluation> {
  return api.get<Evaluation>(`/evaluations/${id}`, token);
}

export async function updateEvaluation(
  token: string,
  id: string,
  payload: UpdateEvaluationRequest,
): Promise<Evaluation> {
  return api.put<Evaluation>(`/evaluations/${id}`, payload, token);
}

export async function finalizeEvaluation(token: string, id: string): Promise<Evaluation> {
  return api.post<Evaluation>(`/evaluations/${id}/finalize`, {}, token);
}

export async function reopenEvaluation(token: string, id: string): Promise<Evaluation> {
  return api.post<Evaluation>(`/evaluations/${id}/reopen`, {}, token);
}

export async function downloadEvaluationPdf(token: string, id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/evaluations/${id}/export/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(body.detail || "Gagal mengunduh PDF Evaluasi MR.");
  }
  return response.blob();
}
```

- [ ] **Step 5: Add helpers**

Create `frontend/src/lib/evaluations.ts`:

```ts
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

export const evaluationStatusLabel: Record<EvaluationStatus, string> = {
  draft: "Draft",
  final: "Final",
};

export const evaluationStatusStyles: Record<EvaluationStatus, string> = {
  draft: "border-zinc-300 bg-zinc-50 text-zinc-700",
  final: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

export function isEvaluationEditable(evaluation: Evaluation | null | undefined) {
  return evaluation?.status === "draft";
}

export function filterEvaluations(
  items: Evaluation[],
  filter: { search?: string; status?: EvaluationStatus | "all"; period?: string | "all" },
) {
  const search = (filter.search ?? "").trim().toLowerCase();
  return items.filter((item) => {
    const matchesSearch =
      !search ||
      item.period.toLowerCase().includes(search) ||
      item.templateName?.toLowerCase().includes(search);
    const matchesStatus = !filter.status || filter.status === "all" || item.status === filter.status;
    const matchesPeriod = !filter.period || filter.period === "all" || item.period === filter.period;
    return matchesSearch && matchesStatus && matchesPeriod;
  });
}
```

- [ ] **Step 6: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/evaluation.ts frontend/src/lib/api/evaluations.ts frontend/src/lib/evaluations.ts frontend/src/lib/evaluations.test.ts
git commit -m "feat: add evaluation frontend API"
```

---

### Task 8: Frontend List And Create Pages

**Files:**

- Create: `frontend/src/app/(app)/evaluations/page.tsx`
- Create: `frontend/src/app/(app)/evaluations/new/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`

- [ ] **Step 1: Add navigation entry and breadcrumbs**

Modify `frontend/src/lib/app-navigation.ts`:

```ts
{
  label: "Evaluasi MR",
  href: "/evaluations",
  icon: "ClipboardList",
  matchHrefs: ["/evaluations"],
}
```

Add breadcrumbs:

```ts
"/evaluations": "Evaluasi MR",
"/evaluations/new": "Buat Evaluasi MR",
```

- [ ] **Step 2: Implement list page**

Create `frontend/src/app/(app)/evaluations/page.tsx`.

Required UI:

- Header: `Evaluasi MR`
- Description: `Kelola evaluasi monitoring dan evaluasi penerapan manajemen risiko per organisasi dan periode.`
- Button to `/evaluations/new`
- Filters: search, period, status
- Table columns: Periode, Organisasi, Template, Status, Diperbarui, Aksi
- Empty state when no data

Use existing patterns from `frontend/src/app/(app)/management/tmpmr/page.tsx`.

- [ ] **Step 3: Implement create page**

Create `frontend/src/app/(app)/evaluations/new/page.tsx`.

Required behavior:

- Load organizations through `listAllOrganizations`.
- Use `OrganizationPicker`.
- Default period to current half-year like formal report page.
- Submit calls `createEvaluation`.
- On success, route to `/evaluations/${response.id}`.
- Show toast error on duplicate or request failure.

- [ ] **Step 4: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'frontend/src/app/(app)/evaluations/page.tsx' 'frontend/src/app/(app)/evaluations/new/page.tsx' frontend/src/lib/app-navigation.ts
git commit -m "feat: add evaluation list and create pages"
```

---

### Task 9: Frontend Evaluation Detail Editor

**Files:**

- Create: `frontend/src/app/(app)/evaluations/[id]/page.tsx`

- [ ] **Step 1: Implement detail page data loading**

Create `frontend/src/app/(app)/evaluations/[id]/page.tsx` with:

- `getEvaluation(token, id)` on load.
- Local editable state for all header fields and sections.
- Loading state with spinner.
- Error toast and back navigation to `/evaluations`.

- [ ] **Step 2: Implement editable report metadata sections**

Add form sections:

- Identitas Evaluasi: organization display, period, status.
- Dokumen Penugasan: report number/date, assignment letter number/date, monitoring date range.
- Identitas Unit: unit code, location, address, eselon I, leader name.
- Tim Evaluasi: coordinator, lead, members.

Disable all inputs when status is `final`.

- [ ] **Step 3: Implement section 8 editor**

For each `evaluation.sections`, render:

- Section title.
- Section conclusion textarea.
- Table/list of items with:
  - item no
  - item label
  - answer segmented/select: unset/yes/no
  - condition textarea
  - description textarea
  - analysis textarea

Use stable state update helpers:

```ts
function updateSection(sectionIndex: number, patch: Partial<EvaluationSection>) { ... }
function updateItem(sectionIndex: number, itemIndex: number, patch: Partial<EvaluationItem>) { ... }
```

- [ ] **Step 4: Implement action bar**

Actions:

- `Simpan`: calls `updateEvaluation`.
- `Finalisasi`: calls `finalizeEvaluation`.
- `Reopen Draft`: calls `reopenEvaluation`, only visible for final.
- `Export PDF`: calls `downloadEvaluationPdf`, creates object URL, and opens/downloads the blob.
- `Kembali`: routes to `/evaluations`.

- [ ] **Step 5: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'frontend/src/app/(app)/evaluations/[id]/page.tsx'
git commit -m "feat: add evaluation detail editor"
```

---

### Task 10: Formal Reports UI Handoff

**Files:**

- Modify: `frontend/src/app/(app)/reports/formal/page.tsx`
- Modify: `frontend/src/lib/formal-report-definitions.ts`
- Optional modify: `frontend/src/app/(app)/reports/_components/formal-report-card.tsx`

- [ ] **Step 1: Update formal report copy**

Change formal reports copy so Monitoring & Evaluation is not presented as the primary input workflow. Use wording:

```tsx
Laporan Monitoring & Evaluasi MR disusun dari modul Evaluasi MR. Buka atau buat evaluasi terlebih dahulu, lalu export PDF dari detail evaluasi.
```

- [ ] **Step 2: Add primary handoff button**

Add a button/link to `/evaluations` labeled `Buka Evaluasi MR`.

If an existing `Generate` button remains temporarily, make it secondary and clearly legacy, or remove it if backend export from evaluation is fully available.

- [ ] **Step 3: Run frontend verification**

Run:

```bash
cd frontend
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'frontend/src/app/(app)/reports/formal/page.tsx' frontend/src/lib/formal-report-definitions.ts frontend/src/app/(app)/reports/_components/formal-report-card.tsx
git commit -m "feat: route formal report users to evaluations"
```

---

### Task 11: Full Verification

**Files:**

- No new files unless fixes are required.

- [ ] **Step 1: Run backend unit tests for touched packages**

Run:

```bash
cd backend
go test ./internal/domain/entity ./internal/domain/repository ./internal/usecase/evaluation ./internal/handler/http ./internal/service/pdfreport
```

Expected: PASS.

- [ ] **Step 2: Run broader backend tests**

Run:

```bash
cd backend
go test ./...
```

Expected: PASS. If integration tests require external services, document the exact skipped or failing package and reason before proceeding.

- [ ] **Step 3: Run frontend checks**

Run:

```bash
cd frontend
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 4: Manual API smoke test**

Start backend if needed:

```bash
cd backend
go run ./cmd/server
```

With a valid token, verify:

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/evaluations
```

Expected: JSON paginated response.

- [ ] **Step 5: Manual frontend smoke test**

Start frontend:

```bash
cd frontend
npm run dev
```

Verify in browser:

- `/evaluations` loads.
- Create page can create an evaluation.
- Detail page saves checklist data.
- Finalize locks editing.
- Reopen restores editing.
- Export PDF returns a non-empty PDF.

- [ ] **Step 6: Commit verification fixes if any**

If verification required fixes:

```bash
git add <fixed-files>
git commit -m "fix: stabilize evaluation workflow"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Checklist

- [ ] Every table from the spec is created.
- [ ] `evaluation_mitigation_summaries` is not created.
- [ ] No approval/review status or endpoint is introduced.
- [ ] Evaluation content is stored in SQL rows, not JSONB.
- [ ] Template rows are snapshotted into evaluations on create.
- [ ] Final evaluations reject normal update.
- [ ] Reopen returns final evaluations to draft.
- [ ] PDF export reads section 8 from evaluation snapshots.
- [ ] Mitigation summary is generated live from risk data.
- [ ] Frontend route `/evaluations` is available from navigation.
- [ ] Reports page no longer acts like the primary input surface for Monitoring & Evaluation MR.

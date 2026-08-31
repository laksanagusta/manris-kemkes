# KMK Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyelaraskan Manris v2 dengan `kmk.md` BAB IV Proses Manajemen Risiko secara bertahap, audit-ready, dan tetap kompatibel dengan arsitektur backend Go Clean Architecture + frontend Next.js.

**Architecture:** Implementasi dilakukan secara incremental melalui 13 workstream prioritas. Setiap workstream menambah satu kemampuan KMK-native yang bisa diuji dan dirilis sendiri, dimulai dari fondasi konteks/sasaran, lalu scoring KMK, eskalasi/pemantauan, dokumen formal, dan maturitas.

**Tech Stack:** Backend Go + Fiber + PostgreSQL migrations + Clean Architecture; Frontend Next.js App Router + React + TypeScript + shadcn/ui + Tailwind; testing Go `go test ./...` dan frontend `npm run build` + test util yang relevan.

---

## Priority Overview

| Urutan | Workstream | Prioritas | Tujuan KMK |
|---:|---|---|---|
| 1 | Quick KMK terminology alignment | P0 | Menyamakan label dan istilah aplikasi dengan KMK |
| 2 | Konteks & Piagam MR | P1 | Memenuhi tahap cakupan, konteks, kriteria, dan piagam penerapan MR |
| 3 | Sasaran/IKU/Program/Kegiatan master | P1 | Menjadikan sasaran organisasi sebagai basis risiko |
| 4 | Link risiko ke sasaran | P1 | Memastikan setiap risiko berdampak ke sasaran/IKU |
| 5 | Likelihood assessment wizard | P1 | Membuat penentuan kemungkinan berbasis data/justifikasi KMK |
| 6 | Impact criteria matrix | P1 | Membuat penentuan dampak berbasis kategori + tingkat UPR |
| 7 | Auto appetite, tolerance, dan mitigasi wajib | P1 | Menegakkan aturan selera risiko dan residual target |
| 8 | Priority engine KMK | P2 | Mengurutkan prioritas risiko sesuai tie-breaker KMK |
| 9 | Risk cascading & escalation | P2 | Mendukung top-down, bottom-up, dan mandatory risk antar UPR |
| 10 | LED / Loss Event Database formal | P2 | Memenuhi pencatatan kejadian risiko dan pelaporan luar biasa |
| 11 | Komunikasi & konsultasi registry | P2 | Mendokumentasikan rapat, FGD, survei, observasi, dan stakeholder |
| 12 | Mitigation plan KMK extension | P2 | Melengkapi rencana mitigasi sesuai detail KMK |
| 13 | TMPMR + laporan formal KMK | P3 | Menyediakan maturitas, laporan penerapan, dan laporan pengawasan MR |

---

## Existing Codebase Anchors

### Backend anchors

- `backend/cmd/server/main.go` — route registration.
- `backend/internal/bootstrap/bootstrap.go` — dependency injection.
- `backend/db/migrations/` — schema changes.
- `backend/internal/domain/entity/risk.go` — risk domain model, score, level, category.
- `backend/internal/repository/postgres/risk.go` — risk persistence.
- `backend/internal/usecase/risk/` — risk lifecycle use cases.
- `backend/internal/usecase/approval/` — approval workflow.
- `backend/internal/usecase/mitigation_task/` — recurring monitoring tasks.
- `backend/internal/usecase/report/` and `backend/internal/service/pdfreport/` — report generation.

### Frontend anchors

- `frontend/src/lib/risk.ts` — labels, bobot matrix, scoring utilities.
- `frontend/src/types/risk.ts` — risk types.
- `frontend/src/app/(app)/risk/register/new/page.tsx` — risk registration form.
- `frontend/src/app/(app)/risk/assessment/[id]/page.tsx` — reassessment/monitoring form.
- `frontend/src/app/(app)/risk/working-papers/` — working paper UI.
- `frontend/src/lib/working-paper-export.ts` — Excel working paper export.
- `frontend/src/app/(app)/reports/page.tsx` — report dashboard/export.
- `frontend/src/app/(app)/admin/settings/organization-context/page.tsx` — current org context page.
- `frontend/src/lib/app-navigation.ts` — navigation.

---

## Phase 0 — Immediate KMK Terminology Alignment

### Task 1: Align visible terminology with KMK

**Priority:** P0  
**Outcome:** UI labels no longer use non-KMK terms where KMK has explicit labels.

**Files:**
- Modify: `frontend/src/lib/risk.ts`
- Modify: `frontend/src/lib/heatmap-utils.ts` if color/label assumptions are duplicated
- Search/modify: `frontend/src/**/*.tsx` occurrences of `Ekstrem`, `Sangat Jarang`, `Kadang-kadang`, `Sering`, `Sangat Berat`
- Test: `frontend/src/lib/risk.test.ts`

**Steps:**

- [x] Update probability labels in `frontend/src/lib/risk.ts`:
  - `1: "Jarang"`
  - `2: "Kemungkinan Kecil"`
  - `3: "Kemungkinan Sedang"`
  - `4: "Kemungkinan Besar"`
  - `5: "Hampir Pasti Terjadi"`

- [x] Update impact labels in `frontend/src/lib/risk.ts`:
  - `1: "Tidak Signifikan"`
  - `2: "Kecil"`
  - `3: "Sedang"`
  - `4: "Besar"`
  - `5: "Katastropik"`

- [x] Replace display label `Ekstrem` with `Sangat Tinggi` unless a chart explicitly needs legacy label compatibility.

- [x] Add/adjust frontend unit tests:
  - Verify probability label `5` is `Hampir Pasti Terjadi`.
  - Verify impact label `5` is `Katastropik`.
  - Verify `getRiskLevelDisplayLabel("sangat_tinggi")` returns `Sangat Tinggi`.

- [x] Run:

```bash
cd frontend
npm test -- risk.test.ts
npm run build
```

- [x] Commit:

```bash
git add frontend/src/lib/risk.ts frontend/src/lib/risk.test.ts frontend/src
git commit -m "fix: align risk labels with KMK"
```

---

## Phase 1 — KMK Foundation: Context, Objectives, Risk Linkage

### Task 2: Build structured Konteks & Piagam MR module

**Priority:** P1  
**Outcome:** Tahap cakupan, konteks, kriteria, dan Piagam Penerapan MR terdokumentasi secara terstruktur.

**Backend files:**
- Create migration: `backend/db/migrations/000044_risk_charters.up.sql`
- Create migration: `backend/db/migrations/000044_risk_charters.down.sql`
- Create entity: `backend/internal/domain/entity/risk_charter.go`
- Create repository interface: `backend/internal/domain/repository/risk_charter.go`
- Create repository implementation: `backend/internal/repository/postgres/risk_charter.go`
- Create usecases: `backend/internal/usecase/risk_charter/create.go`, `get.go`, `list.go`, `update.go`, `submit.go`
- Create handler: `backend/internal/handler/http/risk_charter.go`
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

**Frontend files:**
- Create: `frontend/src/types/risk-charter.ts`
- Create: `frontend/src/lib/api/risk-charters.ts`
- Create: `frontend/src/app/(app)/management/charters/page.tsx`
- Create: `frontend/src/app/(app)/management/charters/[id]/page.tsx`
- Modify: `frontend/src/lib/app-navigation.ts`

**Schema:**

```sql
CREATE TABLE risk_charters (
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
```

**Steps:**

- [x] Write backend entity tests for valid/invalid `upr_level`, required `period`, and status transitions.
- [x] Create migrations and run `make migrate-up` locally.
- [x] Implement repository CRUD with org-scope filtering.
- [x] Implement usecases with validation:
  - Only users with write access can create/update.
  - Approved charter is read-only except archive.
  - One charter per organization + period + UPR level.
- [x] Add HTTP routes:

```go
protected.Get("/risk-charters", riskCharterHandler.List)
protected.Post("/risk-charters", riskCharterHandler.Create)
protected.Get("/risk-charters/:id", riskCharterHandler.Get)
protected.Put("/risk-charters/:id", riskCharterHandler.Update)
protected.Post("/risk-charters/:id/submit", riskCharterHandler.Submit)
```

- [x] Build frontend list page with filters: period, organization, UPR level, status.
- [x] Build frontend detail/edit form with sections:
  - Identitas piagam
  - Ruang lingkup
  - Dasar hukum
  - Konteks internal
  - Konteks eksternal
  - Pemangku kepentingan
  - Struktur UPR
- [x] Add navigation under new group `Risk Governance`.
- [x] Run:

```bash
cd backend && go test ./...
cd ../frontend && npm run build
```

- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add KMK risk charter module"
```

---

### Task 3: Add Sasaran/IKU/Program/Kegiatan master

**Priority:** P1  
**Outcome:** Organisasi memiliki master sasaran yang menjadi dasar identifikasi risiko.

**Backend files:**
- Create migration: `backend/db/migrations/000045_risk_objectives.up.sql`
- Create migration: `backend/db/migrations/000045_risk_objectives.down.sql`
- Create entity: `backend/internal/domain/entity/risk_objective.go`
- Create repository/usecase/handler set matching existing clean architecture pattern.
- Modify: `backend/internal/bootstrap/bootstrap.go`
- Modify: `backend/cmd/server/main.go`

**Frontend files:**
- Create: `frontend/src/types/risk-objective.ts`
- Create: `frontend/src/lib/api/risk-objectives.ts`
- Create: `frontend/src/app/(app)/management/objectives/page.tsx`
- Create: `frontend/src/app/(app)/management/objectives/new/page.tsx`
- Create: `frontend/src/app/(app)/management/objectives/[id]/page.tsx`

**Schema:**

```sql
CREATE TABLE risk_objectives (
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

CREATE INDEX idx_risk_objectives_org_period ON risk_objectives(organization_id, period);
CREATE INDEX idx_risk_objectives_charter ON risk_objectives(charter_id);
```

**Steps:**

- [x] Test validation: `tujuan`, `sasaran`, and `indikator_kinerja_utama` are required.
- [x] Implement CRUD backend.
- [x] Add endpoint routes:

```go
protected.Get("/risk-objectives", objectiveHandler.List)
protected.Post("/risk-objectives", objectiveHandler.Create)
protected.Get("/risk-objectives/:id", objectiveHandler.Get)
protected.Put("/risk-objectives/:id", objectiveHandler.Update)
protected.Delete("/risk-objectives/:id", objectiveHandler.Delete)
```

- [x] Build frontend objective table with filters by period/org.
- [x] Build objective form.
- [x] Add objective picker API that supports search by sasaran/IKU/program.
- [x] Run backend and frontend verification.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add risk objectives master"
```

---

### Task 4: Link risiko to Sasaran/IKU and enforce KMK basis

**Priority:** P1  
**Outcome:** Risiko tidak berdiri sendiri; setiap risk register terkait ke sasaran/IKU.

**Backend files:**
- Create migration: `backend/db/migrations/000046_risks_objective_link.up.sql`
- Create migration: `backend/db/migrations/000046_risks_objective_link.down.sql`
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify tests in `backend/internal/usecase/risk/*_test.go`

**Frontend files:**
- Modify: `frontend/src/types/risk.ts`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/lib/api/risk-register.ts`
- Modify: `frontend/src/lib/working-paper-export.ts`

**Schema:**

```sql
ALTER TABLE risks ADD COLUMN objective_id UUID REFERENCES risk_objectives(id);
CREATE INDEX idx_risks_objective_id ON risks(objective_id);
```

**Steps:**

- [x] Add `ObjectiveID *uuid.UUID` to backend risk entity.
- [x] Add `objectiveId?: string` to frontend `Risk` type.
- [x] Update risk repository insert/select/update.
- [x] Update create/update usecases to validate objective belongs to selected organization or accessible child organization.
- [x] Add backend test: create risk without objective fails when feature flag `KMK_OBJECTIVE_REQUIRED=true`.
- [x] Add backend config flag defaulting to `false` for safe rollout:

```env
KMK_OBJECTIVE_REQUIRED=false
```

- [x] Add objective selector to risk form under Identifikasi section.
- [x] Add objective metadata to working paper export headers.
- [x] Run:

```bash
cd backend && go test ./internal/usecase/risk/... ./internal/repository/postgres/...
cd ../frontend && npm run build
```

- [x] Commit:

```bash
git add backend frontend .env.example
git commit -m "feat: link risks to KMK objectives"
```

---

## Phase 2 — KMK Scoring and Evaluation Rules

### Task 5: Implement Likelihood Assessment Wizard

**Priority:** P1  
**Outcome:** Level kemungkinan punya metode, data, dan justifikasi sesuai KMK.

**Backend files:**
- Migration: `backend/db/migrations/000047_likelihood_assessments.up.sql`
- Entity: `backend/internal/domain/entity/likelihood_assessment.go`
- Repository/usecase/handler for likelihood assessment.
- Modify risk create/update to accept `likelihoodAssessment` payload.

**Frontend files:**
- Create: `frontend/src/types/likelihood-assessment.ts`
- Create: `frontend/src/components/risk/likelihood-assessment-wizard.tsx`
- Modify: `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify: `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`

**Schema:**

```sql
CREATE TABLE likelihood_assessments (
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

CREATE INDEX idx_likelihood_assessments_risk ON likelihood_assessments(risk_id);
```

**Rules:**

- `frequency_type=non_low_frequency` default observation period: 12 months.
- `frequency_type=low_frequency` default observation period: 60 months.
- Probability method requires `population_count`.
- Expert judgement, benchmarking, and consensus require non-empty `justification`.
- Selected probability is written back to `risks.probability`.

**Steps:**

- [ ] Add domain function `ResolveLikelihoodLevel(input)` with table thresholds from KMK.
- [ ] Test threshold mapping for all 5 levels.
- [ ] Implement repository upsert by `risk_id`.
- [ ] Add wizard UI with tabs: Frekuensi, Probabilitas, Expert Judgement, Benchmarking, Konsensus.
- [ ] Display calculated recommendation and allow UPR decision with justification.
- [ ] Persist selected level into risk form state.
- [ ] Add summary to working paper export: method, data source, justification.
- [ ] Run backend/frontend tests and build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add KMK likelihood assessment wizard"
```

---

### Task 6: Implement Impact Criteria Matrix

**Priority:** P1  
**Outcome:** Level dampak dipilih berdasarkan kategori risiko dan tingkat UPR sesuai KMK.

**Backend files:**
- Migration: `backend/db/migrations/000048_impact_criteria.up.sql`
- Seed migration or static seed in same migration.
- Entity/repository/usecase/handler for impact criteria.
- Modify risk create/update to accept `impactCriteriaId` and `impactJustification`.

**Frontend files:**
- Create: `frontend/src/types/impact-criteria.ts`
- Create: `frontend/src/lib/api/impact-criteria.ts`
- Create: `frontend/src/components/risk/impact-criteria-selector.tsx`
- Modify risk forms.

**Schema:**

```sql
CREATE TABLE impact_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('kebijakan','reputasi','fraud_korupsi','legal','kepatuhan','operasional')),
    upr_level TEXT NOT NULL CHECK (upr_level IN ('kementerian','upr_t1','upr_t2')),
    impact_level INTEGER NOT NULL CHECK (impact_level BETWEEN 1 AND 5),
    impact_label TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category, upr_level, impact_level, description)
);

ALTER TABLE risks ADD COLUMN impact_criteria_id UUID REFERENCES impact_criteria(id);
ALTER TABLE risks ADD COLUMN impact_justification TEXT NOT NULL DEFAULT '';
```

**Steps:**

- [ ] Seed minimum impact criteria for all categories, UPR levels, and 5 levels using KMK descriptions summarized from `kmk.md`.
- [ ] Add endpoint:

```go
protected.Get("/impact-criteria", impactCriteriaHandler.List)
```

- [ ] Add selector that filters by risk category and organization UPR level.
- [ ] When user chooses criterion, set `impact` to criterion level.
- [ ] Require `impactJustification` for manual override.
- [ ] Show selected criterion in detail and working paper.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add KMK impact criteria matrix"
```

---

### Task 7: Enforce auto appetite, tolerance, and mandatory mitigation rules

**Priority:** P1  
**Outcome:** Sistem otomatis menentukan area penerimaan risiko dan mewajibkan mitigasi untuk risiko utama.

**Backend files:**
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/usecase/risk/create.go`
- Modify: `backend/internal/usecase/risk/update.go`
- Add tests: `backend/internal/domain/entity/risk_test.go`, `backend/internal/usecase/risk/create_test.go`

**Frontend files:**
- Modify: `frontend/src/lib/risk.ts`
- Modify risk form validation in `frontend/src/app/(app)/risk/register/new/page.tsx`
- Modify assessment form if residual target is edited there.

**Rules:**

- `nilai < 10`: `riskAppetite = dalam_batas`.
- `nilai >= 10`: `riskAppetite = di_atas_batas`.
- If current level is Sedang/Tinggi/Sangat Tinggi, at least one mitigation is required unless treatment option is `menghindari`, `berbagi`, or `menerima` with approval note.
- If target residual remains `nilai >= 10`, require `residual_acceptance_reason`.

**Schema:**

```sql
ALTER TABLE risks ADD COLUMN residual_acceptance_reason TEXT NOT NULL DEFAULT '';
```

**Steps:**

- [ ] Add `ResolveRiskAppetite(nilai float64) string` in backend entity.
- [ ] Add tests for appetite thresholds.
- [ ] Add frontend equivalent helper in `frontend/src/lib/risk.ts`.
- [ ] Update create/update usecase to override manual appetite with calculated value.
- [ ] Add validation errors for missing mitigation on risk utama.
- [ ] Add UI warning and blocking validation.
- [ ] Add residual acceptance reason field shown only when target residual is above appetite.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: enforce KMK risk appetite rules"
```

---

### Task 8: Implement KMK priority engine

**Priority:** P2  
**Outcome:** Prioritas risiko dihitung sesuai urutan KMK: nilai, area dampak, kategori, judgement pimpinan.

**Backend files:**
- Migration: `backend/db/migrations/000049_risk_priority_engine.up.sql`
- Modify: `backend/internal/domain/entity/risk.go`
- Create: `backend/internal/domain/service/risk_priority.go`
- Tests: `backend/internal/domain/service/risk_priority_test.go`
- Modify list/register usecases if sorting depends on calculated rank.

**Frontend files:**
- Modify risk register table sorting.
- Add admin UI for category priority ordering if not hardcoded.

**Schema:**

```sql
CREATE TABLE risk_category_priorities (
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

ALTER TABLE risks ADD COLUMN leader_judgement_rank INTEGER;
ALTER TABLE risks ADD COLUMN priority_sort_value NUMERIC(12,4) NOT NULL DEFAULT 0;
```

**Steps:**

- [ ] Implement priority comparator:
  1. Higher `nilai` first.
  2. Higher impact level first.
  3. Lower category priority order first.
  4. Lower leader judgement rank first when present.
- [ ] Add backend tests with same nilai but different category.
- [ ] Recompute priority after create/update.
- [ ] Update risk register query default order by `priority_sort_value DESC` then `created_at DESC`.
- [ ] Add optional field `leaderJudgementRank` visible to pimpinan/reviewer roles.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add KMK risk priority engine"
```

---

## Phase 3 — UPR Governance, LED, Consultation, Mitigation Detail

### Task 9: Implement risk cascading and escalation

**Priority:** P2  
**Outcome:** Mendukung adopsi risiko top-down, mandatory risk, dan usulan bottom-up antar UPR.

**Backend files:**
- Migration: `backend/db/migrations/000050_risk_cascading.up.sql`
- Entity: `backend/internal/domain/entity/risk_cascade.go`
- Repository/usecase/handler set.
- Modify risk create to support `parentRiskId`.

**Frontend files:**
- Create: `frontend/src/app/(app)/risk/cascading/page.tsx`
- Add action buttons in risk detail/register: `Mandatkan`, `Adopsi`, `Usulkan naik`.

**Schema:**

```sql
CREATE TABLE risk_cascades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_risk_id UUID NOT NULL REFERENCES risks(id),
    target_risk_id UUID REFERENCES risks(id),
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
```

**Steps:**

- [ ] Add backend usecase for mandatory top-down cascade.
- [ ] Add backend usecase for bottom-up escalation request.
- [ ] Add accept/reject decision usecase.
- [ ] On accepted full adoption, clone risk with link to parent.
- [ ] On accepted partial adoption, prefill risk draft and require user adjustment.
- [ ] Build frontend queue page with tabs: mandat masuk, usulan naik, riwayat.
- [ ] Add org-scope permission checks.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add UPR risk cascading workflow"
```

---

### Task 10: Formalize LED / Loss Event Database

**Priority:** P2  
**Outcome:** Incident module memenuhi kebutuhan LED KMK.

**Backend files:**
- Migration: `backend/db/migrations/000051_led_fields.up.sql`
- Modify: `backend/internal/domain/entity/incident.go`
- Modify: `backend/internal/usecase/incident/*`
- Modify: `backend/internal/repository/postgres/incident.go`
- Add LED report usecase.

**Frontend files:**
- Modify: `frontend/src/types/incident.ts`
- Modify: `frontend/src/app/(app)/incidents/new/page.tsx`
- Modify: `frontend/src/app/(app)/incidents/[id]/page.tsx`
- Create: `frontend/src/app/(app)/incidents/led/page.tsx` or rename navigation label to `LED & Insiden`.

**Schema:**

```sql
ALTER TABLE incidents ADD COLUMN loss_event_type TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN actual_loss_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE incidents ADD COLUMN potential_loss_amount NUMERIC(18,2) NOT NULL DEFAULT 0;
ALTER TABLE incidents ADD COLUMN actual_impact_description TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN mitigation_taken TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN condition_after_mitigation TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN recovery_action TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN recurrence_prevention_idea TEXT NOT NULL DEFAULT '';
ALTER TABLE incidents ADD COLUMN is_extraordinary BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN one_day_report_due_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN reported_to_parent_at TIMESTAMPTZ;
```

**Steps:**

- [ ] Set `one_day_report_due_at = created_at + interval '1 day'` when `is_extraordinary=true`.
- [ ] Add backend validation: extraordinary events require linked risk or explanation.
- [ ] Add frontend LED form section:
  - Detail kejadian
  - Dampak aktual
  - Mitigasi saat kejadian
  - Kondisi setelah mitigasi
  - Recovery action
  - Ide pencegahan berulang
- [ ] Add LED dashboard filters: extraordinary, overdue one-day report, linked/unlinked risk.
- [ ] Add report endpoint `/reports/led`.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: formalize LED incident records"
```

---

### Task 11: Expand komunikasi & konsultasi registry

**Priority:** P2  
**Outcome:** Komunikasi dan konsultasi terdokumentasi lintas tahap MR, bukan hanya log per risiko.

**Backend files:**
- Migration: `backend/db/migrations/000052_consultation_events.up.sql`
- New entity/repository/usecase/handler.
- Keep existing `communication_logs` for backward compatibility.

**Frontend files:**
- Create: `frontend/src/app/(app)/management/consultations/page.tsx`
- Create: `frontend/src/app/(app)/management/consultations/new/page.tsx`
- Modify risk detail to show linked consultation events.

**Schema:**

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
```

**Steps:**

- [ ] Implement CRUD and org-scope access.
- [ ] Add event type labels exactly matching KMK forms.
- [ ] Link meeting minutes to consultation events when available.
- [ ] Add quarterly compliance indicator: each UPR should have at least one `rapat_berkala` per quarter.
- [ ] Show consultation history in risk detail and charter detail.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add KMK consultation event registry"
```

---

### Task 12: Extend mitigation plan to full KMK requirements

**Priority:** P2  
**Outcome:** Rencana mitigasi berisi opsi, output, target kuantitatif, sumber daya, kontingensi, kendala, dan biaya/manfaat.

**Backend files:**
- Migration: `backend/db/migrations/000053_mitigation_kmk_fields.up.sql`
- Modify: `backend/internal/domain/entity/mitigation.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify mitigation task/usecase tests.

**Frontend files:**
- Modify: `frontend/src/components/shared/mitigation-table.tsx`
- Modify: `frontend/src/components/shared/mitigation-picker.tsx`
- Modify: `frontend/src/types/risk.ts`
- Modify: `frontend/src/lib/working-paper-export.ts`

**Schema:**

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
ALTER TABLE mitigations ADD COLUMN is_breakthrough_activity BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE mitigations ADD COLUMN is_existing_control BOOLEAN NOT NULL DEFAULT FALSE;
```

**Rules:**

- `is_existing_control=true` cannot be counted as new mitigation for risk utama.
- Risk utama requires at least one mitigation with `is_existing_control=false`.
- `mitigation_type` determines whether target P, target D, or both should decrease.

**Steps:**

- [ ] Add entity fields and persistence.
- [ ] Add tests for risk utama mitigation validation.
- [ ] Update mitigation table UI to use expandable detail rows to avoid wide table overload.
- [ ] Add validation messages explaining KMK rule.
- [ ] Include new fields in working paper export.
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: extend mitigation plans for KMK"
```

---

## Phase 4 — Maturity and Formal Reporting

### Task 13: Implement TMPMR and formal KMK reports

**Priority:** P3  
**Outcome:** Sistem menyediakan Penilaian Tingkat Maturitas Penerapan Manajemen Risiko dan laporan formal tahunan/semesteran.

**Backend files:**
- Migration: `backend/db/migrations/000054_tmpmr_and_formal_reports.up.sql`
- Entities:
  - `backend/internal/domain/entity/tmpmr.go`
  - `backend/internal/domain/entity/formal_report.go`
- Repositories/usecases/handlers for TMPMR and formal reports.
- Modify report generation service.

**Frontend files:**
- Create: `frontend/src/app/(app)/management/tmpmr/page.tsx`
- Create: `frontend/src/app/(app)/management/tmpmr/[id]/page.tsx`
- Modify: `frontend/src/app/(app)/reports/page.tsx`
- Create export helpers if Excel/PDF split is needed.

**Schema:**

```sql
CREATE TABLE tmpmr_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    assessor_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved')),
    score NUMERIC(6,2) NOT NULL DEFAULT 0,
    maturity_level TEXT NOT NULL DEFAULT '',
    review_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, period)
);

CREATE TABLE tmpmr_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES tmpmr_assessments(id) ON DELETE CASCADE,
    dimension TEXT NOT NULL,
    question TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 5),
    evidence_url TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE formal_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    period TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('annual_risk_profile','semiannual_mr_implementation','semiannual_mr_supervision','led_report','tmpmr_report')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','generated','submitted','approved')),
    generated_file_url TEXT NOT NULL DEFAULT '',
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Report types:**

1. `annual_risk_profile` — profil risiko tahunan.
2. `semiannual_mr_implementation` — laporan penerapan MR 6 bulanan.
3. `semiannual_mr_supervision` — laporan pengawasan MR oleh SPI/SKI.
4. `led_report` — laporan Loss Event Database.
5. `tmpmr_report` — laporan maturitas MR.

**Steps:**

- [ ] Build TMPMR assessment CRUD.
- [ ] Add default TMPMR dimensions:
  - Tata kelola
  - Konteks dan kriteria
  - Penilaian risiko
  - Perlakuan risiko
  - Pemantauan dan reviu
  - Pencatatan dan pelaporan
- [ ] Calculate score as average of item scores.
- [ ] Map score to maturity level:
  - `0–1.49`: Awal
  - `1.50–2.49`: Berkembang
  - `2.50–3.49`: Terdefinisi
  - `3.50–4.49`: Terkelola
  - `4.50–5.00`: Optimum
- [ ] Add formal report generation endpoints:

```go
protected.Post("/formal-reports/generate", formalReportHandler.Generate)
protected.Get("/formal-reports", formalReportHandler.List)
protected.Get("/formal-reports/:id", formalReportHandler.Get)
```

- [ ] Extend reports page with formal KMK report cards.
- [ ] Generate each report from existing data:
  - Charter/context
  - Objectives
  - Risk profile
  - Working papers
  - LED
  - Consultation events
  - Mitigation task progress
  - TMPMR scores
- [ ] Run tests/build.
- [x] Commit:

```bash
git add backend frontend
git commit -m "feat: add TMPMR and formal KMK reports"
```

---

## Suggested Release Plan

### Release 1 — KMK foundation

Includes Task 1–4.

**Value:** Data risiko mulai anchored ke konteks, piagam, sasaran, IKU, program, dan kegiatan.

**Exit criteria:**

- Admin/unit can create charter.
- Unit can create objectives.
- Risk form can link to objective.
- Working paper displays objective metadata.
- Existing risk flow still works with compatibility flag.

### Release 2 — KMK scoring

Includes Task 5–8.

**Value:** Probability, impact, appetite, and priority become audit-defensible under KMK.

**Exit criteria:**

- Risk scoring has likelihood method and impact criterion evidence.
- Risk utama cannot bypass mitigation silently.
- Priority sorting follows KMK tie-breaker.

### Release 3 — UPR governance and monitoring evidence

Includes Task 9–12.

**Value:** Top-down/bottom-up risk governance, LED, consultation, and mitigation detail become formal.

**Exit criteria:**

- Parent UPR can mandate risk.
- Child UPR can escalate risk upward.
- Incidents can be reported as LED.
- Consultation events are tracked quarterly.
- Mitigation has full KMK fields.

### Release 4 — Maturity and formal reports

Includes Task 13.

**Value:** System can produce KMK-style implementation, supervision, LED, and maturity reports.

**Exit criteria:**

- TMPMR assessment works per UPR/period.
- Formal reports can be generated from system data.
- Reports page exposes annual and semiannual KMK report types.

---

## Token-Efficient Execution Strategy

Untuk implementasi paling hemat token di sesi ini, jangan kerjakan 13 workstream satu per satu dengan banyak handoff. Pakai 4 batch besar berikut.

### Batch A — Foundation KMK

**Cakupan:** Task 1–4  
**Target hasil:** istilah KMK rapi, charter ada, objective master ada, risiko bisa di-link ke objective.

**Kenapa duluan:** semua batch lain bergantung pada konteks, UPR, sasaran, dan metadata objective.

**Checkpoint selesai jika:**
- label UI pakai istilah KMK,
- `risk_charters` live,
- `risk_objectives` live,
- risk form bisa pilih objective,
- working paper tampilkan objective metadata.

**Verifikasi batch:**

```bash
cd backend && go test ./...
cd ../frontend && npm run build
```

### Batch B — Scoring & Evaluasi KMK

**Cakupan:** Task 5–8  
**Target hasil:** penentuan P/D/appetite/priority sesuai KMK, tidak lagi sekadar input angka manual.

**Kenapa kedua:** sesudah foundation siap, scoring baru bisa dikaitkan ke konteks dan UPR level.

**Checkpoint selesai jika:**
- likelihood wizard jalan,
- impact criteria matrix jalan,
- appetite otomatis,
- mitigasi wajib enforced untuk risiko utama,
- register urut pakai priority engine.

**Verifikasi batch:**

```bash
cd backend && go test ./...
cd ../frontend && npm run build
```

### Batch C — Governance, Monitoring, Evidence

**Cakupan:** Task 9–12  
**Target hasil:** alur UPR top-down/bottom-up, LED formal, konsultasi tercatat, mitigasi detail lengkap.

**Kenapa ketiga:** batch ini lebih berat dan saling terkait, jadi hemat token bila dikerjakan bersama dalam satu pass governance.

**Checkpoint selesai jika:**
- risk cascading jalan,
- incident/LED field formal live,
- consultation events live,
- mitigation form support field KMK penuh.

**Verifikasi batch:**

```bash
cd backend && go test ./...
cd ../frontend && npm run build
```

### Batch D — Maturity & Formal Reports

**Cakupan:** Task 13  
**Target hasil:** TMPMR dan laporan formal KMK bisa dihasilkan dari data sistem.

**Kenapa terakhir:** laporan formal butuh data dari batch A–C.

**Checkpoint selesai jika:**
- TMPMR CRUD live,
- formal reports generator live,
- reports page tampilkan report type KMK.

**Verifikasi batch:**

```bash
cd backend && go test ./...
cd ../frontend && npm run build
```

### Recommended Inline Order

Kalau benar-benar mau paling hemat token, jalankan urutan ini:

1. Batch A
2. Review singkat output + schema impact
3. Batch B
4. Review singkat scoring/UX
5. Batch C
6. Review singkat governance/reporting data
7. Batch D
8. Final verification penuh

### Recommended Commit Strategy

Commit per batch, bukan per subtask kecil, supaya hemat token dan review lebih cepat:

```bash
git commit -m "feat: add KMK foundation modules"
git commit -m "feat: add KMK scoring and evaluation"
git commit -m "feat: add KMK governance and monitoring"
git commit -m "feat: add KMK maturity and reporting"
```

## Global Verification Checklist

Run after each release:

```bash
cd backend
go test ./...

cd ../frontend
npm run build
```

Manual smoke test:

- Login as `superadmin`.
- Create/update organization context.
- Create risk charter.
- Create objective.
- Create risk linked to objective.
- Submit approval.
- Approve risk.
- Create reassessment.
- Generate working paper.
- Export report.

---

## Self-Review

### Spec coverage

- Komunikasi dan konsultasi: covered by Task 11.
- Cakupan, konteks, kriteria: covered by Task 2, 5, 6.
- Piagam penerapan MR: covered by Task 2.
- Sasaran/IKU/program/kegiatan: covered by Task 3 and 4.
- Identifikasi risiko berbasis sasaran: covered by Task 4.
- Analisis kemungkinan: covered by Task 5.
- Analisis dampak: covered by Task 6.
- Evaluasi appetite/tolerance/priority: covered by Task 7 and 8.
- Perlakuan/mitigasi: covered by Task 12.
- Pemantauan, LED, kejadian risiko: covered by Task 10 and existing reassessment flow.
- Top-down/bottom-up UPR: covered by Task 9.
- Pencatatan/pelaporan: covered by Task 13.
- TMPMR: covered by Task 13.

### Placeholder scan

No implementation task is left without concrete target files, schema, rules, and verification commands.

### Type consistency

The plan consistently uses:

- `risk_charters` for Piagam MR.
- `risk_objectives` for sasaran/IKU/program/kegiatan.
- `likelihood_assessments` for probability justification.
- `impact_criteria` for category + UPR-level impact matrix.
- `risk_cascades` for top-down/bottom-up governance.
- `consultation_events` for komunikasi/konsultasi.
- `tmpmr_assessments`, `tmpmr_items`, and `formal_reports` for maturity and formal reporting.

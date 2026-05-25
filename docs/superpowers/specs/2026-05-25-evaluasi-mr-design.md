# Evaluasi MR Module Design

## Context

The current **Laporan Monitoring & Evaluasi MR** export renders section 8, "Hasil Pemantauan dan Evaluasi", directly from hard-coded PDF/report logic. That is the wrong long-term ownership boundary. Section 8 contains evaluator judgment: checklist answers, condition narratives, analysis notes, conclusions, problems, and recommendations. A PDF generator should not be the primary input surface for that work.

The user approved an **evaluation-first** workflow: create an Evaluasi MR module where evaluators assess an organization for a period, then export the formal PDF from that evaluation. Approval/review workflow is explicitly out of scope for this iteration.

Reference: `kmk.md`, especially the monitoring, review, recording, and reporting guidance around periodic monitoring and formal reporting.

## Goals

- Add a dedicated **Evaluasi MR** module for Monitoring & Evaluation of risk management implementation.
- Let evaluators create, edit, finalize, reopen, and export evaluations per organization and period.
- Store section 8 content in normalized SQL tables, not JSONB.
- Keep template rows dynamic through database-backed templates.
- Snapshot template sections/items into each evaluation so old evaluations do not change when templates change.
- Generate mitigation summary live from current risk/monitoring data during preview/export.
- Keep the existing formal report PDF as an output artifact, not the source of evaluation data.

## Non-Goals

- No approval/review workflow in this iteration.
- No full form-builder UI for admins.
- No `evaluation_mitigation_summaries` table.
- No electronic signature integration.
- No granular file/evidence lifecycle beyond text/URL fields already captured in items.
- No removal of existing `formal_reports` behavior unless a later migration explicitly replaces it.

## Core Decision

Use SQL tables for evaluation content:

- `evaluation_templates`
- `evaluation_template_sections`
- `evaluation_template_items`
- `evaluations`
- `evaluation_sections`
- `evaluation_items`

Do not use an `evaluation_mitigation_summaries` table. The mitigation summary remains derived at runtime from risk data because the user wants it generated directly, not manually edited or stored.

## Data Model

### `evaluation_templates`

Stores template metadata.

Recommended columns:

- `id uuid primary key`
- `template_key text not null`
- `name text not null`
- `version integer not null`
- `status text not null check (status in ('draft','active','archived'))`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(template_key, version)`

Initial seed:

- `template_key`: `monitoring_evaluation_kmk`
- `name`: `Laporan Monitoring & Evaluasi MR - KMK`
- `version`: `1`
- `status`: `active`

### `evaluation_template_sections`

Stores reusable section definitions for a template.

Recommended columns:

- `id uuid primary key`
- `template_id uuid not null references evaluation_templates(id)`
- `section_key text not null`
- `title text not null`
- `description text not null default ''`
- `sort_order integer not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(template_id, section_key)`

Initial section keys:

- `document_completeness`
- `infrastructure_adequacy`
- `implementation_result`
- `mitigation_monitoring`

### `evaluation_template_items`

Stores reusable checklist/judgment rows for a template section.

Recommended columns:

- `id uuid primary key`
- `section_id uuid not null references evaluation_template_sections(id)`
- `item_key text not null`
- `item_no text not null`
- `label text not null`
- `default_condition text not null default ''`
- `default_description text not null default ''`
- `default_analysis text not null default ''`
- `sort_order integer not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(section_id, item_key)`

Use stable `item_key` values for code and analytics. `item_no` is display text and can change.

### `evaluations`

Stores the actual evaluation header and report-level fields.

Recommended columns:

- `id uuid primary key`
- `organization_id uuid not null references organizations(id)`
- `period text not null`
- `template_id uuid not null references evaluation_templates(id)`
- `status text not null check (status in ('draft','final'))`
- `report_number text not null default ''`
- `report_date date`
- `assignment_letter_number text not null default ''`
- `assignment_letter_date date`
- `monitoring_date_range text not null default ''`
- `unit_code text not null default ''`
- `unit_location text not null default ''`
- `unit_address text not null default ''`
- `unit_eselon_i text not null default ''`
- `unit_leader_name text not null default ''`
- `team_coordinator text not null default ''`
- `team_lead text not null default ''`
- `team_members text not null default ''`
- `problems text not null default ''`
- `recommendations text not null default ''`
- `created_by uuid references users(id)`
- `finalized_at timestamptz`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(organization_id, period, template_id)`

### `evaluation_sections`

Stores section snapshots for an evaluation.

Recommended columns:

- `id uuid primary key`
- `evaluation_id uuid not null references evaluations(id) on delete cascade`
- `template_section_id uuid references evaluation_template_sections(id)`
- `section_key text not null`
- `title text not null`
- `description text not null default ''`
- `conclusion text not null default ''`
- `sort_order integer not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(evaluation_id, section_key)`

### `evaluation_items`

Stores item snapshots and evaluator input.

Recommended columns:

- `id uuid primary key`
- `section_id uuid not null references evaluation_sections(id) on delete cascade`
- `template_item_id uuid references evaluation_template_items(id)`
- `item_key text not null`
- `item_no text not null`
- `label text not null`
- `answer text not null default 'unset' check (answer in ('unset','yes','no'))`
- `condition text not null default ''`
- `description text not null default ''`
- `analysis text not null default ''`
- `sort_order integer not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- unique constraint on `(section_id, item_key)`

## Workflow

### List Evaluations

Route: `/evaluations`

The page shows:

- organization filter
- period filter
- status filter: `draft` or `final`
- search by organization/period
- table columns: period, organization, status, template, updated time, actions
- primary action: **Buat Evaluasi**

### Create Evaluation

Route: `/evaluations/new` or a create action that redirects to detail.

Inputs:

- organization
- period
- template, defaulting to active `monitoring_evaluation_kmk`

On create:

1. Insert `evaluations`.
2. Copy active template sections into `evaluation_sections`.
3. Copy active template items into `evaluation_items`.
4. Prefill automatic item answers only when existing data is reliable.
5. Redirect to `/evaluations/:id`.

Duplicate organization/period/template creates should fail with a clear message and offer to open the existing evaluation.

### Edit Evaluation

Route: `/evaluations/:id`

The detail page contains:

- evaluation identity fields
- assignment letter and monitoring date fields
- team fields
- unit identity fields
- section 8 editable checklist sections
- section conclusion fields
- generated mitigation summary preview
- problems
- recommendations
- action bar: save, finalize, reopen draft, export PDF

`draft` evaluations are editable. `final` evaluations are read-only until reopened.

### Finalize and Reopen

Status model:

- `draft`: editable
- `final`: locked from normal edits

Finalization validates minimum fields:

- organization and period exist
- template snapshot exists
- all sections exist
- required section/item structure is intact

Do not require every item to have a yes/no answer in this first iteration because some rows may require evaluator discretion or unavailable evidence. Empty judgment fields are allowed unless a later product rule makes them required.

`Reopen Draft` changes `final` back to `draft` and clears `finalized_at`. This is intentionally simple because approval is out of scope.

## PDF Export

Endpoint:

- `GET /api/v1/evaluations/:id/export/pdf`

Export reads from:

- `evaluations`
- `evaluation_sections`
- `evaluation_items`
- `organizations`
- current approved/current risk data for mitigation summary

The generated PDF remains **Laporan Monitoring & Evaluasi MR** and should reuse the existing PDF renderer where possible. The renderer should stop hard-coding section 8 row content and instead map from evaluation snapshots.

Draft export is allowed. The PDF should indicate draft status in metadata or a visible draft marker if the existing renderer can support that cleanly.

## Formal Reports Relationship

`formal_reports` should not be the primary source of evaluator input.

Recommended behavior for this iteration:

- Keep existing `formal_reports` records as export history if still useful.
- Change the formal reports UI from "generate this report from nothing" toward "open or create the related evaluation".
- The primary action for Monitoring & Evaluation should live in **Evaluasi MR**, not Reports.

Do not delete the current formal report flow in the same implementation unless the migration is explicitly planned. Keep the change scoped.

## Mitigation Summary

The mitigation summary section is generated live from risk data during preview/export.

Rules follow the existing report logic:

- Group by risk level.
- Count risks.
- Count mitigation plans.
- Count realized mitigations with the best currently available data.
- Movement:
  - down: `BeforeMonitoringNilai > MonitoringResultNilai`
  - same: equal or missing result where the risk is not new
  - up: `BeforeMonitoringNilai < MonitoringResultNilai`
  - new: missing before-monitoring value

Because no snapshot table is created, a final evaluation exported after risk data changes may show updated mitigation counts. This is accepted for the first iteration.

## Permissions

Use existing organization access scope.

Recommended rules:

- Users can list/read evaluations for organizations they can read.
- Users can create/update/finalize/reopen evaluations for organizations they can write.
- Super admin can access all organizations.
- Final evaluations reject normal update operations until reopened.

## Error Handling

- Create fails on duplicate `(organization_id, period, template_id)`.
- Save fails if evaluation is `final`.
- Export returns not found if evaluation does not exist or is outside scope.
- Export does not fail when optional report metadata is blank.
- Export with no risk data renders zero mitigation counts and still produces a PDF.
- Missing or corrupted section snapshots should fail export with a clear validation error rather than silently generating a misleading report.

## Testing

Backend tests:

- Creating evaluation copies active template sections/items into snapshots.
- Duplicate create is rejected.
- Draft update succeeds.
- Final update is rejected.
- Reopen final allows editing again.
- Export maps evaluation sections/items to `MonitoringEvaluationReportData`.
- Export with no risk data produces zero-count mitigation summary.
- Live mitigation summary preserves current movement logic.

Frontend tests:

- Evaluation list filters status/period/search correctly where helper logic exists.
- Detail form disables fields for `final` status.
- API client types cover create, update, finalize, reopen, and export.

Manual verification:

- Create an evaluation for a unit and period.
- Fill section 8 rows and conclusions.
- Finalize and confirm the form locks.
- Reopen and confirm editing returns.
- Export PDF and verify section 8 reflects evaluator input, not hard-coded defaults.

## Implementation Notes

Follow the existing clean architecture pattern:

- domain entity and repository interfaces under `backend/internal/domain`
- postgres repository under `backend/internal/repository/postgres`
- use cases under `backend/internal/usecase/evaluation`
- HTTP handler under `backend/internal/handler/http`
- routes registered in the existing server/bootstrap path
- frontend API client under `frontend/src/lib/api`
- frontend types under `frontend/src/types`
- pages under `frontend/src/app/(app)/evaluations`

Keep template seeding deterministic through a migration or explicit seed logic. The first implementation should not include a template editor UI.

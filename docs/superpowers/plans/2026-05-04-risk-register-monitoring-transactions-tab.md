# Risk Register Monitoring Transactions Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated `Pemantauan` tab to the risk register page that lists monitoring transaction versions created by "Mulai Pemantauan", using an all-risks-style table plus two extra score columns for before/after monitoring values.

**Architecture:** Keep the current backend versioning model and `view=monitoring-transactions` register endpoint instead of introducing a new table or endpoint family. Finish the partial monitoring-transactions plumbing already present in `page.tsx`, tighten the API contract so the before/after score fields are explicit, then render the missing tab with the same filtering and pagination behavior as the main risk register.

**Tech Stack:** Go + Fiber + pgx + PostgreSQL on backend; Next.js App Router + React 19 + TypeScript + shadcn/ui + node:test on frontend.

---

## File Structure Map

### Existing backend files

- `backend/internal/domain/entity/risk.go` — rename the computed monitoring score fields to clearer JSON names used by the frontend tab.
- `backend/internal/repository/postgres/risk.go` — keep `ListRegister(...View=="monitoring-transactions")`, but rename selected aliases and verify the monitoring view still returns only reassessment versions (`previous_risk_id IS NOT NULL`).
- `backend/internal/handler/http/risk_register_test.go` — update response-contract assertions for the monitoring-transactions view.

### New backend test file

- `backend/internal/repository/postgres/risk_register_test.go` — integration-style repository coverage for monitoring transaction rows and before/after nilai projection.

### Existing frontend files

- `frontend/src/lib/api/risk-register.ts` — update `RiskRegisterListItem` to match the renamed backend JSON fields.
- `frontend/src/app/(app)/risk/register/page.tsx` — finish rendering the `monitoring-transactions` tab trigger and content, reuse existing shared filters/pagination state, and route row actions correctly.

### New frontend files

- `frontend/src/lib/risk-register-monitoring.ts` — focused helper for score formatting and row action routing so the giant page file does not accumulate more inline conditionals.
- `frontend/src/lib/risk-register-monitoring.test.ts` — node:test coverage for monitoring row helper behavior.
- `frontend/src/app/(app)/risk/components/monitoring-transactions-table.tsx` — all-risks-style table component for the monitoring tab.

---

## Behavioral Rules

1. The new tab label is `Pemantauan`.
2. The tab data source remains `GET /risks/register?view=monitoring-transactions`.
3. Monitoring transaction rows are reassessment versions only; baseline/current source risks do not appear in this tab.
4. The table layout should follow `All Risks` closely:
   - `Kode`
   - `Versi`
   - `Judul Risiko`
   - `Kategori`
   - `Nilai Sebelum`
   - `Nilai Hasil Pemantauan`
   - `Tingkat Risiko`
   - `Status`
   - `Penanganan`
   - `Dibuat`
   - `Aksi`
5. API response fields for the two extra score columns must be explicit:
   - `beforeMonitoringNilai`
   - `monitoringResultNilai`
6. Row actions:
   - `assessment_draft` or `assessment_in_review` opens `/risk/assessment/:id`
   - `approved` opens `/risk/register/:id`
7. Existing tab query state (`tab=monitoring-transactions`) and shared register filters must continue to work.

---

## Task 1: Clarify Backend Monitoring Transaction API Contract

**Files:**
- Modify: `backend/internal/domain/entity/risk.go`
- Modify: `backend/internal/repository/postgres/risk.go`
- Modify: `backend/internal/handler/http/risk_register_test.go`
- Create: `backend/internal/repository/postgres/risk_register_test.go`

- [ ] **Step 1: Update handler test expectations to the new field names**

Edit `backend/internal/handler/http/risk_register_test.go` in `TestRiskRegisterListSupportsMonitoringTransactionsView` so it asserts the renamed JSON fields:

```go
if payload.Data[0]["beforeMonitoringNilai"] != 12.5 {
	t.Fatalf("expected beforeMonitoringNilai 12.5, got %#v", payload.Data[0]["beforeMonitoringNilai"])
}
if payload.Data[0]["monitoringResultNilai"] != 9.75 {
	t.Fatalf("expected monitoringResultNilai 9.75, got %#v", payload.Data[0]["monitoringResultNilai"])
}
```

- [ ] **Step 2: Add a repository-level failing test for monitoring rows**

Create `backend/internal/repository/postgres/risk_register_test.go`:

```go
package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/manris/backend/internal/repository/postgres"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

func TestRiskListRegisterMonitoringTransactionsIncludesBeforeAndAfterNilai(t *testing.T) {
	pool := setupPool(t)
	repo := postgres.NewRiskRepository(pool)
	ctx := context.Background()

	versionGroupID := uuid.New()
	source := &entity.Risk{
		Code:            "R-MON-" + uuid.NewString()[:8],
		Title:           "Monitoring transaction source",
		Description:     "Approved source risk",
		Category:        entity.RiskCategoryOperasional,
		Status:          entity.RiskStatusApproved,
		VersionGroupID:  versionGroupID,
		IsCurrent:       true,
		IsCycleCurrent:  true,
		VersionNumber:   1,
		AssessmentCycle: "2025-H2",
		Probability:     3,
		Impact:          4,
		Weight:          1.0,
		Nilai:           12,
		RiskSource:      "internal",
		Controllability: "C",
		TreatmentOption: "mitigasi",
	}

	if err := repo.Create(ctx, source); err != nil {
		t.Fatalf("Create source risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, source.ID) })

	monitoring := riskuc.BuildPeriodicReassessmentDraft(
		source,
		"2026-H1",
		time.Date(2026, time.January, 10, 9, 0, 0, 0, time.UTC),
		uuid.Nil,
	)
	monitoring.Status = entity.RiskStatusApproved
	monitoring.IsCurrent = false
	monitoring.IsCycleCurrent = true
	monitoring.VersionNumber = 2
	monitoring.Nilai = 9.75

	if err := repo.Create(ctx, monitoring); err != nil {
		t.Fatalf("Create monitoring risk: %v", err)
	}
	t.Cleanup(func() { _ = repo.Delete(ctx, monitoring.ID) })

	items, total, err := repo.ListRegister(ctx, repository.RiskRegisterFilter{
		View:            "monitoring-transactions",
		Lifecycle:       "active",
		AssessmentCycle: "2026-H1",
		Page:            1,
		Limit:           20,
	})
	if err != nil {
		t.Fatalf("ListRegister: %v", err)
	}
	if total != 1 {
		t.Fatalf("expected total 1, got %d", total)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 row, got %d", len(items))
	}
	if items[0].PreviousRiskID == nil {
		t.Fatal("expected monitoring row to keep previous_risk_id")
	}
	if items[0].BeforeMonitoringNilai == nil || *items[0].BeforeMonitoringNilai != 12 {
		t.Fatalf("expected beforeMonitoringNilai 12, got %#v", items[0].BeforeMonitoringNilai)
	}
	if items[0].MonitoringResultNilai == nil || *items[0].MonitoringResultNilai != 9.75 {
		t.Fatalf("expected monitoringResultNilai 9.75, got %#v", items[0].MonitoringResultNilai)
	}
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
cd backend
go test ./internal/handler/http -run TestRiskRegisterListSupportsMonitoringTransactionsView -v
go test ./internal/repository/postgres -run TestRiskListRegisterMonitoringTransactionsIncludesBeforeAndAfterNilai -v
```

Expected:
- handler test fails because JSON still uses `previousNilai` / `monitoringNilai`
- repository test fails because `BeforeMonitoringNilai` / `MonitoringResultNilai` fields do not exist yet

- [ ] **Step 4: Implement the contract rename and SQL aliases**

Update `backend/internal/domain/entity/risk.go`:

```go
// Ongoing draft tracking (for list views)
DraftID *uuid.UUID `json:"draftId,omitempty"`
DraftStatus *string `json:"draftStatus,omitempty"`
HasOngoing bool `json:"hasOngoing"`

BeforeMonitoringNilai   *float64 `json:"beforeMonitoringNilai,omitempty"`
MonitoringResultNilai   *float64 `json:"monitoringResultNilai,omitempty"`
```

Update the monitoring projection in `backend/internal/repository/postgres/risk.go`:

```go
SELECT
	...
	prev.nilai AS before_monitoring_nilai,
	r.nilai AS monitoring_result_nilai
FROM risks r
LEFT JOIN risks prev ON prev.id = r.previous_risk_id
...
```

Update the scanner in `ListRegister`:

```go
&risk.BeforeMonitoringNilai,
&risk.MonitoringResultNilai,
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
cd backend
go test ./internal/handler/http -run TestRiskRegisterListSupportsMonitoringTransactionsView -v
go test ./internal/repository/postgres -run TestRiskListRegisterMonitoringTransactionsIncludesBeforeAndAfterNilai -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/domain/entity/risk.go \
  backend/internal/repository/postgres/risk.go \
  backend/internal/handler/http/risk_register_test.go \
  backend/internal/repository/postgres/risk_register_test.go
git commit -m "feat: clarify monitoring transaction register fields"
```

---

## Task 2: Add Frontend Monitoring Transaction Helpers and Types

**Files:**
- Modify: `frontend/src/lib/api/risk-register.ts`
- Create: `frontend/src/lib/risk-register-monitoring.ts`
- Create: `frontend/src/lib/risk-register-monitoring.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `frontend/src/lib/risk-register-monitoring.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  formatMonitoringNilai,
  getMonitoringTransactionHref,
  getMonitoringTransactionActionLabel,
} from "./risk-register-monitoring";

test("formatMonitoringNilai returns dash for nullish values", () => {
  assert.equal(formatMonitoringNilai(undefined), "-");
  assert.equal(formatMonitoringNilai(null), "-");
});

test("formatMonitoringNilai formats two-decimal scores", () => {
  assert.equal(formatMonitoringNilai(12), "12");
  assert.equal(formatMonitoringNilai(9.75), "9,75");
});

test("draft monitoring rows continue in assessment form", () => {
  const href = getMonitoringTransactionHref({
    id: "risk-v2",
    status: "assessment_draft",
  });
  assert.equal(href, "/risk/assessment/risk-v2");
  assert.equal(
    getMonitoringTransactionActionLabel("assessment_draft"),
    "Lanjutkan Pemantauan",
  );
});

test("approved monitoring rows open detail page", () => {
  const href = getMonitoringTransactionHref({
    id: "risk-v2",
    status: "approved",
  });
  assert.equal(href, "/risk/register/risk-v2");
  assert.equal(
    getMonitoringTransactionActionLabel("approved"),
    "Lihat Hasil",
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/risk-register-monitoring.test.ts
```

Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Implement the helper module and align API types**

Create `frontend/src/lib/risk-register-monitoring.ts`:

```ts
import type { RiskRegisterListItem } from "@/lib/api/risk-register";

const nilaiFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

export function formatMonitoringNilai(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return nilaiFormatter.format(value);
}

export function getMonitoringTransactionHref(input: Pick<RiskRegisterListItem, "id" | "status">) {
  if (input.status === "assessment_draft" || input.status === "assessment_in_review") {
    return `/risk/assessment/${input.id}`;
  }
  return `/risk/register/${input.id}`;
}

export function getMonitoringTransactionActionLabel(status?: RiskRegisterListItem["status"]) {
  if (status === "assessment_draft" || status === "assessment_in_review") {
    return "Lanjutkan Pemantauan";
  }
  return "Lihat Hasil";
}
```

Update `frontend/src/lib/api/risk-register.ts`:

```ts
export interface RiskRegisterListItem {
  ...
  beforeMonitoringNilai?: number | null;
  monitoringResultNilai?: number | null;
}
```

Remove the old `previousNilai` and `monitoringNilai` fields from the interface in the same edit.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/lib/risk-register-monitoring.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api/risk-register.ts \
  frontend/src/lib/risk-register-monitoring.ts \
  frontend/src/lib/risk-register-monitoring.test.ts
git commit -m "feat: add monitoring register row helpers"
```

---

## Task 3: Render the Missing `Pemantauan` Tab with All-Risks-Style Table

**Files:**
- Modify: `frontend/src/app/(app)/risk/register/page.tsx`
- Create: `frontend/src/app/(app)/risk/components/monitoring-transactions-table.tsx`

- [ ] **Step 1: Add a dedicated monitoring table component**

Create `frontend/src/app/(app)/risk/components/monitoring-transactions-table.tsx` with the same visual language as the all-risks table:

```tsx
"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { riskCategoryLabels } from "@/lib/risk";
import { formatMonitoringNilai, getMonitoringTransactionActionLabel, getMonitoringTransactionHref } from "@/lib/risk-register-monitoring";
import type { RiskRegisterListItem } from "@/lib/api/risk-register";

type MonitoringTransactionsTableProps = {
  items: RiskRegisterListItem[];
  statusVariant: Record<string, string>;
  statusLabel: Record<string, string>;
  levelBadgeVariant: Record<string, string>;
  getLevelLabel: (risk: RiskRegisterListItem) => string;
  formatTreatmentOption: (value?: string | null) => string;
  formatLocalDateTime: (value?: string | null) => string;
};

export function MonitoringTransactionsTable(props: MonitoringTransactionsTableProps) {
  const { items, statusVariant, statusLabel, levelBadgeVariant, getLevelLabel, formatTreatmentOption, formatLocalDateTime } = props;

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50 hover:bg-transparent">
          <TableHead className="w-20 whitespace-nowrap">Kode</TableHead>
          <TableHead className="w-16 whitespace-nowrap">Versi</TableHead>
          <TableHead className="whitespace-nowrap">Judul Risiko</TableHead>
          <TableHead className="w-28 whitespace-nowrap">Kategori</TableHead>
          <TableHead className="w-24 whitespace-nowrap text-center">Nilai Sebelum</TableHead>
          <TableHead className="w-28 whitespace-nowrap text-center">Nilai Hasil Pemantauan</TableHead>
          <TableHead className="w-24 whitespace-nowrap">Tingkat Risiko</TableHead>
          <TableHead className="w-24 whitespace-nowrap">Status</TableHead>
          <TableHead className="w-24 whitespace-nowrap">Penanganan</TableHead>
          <TableHead className="w-28 whitespace-nowrap">Dibuat</TableHead>
          <TableHead className="w-28 whitespace-nowrap">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((risk) => {
          const href = getMonitoringTransactionHref(risk);
          const levelLabel = getLevelLabel(risk);
          return (
            <TableRow key={risk.id} className="border-border/30 hover:bg-muted/30 transition-colors">
              <TableCell className="font-mono text-muted-foreground">{risk.code || "-"}</TableCell>
              <TableCell>{risk.versionNumber ? `v${risk.versionNumber}` : "-"}</TableCell>
              <TableCell className="max-w-[250px]">
                <Link href={href} className="block truncate text-sm font-medium leading-relaxed text-primary transition-colors hover:text-primary/80">
                  {risk.title || "-"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{riskCategoryLabels[risk.category ?? ""]}</TableCell>
              <TableCell className="text-center font-medium">{formatMonitoringNilai(risk.beforeMonitoringNilai)}</TableCell>
              <TableCell className="text-center font-semibold">{formatMonitoringNilai(risk.monitoringResultNilai)}</TableCell>
              <TableCell>
                <Badge className={cn("text-[10px] font-semibold border h-5 px-1.5", levelBadgeVariant[levelLabel])}>
                  {levelLabel}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={cn("text-[10px] font-medium border h-5 px-1.5", risk.status ? statusVariant[risk.status] : undefined)}>
                  {risk.status ? statusLabel[risk.status] || risk.status : "-"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{formatTreatmentOption(risk.treatmentOption)}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{formatLocalDateTime(risk.createdAt)}</TableCell>
              <TableCell>
                <Link href={href} className="text-xs font-medium text-primary hover:text-primary/80">
                  {getMonitoringTransactionActionLabel(risk.status)}
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 2: Wire the new tab trigger and content in the register page**

Modify `frontend/src/app/(app)/risk/register/page.tsx`:

1. Import the component:

```tsx
import { MonitoringTransactionsTable } from "@/app/(app)/risk/components/monitoring-transactions-table";
```

2. Add the missing trigger beside `Draf` and `Version History`:

```tsx
<TabsTrigger value="monitoring-transactions" className="gap-2">
  <RefreshCcw className="size-3.5" />
  Pemantauan
  {monitoringTransactions.length > 0 && (
    <Badge className="ml-1 bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1">
      {monitoringTransactions.length}
    </Badge>
  )}
</TabsTrigger>
```

3. Add a `TabsContent` block before `history` that mirrors the all-risks card structure and pagination shell:

```tsx
<TabsContent value="monitoring-transactions" className="space-y-6 mt-6">
  <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
    <CardHeader className="border-b border-border/40 pb-4">
      <CardTitle className="text-[15px] font-semibold">
        Transaksi Pemantauan
      </CardTitle>
      <p className="text-xs text-muted-foreground">
        Lihat semua versi hasil mulai pemantauan, bandingkan nilai sebelum dan hasil pemantauan, lalu lanjutkan draft yang masih berjalan.
      </p>
    </CardHeader>
    <MonitoringTransactionsTable
      items={monitoringTransactions}
      statusVariant={statusVariant}
      statusLabel={statusLabel}
      levelBadgeVariant={levelBadgeVariant}
      getLevelLabel={(risk) => getRiskLevelLabel(resolveListItemScoreSemantics(risk).effective.level)}
      formatTreatmentOption={formatTreatmentOption}
      formatLocalDateTime={formatLocalDateTime}
    />
    {/* reuse the same pagination footer pattern, but with activeTotal */}
  </Card>
</TabsContent>
```

4. Empty state text for this tab:

```tsx
Tidak ada transaksi pemantauan yang ditemukan.
```

- [ ] **Step 3: Run lint and type/build verification**

Run:

```bash
cd frontend
npm run lint -- src/app/'(app)'/risk/register/page.tsx src/app/'(app)'/risk/components/monitoring-transactions-table.tsx src/lib/risk-register-monitoring.ts
npm run build
```

Expected:
- ESLint passes
- Next.js build passes without type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/'(app)'/risk/register/page.tsx \
  frontend/src/app/'(app)'/risk/components/monitoring-transactions-table.tsx
git commit -m "feat: add monitoring transactions risk register tab"
```

---

## Task 4: Full Verification and Manual Smoke Check

**Files:**
- No code changes required unless verification exposes regressions.

- [ ] **Step 1: Run backend and frontend targeted automated checks**

Run:

```bash
cd backend
go test ./internal/handler/http -run TestRiskRegisterListSupportsMonitoringTransactionsView -v
go test ./internal/repository/postgres -run TestRiskListRegisterMonitoringTransactionsIncludesBeforeAndAfterNilai -v

cd ../frontend
node --test --experimental-specifier-resolution=node src/lib/risk-register-monitoring.test.ts
npm run test -- src/lib/risk-register-query.test.ts
npm run lint -- src/app/'(app)'/risk/register/page.tsx src/app/'(app)'/risk/components/monitoring-transactions-table.tsx src/lib/api/risk-register.ts src/lib/risk-register-monitoring.ts
npm run build
```

Expected: PASS on all commands.

- [ ] **Step 2: Manual smoke check in the browser**

Run the frontend dev server and verify:

```bash
cd frontend
npm run dev
```

Manual checklist:

- Open `/risk/register?tab=monitoring-transactions`
- Confirm the `Pemantauan` tab is selectable and stays reflected in the URL
- Confirm the table header matches `All Risks` plus `Nilai Sebelum` and `Nilai Hasil Pemantauan`
- Confirm `assessment_draft` rows open `/risk/assessment/:id`
- Confirm `approved` rows open `/risk/register/:id`
- Confirm the existing `All Risks`, `Draf`, and `Version History` tabs still work

- [ ] **Step 3: Final commit if verification caused fixes**

If any verification fixups were needed:

```bash
git add backend/internal/domain/entity/risk.go \
  backend/internal/repository/postgres/risk.go \
  backend/internal/repository/postgres/risk_register_test.go \
  backend/internal/handler/http/risk_register_test.go \
  frontend/src/lib/api/risk-register.ts \
  frontend/src/lib/risk-register-monitoring.ts \
  frontend/src/lib/risk-register-monitoring.test.ts \
  frontend/src/app/'(app)'/risk/components/monitoring-transactions-table.tsx \
  frontend/src/app/'(app)'/risk/register/page.tsx
git commit -m "test: verify monitoring transactions register flow"
```

---

## Self-Review Notes

- Spec coverage: this plan covers the new `Pemantauan` tab, table shape parity with `All Risks`, extra before/after score columns, and API field-name cleanup.
- Placeholder scan: no `TODO` / `TBD` placeholders left in tasks.
- Type consistency: the plan consistently uses `beforeMonitoringNilai` and `monitoringResultNilai` from backend entity through frontend type and UI rendering.

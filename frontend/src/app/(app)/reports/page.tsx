"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, API_BASE } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  listOrganizationGroups,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
} from "@/lib/report-scope";
import {
  copyReportsFilterScope,
  resolveDefaultReportsFilterScope,
  type ReportsFilterScope,
} from "@/lib/reports-filter-sheet";
import {
  completedReportCycle,
  currentReportCycle,
  shiftReportCycle,
  formatReportDate,
} from "@/lib/quarterly-report";
import type { QuarterlyReport } from "@/types/quarterly-report";
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import { QuarterlyReportDashboard } from "@/components/report/quarterly-report-dashboard";
import {
  CollectionPageHeader,
  CollectionToolbar,
  CollectionFilterPopover,
  ReportEmptyState,
  DashboardKpiCard,
} from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EMPTY_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};
const titles = [
  "Risiko di atas selera risiko",
  "Target tercapai",
  "Mitigasi terlapor",
  "Pemantauan final",
];
function PeriodPicker({
  label,
  cycle,
  onChange,
  comparison = false,
}: {
  label: string;
  cycle: string;
  onChange: (cycle: string) => void;
  comparison?: boolean;
}) {
  const current = currentReportCycle();
  const currentYear = Number(current.slice(0, 4));
  const [year, quarter] = cycle.split("-Q");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select
        value={year}
        onValueChange={(value) =>
          onChange(
            `${value}-Q${value === String(currentYear) && Number(quarter) > Number(current.slice(-1)) ? current.slice(-1) : quarter}`,
          )
        }
      >
        <SelectTrigger aria-label={`Tahun ${label.toLowerCase()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: currentYear - 1999 }, (_, i) =>
            String(currentYear - i),
          ).map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={quarter}
        onValueChange={(value) => onChange(`${year}-Q${value}`)}
      >
        <SelectTrigger aria-label={`Kuartal ${label.toLowerCase()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4].map((value) => (
            <SelectItem
              key={value}
              value={String(value)}
              disabled={
                Number(year) === currentYear &&
                value > Number(current.slice(-1))
              }
            >
              Q{value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {comparison && (
        <Button size="sm" variant="ghost" onClick={() => onChange("")}>
          Sebelumnya
        </Button>
      )}
    </div>
  );
}
function LoadingReport() {
  return (
    <div className="space-y-6" aria-label="Memuat laporan" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {titles.map((title) => (
          <DashboardKpiCard
            key={title}
            title={title}
            value="—"
            detail="Memuat data..."
            loading
          />
        ))}
      </div>
      {[
        "Perubahan risiko dan pencapaian target",
        "Pelaporan mitigasi",
        "Kejadian dan dampak aktual",
        "Perbandingan unit",
        "Risiko yang perlu ditindaklanjuti",
      ].map((title) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [cycle, setCycle] = useState(completedReportCycle);
  const [comparisonOverride, setComparisonOverride] = useState("");
  const comparisonCycle = comparisonOverride || shiftReportCycle(cycle, -1);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [groups, setGroups] = useState<OrganizationGroupListItem[]>([]);
  const [scope, setScope] = useState<ReportsFilterScope>(EMPTY_SCOPE);
  const [draft, setDraft] = useState<ReportsFilterScope>(EMPTY_SCOPE);
  const [filterOpen, setFilterOpen] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [reportData, setReport] = useState<QuarterlyReport | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const needsSelection =
    needsExplicitReportOrgSelection(user) && scope.organizationIds.length === 0;

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    setMetadataReady(false);
    setMetadataError(null);
    setReport(null);
    const fetchGroups = async () => {
      const result: OrganizationGroupListItem[] = [];
      for (let page = 1; ; page++) {
        const response = await listOrganizationGroups(token, {
          ownerOrganizationId: user.isGlobal
            ? undefined
            : (user.organizationId ?? undefined),
          includeMembers: true,
          limit: 100,
          page,
        });
        result.push(...response.data);
        if (!response.data.length || result.length >= response.total)
          return result;
      }
    };
    Promise.all([listAllOrganizations(token), fetchGroups()])
      .then(([items, allGroups]) => {
        if (cancelled) return;
        const allowed = buildSelectableReportOrganizations(user, items);
        setOrganizations(allowed);
        setGroups(buildSelectableReportOrganizationGroups(user, allGroups));
        const initial = resolveDefaultReportsFilterScope(user, allowed);
        setScope(initial);
        setDraft(copyReportsFilterScope(initial));
        setMetadataReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMetadataError(
            error instanceof Error
              ? error.message
              : "Gagal memuat scope organisasi.",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, metadataRetry]);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      cycle,
      compare_cycle: comparisonCycle,
    });
    if (scope.organizationIds.length)
      params.set("org_id", scope.organizationIds.join(","));
    return params.toString();
  }, [cycle, comparisonCycle, scope.organizationIds]);
  const report = loadedQuery === query ? reportData : null;
  useEffect(() => {
    if (!token || !metadataReady || needsSelection) {
      setReport(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setReportError(null);
    setReport(null);
    api
      .get<QuarterlyReport>(`/reports/quarterly?${query}`, token)
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setLoadedQuery(query);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setReportError(
            error instanceof Error ? error.message : "Gagal memuat laporan.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, metadataReady, needsSelection, query, retry]);

  async function exportReport(format: "xlsx" | "pdf") {
    if (!report || !token || exporting) return;
    const snapshot = report;
    setExporting(format);
    try {
      let blob: Blob;
      if (format === "xlsx") {
        const { createQuarterlyReportWorkbook } =
          await import("@/lib/quarterly-report-export");
        const workbook = await createQuarterlyReportWorkbook(snapshot);
        const bytes = await workbook.xlsx.writeBuffer();
        blob = new Blob([new Uint8Array(bytes)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        const pdfQuery = new URLSearchParams(query);
        pdfQuery.set("expected_updated_at", snapshot.dataUpdatedAt || "none");
        if (snapshot.snapshotHash) pdfQuery.set("expected_snapshot_hash", snapshot.snapshotHash);
        const response = await fetch(
          `${API_BASE}/reports/quarterly-pdf?${pdfQuery}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          const problem = await response.json().catch(() => ({}));
          throw new Error(problem.detail || "Gagal membuat PDF laporan.");
        }
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-${snapshot.cycle}-vs-${snapshot.comparisonCycle}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Laporan ${format.toUpperCase()} berhasil diunduh`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Gagal mengekspor laporan.",
      );
    } finally {
      setExporting(null);
    }
  }
  const activeScope = scope.organizationIds.length
    ? `${scope.organizationIds.length} unit dipilih`
    : "Semua unit yang dapat diakses";
  return (
    <div className="w-full min-w-0 space-y-6">
      <CollectionPageHeader
        title="Laporan"
        showTitle
        subtitle="Evaluasi perubahan risiko, pencapaian target, dan kelengkapan pelaporan per kuartal."
      />
      <CollectionToolbar
        leading={
          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker label="Periode" cycle={cycle} onChange={setCycle} />
            <PeriodPicker
              label="Pembanding"
              cycle={comparisonCycle}
              comparison
              onChange={setComparisonOverride}
            />
            <CollectionFilterPopover
              open={filterOpen}
              onOpenChange={(open) => {
                setFilterOpen(open);
                if (open) setDraft(copyReportsFilterScope(scope));
              }}
              triggerProps={{
                "aria-label": "Buka filter laporan",
                disabled: !metadataReady || Boolean(exporting),
              }}
              footer={
                <div className="flex justify-between gap-2">
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setDraft(
                        resolveDefaultReportsFilterScope(user, organizations),
                      )
                    }
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={() => {
                      setScope(copyReportsFilterScope(draft));
                      setFilterOpen(false);
                    }}
                    disabled={
                      Boolean(draft.organizationGroupId) &&
                      !draft.organizationIds.length
                    }
                  >
                    Terapkan
                  </Button>
                </div>
              }
            >
              <h2 className="text-sm font-medium">Filter laporan</h2>
              <ReportScopePicker
                organizationId={draft.organizationId}
                onOrganizationChange={(organizationId) =>
                  setDraft((value) => ({ ...value, organizationId }))
                }
                selectedOrganizationIds={draft.organizationIds}
                onSelectedOrganizationIdsChange={(organizationIds) =>
                  setDraft((value) => ({ ...value, organizationIds }))
                }
                organizations={organizations}
                organizationGroupId={draft.organizationGroupId}
                onOrganizationGroupChange={(organizationGroupId) =>
                  setDraft((value) => ({ ...value, organizationGroupId }))
                }
                organizationGroups={groups}
                orientation="vertical"
                density="compact"
              />
              {!draft.organizationIds.length && (
                <p className="text-xs text-muted-foreground">
                  {draft.organizationGroupId
                    ? "Pilih sedikitnya satu unit dalam grup."
                    : "Tanpa pilihan unit, laporan mencakup semua unit yang dapat diakses."}
                </p>
              )}
            </CollectionFilterPopover>
          </div>
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!report || loading || Boolean(exporting)}
              >
                {exporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Ekspor
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void exportReport("pdf")}>
                <FileText />
                Ringkasan dan analisis (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void exportReport("xlsx")}>
                <FileSpreadsheet />
                Laporan lengkap · 5 sheet (Excel)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>{activeScope}</span>
        {cycle === currentReportCycle() && (
          <Badge variant="outline">Periode berjalan</Badge>
        )}
        {report && (
          <>
            <span>
              Data diperbarui: {formatReportDate(report.dataUpdatedAt)}
            </span>
            <span>Dimuat: {formatReportDate(report.generatedAt)} WIB</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRetry((value) => value + 1)}
            >
              Perbarui
            </Button>
          </>
        )}
      </div>
      {metadataError ? (
        <Alert variant="destructive">
          <AlertTitle>Scope organisasi gagal dimuat</AlertTitle>
          <AlertDescription>
            <p>{metadataError}</p>
            <Button
              variant="outline"
              onClick={() => setMetadataRetry((value) => value + 1)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      ) : needsSelection && metadataReady ? (
        <ReportEmptyState
          title="Pilih unit laporan"
          description="Pilih satu atau beberapa unit yang dapat diakses melalui filter laporan."
        />
      ) : reportError ? (
        <Alert variant="destructive">
          <AlertTitle>Laporan gagal dimuat</AlertTitle>
          <AlertDescription>
            <p>{reportError}</p>
            <Button
              variant="outline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading || !metadataReady ? (
        <LoadingReport />
      ) : report ? (
        <>
          {report.warnings.length > 0 && (
            <Alert>
              <AlertTitle>Keterbatasan riwayat data</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {report.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <QuarterlyReportDashboard
            key={`${report.cycle}:${report.comparisonCycle}:${report.organizations.map((unit) => unit.id).join(",")}`}
            report={report}
          />
        </>
      ) : null}
    </div>
  );
}

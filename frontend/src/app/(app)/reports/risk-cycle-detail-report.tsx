"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, FileDiff, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { exportRiskCycleDetailCSV, exportRiskCycleDetailXLSX } from "@/lib/risk-cycle-detail-export";
import { cn } from "@/lib/utils";
import type {
  RiskCycleDetailedComparisonItem,
  RiskCycleDetailedComparisonReport,
  RiskFieldDiff,
  RiskMitigationDiff,
} from "@/types/risk";

type OrganizationOption = {
  id: string;
  name: string;
};

function dedupeOrganizations(items: OrganizationOption[]) {
  const seen = new Set<string>();
  const result: OrganizationOption[] = [];

  for (const item of items) {
    const id = item.id?.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    result.push({ ...item, id });
  }

  return result;
}

type FilterTab = "all" | "changed" | "added" | "removed" | "stable";
type MovementFilter = "new" | "up" | "down" | "stable" | "removed";

const tabOptions: Array<{ value: FilterTab; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "changed", label: "Changed" },
  { value: "added", label: "Added" },
  { value: "removed", label: "Removed" },
  { value: "stable", label: "Stable" },
];

const categoryMeta: Record<string, { label: string; className: string; icon: typeof ChevronRight }> = {
  changed: { label: "Changed", className: "border-primary/20 bg-primary/10 text-primary", icon: ChevronRight },
  added: { label: "Added", className: "border-success/20 bg-success/10 text-success", icon: Plus },
  removed: { label: "Removed", className: "border-destructive/20 bg-destructive/10 text-destructive", icon: Trash2 },
  stable: { label: "Stable", className: "border-border bg-muted/40 text-muted-foreground", icon: Minus },
};

const changeTypeMeta: Record<string, string> = {
  modified: "border-primary/20 bg-primary/10 text-primary",
  added: "border-success/20 bg-success/10 text-success",
  removed: "border-destructive/20 bg-destructive/10 text-destructive",
};

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function previousGlobalCycle(cycle: string) {
  const [yearPart, half] = cycle.split("-");
  const year = Number(yearPart);
  if (half === "H1") return `${year - 1}-H2`;
  return `${year}-H1`;
}

function buildCycleOptions() {
  const currentYear = new Date().getFullYear();
  const result: string[] = [];
  for (let year = currentYear + 1; year >= currentYear - 3; year -= 1) {
    result.push(`${year}-H2`, `${year}-H1`);
  }
  return result;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "-";
  }
  if (typeof value === "number") return Number.isFinite(value) ? value.toString() : "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function fieldDiffLabel(item: RiskCycleDetailedComparisonItem) {
  const fieldDiffs = Array.isArray(item.fieldDiffs) ? item.fieldDiffs : [];
  const mitigationDiffs = Array.isArray(item.mitigationDiffs) ? item.mitigationDiffs : [];
  return `${fieldDiffs.length} kolom, ${mitigationDiffs.length} perubahan mitigasi`;
}

function normalizeReportItem(item: RiskCycleDetailedComparisonItem): RiskCycleDetailedComparisonItem {
  return {
    ...item,
    fromSnapshot: item.fromSnapshot
      ? {
          ...item.fromSnapshot,
          cause: Array.isArray(item.fromSnapshot.cause) ? item.fromSnapshot.cause : [],
          mitigations: Array.isArray(item.fromSnapshot.mitigations) ? item.fromSnapshot.mitigations : [],
        }
      : undefined,
    toSnapshot: item.toSnapshot
      ? {
          ...item.toSnapshot,
          cause: Array.isArray(item.toSnapshot.cause) ? item.toSnapshot.cause : [],
          mitigations: Array.isArray(item.toSnapshot.mitigations) ? item.toSnapshot.mitigations : [],
        }
      : undefined,
    fieldDiffs: Array.isArray(item.fieldDiffs) ? item.fieldDiffs : [],
    mitigationDiffs: Array.isArray(item.mitigationDiffs)
      ? item.mitigationDiffs.map((diff) => ({
          ...diff,
          fieldDiffs: Array.isArray(diff.fieldDiffs) ? diff.fieldDiffs : [],
        }))
      : [],
  };
}

function buildFilteredSummary(report: RiskCycleDetailedComparisonReport, items: RiskCycleDetailedComparisonItem[]) {
  const summary = {
    ...report.summary,
    changedCount: 0,
    addedCount: 0,
    removedCount: 0,
    stableCount: 0,
  };

  for (const item of items) {
    if (item.changeCategory === "changed") summary.changedCount += 1;
    else if (item.changeCategory === "added") summary.addedCount += 1;
    else if (item.changeCategory === "removed") summary.removedCount += 1;
    else if (item.changeCategory === "stable") summary.stableCount += 1;
  }

  return summary;
}

function deriveMovementFromDetailItem(item: RiskCycleDetailedComparisonItem): MovementFilter | null {
  if (item.changeCategory === "added") return "new";
  if (item.changeCategory === "removed") return "removed";
  if (item.changeCategory === "stable") return "stable";
  if (item.changeCategory !== "changed") return null;

  const beforeScore = item.fromSnapshot?.inherentScore ?? ((item.fromSnapshot?.probability ?? 0) * (item.fromSnapshot?.impact ?? 0));
  const afterScore = item.toSnapshot?.inherentScore ?? ((item.toSnapshot?.probability ?? 0) * (item.toSnapshot?.impact ?? 0));

  if (afterScore > beforeScore) return "up";
  if (afterScore < beforeScore) return "down";
  return "stable";
}

function FieldDiffTable({ diffs }: { diffs: RiskFieldDiff[] }) {
  if (diffs.length === 0) {
    return <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Tidak ada perubahan kolom.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-36">Kolom</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead>Sebelum</TableHead>
            <TableHead>Sesudah</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {diffs.map((diff) => (
            <TableRow key={`${diff.field}-${diff.changeType}`}>
              <TableCell>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{diff.label}</p>
                  <p className="text-xs text-muted-foreground">{diff.field}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("font-normal", changeTypeMeta[diff.changeType] || "border-border text-foreground")}>
                  {diff.changeType}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatValue(diff.before)}</TableCell>
              <TableCell className="text-sm text-foreground">{formatValue(diff.after)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MitigationDiffTable({ diffs }: { diffs: RiskMitigationDiff[] }) {
  if (diffs.length === 0) {
    return <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">Tidak ada perubahan mitigasi.</div>;
  }

  return (
    <div className="space-y-3">
      {diffs.map((diff) => (
        <div key={`${diff.rowKey}-${diff.changeType}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("font-normal", changeTypeMeta[diff.changeType] || "border-border text-foreground")}>
              {diff.changeType}
            </Badge>
            <span className="text-sm font-medium text-foreground">Mitigasi #{diff.rowKey}</span>
            {(diff.afterLabel || diff.beforeLabel) ? (
              <span className="text-xs text-muted-foreground">{diff.beforeLabel || diff.afterLabel}</span>
            ) : null}
          </div>
          <FieldDiffTable diffs={diff.fieldDiffs} />
        </div>
      ))}
    </div>
  );
}

type RiskCycleDetailReportProps = {
  fromCycle?: string;
  toCycle?: string;
  externalOrgName?: string | null;
  externalMovement?: MovementFilter | null;
};

export function RiskCycleDetailReport({
  fromCycle: controlledFromCycle,
  toCycle: controlledToCycle,
  externalOrgName,
  externalMovement,
}: RiskCycleDetailReportProps) {
  const { token } = useAuth();
  const cycleOptions = useMemo(() => buildCycleOptions(), []);
  const defaultToCycle = useMemo(() => currentGlobalCycle(), []);
  const defaultFromCycle = useMemo(() => previousGlobalCycle(defaultToCycle), [defaultToCycle]);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [fromCycle, setFromCycle] = useState(defaultFromCycle);
  const [toCycle, setToCycle] = useState(defaultToCycle);
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [includeStable, setIncludeStable] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("changed");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<RiskCycleDetailedComparisonReport | null>(null);

  useEffect(() => {
    if (controlledFromCycle) setFromCycle(controlledFromCycle);
  }, [controlledFromCycle]);

  useEffect(() => {
    if (controlledToCycle) setToCycle(controlledToCycle);
  }, [controlledToCycle]);

  useEffect(() => {
    if (externalMovement === "stable") {
      setIncludeStable(true);
      setActiveTab("stable");
      return;
    }
    if (externalMovement === "new") {
      setActiveTab("added");
      return;
    }
    if (externalMovement === "removed") {
      setActiveTab("removed");
      return;
    }
    if (externalMovement === "up" || externalMovement === "down") {
      setActiveTab("changed");
      return;
    }
    setActiveTab("changed");
  }, [externalMovement]);

  useEffect(() => {
    if (!token) return;

    const loadOrganizations = async () => {
      try {
        const data = await api.get<OrganizationOption[]>("/organizations", token);
        setOrganizations(dedupeOrganizations(data));
      } catch (error) {
        console.error(error);
      }
    };

    loadOrganizations();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (fromCycle === toCycle) {
      setLoading(false);
      setReport(null);
      return;
    }

    const loadReport = async () => {
      setLoading(true);
      setReport(null);
      setExpandedRows({});
      try {
        const params = new URLSearchParams({
          from: fromCycle,
          to: toCycle,
          include_stable: includeStable ? "true" : "false",
        });
        if (orgFilter !== "all") params.set("org_id", orgFilter);
        const data = await api.get<RiskCycleDetailedComparisonReport>(`/risks/compare/detail?${params.toString()}`, token);
        setReport({
          ...data,
          items: Array.isArray(data.items) ? data.items.map(normalizeReportItem) : [],
        });
      } catch (error) {
        console.error(error);
        setReport(null);
        toast.error(error instanceof Error ? error.message : "Report perubahan risiko belum berhasil dimuat.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [token, fromCycle, toCycle, orgFilter, includeStable]);

  const filteredItems = useMemo(() => {
    const items = report?.items ?? [];
    let nextItems = activeTab === "all" ? items : items.filter((item) => item.changeCategory === activeTab);

    if (externalOrgName) {
      nextItems = nextItems.filter((item) => item.orgName === externalOrgName);
    }

    if (externalMovement) {
      nextItems = nextItems.filter((item) => deriveMovementFromDetailItem(item) === externalMovement);
    }

    return nextItems;
  }, [report, activeTab, externalOrgName, externalMovement]);

  const exportReport = useMemo(() => {
    if (!report) return null;
    return {
      ...report,
      summary: buildFilteredSummary(report, filteredItems),
      items: filteredItems,
    };
  }, [report, filteredItems]);

  const toggleExpanded = (rowKey: string) => {
    setExpandedRows((current) => ({ ...current, [rowKey]: !current[rowKey] }));
  };

  const handleExportCSV = () => {
    if (!exportReport) {
      toast.error("Belum ada data report untuk diexport.");
      return;
    }
    exportRiskCycleDetailCSV(exportReport);
  };

  const handleExportXLSX = async () => {
    if (!exportReport) {
      toast.error("Belum ada data report untuk diexport.");
      return;
    }
    await exportRiskCycleDetailXLSX(exportReport);
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <FileDiff className="size-4" />
              Report Perubahan Risiko Antar Periode
            </CardTitle>
            <p className="text-sm text-muted-foreground">Bandingkan snapshot risiko approved antar dua cycle sampai ke level kolom dan mitigasi.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleExportCSV} disabled={!exportReport || filteredItems.length === 0 || loading}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleExportXLSX} disabled={!exportReport || filteredItems.length === 0 || loading}>
              <Download className="size-3.5" /> XLSX
            </Button>
            {tabOptions.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                size="sm"
                variant={activeTab === tab.value ? "default" : "outline"}
                className="h-8 text-xs"
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Select value={fromCycle} onValueChange={setFromCycle}>
            <SelectTrigger>
              <SelectValue placeholder="Periode awal" />
            </SelectTrigger>
            <SelectContent>
              {cycleOptions.map((cycle) => (
                <SelectItem key={`from-${cycle}`} value={cycle}>{cycle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={toCycle} onValueChange={setToCycle}>
            <SelectTrigger>
              <SelectValue placeholder="Periode akhir" />
            </SelectTrigger>
            <SelectContent>
              {cycleOptions.map((cycle) => (
                <SelectItem key={`to-${cycle}`} value={cycle}>{cycle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={orgFilter} onValueChange={setOrgFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua unit</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={includeStable ? "show" : "hide"} onValueChange={(value) => setIncludeStable(value === "show")}>
            <SelectTrigger>
              <SelectValue placeholder="Stable rows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hide">Sembunyikan stable</SelectItem>
              <SelectItem value="show">Tampilkan stable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(externalOrgName || externalMovement) ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Filter drilldown aktif:</span>
            {externalOrgName ? <Badge variant="outline">Unit: {externalOrgName}</Badge> : null}
            {externalMovement ? <Badge variant="outline">Movement: {externalMovement}</Badge> : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {fromCycle === toCycle ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">Periode awal dan akhir harus berbeda.</div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Changed", value: report?.summary.changedCount ?? 0, className: "border-primary/20 bg-primary/10 text-primary" },
            { label: "Added", value: report?.summary.addedCount ?? 0, className: "border-success/20 bg-success/10 text-success" },
            { label: "Removed", value: report?.summary.removedCount ?? 0, className: "border-destructive/20 bg-destructive/10 text-destructive" },
            { label: "Stable", value: report?.summary.stableCount ?? 0, className: "border-border bg-muted/40 text-foreground" },
          ].map((item) => (
            <div key={item.label} className={cn("rounded-lg border p-4", item.className)}>
              <p className="text-xs uppercase tracking-wider opacity-80">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Memuat report perubahan risiko...</div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-xs text-muted-foreground">
              Snapshot awal: <span className="font-semibold text-foreground">{report?.summary.totalFrom ?? 0}</span> risiko.
              Snapshot akhir: <span className="ml-1 font-semibold text-foreground">{report?.summary.totalTo ?? 0}</span> risiko.
              Menampilkan: <span className="ml-1 font-semibold text-foreground">{filteredItems.length}</span> baris.
            </div>

            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14" />
                    <TableHead className="w-24">Kode</TableHead>
                    <TableHead>Risiko</TableHead>
                    <TableHead className="w-40">Unit</TableHead>
                    <TableHead className="w-28 text-center">Status</TableHead>
                    <TableHead className="w-36 text-center">Perubahan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">Tidak ada data untuk filter report ini.</TableCell>
                    </TableRow>
                  ) : filteredItems.map((item) => {
                    const meta = categoryMeta[item.changeCategory] || categoryMeta.changed;
                    const Icon = meta.icon;
                    const isExpanded = expandedRows[item.versionGroupId];
                    return (
                      <Fragment key={item.versionGroupId}>
                        <TableRow key={item.versionGroupId}>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => toggleExpanded(item.versionGroupId)}>
                              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.code || "-"}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{item.title || "-"}</p>
                              <p className="text-xs text-muted-foreground">{item.changeReason || item.reviewSummary || fieldDiffLabel(item)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.orgName || "-"}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={cn("gap-1 font-normal", meta.className)}>
                              <Icon className="size-3" /> {meta.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{fieldDiffLabel(item)}</TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow className="bg-muted/10">
                            <TableCell colSpan={6}>
                              <div className="space-y-4 py-3">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="rounded-lg border border-border/60 bg-card p-3 text-sm">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Periode</p>
                                    <p className="mt-1 font-medium text-foreground">{item.fromCycle} ke {item.toCycle}</p>
                                  </div>
                                  <div className="rounded-lg border border-border/60 bg-card p-3 text-sm">
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Versi Risiko</p>
                                    <p className="mt-1 text-foreground">From: {item.fromRiskId || "-"}</p>
                                    <p className="text-foreground">To: {item.toRiskId || "-"}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-foreground">Perubahan Kolom</p>
                                  <FieldDiffTable diffs={item.fieldDiffs} />
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm font-semibold text-foreground">Perubahan Mitigasi</p>
                                  <MitigationDiffTable diffs={item.mitigationDiffs} />
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

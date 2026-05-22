"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { listTMPMRAssessments } from "@/lib/api/tmpmr";
import type { TMPMRAssessment, TMPMRStatus } from "@/types/tmpmr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

const statusLabel: Record<TMPMRStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  approved: "Approved",
};

const statusStyles: Record<TMPMRStatus, string> = {
  draft: "border-border/60 bg-muted/40 text-muted-foreground",
  submitted: "border-primary/20 bg-primary/5 text-primary",
  reviewed: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const maturityStyles = [
  { match: "Awal", className: "border-border/60 bg-muted/40 text-muted-foreground" },
  { match: "Berkembang", className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { match: "Terdefinisi", className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  { match: "Terkelola", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { match: "Optimum", className: "border-primary/20 bg-primary/5 text-primary" },
];

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getMaturityClass(maturityLevel: string) {
  return maturityStyles.find((item) => maturityLevel.includes(item.match))?.className ??
    "border-border/60 bg-muted/40 text-muted-foreground";
}

function getFilteredPeriods(items: TMPMRAssessment[]) {
  return [...new Set(items.map((item) => item.period).filter(Boolean))]
    .sort()
    .reverse();
}

export default function TMPMRListPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<TMPMRAssessment[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TMPMRStatus | "all">("all");
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const [response, orgs] = await Promise.all([
        listTMPMRAssessments(token, { page: 1, limit: 100 }),
        listAllOrganizations(token),
      ]);

      setItems(response.data ?? []);
      setOrganizations(orgs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat TMPMR.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const organizationMap = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization.name])),
    [organizations],
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (periodFilter !== "all" && item.period !== periodFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      if (!query) return true;

      const orgName = organizationMap.get(item.organizationId)?.toLowerCase() ?? "";
      return [
        orgName,
        item.period.toLowerCase(),
        statusLabel[item.status].toLowerCase(),
        item.maturityLevel.toLowerCase(),
        item.score.toFixed(2),
      ].some((value) => value.includes(query));
    });
  }, [items, organizationMap, periodFilter, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredItems, page],
  );

  const availablePeriods = useMemo(() => getFilteredPeriods(items), [items]);

  useEffect(() => {
    setPage(1);
  }, [search, periodFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const hasActiveFilters = search !== "" || periodFilter !== "all" || statusFilter !== "all";

  const summary = useMemo(
    () => ({
      total: items.length,
      draft: items.filter((item) => item.status === "draft").length,
      submitted: items.filter((item) => item.status === "submitted").length,
      reviewed: items.filter((item) => item.status === "reviewed").length,
      approved: items.filter((item) => item.status === "approved").length,
    }),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Risk Governance
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">TMPMR</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Kelola penilaian maturitas manajemen risiko per organisasi dan periode, lalu lanjutkan alurnya dari draft hingga approval.
            </p>
          </div>
        </div>

        <Button asChild className="gap-2">
          <Link href="/management/tmpmr/new">
            <Plus className="size-4" />
            Buat Assessment
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Assessment", value: summary.total, tone: "white" as const },
          { label: "Draft", value: summary.draft, tone: "zinc" as const },
          { label: "Submitted", value: summary.submitted, tone: "zinc" as const },
          { label: "Approved", value: summary.approved, tone: "emerald" as const },
        ].map((item) => (
          <KpiCard
            key={item.label}
            label={item.label}
            value={item.value}
            tone={item.tone}
            icon={<ClipboardList className="size-5 text-muted-foreground" />}
          />
        ))}
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-[15px] font-semibold">Daftar TMPMR</CardTitle>
              <p className="text-xs text-muted-foreground">
                Filter berdasarkan periode dan status, lalu buka detail untuk mengisi skor, evidence, dan review.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={loadData}>
              <RefreshCw className="size-4" />
              Muat Ulang
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
            <div className="space-y-2">
              <label htmlFor="tmpmr-search" className="text-sm font-medium">
                Cari assessment
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="tmpmr-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari organisasi, skor, maturity level, atau periode"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tmpmr-period" className="text-sm font-medium">
                Periode
              </label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger id="tmpmr-period">
                  <SelectValue placeholder="Semua periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua periode</SelectItem>
                  {availablePeriods.map((period) => (
                    <SelectItem key={period} value={period}>
                      {period}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="tmpmr-status" className="text-sm font-medium">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as TMPMRStatus | "all")}
              >
                <SelectTrigger id="tmpmr-status">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              {filteredItems.length} hasil
            </Badge>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setSearch("");
                  setPeriodFilter("all");
                  setStatusFilter("all");
                }}
              >
                Reset filter
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Memuat daftar TMPMR...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Periode</TableHead>
                    <TableHead className="whitespace-nowrap">Organisasi</TableHead>
                    <TableHead className="whitespace-nowrap">Skor</TableHead>
                    <TableHead className="whitespace-nowrap">Maturity</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="whitespace-nowrap">Diperbarui</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                        Belum ada assessment yang cocok dengan filter ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((item) => {
                      const orgName =
                        organizationMap.get(item.organizationId) ?? item.organizationId;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="whitespace-nowrap font-medium">{item.period}</TableCell>
                          <TableCell className="max-w-[240px] truncate">{orgName}</TableCell>
                          <TableCell className="whitespace-nowrap font-medium">
                            {item.score.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("whitespace-nowrap", getMaturityClass(item.maturityLevel))}>
                              {item.maturityLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("whitespace-nowrap", statusStyles[item.status])}>
                              {statusLabel[item.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDateTime(item.updatedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="ghost" size="sm" className="gap-1.5">
                              <Link href={`/management/tmpmr/${item.id}`}>
                                Buka
                                <ArrowUpRight className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-sm">
                <p className="text-muted-foreground">
                  Menampilkan {filteredItems.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
                  {" "}
                  hingga {Math.min(page * PAGE_SIZE, filteredItems.length)} dari {filteredItems.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    Sebelumnya
                  </Button>
                  <Badge variant="outline" className="h-8 px-3">
                    {page} / {totalPages}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  FilePlus2,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { downloadEvaluationPdf, listEvaluations } from "@/lib/api/evaluations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrganizationPicker } from "@/components/report/organization-picker";
import {
  buildSelectableReportOrganizations,
  needsExplicitReportOrgSelection,
  resolveDefaultReportOrgId,
} from "@/lib/report-scope";
import {
  evaluationStatusLabel,
  filterEvaluations,
} from "@/lib/evaluations";
import type { Evaluation, EvaluationStatus } from "@/types/evaluation";

function currentGlobalCycle() {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${year}-${half}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const statusStyles: Record<EvaluationStatus, string> = {
  draft: "border-border/60 bg-muted/40 text-muted-foreground",
  final: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export default function EvaluationsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [organizationId, setOrganizationId] = useState("all");
  const [period, setPeriod] = useState(currentGlobalCycle());
  const [status, setStatus] = useState<EvaluationStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const requiresOrganizationSelection = needsExplicitReportOrgSelection(user);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!token) {
      setOrganizations([]);
      return;
    }

    listAllOrganizations(token)
      .then((items) => {
        setOrganizations(buildSelectableReportOrganizations(user, items));
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar organisasi.");
      });
  }, [token, user]);

  useEffect(() => {
    if (!organizations.length) return;
    if (organizationId !== "all") return;

    const defaultOrgId = resolveDefaultReportOrgId(user);
    setOrganizationId(
      defaultOrgId && organizations.some((org) => org.id === defaultOrgId)
        ? defaultOrgId
        : requiresOrganizationSelection
          ? "all"
          : organizations[0].id,
    );
  }, [organizationId, organizations, requiresOrganizationSelection, user]);

  useEffect(() => {
    if (!token) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listEvaluations(token, {
      organizationId: organizationId !== "all" ? organizationId : undefined,
      period: period.trim() || undefined,
      status: status !== "all" ? status : undefined,
      query: debouncedQuery.trim() || undefined,
      page,
      limit,
    })
      .then((response) => {
        setEvaluations(response.data ?? []);
        setTotal(response.total ?? 0);
        setPage(response.page ?? page);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat daftar evaluasi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, organizationId, period, status, debouncedQuery, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [organizationId, period, status, debouncedQuery]);

  const visibleEvaluations = useMemo(
    () =>
      filterEvaluations(evaluations, {
        search: debouncedQuery,
        status,
        period,
        organizationId: organizationId === "all" ? undefined : organizationId,
      }),
    [evaluations, debouncedQuery, status, period, organizationId],
  );

  const organizationNameById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleDownload = async (evaluation: Evaluation) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setDownloadingId(evaluation.id);
    try {
      await downloadEvaluationPdf(token, evaluation.id, `evaluasi-mr-${evaluation.period}.pdf`);
      toast.success("PDF evaluasi sedang diunduh.");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal mengunduh PDF evaluasi.",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>Evaluasi</span>
            <span className="h-px w-6 bg-border" />
            <span>MR</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Evaluasi Monitoring & Evaluasi MR
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Buat, isi, finalisasi, dan unduh laporan evaluasi per organisasi dan
            periode dari satu halaman kerja.
          </p>
        </div>
        <Button asChild className="gap-2 self-start">
          <Link href="/evaluations/new">
            <FilePlus2 className="size-4" />
            Buat Evaluasi
          </Link>
        </Button>
      </section>

      <Card className="border-border/50 bg-card/90 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-sm font-semibold">Filter Evaluasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_180px_180px_240px]">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Organisasi</div>
              <OrganizationPicker
                value={organizationId}
                organizations={organizations}
                onChange={setOrganizationId}
                allowAllOption
                allOptionLabel="Semua organisasi"
                allOptionValue="all"
                placeholder="Pilih organisasi"
                searchPlaceholder="Cari organisasi..."
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Periode</div>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Status</div>
              <Select value={status} onValueChange={(value) => setStatus(value as EvaluationStatus | "all")}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Pencarian</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari evaluasi..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/90 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold">Daftar Evaluasi</CardTitle>
              <p className="text-xs text-muted-foreground">
                {loading ? "Memuat data evaluasi..." : `${total} evaluasi ditemukan`}
              </p>
            </div>
            <Badge variant="outline" className="gap-1.5 border-primary/20 bg-primary/[0.06] text-[10px] text-primary">
              <Download className="size-3.5" />
              PDF
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="whitespace-nowrap">Periode</TableHead>
                <TableHead className="whitespace-nowrap">Organisasi</TableHead>
                <TableHead className="whitespace-nowrap">Template</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Diperbarui</TableHead>
                <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <Loader2 className="mx-auto mb-2 size-4 animate-spin" />
                    Memuat evaluasi...
                  </TableCell>
                </TableRow>
              ) : visibleEvaluations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Belum ada evaluasi untuk filter yang dipilih.
                  </TableCell>
                </TableRow>
              ) : (
                visibleEvaluations.map((evaluation) => {
                  const orgName =
                    organizationNameById.get(evaluation.organizationId) ??
                    evaluation.organizationId;
                  const isDownloading = downloadingId === evaluation.id;

                  return (
                    <TableRow key={evaluation.id} className="transition-colors hover:bg-muted/25">
                      <TableCell className="whitespace-nowrap font-medium">
                        {evaluation.period}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">{orgName}</TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {evaluation.templateName || evaluation.templateId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[evaluation.status]}>
                          {evaluationStatusLabel[evaluation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(evaluation.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="sm" asChild className="gap-1.5">
                            <Link href={`/evaluations/${evaluation.id}`}>
                              Buka
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            disabled={isDownloading}
                            onClick={() => void handleDownload(evaluation)}
                          >
                            {isDownloading ? (
                              <>
                                Mengunduh
                                <Loader2 className="size-4 animate-spin" />
                              </>
                            ) : (
                              <>
                                PDF
                                <Download className="size-4" />
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Halaman {page} dari {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            Sebelumnya
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}

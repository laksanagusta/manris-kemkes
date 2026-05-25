"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Download,
  FilePlus2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  createEvaluation,
  downloadEvaluationPdf,
  listEvaluations,
} from "@/lib/api/evaluations";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const searchParams = useSearchParams();
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createOrganizationId, setCreateOrganizationId] = useState("");
  const [createPeriod, setCreatePeriod] = useState(currentGlobalCycle());
  const [creatingEvaluation, setCreatingEvaluation] = useState(false);

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

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateDialogOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!createDialogOpen || createOrganizationId) return;
    const defaultOrgId = resolveDefaultReportOrgId(user);
    setCreateOrganizationId(
      defaultOrgId && organizations.some((org) => org.id === defaultOrgId)
        ? defaultOrgId
        : requiresOrganizationSelection
          ? ""
          : organizations[0]?.id ?? "",
    );
  }, [createDialogOpen, createOrganizationId, organizations, requiresOrganizationSelection, user]);

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

  const evaluationSummaryCards = [
    {
      label: "Total Evaluasi",
      value: visibleEvaluations.length,
      tone: "zinc" as const,
      description: "Data pada filter yang sedang aktif",
    },
    {
      label: "Draft",
      value: visibleEvaluations.filter((item) => item.status === "draft").length,
      tone: "rose" as const,
      description: "Masih bisa diedit",
    },
    {
      label: "Final",
      value: visibleEvaluations.filter((item) => item.status === "final").length,
      tone: "emerald" as const,
      description: "Sudah dikunci dan siap PDF",
    },
    {
      label: "Periode",
      value: period || "-",
      tone: "white" as const,
      description: "Filter periode aktif",
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = total === 0 ? 0 : Math.min(page * limit, total);

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

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    router.replace(open ? "/evaluations?create=1" : "/evaluations");
  };

  const handleCreateEvaluation = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!createOrganizationId) {
      toast.error("Pilih organisasi terlebih dahulu.");
      return;
    }
    if (!createPeriod.trim()) {
      toast.error("Isi periode terlebih dahulu.");
      return;
    }

    setCreatingEvaluation(true);
    try {
      const evaluation = await createEvaluation(token, {
        organizationId: createOrganizationId,
        period: createPeriod.trim(),
      });
      toast.success("Evaluasi berhasil dibuat.");
      handleCreateDialogOpenChange(false);
      router.push(`/evaluations/${evaluation.id}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal membuat evaluasi.");
    } finally {
      setCreatingEvaluation(false);
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
        <Button type="button" className="gap-2 self-start" onClick={() => handleCreateDialogOpenChange(true)}>
            <FilePlus2 className="size-4" />
            Buat Evaluasi
        </Button>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {evaluationSummaryCards.map((card) => (
          <KpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            tone={card.tone}
            description={card.description}
          />
        ))}
      </div>

      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-[15px] font-semibold">Daftar Evaluasi</CardTitle>
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
        <CardContent className="space-y-4 p-4">
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
              <Label className="text-xs font-medium text-muted-foreground">Periode</Label>
              <Input value={period} onChange={(event) => setPeriod(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
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
              <Label className="text-xs font-medium text-muted-foreground">Pencarian</Label>
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

          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-28 whitespace-nowrap text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Periode
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Organisasi
                </TableHead>
                <TableHead className="whitespace-nowrap text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Template
                </TableHead>
                <TableHead className="w-28 whitespace-nowrap text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Status
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Diperbarui
                </TableHead>
                <TableHead className="w-32 whitespace-nowrap text-right text-xs uppercase tracking-[0.12em] text-zinc-500">
                  Aksi
                </TableHead>
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
                    <TableRow key={evaluation.id} className="border-border/50 transition-colors hover:bg-muted/20">
                      <TableCell className="whitespace-nowrap font-mono text-zinc-600">
                        {evaluation.period}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate font-medium text-foreground">{orgName}</div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {evaluation.templateName || evaluation.templateId}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusStyles[evaluation.status]}
                        >
                          {evaluationStatusLabel[evaluation.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(evaluation.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5">
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
        <div className="border-t border-border/40 bg-muted/20 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              Menampilkan {pageStart} - {pageEnd} dari {total} evaluasi
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="bg-primary/10 text-xs font-medium text-primary"
                disabled
              >
                {page}
              </Button>
              <span className="px-1 text-xs text-muted-foreground">dari {totalPages}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages || loading || total === 0}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[88vh] sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background px-6 py-4">
            <DialogTitle className="text-lg leading-tight">Buat Evaluasi MR</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Buat draft evaluasi untuk organisasi dan periode yang dipilih. Data
              detail bisa diisi setelah draft dibuat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <div className="space-y-2">
              <Label>Organisasi</Label>
              <OrganizationPicker
                value={createOrganizationId}
                organizations={organizations}
                onChange={setCreateOrganizationId}
                placeholder="Pilih organisasi"
                searchPlaceholder="Cari organisasi..."
                emptyMessage="Tidak ada organisasi ditemukan."
                disabled={creatingEvaluation}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-period">Periode</Label>
              <Input
                id="create-period"
                value={createPeriod}
                onChange={(event) => setCreatePeriod(event.target.value)}
                placeholder={currentGlobalCycle()}
                disabled={creatingEvaluation}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/[0.18] px-6 py-4">
            <Button type="button" variant="outline" onClick={() => handleCreateDialogOpenChange(false)} disabled={creatingEvaluation}>
              Batal
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleCreateEvaluation()}
              disabled={creatingEvaluation}
            >
              {creatingEvaluation ? <Loader2 className="size-4 animate-spin" /> : <FilePlus2 className="size-4" />}
              {creatingEvaluation ? "Membuat..." : "Buat Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

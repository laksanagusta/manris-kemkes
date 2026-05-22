"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";
import {
  getWorkingPaper,
  signWorkingPaper,
  cancelWorkingPaper,
  deleteWorkingPaper,
} from "@/lib/api/working-papers";
import { buildWorkingPaperDetailViewModel } from "@/lib/working-paper-detail-view-model";
import { resolveWorkingPaperRiskDisplay } from "@/lib/working-paper-risk-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormPage,
  FormHeader,
  FormSection,
} from "@/components/shared/form-shell";

import { cn } from "@/lib/utils";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Download,
  FileSignature,
  Loader2,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusVariant: Record<WorkingPaperStatus, string> = {
  draft: getLinearStatusBadgeClass("draft"),
  signing: getLinearStatusBadgeClass("signing"),
  completed: getLinearStatusBadgeClass("completed"),
  cancelled: getLinearStatusBadgeClass("cancelled"),
};

const statusLabel: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses Tanda Tangan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi":
    "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const actionToneClassName = {
  attention: "border-primary/20 bg-primary/[0.05]",
  neutral: "border-border/60 bg-muted/30",
  success: "border-success/20 bg-success/10",
  danger: "border-destructive/20 bg-destructive/10",
} as const;

const actionToneTitleClassName = {
  attention: "text-primary",
  neutral: "text-foreground",
  success: "text-success",
  danger: "text-destructive",
} as const;

const timelineStatusClassName = {
  signed: "border-success/20 bg-success/10 text-success",
  current: "border-primary/20 bg-primary/[0.06] text-primary",
  upcoming: "border-border bg-muted/40 text-muted-foreground",
  skipped: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const workingPaperRiskStatusLabel: Record<string, string> = {
  approved: "Disetujui",
  reviewed: "Ditinjau",
  pending_review: "Menunggu Review",
  draft: "Draft",
};

function formatDate(value?: string) {
  if (!value) return "-";

  return dateFormatter.format(new Date(value));
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  return dateTimeFormatter.format(new Date(value));
}

function formatWorkingPaperRiskStatus(status?: string | null) {
  const normalized = (status ?? "").trim().toLowerCase();
  if (!normalized) return "-";
  return (
    workingPaperRiskStatusLabel[normalized] || normalized.replace(/_/g, " ")
  );
}

export default function WorkingPaperDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const { id } = params;
  const router = useRouter();
  const { token, user } = useAuth();

  const [data, setData] = useState<WorkingPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getWorkingPaper(id, token!);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat detail Kertas Kerja.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [loadData, token]);

  const handleExport = async () => {
    if (!data) return;
    try {
      const { exportWorkingPaper } =
        await import("@/lib/working-paper-export").catch(() => {
          throw new Error("Fitur ekspor Excel belum tersedia.");
        });
      await exportWorkingPaper(data);
      toast.success("Kertas Kerja berhasil diekspor.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengekspor Kertas Kerja.",
      );
    }
  };

  const handleSign = async () => {
    if (!token || !data) return;
    try {
      await signWorkingPaper(id, token);
      toast.success("Berhasil menandatangani Kertas Kerja.");
      setSignDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal menandatangani Kertas Kerja.",
      );
    }
  };

  const handleCancel = async () => {
    if (!token || !data) return;
    try {
      await cancelWorkingPaper(id, token);
      toast.success("Kertas Kerja berhasil dibatalkan.");
      setCancelDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membatalkan Kertas Kerja.",
      );
    }
  };

  const handleDelete = async () => {
    if (!token || !data) return;
    try {
      await deleteWorkingPaper(id, token);
      toast.success("Kertas Kerja berhasil dihapus.");
      setDeleteDialogOpen(false);
      router.push("/risk/working-papers");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus Kertas Kerja.",
      );
    }
  };

  if (loading) {
    return (
      <FormPage className="max-w-7xl">
        <FormHeader
          title="Memuat detail kertas kerja"
          description="Sistem sedang menyiapkan ringkasan dokumen, status tanda tangan, dan daftar risiko."
          backLabel="Kembali ke Kertas Kerja"
          onBack={() => router.push("/risk/working-papers")}
        />

        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-6 py-12 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            Memuat detail kertas kerja…
          </p>
        </div>
      </FormPage>
    );
  }

  if (error) {
    return (
      <FormPage className="max-w-7xl">
        <FormHeader
          title="Detail kertas kerja belum tersedia"
          description="Halaman ini membutuhkan data dokumen yang valid sebelum Anda bisa meninjau tindakan penandatanganan."
          backLabel="Kembali ke Kertas Kerja"
          onBack={() => router.push("/risk/working-papers")}
        />

        <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="size-6 text-destructive" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Gagal memuat kertas kerja</h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {error}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" onClick={() => loadData()}>
              Coba lagi
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/risk/working-papers")}
            >
              Kembali ke daftar
            </Button>
          </div>
        </div>
      </FormPage>
    );
  }

  if (!data) {
    return (
      <FormPage className="max-w-7xl">
        <FormHeader
          title="Kertas kerja tidak ditemukan"
          description="Dokumen yang Anda cari mungkin sudah dipindahkan, tidak lagi tersedia, atau Anda tidak memiliki akses untuk melihatnya."
          backLabel="Kembali ke Kertas Kerja"
          onBack={() => router.push("/risk/working-papers")}
        />

        <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-border/50 bg-muted/20 px-6 py-12 text-center">
          <AlertCircle className="size-10 text-muted-foreground" />
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Dokumen tidak ditemukan</h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Kertas kerja mungkin sudah dihapus atau Anda tidak memiliki akses.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/risk/working-papers")}
          >
            Kembali ke daftar
          </Button>
        </div>
      </FormPage>
    );
  }

  const { signatories, status } = data;
  const viewModel = buildWorkingPaperDetailViewModel(data, user?.id);
  const signedCount = signatories.filter(
    (signatory) => signatory.status === "signed",
  ).length;

  const totalRiskCount = data.risks?.length || 0;
  const approvedRiskCount =
    data.risks?.filter((link) => link.risk.status === "approved").length || 0;
  const isAllApproved =
    totalRiskCount > 0 && approvedRiskCount === totalRiskCount;

  const summaryItems = [
    {
      label: "Siklus asesmen",
      value: data.assessment_cycle || "Belum ditetapkan",
    },
    {
      label: "Dibuat pada",
      value: formatDate(data.created_at),
    },
    {
      label:
        status === "completed"
          ? "Selesai pada"
          : status === "cancelled"
            ? "Dibatalkan pada"
            : "Diperbarui pada",
      value:
        status === "completed"
          ? formatDateTime(data.completed_at)
          : status === "cancelled"
            ? formatDateTime(data.cancelled_at)
            : formatDateTime(data.updated_at),
    },
  ];

  return (
    <FormPage className="max-w-7xl">
      <FormHeader
        title={data.title}
        description={data.description}
        backLabel="Kembali ke Kertas Kerja"
        onBack={() => router.back()}
        badges={
          <Badge
            className={cn("capitalize px-2 py-0.5", statusVariant[status])}
          >
            {statusLabel[status]}
          </Badge>
        }
        actions={
          <>
            {viewModel.canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </Button>
            )}
            {viewModel.canCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                onClick={() => setCancelDialogOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Batalkan
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Ekspor Excel
            </Button>
          </>
        }
      />

      {viewModel.currentAction ? (
        <section
          className={cn(
            "rounded-xl border px-5 py-5",
            actionToneClassName[viewModel.currentAction.tone],
          )}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Langkah saat ini
              </p>
              <h2
                className={cn(
                  "text-lg font-semibold tracking-tight",
                  actionToneTitleClassName[viewModel.currentAction.tone],
                )}
              >
                {viewModel.currentAction.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                {viewModel.currentAction.description}
              </p>
            </div>

            {viewModel.canSign && viewModel.currentAction.buttonLabel ? (
              <Button
                size="lg"
                className="shadow-sm"
                onClick={() => setSignDialogOpen(true)}
              >
                <FileSignature className="mr-2 size-4" />
                {viewModel.currentAction.buttonLabel}
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <FormSection
            title="Ringkasan dokumen"
            action={
              <Badge variant="secondary" className="font-mono">
                {signedCount}/{signatories.length || 0} TTE
              </Badge>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              {summaryItems.map((item) => (
                <div key={item.label} className="space-y-1">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="text-sm font-medium text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </FormSection>
          <FormSection
            title="Risiko dalam Kertas Kerja"
            action={
              <Badge variant="secondary" className="font-mono">
                {data.risks?.length || 0} Risiko
              </Badge>
            }
            contentClassName="p-0 sm:p-0"
          >
            {totalRiskCount > 0 && (
              <div className="flex flex-col gap-3 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {isAllApproved ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <AlertCircle className="size-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {approvedRiskCount} dari {totalRiskCount} risiko telah
                      disetujui
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.round((approvedRiskCount / totalRiskCount) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isAllApproved ? "bg-success" : "bg-primary",
                    )}
                    style={{
                      width: `${(approvedRiskCount / totalRiskCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-200/80 hover:bg-transparent">
                    <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Kode
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Judul Risiko
                    </TableHead>
                    <TableHead className="hidden xl:table-cell w-24 whitespace-nowrap px-2.5 text-center align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Probabilitas
                    </TableHead>
                    <TableHead className="hidden xl:table-cell w-24 whitespace-nowrap px-2.5 text-center align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Dampak
                    </TableHead>
                    <TableHead className="w-16 whitespace-nowrap px-2.5 text-center align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Nilai
                    </TableHead>
                    <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Tingkat
                    </TableHead>
                    <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Status
                    </TableHead>
                    <TableHead className="w-28 whitespace-nowrap px-2.5 text-right align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    if (!data.risks || data.risks.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24">
                            <div className="flex flex-col gap-1 text-left">
                              <p className="text-sm font-medium text-muted-foreground">
                                Belum ada risiko
                              </p>
                              <p className="text-xs text-muted-foreground/70">
                                Dokumen ini belum memuat risiko apa pun
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    return data.risks.map((link, index) => {
                      const risk = link.risk;
                      const riskDisplay = resolveWorkingPaperRiskDisplay(risk);
                      const badgeCls =
                        levelBadgeVariant[riskDisplay.label] ||
                        levelBadgeVariant["Rendah"];
                      const riskHref = `/risk/register/new?id=${risk.id}`;

                      let statusBadge = null;
                      switch ((risk.status || "").toLowerCase()) {
                        case "approved":
                          statusBadge = (
                            <Badge
                              className={cn(
                                "px-1.5 h-5",
                                getLinearStatusBadgeClass("approved"),
                              )}
                            >
                              Disetujui
                            </Badge>
                          );
                          break;
                        case "reviewed":
                          statusBadge = (
                            <Badge
                              className={cn(
                                "px-1.5 h-5",
                                getLinearStatusBadgeClass("reviewed"),
                              )}
                            >
                              Ditinjau
                            </Badge>
                          );
                          break;
                        case "pending_review":
                          statusBadge = (
                            <Badge
                              className={cn(
                                "px-1.5 h-5",
                                getLinearStatusBadgeClass("pending_review"),
                              )}
                            >
                              Menunggu Review
                            </Badge>
                          );
                          break;
                        case "draft":
                          statusBadge = (
                            <Badge
                              className={cn(
                                "px-1.5 h-5",
                                getLinearStatusBadgeClass("draft"),
                              )}
                            >
                              Draft
                            </Badge>
                          );
                          break;
                        default:
                          statusBadge = (
                            <Badge
                              className={cn(
                                "px-1.5 h-5",
                                getLinearStatusBadgeClass(risk.status),
                              )}
                            >
                              {formatWorkingPaperRiskStatus(risk.status)}
                            </Badge>
                          );
                      }

                      return (
                        <TableRow
                          key={risk.id || index}
                          className="border-zinc-200/80 transition-colors hover:bg-zinc-50/70"
                        >
                          <TableCell className="px-2.5 font-mono text-xs text-zinc-600">
                            <span className="flex items-center gap-1.5">
                              {risk.code || "-"}
                              {risk.versionNumber != null &&
                                risk.versionNumber > 1 && (
                                  <span className="inline-flex items-center rounded-md bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200">
                                    v{risk.versionNumber}
                                  </span>
                                )}
                            </span>
                          </TableCell>
                          <TableCell
                            className="px-2.5 max-w-[240px] truncate text-xs font-medium text-foreground"
                            title={risk.title}
                          >
                            {risk.title}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell px-2.5 text-center text-xs text-zinc-600">
                            {risk.probability || "-"}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell px-2.5 text-center text-xs text-zinc-600">
                            {risk.impact || "-"}
                          </TableCell>
                          <TableCell className="px-2.5 text-center text-xs font-semibold text-foreground">
                            {riskDisplay.score}
                          </TableCell>
                          <TableCell className="px-2.5">
                            <Badge
                              className={cn(
                                "text-[10px] font-semibold border px-1.5 h-5",
                                badgeCls,
                              )}
                            >
                              {riskDisplay.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2.5">
                            {statusBadge}
                          </TableCell>
                          <TableCell className="px-2.5 text-right">
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary h-auto py-1 px-2"
                            >
                              <Link href={riskHref}>
                                Buka risiko
                                <ArrowRight className="size-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>
          </FormSection>
        </div>

        <div>
          <FormSection
            title="Status Tanda Tangan"
            action={
              <Badge variant="secondary" className="font-mono">
                {signedCount}/{signatories.length || 0}
              </Badge>
            }
            className="sticky top-6"
          >
            {signatories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada penandatangan
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {viewModel.timeline.map((item, index) => {
                  const isLast = index === viewModel.timeline.length - 1;
                  const isSigned = item.state === "signed";
                  const isCurrent = item.state === "current";
                  const isFuture = item.state === "upcoming";
                  const sig = item.signatory;

                  return (
                    <div
                      key={sig.id}
                      className={cn("flex gap-3", isFuture && "opacity-75")}
                    >
                      <div className="flex flex-col items-center">
                        <div className="mt-1 shrink-0">
                          {isSigned ? (
                            <div className="flex size-6 items-center justify-center rounded-full border border-success/30 bg-success/20">
                              <CheckCircle2 className="size-4 text-success" />
                            </div>
                          ) : isCurrent ? (
                            <div className="flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                              <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                            </div>
                          ) : (
                            <div className="flex size-6 items-center justify-center rounded-full border border-border bg-muted">
                              <Circle className="size-3 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        {!isLast && (
                          <div
                            className={cn(
                              "w-0.5 flex-1 min-h-4",
                              isSigned
                                ? "bg-success"
                                : isCurrent
                                  ? "bg-primary/30"
                                  : "bg-border",
                            )}
                          />
                        )}
                      </div>

                      <div
                        className={cn(
                          "min-w-0 flex-1",
                          !isLast ? "pb-6" : "pb-0",
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold leading-none">
                              {sig.signer_name}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-5 px-2 text-[10px] font-semibold",
                                timelineStatusClassName[item.state],
                              )}
                            >
                              {item.label}
                            </Badge>
                          </div>

                          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {[sig.signer_jabatan, sig.signer_pangkat]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>

                          <p className="text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </p>
                        </div>

                        {sig.signed_at ? (
                          <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-success/20 bg-success/10 px-2 py-1 text-xs font-medium text-success">
                            <CheckCircle2 className="size-3.5" />
                            Tercatat pada {formatDateTime(sig.signed_at)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FormSection>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tanda Tangani Kertas Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menandatangani dokumen ini? Tindakan ini
              akan menyimpan data Anda sebagai penandatangan sah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSign}>
              Tanda Tangani
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Kertas Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan Kertas Kerja ini? Dokumen yang
              dibatalkan tidak dapat ditandatangani lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleCancel}
              className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-600"
            >
              Batalkan Dokumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kertas Kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus Kertas Kerja ini? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

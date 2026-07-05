"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";
import {
  getWorkingPaper,
  startSigningWorkingPaper,
  signWorkingPaper,
  cancelWorkingPaper,
  skipTTEWorkingPaper,
  deleteWorkingPaper,
} from "@/lib/api/working-papers";
import { buildWorkingPaperDetailViewModel } from "@/lib/working-paper-detail-view-model";
import { WorkingPaperMonitoringTable } from "./working-paper-monitoring-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FormPage,
  FormHeader,
  FormSection,
} from "@/components/shared/form-shell";

import { cn } from "@/lib/utils";
import { getLinearStatusBadgeClass } from "@/lib/linear-status-badge";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  MoreHorizontal,
  Pen,
  SkipForward,
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

const timelineStatusClassName = {
  signed: "border-success/20 bg-success/10 text-success",
  current: "border-primary/20 bg-primary/[0.06] text-primary",
  upcoming: "border-border bg-muted/40 text-muted-foreground",
  skipped: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

function formatDate(value?: string) {
  if (!value) return "-";

  return dateFormatter.format(new Date(value));
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  return dateTimeFormatter.format(new Date(value));
}

function WorkingPaperStatusActions({
  canStartSigning,
  canSkipTTE,
  canCancel,
  canDelete,
  onStartSigning,
  onSkipTTE,
  onCancel,
  onDelete,
}: {
  canStartSigning: boolean;
  canSkipTTE: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onStartSigning: () => void;
  onSkipTTE: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const hasActions = canStartSigning || canSkipTTE || canCancel || canDelete;

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-border/70 bg-background/90"
        >
          <MoreHorizontal className="size-4" />
          Tindakan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pilih tindakan</DropdownMenuLabel>
        {canStartSigning ? (
          <DropdownMenuItem className="gap-2" onClick={onStartSigning}>
            <ShieldAlert className="size-3.5" />
            Mulai proses TTE
          </DropdownMenuItem>
        ) : null}
        {canSkipTTE || canCancel || canDelete ? (
          <DropdownMenuSeparator />
        ) : null}
        {canSkipTTE ? (
          <DropdownMenuItem className="gap-2" onClick={onSkipTTE}>
            <SkipForward className="size-3.5" />
            Lewati tanda tangan elektronik
          </DropdownMenuItem>
        ) : null}
        {canCancel ? (
          <DropdownMenuItem className="gap-2" onClick={onCancel}>
            <XCircle className="size-3.5" />
            Batalkan dokumen
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Hapus kertas kerja
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SigningBlocker {
  code: string;
  title: string;
  monitoring_status: string;
}

function formatSigningError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err) {
    const details = (err as { details?: SigningBlocker[] }).details;
    if (Array.isArray(details) && details.length > 0) {
      const items = details
        .map((b) => `${b.code} (${b.monitoring_status})`)
        .join(", ");
      return `Monitoring belum final: ${items}`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Gagal memproses kertas kerja.";
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
  const [startSigningDialogOpen, setStartSigningDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const setHeaderActions = useSetHeaderActions();

  const handleExport = async () => {
    if (!data) return;
    try {
      const { exportWorkingPaper } =
        await import("@/lib/working-paper-export").catch(() => {
          throw new Error("Fitur ekspor Excel belum tersedia.");
        });
      await exportWorkingPaper(data);
      toast.success("Kertas kerja berhasil diekspor.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengekspor kertas kerja.",
      );
    }
  };

  useEffect(() => {
    if (!token || !data) return;
    const vm = buildWorkingPaperDetailViewModel(data, user?.id);
    setHeaderActions(
      <div className="flex items-center gap-2">
        <WorkingPaperStatusActions
          canStartSigning={vm.canStartSigning}
          canSkipTTE={vm.canSkipTTE}
          canCancel={vm.canCancel}
          canDelete={vm.canDelete}
          onStartSigning={() => setStartSigningDialogOpen(true)}
          onSkipTTE={() => setSkipDialogOpen(true)}
          onCancel={() => setCancelDialogOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
        />
        {vm.canStartSigning && (
          <Button size="sm" style={{ '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties} onClick={() => setStartSigningDialogOpen(true)}>
            <Pen className="w-4 h-4 mr-2" />
            Mulai Proses TTE
          </Button>
        )}
        {vm.canSign && (
          <Button size="sm" style={{ '--primary': '#00b9ad', '--primary-foreground': '#ffffff' } as React.CSSProperties} onClick={() => setSignDialogOpen(true)}>
            <Pen className="w-4 h-4 mr-2" />
            Tanda Tangani
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Ekspor Excel
        </Button>
      </div>,
    );
    return () => setHeaderActions(null);
  }, [token, setHeaderActions, data, user?.id, handleExport, setStartSigningDialogOpen, setSignDialogOpen, setSkipDialogOpen, setCancelDialogOpen, setDeleteDialogOpen]);

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
          : "Gagal memuat detail kertas kerja.",
      );
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [loadData, token]);

  const handleSign = async () => {
    if (!token || !data) return;
    try {
      await signWorkingPaper(id, token);
      toast.success("Kertas kerja berhasil ditandatangani.");
      setSignDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(formatSigningError(err));
    }
  };

  const handleStartSigning = async () => {
    if (!token || !data) return;
    try {
      await startSigningWorkingPaper(id, token);
      toast.success("Kertas kerja siap diproses untuk tanda tangan elektronik.");
      setStartSigningDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(formatSigningError(err));
    }
  };

  const handleSkipTTE = async () => {
    if (!token || !data) return;
    try {
      await skipTTEWorkingPaper(id, token);
      toast.success("Tanda tangan elektronik dilewati dan kertas kerja diselesaikan.");
      setSkipDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(formatSigningError(err));
    }
  };

  const handleCancel = async () => {
    if (!token || !data) return;
    try {
      await cancelWorkingPaper(id, token);
      toast.success("Kertas kerja berhasil dibatalkan.");
      setCancelDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membatalkan kertas kerja.",
      );
    }
  };

  const handleDelete = async () => {
    if (!token || !data) return;
    try {
      await deleteWorkingPaper(id, token);
      toast.success("Kertas kerja berhasil dihapus.");
      setDeleteDialogOpen(false);
      router.push("/risk/working-papers");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus kertas kerja.",
      );
    }
  };

  if (loading) {
    return (
      <FormPage className="space-y-4 pb-0">
        <FormHeader
          title="Memuat detail kertas kerja"
          description="Sistem sedang menyiapkan ringkasan dokumen, status tanda tangan, dan daftar risiko."
        />

        <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-lg ring-1 ring-inset ring-border bg-muted/20 px-6 py-12 text-center">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            Memuat detail kertas kerja...
          </p>
        </div>
      </FormPage>
    );
  }

  if (error) {
    return (
      <FormPage className="space-y-4 pb-0">
        <FormHeader
          title="Detail kertas kerja belum tersedia"
          description="Halaman ini membutuhkan data dokumen yang valid sebelum Anda bisa meninjau tindakan penandatanganan."
        />

        <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
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
      <FormPage className="space-y-4 pb-0">
        <FormHeader
          title="Kertas kerja tidak ditemukan"
          description="Dokumen yang Anda cari mungkin sudah dipindahkan, tidak lagi tersedia, atau Anda tidak memiliki akses untuk melihatnya."
        />

        <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-lg ring-1 ring-inset ring-border bg-muted/20 px-6 py-12 text-center">
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
  const finalizedMonitoringCount =
    data.risks?.filter((link) => link.risk.monitoring?.status === "finalized")
      .length || 0;
  const isAllMonitoringFinal =
    totalRiskCount > 0 && finalizedMonitoringCount === totalRiskCount;

  const summaryItems = [
    {
      label: "Kode",
      value: data.code || "-",
    },
    {
      label: "Status",
      value: statusLabel[status],
    },
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
    <FormPage className="space-y-4 pb-0">
      {viewModel.monitoringBlockers.length > 0 ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
            Finalisasi monitoring terlebih dahulu
          </p>
          <p className="mt-1 text-sm leading-5">
            Berikut risiko yang masih memiliki monitoring draft atau belum
            memiliki monitoring final:
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {viewModel.monitoringBlockers.map((item) => (
              <li key={item} className="font-medium">
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <FormSection
            title="Ringkasan dokumen"
            className="rounded-lg ring-1 ring-inset ring-border border-0 overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100/60"
            action={
              <Badge
                variant="secondary"
                className="font-mono"
              >
                {signedCount} dari {signatories.length || 0} ditandatangani
              </Badge>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="space-y-1 rounded-lg ring-1 ring-inset ring-border bg-card px-4 py-3"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd>
                    <Badge variant="outline" className="font-mono text-sm font-medium px-2.5 py-1">
                      {item.value}
                    </Badge>
                  </dd>
                </div>
              ))}
            </dl>
          </FormSection>
          <FormSection
            title="Monitoring Final"
            description={`Status finalisasi monitoring risiko`}
            className="rounded-lg ring-1 ring-inset ring-border border-0 overflow-hidden"
          >
            {totalRiskCount > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {isAllMonitoringFinal ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <AlertCircle className="size-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {finalizedMonitoringCount} dari {totalRiskCount} risiko
                      memiliki monitoring final
                    </span>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {Math.round(
                      (finalizedMonitoringCount / totalRiskCount) * 100,
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isAllMonitoringFinal ? "bg-success" : "bg-primary",
                    )}
                    style={{
                      width: `${(finalizedMonitoringCount / totalRiskCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </FormSection>
          <FormSection
            title="Risiko dalam Kertas Kerja"
            action={
              <Badge variant="secondary" className="font-mono">
                {data.risks?.length || 0} Risiko
              </Badge>
            }
            className="rounded-lg ring-1 ring-inset ring-border border-0 overflow-hidden"
            contentClassName="p-0 sm:p-0"
          >
            <WorkingPaperMonitoringTable links={data.risks ?? []} />
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
            className="rounded-lg ring-1 ring-inset ring-border border-0 overflow-hidden sticky top-6"
          >
            {signatories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-6 text-center">
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
      <AlertDialog
        open={startSigningDialogOpen}
        onOpenChange={setStartSigningDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai proses TTE</AlertDialogTitle>
            <AlertDialogDescription>
              Status akan diubah dari draft menjadi proses tanda tangan.
              Setelah itu, para penandatangan bisa mulai menandatangani
              dokumen ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartSigning}>
              Mulai proses TTE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tanda tangani kertas kerja</AlertDialogTitle>
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
            <AlertDialogTitle>Batalkan kertas kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan kertas kerja ini? Dokumen
              yang dibatalkan tidak dapat ditandatangani lagi.
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

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lewati tanda tangan elektronik</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menyelesaikan kertas kerja tanpa tanda tangan
              elektronik dan langsung mengunci versi risiko terkait. Pastikan
              semua risiko di dalam dokumen sudah selesai diproses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkipTTE}>
              Lewati tanda tangan elektronik
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kertas kerja</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kertas kerja ini? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

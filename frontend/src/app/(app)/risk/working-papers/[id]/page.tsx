"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type { WorkingPaper, WorkingPaperStatus } from "@/types/working-paper";
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
import { WorkingPaperStatusActions } from "./working-paper-status-actions";
import { WorkingPaperSignatureTimeline } from "./working-paper-signature-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AccentButton,
  CollectionPageHeader,
  CollectionTableCard,
} from "@/components/shared/design-system";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormPage,
  FormHeader,
} from "@/components/shared/form-shell";
import {
  CollectionDialogCancel,
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
} from "@/components/shared/design-system";

import { cn } from "@/lib/utils";
import { Pen } from "@/components/ui/icons";


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

const statusLabel: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses Tanda Tangan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const statusTone = {
  draft: "neutral",
  signing: "progress",
  completed: "success",
  cancelled: "danger",
} as const;

function formatDate(value?: string) {
  if (!value) return "-";
  return dateFormatter.format(new Date(value));
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return dateTimeFormatter.format(new Date(value));
}

interface SigningBlocker {
  code: string;
  title: string;
  monitoring_status: string;
}

function monitoringStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Sedang Berjalan";
    case "final":
      return "Selesai";
    case "missing":
      return "Belum Dimulai";
    default:
      return status;
  }
}

function formatSigningError(err: unknown): string {
  if (err && typeof err === "object" && "details" in err) {
    const details = (err as { details?: SigningBlocker[] }).details;
    if (Array.isArray(details) && details.length > 0) {
      const items = details
        .map((b) => `${b.code} (${monitoringStatusLabel(b.monitoring_status)})`)
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

  const handleExport = useCallback(async () => {
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
  }, [data]);

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
      <FormPage className="space-y-6 pb-0">
        <FormHeader
          title="Memuat detail kertas kerja"
        />
        <CollectionLoadingState message="Memuat detail kertas kerja..." />
      </FormPage>
    );
  }

  if (error) {
    return (
      <FormPage className="space-y-6 pb-0">
        <FormHeader
          title="Detail kertas kerja belum tersedia"
        />
        <CollectionErrorState
          title="Gagal memuat kertas kerja"
          message={error}
          onReload={() => loadData()}
        />
      </FormPage>
    );
  }

  if (!data) {
    return (
      <FormPage className="space-y-6 pb-0">
        <FormHeader
          title="Kertas kerja tidak ditemukan"
        />
        <CollectionEmptyState
          title="Dokumen tidak ditemukan"
          description="Kertas kerja mungkin sudah dihapus atau Anda tidak memiliki akses."
        />
      </FormPage>
    );
  }

  const { status } = data;
  const viewModel = buildWorkingPaperDetailViewModel(data, user?.id);

  const totalRiskCount = data.risks?.length || 0;
  const finalizedMonitoringCount =
    data.risks?.filter((link) => link.risk.monitoring?.status === "final")
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
      label: "Periode pemantauan",
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

  const headerActions = (
    <>
      <WorkingPaperStatusActions
        canSkipTTE={viewModel.canSkipTTE}
        canCancel={viewModel.canCancel}
        canDelete={viewModel.canDelete}
        onSkipTTE={() => setSkipDialogOpen(true)}
        onCancel={() => setCancelDialogOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        onExport={handleExport}
      />
      {viewModel.canStartSigning && (
        <AccentButton
          onClick={() => setStartSigningDialogOpen(true)}
          icon={<Pen className="size-3.5" />}
        >
          Mulai Proses TTE
        </AccentButton>
      )}
      {viewModel.canSign && (
        <AccentButton
          onClick={() => setSignDialogOpen(true)}
          icon={<Pen className="size-3.5" />}
        >
          Tanda Tangani
        </AccentButton>
      )}
    </>
  );

  return (
    <FormPage className="space-y-6 pb-0">
      <CollectionPageHeader
        actionsPlacement="top"
        title={data.code || "Detail Kertas Kerja"}
        actions={headerActions}
      />

      {viewModel.monitoringBlockers.length > 0 ? (
        <Card className="rounded-lg bg-amber-50/80">
          <CardContent className="space-y-1 p-4 text-sm text-amber-900">
            <p className="font-semibold">Finalisasi monitoring terlebih dahulu</p>
            <p>
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
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <CollectionTableCard>
            <WorkingPaperMonitoringTable links={data.risks ?? []} />
          </CollectionTableCard>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="gap-0 overflow-hidden rounded-lg bg-card p-0 transition-colors duration-300">
            <CardContent className="px-5 py-5 text-sm">
              <div className="space-y-4">
                <section aria-labelledby="working-paper-summary-properties">
                  <h2
                    id="working-paper-summary-properties"
                    className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                  >
                    Ringkasan dokumen
                  </h2>
                  <dl className="mt-3 space-y-3">
                    {summaryItems.map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4"
                      >
                        <dt className="text-[13px] text-muted-foreground">{label}</dt>
                        <dd
                          className={cn(
                            "max-w-[65%] break-words text-right text-foreground",
                            label === "Kode" && "font-mono",
                          )}
                        >
                          {label === "Status" ? (
                            <Badge size="compact" tone={statusTone[status]}>
                              {value}
                            </Badge>
                          ) : (
                            value
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section
                  aria-labelledby="working-paper-monitoring-progress"
                  className="border-t border-dashed border-border/70 pt-5"
                >
                  <h2
                    id="working-paper-monitoring-progress"
                    className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                  >
                    Progres Pemantauan
                  </h2>
                  <div className="mt-3">
                    {totalRiskCount > 0 ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                          <Badge
                            size="compact"
                            tone={isAllMonitoringFinal ? "success" : "progress"}
                            className="max-w-full truncate"
                          >
                            {finalizedMonitoringCount} dari {totalRiskCount} Risiko
                            Selesai Dipantau
                          </Badge>
                          <span className="text-xs font-medium text-muted-foreground">
                            {Math.round(
                              (finalizedMonitoringCount / totalRiskCount) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <Progress
                          value={(finalizedMonitoringCount / totalRiskCount) * 100}
                          className={cn(
                            "h-1.5",
                            isAllMonitoringFinal &&
                              "[&>[data-slot=progress-indicator]]:bg-success",
                          )}
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg bg-state-surface px-3 py-4 text-center text-xs text-state-foreground">
                        Belum ada risiko di dalam kertas kerja.
                      </div>
                    )}
                  </div>
                </section>

                <section
                  aria-labelledby="working-paper-signature-history"
                  className="border-t border-dashed border-border/70 pt-5"
                >
                  <h2
                    id="working-paper-signature-history"
                    className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                  >
                    Histori Tanda Tangan
                  </h2>
                  <div className="mt-3">
                    <WorkingPaperSignatureTimeline
                      timeline={viewModel.timeline}
                    />
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog
        open={startSigningDialogOpen}
        onOpenChange={setStartSigningDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Mulai proses TTE
            </AlertDialogTitle>
            <AlertDialogDescription>
              Status akan diubah dari draft menjadi proses tanda tangan.
              Setelah itu, para penandatangan bisa mulai menandatangani
              dokumen ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setStartSigningDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="primary" size="primary" onClick={handleStartSigning}>
              Mulai proses TTE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tanda tangani kertas kerja
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menandatangani dokumen ini? Tindakan ini
              akan menyimpan data Anda sebagai penandatangan sah.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setSignDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="primary" size="primary" onClick={handleSign}>
              Tanda Tangani
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Batalkan kertas kerja
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan kertas kerja ini? Dokumen
              yang dibatalkan tidak dapat ditandatangani lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setCancelDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
              onClick={handleCancel}
            >
              Batalkan Dokumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Lewati tanda tangan elektronik
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menyelesaikan kertas kerja tanpa tanda tangan
              elektronik dan langsung mengunci versi risiko terkait. Pastikan
              semua risiko di dalam dokumen sudah selesai diproses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setSkipDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="primary" size="primary" onClick={handleSkipTTE}>
              Lewati tanda tangan elektronik
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus kertas kerja
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kertas kerja ini? Tindakan ini
              tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="destructive" size="md" onClick={handleDelete}>
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

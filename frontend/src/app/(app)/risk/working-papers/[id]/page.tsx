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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  InlineCard,
  StandardCard,
} from "@/components/shared/design-system";
import {
  AlertDialog,
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
  CollectionTableCard,
} from "@/components/shared/design-system";

import { cn } from "@/lib/utils";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Pen,
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

const statusLabel: Record<WorkingPaperStatus, string> = {
  draft: "Draft",
  signing: "Proses Tanda Tangan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

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
        <CollectionLoadingState message="Memuat detail kertas kerja..." />
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
      <FormPage className="space-y-4 pb-0">
        <FormHeader
          title="Kertas kerja tidak ditemukan"
          description="Dokumen yang Anda cari mungkin sudah dipindahkan, tidak lagi tersedia, atau Anda tidak memiliki akses untuk melihatnya."
        />
        <CollectionEmptyState
          title="Dokumen tidak ditemukan"
          description="Kertas kerja mungkin sudah dihapus atau Anda tidak memiliki akses."
        />
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
        <Card className="rounded-2xl bg-amber-50/80 ring-1 ring-inset ring-amber-200">
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

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <StandardCard title="Ringkasan dokumen">
            <div className="grid gap-4 sm:grid-cols-2">
              {summaryItems.map((item) => (
                <InlineCard key={item.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 font-mono text-sm font-medium text-foreground">
                    {item.value}
                  </p>
                </InlineCard>
              ))}
            </div>
          </StandardCard>
          <StandardCard title="Monitoring Final">
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
                <Progress
                  value={(finalizedMonitoringCount / totalRiskCount) * 100}
                  className={cn(
                    "h-1.5",
                    isAllMonitoringFinal && "[&>[data-slot=progress-indicator]]:bg-success",
                  )}
                />
              </div>
            )}
          </StandardCard>
          <CollectionTableCard>
            <WorkingPaperMonitoringTable links={data.risks ?? []} />
          </CollectionTableCard>
        </div>

        <div>
          <StandardCard
            title="Status Tanda Tangan"
            className="sticky top-6"
          >
            <WorkingPaperSignatureTimeline timeline={viewModel.timeline} />
          </StandardCard>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog
        open={startSigningDialogOpen}
        onOpenChange={setStartSigningDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="items-start gap-0 border-b border-border/60 px-4 py-6 text-left">
            <AlertDialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Mulai proses TTE
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="px-4 py-3 text-sm leading-6 text-muted-foreground">
            Status akan diubah dari draft menjadi proses tanda tangan.
            Setelah itu, para penandatangan bisa mulai menandatangani
            dokumen ini.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setStartSigningDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <Button size="sm" onClick={handleStartSigning}>
              Mulai proses TTE
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="items-start gap-0 border-b border-border/60 px-4 py-6 text-left">
            <AlertDialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Tanda tangani kertas kerja
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="px-4 py-3 text-sm leading-6 text-muted-foreground">
            Apakah Anda yakin ingin menandatangani dokumen ini? Tindakan ini
            akan menyimpan data Anda sebagai penandatangan sah.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setSignDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <Button size="sm" onClick={handleSign}>
              Tanda Tangani
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="items-start gap-0 border-b border-border/60 px-4 py-6 text-left">
            <AlertDialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Batalkan kertas kerja
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="px-4 py-3 text-sm leading-6 text-muted-foreground">
            Apakah Anda yakin ingin membatalkan kertas kerja ini? Dokumen
            yang dibatalkan tidak dapat ditandatangani lagi.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setCancelDialogOpen(false)}>
              Kembali
            </CollectionDialogCancel>
            <Button
              size="sm"
              onClick={handleCancel}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Batalkan Dokumen
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="items-start gap-0 border-b border-border/60 px-4 py-6 text-left">
            <AlertDialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Lewati tanda tangan elektronik
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="px-4 py-3 text-sm leading-6 text-muted-foreground">
            Tindakan ini akan menyelesaikan kertas kerja tanpa tanda tangan
            elektronik dan langsung mengunci versi risiko terkait. Pastikan
            semua risiko di dalam dokumen sudah selesai diproses.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setSkipDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <Button size="sm" onClick={handleSkipTTE}>
              Lewati tanda tangan elektronik
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="items-start gap-0 border-b border-border/60 px-4 py-6 text-left">
            <AlertDialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Hapus kertas kerja
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription className="px-4 py-3 text-sm leading-6 text-muted-foreground">
            Apakah Anda yakin ingin menghapus kertas kerja ini? Tindakan ini
            tidak dapat dibatalkan.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              Ya, hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

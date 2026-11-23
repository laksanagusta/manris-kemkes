"use client";

import { DetailLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { BoundProfilePeriodNotice } from "@/components/upr/bound-profile-period-notice";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { useSetHeaderActions } from "@/lib/header-actions-context";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type { WorkingPaper } from "@/types/working-paper";
import {
  getWorkingPaper,
  startSigningWorkingPaper,
  signWorkingPaper,
  cancelWorkingPaper,
  skipTTEWorkingPaper,
  deleteWorkingPaper,
} from "@/lib/api/working-papers";
import { startMonitoring } from "@/lib/api/risk-monitoring";
import { ProfilePeriodPicker, type ProfilePeriodSelection } from "@/components/upr/profile-period-picker";
import { MonitoringDateField } from "@/components/shared/design-system/domain/monitoring-date-field";
import { defaultMonitoringDate, isValidMonitoringDate, monitoringCycleForDate } from "@/lib/monitoring-date";
import { buildWorkingPaperDetailViewModel } from "@/lib/working-paper-detail-view-model";
import { buildWorkingPaperQueueRows } from "@/lib/working-paper-monitoring-queue";
import { WorkingPaperMonitoringQueue } from "@/components/shared/design-system/domain/working-paper-monitoring-queue";
import { WorkingPaperStatusActions } from "./working-paper-status-actions";
import { WorkingPaperDetailPanel } from "@/components/shared/design-system/domain/working-paper-detail-panel";
import { WorkingPaperSigningReview } from "@/components/shared/design-system/domain/working-paper-signing-review";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AccentButton, ActionButton } from "@/components/shared/design-system";
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
} from "@/components/shared/design-system";

import { Pen } from "@/components/shared/icons";

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
      return "Belum dimulai";
    case "wrong_period":
      return "Periode tidak sesuai";
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
      return `Pemantauan belum final untuk ${items}.`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Gagal memproses KK Pemantauan dan Reviu.";
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

  const monitoringStartTrigger = useRef<HTMLButtonElement>(null);
  const [monitoringStartRiskId, setMonitoringStartRiskId] = useState<string | null>(null);
  const [monitoringObservedAt, setMonitoringObservedAt] = useState(() => defaultMonitoringDate());
  const [monitoringSelection, setMonitoringSelection] = useState<ProfilePeriodSelection | null>(null);
  const handleMonitoringSelectionChange = useCallback((selection: ProfilePeriodSelection | null) => {
    setMonitoringSelection(selection);
    if (selection?.observedAt) setMonitoringObservedAt(selection.observedAt);
  }, []);
  const [startingMonitoringId, setStartingMonitoringId] = useState<string | null>(null);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
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
      toast.success("KK Pemantauan dan Reviu berhasil diekspor.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengekspor KK Pemantauan dan Reviu.",
      );
    }
  }, [data]);

  const setHeaderActions = useSetHeaderActions();
  const headerData = !loading && !error && data?.id === id ? data : null;

  useEffect(() => {
    if (!headerData) {
      setHeaderActions(null);
      return;
    }

    if (headerData.status === "completed") {
      setHeaderActions(
        <div className="flex items-center gap-2">
          <ActionButton variant="outline" onClick={handleExport}>Unduh</ActionButton>
        </div>,
      );
      return () => setHeaderActions(null);
    }

    const headerViewModel = buildWorkingPaperDetailViewModel(headerData, user?.id);
    setHeaderActions(
      <div className="flex items-center gap-2">
        <WorkingPaperStatusActions
          canSkipTTE={headerViewModel.canSkipTTE}
          canCancel={headerViewModel.canCancel}
          canDelete={headerViewModel.canDelete}
          onSkipTTE={() => setSkipDialogOpen(true)}
          onCancel={() => setCancelDialogOpen(true)}
          onDelete={() => setDeleteDialogOpen(true)}
          onExport={handleExport}
        />
        {headerViewModel.canStartSigning && (
          <AccentButton
            disabled={!headerData.review_hash}
            onClick={() => setStartSigningDialogOpen(true)}
            icon={<Pen className="size-3.5" />}
          >
            Tinjau dan mulai TTE
          </AccentButton>
        )}
        {headerViewModel.canSign && (
          <AccentButton
            onClick={() => setSignDialogOpen(true)}
            icon={<Pen className="size-3.5" />}
          >
            Tanda Tangani
          </AccentButton>
        )}
      </div>,
    );
    return () => setHeaderActions(null);
  }, [handleExport, headerData, setHeaderActions, user?.id]);

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
          : "Gagal memuat detail KK Pemantauan dan Reviu.",
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
    if (!token || !data || isSubmittingSignature) return;
    setIsSubmittingSignature(true);
    try {
      setData(await signWorkingPaper(id, token));
      toast.success("KK Pemantauan dan Reviu berhasil ditandatangani.");
      setSignDialogOpen(false);
    } catch (err) {
      toast.error(formatSigningError(err));
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const handleStartSigning = async () => {
    if (!token || !data?.review_hash || isSubmittingSignature) return;
    setIsSubmittingSignature(true);
    try {
      setData(await startSigningWorkingPaper(id, token, data.review_hash));
      toast.success("Proses tanda tangan dimulai.");
      setStartSigningDialogOpen(false);
    } catch (err) {
      toast.error(formatSigningError(err));
      setStartSigningDialogOpen(false);
      void loadData();
    } finally {
      setIsSubmittingSignature(false);
    }
  };

  const handleStartMonitoring = async (riskId: string) => {
    const cycle = data?.assessment_cycle;
    if (!token || !cycle || !monitoringSelection || startingMonitoringId) return;
    setStartingMonitoringId(riskId);
    try {
      const result = await startMonitoring(token, riskId, monitoringObservedAt,
        monitoringSelection.monitoringPeriodId ? {
          profileVersionId: monitoringSelection.profileVersionId,
          monitoringPeriodId: monitoringSelection.monitoringPeriodId,
        } : undefined,
      );
      setMonitoringStartRiskId(null);
      const returnTo = encodeURIComponent(`/risk/working-papers/${id}`);
      router.push(`/risk/monitoring/${encodeURIComponent(result.monitoring.id)}?returnTo=${returnTo}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pemantauan belum dapat dimulai.");
    } finally {
      setStartingMonitoringId(null);
    }
  };

  const handleSkipTTE = async () => {
    if (!token || !data) return;
    try {
      await skipTTEWorkingPaper(id, token);
      toast.success("Tanda tangan elektronik dilewati dan KK Pemantauan dan Reviu diselesaikan.");
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
      toast.success("KK Pemantauan dan Reviu berhasil dibatalkan.");
      setCancelDialogOpen(false);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membatalkan KK Pemantauan dan Reviu.",
      );
    }
  };

  const handleDelete = async () => {
    if (!token || !data) return;
    try {
      await deleteWorkingPaper(id, token);
      toast.success("KK Pemantauan dan Reviu berhasil dihapus.");
      setDeleteDialogOpen(false);
      router.push("/risk/working-papers");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus KK Pemantauan dan Reviu.",
      );
    }
  };

  if (loading) {
    return <PageLoadingSkeleton><DetailLoadingSkeleton message="Memuat detail KK Pemantauan dan Reviu…" /></PageLoadingSkeleton>;
  }

  if (error) {
    return (
      <FormPage className="space-y-6 pb-8">
        <FormHeader
          title="Detail KK Pemantauan dan Reviu belum tersedia"
        />
        <CollectionErrorState
          title="Gagal memuat KK Pemantauan dan Reviu"
          message={error}
          onReload={() => loadData()}
        />
      </FormPage>
    );
  }

  if (!data) {
    return (
      <FormPage className="space-y-6 pb-8">
        <FormHeader
          title="KK Pemantauan dan Reviu tidak ditemukan"
        />
        <CollectionEmptyState
          title="Dokumen tidak ditemukan"
          description="KK Pemantauan dan Reviu mungkin sudah dihapus atau Anda tidak memiliki akses."
        />
      </FormPage>
    );
  }

  const { status } = data;
  const viewModel = buildWorkingPaperDetailViewModel(data, user?.id);


  const monitoringBlockers = status === "draft" || status === "signing" ? viewModel.monitoringBlockers : [];
  const currentAction = monitoringBlockers.length ? null : viewModel.currentAction;
  const queueRows = buildWorkingPaperQueueRows(data, monitoringBlockers);

  function openMonitoringStart(riskId: string, trigger: HTMLButtonElement) {
    if (!data) return;
    monitoringStartTrigger.current = trigger;
    setMonitoringObservedAt(data.observation_cutoff || defaultMonitoringDate(data.assessment_cycle));
    setMonitoringSelection(data.profile_version_id && data.monitoring_period_id ? {
      profileVersionId: data.profile_version_id,
      monitoringPeriodId: data.monitoring_period_id,
    } : null);
    setMonitoringStartRiskId(riskId);
  }

  return (
    <FormPage className="space-y-6 pb-8">
      {currentAction?.tone === "success" && (
        <Alert variant="success" role="status" className="gap-1">
          <AlertTitle className="text-green-800 dark:text-green-400">{currentAction.title}</AlertTitle>
          <AlertDescription className="space-y-1">
            <span className="block">{currentAction.description}</span>
            {data.content_locked && (
              <span className="block">Isi dikunci saat TTE dimulai dan digunakan untuk tanda tangan serta unduhan.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {currentAction && currentAction.tone !== "success" && (
        <Card>
          <CardContent className="space-y-2">
            <div role="status">
              <p className="font-semibold">{currentAction.title}</p>
              <p className="text-sm text-muted-foreground">{currentAction.description}</p>
              {data.content_locked && (
                <p className="mt-1 text-sm text-muted-foreground">Isi dikunci saat TTE dimulai dan digunakan untuk tanda tangan serta unduhan.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <WorkingPaperMonitoringQueue
            rows={queueRows}
            readiness={monitoringBlockers.length ? `${monitoringBlockers.length} risiko perlu finalisasi sebelum tanda tangan.` : undefined}
            starting={Boolean(startingMonitoringId)}
            onStart={openMonitoringStart}
          />
        </div>

        <aside aria-label="Rincian KK Pemantauan dan Reviu" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <WorkingPaperDetailPanel
            paper={data}
            timeline={viewModel.timeline}
            periodDetails={data.monitoring_period_id && (
              <BoundProfilePeriodNotice token={token} profileId={data.profile_version_id} periodId={data.monitoring_period_id} />
            )}
          />
        </aside>
      </div>

      {/* Dialogs */}
      <AlertDialog
        open={startSigningDialogOpen}
        onOpenChange={(open) => { if (!isSubmittingSignature) setStartSigningDialogOpen(open); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tinjau KK Pemantauan dan Reviu sebelum TTE
            </AlertDialogTitle>
            <AlertDialogDescription>Periksa periode, risiko, dan urutan penandatangan.</AlertDialogDescription>
          </AlertDialogHeader>
          <WorkingPaperSigningReview
            cutoff={data.observation_cutoff}
            period={data.assessment_cycle}
            riskCount={data.risks?.length ?? 0}
            signatories={data.signatories}
          />
          <AlertDialogFooter>
            <CollectionDialogCancel disabled={isSubmittingSignature} onClick={() => setStartSigningDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="default" size="default" disabled={isSubmittingSignature || !data.review_hash} onClick={(event) => {
              event.preventDefault();
              void handleStartSigning();
            }}>
              {isSubmittingSignature ? "Memulai…" : "Mulai proses TTE"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(monitoringStartRiskId)} onOpenChange={(open) => { if (!open && !startingMonitoringId) setMonitoringStartRiskId(null); }}>
        <AlertDialogContent onCloseAutoFocus={(event) => {
          event.preventDefault();
          monitoringStartTrigger.current?.focus();
        }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai pemantauan</AlertDialogTitle>
            <AlertDialogDescription>{data.observation_cutoff ? `Isi tanggal pengamatan paling lambat ${data.observation_cutoff}.` : `Isi tanggal pengamatan dalam periode ${data.assessment_cycle}.`}</AlertDialogDescription>
          </AlertDialogHeader>
          {monitoringStartRiskId && token && !(data.profile_version_id && data.monitoring_period_id) && (
            <ProfilePeriodPicker token={token} organizationId={data.org_id} process="monitoring"
              initialProfileId={data.profile_version_id}
              riskGroupId={data.risks.find(link => link.source_risk_id === monitoringStartRiskId || link.risk_id === monitoringStartRiskId)?.version_group_id}
              onChange={handleMonitoringSelectionChange} />
          )}
          <MonitoringDateField id="working-paper-observation-date" value={monitoringObservedAt} onChange={setMonitoringObservedAt} disabled={Boolean(startingMonitoringId)} />
          <AlertDialogFooter>
            <CollectionDialogCancel disabled={Boolean(startingMonitoringId)} onClick={() => setMonitoringStartRiskId(null)}>Batal</CollectionDialogCancel>
            <AlertDialogAction disabled={Boolean(startingMonitoringId) || !monitoringSelection || !isValidMonitoringDate(monitoringObservedAt) || (data.observation_cutoff ? monitoringObservedAt > data.observation_cutoff : monitoringCycleForDate(monitoringObservedAt) !== data.assessment_cycle)} onClick={(event) => {
              event.preventDefault();
              if (monitoringStartRiskId) void handleStartMonitoring(monitoringStartRiskId);
            }}>{startingMonitoringId ? "Membuka…" : "Mulai pemantauan"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={signDialogOpen} onOpenChange={(open) => { if (!isSubmittingSignature) setSignDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tanda tangani KK Pemantauan dan Reviu
            </AlertDialogTitle>
            <AlertDialogDescription>Periksa dokumen sebelum mencatat tanda tangan.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences variant="plain">
            Tanda tangan Anda dicatat sesuai urutan penandatangan.
          </ConfirmationConsequences>
          <AlertDialogFooter>
            <CollectionDialogCancel disabled={isSubmittingSignature} onClick={() => setSignDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="default" size="default" disabled={isSubmittingSignature} onClick={(event) => {
              event.preventDefault();
              void handleSign();
            }}>
              {isSubmittingSignature ? "Menandatangani…" : "Tanda Tangani"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Batalkan KK Pemantauan dan Reviu
            </AlertDialogTitle>
            <AlertDialogDescription>Periksa dokumen yang akan dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            KK Pemantauan dan Reviu akan berstatus dibatalkan dan tidak dapat ditandatangani lagi.
          </ConfirmationConsequences>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setCancelDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction
              variant="default"
              size="default"
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
            <AlertDialogDescription>Periksa dokumen sebelum menyelesaikannya tanpa TTE.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            Tindakan ini akan menyelesaikan KK Pemantauan dan Reviu tanpa tanda tangan
              elektronik dan langsung mengunci versi risiko terkait. Pastikan
              semua risiko di dalam dokumen sudah selesai diproses.
          </ConfirmationConsequences>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setSkipDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="default" size="default" onClick={handleSkipTTE}>
              Lewati tanda tangan elektronik
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus KK Pemantauan dan Reviu
            </AlertDialogTitle>
            <AlertDialogDescription>Periksa dokumen yang akan dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            KK Pemantauan dan Reviu beserta isi dokumennya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </ConfirmationConsequences>
          <AlertDialogFooter>
            <CollectionDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <AlertDialogAction variant="destructive" size="default" onClick={handleDelete}>
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

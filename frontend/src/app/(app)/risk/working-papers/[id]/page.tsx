"use client";

import { DetailLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { BoundProfilePeriodNotice } from "@/components/upr/bound-profile-period-notice";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { businessNow } from "@/lib/business-clock";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { PropertyList, PropertyLabel } from "@/components/shared/design-system/layout/property-list";

import { DetailSidePanel } from "@/components/shared/design-system/layout/detail-side-panel";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type { WorkingPaper, WorkingPaperRiskLink, WorkingPaperStatus } from "@/types/working-paper";
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
import { WorkingPaperMonitoringTable } from "./working-paper-monitoring-table";
import { WorkingPaperStatusActions } from "./working-paper-status-actions";
import { WorkingPaperSignatureTimeline } from "./working-paper-signature-timeline";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChartContainer } from "@/components/ui/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
  AccentButton,
  ActionButton,
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
} from "@/components/shared/design-system";

import { cn } from "@/lib/utils";
import { CheckCircle2, Pen } from "@/components/shared/icons";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";


const dateFormatter = createDisplayDateFormatter("id-ID", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateTimeFormatter = createDisplayDateFormatter("id-ID", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabel: Record<WorkingPaperStatus, string> = {
  draft: "Draf",
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
  const showDownloadInTopbar = !loading && !error && data?.id === id && data.status === "completed";

  useEffect(() => {
    if (!showDownloadInTopbar) return;

    setHeaderActions(
      <AccentButton onClick={handleExport}>Unduh KK Pemantauan dan Reviu</AccentButton>,
    );
    return () => setHeaderActions(null);
  }, [handleExport, setHeaderActions, showDownloadInTopbar]);

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
      <FormPage className="space-y-6 pb-0">
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
      <FormPage className="space-y-6 pb-0">
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

  const totalRiskCount = data.risks?.length || 0;
  const finalizedMonitoringCount =
    data.risks?.filter((link) => link.risk.monitoring?.status === "final")
      .length || 0;
  const finalizedMonitoringPercentage =
    totalRiskCount > 0
      ? Math.round((finalizedMonitoringCount / totalRiskCount) * 100)
      : 0;
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
      label: "Tanggal batas pengamatan",
      value: data.observation_cutoff ? formatDate(data.observation_cutoff) : "Belum tercatat",
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


  const monitoringBlockers = status === "draft" || status === "signing" ? viewModel.monitoringBlockers : [];
  const currentAction = viewModel.currentAction;

  const renderMonitoringBlocker = (link: WorkingPaperRiskLink) => {
    const monitoring = link.risk.monitoring;
    const matchingMonitoring = data.profile_version_id || monitoring?.assessmentCycle === data.assessment_cycle ? monitoring : undefined;
    const riskId = link.source_risk_id && link.source_risk_id !== "00000000-0000-0000-0000-000000000000" ? link.source_risk_id : link.risk_id;
    const monitoringHref = matchingMonitoring?.id
      ? `/risk/monitoring/${encodeURIComponent(matchingMonitoring.id)}?returnTo=${encodeURIComponent(`/risk/working-papers/${id}`)}`
      : null;
    const label = matchingMonitoring?.status === "draft" ? "Draf pemantauan" : "Belum dimulai";
    return (
      <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2">
        <div className="min-w-0">
          <p className="font-medium">{link.risk.code} · {link.risk.title}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        {monitoringHref ? (
          <ActionButton asChild size="sm" variant="outline">
            <Link href={monitoringHref}>Buka draf Pemantauan</Link>
          </ActionButton>
        ) : (
          <ActionButton type="button" size="sm" variant="outline" onClick={() => {
            setMonitoringObservedAt(data.observation_cutoff || defaultMonitoringDate(data.assessment_cycle));
            setMonitoringSelection(data.profile_version_id && data.monitoring_period_id ? {
              profileVersionId: data.profile_version_id,
              monitoringPeriodId: data.monitoring_period_id,
            } : null);
            setMonitoringStartRiskId(riskId);
          }} disabled={Boolean(startingMonitoringId)}>Mulai Pemantauan</ActionButton>
        )}
      </li>
    );
  };

  const headerActions = (
    <>
      <WorkingPaperStatusActions
        canSkipTTE={viewModel.canSkipTTE}
        canCancel={viewModel.canCancel}
        canDelete={viewModel.canDelete}
        onSkipTTE={() => setSkipDialogOpen(true)}
        onCancel={() => setCancelDialogOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
        onExport={status === "completed" ? undefined : handleExport}
      />
      {viewModel.canStartSigning && (
        <AccentButton
          disabled={!data.review_hash}
          onClick={() => setStartSigningDialogOpen(true)}
          icon={<Pen className="size-3.5" />}
        >
          Tinjau dan mulai TTE
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
        title={data.code || "Detail KK Pemantauan dan Reviu"}
        actions={status === "completed" ? undefined : headerActions}
      />

      {currentAction?.tone === "success" && (
        <Alert variant="success" role="status">
          <CheckCircle2 aria-hidden="true" />
          <AlertTitle>{currentAction.title}</AlertTitle>
          <AlertDescription>
            {currentAction.description}
            {data.content_locked && (
              <p className="mt-1">Isi dikunci saat TTE dimulai dan digunakan untuk tanda tangan serta unduhan.</p>
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
            {monitoringBlockers.length > 0 && (
              <ul className="pt-1 text-sm">{monitoringBlockers.map(renderMonitoringBlocker)}</ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <CollectionTableCard>
            <WorkingPaperMonitoringTable links={data.risks ?? []} />
          </CollectionTableCard>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <DetailSidePanel>
                <section aria-labelledby="working-paper-summary-properties">
                  <h2
                    id="working-paper-summary-properties"
                    className="text-sm font-semibold capitalize text-primary"
                  >
                    Properti
                  </h2>
                  <PropertyList>
                    {summaryItems.map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4"
                      >
                        <PropertyLabel>{label}</PropertyLabel>
                        <dd
                          className={cn(
                            "max-w-[60%] break-words text-right text-foreground",
                            (label === "Kode" || label.endsWith("pada")) && "font-mono tabular-nums",
                          )}
                        >
                          {label === "Status" ? (
                            <Badge variant={toBadgeVariant(statusTone[status])} className={getStatusBadgeClassName(statusTone[status])}>
                              {value}
                            </Badge>
                          ) : (
                            value
                          )}
                        </dd>
                      </div>
                    ))}
                  </PropertyList>
                  {data.monitoring_period_id && <div className="mt-3">
                    <BoundProfilePeriodNotice token={token} profileId={data.profile_version_id} periodId={data.monitoring_period_id} />
                  </div>}
                </section>

                <section
                  aria-labelledby="working-paper-monitoring-progress"
                  className="border-t border-dashed border-border pt-5"
                >
                  <h2
                    id="working-paper-monitoring-progress"
                    className="text-sm font-semibold capitalize text-primary"
                  >
                    Progres Pemantauan
                  </h2>
                  <div className="mt-3">
                    {totalRiskCount > 0 ? (
                      <div className="flex items-center gap-4">
                        <div
                          className="relative size-[88px] shrink-0"
                          role="img"
                          aria-label={`${finalizedMonitoringPercentage}% selesai dipantau, ${finalizedMonitoringCount} dari ${totalRiskCount} risiko`}
                        >
                          <ChartContainer
                            config={{
                              completion: {
                                label: "Selesai dipantau",
                                color: isAllMonitoringFinal
                                  ? "var(--color-success)"
                                  : "var(--primary)",
                              },
                            }}
                            initialDimension={{ width: 88, height: 88 }}
                            className="size-[88px] aspect-square"
                            aria-hidden="true"
                          >
                            <RadialBarChart
                              data={[
                                {
                                  name: "Selesai dipantau",
                                  value: finalizedMonitoringPercentage,
                                },
                              ]}
                              startAngle={90}
                              endAngle={-270}
                              innerRadius="78%"
                              outerRadius="96%"
                              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                            >
                              <PolarAngleAxis
                                type="number"
                                domain={[0, 100]}
                                tick={false}
                                axisLine={false}
                              />
                              <RadialBar
                                dataKey="value"
                                fill="var(--color-completion)"
                                background={{ fill: "var(--muted)" }}
                                cornerRadius={8}
                              />
                            </RadialBarChart>
                          </ChartContainer>
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums text-foreground"
                          >
                            {finalizedMonitoringPercentage}%
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-5 text-secondary-foreground">
                            {finalizedMonitoringCount} dari {totalRiskCount} Risiko
                            Selesai Dipantau
                          </p>
                        </div>
                      </div>
                    ) : (
                      <CollectionEmptyState
                        title="Belum ada risiko di dalam KK Pemantauan dan Reviu."
                        description="Risiko yang ditambahkan ke KK Pemantauan dan Reviu akan muncul di sini."
                        className="py-3"
                      />
                    )}
                  </div>
                </section>

                <section
                  aria-labelledby="working-paper-signature-history"
                  className="border-t border-dashed border-border pt-5"
                >
                  <h2
                    id="working-paper-signature-history"
                    className="text-sm font-semibold capitalize text-primary"
                  >
                    Histori Tanda Tangan
                  </h2>
                  <div className="mt-3">
                    <WorkingPaperSignatureTimeline
                      timeline={viewModel.timeline}
                    />
                  </div>
                </section>
          </DetailSidePanel>
        </div>
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
          <ConfirmationConsequences>
            Setelah TTE dimulai, hasil Pemantauan dan isi KK Pemantauan dan Reviu dikunci untuk semua penandatangan.
          </ConfirmationConsequences>
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-muted-foreground">{data.observation_cutoff ? "Tanggal batas pengamatan" : "Periode"}</dt><dd className="font-medium">{data.observation_cutoff ? formatDate(data.observation_cutoff) : data.assessment_cycle}</dd></div>
              <div><dt className="text-muted-foreground">Risiko disertakan</dt><dd className="font-medium">{totalRiskCount}</dd></div>
            </dl>
            <div>
              <p className="font-medium">Urutan penandatangan</p>
              <ol className="mt-1 max-h-40 list-decimal space-y-1 overflow-y-auto ps-5">
                {[...data.signatories].sort((a, b) => a.sequence_no - b.sequence_no).map((signatory) => (
                  <li key={signatory.id}>{signatory.signer_name}</li>
                ))}
              </ol>
            </div>
          </div>
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
        <AlertDialogContent>
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
          <ConfirmationConsequences>
            Identitas Anda akan dicatat sebagai penandatangan sah dokumen ini. Progres tanda tangan akan dilanjutkan sesuai urutan penandatangan.
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

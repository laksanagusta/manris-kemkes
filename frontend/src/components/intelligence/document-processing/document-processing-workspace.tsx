"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import {
  AlertTriangle,
  XCircle,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageStack } from "@/components/shared/design-system";
import { cn } from "@/lib/utils";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import type { DocumentAnalysisMode } from "@/types/document-intelligence";
import type {
  Finding,
  ProcessingJob,
  ProcessingRunController,
  ProcessingStatus,
  UploadedDocument,
} from "@/types/document-processing";
import { FindingsReviewPanel } from "./completed-results";
import { createDocumentProcessingApiAdapter } from "@/lib/document-processing/api-adapter";
import { saveProcessingJob } from "@/lib/document-processing/storage";
import { UploadPanel } from "./upload-panel";
import { revokeDocumentPreview, validateFiles } from "./upload-utils";
import type { FileIssue } from "./types";

type ModeOption = {
  value: DocumentAnalysisMode;
  title: string;
  description: string;
};

const modeOptions: ModeOption[] = [
  {
    value: "sop_risk_universe",
    title: "SOP",
    description: "Temukan risiko, kontrol, dan langkah proses dari SOP.",
  },
  {
    value: "mitigation_report_mapper",
    title: "Laporan Mitigasi",
    description: "Petakan realisasi mitigasi, bukti, dan status tindak lanjut.",
  },
];

function isTerminal(status?: ProcessingStatus) {
  return status === "completed" || status === "partial" || status === "failed" || status === "cancelled";
}

function statusMeta(status: ProcessingStatus) {
  if (status === "completed") return { label: "Selesai", tone: "success" as const };
  if (status === "partial") return { label: "Sebagian selesai", tone: "warning" as const };
  if (status === "failed") return { label: "Gagal", tone: "danger" as const };
  if (status === "cancelled") return { label: "Dibatalkan", tone: "neutral" as const };
  if (status === "processing") return { label: "Diproses", tone: "progress" as const };
  return { label: "Dalam antrean", tone: "neutral" as const };
}

function relativeStart(date?: string) {
  if (!date) return "belum dimulai";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000));
  return minutes < 1 ? "baru saja" : `${minutes} mnt lalu`;
}

export function DocumentProcessingWorkspace({
  authToken,
  organizationId,
  onUseRiskDraft,
}: {
  authToken?: string;
  organizationId?: string;
  onUseRiskDraft: (finding: Finding) => void;
}) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [issues, setIssues] = useState<FileIssue[]>([]);
  const [currentJob, setCurrentJob] = useState<ProcessingJob>();
  const [mode, setMode] = useState<DocumentAnalysisMode>("sop_risk_universe");
  const [period, setPeriod] = useState(currentAssessmentCycle());
  const [dragActive, setDragActive] = useState(false);
  const [offline, setOffline] = useState(false);
  const reduceMotion = useReducedMotion();

  const adapter = useMemo(
    () => createDocumentProcessingApiAdapter({ token: authToken, organizationId }),
    [authToken, organizationId],
  );
  const activeJobIdRef = useRef<string | undefined>(undefined);
  const controllersRef = useRef(new Map<string, ProcessingRunController>());
  const statusByJobRef = useRef(new Map<string, ProcessingStatus>());
  const findingsRef = useRef<HTMLDivElement | null>(null);
  const previousJobStatusRef = useRef<ProcessingStatus | undefined>(undefined);

  const updateJob = useCallback(
    (nextJob: ProcessingJob) => {
      const previousStatus = statusByJobRef.current.get(nextJob.id);
      statusByJobRef.current.set(nextJob.id, nextJob.status);
      if (activeJobIdRef.current === nextJob.id) {
        setCurrentJob(nextJob);
      }
      if (isTerminal(nextJob.status)) {
        controllersRef.current.delete(nextJob.id);
        saveProcessingJob(nextJob);
      }
      if (isTerminal(nextJob.status) && !isTerminal(previousStatus)) {
        setDocuments((previous) => {
          previous.forEach(revokeDocumentPreview);
          return [];
        });
        setIssues([]);
      }
    },
    [],
  );

  useEffect(() => {
    const nextStatus = currentJob?.status;
    const previousStatus = previousJobStatusRef.current;
    previousJobStatusRef.current = nextStatus;

    if (!currentJob || !isTerminal(nextStatus) || !previousStatus || isTerminal(previousStatus)) return;

    const frame = window.requestAnimationFrame(() => {
      findingsRef.current?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentJob]);

  useEffect(() => {
    const handleOffline = () => setOffline(true);
    const handleOnline = () => setOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const currentStatus = currentJob ? statusMeta(currentJob.status) : undefined;
  const terminalState = Boolean(currentJob && isTerminal(currentJob.status));

  function addFiles(files: File[]) {
    const result = validateFiles(files, documents);
    if (result.documents.length) setDocuments((previous) => [...previous, ...result.documents]);
    if (result.issues.length) setIssues((previous) => [...previous, ...result.issues]);
    if (result.documents.length) toast.success(`${result.documents.length} file ditambahkan untuk dianalisis.`);
  }

  function removeDocument(documentId: string) {
    const removed = documents.find((document) => document.id === documentId);
    if (removed) revokeDocumentPreview(removed);
    setDocuments((previous) => previous.filter((document) => document.id !== documentId));
  }

  function startProcessing() {
    if (!authToken) {
      toast.error("Sesi Anda telah berakhir. Masuk kembali untuk menganalisis dokumen.");
      return;
    }
    const validDocuments = documents.filter((document) => !document.error);
    if (!validDocuments.length) {
      toast.error("Tambahkan minimal satu file yang valid.");
      return;
    }
    const job = adapter.createJob({
      documents: validDocuments,
      mode,
      period: period.trim() || undefined,
    });
    activeJobIdRef.current = job.id;
    statusByJobRef.current.set(job.id, job.status);
    setCurrentJob(job);
    updateJob(job);
    controllersRef.current.set(job.id, adapter.run(job, updateJob));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) {
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("input[data-document-picker]")?.click();
      }
      if (event.key === "Enter" && (!currentJob || terminalState) && documents.some((item) => !item.error)) {
        event.preventDefault();
        startProcessing();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function startNewProcess() {
    if (currentJob && ["processing", "queued"].includes(currentJob.status)) {
      const confirmed = window.confirm("Proses aktif masih berjalan. Mulai proses baru tanpa membatalkannya?");
      if (!confirmed) return;
    }
    activeJobIdRef.current = undefined;
    setCurrentJob(undefined);
    setDocuments((previous) => {
      previous.forEach(revokeDocumentPreview);
      return [];
    });
    setIssues([]);
    setPeriod(currentAssessmentCycle());
  }

  function cancelProcessing() {
    if (!currentJob || !["processing", "queued"].includes(currentJob.status)) return;
    if (!window.confirm("Batalkan proses aktif? Progress yang sudah selesai akan tetap disimpan.")) return;
    controllersRef.current.get(currentJob.id)?.cancel();
    toast.message("Proses dibatalkan. Progress yang selesai tetap tersimpan.");
  }

  return (
    <PageStack>
      <main className="mx-auto w-full max-w-3xl min-w-0 space-y-8 py-2 sm:py-5">
        <AnimatePresence initial={false}>
          {offline ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.15, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-foreground"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              Koneksi terputus. Proses membutuhkan koneksi ke server; periksa koneksi sebelum memulai analisis.
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mb-8 max-w-2xl space-y-2 sm:mb-10">
          <h2 className="text-base font-medium tracking-[-0.015em] text-foreground">
            Analisis dokumen menjadi temuan risiko
          </h2>
          <p className="text-sm leading-6 text-secondary-foreground">
            Unggah satu dokumen. Manris akan mengelompokkan halaman dan menghubungkan temuan dengan sumbernya.
          </p>
        </div>

        <fieldset className="space-y-3" aria-labelledby="analysis-mode-label" disabled={Boolean(currentJob && !terminalState)}>
          <legend id="analysis-mode-label" className="text-sm font-medium text-foreground">
            Mode analisis
          </legend>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as DocumentAnalysisMode)}
            aria-labelledby="analysis-mode-label"
            className="grid gap-3 sm:grid-cols-2"
          >
            {modeOptions.map((option) => {
              const selected = mode === option.value;

              return (
                <label
                  key={option.value}
                  htmlFor={`analysis-mode-${option.value}`}
                  className={cn(
                    "group relative flex min-h-[88px] cursor-pointer items-start rounded-xl border bg-card px-4 py-4 pr-12 text-left transition-[background-color,border-color] duration-200 ease-(--ease-out) motion-reduce:transition-none sm:px-5 sm:pr-14",
                    selected
                      ? "border-primary"
                      : "border-border bg-card hover:border-foreground/20 hover:bg-state-surface",
                    currentJob && !terminalState && "cursor-not-allowed opacity-60",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-5 text-foreground">{option.title}</span>
                    <span className="mt-1 block text-sm leading-5 text-muted-foreground">{option.description}</span>
                  </span>
                  <RadioGroupItem
                    id={`analysis-mode-${option.value}`}
                    value={option.value}
                    aria-label={option.title}
                    className="absolute right-4 top-4 size-5 border-2 border-border bg-transparent text-primary after:-inset-3 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 data-checked:border-primary data-checked:bg-primary sm:right-5 sm:top-5"
                  />
                </label>
              );
            })}
          </RadioGroup>
        </fieldset>

        <div className="pt-2">
          <UploadPanel
            documents={documents}
            issues={issues}
            dragActive={dragActive}
            onFiles={addFiles}
            onRemove={removeDocument}
            onDragActive={setDragActive}
            onStart={startProcessing}
            processing={Boolean(currentJob && !terminalState)}
          />
        </div>

        {currentJob && !terminalState ? <ProcessingStatus job={currentJob} status={currentStatus} onCancel={cancelProcessing} /> : null}
        {terminalState && currentJob ? (
          <div ref={findingsRef}>
            <FindingsReviewPanel
              job={currentJob}
              onUseRiskDraft={onUseRiskDraft}
              onStartNew={startNewProcess}
            />
          </div>
        ) : null}
      </main>
    </PageStack>
  );
}

function ProcessingStatus({
  job,
  status,
  onCancel,
}: {
  job: ProcessingJob;
  status?: ReturnType<typeof statusMeta>;
  onCancel: () => void;
}) {
  const completedTasks = job.tasks.filter((task) => task.status === "completed" || task.status === "warning").length;
  return (
    <section className="document-processing-status-enter rounded-xl border border-border/80 bg-card p-4" aria-labelledby="processing-status-title" aria-busy="true">
      <p className="sr-only" role="status" aria-live="polite">
        {status?.label ?? "Diproses"}. {completedTasks} dari {job.tasks.length} tugas selesai. Progres {job.progress} persen.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="processing-status-title" className="text-sm font-semibold text-foreground">Analisis sedang diproses</h2>
            <Badge variant="outline" tone={status?.tone ?? "progress"} className="text-xs">{status?.label ?? "Diproses"}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {processStage(job)} · {completedTasks}/{job.tasks.length} tugas selesai · dimulai {relativeStart(job.startedAt)}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onCancel}>
          <XCircle className="size-3.5" />
          Batalkan proses
        </Button>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progres keseluruhan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress}>
        <div
          className="h-full w-full rounded-full bg-primary transition-transform duration-200 ease-(--ease-out) motion-reduce:transition-none"
          style={{ transform: `scaleX(${job.progress / 100})`, transformOrigin: "left" }}
        />
      </div>
    </section>
  );
}

function processStage(job: ProcessingJob) {
  if (job.status === "completed") return "Selesai";
  if (job.status === "partial") return "Selesai dengan peninjauan";
  if (job.status === "failed") return "Gagal";
  if (job.status === "cancelled") return "Dibatalkan";
  const runningTask = job.tasks.find((task) => task.status === "running");
  if (!runningTask) return "Menyiapkan";
  if (runningTask.id === "analyze-document") return "Menganalisis dokumen";
  if (runningTask.id === "extract-content") return "Mengindeks";
  if (runningTask.id === "build-index") return "Mengindeks";
  if (runningTask.id === "detect-types") return "Menganalisis";
  if (runningTask.id === "cross-reference") return "Menghubungkan referensi";
  if (runningTask.id === "check-inconsistencies") return "Menganalisis";
  return "Menyusun hasil";
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ClipboardCheck,
  FileText,
  PanelLeftIcon,
  XCircle,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";
import { cn } from "@/lib/utils";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import type { DocumentAnalysisMode } from "@/types/document-intelligence";
import type {
  Finding,
  ProcessingAdapter,
  ProcessingJob,
  ProcessingRunController,
  ProcessingStatus,
  UploadedDocument,
} from "@/types/document-processing";
import { CompletedResults } from "./completed-results";
import { HistoryPanel } from "./history-panel";
import { Inspector } from "./inspector";
import { ActivityTimeline, TaskLanes } from "./processing-activity";
import { SpatialIndex } from "./spatial-index";
import {
  createDocumentProcessingAdapter,
  deleteProcessingJob,
  loadProcessingJobs,
  renameProcessingJob,
  saveProcessingJob,
} from "@/lib/document-processing/mock-adapter";
import { UploadPanel } from "./upload-panel";
import { revokeDocumentPreview, validateFiles } from "./upload-utils";
import type { FileIssue } from "./types";

type ModeOption = {
  value: DocumentAnalysisMode;
  title: string;
  description: string;
  icon: "document" | "check";
};

const modeOptions: ModeOption[] = [
  {
    value: "sop_risk_universe",
    title: "SOP",
    description: "Temukan risiko, kontrol, dan langkah proses dari SOP.",
    icon: "document",
  },
  {
    value: "mitigation_report_mapper",
    title: "Laporan Mitigasi",
    description: "Petakan realisasi mitigasi, bukti, dan status tindak lanjut.",
    icon: "check",
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

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DocumentProcessingWorkspace({
  onRunLegacyAnalysis,
  onUseRiskDraft,
}: {
  onRunLegacyAnalysis?: (file: File, mode: DocumentAnalysisMode, period?: string) => void;
  onUseRiskDraft: (finding: Finding) => void;
}) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [issues, setIssues] = useState<FileIssue[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [currentJob, setCurrentJob] = useState<ProcessingJob>();
  const [activeJobId, setActiveJobId] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<DocumentAnalysisMode>("sop_risk_universe");
  const [period, setPeriod] = useState(currentAssessmentCycle());
  const [dragActive, setDragActive] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [isDesktop, setIsDesktop] = useState(true);
  const [offline, setOffline] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>();
  const [selectedPageId, setSelectedPageId] = useState<string>();
  const [selectedFindingId, setSelectedFindingId] = useState<string>();
  const [zoom, setZoom] = useState(1);

  const adapterRef = useRef<ProcessingAdapter>(createDocumentProcessingAdapter());
  const activeJobIdRef = useRef<string | undefined>(undefined);
  const controllersRef = useRef(new Map<string, ProcessingRunController>());
  const statusByJobRef = useRef(new Map<string, ProcessingStatus>());
  const legacyTriggeredRef = useRef(new Set<string>());
  const documentsRef = useRef<UploadedDocument[]>([]);

  const updateJob = useCallback(
    (nextJob: ProcessingJob) => {
      const previousStatus = statusByJobRef.current.get(nextJob.id);
      statusByJobRef.current.set(nextJob.id, nextJob.status);
      saveProcessingJob(nextJob);
      setJobs((previous) => [nextJob, ...previous.filter((job) => job.id !== nextJob.id)].slice(0, 12));
      if (activeJobIdRef.current === nextJob.id) {
        setCurrentJob(nextJob);
      }
      if (isTerminal(nextJob.status)) controllersRef.current.delete(nextJob.id);
      if (onRunLegacyAnalysis && ["completed", "partial"].includes(nextJob.status) && previousStatus === "processing" && !legacyTriggeredRef.current.has(nextJob.id)) {
        const sourceFile = documentsRef.current.find((document) => document.file)?.file;
        if (sourceFile) {
          legacyTriggeredRef.current.add(nextJob.id);
          onRunLegacyAnalysis(sourceFile, nextJob.mode as DocumentAnalysisMode, nextJob.period);
        }
      }
    },
    [onRunLegacyAnalysis],
  );

  useEffect(() => {
    const storedJobs = loadProcessingJobs();
    // Browser-only persistence is hydrated after the first render to keep SSR markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobs(storedJobs);
    storedJobs.forEach((job) => statusByJobRef.current.set(job.id, job.status));
    const resumable = storedJobs.find((job) => job.status === "processing" || job.status === "queued");
    if (resumable) {
      activeJobIdRef.current = resumable.id;
      setActiveJobId(resumable.id);
      setCurrentJob(resumable);
      setSelectedDocumentId(resumable.documents[0]?.id);
      controllersRef.current.set(resumable.id, adapterRef.current.run(resumable, updateJob));
    }
  }, [updateJob]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

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

  const selectedFinding = currentJob?.findings.find((finding) => finding.id === selectedFindingId);
  const currentStatus = currentJob ? statusMeta(currentJob.status) : undefined;

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
    const validDocuments = documents.filter((document) => !document.error);
    if (!validDocuments.length) {
      toast.error("Tambahkan minimal satu file yang valid.");
      return;
    }
    const job = adapterRef.current.createJob({
      documents: validDocuments,
      mode,
      period: period.trim() || undefined,
    });
    activeJobIdRef.current = job.id;
    statusByJobRef.current.set(job.id, job.status);
    setActiveJobId(job.id);
    setCurrentJob(job);
    setSelectedDocumentId(job.documents[0]?.id);
    setSelectedPageId(undefined);
    setSelectedFindingId(undefined);
    setZoom(1);
    updateJob(job);
    controllersRef.current.set(job.id, adapterRef.current.run(job, updateJob));
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) {
        if (event.key === "Escape" && inspectorOpen) setInspectorOpen(false);
        return;
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>("input[data-document-picker]")?.click();
      }
      if (event.key === "Enter" && !currentJob && documents.some((item) => !item.error)) {
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
    setActiveJobId(undefined);
    setCurrentJob(undefined);
    setDocuments((previous) => {
      previous.forEach(revokeDocumentPreview);
      return [];
    });
    setIssues([]);
    setPeriod(currentAssessmentCycle());
    setSelectedDocumentId(undefined);
    setSelectedPageId(undefined);
    setSelectedFindingId(undefined);
  }

  function cancelProcessing() {
    if (!currentJob || !["processing", "queued"].includes(currentJob.status)) return;
    if (!window.confirm("Batalkan proses aktif? Progress yang sudah selesai akan tetap disimpan.")) return;
    controllersRef.current.get(currentJob.id)?.cancel();
    toast.message("Proses dibatalkan. Progress yang selesai tetap tersimpan.");
  }

  function openJob(job: ProcessingJob) {
    activeJobIdRef.current = job.id;
    setActiveJobId(job.id);
    setCurrentJob(job);
    setSelectedDocumentId(job.documents[0]?.id);
    setSelectedPageId(undefined);
    setSelectedFindingId(undefined);
    if (!isTerminal(job.status) && !controllersRef.current.has(job.id)) {
      statusByJobRef.current.set(job.id, job.status);
      controllersRef.current.set(job.id, adapterRef.current.run(job, updateJob));
    }
  }

  function handleRename(jobId: string, name: string) {
    const updated = renameProcessingJob(jobId, name);
    if (!updated) return;
    setJobs((previous) => previous.map((job) => (job.id === jobId ? updated : job)));
    if (currentJob?.id === jobId) setCurrentJob(updated);
  }

  function handleDelete(jobId: string) {
    controllersRef.current.get(jobId)?.cancel();
    controllersRef.current.delete(jobId);
    deleteProcessingJob(jobId);
    setJobs((previous) => previous.filter((job) => job.id !== jobId));
    if (currentJob?.id === jobId) startNewProcess();
  }

  function handleSelectPage(page: ProcessingJob["pages"][number]) {
    setSelectedPageId(page.id);
    setSelectedDocumentId(page.documentId);
    setSelectedFindingId(page.findingIds[0]);
    setInspectorOpen(true);
  }

  function handleSelectFinding(finding: Finding) {
    setSelectedFindingId(finding.id);
    setSelectedDocumentId(finding.source.documentId);
    setSelectedPageId(`${finding.source.documentId}-page-${finding.source.pageNumber}`);
    setInspectorOpen(true);
  }

  function openSource(finding: Finding) {
    handleSelectFinding(finding);
    toast.message(`${finding.source.documentName} · halaman ${finding.source.pageNumber} dipilih.`);
  }

  function retryTask(taskId: string) {
    if (!currentJob) return;
    statusByJobRef.current.set(currentJob.id, "processing");
    const nextController = adapterRef.current.retryTask(currentJob, taskId, updateJob);
    controllersRef.current.set(currentJob.id, nextController);
  }

  function exportResult() {
    if (!currentJob) return;
    downloadText(
      `${currentJob.name.replace(/\s+/g, "-").toLowerCase()}.json`,
      JSON.stringify(currentJob, (key, value) => (key === "file" || key === "previewUrl" ? undefined : value), 2),
      "application/json",
    );
    toast.success("Hasil berhasil diekspor.");
  }

  function downloadReport() {
    if (!currentJob) return;
    const lines = [
      `# ${currentJob.name}`,
      "",
      `Status: ${statusMeta(currentJob.status).label}`,
      `Dokumen: ${currentJob.documents.length} · Halaman: ${currentJob.pages.length} · Temuan: ${currentJob.findings.length}`,
      "",
      "## Temuan",
      ...currentJob.findings.map((finding) => `### ${finding.title}\n- Tingkat: ${finding.severity}\n- Sumber: ${finding.source.documentName}, halaman ${finding.source.pageNumber}\n- Ringkasan: ${finding.summary}\n- Tindakan yang disarankan: ${finding.recommendedAction}`),
    ];
    downloadText(`${currentJob.name.replace(/\s+/g, "-").toLowerCase()}.md`, lines.join("\n\n"), "text/markdown");
    toast.success("Laporan berhasil diunduh.");
  }

  return (
    <PageStack>
      <div className="space-y-12">
        <CollectionPageHeader
          title={currentJob ? currentJob.name : "Document Intelligence"}
          subtitle={currentJob ? "Tinjau progres, sumber halaman, dan temuan hasil analisis." : "Ubah dokumen operasional menjadi temuan risiko yang dapat ditelusuri ke sumbernya."}
          showTitle
          actionsPlacement="title"
          backActionPlacement="local"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {currentStatus ? <Badge variant="outline" tone={currentStatus.tone} className="gap-1.5"><span className={cn("size-1.5 rounded-full", currentStatus.tone === "success" ? "bg-success" : currentStatus.tone === "warning" ? "bg-warning" : currentStatus.tone === "danger" ? "bg-destructive" : "bg-primary")} aria-hidden="true" />{currentStatus.label}</Badge> : null}
              {currentJob && !isTerminal(currentJob.status) ? <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.96]" onClick={cancelProcessing}><XCircle className="size-3.5" />Batalkan proses</Button> : null}
              {currentJob ? <Button type="button" variant="ghost" size="sm" className="gap-2 active:scale-[0.96]" onClick={() => setInspectorOpen((open) => !open)}><PanelLeftIcon className="size-3.5" />{inspectorOpen ? "Sembunyikan pemeriksa" : "Tampilkan pemeriksa"}</Button> : null}
            </div>
          }
        />

        <div className={cn("grid items-start gap-4", inspectorOpen && currentJob ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1")}>
          <main className="min-w-0 space-y-4">
          {offline ? <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-foreground" role="alert"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Koneksi terputus. Progres lokal tetap tersimpan; sinkronisasi server akan dicoba kembali saat koneksi pulih.</div> : null}
          {!currentJob ? (
            <div className="mx-auto w-full max-w-3xl space-y-4 py-2 sm:py-5">
              <div className="mb-8 max-w-2xl sm:mb-10">
                <h2 className="text-lg font-medium tracking-[-0.015em] text-foreground">
                  Analisis dokumen menjadi temuan risiko
                </h2>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                  Unggah satu dokumen. Manris akan mengelompokkan halaman dan menghubungkan temuan dengan sumbernya.
                </p>
              </div>

              <fieldset className="space-y-3" aria-labelledby="analysis-mode-label">
                <legend id="analysis-mode-label" className="text-base font-medium text-foreground">
                  Mode analisis
                </legend>
                <RadioGroup
                  value={mode}
                  onValueChange={(value) => setMode(value as DocumentAnalysisMode)}
                  aria-labelledby="analysis-mode-label"
                  className="gap-3"
                >
                  {modeOptions.map((option) => {
                    const selected = mode === option.value;
                    const ModeIcon = option.icon === "document" ? FileText : ClipboardCheck;

                    return (
                      <label
                        key={option.value}
                        htmlFor={`analysis-mode-${option.value}`}
                        className={cn(
                          "group flex min-h-[88px] cursor-pointer items-center gap-4 rounded-xl border px-4 py-4 text-left transition-[background-color,border-color] duration-200 ease-out motion-reduce:transition-none sm:px-5",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-foreground/20 hover:bg-state-surface",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors",
                            selected && "bg-primary/10 text-primary",
                          )}
                          aria-hidden="true"
                        >
                          <ModeIcon className="size-5" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium leading-5 text-foreground">
                            {option.title}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                        <RadioGroupItem
                          id={`analysis-mode-${option.value}`}
                          value={option.value}
                          aria-label={option.title}
                          className="size-5 border-2 border-border bg-transparent text-primary after:-inset-3 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 data-checked:border-primary data-checked:bg-primary"
                        />
                      </label>
                    );
                  })}
                </RadioGroup>
              </fieldset>

              <UploadPanel
                documents={documents}
                issues={issues}
                dragActive={dragActive}
                onFiles={addFiles}
                onRemove={removeDocument}
                onDragActive={setDragActive}
                onStart={startProcessing}
                processing={false}
              />
            </div>
          ) : (
            <>
              <JobHeader job={currentJob} status={currentStatus} />
              <SpatialIndex job={currentJob} selectedDocumentId={selectedDocumentId} selectedPageId={selectedPageId} selectedFindingId={selectedFindingId} zoom={zoom} onSelectPage={handleSelectPage} onZoomChange={setZoom} />
              {!isTerminal(currentJob.status) || currentJob.status === "partial" || currentJob.status === "failed" ? <TaskLanes job={currentJob} onRetryTask={retryTask} /> : null}
              <ActivityTimeline job={currentJob} />
              {isTerminal(currentJob.status) ? <CompletedResults job={currentJob} onSelectFinding={handleSelectFinding} onOpenSource={openSource} onReviewFinding={handleSelectFinding} onUseRiskDraft={onUseRiskDraft} onExport={exportResult} onDownloadReport={downloadReport} onStartNew={startNewProcess} /> : null}
            </>
          )}
          {currentJob ? (
            <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5">
              <HistoryPanel jobs={jobs} activeJobId={activeJobId} onNewProcess={startNewProcess} onOpen={openJob} onRename={handleRename} onDelete={handleDelete} />
            </section>
          ) : null}
          </main>

          {inspectorOpen && currentJob ? (
            <div className="hidden xl:sticky xl:top-20 xl:block">
              <Inspector job={currentJob} selectedDocumentId={selectedDocumentId} selectedFinding={selectedFinding} onClose={() => setInspectorOpen(false)} onOpenSource={openSource} onUseRiskDraft={onUseRiskDraft} />
            </div>
          ) : null}
        </div>
      </div>

      {!isDesktop && currentJob ? (
        <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="!inset-x-4 !bottom-4 !top-20 !h-auto !max-h-none !w-auto !rounded-xl !p-0">
            <SheetTitle className="sr-only">Pemeriksa dokumen</SheetTitle>
            <SheetDescription className="sr-only">Detail dokumen, halaman sumber, dan temuan yang dipilih.</SheetDescription>
            <Inspector job={currentJob} selectedDocumentId={selectedDocumentId} selectedFinding={selectedFinding} onClose={() => setInspectorOpen(false)} onOpenSource={openSource} onUseRiskDraft={onUseRiskDraft} />
          </SheetContent>
        </Sheet>
      ) : null}
    </PageStack>
  );
}

function JobHeader({ job, status }: { job: ProcessingJob; status?: ReturnType<typeof statusMeta> }) {
  const completedTasks = job.tasks.filter((task) => task.status === "completed" || task.status === "warning").length;
  const stage = processStage(job);
  return <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5" aria-labelledby="process-header-title" aria-busy={!isTerminal(job.status)}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 id="process-header-title" className="text-base font-semibold text-foreground">{status?.label ?? "Diproses"}</h2><Badge variant="outline" className="text-xs">{stage}</Badge><Badge variant="outline" className="tabular-nums text-xs">{job.progress}% keseluruhan</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Dimulai {relativeStart(job.startedAt)} · {job.documents.length} dokumen · {completedTasks}/{job.tasks.length} tugas selesai</p></div><div className="text-right"><div className="font-display text-xs uppercase tracking-[0.12em] text-muted-foreground">Perkiraan</div><div className="mt-1 text-xs font-medium text-foreground">± 1–2 menit</div><div className="mt-0.5 text-xs text-muted-foreground">berdasarkan ukuran kumpulan dokumen</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progres keseluruhan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress}><div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${job.progress}%` }} /></div></section>;
}

function processStage(job: ProcessingJob) {
  if (job.status === "completed") return "Selesai";
  if (job.status === "partial") return "Selesai dengan peninjauan";
  if (job.status === "failed") return "Gagal";
  if (job.status === "cancelled") return "Dibatalkan";
  const runningTask = job.tasks.find((task) => task.status === "running");
  if (!runningTask) return "Menyiapkan";
  if (runningTask.id === "extract-content") return "Mengindeks";
  if (runningTask.id === "build-index") return "Mengindeks";
  if (runningTask.id === "detect-types") return "Menganalisis";
  if (runningTask.id === "cross-reference") return "Menghubungkan referensi";
  if (runningTask.id === "check-inconsistencies") return "Menganalisis";
  return "Menyusun hasil";
}

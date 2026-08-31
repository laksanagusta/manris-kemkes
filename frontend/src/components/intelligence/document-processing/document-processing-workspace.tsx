"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  PanelLeftIcon,
  XCircle,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CollectionPageHeader, PageStack } from "@/components/shared/design-system";
import { FormSection } from "@/components/shared/form-shell";
import { cn } from "@/lib/utils";
import { currentAssessmentCycle, getSelectableAssessmentCycles } from "@/lib/risk-cycle-options";
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
};

const modeOptions: ModeOption[] = [
  { value: "sop_risk_universe", title: "SOP → Risk Universe", description: "Tahapan proses, kontrol, dan risiko per tahap." },
  { value: "audit_finding_mapper", title: "Audit Finding → Risk", description: "Temuan, root cause, dan gap kontrol." },
  { value: "strategic_objective_risk", title: "Struktur Kinerja → Risiko", description: "Sasaran, IKU, target, dan risiko turunan." },
  { value: "mitigation_report_mapper", title: "Mitigation Report Draft", description: "Evidence untuk task mitigasi yang masih open." },
];

function isTerminal(status?: ProcessingStatus) {
  return status === "completed" || status === "partial" || status === "failed" || status === "cancelled";
}

function statusMeta(status: ProcessingStatus) {
  if (status === "completed") return { label: "Completed", tone: "success" as const };
  if (status === "partial") return { label: "Partial completion", tone: "warning" as const };
  if (status === "failed") return { label: "Failed", tone: "danger" as const };
  if (status === "cancelled") return { label: "Cancelled", tone: "neutral" as const };
  if (status === "processing") return { label: "Processing", tone: "progress" as const };
  return { label: "Queued", tone: "neutral" as const };
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
  const selectedMode = useMemo(() => modeOptions.find((item) => item.value === mode) ?? modeOptions[0], [mode]);
  const periodOptions = useMemo(() => getSelectableAssessmentCycles(currentAssessmentCycle()), []);
  const currentStatus = currentJob ? statusMeta(currentJob.status) : undefined;

  function addFiles(files: File[]) {
    const result = validateFiles(files, documents);
    if (result.documents.length) setDocuments((previous) => [...previous, ...result.documents]);
    if (result.issues.length) setIssues((previous) => [...previous, ...result.issues]);
    if (result.documents.length) toast.success(`${result.documents.length} file ditambahkan ke batch.`);
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
    toast.success("Result berhasil diekspor.");
  }

  function downloadReport() {
    if (!currentJob) return;
    const lines = [
      `# ${currentJob.name}`,
      "",
      `Status: ${statusMeta(currentJob.status).label}`,
      `Dokumen: ${currentJob.documents.length} · Halaman: ${currentJob.pages.length} · Findings: ${currentJob.findings.length}`,
      "",
      "## Findings",
      ...currentJob.findings.map((finding) => `### ${finding.title}\n- Severity: ${finding.severity}\n- Source: ${finding.source.documentName}, halaman ${finding.source.pageNumber}\n- Summary: ${finding.summary}\n- Recommended action: ${finding.recommendedAction}`),
    ];
    downloadText(`${currentJob.name.replace(/\s+/g, "-").toLowerCase()}.md`, lines.join("\n\n"), "text/markdown");
    toast.success("Report berhasil diunduh.");
  }

  return (
    <PageStack className="space-y-5">
      <CollectionPageHeader
        title={currentJob ? currentJob.name : "Document Intelligence"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus ? <Badge variant="outline" tone={currentStatus.tone} className="gap-1.5"><span className={cn("size-1.5 rounded-full", currentStatus.tone === "success" ? "bg-emerald-500" : currentStatus.tone === "warning" ? "bg-amber-500" : currentStatus.tone === "danger" ? "bg-red-500" : "bg-sky-500")} />{currentStatus.label}</Badge> : null}
            {currentJob && !isTerminal(currentJob.status) ? <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.96]" onClick={cancelProcessing}><XCircle className="size-3.5" />Cancel safely</Button> : null}
            {currentJob ? <Button type="button" variant="ghost" size="sm" className="gap-2 active:scale-[0.96]" onClick={() => setInspectorOpen((open) => !open)}><PanelLeftIcon className="size-3.5" />{inspectorOpen ? "Hide inspector" : "Show inspector"}</Button> : null}
          </div>
        }
      />

      <div className={cn("grid items-start gap-4", inspectorOpen && currentJob ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1")}>
        <main className="min-w-0 space-y-4">
          {offline ? <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-amber-900" role="alert"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />Koneksi terputus. Progress lokal tetap tersimpan; server analysis akan dicoba kembali saat koneksi pulih.</div> : null}
          {!currentJob ? (
            <>
              <FormSection title="Konfigurasi analisis" description="Pilih mode analisis dan periode kuartal untuk document set ini.">
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="analysis-mode" className="text-sm font-medium text-foreground">Mode analisis</Label>
                    <Select value={mode} onValueChange={(value) => setMode(value as DocumentAnalysisMode)}>
                      <SelectTrigger id="analysis-mode" className="h-10 text-sm"><SelectValue placeholder="Pilih mode analisis" /></SelectTrigger>
                      <SelectContent>{modeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.title}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-muted-foreground">{selectedMode.description}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="period" className="text-sm font-medium text-foreground">Periode kuartal</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger id="period" className="h-10 text-sm"><SelectValue placeholder="Pilih periode kuartal" /></SelectTrigger>
                      <SelectContent>{periodOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <p className="text-xs leading-5 text-muted-foreground">Mengikuti siklus penilaian kuartalan Manris.</p>
                  </div>
                </div>
              </FormSection>
              <div className="space-y-2"><div className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Upload → index → review</div><h2 className="max-w-3xl text-2xl font-semibold tracking-[-0.03em] text-foreground text-balance">Baca document set sebagai satu ruang kerja.</h2><p className="max-w-2xl text-sm leading-6 text-muted-foreground text-pretty">Unggah SOP, audit, risk register, bukti mitigasi, atau lampiran pendukung. Manris akan mengelompokkan halaman dan menunjukkan temuan beserta sumbernya.</p></div>
              <UploadPanel documents={documents} issues={issues} dragActive={dragActive} onFiles={addFiles} onRemove={removeDocument} onDragActive={setDragActive} onStart={startProcessing} processing={false} />
            </>
          ) : (
            <>
              <JobHeader job={currentJob} status={currentStatus} />
              <SpatialIndex job={currentJob} selectedDocumentId={selectedDocumentId} selectedPageId={selectedPageId} selectedFindingId={selectedFindingId} zoom={zoom} onSelectPage={handleSelectPage} onZoomChange={setZoom} />
              {!isTerminal(currentJob.status) || currentJob.status === "partial" || currentJob.status === "failed" ? <TaskLanes job={currentJob} onRetryTask={retryTask} /> : null}
              <ActivityTimeline job={currentJob} />
              {isTerminal(currentJob.status) ? <CompletedResults job={currentJob} onSelectFinding={handleSelectFinding} onOpenSource={openSource} onReviewFinding={handleSelectFinding} onUseRiskDraft={onUseRiskDraft} onExport={exportResult} onDownloadReport={downloadReport} onStartNew={startNewProcess} /> : null}
            </>
          )}
          <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
            <HistoryPanel jobs={jobs} activeJobId={activeJobId} onNewProcess={startNewProcess} onOpen={openJob} onRename={handleRename} onDelete={handleDelete} />
          </section>
        </main>

        {inspectorOpen && currentJob ? <Inspector job={currentJob} selectedDocumentId={selectedDocumentId} selectedFinding={selectedFinding} onClose={() => setInspectorOpen(false)} onOpenSource={openSource} onUseRiskDraft={onUseRiskDraft} /> : null}
      </div>
    </PageStack>
  );
}

function JobHeader({ job, status }: { job: ProcessingJob; status?: ReturnType<typeof statusMeta> }) {
  const completedTasks = job.tasks.filter((task) => task.status === "completed" || task.status === "warning").length;
  const stage = processStage(job);
  return <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5" aria-labelledby="process-header-title"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h2 id="process-header-title" className="text-base font-semibold text-foreground">{status?.label ?? "Processing"}</h2><Badge variant="outline" className="text-[10px]">{stage}</Badge><Badge variant="outline" className="tabular-nums text-[10px]">{job.progress}% overall</Badge></div><p className="mt-1 text-xs leading-5 text-muted-foreground">Started {relativeStart(job.startedAt)} · {job.documents.length} documents · {completedTasks}/{job.tasks.length} tasks resolved</p></div><div className="text-right"><div className="font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Estimated</div><div className="mt-1 text-xs font-medium text-foreground">± 1–2 minutes</div><div className="mt-0.5 text-[10px] text-muted-foreground">berdasarkan ukuran document set</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${job.progress}%` }} /></div></section>;
}

function processStage(job: ProcessingJob) {
  if (job.status === "completed") return "Completed";
  if (job.status === "partial") return "Completed with review";
  if (job.status === "failed") return "Failed";
  if (job.status === "cancelled") return "Cancelled";
  const runningTask = job.tasks.find((task) => task.status === "running");
  if (!runningTask) return "Preparing";
  if (runningTask.id === "extract-content") return "Indexing";
  if (runningTask.id === "build-index") return "Indexing";
  if (runningTask.id === "detect-types") return "Analyzing";
  if (runningTask.id === "cross-reference") return "Cross-referencing";
  if (runningTask.id === "check-inconsistencies") return "Analyzing";
  return "Generating results";
}

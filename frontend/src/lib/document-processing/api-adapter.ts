import { analyzeDocumentIntelligence } from "@/lib/api/document-intelligence";
import { isDocumentAnalysisMode } from "@/types/document-intelligence";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import type {
  DocumentIntelligenceResponse,
  DocumentRiskSuggestion,
  DocumentSourceRef,
  MitigationTaskReportSuggestion,
  SOPProcessStageSuggestion,
} from "@/types/document-intelligence";
import type {
  DocumentGroup,
  DocumentPage,
  Finding,
  ProcessingAdapter,
  ProcessingEvent,
  ProcessingJob,
  ProcessingRunController,
  ProcessingStartInput,
  ProcessingTask,
  SourceReference,
  UploadedDocument,
} from "@/types/document-processing";

const API_TASK_DEFINITION = {
  id: "analyze-document",
  label: "Analyzing document",
  description: "Dokumen dikirim ke backend untuk diekstrak dan dianalisis.",
} as const;

export interface DocumentProcessingApiAdapterOptions {
  token?: string;
  organizationId?: string;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function makeEvent(
  label: string,
  detail: string | undefined,
  tone: ProcessingEvent["tone"],
): ProcessingEvent {
  return {
    id: createId("event"),
    label,
    detail,
    timestamp: nowIso(),
    relativeTime: "baru saja",
    tone,
  };
}

function updateJob(job: ProcessingJob, patch: Partial<ProcessingJob>): ProcessingJob {
  return {
    ...job,
    ...patch,
    updatedAt: nowIso(),
  };
}

function buildTasks(documents: UploadedDocument[]): ProcessingTask[] {
  return [
    {
      ...API_TASK_DEFINITION,
      status: "queued",
      progress: 0,
      documentIds: documents.map((document) => document.id),
    },
  ];
}

function createInitialJob(input: ProcessingStartInput): ProcessingJob {
  const createdAt = nowIso();
  const documents = input.documents.map((document) => ({
    ...document,
    pages: 0,
    status: "ready" as const,
  }));

  return {
    id: createId("document-api-job"),
    name: input.mode === "mitigation_report_mapper" ? "Document review · profil risiko aktif" : "Document review · " + (input.period || currentAssessmentCycle()),
    mode: input.mode,
    organizationId: input.organizationId,
    period: input.mode === "mitigation_report_mapper" ? undefined : input.period,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    documents,
    pages: [],
    groups: [],
    tasks: buildTasks(documents),
    events: [
      makeEvent(
        "Files uploaded",
        documents.length + " dokumen siap dikirim ke backend.",
        "neutral",
      ),
    ],
    findings: [],
    progress: 0,
  };
}

function normalizeConfidence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? Math.min(100, value) / 100 : Math.max(0, Math.min(1, value));
}

function parsePageNumber(location?: string) {
  const match = location?.match(/(?:halaman|page)\s*([0-9]+)/i);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function sourceFor(document: UploadedDocument, sourceRef?: DocumentSourceRef): SourceReference {
  const location = sourceRef?.location?.trim() || "Dokumen sumber";
  return {
    documentId: document.id,
    documentName: document.name,
    pageNumber: parsePageNumber(location),
    location,
    quote: sourceRef?.quote?.trim() || "Kutipan sumber tidak tersedia.",
  };
}

function slug(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function riskSeverity(suggestion: DocumentRiskSuggestion): Finding["severity"] {
  const score = suggestion.probability * suggestion.impact;
  if (score >= 16) return "high";
  if (score >= 9) return "medium";
  return "low";
}

function firstMitigationAction(suggestion: DocumentRiskSuggestion) {
  return suggestion.mitigations?.find((mitigation) => mitigation.action?.trim())?.action?.trim();
}

function riskFinding(
  document: UploadedDocument,
  suggestion: DocumentRiskSuggestion,
  groupId: string,
  index: number,
  contextTitle?: string,
): Finding {
  const title = suggestion.title.trim() || contextTitle?.trim() || "Temuan risiko " + (index + 1);
  const summary =
    suggestion.description.trim() ||
    suggestion.controlGap?.trim() ||
    suggestion.reasoning.trim() ||
    "Risiko teridentifikasi dari hasil analisis dokumen.";

  return {
    id: "api-finding-" + slug(suggestion.clientKey, "risk-" + (index + 1)),
    title,
    summary,
    severity: riskSeverity(suggestion),
    category: suggestion.category.trim() || "Risiko dokumen",
    source: sourceFor(document, suggestion.sourceRefs[0]),
    confidence: normalizeConfidence(suggestion.confidence),
    recommendedAction:
      firstMitigationAction(suggestion) ||
      suggestion.controlGap?.trim() ||
      "Tinjau risiko dan tetapkan tindakan mitigasi yang sesuai.",
    groupId,
  };
}

function stageFinding(
  document: UploadedDocument,
  stage: SOPProcessStageSuggestion,
  groupId: string,
  index: number,
): Finding {
  return {
    id: "api-finding-stage-" + slug(stage.clientKey, "stage-" + (index + 1)),
    title: stage.stageName.trim() || "Bagian dokumen " + (index + 1),
    summary:
      stage.description.trim() ||
      stage.controlGap?.trim() ||
      "Bagian atau topik teridentifikasi dari dokumen.",
    severity: "low",
    category: "Bagian dokumen",
    source: sourceFor(document, stage.sourceRefs[0]),
    confidence: normalizeConfidence(stage.confidence),
    recommendedAction:
      stage.controlGap?.trim() ||
      "Tinjau isi dan kontrol yang disebutkan pada bagian dokumen ini.",
    groupId,
  };
}

function mitigationFinding(
  document: UploadedDocument,
  item: MitigationTaskReportSuggestion,
  groupId: string,
  index: number,
): Finding {
  const title =
    item.riskTitle.trim() ||
    item.riskCode.trim() ||
    item.mitigationAction.trim() ||
    "Tugas mitigasi " + (index + 1);

  return {
    id: "api-finding-mitigation-" + slug(item.clientKey, "task-" + (index + 1)),
    kind: "mitigation-report",
    taskId: item.taskId,
    title,
    summary:
      item.reportNotes.trim() ||
      item.reasoning.trim() ||
      "Hasil realisasi mitigasi teridentifikasi dari dokumen.",
    severity: "low",
    category: "Realisasi mitigasi",
    source: sourceFor(document, item.sourceRefs[0]),
    confidence: normalizeConfidence(item.confidence),
    recommendedAction:
      item.mitigationAction.trim() ||
      "Tinjau status dan bukti pelaksanaan mitigasi.",
    groupId,
  };
}

function mapResponseToFindings(
  document: UploadedDocument,
  response: DocumentIntelligenceResponse,
): Finding[] {
  const groupId = "document-" + response.mode;
  const result = response.result;

  switch (response.mode) {
    case "risk_event_extraction":
      return (result.kejadian?.items ?? []).map((item) => ({
        id: "api-finding-event-" + item.clientKey,
        kind: "risk-event" as const,
        eventDraft: item,
        title: item.event.description || "Kandidat kejadian",
        summary: item.event.actualImpact || "Dampak aktual belum tercantum dalam dokumen.",
        severity: item.event.severity === "extreme" ? "critical" as const : item.event.severity === "high" ? "high" as const : item.event.severity === "medium" ? "medium" as const : "low" as const,
        category: "Kejadian aktual",
        source: sourceFor(document, item.sourceRefs[0]),
        sources: item.sourceRefs.map((ref) => sourceFor(document, ref)),
        confidence: normalizeConfidence(item.confidence),
        recommendedAction: "Periksa fakta, lengkapi informasi yang belum tercantum, dan pilih risiko terkait secara manual.",
        groupId,
      }));
    case "sop_risk_universe": {
      const stages = result.sop?.processStages ?? [];
      return stages.flatMap((stage, stageIndex) =>
        stage.suggestedRisks.length
          ? stage.suggestedRisks.map((suggestion, riskIndex) =>
              riskFinding(
                document,
                suggestion,
                groupId,
                stageIndex * 100 + riskIndex,
                stage.stageName,
              ),
            )
          : [stageFinding(document, stage, groupId, stageIndex)],
      );
    }
    case "mitigation_report_mapper":
      return (result.mitigation?.taskMatches ?? []).map((item, index) =>
        mitigationFinding(document, item, groupId, index),
      );
    default:
      return [];
  }
}

function buildDocumentIndex(
  document: UploadedDocument,
  findings: Finding[],
): { pages: DocumentPage[]; groups: DocumentGroup[] } {
  const pageNumbers = Array.from(
    new Set([1, ...findings.map((finding) => finding.source.pageNumber)]),
  ).sort((left, right) => left - right);
  const groupId = findings[0]?.groupId || "document-results";
  const pages = pageNumbers.map((pageNumber) => ({
    id: document.id + "-page-" + pageNumber,
    documentId: document.id,
    pageNumber,
    label: document.name + " · halaman " + pageNumber,
    groupId,
    status: "indexed" as const,
    previewKind: document.extension === "pdf" ? ("pdf" as const) : ("spreadsheet" as const),
    findingIds: findings
      .filter((finding) => finding.source.pageNumber === pageNumber)
      .map((finding) => finding.id),
  }));
  const group: DocumentGroup = {
    id: groupId,
    label: "Hasil analisis backend",
    description: "Temuan yang dikembalikan oleh Document Intelligence API.",
    accent: "#6f9d96",
    softAccent: "#edf5f2",
    pageIds: pages.map((page) => page.id),
    documentIds: [document.id],
  };

  return { pages, groups: [group] };
}

function completeJob(
  job: ProcessingJob,
  response: DocumentIntelligenceResponse,
): ProcessingJob {
  const document = job.documents[0];
  const findings = document ? mapResponseToFindings(document, response) : [];
  const index = document ? buildDocumentIndex(document, findings) : { pages: [], groups: [] };
  const finishedAt = nowIso();
  const warnings = response.document.warnings ?? [];

  return updateJob(job, {
    status: "completed",
    completedAt: finishedAt,
    durationMs: job.startedAt
      ? Math.max(0, new Date(finishedAt).getTime() - new Date(job.startedAt).getTime())
      : undefined,
    documents: job.documents.map((item) => ({
      ...item,
      pages: index.pages.filter((page) => page.documentId === item.id).length,
      status: "indexed" as const,
    })),
    pages: index.pages,
    groups: index.groups,
    tasks: job.tasks.map((task) => ({
      ...task,
      status: "completed" as const,
      progress: 100,
      retryable: false,
    })),
    findings,
    progress: 100,
    events: [
      ...job.events,
      makeEvent(
        "Backend analysis completed",
        warnings.length
          ? findings.length + " temuan diterima dengan " + warnings.length + " peringatan."
          : findings.length + " temuan diterima dari backend.",
        warnings.length ? "warning" : "success",
      ),
    ],
  });
}

function failJob(job: ProcessingJob, error: unknown): ProcessingJob {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Analisis dokumen gagal dijalankan di backend.";
  return updateJob(job, {
    status: "failed",
    error: message,
    tasks: job.tasks.map((task) => ({
      ...task,
      status: "failed" as const,
      error: message,
      retryable: true,
    })),
    events: [
      ...job.events,
      makeEvent("Backend analysis failed", message, "danger"),
    ],
  });
}

function cancelJob(job: ProcessingJob): ProcessingJob {
  return updateJob(job, {
    status: "cancelled",
    events: [
      ...job.events,
      makeEvent(
        "Analysis cancelled",
        "Permintaan API dihentikan dari browser.",
        "warning",
      ),
    ],
  });
}

function startJob(job: ProcessingJob): ProcessingJob {
  return updateJob(job, {
    status: "processing",
    startedAt: job.startedAt || nowIso(),
    error: undefined,
    tasks: job.tasks.map((task) => ({
      ...task,
      status: "running" as const,
      progress: 0,
      error: undefined,
      retryable: false,
    })),
    documents: job.documents.map((document) => ({
      ...document,
      status: "indexing" as const,
    })),
    events: [
      ...job.events,
      makeEvent(
        "Backend analysis started",
        "Dokumen sedang diproses oleh Document Intelligence API.",
        "neutral",
      ),
    ],
  });
}

function runAnalysis(
  options: DocumentProcessingApiAdapterOptions,
  initialJob: ProcessingJob,
  onUpdate: (job: ProcessingJob) => void,
): ProcessingRunController {
  const controller = new AbortController();
  let cancelled = false;
  let settled = false;
  let job = startJob(initialJob);
  onUpdate(job);

  const document = job.documents.find((item) => item.file);
  if (!options.token || !document?.file || !isDocumentAnalysisMode(job.mode)) {
    settled = true;
    onUpdate(
      failJob(
        job,
        new Error(
          !isDocumentAnalysisMode(job.mode)
            ? "Mode analisis dokumen tidak tersedia."
            : options.token
            ? "File sumber tidak tersedia. Unggah ulang dokumen sebelum menganalisis."
            : "Sesi Anda telah berakhir. Masuk kembali untuk menganalisis dokumen.",
        ),
      ),
    );
    return { cancel: () => undefined };
  }

  void analyzeDocumentIntelligence(
    options.token,
    {
      file: document.file,
      mode: job.mode,
      organizationId: job.organizationId,
    },
    { signal: controller.signal },
  )
    .then((response) => {
      if (cancelled) return;
      settled = true;
      job = completeJob(job, response);
      onUpdate(job);
    })
    .catch((error: unknown) => {
      if (cancelled) return;
      settled = true;
      job = failJob(job, error);
      onUpdate(job);
    });

  return {
    cancel: () => {
      if (cancelled || settled) return;
      cancelled = true;
      controller.abort();
      job = cancelJob(job);
      onUpdate(job);
    },
  };
}

export function createDocumentProcessingApiAdapter(
  options: DocumentProcessingApiAdapterOptions,
): ProcessingAdapter {
  return {
    createJob: (input) => createInitialJob({ ...input, organizationId: options.organizationId }),
    run: (job, onUpdate) => runAnalysis(options, job, onUpdate),
    retryTask: (job, _taskId, onUpdate) => runAnalysis(options, job, onUpdate),
  };
}

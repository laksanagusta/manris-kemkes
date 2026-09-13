import { analyzeDocumentIntelligence } from "@/lib/api/document-intelligence";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import type {
  AuditFindingSuggestion,
  DocumentAnalysisMode,
  DocumentIntelligenceResponse,
  DocumentRiskSuggestion,
  DocumentSourceRef,
  MitigationTaskReportSuggestion,
  SOPProcessStageSuggestion,
  StrategicIKUSuggestion,
  StrategicObjectiveSuggestion,
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
    name: "Document review · " + (input.period || currentAssessmentCycle()),
    mode: input.mode,
    period: input.period,
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
    title: stage.stageName.trim() || "Tahap proses " + (index + 1),
    summary:
      stage.description.trim() ||
      stage.controlGap?.trim() ||
      "Tahap proses teridentifikasi dari dokumen.",
    severity: "low",
    category: "Tahap proses",
    source: sourceFor(document, stage.sourceRefs[0]),
    confidence: normalizeConfidence(stage.confidence),
    recommendedAction:
      stage.controlGap?.trim() ||
      "Tinjau kontrol yang berlaku pada tahap proses ini.",
    groupId,
  };
}

function auditFinding(
  document: UploadedDocument,
  item: AuditFindingSuggestion,
  groupId: string,
  index: number,
): Finding {
  if (item.suggestedRisk) {
    return riskFinding(document, item.suggestedRisk, groupId, index, item.findingTitle);
  }

  return {
    id: "api-finding-audit-" + slug(item.clientKey, "finding-" + (index + 1)),
    title: item.findingTitle.trim() || "Temuan audit " + (index + 1),
    summary:
      item.findingDescription.trim() ||
      item.impact.trim() ||
      item.rootCause.trim() ||
      "Temuan audit teridentifikasi dari dokumen.",
    severity: item.existingRiskId ? "medium" : "high",
    category: item.affectedArea.trim() || "Temuan audit",
    source: sourceFor(document, item.sourceRefs[0]),
    confidence: normalizeConfidence(item.confidence),
    recommendedAction:
      item.rootCause.trim() ||
      "Tinjau pemetaan temuan dan tentukan tindak lanjut.",
    groupId,
  };
}

function strategicFinding(
  document: UploadedDocument,
  objective: StrategicObjectiveSuggestion,
  suggestion: DocumentRiskSuggestion,
  groupId: string,
  index: number,
): Finding {
  return riskFinding(document, suggestion, groupId, index, objective.tujuan);
}

function ikuFinding(
  document: UploadedDocument,
  iku: StrategicIKUSuggestion,
  groupId: string,
  index: number,
): Finding {
  return {
    id: "api-finding-iku-" + slug(iku.clientKey, "iku-" + (index + 1)),
    title: iku.name.trim() || "Indikator kinerja " + (index + 1),
    summary:
      iku.processBusiness?.trim() ||
      iku.target?.trim() ||
      "Indikator kinerja teridentifikasi dari dokumen.",
    severity: "low",
    category: "Indikator kinerja",
    source: sourceFor(document, iku.sourceRefs[0]),
    confidence: normalizeConfidence(iku.confidence),
    recommendedAction:
      iku.target?.trim() ||
      "Tinjau keterkaitan indikator dengan risiko organisasi.",
    groupId,
  };
}

function mitigationSeverity(item: MitigationTaskReportSuggestion): Finding["severity"] {
  if (item.blocker?.trim()) return "high";
  if (item.progressPct < 100) return "medium";
  return "low";
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
    title,
    summary:
      item.reportNotes.trim() ||
      item.blocker?.trim() ||
      item.reasoning.trim() ||
      "Hasil realisasi mitigasi teridentifikasi dari dokumen.",
    severity: mitigationSeverity(item),
    category: "Realisasi mitigasi",
    source: sourceFor(document, item.sourceRefs[0]),
    confidence: normalizeConfidence(item.confidence),
    recommendedAction:
      item.blocker?.trim() ||
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
    case "audit_finding_mapper":
      return (result.audit?.findings ?? []).map((item, index) =>
        auditFinding(document, item, groupId, index),
      );
    case "strategic_objective_risk": {
      const objectives = result.strategic?.objectives ?? [];
      return objectives.flatMap((objective, objectiveIndex) => {
        const riskFindings = objective.ikus.flatMap((iku, ikuIndex) =>
          iku.suggestedRisks.map((suggestion, riskIndex) =>
            strategicFinding(
              document,
              objective,
              suggestion,
              groupId,
              objectiveIndex * 1000 + ikuIndex * 100 + riskIndex,
            ),
          ),
        );
        return riskFindings.length
          ? riskFindings
          : objective.ikus.map((iku, ikuIndex) =>
              ikuFinding(document, iku, groupId, objectiveIndex * 100 + ikuIndex),
            );
      });
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
  if (!options.token || !document?.file) {
    settled = true;
    onUpdate(
      failJob(
        job,
        new Error(
          options.token
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
      mode: job.mode as DocumentAnalysisMode,
      period: job.period,
      organizationId: options.organizationId,
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
    createJob: createInitialJob,
    run: (job, onUpdate) => runAnalysis(options, job, onUpdate),
    retryTask: (job, _taskId, onUpdate) => runAnalysis(options, job, onUpdate),
  };
}

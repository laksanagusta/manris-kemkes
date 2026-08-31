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
  UploadedDocument,
} from "@/types/document-processing";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";

const TASK_DEFINITIONS = [
  {
    id: "extract-content",
    label: "Extracting content",
    description: "Membaca teks, tabel, dan struktur halaman dari setiap file.",
  },
  {
    id: "build-index",
    label: "Building document index",
    description: "Menyusun halaman menjadi indeks yang dapat ditelusuri.",
  },
  {
    id: "detect-types",
    label: "Detecting document types",
    description: "Mengenali jenis dokumen dan kelompok kerja yang paling relevan.",
  },
  {
    id: "cross-reference",
    label: "Cross-referencing pages",
    description: "Mencocokkan referensi, istilah, dan bukti lintas dokumen.",
  },
  {
    id: "check-inconsistencies",
    label: "Checking inconsistencies",
    description: "Memeriksa perbedaan angka, pemilik, periode, dan kontrol.",
  },
  {
    id: "generate-summary",
    label: "Generating summary",
    description: "Menghasilkan temuan yang dapat direview dan ditindaklanjuti.",
  },
] as const;

const GROUP_DEFINITIONS = [
  {
    id: "risk-register",
    label: "Risk register",
    description: "Risiko, scoring, dan keputusan perlakuan.",
    accent: "#6f9d96",
    softAccent: "#edf5f2",
  },
  {
    id: "sop-controls",
    label: "SOP & controls",
    description: "Prosedur, kontrol, dan bukti pelaksanaan.",
    accent: "#8a91bd",
    softAccent: "#f0f1fa",
  },
  {
    id: "audit-findings",
    label: "Audit & findings",
    description: "Temuan, root cause, dan tindak lanjut.",
    accent: "#bb9270",
    softAccent: "#fbf2ea",
  },
  {
    id: "planning-performance",
    label: "Planning & performance",
    description: "Sasaran, IKU, dan struktur kinerja.",
    accent: "#8e9eae",
    softAccent: "#eef3f6",
  },
  {
    id: "supporting-documents",
    label: "Supporting documents",
    description: "Lampiran, memo, spreadsheet, dan bahan referensi.",
    accent: "#a18baf",
    softAccent: "#f5eff7",
  },
] as const;

const PROCESSING_STORAGE_KEY = "manris:document-processing-jobs";
let idSequence = 0;

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  idSequence += 1;
  return `${prefix}-${Date.now()}-${idSequence}`;
}

function previewKindFor(extension: string): DocumentPage["previewKind"] {
  if (extension === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return "image";
  if (["xlsx", "xls", "csv"].includes(extension)) return "spreadsheet";
  return "document";
}

function pageCountFor(document: UploadedDocument) {
  if (document.pages > 0) return document.pages;
  if (document.extension === "pdf") return 7;
  if (["xlsx", "xls", "csv"].includes(document.extension)) return 3;
  if (["png", "jpg", "jpeg", "webp"].includes(document.extension)) return 1;
  return 5;
}

function groupIndexFor(document: UploadedDocument, index: number) {
  const name = document.name.toLowerCase();
  if (name.includes("risk") || name.includes("register")) return 0;
  if (name.includes("sop") || name.includes("prosedur") || name.includes("kontrol")) return 1;
  if (name.includes("audit") || name.includes("temuan") || name.includes("review")) return 2;
  if (name.includes("rencana") || name.includes("strateg") || name.includes("kinerja")) return 3;
  return Math.min(4, index);
}

function buildGroups(documents: UploadedDocument[]) {
  const groups: DocumentGroup[] = GROUP_DEFINITIONS.map((group) => ({
    ...group,
    pageIds: [],
    documentIds: [],
  }));

  documents.forEach((document, documentIndex) => {
    const group = groups[groupIndexFor(document, documentIndex)];
    if (!group.documentIds.includes(document.id)) group.documentIds.push(document.id);
  });

  return groups.filter((group) => group.documentIds.length > 0);
}

function buildPages(documents: UploadedDocument[], groups: DocumentGroup[]) {
  const pages: DocumentPage[] = [];
  documents.forEach((document) => {
    const group = groups.find((item) => item.documentIds.includes(document.id));
    if (!group) return;
    const pageCount = pageCountFor(document);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = {
        id: `${document.id}-page-${pageNumber}`,
        documentId: document.id,
        pageNumber,
        label: `${document.name} · halaman ${pageNumber}`,
        groupId: group.id,
        status: "queued" as const,
        previewKind: previewKindFor(document.extension),
        findingIds: [],
      };
      pages.push(page);
      group.pageIds.push(page.id);
    }
  });
  return pages;
}

function buildTasks(documents: UploadedDocument[]): ProcessingTask[] {
  return TASK_DEFINITIONS.map((task) => ({
    ...task,
    status: "queued",
    progress: 0,
    documentIds: documents.map((document) => document.id),
  }));
}

function makeEvent(
  label: string,
  detail: string | undefined,
  tone: ProcessingEvent["tone"],
): ProcessingEvent {
  const timestamp = nowIso();
  return {
    id: createId("event"),
    label,
    detail,
    timestamp,
    relativeTime: "baru saja",
    tone,
  };
}

function updateRelativeTimes(events: ProcessingEvent[]) {
  const current = Date.now();
  return events.map((event) => {
    const difference = Math.max(0, current - new Date(event.timestamp).getTime());
    if (difference < 60_000) return { ...event, relativeTime: "baru saja" };
    const minutes = Math.round(difference / 60_000);
    return { ...event, relativeTime: `${minutes} mnt lalu` };
  });
}

function sampleFindings(
  documents: UploadedDocument[],
  pages: DocumentPage[],
  groups: DocumentGroup[],
): Finding[] {
  if (!documents.length || !pages.length || !groups.length) return [];
  const sourceDocument = documents[0];
  const secondDocument = documents[1] ?? sourceDocument;
  const sourcePage = pages.find((page) => page.documentId === sourceDocument.id) ?? pages[0];
  const secondPage = pages.find((page) => page.documentId === secondDocument.id) ?? pages[1] ?? pages[0];
  const firstGroup = groups.find((group) => group.id === sourcePage.groupId) ?? groups[0];
  const secondGroup = groups.find((group) => group.id === secondPage.groupId) ?? groups[0];

  const findings: Finding[] = [
    {
      id: "finding-control-evidence",
      title: "Bukti kontrol belum konsisten antar dokumen",
      summary: "Beberapa prosedur menyebutkan kontrol yang sama, tetapi bukti pelaksanaan dan pemiliknya belum dicatat dengan pola yang seragam.",
      severity: "high",
      category: "Control coverage",
      source: {
        documentId: sourceDocument.id,
        documentName: sourceDocument.name,
        pageNumber: Math.min(2, sourcePage.pageNumber),
        location: `Halaman ${Math.min(2, sourcePage.pageNumber)} · bagian kontrol utama`,
        quote: "Kontrol dilakukan secara berkala dan didokumentasikan oleh unit terkait.",
      },
      confidence: 0.91,
      recommendedAction: "Tetapkan pemilik kontrol dan format bukti minimum untuk setiap periode review.",
      groupId: firstGroup.id,
    },
    {
      id: "finding-period-alignment",
      title: "Periode pelaporan perlu diselaraskan",
      summary: "Tanggal review di sumber kedua tidak mengikuti periode yang dipakai di dokumen utama sehingga status tindak lanjut berpotensi salah terbaca.",
      severity: "medium",
      category: "Data consistency",
      source: {
        documentId: secondDocument.id,
        documentName: secondDocument.name,
        pageNumber: secondPage.pageNumber,
        location: `Halaman ${secondPage.pageNumber} · tabel periode`,
        quote: "Review berikutnya mengikuti jadwal unit masing-masing.",
      },
      confidence: 0.84,
      recommendedAction: "Gunakan satu label periode bersama dan tambahkan tanggal efektif pada sumber pendukung.",
      groupId: secondGroup.id,
    },
    {
      id: "finding-owner-mapping",
      title: "Pemetaan owner belum terlihat di semua lampiran",
      summary: "Dokumen pendukung mengandung data yang relevan, tetapi belum menunjuk siapa yang bertanggung jawab menindaklanjuti temuan.",
      severity: "low",
      category: "Governance",
      source: {
        documentId: sourceDocument.id,
        documentName: sourceDocument.name,
        pageNumber: sourcePage.pageNumber,
        location: `Halaman ${sourcePage.pageNumber} · catatan tindak lanjut`,
        quote: "Tindak lanjut dikoordinasikan bersama unit terkait.",
      },
      confidence: 0.78,
      recommendedAction: "Tambahkan owner, target tanggal, dan status pada lampiran yang menjadi evidence.",
      groupId: firstGroup.id,
    },
  ];

  findings.forEach((finding) => {
    const page = pages.find(
      (item) => item.documentId === finding.source.documentId && item.pageNumber === finding.source.pageNumber,
    );
    if (page) page.findingIds.push(finding.id);
  });
  return findings;
}

function createInitialJob(input: ProcessingStartInput): ProcessingJob {
  const createdAt = nowIso();
  const documents = input.documents.map((document) => ({
    ...document,
    pages: pageCountFor(document),
    status: "ready" as const,
  }));
  const groups = buildGroups(documents);
  const pages = buildPages(documents, groups);
  const findings = sampleFindings(documents, pages, groups);

  return {
    id: createId("job"),
    name: `Document review · ${input.period || currentAssessmentCycle()}`,
    mode: input.mode,
    period: input.period,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
    documents,
    pages,
    groups,
    tasks: buildTasks(documents),
    events: [makeEvent("Files uploaded", `${documents.length} dokumen siap diproses.`, "neutral")],
    findings,
    progress: 0,
  };
}

function isFailureScenario(job: ProcessingJob) {
  return job.documents.some((document) => /gagal|fail|partial/i.test(document.name));
}

function isParsingFailureScenario(job: ProcessingJob) {
  return job.documents.some((document) => /corrupt|rusak/i.test(document.name));
}

function isWarningScenario(job: ProcessingJob) {
  return job.documents.some((document) => /warning|peringatan/i.test(document.name));
}

function updateJob(job: ProcessingJob, patch: Partial<ProcessingJob>): ProcessingJob {
  const updated = { ...job, ...patch, updatedAt: nowIso() };
  const resolvedTasks = updated.tasks.filter(
    (task) => task.status === "completed" || task.status === "warning",
  ).length;
  return {
    ...updated,
    events: updateRelativeTimes(updated.events),
    progress: Math.round((resolvedTasks / updated.tasks.length) * 100),
  };
}

function updateTask(job: ProcessingJob, taskId: string, patch: Partial<ProcessingTask>) {
  return updateJob(job, {
    tasks: job.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
  });
}

function revealPages(job: ProcessingJob, ratio: number) {
  const revealCount = Math.max(1, Math.ceil(job.pages.length * ratio));
  const failedDocumentIds = new Set(
    job.documents.filter((document) => document.status === "failed").map((document) => document.id),
  );
  return job.pages.map((page, index) =>
    index < revealCount && page.status === "queued" && !failedDocumentIds.has(page.documentId)
      ? { ...page, status: "indexed" as const }
      : page,
  );
}

function finishJob(job: ProcessingJob): ProcessingJob {
  const hasFailure = job.tasks.some((task) => task.status === "failed");
  const allTerminal = job.tasks.every((task) =>
    ["completed", "warning", "failed"].includes(task.status),
  );
  if (!allTerminal) return job;
  const allDocumentsFailed = job.documents.length > 0 && job.documents.every((document) => document.status === "failed");
  const status = allDocumentsFailed ? "failed" : hasFailure ? "partial" : "completed";
  const finishedAt = nowIso();
  return updateJob(job, {
    status,
    completedAt: finishedAt,
    durationMs: job.startedAt
      ? Math.max(0, new Date(finishedAt).getTime() - new Date(job.startedAt).getTime())
      : undefined,
    events: [
      ...job.events,
      makeEvent(
        status === "completed" ? "Final report completed" : "Partial completion saved",
        status === "completed"
          ? `${job.findings.length} findings generated.`
          : "Hasil yang berhasil diproses tetap tersedia untuk direview.",
        status === "completed" ? "success" : "warning",
      ),
    ],
  });
}

function createMockController(
  initialJob: ProcessingJob,
  onUpdate: (job: ProcessingJob) => void,
  onlyTaskId?: string,
): ProcessingRunController {
  let job = initialJob;
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const failureScenario = isFailureScenario(job);
  const parsingFailureScenario = isParsingFailureScenario(job);
  const warningScenario = isWarningScenario(job);

  const emit = (nextJob: ProcessingJob) => {
    if (cancelled) return;
    job = nextJob;
    onUpdate(job);
  };

  const schedule = (delay: number, callback: () => void) => {
    timers.push(setTimeout(callback, delay));
  };

  if (onlyTaskId) {
    const task = job.tasks.find((item) => item.id === onlyTaskId);
    if (!task) return { cancel: () => undefined };
    emit(
      updateTask(
        updateJob(job, { status: "processing", error: undefined }),
        onlyTaskId,
        { status: "running", progress: 0, error: undefined, retryable: false },
      ),
    );
    schedule(1600, () => {
      const completed = updateTask(job, onlyTaskId, {
        status: "completed",
        progress: 100,
        retryable: false,
      });
      const documents = completed.documents.map((document) =>
        document.status === "failed" ? { ...document, status: "indexed" as const, error: undefined } : document,
      );
      const recovered = updateJob(completed, { documents });
      emit(
        finishJob({
          ...recovered,
          pages: revealPages(recovered, 1),
          events: [...recovered.events, makeEvent("Task retried", `${task.label} berhasil dilanjutkan.`, "success")],
        }),
      );
    });
    return {
      cancel: () => {
        cancelled = true;
        timers.forEach(clearTimeout);
      },
    };
  }

  emit(
    updateJob(job, {
      status: "processing",
      startedAt: job.startedAt || nowIso(),
      error: undefined,
      documents: job.documents.map((document) => ({ ...document, status: "indexing" as const })),
      events: [
        ...job.events,
        makeEvent("Document set validated", "Format, ukuran, dan duplikasi diperiksa.", "success"),
      ],
    }),
  );

  const schedules = [
    { taskId: "extract-content", start: 0, complete: 1250 },
    { taskId: "build-index", start: 0, complete: 2050 },
    { taskId: "detect-types", start: 450, complete: 1750 },
    { taskId: "cross-reference", start: 2200, complete: 3650 },
    { taskId: "check-inconsistencies", start: 2550, complete: 4300 },
    { taskId: "generate-summary", start: 4050, complete: 5550 },
  ];

  schedules.forEach(({ taskId, start, complete }) => {
    schedule(start, () => {
      if (job.tasks.find((task) => task.id === taskId)?.status !== "queued") return;
      const running = updateTask(job, taskId, { status: "running", progress: 0 });
      const event = taskId === "cross-reference"
        ? makeEvent("Cross-reference analysis started", "Relasi lintas halaman mulai dianalisis.", "neutral")
        : undefined;
      emit(event ? { ...running, events: [...running.events, event] } : running);
    });
    schedule(complete, () => {
      const task = job.tasks.find((item) => item.id === taskId);
      if (!task || task.status !== "running") return;
      const shouldFail =
        (failureScenario && taskId === "check-inconsistencies") ||
        (parsingFailureScenario && taskId === "extract-content");
      const shouldWarn = warningScenario && taskId === "check-inconsistencies";
      if (shouldFail) {
        const parseFailure = parsingFailureScenario && taskId === "extract-content";
        emit(
          finishJob(
            updateTask(job, taskId, {
              status: "failed",
              progress: 0,
              error: parseFailure
                ? "Parsing gagal pada file yang ditandai corrupt/rusak. Hapus atau perbaiki file lalu retry."
                : "Sebagian referensi tidak dapat dibaca dari dokumen sumber.",
              retryable: true,
            }),
          ),
        );
        if (parseFailure) {
          emit(
            updateJob(job, {
              documents: job.documents.map((document) =>
                /corrupt|rusak/i.test(document.name)
                  ? { ...document, status: "failed" as const, error: "Parsing gagal pada dokumen ini." }
                  : document,
              ),
            }),
          );
        }
        return;
      }
      const completed = updateTask(job, taskId, {
        status: shouldWarn ? "warning" : "completed",
        progress: 100,
        error: shouldWarn ? "Ditemukan dua label periode yang perlu direview." : undefined,
        retryable: false,
      });
      const documents =
        taskId === "build-index"
          ? completed.documents.map((document) => document.status === "failed" ? document : { ...document, status: "indexed" as const })
          : completed.documents;
      const withDocuments = updateJob(completed, { documents });
      const pages = taskId === "extract-content" ? revealPages(withDocuments, 0.4) : taskId === "build-index" ? revealPages(withDocuments, 1) : withDocuments.pages;
      const event =
        taskId === "build-index"
              ? makeEvent(`${pages.filter((page) => page.status !== "queued").length} pages indexed`, "Spatial index siap ditelusuri.", "success")
          : taskId === "detect-types"
            ? makeEvent(`${completed.groups.length} document groups identified`, "Dokumen dikelompokkan berdasarkan konteks kerja.", "success")
            : taskId === "generate-summary"
                ? makeEvent(`${completed.findings.length} findings generated`, "Temuan disusun dengan sumber halaman.", "success")
                : undefined;
      emit(
        finishJob({
          ...withDocuments,
          pages,
          events: event ? [...completed.events, event] : completed.events,
        }),
      );
    });
  });

  schedule(6000, () => {
    if (cancelled || ["completed", "partial", "cancelled"].includes(job.status)) return;
    emit(finishJob(job));
  });

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      timers.forEach(clearTimeout);
      const cancelledJob = updateJob(job, {
        status: "cancelled",
        events: [...job.events, makeEvent("Process cancelled", "Progress yang sudah selesai tetap disimpan.", "warning")],
      });
      onUpdate(cancelledJob);
    },
  };
}

export function createDocumentProcessingAdapter(): ProcessingAdapter {
  return {
    createJob: createInitialJob,
    run: (job, onUpdate) => createMockController(job, onUpdate),
    retryTask: (job, taskId, onUpdate) => createMockController(job, onUpdate, taskId),
  };
}

export function saveProcessingJob(job: ProcessingJob) {
  if (typeof window === "undefined") return;
  try {
    const stored = loadProcessingJobs();
    const next = [job, ...stored.filter((item) => item.id !== job.id)].slice(0, 12);
    window.localStorage.setItem(
      PROCESSING_STORAGE_KEY,
      JSON.stringify(next, (key, value) =>
        key === "file" || key === "previewUrl" ? undefined : value,
      ),
    );
  } catch {
    // Persistence is a convenience. The active in-memory job remains usable.
  }
}

export function loadProcessingJobs(): ProcessingJob[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROCESSING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProcessingJob[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function deleteProcessingJob(jobId: string) {
  if (typeof window === "undefined") return;
  const jobs = loadProcessingJobs().filter((job) => job.id !== jobId);
  window.localStorage.setItem(PROCESSING_STORAGE_KEY, JSON.stringify(jobs));
}

export function renameProcessingJob(jobId: string, name: string) {
  const jobs = loadProcessingJobs().map((job) =>
    job.id === jobId ? { ...job, name: name.trim() || job.name, updatedAt: nowIso() } : job,
  );
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PROCESSING_STORAGE_KEY, JSON.stringify(jobs));
  }
  return jobs.find((job) => job.id === jobId);
}

export type ProcessingStatus =
  | "idle"
  | "ready"
  | "queued"
  | "processing"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled";

export type UploadedDocumentStatus =
  | "ready"
  | "indexing"
  | "indexed"
  | "warning"
  | "failed";

export type ProcessingTaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "warning"
  | "failed";

export type ProcessingEventTone = "neutral" | "success" | "warning" | "danger";

export interface UploadedDocument {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  lastModified?: number;
  pages: number;
  status: UploadedDocumentStatus;
  error?: string;
  previewUrl?: string;
  file?: File;
}

export interface DocumentPage {
  id: string;
  documentId: string;
  pageNumber: number;
  label: string;
  groupId: string;
  status: "queued" | "indexed" | "warning" | "failed";
  previewKind: "pdf" | "image" | "document" | "spreadsheet";
  findingIds: string[];
}

export interface DocumentGroup {
  id: string;
  label: string;
  description: string;
  accent: string;
  softAccent: string;
  pageIds: string[];
  documentIds: string[];
}

export interface ProcessingTask {
  id: string;
  label: string;
  description: string;
  status: ProcessingTaskStatus;
  progress: number;
  documentIds: string[];
  error?: string;
  retryable?: boolean;
}

export interface ProcessingEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
  relativeTime: string;
  tone: ProcessingEventTone;
}

export interface SourceReference {
  documentId: string;
  documentName: string;
  pageNumber: number;
  location: string;
  quote: string;
}

export type FindingSeverity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id: string;
  title: string;
  summary: string;
  severity: FindingSeverity;
  category: string;
  source: SourceReference;
  confidence: number;
  recommendedAction: string;
  groupId: string;
}

export interface ProcessingJob {
  id: string;
  name: string;
  mode: string;
  period?: string;
  status: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  documents: UploadedDocument[];
  pages: DocumentPage[];
  groups: DocumentGroup[];
  tasks: ProcessingTask[];
  events: ProcessingEvent[];
  findings: Finding[];
  progress: number;
  error?: string;
}

export interface ProcessingStartInput {
  documents: UploadedDocument[];
  mode: string;
  period?: string;
}

export interface ProcessingRunController {
  cancel: () => void;
}

export interface ProcessingAdapter {
  createJob(input: ProcessingStartInput): ProcessingJob;
  run(
    job: ProcessingJob,
    onUpdate: (job: ProcessingJob) => void,
  ): ProcessingRunController;
  retryTask(
    job: ProcessingJob,
    taskId: string,
    onUpdate: (job: ProcessingJob) => void,
  ): ProcessingRunController;
}

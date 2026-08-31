import type { FileIssue } from "./types";
import type { UploadedDocument } from "@/types/document-processing";

export const ACCEPTED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "docx",
  "xlsx",
  "xls",
  "csv",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(",");
export const MAX_DOCUMENTS = 1;
export const MAX_FILE_SIZE = 1 * 1024 * 1024;

function extensionFor(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileKey(file: Pick<File, "name" | "size" | "lastModified">) {
  return `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`;
}

function documentId(file: File) {
  return `doc-${fileKey(file).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
}

function issueFor(file: File, message: string, occurrence: number): FileIssue {
  return {
    id: `issue-${fileKey(file).replace(/[^a-z0-9]+/gi, "-")}-${occurrence}`,
    fileName: file.name,
    message,
  };
}

function createUploadedDocument(file: File): UploadedDocument {
  const extension = extensionFor(file.name);
  const isImage = ["png", "jpg", "jpeg", "webp"].includes(extension);
  return {
    id: documentId(file),
    name: file.name,
    extension,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    lastModified: file.lastModified,
    pages: 0,
    status: "ready",
    file,
    previewUrl: isImage ? URL.createObjectURL(file) : undefined,
  };
}

export function validateFiles(
  files: File[],
  existingDocuments: UploadedDocument[],
): { documents: UploadedDocument[]; issues: FileIssue[] } {
  const existingKeys = new Set(
    existingDocuments.map((document) => `${document.name.toLowerCase()}-${document.size}-${document.lastModified ?? 0}`),
  );
  const batchKeys = new Set<string>();
  const documents: UploadedDocument[] = [];
  const issues: FileIssue[] = [];

  files.forEach((file, index) => {
    const extension = extensionFor(file.name);
    const key = fileKey(file);
    if (!ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number])) {
      issues.push(issueFor(file, "Format belum didukung. Gunakan PDF, gambar, DOCX, atau spreadsheet.", index));
      return;
    }
    if (file.size === 0) {
      issues.push(issueFor(file, "File kosong atau rusak sehingga tidak dapat dibaca.", index));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      issues.push(issueFor(file, `Ukuran file melebihi batas ${formatFileSize(MAX_FILE_SIZE)}.`, index));
      return;
    }
    if (existingKeys.has(key) || batchKeys.has(key)) {
      issues.push(issueFor(file, "File duplikat sudah ada di batch.", index));
      return;
    }
    if (existingDocuments.length + documents.length >= MAX_DOCUMENTS) {
      issues.push(issueFor(file, `Maksimal ${MAX_DOCUMENTS} dokumen per proses.`, index));
      return;
    }

    batchKeys.add(key);
    documents.push(createUploadedDocument(file));
  });

  return { documents, issues };
}

export function revokeDocumentPreview(document: UploadedDocument) {
  if (document.previewUrl) URL.revokeObjectURL(document.previewUrl);
}

export function formatDuration(durationMs?: number) {
  if (!durationMs) return "—";
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

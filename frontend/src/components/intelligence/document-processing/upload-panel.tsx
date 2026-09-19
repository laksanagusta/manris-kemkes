"use client";

import { useRef } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  FileBarChart,
  FileSearch,
  FileSpreadsheet,
  FileText,
  X,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedDocument } from "@/types/document-processing";
import { ACCEPT_ATTRIBUTE, formatFileSize, MAX_FILE_SIZE } from "./upload-utils";
import type { FileIssue } from "./types";

function ExtensionIcon({ extension, className }: { extension: string; className: string }) {
  if (["png", "jpg", "jpeg", "webp"].includes(extension)) return <FileBarChart className={className} />;
  if (["xlsx", "xls", "csv"].includes(extension)) return <FileSpreadsheet className={className} />;
  if (extension === "pdf") return <FileSearch className={className} />;
  return <FileText className={className} />;
}

function DocumentThumbnail({ document, compact = false }: { document: UploadedDocument; compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-foreground/10 bg-card text-muted-foreground",
        compact ? "size-10" : "h-20 w-16",
      )}
    >
      {document.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={document.previewUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <ExtensionIcon extension={document.extension} className={compact ? "size-4" : "size-5"} />
          <span className="font-mono text-xs uppercase text-muted-foreground/70">
            {document.extension}
          </span>
        </div>
      )}
      {!compact ? (
        <span className="absolute bottom-1 left-1 rounded bg-primary/70 px-1 py-0.5 font-mono text-xs uppercase tracking-[0.08em] text-primary-foreground">
          {document.extension}
        </span>
      ) : null}
    </div>
  );
}

function UploadDocumentMark() {
  return (
    <div
      className="mb-7 flex h-14 w-11 items-center justify-center rounded-md border border-border bg-card shadow-sm"
      aria-hidden="true"
    >
      <FileText className="size-5 text-muted-foreground/55" strokeWidth={1.6} />
    </div>
  );
}

function DropZone({
  dragActive,
  onFiles,
  onDragActive,
}: {
  dragActive: boolean;
  onFiles: (files: File[]) => void;
  onDragActive: (active: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const openPicker = () => inputRef.current?.click();
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDragActive(false);
    onFiles(Array.from(event.dataTransfer.files ?? []));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Unggah dokumen untuk dianalisis"
      onClick={openPicker}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        onDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        if (event.currentTarget === event.target) onDragActive(false);
      }}
      onDrop={onDrop}
      className={cn(
        "group relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center outline-none transition-[background-color,border-color,transform,box-shadow] duration-200 ease-(--ease-out) focus-visible:ring-2 focus-visible:ring-ring/40 sm:min-h-[340px] sm:px-10 motion-reduce:transition-none",
        dragActive
          ? "scale-[1.008] border-primary/60 bg-primary/5"
          : "border-border bg-card hover:border-foreground/25 hover:bg-state-surface",
      )}
    >
      <input
        ref={inputRef}
        data-document-picker
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        tabIndex={-1}
        aria-label="Pilih dokumen untuk dianalisis"
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <UploadDocumentMark />
      <h2 className="text-sm font-medium tracking-[-0.015em] text-foreground">
        Tarik dan lepas dokumen
      </h2>
      <p className="mt-2 text-sm leading-6 text-secondary-foreground">
        atau klik area ini untuk memilih file dari perangkat
      </p>
      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        PDF atau XLSX
        <br />
        Maksimal {formatFileSize(MAX_FILE_SIZE)}
      </p>
    </div>
  );
}

export function UploadPanel({
  documents,
  issues,
  dragActive,
  onFiles,
  onRemove,
  onDragActive,
  onStart,
  processing,
}: {
  documents: UploadedDocument[];
  issues: FileIssue[];
  dragActive: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (documentId: string) => void;
  onDragActive: (active: boolean) => void;
  onStart: () => void;
  processing: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const validDocuments = documents.filter((document) => !document.error);
  if (!documents.length) {
    return (
      <div className="space-y-4">
        <DropZone dragActive={dragActive} onFiles={onFiles} onDragActive={onDragActive} />
        <IssueList issues={issues} />
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="selected-files-title">
      <input
        data-document-picker
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        tabIndex={-1}
        aria-label="Pilih dokumen tambahan untuk dianalisis"
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <div className="space-y-1">
        <h2 id="selected-files-title" className="text-base font-medium tracking-[-0.01em] text-foreground">
          Dokumen siap dianalisis
        </h2>
        <p className="text-sm leading-6 text-secondary-foreground">
          Periksa file sebelum memulai proses. File valid tetap tersimpan ketika ada file lain yang gagal divalidasi.
        </p>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false} mode="popLayout">
          {documents.map((document) => (
            <motion.article
              key={document.id}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(8px)" }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
              transition={{ duration: reduceMotion ? 0.12 : 0.18, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                "rounded-lg bg-card p-4 border-shadow sm:p-5",
                document.error && "ring-1 ring-destructive/35",
              )}
            >
              <div className="flex min-w-0 items-center gap-4">
                <DocumentThumbnail document={document} compact />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground" title={document.name}>
                    {document.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {document.extension.toUpperCase()} · {formatFileSize(document.size)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Hapus ${document.name}`}
                  title={`Hapus ${document.name}`}
                  onClick={() => onRemove(document.id)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-[background-color,color,border-color,transform] duration-150 ease-(--ease-out) hover:border-foreground/20 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <X className="size-4" />
                </button>
              </div>
              {document.error ? (
                <div className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <span>{document.error}</span>
                </div>
              ) : null}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <IssueList issues={issues} />

      <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {validDocuments.length ? "File ini akan diproses sebagai satu kumpulan dokumen." : "Tambahkan minimal satu file yang valid untuk melanjutkan."}
        </p>
        <Button
          type="button"
          variant="primary"
          size="primary"
          disabled={!validDocuments.length || processing}
          className="gap-2"
          onClick={onStart}
          aria-label={processing ? "Menyiapkan analisis" : "Mulai analisis"}
        >
          <FileSearch className="size-4" />
          <span className="grid" aria-hidden="true">
            <span
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-[120ms] ease-(--ease-out)",
                processing ? "opacity-0" : "opacity-100",
              )}
            >
              Mulai analisis
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1 transition-opacity duration-[120ms] ease-(--ease-out)",
                processing ? "opacity-100" : "opacity-0",
              )}
            >
              Menyiapkan...
            </span>
          </span>
        </Button>
      </div>
    </section>
  );
}

export { DocumentThumbnail };

function IssueList({ issues }: { issues: FileIssue[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {issues.length ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3"
          role="alert"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="size-4" />
            {issues.length} file perlu diperbaiki
          </div>
          <ul className="space-y-1.5 text-xs leading-5 text-foreground/80">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
                <span><strong className="font-medium">{issue.fileName}:</strong> {issue.message}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

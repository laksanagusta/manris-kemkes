"use client";

import { useRef } from "react";
import type { DragEvent, KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  FileBarChart,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Plus,
  UploadCloud,
  X,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedDocument } from "@/types/document-processing";
import { ACCEPT_ATTRIBUTE, formatFileSize, MAX_DOCUMENTS, MAX_FILE_SIZE } from "./upload-utils";
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
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-foreground/10 bg-white text-muted-foreground",
        compact ? "size-10" : "h-20 w-16",
      )}
    >
      {document.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={document.previewUrl} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <ExtensionIcon extension={document.extension} className={compact ? "size-4" : "size-5"} />
          <span className="font-mono text-[9px] uppercase text-muted-foreground/70">
            {document.extension}
          </span>
        </div>
      )}
      {!compact ? (
        <span className="absolute bottom-1 left-1 rounded bg-primary/70 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-white">
          {document.extension}
        </span>
      ) : null}
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
        "group relative flex min-h-[390px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-8 text-center outline-none transition-[background-color,border-color,transform,box-shadow] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-ring/40 motion-reduce:transition-none",
        dragActive
          ? "scale-[1.012] border-primary/45 bg-primary/[0.07] shadow-[0_12px_34px_rgba(0,0,0,0.06)]"
          : "border-border/80 bg-white/50 hover:border-primary/25 hover:bg-white",
      )}
    >
      <input
        ref={inputRef}
        data-document-picker
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <div className="relative mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/[0.06] text-primary ring-1 ring-inset ring-primary/10 transition-[scale,background-color] duration-300 ease-out group-hover:scale-[1.04] group-hover:bg-primary/[0.1] motion-reduce:transition-none">
        <UploadCloud className="size-7" strokeWidth={1.7} />
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground text-balance">
          Upload dokumen untuk dianalisis
        </h2>
        <p className="text-sm leading-6 text-muted-foreground text-pretty">
          Tarik satu dokumen ke area ini, atau pilih file dari perangkat. Manris akan membaca, mengelompokkan, dan menghubungkan evidence yang tersedia.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-6 gap-2 active:scale-[0.96]"
        onClick={(event) => {
          event.stopPropagation();
          openPicker();
        }}
      >
        <Plus className="size-4" />
        Pilih file
      </Button>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {["PDF", "JPG / PNG", "DOCX", "XLSX / CSV"].map((label) => (
          <Badge key={label} variant="outline" className="bg-white/70 text-[11px] text-muted-foreground">
            {label}
          </Badge>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-muted-foreground/80">
        Maksimal {MAX_DOCUMENTS} file · {formatFileSize(MAX_FILE_SIZE)} · file tetap berada di sesi ini sampai diproses
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
    <section className="space-y-4 rounded-2xl border border-border/80 bg-white p-5 sm:p-6" aria-labelledby="selected-files-title">
      <input
        data-document-picker
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 id="selected-files-title" className="text-base font-semibold tracking-[-0.01em] text-foreground">
              Dokumen terpilih
            </h2>
            <Badge variant="secondary" className="tabular-nums text-[11px]">
              {validDocuments.length} valid
            </Badge>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Periksa file sebelum memulai proses. File valid tidak akan terhapus ketika ada file lain yang gagal divalidasi.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {documents.map((document) => (
            <motion.article
              key={document.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ type: "spring", duration: 0.34, bounce: 0 }}
              className={cn(
                "relative flex min-w-0 gap-3 rounded-xl border bg-background p-3 transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-foreground/20 hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)] motion-reduce:transition-none",
                document.error ? "border-destructive/35 bg-destructive/[0.03]" : "border-border/80",
              )}
            >
              <DocumentThumbnail document={document} />
              <div className="min-w-0 flex-1 pr-6">
                <div className="truncate text-sm font-medium text-foreground" title={document.name}>
                  {document.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="uppercase">{document.extension}</span>
                  <span>{formatFileSize(document.size)}</span>
                  {document.pages ? <span>{document.pages} halaman</span> : null}
                </div>
                {document.error ? (
                  <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    <span>{document.error}</span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-success">
                    <CheckCircle2 className="size-3.5" />
                    Siap diproses
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label={`Hapus ${document.name}`}
                title={`Hapus ${document.name}`}
                onClick={() => onRemove(document.id)}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96]"
              >
                <X className="size-4" />
              </button>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      <IssueList issues={issues} />

      <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {validDocuments.length ? "Semua file akan diproses sebagai satu document set." : "Tambahkan minimal satu file yang valid untuk melanjutkan."}
        </p>
        <Button
          type="button"
          variant="primary"
          size="primary"
          disabled={!validDocuments.length || processing}
          className="gap-2 active:scale-[0.96]"
          onClick={onStart}
        >
          <FileSearch className="size-4" />
          {processing ? "Menyiapkan..." : "Start processing"}
        </Button>
      </div>
    </section>
  );
}

export { DocumentThumbnail };

function IssueList({ issues }: { issues: FileIssue[] }) {
  if (!issues.length) return null;
  return (
    <div className="space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3" role="alert">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <AlertTriangle className="size-4" />
        {issues.length} file perlu diperbaiki
      </div>
      <ul className="space-y-1.5 text-xs leading-5 text-amber-900/80">
        {issues.map((issue) => (
          <li key={issue.id} className="flex items-start gap-2">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-amber-600" />
            <span><strong className="font-medium">{issue.fileName}:</strong> {issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

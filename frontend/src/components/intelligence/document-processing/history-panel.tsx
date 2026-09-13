"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  History,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProcessingJob, ProcessingStatus } from "@/types/document-processing";
import { formatDuration } from "./upload-utils";

function statusMeta(status: ProcessingStatus) {
  switch (status) {
    case "completed":
      return { label: "Selesai", tone: "success" as const, icon: CheckCircle2 };
    case "partial":
      return { label: "Sebagian", tone: "warning" as const, icon: XCircle };
    case "failed":
      return { label: "Gagal", tone: "danger" as const, icon: XCircle };
    case "cancelled":
      return { label: "Dibatalkan", tone: "neutral" as const, icon: XCircle };
    case "processing":
    case "queued":
      return { label: status === "queued" ? "Dalam antrean" : "Diproses", tone: "progress" as const, icon: Clock };
    default:
      return { label: "Siap", tone: "neutral" as const, icon: Clock };
  }
}

function relativeDate(date: string) {
  const difference = Date.now() - new Date(date).getTime();
  if (difference < 60_000) return "baru saja";
  if (difference < 3_600_000) return `${Math.max(1, Math.round(difference / 60_000))} mnt lalu`;
  if (difference < 86_400_000) return `${Math.max(1, Math.round(difference / 3_600_000))} jam lalu`;
  return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function HistoryPanel({
  jobs,
  activeJobId,
  onNewProcess,
  onOpen,
  onRename,
  onDelete,
}: {
  jobs: ProcessingJob[];
  activeJobId?: string;
  onNewProcess: () => void;
  onOpen: (job: ProcessingJob) => void;
  onRename: (jobId: string, name: string) => void;
  onDelete: (jobId: string) => void;
}) {
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function startRename(job: ProcessingJob) {
    setEditingJobId(job.id);
    setEditingName(job.name);
  }

  function saveRename(job: ProcessingJob) {
    onRename(job.id, editingName);
    setEditingJobId(null);
  }

  return (
    <section className="space-y-3" aria-labelledby="process-history-title">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <History className="size-3.5 text-muted-foreground" />
          <h2 id="process-history-title" className="font-display text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground">
            Riwayat proses
          </h2>
        </div>
        <button
          type="button"
          aria-label="Buat proses baru"
          title="Buat proses baru"
          onClick={onNewProcess}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96]"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {jobs.length ? (
        <div className="space-y-1">
          {jobs.map((job) => {
            const meta = statusMeta(job.status);
            const Icon = meta.icon;
            const active = job.id === activeJobId;
            return (
              <div
                key={job.id}
                className={cn(
                  "group rounded-xl border p-2.5 transition-[background-color,border-color,box-shadow] duration-150",
                  active ? "border-foreground/20 bg-card border-shadow" : "border-transparent hover:border-border/70 hover:bg-card/70",
                )}
              >
                {editingJobId === job.id ? (
                  <div className="space-y-2">
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveRename(job);
                        if (event.key === "Escape") setEditingJobId(null);
                      }}
                      className="rounded-md bg-background px-2 text-xs"
                      aria-label="Nama proses"
                    />
                    <div className="flex gap-1.5">
                      <Button type="button" size="xs" variant="secondary" className="h-7 flex-1" onClick={() => saveRename(job)}>
                        Simpan
                      </Button>
                      <Button type="button" size="icon-xs" variant="ghost" aria-label="Batalkan rename" onClick={() => setEditingJobId(null)}>
                        <XCircle className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => onOpen(job)} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                    <div className="flex items-start gap-2">
                      <Icon className={cn("mt-0.5 size-3.5 shrink-0", meta.tone === "success" ? "text-success" : meta.tone === "warning" ? "text-warning" : meta.tone === "danger" ? "text-destructive" : "text-muted-foreground")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-foreground" title={job.name}>{job.name}</span>
                        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{job.documents.length} dokumen</span>
                          <span aria-hidden="true">·</span>
                          <span>{relativeDate(job.updatedAt)}</span>
                        </span>
                      </span>
                      <Badge variant="outline" tone={meta.tone} size="micro" className="hidden shrink-0 sm:inline-flex">
                        {meta.label}
                      </Badge>
                    </div>
                  </button>
                )}
                {editingJobId !== job.id ? (
                  <div className="mt-2 flex items-center justify-between gap-2 pl-5">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground/75">
                      {job.status === "completed" || job.status === "partial" ? formatDuration(job.durationMs) : `${job.progress}%`}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-xs" aria-label={`Tindakan untuk ${job.name}`} title="Tindakan proses">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => startRename(job)}>
                          <Pencil className="size-4" />
                          Ganti nama
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            if (window.confirm(`Hapus proses “${job.name}”? Hasil lokal proses ini akan dihapus.`)) onDelete(job.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                          Hapus proses
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 p-3 text-xs leading-5 text-muted-foreground">
          Belum ada proses tersimpan. Proses yang selesai akan muncul di sini.
        </div>
      )}
      <div className="flex items-center gap-2 px-1 pt-1 text-xs leading-4 text-muted-foreground/80">
        <MoreHorizontal className="size-3" />
        <span>Hasil tersimpan lokal di perangkat ini.</span>
      </div>
    </section>
  );
}

"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LayoutGridIcon, Minus, Plus } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DocumentPage, ProcessingJob } from "@/types/document-processing";
import { DocumentThumbnail } from "./upload-panel";

function PageCard({
  page,
  documentName,
  document,
  selected,
  selectedFinding,
  onSelect,
  reduceMotion,
}: {
  page: DocumentPage;
  documentName: string;
  document?: ProcessingJob["documents"][number];
  selected: boolean;
  selectedFinding: boolean;
  onSelect: () => void;
  reduceMotion: boolean;
}) {
  return (
    <motion.button
      layout
      layoutId={page.id}
      type="button"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.86, y: 10 }}
      animate={{
        opacity: page.status === "queued" ? 0.42 : 1,
        scale: selected ? 1.025 : 1,
        y: 0,
      }}
      transition={{ type: "spring", duration: 0.38, bounce: 0 }}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${documentName}, halaman ${page.pageNumber}`}
      className={cn(
        "group/page relative min-w-0 rounded-xl border bg-white p-2 text-left outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-foreground/25 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus-visible:ring-2 focus-visible:ring-ring/40 motion-reduce:transition-none",
        selected ? "border-foreground/50 bg-white shadow-[0_0_0_3px_rgba(32,32,32,0.08)]" : "border-foreground/10",
        selectedFinding && !selected ? "ring-2 ring-amber-300/70" : "",
      )}
    >
      <div className="relative flex aspect-[0.72] w-full items-center justify-center overflow-hidden rounded-lg bg-[#f5f6f3]">
        {document ? <DocumentThumbnail document={document} /> : <span className="font-mono text-[10px] text-muted-foreground">PAGE</span>}
        {page.status === "failed" ? <span className="absolute inset-x-1 bottom-1 rounded bg-destructive/90 px-1 py-0.5 text-[8px] font-medium text-white">failed</span> : null}
        {page.findingIds.length ? <span className="absolute right-1 top-1 size-2 rounded-full bg-amber-500 ring-2 ring-white" title={`${page.findingIds.length} finding`} /> : null}
      </div>
      <div className="mt-2 truncate text-[10px] font-medium text-foreground">Halaman {page.pageNumber}</div>
      <div className="mt-0.5 truncate text-[10px] text-muted-foreground" title={documentName}>{documentName}</div>
    </motion.button>
  );
}

export function SpatialIndex({
  job,
  selectedDocumentId,
  selectedPageId,
  selectedFindingId,
  zoom,
  onSelectPage,
  onZoomChange,
}: {
  job: ProcessingJob;
  selectedDocumentId?: string;
  selectedPageId?: string;
  selectedFindingId?: string;
  zoom: number;
  onSelectPage: (page: DocumentPage) => void;
  onZoomChange: (zoom: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const documentById = new Map(job.documents.map((document) => [document.id, document]));
  const indexedPages = job.pages.filter((page) => page.status !== "queued").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-[#f7f8f5]" aria-labelledby="spatial-index-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-white/75 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="size-2 rounded-full bg-primary/70" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 id="spatial-index-title" className="text-sm font-semibold text-foreground">Spatial document index</h2>
              <Badge variant="outline" className="tabular-nums text-[10px]">{indexedPages}/{job.pages.length} indexed</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">Peta dokumen dan halaman berdasarkan konteks kerja.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-white p-1" aria-label="Zoom spatial index">
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Perkecil zoom" title="Perkecil zoom" disabled={zoom <= 0.8} onClick={() => onZoomChange(Math.max(0.8, zoom - 0.1))}>
            <Minus className="size-3" />
          </Button>
          <span className="min-w-12 text-center font-mono text-[10px] tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Perbesar zoom" title="Perbesar zoom" disabled={zoom >= 1.2} onClick={() => onZoomChange(Math.min(1.2, zoom + 0.1))}>
            <Plus className="size-3" />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Fit to view" title="Fit to view" onClick={() => onZoomChange(1)}>
            <LayoutGridIcon className="size-3" />
          </Button>
        </div>
      </div>
      <div className="max-h-[560px] overflow-auto p-4 sm:p-5">
        <motion.div layout className="space-y-4" style={{ scale: zoom, transformOrigin: "top left", width: `${100 / zoom}%` }}>
          {job.groups.length ? (
            <AnimatePresence initial={false} mode="popLayout">
              {job.groups.map((group) => {
                const pages = job.pages.filter((page) => page.groupId === group.id);
                return (
                  <motion.section
                    layout
                    key={group.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.38, bounce: 0 }}
                    className="rounded-2xl border bg-white/60 p-3 sm:p-4"
                    style={{ borderColor: `${group.accent}55` }}
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.accent }} />
                        <div>
                          <h3 className="text-xs font-semibold text-foreground">{group.label}</h3>
                          <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{group.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-transparent text-[10px]" style={{ backgroundColor: group.softAccent, color: group.accent }}>
                        {pages.length} halaman
                      </Badge>
                    </div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(112px,1fr))]">
                      {pages.map((page) => {
                        const document = documentById.get(page.documentId);
                        const selected = page.id === selectedPageId || document?.id === selectedDocumentId;
                        const selectedFinding = Boolean(selectedFindingId && page.findingIds.includes(selectedFindingId));
                        return (
                          <PageCard
                            key={page.id}
                            page={page}
                            documentName={document?.name ?? "Dokumen"}
                            document={document}
                            selected={selected}
                            selectedFinding={selectedFinding}
                            onSelect={() => onSelectPage(page)}
                            reduceMotion={Boolean(reduceMotion)}
                          />
                        );
                      })}
                    </div>
                  </motion.section>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-border/80 bg-white/50 text-sm text-muted-foreground">Menunggu halaman diindeks…</div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

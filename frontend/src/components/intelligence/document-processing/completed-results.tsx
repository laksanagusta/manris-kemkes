"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Finding, ProcessingJob } from "@/types/document-processing";

function severityMeta(severity: Finding["severity"]) {
  if (severity === "critical" || severity === "high") {
    return { label: severity === "critical" ? "Kritis" : "Tinggi", tone: "danger" as const, dot: "bg-destructive" };
  }
  if (severity === "medium") return { label: "Sedang", tone: "warning" as const, dot: "bg-warning" };
  return { label: "Rendah", tone: "neutral" as const, dot: "bg-muted-foreground" };
}

export function FindingsReviewPanel({
  job,
  onUseRiskDraft,
  onStartNew,
}: {
  job: ProcessingJob;
  onUseRiskDraft: (finding: Finding) => void;
  onStartNew: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(10px) scale(0.98)" }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, transform: "translateY(0) scale(1)" }}
      transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="space-y-4"
      aria-labelledby="findings-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="findings-title" className="text-sm font-semibold text-foreground">
            Temuan untuk ditinjau
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Buka rincian sumber dan tindakan sebelum membuat draf risiko.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2 border-0 border-shadow" onClick={onStartNew}>
          <Plus className="size-3.5" />
          Mulai proses baru
        </Button>
      </div>

      {job.status === "failed" && job.error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          Analisis dari server gagal: {job.error}
        </div>
      ) : null}

      <div className="space-y-3">
        {job.findings.map((finding) => {
          const meta = severityMeta(finding.severity);
          return (
            <article
              key={finding.id}
              className="group rounded-xl border border-border/80 bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="w-full text-left">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-medium text-foreground">{finding.title}</h4>
                      <Badge tone={meta.tone} size="micro">
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-left text-xs leading-5 text-muted-foreground">{finding.summary}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="tabular-nums">Keyakinan {Math.round(finding.confidence * 100)}%</span>
              </div>
              <FindingSourceDisclosure finding={finding} />
              <footer className="-mx-4 -mb-4 mt-4 flex flex-wrap justify-end gap-2 border-t border-border/70 px-4 py-3">
                <Button type="button" variant="outline" size="xs" className="gap-1.5" onClick={() => onUseRiskDraft(finding)}>
                  Buat draf risiko
                </Button>
              </footer>
            </article>
          );
        })}
      </div>

      {job.findings.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">
          Tidak ada temuan yang dihasilkan dari proses ini.
        </div>
      ) : null}
    </motion.section>
  );
}

function FindingSourceDisclosure({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  const contentId = `finding-source-${finding.id}`;

  return (
    <div className="mt-3 border-t border-dashed border-border/70 pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-0 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-muted-foreground">Sumber</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors motion-reduce:transition-none">
          Lihat
          <ChevronDown className={cn("size-3.5 transition-[color,transform] duration-150 ease-(--ease-out) motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows] duration-200 ease-(--ease-out) motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-hidden transition-opacity duration-150 ease-(--ease-out) motion-reduce:duration-[120ms] motion-reduce:ease-(--ease-out)",
            open ? "opacity-100" : "opacity-0",
          )}
          id={contentId}
          aria-hidden={!open}
        >
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>{finding.source.documentName} · halaman {finding.source.pageNumber}</p>
            <blockquote className="italic">“{finding.source.quote}”</blockquote>
            <p><span className="font-medium text-foreground">Tindakan disarankan:</span> {finding.recommendedAction}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

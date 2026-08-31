"use client";

import { CheckCircle2, Download, ExternalLink, FileText, Plus, RotateCcw, XCircle } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Finding, ProcessingJob } from "@/types/document-processing";
import { formatDuration } from "./upload-utils";

function severityMeta(severity: Finding["severity"]) {
  if (severity === "critical" || severity === "high") return { label: severity === "critical" ? "Critical" : "High", tone: "danger" as const, dot: "bg-red-500" };
  if (severity === "medium") return { label: "Medium", tone: "warning" as const, dot: "bg-amber-500" };
  return { label: "Low", tone: "neutral" as const, dot: "bg-slate-400" };
}

export function CompletedResults({
  job,
  onSelectFinding,
  onOpenSource,
  onReviewFinding,
  onUseRiskDraft,
  onExport,
  onDownloadReport,
  onStartNew,
}: {
  job: ProcessingJob;
  onSelectFinding: (finding: Finding) => void;
  onOpenSource: (finding: Finding) => void;
  onReviewFinding: (finding: Finding) => void;
  onUseRiskDraft: (finding: Finding) => void;
  onExport: () => void;
  onDownloadReport: () => void;
  onStartNew: () => void;
}) {
  const partial = job.status === "partial" || job.status === "failed";
  const failed = job.status === "failed";
  const cancelled = job.status === "cancelled";
  const counts = {
    high: job.findings.filter((finding) => finding.severity === "high" || finding.severity === "critical").length,
    medium: job.findings.filter((finding) => finding.severity === "medium").length,
    low: job.findings.filter((finding) => finding.severity === "low").length,
  };
  const findingGroups = [
    { key: "high", label: "High priority", dot: "bg-red-500", findings: job.findings.filter((finding) => finding.severity === "high" || finding.severity === "critical") },
    { key: "medium", label: "Medium priority", dot: "bg-amber-500", findings: job.findings.filter((finding) => finding.severity === "medium") },
    { key: "low", label: "Low priority", dot: "bg-slate-400", findings: job.findings.filter((finding) => finding.severity === "low") },
  ].filter((group) => group.findings.length);
  return (
    <div className="space-y-4">
      <section className={cn("rounded-2xl border p-5 sm:p-6", cancelled || failed ? "border-border/80 bg-muted/30" : partial ? "border-amber-200/80 bg-amber-50/55" : "border-emerald-200/80 bg-emerald-50/50")} aria-labelledby="completed-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", cancelled || failed ? "bg-muted text-muted-foreground" : partial ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800")}>
              {cancelled || failed ? <XCircle className="size-5" /> : partial ? <RotateCcw className="size-5" /> : <CheckCircle2 className="size-5" />}
            </div>
            <div>
              <h2 id="completed-title" className="text-lg font-semibold tracking-[-0.02em] text-foreground">{cancelled ? "Process cancelled" : failed ? "Processing failed" : partial ? "Partial completion" : "Processing complete"}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{cancelled ? "Proses dihentikan dengan aman. Task dan halaman yang sudah selesai tetap dapat ditinjau atau dilanjutkan." : failed ? "Tidak ada dokumen yang berhasil diproses. Periksa file yang rusak lalu retry task terkait." : partial ? "Sebagian task memerlukan review atau retry. Hasil yang sudah berhasil tetap disimpan di spatial index." : "Document set sudah diindeks dan findings siap ditinjau berdasarkan sumber halaman."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.96]" onClick={onExport}><Download className="size-3.5" />Export result</Button>
            <Button type="button" variant="secondary" size="sm" className="gap-2 active:scale-[0.96]" onClick={onDownloadReport}><FileText className="size-3.5" />Download report</Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Summary label="Dokumen" value={`${job.documents.length}`} />
          <Summary label="Halaman" value={`${job.pages.length}`} />
          <Summary label="Kategori" value={`${job.groups.length}`} />
          <Summary label="Findings" value={`${job.findings.length}`} />
          <Summary label="Warning" value={`${job.tasks.filter((task) => task.status === "warning").length}`} />
          <Summary label="Durasi" value={formatDuration(job.durationMs)} />
        </div>
      </section>

      <section className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5" aria-labelledby="findings-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="findings-title" className="text-sm font-semibold text-foreground">Findings to review</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Pilih finding untuk meng-highlight halaman sumber pada spatial index dan membuka inspector.</p></div>
          <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.96]" onClick={onStartNew}><Plus className="size-3.5" />Start new process</Button>
        </div>
        <div className="mt-4 space-y-5">
          {findingGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-2"><span className={cn("size-2 rounded-full", group.dot)} /><h3 className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h3><span className="font-mono text-[10px] tabular-nums text-muted-foreground">{group.findings.length}</span></div>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.findings.map((finding) => {
                  const meta = severityMeta(finding.severity);
                  return (
                    <article key={finding.id} className="group rounded-xl border border-border/80 bg-background p-4 transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 hover:shadow-[0_4px_14px_rgba(0,0,0,0.04)]">
                      <button type="button" className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40" onClick={() => onSelectFinding(finding)}>
                        <div className="flex items-start gap-3"><span className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-medium text-foreground">{finding.title}</h4><Badge variant="outline" tone={meta.tone} size="micro">{meta.label}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{finding.summary}</p></div></div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground"><span>{finding.source.documentName}</span><span aria-hidden="true">·</span><span>Halaman {finding.source.pageNumber}</span><span aria-hidden="true">·</span><span className="tabular-nums">{Math.round(finding.confidence * 100)}% confidence</span></div>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3"><Button type="button" variant="ghost" size="xs" className="gap-1.5 active:scale-[0.96]" onClick={() => onOpenSource(finding)}><ExternalLink className="size-3" />Open source</Button><Button type="button" variant="secondary" size="xs" className="gap-1.5 active:scale-[0.96]" onClick={() => onReviewFinding(finding)}>Review finding</Button><Button type="button" variant="ghost" size="xs" className="gap-1.5 active:scale-[0.96]" onClick={() => onUseRiskDraft(finding)}>Draft risk</Button></div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {job.findings.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">Tidak ada finding yang dihasilkan dari batch ini.</div> : null}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground"><span className="font-medium text-foreground">Ringkasan severity:</span><span>{counts.high} high</span><span>{counts.medium} medium</span><span>{counts.low} low</span></div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-white/65 px-3 py-2.5"><div className="font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</div></div>;
}

"use client";

import { CheckCircle2, Download, ExternalLink, FileText, Plus, RotateCcw, XCircle } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Finding, ProcessingJob } from "@/types/document-processing";
import { formatDuration } from "./upload-utils";

function severityMeta(severity: Finding["severity"]) {
  if (severity === "critical" || severity === "high") return { label: severity === "critical" ? "Kritis" : "Tinggi", tone: "danger" as const, dot: "bg-destructive" };
  if (severity === "medium") return { label: "Sedang", tone: "warning" as const, dot: "bg-warning" };
  return { label: "Rendah", tone: "neutral" as const, dot: "bg-muted-foreground" };
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
    { key: "high", label: "Prioritas tinggi", dot: "bg-destructive", findings: job.findings.filter((finding) => finding.severity === "high" || finding.severity === "critical") },
    { key: "medium", label: "Prioritas sedang", dot: "bg-warning", findings: job.findings.filter((finding) => finding.severity === "medium") },
    { key: "low", label: "Prioritas rendah", dot: "bg-muted-foreground", findings: job.findings.filter((finding) => finding.severity === "low") },
  ].filter((group) => group.findings.length);
  return (
    <div className="space-y-4">
      <section className={cn("rounded-xl border p-5 sm:p-6", cancelled || failed ? "border-border/80 bg-muted/30" : partial ? "border-warning/30 bg-warning/10" : "border-success/30 bg-success/10")} aria-labelledby="completed-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", cancelled || failed ? "bg-muted text-muted-foreground" : partial ? "bg-warning/20 text-foreground" : "bg-success/20 text-success")}>
              {cancelled || failed ? <XCircle className="size-5" /> : partial ? <RotateCcw className="size-5" /> : <CheckCircle2 className="size-5" />}
            </div>
            <div>
              <h2 id="completed-title" className="text-lg font-semibold tracking-[-0.02em] text-foreground">{cancelled ? "Proses dibatalkan" : failed ? "Pemrosesan gagal" : partial ? "Sebagian proses selesai" : "Pemrosesan selesai"}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{cancelled ? "Proses dihentikan dengan aman. Tugas dan halaman yang sudah selesai tetap dapat ditinjau atau dilanjutkan." : failed ? "Tidak ada dokumen yang berhasil diproses. Periksa file yang rusak lalu coba lagi pada tugas terkait." : partial ? "Sebagian tugas perlu ditinjau atau dicoba kembali. Hasil yang berhasil tetap disimpan di indeks spasial." : "Kumpulan dokumen sudah diindeks dan temuan siap ditinjau berdasarkan sumber halaman."}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.96]" onClick={onExport}><Download className="size-3.5" />Ekspor hasil</Button>
            <Button type="button" variant="secondary" size="sm" className="gap-2 active:scale-[0.96]" onClick={onDownloadReport}><FileText className="size-3.5" />Unduh laporan</Button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Summary label="Dokumen" value={`${job.documents.length}`} />
          <Summary label="Halaman" value={`${job.pages.length}`} />
          <Summary label="Kategori" value={`${job.groups.length}`} />
          <Summary label="Temuan" value={`${job.findings.length}`} />
          <Summary label="Peringatan" value={`${job.tasks.filter((task) => task.status === "warning").length}`} />
          <Summary label="Durasi" value={formatDuration(job.durationMs)} />
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card p-4 sm:p-5" aria-labelledby="findings-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="findings-title" className="text-sm font-semibold text-foreground">Temuan untuk ditinjau</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Pilih temuan untuk menyorot halaman sumber pada indeks spasial dan membuka pemeriksa.</p></div>
          <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.96]" onClick={onStartNew}><Plus className="size-3.5" />Mulai proses baru</Button>
        </div>
        <div className="mt-4 space-y-5">
          {findingGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center gap-2"><span className={cn("size-2 rounded-full", group.dot)} /><h3 className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h3><span className="font-mono text-xs tabular-nums text-muted-foreground">{group.findings.length}</span></div>
              <div className="grid gap-3 lg:grid-cols-2">
                {group.findings.map((finding) => {
                  const meta = severityMeta(finding.severity);
                  return (
                    <article key={finding.id} className="group rounded-xl border border-border/80 bg-background p-4 transition-[border-color,box-shadow] duration-150 hover:border-foreground/20 hover:border-shadow">
                      <button type="button" className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40" onClick={() => onSelectFinding(finding)}>
                        <div className="flex items-start gap-3"><span className={cn("mt-1.5 size-2 shrink-0 rounded-full", meta.dot)} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-medium text-foreground">{finding.title}</h4><Badge variant="outline" tone={meta.tone} size="micro">{meta.label}</Badge></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{finding.summary}</p></div></div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"><span>{finding.source.documentName}</span><span aria-hidden="true">·</span><span>Halaman {finding.source.pageNumber}</span><span aria-hidden="true">·</span><span className="tabular-nums">Keyakinan {Math.round(finding.confidence * 100)}%</span></div>
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/70 pt-3"><Button type="button" variant="ghost" size="xs" className="gap-1.5 active:scale-[0.96]" onClick={() => onOpenSource(finding)}><ExternalLink className="size-3" />Buka sumber</Button><Button type="button" variant="secondary" size="xs" className="gap-1.5 active:scale-[0.96]" onClick={() => onReviewFinding(finding)}>Tinjau temuan</Button><Button type="button" variant="ghost" size="xs" className="gap-1.5 active:scale-[0.96]" onClick={() => onUseRiskDraft(finding)}>Buat draf risiko</Button></div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {job.findings.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-border/80 p-6 text-center text-sm text-muted-foreground">Tidak ada temuan yang dihasilkan dari proses ini.</div> : null}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Ringkasan tingkat:</span><span>{counts.high} tinggi</span><span>{counts.medium} sedang</span><span>{counts.low} rendah</span></div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5"><div className="font-display text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{value}</div></div>;
}

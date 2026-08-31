"use client";

import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  FileSearch,
  PanelLeftIcon,
  X,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Finding, ProcessingJob } from "@/types/document-processing";
import { DocumentThumbnail } from "./upload-panel";
import { formatFileSize } from "./upload-utils";

function documentStatus(document: ProcessingJob["documents"][number]) {
  switch (document.status) {
    case "indexed":
      return { label: "Indexed", tone: "success" as const };
    case "failed":
      return { label: "Failed", tone: "danger" as const };
    case "warning":
      return { label: "Warning", tone: "warning" as const };
    case "indexing":
      return { label: "Indexing", tone: "progress" as const };
    default:
      return { label: "Ready", tone: "neutral" as const };
  }
}

function severityMeta(severity: Finding["severity"]) {
  if (severity === "critical" || severity === "high") return { label: severity === "critical" ? "Critical" : "High", tone: "danger" as const };
  if (severity === "medium") return { label: "Medium", tone: "warning" as const };
  return { label: "Low", tone: "neutral" as const };
}

export function Inspector({
  job,
  selectedDocumentId,
  selectedFinding,
  onClose,
  onOpenSource,
  onUseRiskDraft,
}: {
  job?: ProcessingJob;
  selectedDocumentId?: string;
  selectedFinding?: Finding;
  onClose: () => void;
  onOpenSource: (finding: Finding) => void;
  onUseRiskDraft: (finding: Finding) => void;
}) {
  const document = job?.documents.find((item) => item.id === (selectedFinding?.source.documentId ?? selectedDocumentId));
  const page = job?.pages.find((item) => item.id === `${selectedFinding?.source.documentId}-page-${selectedFinding?.source.pageNumber}`);

  return (
    <aside className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-white" aria-label="Document inspector">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <PanelLeftIcon className="size-3.5 text-muted-foreground" />
          <span className="font-display truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Inspector</span>
        </div>
        <button type="button" aria-label="Tutup inspector" title="Tutup inspector" onClick={onClose} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-[background-color,color] duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.96]">
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-[calc(100vh-210px)] overflow-auto p-4">
        {selectedFinding ? (
          <FindingInspector finding={selectedFinding} document={document} onOpenSource={onOpenSource} onUseRiskDraft={onUseRiskDraft} />
        ) : document ? (
          <DocumentInspector document={document} page={page} job={job} />
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FileSearch className="size-5" /></div>
            <h2 className="mt-3 text-sm font-semibold text-foreground">Pilih halaman atau dokumen</h2>
            <p className="mt-1 max-w-[220px] text-xs leading-5 text-muted-foreground">Metadata, status processing, dan temuan terkait akan muncul di sini.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function DocumentInspector({
  document,
  page,
  job,
}: {
  document: ProcessingJob["documents"][number];
  page?: ProcessingJob["pages"][number];
  job?: ProcessingJob;
}) {
  const status = documentStatus(document);
  const group = job?.groups.find((item) => item.id === page?.groupId);
  const findings = job?.findings.filter((finding) => finding.source.documentId === document.id) ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <DocumentThumbnail document={document} />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-sm font-semibold leading-5 text-foreground">{document.name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline" tone={status.tone} size="micro">{status.label}</Badge><Badge variant="secondary" size="micro">{document.extension.toUpperCase()}</Badge></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border/70 py-4">
        <Meta label="Ukuran" value={formatFileSize(document.size)} />
        <Meta label="Halaman" value={`${document.pages}`} />
        <Meta label="Kelompok" value={group?.label ?? "—"} />
        <Meta label="Temuan" value={`${findings.length}`} />
      </div>
      {page ? <div className="rounded-xl border border-border/70 bg-muted/20 p-3"><div className="font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Halaman terpilih</div><div className="mt-1 text-sm font-medium text-foreground">Halaman {page.pageNumber}</div><p className="mt-1 text-xs leading-5 text-muted-foreground">{page.findingIds.length ? `${page.findingIds.length} finding terkait halaman ini.` : "Belum ada finding yang terhubung."}</p></div> : null}
      {document.error ? <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{document.error}</div> : null}
    </div>
  );
}

function FindingInspector({
  finding,
  document,
  onOpenSource,
  onUseRiskDraft,
}: {
  finding: Finding;
  document?: ProcessingJob["documents"][number];
  onOpenSource: (finding: Finding) => void;
  onUseRiskDraft: (finding: Finding) => void;
}) {
  const severity = severityMeta(finding.severity);
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" tone={severity.tone} size="compact">{severity.label}</Badge><Badge variant="secondary" size="compact">{finding.category}</Badge></div>
        <h2 className="text-base font-semibold leading-6 tracking-[-0.01em] text-foreground text-balance">{finding.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{finding.summary}</p>
      </div>
      <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
        <div className="flex items-center justify-between gap-3"><span className="font-display text-[10px] uppercase tracking-[0.12em] text-amber-900/70">Confidence</span><span className="font-mono text-sm font-medium tabular-nums text-amber-900">{Math.round(finding.confidence * 100)}%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${finding.confidence * 100}%` }} /></div>
      </div>
      <div className="space-y-3">
        <div className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Source reference</div>
        <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="flex items-start gap-2"><FileSearch className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><div className="min-w-0"><div className="break-words text-xs font-medium text-foreground">{document?.name ?? finding.source.documentName}</div><div className="mt-1 text-[11px] text-muted-foreground">{finding.source.location}</div></div></div>
          <p className="mt-3 border-l-2 border-amber-300 pl-3 text-xs italic leading-5 text-muted-foreground">“{finding.source.quote}”</p>
        </div>
      </div>
      <div className="space-y-2"><div className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recommended action</div><p className="text-sm leading-6 text-foreground">{finding.recommendedAction}</p></div>
      <div className="space-y-2 border-t border-border/70 pt-4">
        <Button type="button" variant="outline" className="w-full justify-between gap-2 active:scale-[0.96]" onClick={() => onOpenSource(finding)}>Open source <ExternalLink className="size-3.5" /></Button>
        <Button type="button" variant="secondary" className="w-full justify-between gap-2 active:scale-[0.96]" onClick={() => onUseRiskDraft(finding)}>Use as draft risk <ArrowRight className="size-3.5" /></Button>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><div className="font-display text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div><div className="mt-1 truncate text-xs font-medium text-foreground" title={value}>{value}</div></div>;
}

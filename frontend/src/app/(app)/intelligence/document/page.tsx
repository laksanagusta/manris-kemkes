"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Loader2,
  Copy,
  ShieldAlert,
  Sparkles,
  Target,
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  analyzeDocumentIntelligence,
  type AnalyzeDocumentIntelligenceInput,
} from "@/lib/api/document-intelligence";
import {
  createDocumentIntelligencePrefillToken,
  DOCUMENT_INTELLIGENCE_PREFILL_PARAM,
  saveLatestMitigationReportPrefill,
  saveDocumentIntelligencePrefill,
} from "@/lib/document-intelligence-prefill";
import type {
  DocumentAnalysisMode,
  DocumentIntelligenceResponse,
  DocumentRiskSuggestion,
  MitigationTaskReportSuggestion,
  StrategicIKUSuggestion,
  StrategicObjectiveSuggestion,
} from "@/types/document-intelligence";

type ModeOption = {
  value: DocumentAnalysisMode;
  label: string;
  title: string;
  description: string;
  icon: typeof FileSearch;
};

const modeOptions: ModeOption[] = [
  {
    value: "sop_risk_universe",
    label: "SOP",
    title: "SOP → Risk Universe",
    description: "Ekstrak tahapan proses dan usulkan risiko per tahap.",
    icon: ClipboardList,
  },
  {
    value: "audit_finding_mapper",
    label: "Audit",
    title: "Audit Finding → Risk",
    description: "Map temuan audit ke risiko yang sudah ada atau draft baru.",
    icon: ShieldAlert,
  },
  {
    value: "strategic_objective_risk",
    label: "Strategic",
    title: "Struktur Kinerja & RO → Risiko",
    description: "Tarik struktur planning dan risiko terkait.",
    icon: Target,
  },
  {
    value: "mitigation_report_mapper",
    label: "Mitigasi",
    title: "Mitigation Report Draft",
    description: "Cocokkan dokumen bukti dengan mitigasi yang masih open.",
    icon: Sparkles,
  },
];

function sourceQuote(sourceRefs?: Array<{ quote: string; location?: string }>) {
  if (!sourceRefs?.length) return null;
  const first = sourceRefs[0];
  return (
    <div className="space-y-1 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        Kutipan Sumber
      </div>
      <p className="text-sm leading-6 text-foreground">{first.quote}</p>
      {first.location ? (
        <p className="text-xs text-muted-foreground">{first.location}</p>
      ) : null}
    </div>
  );
}

function confidenceBadgeClass(confidence: number) {
  if (confidence >= 80)
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (confidence >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function mapRiskDraftSource(source: string) {
  const normalized = source.toLowerCase();
  if (normalized.includes("eksternal") || normalized.includes("external")) {
    return "eksternal";
  }
  return "internal";
}

function buildRiskPrefill(suggestion: DocumentRiskSuggestion) {
  return {
    kind: "risk" as const,
    title: suggestion.title,
    description: [
      suggestion.description,
      suggestion.relatedObjectiveText
        ? `Sasaran: ${suggestion.relatedObjectiveText}`
        : "",
      suggestion.relatedIkuText ? `IKU: ${suggestion.relatedIkuText}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    source: mapRiskDraftSource(suggestion.riskSource),
    probability: suggestion.probability,
    impact: suggestion.impact,
    mitigation:
      suggestion.mitigations?.[0]?.action || suggestion.controlGap || "",
    quote: suggestion.sourceRefs?.[0]?.quote || "",
    treatmentOption: suggestion.treatmentOption as
      | "menerima"
      | "mitigasi"
      | "avoid"
      | "mitigate"
      | "transfer"
      | "accept"
      | undefined,
  };
}

function buildMitigationPrefill(task: MitigationTaskReportSuggestion) {
  return {
    kind: "mitigation-report" as const,
    taskId: task.taskId,
    progressPct: task.progressPct,
    actualCost: task.actualCost,
    notes: task.reportNotes,
    quote: task.sourceRefs?.[0]?.quote || "",
  };
}

function formatMitigationDraft(task: MitigationTaskReportSuggestion) {
  const sourceQuote = task.sourceRefs?.[0]?.quote || "-";

  return [
    `Risk: ${task.riskCode} · ${task.riskTitle}`,
    `Mitigasi: ${task.mitigationAction}`,
    `Periode: ${task.periodLabel}`,
    `Status usulan: ${task.suggestedStatus}`,
    `Progress: ${task.progressPct}%`,
    `Biaya aktual: ${task.actualCost ? task.actualCost.toLocaleString("id-ID") : "0"}`,
    `Catatan: ${task.reportNotes || "-"}`,
    `Alasan AI: ${task.reasoning}`,
    `Kutipan sumber: ${sourceQuote}`,
  ].join("\n");
}

export default function DocumentIntelligencePage() {
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const { token, user } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<DocumentAnalysisMode>("sop_risk_universe");
  const [file, setFile] = useState<File | null>(null);
  const [period, setPeriod] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<DocumentIntelligenceResponse | null>(
    null,
  );

  const activeMode = useMemo(
    () => modeOptions.find((option) => option.value === mode) ?? modeOptions[0],
    [mode],
  );

  if (aiFeaturesDisabled) {
    return (
      <AIFeaturesDisabledState
        title="Document Intelligence Dinonaktifkan"
        description="Analisis dokumen berbasis AI sedang dimatikan melalui environment frontend."
      />
    );
  }

  async function handleAnalyze() {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!file) {
      toast.error("Pilih file PDF atau XLSX terlebih dahulu.");
      return;
    }

    try {
      setLoading(true);
      const input: AnalyzeDocumentIntelligenceInput = {
        file,
        mode,
        period: period.trim() || undefined,
        organizationId:
          organizationId.trim() || user?.organizationId || undefined,
      };
      const result = await analyzeDocumentIntelligence(token, input);
      setResponse(result);
      toast.success("Dokumen berhasil dianalisis.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menganalisis dokumen.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function openRiskDraft(suggestion: DocumentRiskSuggestion) {
    const prefillToken = createDocumentIntelligencePrefillToken();
    saveDocumentIntelligencePrefill(prefillToken, buildRiskPrefill(suggestion));
    router.push(
      `/risk/register/new?${DOCUMENT_INTELLIGENCE_PREFILL_PARAM}=${prefillToken}`,
    );
  }

  function openObjectiveDraft() {
    router.push("/management/planning");
  }

  function openMitigationDraft(task: MitigationTaskReportSuggestion) {
    const prefillToken = createDocumentIntelligencePrefillToken();
    const payload = buildMitigationPrefill(task);
    saveDocumentIntelligencePrefill(prefillToken, payload);
    saveLatestMitigationReportPrefill(payload);
    const draftText = formatMitigationDraft(task);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(draftText).catch(() => {
        // ignore clipboard failures; token is still saved locally
      });
    }
    toast.success("Draft laporan mitigasi disalin ke clipboard.");
  }

  const documentMeta = response?.document;
  const warningCount = documentMeta?.warnings?.length ?? 0;
  const result = response?.result;

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge className="gap-2 border-primary/15 bg-primary/[0.06] px-2.5 py-0.5 text-primary">
            <FileSearch className="size-3.5" />
            AI & Automation
          </Badge>
          {file ? (
            <Badge variant="outline" className="text-[11px]">
              {file.name}
            </Badge>
          ) : null}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Document Intelligence
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Upload SOP, laporan audit, dokumen strategis, atau bukti mitigasi
            untuk mengekstrak data terstruktur yang bisa langsung dijadikan
            draft.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">Input</h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Pilih dokumen dan mode analisis. PDF dan XLSX didukung.
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-file">File dokumen</Label>
                <Input
                  id="doc-file"
                  type="file"
                  accept=".pdf,.xlsx"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Mode analisis</Label>
                <div className="space-y-2">
                  {modeOptions.map((option) => {
                    const Icon = option.icon;
                    const active = option.value === mode;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setMode(option.value)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-primary/30 bg-primary/[0.05] text-foreground"
                            : "border-border/60 bg-background hover:bg-muted/30",
                        )}
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {option.label}
                          </span>
                          <span className="block text-xs leading-5 text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Periode</Label>
                <Input
                  id="period"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  placeholder="Contoh: 2026-H1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization ID</Label>
                <Input
                  id="organizationId"
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  placeholder={user?.organizationId || "Opsional"}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Kosongkan untuk memakai organisasi aktif dari sesi login.
                </p>
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={loading || !token || !file}
                className="w-full gap-2"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {loading ? "Menganalisis..." : "Analisis Dokumen"}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <h2 className="text-sm font-semibold text-foreground">
              Mode aktif
            </h2>
            <div className="mt-3 space-y-2">
              <div className="text-sm font-medium text-foreground">
                {activeMode.title}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {activeMode.description}
              </p>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Hasil Analisis
                  </h2>
                  {documentMeta ? (
                    <Badge variant="outline" className="text-[11px]">
                      {documentMeta.textLength.toLocaleString("id-ID")} karakter
                    </Badge>
                  ) : null}
                </div>
                <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
                  Hasil di bawah ini adalah draft terstruktur. Kita tetap review
                  manual sebelum dipindahkan ke form resmi.
                </p>
              </div>

              {documentMeta?.warnings?.length ? (
                <Badge className="gap-2 border-amber-200 bg-amber-50 text-amber-700">
                  <AlertTriangle className="size-3.5" />
                  Ada peringatan ekstraksi
                </Badge>
              ) : null}
            </div>

            {documentMeta ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    File
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {documentMeta.filename}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Mode
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {activeMode.title}
                  </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Peringatan
                  </div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {warningCount ? `${warningCount} catatan` : "Tidak ada"}
                  </div>
                </div>
              </div>
            ) : null}

            {documentMeta?.warnings?.length ? (
              <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                {documentMeta.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="flex items-start gap-2 text-sm text-amber-800"
                  >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {!response ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-background p-8">
              <div className="max-w-2xl space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                  Belum ada hasil
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Upload dokumen lalu jalankan analisis. Hasil akan muncul di
                  sini sebagai proses, temuan, sasaran, IKU, atau task mitigasi
                  yang masih open.
                </p>
              </div>
            </div>
          ) : (
            <DocumentResultPanel
              response={response}
              onUseRiskDraft={openRiskDraft}
              onUseObjectiveDraft={openObjectiveDraft}
              onUseMitigationDraft={openMitigationDraft}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function DocumentResultPanel({
  response,
  onUseRiskDraft,
  onUseObjectiveDraft,
  onUseMitigationDraft,
}: {
  response: DocumentIntelligenceResponse;
  onUseRiskDraft: (suggestion: DocumentRiskSuggestion) => void;
  onUseObjectiveDraft: () => void;
  onUseMitigationDraft: (task: MitigationTaskReportSuggestion) => void;
}) {
  const result = response.result;

  if (result.sop?.processStages?.length) {
    return (
      <div className="space-y-4">
        {result.sop.processStages.map((stage) => (
          <section
            key={stage.clientKey}
            className="rounded-2xl border border-border/60 bg-background p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {stage.stageName}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      confidenceBadgeClass(stage.confidence),
                    )}
                  >
                    {stage.confidence}% yakin
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {stage.description}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_420px]">
              <div className="space-y-4">
                {sourceQuote(stage.sourceRefs)}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    Kontrol / Gap
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    {stage.existingControl || "Belum ada kontrol eksplisit."}
                  </p>
                  {stage.controlGap ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {stage.controlGap}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Risiko yang disarankan
                </div>
                {stage.suggestedRisks.map((risk) => (
                  <div
                    key={risk.clientKey}
                    className="rounded-xl border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">
                          {risk.title}
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {risk.description}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          confidenceBadgeClass(risk.confidence),
                        )}
                      >
                        {risk.confidence}%
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-[11px]">
                        P {risk.probability}
                      </Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        D {risk.impact}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {risk.category}
                      </Badge>
                    </div>
                    <div className="mt-3">{sourceQuote(risk.sourceRefs)}</div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 w-full gap-2"
                      onClick={() => onUseRiskDraft(risk)}
                    >
                      Gunakan sebagai draft risiko
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (result.audit?.findings?.length) {
    return (
      <div className="space-y-4">
        {result.audit.findings.map((finding) => (
          <section
            key={finding.clientKey}
            className="rounded-2xl border border-border/60 bg-background p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {finding.findingTitle}
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[11px] border-border bg-muted/30 text-muted-foreground"
                  >
                    {finding.mappingStatus}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      confidenceBadgeClass(finding.confidence),
                    )}
                  >
                    {finding.confidence}%
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {finding.findingDescription}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Akar Masalah
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {finding.rootCause}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Dampak
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {finding.impact}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Area
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {finding.affectedArea}
                      </div>
                    </div>
                  </div>
                </div>
                {sourceQuote(finding.sourceRefs)}
              </div>

              <div className="space-y-3">
                {finding.existingRiskCode || finding.existingRiskTitle ? (
                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Risiko Terkait
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">
                      {finding.existingRiskCode
                        ? `${finding.existingRiskCode} · `
                        : ""}
                      {finding.existingRiskTitle}
                    </div>
                  </div>
                ) : null}

                {finding.suggestedRisk ? (
                  <div className="rounded-xl border border-border/60 bg-background p-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Draft Risiko Baru
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="text-sm font-medium text-foreground">
                        {finding.suggestedRisk.title}
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {finding.suggestedRisk.description}
                      </p>
                      {sourceQuote(finding.suggestedRisk.sourceRefs)}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3 w-full gap-2"
                      onClick={() => onUseRiskDraft(finding.suggestedRisk!)}
                    >
                      Gunakan sebagai draft risiko
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (result.strategic?.objectives?.length) {
    return (
      <div className="space-y-4">
        {result.strategic.objectives.map((objective) => (
          <section
            key={objective.clientKey}
            className="rounded-2xl border border-border/60 bg-background p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {objective.sasaran}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      confidenceBadgeClass(objective.confidence),
                    )}
                  >
                    {objective.confidence}%
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {objective.tujuan}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Periode
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {objective.period || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Unit
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {objective.unit || "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        RO
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {objective.roTitle ||
                          objective.ikus[0]?.roTitle ||
                          objective.ikus[0]?.processBusiness ||
                          "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        IKU
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {objective.ikus.length}
                      </div>
                    </div>
                  </div>
                </div>
                {sourceQuote(objective.sourceRefs)}
              </div>

              <div className="space-y-3">
                {objective.ikus.map((iku) => (
                  <div
                    key={iku.clientKey}
                    className="rounded-xl border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {iku.name}
                        </div>
                        {iku.target ? (
                          <p className="text-xs leading-5 text-muted-foreground">
                            Target: {iku.target}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          confidenceBadgeClass(iku.confidence),
                        )}
                      >
                        {iku.confidence}%
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={() => onUseObjectiveDraft()}
                      >
                        Buka Struktur Kinerja
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                    {iku.suggestedRisks.length ? (
                      <div className="mt-3 space-y-2">
                        {iku.suggestedRisks.map((risk) => (
                          <div
                            key={risk.clientKey}
                            className="rounded-lg border border-border/60 bg-muted/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="text-sm font-medium text-foreground">
                                  {risk.title}
                                </div>
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {risk.description}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[11px]",
                                  confidenceBadgeClass(risk.confidence),
                                )}
                              >
                                {risk.confidence}%
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                P {risk.probability}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                D {risk.impact}
                              </Badge>
                            </div>
                            <div className="mt-2">
                              {sourceQuote(risk.sourceRefs)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 w-full gap-2"
                              onClick={() => onUseRiskDraft(risk)}
                            >
                              Gunakan sebagai draft risiko
                              <ArrowRight className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (result.mitigation?.taskMatches?.length) {
    return (
      <div className="space-y-4">
        {result.mitigation.taskMatches.map((task) => (
          <section
            key={task.clientKey}
            className="rounded-2xl border border-border/60 bg-background p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {task.riskCode} · {task.riskTitle}
                  </h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px]",
                      confidenceBadgeClass(task.confidence),
                    )}
                  >
                    {task.confidence}%
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {task.mitigationAction}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {task.suggestedStatus}
                </Badge>
                <Badge variant="outline" className="text-[11px]">
                  {task.progressPct}%
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
              <div className="space-y-3">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Periode
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {task.periodLabel}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Biaya Aktual
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {task.actualCost
                          ? task.actualCost.toLocaleString("id-ID")
                          : "-"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        Catatan
                      </div>
                      <div className="mt-1 text-sm text-foreground">
                        {task.reportNotes || "-"}
                      </div>
                    </div>
                  </div>
                  {task.blocker ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      {task.blocker}
                    </div>
                  ) : null}
                </div>
                {sourceQuote(task.sourceRefs)}
              </div>

              <div className="rounded-xl border border-border/60 bg-background p-4">
                <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  Ringkasan Pelaporan
                </div>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {task.reasoning}
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Bukti dibaca dari dokumen, lalu dipetakan ke task mitigasi
                  open.
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Buka detail risiko terkait untuk menerapkan draft laporan
                  mitigasi. Evidence URL tetap wajib diisi manual.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 w-full gap-2"
                  onClick={() => onUseMitigationDraft(task)}
                >
                  <Copy className="size-4" />
                  Salin draft laporan
                </Button>
              </div>
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-background p-8">
      <div className="max-w-2xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CheckCircle2 className="size-4 text-muted-foreground" />
          Tidak ada struktur hasil yang dikenali
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Dokumen berhasil diproses, tetapi AI belum mengembalikan struktur yang
          cocok untuk mode ini. Coba ubah mode atau gunakan dokumen yang lebih
          spesifik.
        </p>
      </div>
    </div>
  );
}

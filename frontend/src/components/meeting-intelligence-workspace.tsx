"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createMeetingIntelligencePrefillToken,
  MEETING_INTELLIGENCE_PREFILL_PARAM,
  saveMeetingIntelligencePrefill,
  type RiskDraftPrefill,
} from "@/lib/meeting-intelligence";
import {
  filterMeetingRiskOptions,
  normalizeMeetingMinuteDate,
} from "@/lib/meeting-minutes-utils";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Clock3,
  GitBranch,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { createMeetingMinute } from "@/lib/meeting-minutes";

type WorkspaceMode = "minutes" | "risk";
type MinutesPriority = "High" | "Medium" | "Low";
type MinutesStatus = "open" | "on_track" | "blocked";
type TranscriptSuggestionTargetType = "existing" | "new";
type TranscriptRiskChangeOperation = "set" | "append";

interface CandidateRisk {
  id: string;
  code: string;
  title: string;
}

interface TranscriptRiskChangeValue {
  action?: string;
  owner?: string;
  dueDate?: string | null;
  frequency?: string;
  text?: string;
  value?: string;
  items?: string[];
  values?: string[];
  [key: string]: unknown;
}

interface TranscriptRiskChange {
  id: string;
  field:
    | "description"
    | "cause"
    | "impactDesc"
    | "existingControl"
    | "treatmentOption"
    | "mitigations"
    | "probability"
    | "impact";
  operation: TranscriptRiskChangeOperation;
  label: string;
  value: string | number | string[] | TranscriptRiskChangeValue;
  reasoning: string;
  quote: string;
}

interface TranscriptDraftPrefill {
  title: string;
  description: string;
  source?: string;
  probability?: number;
  impact?: number;
  mitigation?: string;
  treatmentOption?: "menerima" | "mitigasi" | "avoid" | "mitigate" | "transfer" | "accept";
}

interface Suggestion {
  id: string;
  targetType: TranscriptSuggestionTargetType;
  targetRiskId?: string;
  targetRiskCode?: string;
  targetRiskTitle?: string;
  matchConfidence?: number;
  candidateRisks?: CandidateRisk[];
  quote: string;
  reasoning: string;
  changes?: TranscriptRiskChange[];
  draftPrefill?: TranscriptDraftPrefill;
}

interface TranscriptAnalysisResponse {
  suggestions?: Suggestion[];
}

interface RiskDetailResponse {
  id: string;
  code: string;
  title: string;
  description: string;
  status: string;
  cause?: string[];
  impactDesc?: string[];
  existingControl?: string;
  treatmentOption?: string;
  probability?: number;
  impact?: number;
  mitigations?: Array<{
    action: string;
    owner: string;
    dueDate?: string | null;
    frequency?: string;
  }>;
}

interface ApplyRiskChangeResponse {
  riskId: string;
  riskCode: string;
  status: string;
  createdNewVersion: boolean;
}

interface MinutesActionItem {
  task: string;
  pic: string;
  ownerUnit?: string;
  deadline: string;
  priority: MinutesPriority;
  status?: MinutesStatus;
  notes?: string;
  relatedDecision?: string;
  needsConfirmation?: string[];
}

interface MinutesResult {
  id: string;
  title: string;
  date: string;
  participants: string[];
  agenda: string[];
  summary: string;
  keyPoints: string[];
  decisions: string[];
  openIssues: string[];
  actionItems: MinutesActionItem[];
  nextCheckIn?: string;
  createdAt: string;
}

interface MinutesResponse {
  title?: string;
  date?: string;
  participants?: string[];
  agenda?: string[];
  summary?: string;
  keyPoints?: string[];
  decisions?: string[];
  openIssues?: string[];
  actionItems?: MinutesActionItem[];
  nextCheckIn?: string;
}

interface RiskSummary {
  id: string;
  code: string;
  title: string;
  status?: string;
  assessmentCycle?: string;
}

const modeConfig: Record<
  WorkspaceMode,
  {
    title: string;
    summary: string;
    actionLabel: string;
    runningLabel: string;
    icon: typeof CalendarDays;
    accent: string;
    chip: string;
  }
> = {
  minutes: {
    title: "Buat Notulen",
    summary: "Susun notulen rapat yang rapi tanpa membuka hasil analisis risiko.",
    actionLabel: "Buat Notulen",
    runningLabel: "Menyusun notulen...",
    icon: CalendarDays,
    accent: "border-primary/30 bg-primary/[0.06] text-primary",
    chip: "bg-primary/10 text-primary border-primary/20",
  },
  risk: {
    title: "Tinjau Perubahan Risiko",
    summary: "Nilai apakah rapat memunculkan risiko baru atau perubahan pada risiko yang sudah ada.",
    actionLabel: "Tinjau Perubahan Risiko",
    runningLabel: "Meninjau perubahan risiko...",
    icon: ShieldAlert,
    accent: "border-amber-500/30 bg-amber-500/[0.06] text-amber-700",
    chip: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
};

const priorityVariant: Record<MinutesPriority, string> = {
  High: "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
  Medium: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Low: "bg-risk-low/15 text-risk-low border-risk-low/20",
};

const statusVariant: Record<MinutesStatus, string> = {
  open: "bg-primary/10 text-primary border-primary/20",
  on_track: "bg-success/10 text-success border-success/20",
  blocked: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

const statusLabel: Record<MinutesStatus, string> = {
  open: "Open",
  on_track: "On Track",
  blocked: "Blocked",
};

const suggestionTypeConfig: Record<
  TranscriptSuggestionTargetType,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  existing: {
    label: "Existing Risk",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  new: {
    label: "Risiko Baru",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
  },
};

const lowConfidenceThreshold = 70;

function isLockedRiskStatus(status?: string) {
  return status === "assessment_in_review" || status === "approved";
}

function getRiskStatusLabel(status?: string) {
  switch (status) {
    case "assessment_in_review":
      return "Sedang Ditinjau";
    case "approved":
      return "Approved";
    case "assessment_draft":
      return "Draft";
    default:
      return "Belum diketahui";
  }
}

function normalizePriority(priority?: string): MinutesPriority {
  return priority === "High" || priority === "Low" ? priority : "Medium";
}

function normalizeStatus(status?: string): MinutesStatus {
  return status === "on_track" || status === "blocked" ? status : "open";
}

function needsConfirmation(item: MinutesActionItem, field: "pic" | "deadline") {
  return item.needsConfirmation?.includes(field) || (field === "pic" ? !item.pic?.trim() : !item.deadline?.trim());
}

function createMinutesId(index: number) {
  return `MOM-${String(index).padStart(3, "0")}`;
}

function isLowConfidenceSuggestion(suggestion: Suggestion) {
  return (
    suggestion.targetType === "existing" &&
    typeof suggestion.matchConfidence === "number" &&
    suggestion.matchConfidence < lowConfidenceThreshold
  );
}

function getFieldLabel(field: TranscriptRiskChange["field"]) {
  switch (field) {
    case "description":
      return "Deskripsi";
    case "cause":
      return "Penyebab";
    case "impactDesc":
      return "Dampak";
    case "existingControl":
      return "Kontrol yang sudah ada";
    case "treatmentOption":
      return "Treatment option";
    case "mitigations":
      return "Penanganan";
    case "probability":
      return "Probability";
    case "impact":
      return "Impact";
    default:
      return field;
  }
}

function readChangeTextValue(value: TranscriptRiskChange["value"]) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value && typeof value === "object") {
    const record = value as TranscriptRiskChangeValue;
    if (typeof record.text === "string") return record.text;
    if (typeof record.value === "string") return record.value;
    if (Array.isArray(record.items)) return record.items.join(", ");
    if (Array.isArray(record.values)) return record.values.join(", ");
    if (typeof record.action === "string") return record.action;
  }
  return "Nilai belum tersedia";
}

function getRiskFieldSnapshot(risk: RiskDetailResponse | null, field: TranscriptRiskChange["field"]) {
  if (!risk) return "Memuat data risiko...";

  switch (field) {
    case "description":
      return risk.description || "Belum ada deskripsi.";
    case "cause":
      return risk.cause?.join(", ") || "Belum ada penyebab.";
    case "impactDesc":
      return risk.impactDesc?.join(", ") || "Belum ada dampak.";
    case "existingControl":
      return risk.existingControl || "Belum ada kontrol.";
    case "treatmentOption":
      return risk.treatmentOption || "Belum ditetapkan.";
    case "probability":
      return risk.probability ? String(risk.probability) : "-";
    case "impact":
      return risk.impact ? String(risk.impact) : "-";
    case "mitigations":
      return risk.mitigations?.map((item) => item.action).join(", ") || "Belum ada mitigasi.";
    default:
      return "-";
  }
}

function buildNextFieldSnapshot(risk: RiskDetailResponse | null, change: TranscriptRiskChange) {
  const proposed = readChangeTextValue(change.value);
  if (!risk) return proposed;
  if (change.operation === "append") {
    const current = getRiskFieldSnapshot(risk, change.field);
    if (!current || current.startsWith("Belum")) {
      return proposed;
    }
    return `${current}, ${proposed}`;
  }
  return proposed;
}

export function MeetingIntelligenceWorkspace({
  initialMode,
}: {
  initialMode: WorkspaceMode;
}) {
  if (isAIFeaturesDisabled()) {
    return (
      <AIFeaturesDisabledState
        title="Workspace AI Dinonaktifkan"
        description="Analisis meeting, transkrip, dan generator notulen sedang dimatikan melalui environment frontend."
        backHref="/overview"
      />
    );
  }

  return <MeetingIntelligenceWorkspaceContent initialMode={initialMode} />;
}

function MeetingIntelligenceWorkspaceContent({
  initialMode,
}: {
  initialMode: WorkspaceMode;
}) {
  const router = useRouter();
  const { token, user } = useAuth();
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const [transcript, setTranscript] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [generatedMinutes, setGeneratedMinutes] = useState<MinutesResult | null>(null);
  const [reviewSuggestion, setReviewSuggestion] = useState<Suggestion | null>(null);
  const [selectedChangeIds, setSelectedChangeIds] = useState<string[]>([]);
  const [manualTargetRiskId, setManualTargetRiskId] = useState("");
  const [targetRiskDetails, setTargetRiskDetails] = useState<RiskDetailResponse | null>(null);
  const [isLoadingRiskDetails, setIsLoadingRiskDetails] = useState(false);
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
  const [appliedResults, setAppliedResults] = useState<Record<string, ApplyRiskChangeResponse>>({});
  const [savedMinutesId, setSavedMinutesId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [isSavingMinutes, setIsSavingMinutes] = useState(false);
  const [availableRisks, setAvailableRisks] = useState<RiskSummary[]>([]);
  const [allRisks, setAllRisks] = useState<RiskSummary[]>([]);
  const [isLoadingRisks, setIsLoadingRisks] = useState(false);
  const [riskSearchQuery, setRiskSearchQuery] = useState("");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const selectedMode = modeConfig[mode];
  const canApplyExistingRisk = user?.role === "unit" || user?.role === "superadmin";
  const reviewTargetIsLocked = isLockedRiskStatus(targetRiskDetails?.status);

  const suggestionSummary = useMemo(() => {
    return {
      existing: suggestions.filter((suggestion) => suggestion.targetType === "existing").length,
      new: suggestions.filter((suggestion) => suggestion.targetType === "new").length,
      lowConfidence: suggestions.filter((suggestion) => isLowConfidenceSuggestion(suggestion)).length,
    };
  }, [suggestions]);

  const minutesSummary = useMemo(() => {
    if (!generatedMinutes) return null;

    const missingPic = generatedMinutes.actionItems.filter((item) => needsConfirmation(item, "pic")).length;
    const missingDeadline = generatedMinutes.actionItems.filter((item) => needsConfirmation(item, "deadline")).length;
    const highPriority = generatedMinutes.actionItems.filter((item) => normalizePriority(item.priority) === "High").length;

    return {
      total: generatedMinutes.actionItems.length,
      missingPic,
      missingDeadline,
      highPriority,
    };
  }, [generatedMinutes]);

  const handleRun = async () => {
    if (!transcript.trim()) {
      toast.info("Paste transkrip rapat terlebih dahulu.");
      return;
    }

    setIsWorking(true);

    try {
      if (mode === "minutes") {
        const data = await api.post<MinutesResponse>(
          "/ai/minutes",
          { transcript },
          token || undefined
        );

        const nextMinutes: MinutesResult = {
          id: createMinutesId(1),
          title: data.title || "Notulen Rapat",
          date: normalizeMeetingMinuteDate(data.date),
          participants: data.participants || [],
          agenda: data.agenda || [],
          summary: data.summary || "",
          keyPoints: data.keyPoints || [],
          decisions: data.decisions || [],
          openIssues: data.openIssues || [],
          actionItems: (data.actionItems || []).map((item) => ({
            ...item,
            priority: normalizePriority(item.priority),
            status: normalizeStatus(item.status),
            needsConfirmation: item.needsConfirmation || [],
          })),
          nextCheckIn: data.nextCheckIn || "",
          createdAt: new Date().toISOString(),
        };

        setGeneratedMinutes(nextMinutes);
        toast.success("Notulen siap ditinjau.");
        return;
      }

      const data = await api.post<TranscriptAnalysisResponse>(
        "/ai/transcripts",
        { transcript },
        token || undefined
      );
      setSuggestions(data?.suggestions || []);
      setAppliedResults({});
      toast.success("Saran perubahan risiko siap ditinjau.");
    } catch (error) {
      console.error(error);
      toast.error(
        mode === "minutes"
          ? "Notulen belum berhasil dibuat. Silakan coba lagi."
          : "Perubahan risiko belum berhasil dianalisis. Silakan coba lagi."
      );
    } finally {
      setIsWorking(false);
    }
  };

  const handleDismissSuggestion = (id: string) => {
    setSuggestions((current) => current.filter((suggestion) => suggestion.id !== id));
    if (reviewSuggestion?.id === id) {
      setReviewSuggestion(null);
      setTargetRiskDetails(null);
      setSelectedChangeIds([]);
    }
  };

  const handleOpenDraft = (suggestion: Suggestion) => {
    if (!suggestion.draftPrefill) {
      toast.info("Draft prefill belum tersedia untuk suggestion ini.");
      return;
    }

    const payload: RiskDraftPrefill = {
      title: suggestion.draftPrefill.title,
      description: suggestion.draftPrefill.description,
      riskCode: suggestion.targetRiskCode,
      source: suggestion.draftPrefill.source,
      probability: suggestion.draftPrefill.probability,
      impact: suggestion.draftPrefill.impact,
      mitigation: suggestion.draftPrefill.mitigation,
      quote: suggestion.quote,
      treatmentOption: suggestion.draftPrefill.treatmentOption || "mitigate",
    };

    const tokenizedPrefill = createMeetingIntelligencePrefillToken();
    saveMeetingIntelligencePrefill(tokenizedPrefill, payload);
    const draftUrl = `/risk/register/new?${MEETING_INTELLIGENCE_PREFILL_PARAM}=${encodeURIComponent(tokenizedPrefill)}`;
    window.open(draftUrl, "_blank", "noopener,noreferrer");
    toast.success("Draft risiko dibuka di tab baru tanpa menghapus hasil analisis transcript.");
  };

  const handleReviewExistingSuggestion = async (suggestion: Suggestion) => {
    setReviewSuggestion(suggestion);
    setSelectedChangeIds((suggestion.changes || []).map((change) => change.id));
    const fallbackRiskId = suggestion.targetRiskId || suggestion.candidateRisks?.[0]?.id || "";
    setManualTargetRiskId(fallbackRiskId);
    setTargetRiskDetails(null);

    if (!fallbackRiskId || !token) return;

    setIsLoadingRiskDetails(true);
    try {
      const details = await api.get<RiskDetailResponse>(`/risks/${fallbackRiskId}`, token);
      setTargetRiskDetails(details);
    } catch (error) {
      console.error(error);
      toast.error("Detail risiko existing belum berhasil dimuat.");
    } finally {
      setIsLoadingRiskDetails(false);
    }
  };

  const handleChangeManualTargetRisk = async (riskId: string) => {
    setManualTargetRiskId(riskId);
    if (!riskId || !token) {
      setTargetRiskDetails(null);
      return;
    }

    setIsLoadingRiskDetails(true);
    try {
      const details = await api.get<RiskDetailResponse>(`/risks/${riskId}`, token);
      setTargetRiskDetails(details);
    } catch (error) {
      console.error(error);
      toast.error("Detail risiko target belum berhasil dimuat.");
    } finally {
      setIsLoadingRiskDetails(false);
    }
  };

  const handleToggleChange = (changeId: string) => {
    setSelectedChangeIds((current) =>
      current.includes(changeId)
        ? current.filter((id) => id !== changeId)
        : [...current, changeId]
    );
  };

  const handleApplySuggestion = async () => {
    if (!reviewSuggestion || reviewSuggestion.targetType !== "existing") return;

    const selectedChanges = (reviewSuggestion.changes || []).filter((change) => selectedChangeIds.includes(change.id));
    if (selectedChanges.length === 0) {
      toast.info("Pilih minimal satu perubahan yang ingin diterapkan.");
      return;
    }

    const targetRiskId = manualTargetRiskId || reviewSuggestion.targetRiskId;
    if (!targetRiskId) {
      toast.info("Pilih target risiko terlebih dahulu.");
      return;
    }

    setIsApplyingSuggestion(true);
    try {
      const result = await api.post<ApplyRiskChangeResponse>(
        "/ai/transcripts/apply-risk-change",
        {
          targetRiskId,
          selectedChanges,
        },
        token || undefined
      );

      setAppliedResults((current) => ({
        ...current,
        [reviewSuggestion.id]: result,
      }));
      setReviewSuggestion(null);
      setTargetRiskDetails(null);
      toast.success(
        result.createdNewVersion
          ? "Versi draft baru berhasil dibuat dari hasil rapat."
          : "Draft risiko existing berhasil diperbarui."
      );
    } catch (error) {
      console.error(error);
      toast.error("Perubahan risiko belum berhasil diterapkan.");
    } finally {
      setIsApplyingSuggestion(false);
    }
  };

  const handleSearchRisks = async (query: string) => {
    setRiskSearchQuery(query);

    setAvailableRisks(filterMeetingRiskOptions(allRisks, query));
  };

  const handleToggleRisk = (riskId: string) => {
    setSelectedRiskIds((current) =>
      current.includes(riskId)
        ? current.filter((id) => id !== riskId)
        : [...current, riskId]
    );
  };

  const handleOpenSaveDialog = async () => {
    if (!token) {
      toast.error("Sesi login belum valid.");
      return;
    }
    setShowSaveDialog(true);
    setRiskSearchQuery("");
    setIsLoadingRisks(true);
    try {
      const results = await api.get<RiskSummary[]>("/risks?status=all", token);
      console.log("[SaveDialog] Loaded risks:", results?.length ?? 0);
      setAllRisks(results || []);
      setAvailableRisks(results || []);
    } catch (error) {
      console.error("[SaveDialog] Failed to load risks:", error);
      setAllRisks([]);
      setAvailableRisks([]);
      toast.error("Daftar risiko belum berhasil dimuat.");
    } finally {
      setIsLoadingRisks(false);
    }
  };

  const handleSaveMinutes = async () => {
    if (!generatedMinutes) {
      toast.error("Belum ada notulen yang digenerate.");
      return;
    }
    if (!token) {
      toast.error("Sesi login belum valid.");
      return;
    }
    
    setIsSavingMinutes(true);
    try {
      const payload = {
        title: generatedMinutes.title,
        date: normalizeMeetingMinuteDate(generatedMinutes.date),
        participants: generatedMinutes.participants,
        agenda: generatedMinutes.agenda,
        summary: generatedMinutes.summary,
        keyPoints: generatedMinutes.keyPoints,
        decisions: generatedMinutes.decisions,
        openIssues: generatedMinutes.openIssues,
        actionItems: generatedMinutes.actionItems,
        nextCheckIn: generatedMinutes.nextCheckIn,
        transcript: transcript,
        riskIds: selectedRiskIds,
      };
      console.log("[SaveMinutes] Payload:", JSON.stringify(payload, null, 2));
      
      const result = await createMeetingMinute(payload, token);
      console.log("[SaveMinutes] Result:", result);
      
      setSavedMinutesId(result.id);
      toast.success("Notulen berhasil disimpan");
      setShowSaveDialog(false);
      router.push(`/minutes/${result.id}`);
    } catch (error) {
      console.error("[SaveMinutes] Error:", error);
      const msg = error instanceof Error ? error.message : "Gagal menyimpan notulen";
      toast.error(msg);
    } finally {
      setIsSavingMinutes(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="space-y-2">
        <Badge variant="outline" className="border-border/70 text-[10px] uppercase tracking-[0.18em]">
          Meeting
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Tinjau rapat, lalu pilih satu keluaran.
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Paste transkrip sekali, lalu pilih apakah Anda ingin menyusun notulen atau menilai perubahan risiko.
        </p>
      </section>

      <section className="space-y-6">
          <Card className="overflow-hidden border-border/60 bg-card/90">
            <CardHeader className="border-b border-border/50 bg-muted/[0.18] pb-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardPaste className="size-4 text-primary" />
                    Transcript
                  </CardTitle>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Pilih satu output dulu. Anda bisa memakai transkrip yang sama lagi nanti.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-3 md:grid-cols-2">
                {(Object.keys(modeConfig) as WorkspaceMode[]).map((option) => {
                  const config = modeConfig[option];
                  const Icon = config.icon;
                  const isSelected = mode === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={cn(
                        "group rounded-2xl border px-4 py-4 text-left transition-all duration-200",
                        isSelected
                          ? config.accent
                          : "border-border/60 bg-background hover:border-border hover:bg-muted/[0.16]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{config.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.summary}</p>
                        </div>
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full border",
                            isSelected ? "border-current/20 bg-background/80" : "border-border/60 bg-muted/[0.18]"
                          )}
                        >
                          <Icon className={cn("size-4", isSelected ? "text-current" : "text-muted-foreground")} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

                <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Transkrip rapat</label>
                </div>
                <Textarea
                  value={transcript}
                  onChange={(event) => setTranscript(event.target.value)}
                  placeholder="Paste transkrip atau catatan rapat di sini. Sertakan keputusan, isu utama, dan tindak lanjut bila sudah ada."
                  className="min-h-[220px] resize-none border-border/60 bg-muted/[0.14] text-sm leading-6"
                />
              </div>

              <div className="flex flex-col gap-3 border-t border-border/50 pt-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTranscript("")}
                    disabled={isWorking || transcript.length === 0}
                    className="text-xs"
                  >
                    Kosongkan
                  </Button>
                  <Button onClick={handleRun} disabled={isWorking} className="gap-2 shadow-sm shadow-primary/20">
                    {isWorking ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        {selectedMode.runningLabel}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        {selectedMode.actionLabel}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {mode === "minutes" ? (
            generatedMinutes ? (
              <Card className="border-border/60 bg-card/90">
                <CardHeader className="border-b border-border/50 pb-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("w-fit border text-[10px] uppercase tracking-[0.18em]", modeConfig.minutes.chip)}>
                          Draf Notulen
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={handleOpenSaveDialog}
                          disabled={savedMinutesId !== null}
                        >
                          <Save className="size-3.5" />
                          {savedMinutesId ? "Tersimpan" : "Simpan Notulen"}
                        </Button>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{generatedMinutes.title}</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tinjau hasil notulen ini sebelum dibagikan ke peserta rapat.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1">
                        <CalendarDays className="size-3.5" />
                        {generatedMinutes.date}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1">
                        <Clock3 className="size-3.5" />
                        Draf siap ditinjau
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-5">
                  <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="border border-border/60 bg-muted/[0.16] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tindak lanjut</p>
                      <p className="mt-2 text-2xl font-semibold">{minutesSummary?.total ?? 0}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Item aksi yang terdeteksi</p>
                    </div>
                    <div className="border border-border/60 bg-muted/[0.16] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Perlu PIC</p>
                      <p className="mt-2 text-2xl font-semibold">{minutesSummary?.missingPic ?? 0}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Item belum punya PIC yang pasti</p>
                    </div>
                    <div className="border border-border/60 bg-muted/[0.16] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Perlu deadline</p>
                      <p className="mt-2 text-2xl font-semibold">{minutesSummary?.missingDeadline ?? 0}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Item belum punya tenggat yang jelas</p>
                    </div>
                    <div className="border border-border/60 bg-muted/[0.16] p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Prioritas tinggi</p>
                      <p className="mt-2 text-2xl font-semibold">{minutesSummary?.highPriority ?? 0}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Butuh perhatian lebih cepat</p>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Key Points
                      </p>
                      <div className="mt-3 space-y-2">
                        {generatedMinutes.keyPoints.length > 0 ? (
                          generatedMinutes.keyPoints.map((point, index) => (
                            <div key={`${point}-${index}`} className="flex gap-3 border border-border/60 bg-background px-4 py-3">
                              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                              <p className="text-sm leading-6 text-foreground">{point}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Belum ada poin pembahasan penting yang terdeteksi.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Tindak Lanjut
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Fokus utama notulen ini adalah memastikan hasil rapat bisa langsung ditindaklanjuti.
                        </p>
                      </div>
                      {generatedMinutes.nextCheckIn ? (
                        <Badge variant="outline" className="w-fit border-border/70 bg-background px-3 py-1 text-xs">
                          Review berikutnya: {generatedMinutes.nextCheckIn}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      {generatedMinutes.actionItems.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                              <TableHead className="text-xs max-w-[280px]">Tindak Lanjut</TableHead>
                              <TableHead className="text-xs max-w-[140px]">PIC</TableHead>
                              <TableHead className="text-xs max-w-[120px]">Deadline</TableHead>
                              <TableHead className="text-xs w-[100px]">Prioritas</TableHead>
                              <TableHead className="text-xs w-[100px]">Status</TableHead>
                              <TableHead className="text-xs max-w-[200px]">Catatan</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {generatedMinutes.actionItems.map((item, index) => {
                              const itemPriority = normalizePriority(item.priority);
                              const itemStatus = normalizeStatus(item.status);
                              const missingPic = needsConfirmation(item, "pic");
                              const missingDeadline = needsConfirmation(item, "deadline");

                              return (
                                <TableRow key={`${item.task}-${index}`} className="border-border/30 hover:bg-muted/30">
                                  <TableCell className="max-w-[280px]">
                                    <p className="truncate text-xs font-medium" title={item.task}>{item.task}</p>
                                    {item.ownerUnit && (
                                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={item.ownerUnit}>Unit: {item.ownerUnit}</p>
                                    )}
                                  </TableCell>
                                  <TableCell className="max-w-[140px] text-xs">
                                    {item.pic ? (
                                      <span className="truncate block" title={item.pic}>{item.pic}</span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {missingPic && <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-[9px] text-amber-700">Perlu PIC</Badge>}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="max-w-[120px] text-xs">
                                    {item.deadline ? (
                                      <span className="truncate block" title={item.deadline}>{item.deadline}</span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        {missingDeadline && <Badge variant="outline" className="border-amber-500/30 bg-amber-500/5 text-[9px] text-amber-700">Perlu deadline</Badge>}
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="w-[100px] text-center">
                                    <Badge className={cn("w-fit border text-[9px]", priorityVariant[itemPriority])}>
                                      {itemPriority}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="w-[100px] text-center">
                                    <Badge className={cn("w-fit border text-[9px]", statusVariant[itemStatus])}>
                                      {statusLabel[itemStatus]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                                    <span className="block truncate" title={item.notes || item.relatedDecision}>
                                      {item.notes || item.relatedDecision || "-"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-sm text-muted-foreground">Belum ada tindak lanjut yang terdeteksi.</p>
                      )}
                    </div>
                  </section>

                  <section>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Isu Terbuka
                    </p>
                    <div className="mt-3 space-y-2">
                      {generatedMinutes.openIssues.length > 0 ? (
                        generatedMinutes.openIssues.map((issue, index) => (
                          <div key={`${issue}-${index}`} className="flex gap-3 border border-border/60 bg-background px-4 py-3">
                            <GitBranch className="mt-0.5 size-4 shrink-0 text-amber-600" />
                            <p className="text-sm leading-6 text-foreground">{issue}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Belum ada isu terbuka yang terdeteksi.</p>
                      )}
                    </div>
                  </section>

                  <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Keputusan
                        </p>
                        <div className="mt-3 space-y-2">
                          {generatedMinutes.decisions.length > 0 ? (
                            generatedMinutes.decisions.map((decision, index) => (
                              <div
                                key={`${decision}-${index}`}
                                className="flex gap-3 border-l border-primary/30 bg-primary/[0.04] px-4 py-3"
                              >
                                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                                <p className="text-sm leading-6 text-foreground">{decision}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Belum ada keputusan yang terstruktur.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Ringkasan
                        </p>
                        <p className="mt-3 text-sm leading-6 text-foreground">
                          {generatedMinutes.summary || "AI belum memberikan ringkasan. Gunakan transkrip yang lebih lengkap lalu coba lagi."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Peserta
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {generatedMinutes.participants.length > 0 ? (
                            generatedMinutes.participants.map((participant) => (
                              <Badge key={participant} variant="outline" className="border-border/70 bg-background px-2.5 py-1 text-xs">
                                <Users className="mr-1 size-3" />
                                {participant}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Belum ada peserta yang teridentifikasi.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          Agenda
                        </p>
                        <div className="mt-3 space-y-2">
                          {generatedMinutes.agenda.length > 0 ? (
                            generatedMinutes.agenda.map((item, index) => (
                              <div key={`${item}-${index}`} className="border border-border/60 bg-background px-3 py-2 text-sm">
                                {item}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Agenda belum terdeteksi dari transkrip ini.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/70 bg-muted/[0.12]">
                <CardContent className="flex flex-col items-start gap-3 p-6">
                  <div>
                    <p className="text-base font-medium text-foreground">Notulen akan muncul di sini setelah Anda menjalankan mode ini.</p>
                  </div>
                </CardContent>
              </Card>
            )
          ) : suggestions.length > 0 ? (
            <>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Saran perubahan risiko</h2>
                    <p className="text-sm text-muted-foreground">
                      Existing risk bisa di-review lalu di-apply langsung. Risiko baru tetap dibuka sebagai draft terpisah.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border border-primary/20 bg-primary/10 text-[10px] uppercase tracking-[0.12em] text-primary">
                      Existing: {suggestionSummary.existing}
                    </Badge>
                    <Badge className="border border-success/20 bg-success/10 text-[10px] uppercase tracking-[0.12em] text-success">
                      Baru: {suggestionSummary.new}
                    </Badge>
                    {suggestionSummary.lowConfidence > 0 ? (
                      <Badge className="border border-amber-500/20 bg-amber-500/10 text-[10px] uppercase tracking-[0.12em] text-amber-700">
                        Low confidence: {suggestionSummary.lowConfidence}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {suggestions.map((suggestion) => {
                  const config = suggestionTypeConfig[suggestion.targetType];
                  const appliedResult = appliedResults[suggestion.id];
                  const changeCount = suggestion.changes?.length || 0;

                  return (
                    <Card
                      key={suggestion.id}
                      className={cn(
                        "border-border/60 bg-card/90",
                        suggestion.targetType === "existing" ? "border-l-4 border-l-primary" : "border-l-4 border-l-success"
                      )}
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn("border text-[10px] uppercase tracking-[0.12em]", config.bg, config.color, config.border)}>
                                {config.label}
                              </Badge>
                              {suggestion.targetRiskCode ? (
                                <span className="text-[11px] font-mono text-muted-foreground">
                                  {suggestion.targetRiskCode}
                                </span>
                              ) : null}
                              {suggestion.targetType === "existing" && suggestion.matchConfidence ? (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    isLowConfidenceSuggestion(suggestion)
                                      ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
                                      : "border-success/30 bg-success/5 text-success"
                                  )}
                                >
                                  Confidence {suggestion.matchConfidence}%
                                </Badge>
                              ) : null}
                            </div>

                            <div>
                              <h3 className="text-base font-semibold text-foreground">
                                {suggestion.targetType === "existing"
                                  ? suggestion.targetRiskTitle || "Risiko existing"
                                  : suggestion.draftPrefill?.title || "Draf risiko baru"}
                              </h3>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {suggestion.targetType === "existing"
                                  ? `${changeCount} usulan perubahan siap direview sebelum diterapkan ke risk register.`
                                  : suggestion.draftPrefill?.description || "AI menilai pembahasan ini layak disusun sebagai draft risiko baru."}
                              </p>
                            </div>

                            <div className="border-l border-primary/30 bg-primary/[0.04] px-4 py-3">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Cuplikan sumber</p>
                              <p className="mt-2 text-sm italic leading-6 text-foreground/85">{suggestion.quote}</p>
                            </div>

                            <p className="text-sm leading-6 text-muted-foreground">
                              <span className="font-medium text-foreground">Alasan saran AI:</span>{" "}
                              {suggestion.reasoning}
                            </p>

                            {isLowConfidenceSuggestion(suggestion) ? (
                              <div className="flex gap-3 border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" />
                                <p className="text-sm leading-6 text-amber-800">
                                  AI belum cukup yakin dengan target existing risk. Reviewer perlu memastikan target risk sebelum apply.
                                </p>
                              </div>
                            ) : null}

                            {appliedResult ? (
                              <div className="flex flex-col gap-3 border border-success/20 bg-success/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-sm font-medium text-success">
                                    {appliedResult.createdNewVersion ? "Versi draft baru sudah dibuat." : "Draft existing sudah diperbarui."}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {appliedResult.riskCode} • status {appliedResult.status}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2 text-xs"
                                  onClick={() => router.push(`/risk/register/${appliedResult.riskId}`)}
                                >
                                  <Link2 className="size-3.5" />
                                  Buka risiko hasil update
                                </Button>
                              </div>
                            ) : null}
                          </div>

                          <div className="w-full border border-border/60 bg-muted/[0.16] p-4 lg:w-[320px]">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              {suggestion.targetType === "existing" ? "Ringkasan perubahan" : "Prefill draft"}
                            </p>
                            <div className="mt-3 space-y-2 text-sm">
                              {suggestion.targetType === "existing" ? (
                                <>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-muted-foreground">Perubahan</span>
                                    <span className="font-medium text-foreground">{changeCount}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-muted-foreground">Target</span>
                                    <span className="text-right font-medium text-foreground">
                                      {suggestion.targetRiskTitle || "Perlu dipastikan"}
                                    </span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-muted-foreground">Candidates</span>
                                    <span className="text-right font-medium text-foreground">
                                      {suggestion.candidateRisks?.length || 0}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-muted-foreground">Source</span>
                                    <span className="text-right font-medium text-foreground">
                                      {suggestion.draftPrefill?.source || "Belum tersedia"}
                                    </span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-muted-foreground">Probability</span>
                                    <span className="font-medium text-foreground">{suggestion.draftPrefill?.probability || "-"}</span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <span className="text-muted-foreground">Impact</span>
                                    <span className="font-medium text-foreground">{suggestion.draftPrefill?.impact || "-"}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center">
                          {suggestion.targetType === "existing" ? (
                            <Button
                              size="sm"
                              className="gap-2 text-xs"
                              onClick={() => handleReviewExistingSuggestion(suggestion)}
                            >
                              <GitBranch className="size-3.5" />
                              Review perubahan
                            </Button>
                          ) : (
                            <Button size="sm" className="gap-2 text-xs" onClick={() => handleOpenDraft(suggestion)}>
                              <Check className="size-3.5" />
                              Susun draft
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-xs"
                            onClick={() => handleDismissSuggestion(suggestion.id)}
                          >
                            <X className="size-3.5" />
                            Abaikan
                          </Button>
                          {suggestion.targetType === "existing" && !canApplyExistingRisk ? (
                            <p className="ml-auto text-xs text-muted-foreground">
                              Hanya role Unit dan Super Admin yang bisa apply update langsung.
                            </p>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Dialog
                open={!!reviewSuggestion}
                onOpenChange={(open) => {
                  if (!open) {
                    setReviewSuggestion(null);
                    setTargetRiskDetails(null);
                    setSelectedChangeIds([]);
                  }
                }}
              >
                <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[88vh] sm:max-w-5xl">
                  {reviewSuggestion ? (
                    <>
                      <DialogHeader className="shrink-0 border-b border-border/60 bg-background px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Review perubahan</span>
                            {reviewSuggestion.targetRiskCode ? <span>{reviewSuggestion.targetRiskCode}</span> : null}
                            <span>{reviewSuggestion.changes?.length || 0} perubahan</span>
                            <span>{selectedChangeIds.length} dipilih</span>
                            <span>{getRiskStatusLabel(targetRiskDetails?.status)}</span>
                          </div>

                          <div className="space-y-1.5">
                            <DialogTitle className="text-lg leading-tight">
                              {reviewSuggestion.targetRiskTitle || "Tinjau perubahan risiko"}
                            </DialogTitle>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {reviewSuggestion.reasoning || "Belum ada alasan terstruktur dari AI."}
                            </p>
                          </div>

                          {reviewSuggestion.quote ? (
                            <div className="border-l-2 border-border pl-3 text-sm italic leading-6 text-muted-foreground">
                              {reviewSuggestion.quote}
                            </div>
                          ) : null}

                          {isLowConfidenceSuggestion(reviewSuggestion) ? (
                            <div className="space-y-2 border-t border-border/60 pt-3">
                              <p className="text-sm text-amber-700">
                                Confidence match masih rendah. Pilih target risk yang benar sebelum perubahan diterapkan.
                              </p>
                              <div className="max-w-xl space-y-2">
                                <Label htmlFor="target-risk-select" className="text-xs font-medium text-foreground">
                                  Pilih target risiko
                                </Label>
                                <Select value={manualTargetRiskId} onValueChange={handleChangeManualTargetRisk}>
                                  <SelectTrigger id="target-risk-select" className="w-full bg-background">
                                    <SelectValue placeholder="Pilih target risk" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(reviewSuggestion.candidateRisks || []).map((candidate) => (
                                      <SelectItem key={candidate.id} value={candidate.id}>
                                        {candidate.code} • {candidate.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {(targetRiskDetails?.code || reviewSuggestion.targetRiskCode || "Risk") +
                                  " • " +
                                  (targetRiskDetails?.title || reviewSuggestion.targetRiskTitle || "Belum termuat")}
                              </span>
                              <span>•</span>
                              <span>{reviewTargetIsLocked ? "Buat versi baru" : "Update draft current"}</span>
                            </div>
                          )}
                        </div>
                      </DialogHeader>

                      <div className="min-h-0 flex-1 overflow-y-auto bg-background px-6 py-5">
                        <div className="space-y-5">
                          {targetRiskDetails ? (
                            <div className="flex items-start gap-2 border border-border/60 bg-muted/[0.08] px-4 py-3 text-sm leading-6 text-muted-foreground">
                              {reviewTargetIsLocked ? (
                                <GitBranch className="mt-1 size-4 shrink-0 text-primary" />
                              ) : (
                                <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />
                              )}
                              <p>
                                {reviewTargetIsLocked ? (
                                  <>
                                    Risk target berstatus <span className="font-medium text-foreground">{getRiskStatusLabel(targetRiskDetails.status)}</span>, jadi sistem akan membuat <span className="font-medium text-foreground">draft versi baru</span>.
                                  </>
                                ) : (
                                  <>
                                    Risk target masih berstatus <span className="font-medium text-foreground">{getRiskStatusLabel(targetRiskDetails.status)}</span>, jadi perubahan akan masuk ke <span className="font-medium text-foreground">draft current</span>.
                                  </>
                                )}
                              </p>
                            </div>
                          ) : (
                            <div className="border border-dashed border-border/60 bg-muted/[0.08] px-4 py-4 text-sm text-muted-foreground">
                              {isLoadingRiskDetails ? "Memuat snapshot risk existing..." : "Detail risk target akan tampil di sini setelah dipilih."}
                            </div>
                          )}

                          <section className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Daftar perubahan
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  Centang perubahan yang benar-benar ingin dibawa ke draft hasil transcript.
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {selectedChangeIds.length} dari {reviewSuggestion.changes?.length || 0} perubahan dipilih
                              </p>
                            </div>

                            <div className="space-y-3">
                              {(reviewSuggestion.changes || []).map((change, index) => {
                                const checked = selectedChangeIds.includes(change.id);

                                return (
                                  <label
                                    key={change.id}
                                    className={cn(
                                      "block cursor-pointer border transition-colors",
                                      checked
                                        ? "border-primary/30 bg-primary/[0.03]"
                                        : "border-border/60 bg-background hover:border-border"
                                    )}
                                  >
                                    <div className="flex items-start gap-3 p-4">
                                      <div className="pt-0.5">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => handleToggleChange(change.id)}
                                          className="size-4 rounded border-border"
                                        />
                                      </div>

                                      <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                          <div className="min-w-0 space-y-1">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                              <span>Perubahan {index + 1}</span>
                                              <span>•</span>
                                              <span className="font-medium text-foreground">{getFieldLabel(change.field)}</span>
                                              <span>•</span>
                                              <span>{change.operation === "append" ? "Tambah" : "Set ulang"}</span>
                                            </div>
                                            <p className="text-sm font-medium leading-6 text-foreground">{change.label}</p>
                                            <p className="text-sm leading-6 text-muted-foreground">{change.reasoning || "Belum ada alasan terstruktur."}</p>
                                          </div>

                                          <span
                                            className={cn(
                                              "text-xs",
                                              checked ? "text-primary" : "text-muted-foreground"
                                            )}
                                          >
                                            {checked ? "Dipilih" : "Pilih"}
                                          </span>
                                        </div>

                                        <div className="grid gap-px border border-border/60 bg-border/60 xl:grid-cols-2">
                                          <div className="bg-background px-4 py-3">
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sebelum</p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                              {getRiskFieldSnapshot(targetRiskDetails, change.field)}
                                            </p>
                                          </div>
                                          <div className="bg-primary/[0.04] px-4 py-3">
                                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sesudah</p>
                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                              {buildNextFieldSnapshot(targetRiskDetails, change)}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="border-l-2 border-border pl-3 text-sm italic leading-6 text-muted-foreground">
                                          <p className="text-[11px] uppercase tracking-[0.16em] not-italic text-muted-foreground">Kutipan pendukung</p>
                                          <p className="mt-1">
                                            {change.quote || "Kutipan pendukung belum tersedia."}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </section>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col gap-3 border-t border-border/60 bg-muted/[0.18] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {selectedChangeIds.length} perubahan siap diterapkan
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reviewTargetIsLocked
                              ? "Risk yang sudah ditinjau akan tetap terkunci dan sistem membuat draft versi baru."
                              : "Perubahan terpilih akan diterapkan ke draft current yang sama."}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setReviewSuggestion(null);
                              setTargetRiskDetails(null);
                              setSelectedChangeIds([]);
                            }}
                          >
                            Tutup
                          </Button>
                          <Button
                            type="button"
                            onClick={handleApplySuggestion}
                            disabled={
                              !reviewSuggestion ||
                              !canApplyExistingRisk ||
                              isApplyingSuggestion ||
                              selectedChangeIds.length === 0 ||
                              (isLowConfidenceSuggestion(reviewSuggestion) && !manualTargetRiskId)
                            }
                          >
                            {isApplyingSuggestion
                              ? "Menerapkan..."
                              : reviewTargetIsLocked
                                ? "Buat draft versi baru"
                                : "Apply update ke draft"}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Card className="border-dashed border-border/70 bg-muted/[0.12]">
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <div>
                  <p className="text-base font-medium text-foreground">Saran akan muncul di sini setelah analisis dijalankan.</p>
                </div>
              </CardContent>
            </Card>
          )}
      </section>

      {/* Save Dialog - moved to root level to avoid nested Dialog interaction issues */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[88vh] sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border/60 bg-background px-6 py-4">
            <DialogTitle className="text-lg">Simpan Notulen</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              Simpan notulen ini dan hubungkan dengan risiko terkait.
            </DialogDescription>
          </DialogHeader>
          
          <div className="min-h-0 flex-1 overflow-y-auto bg-background px-6 py-5">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Ringkasan Notulen
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Judul</span>
                    <span className="font-medium text-foreground">{generatedMinutes?.title}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span className="font-medium text-foreground">{generatedMinutes?.date}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Peserta</span>
                    <span className="text-right font-medium text-foreground">
                      {generatedMinutes?.participants.length || 0} orang
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Tindak Lanjut</span>
                    <span className="font-medium text-foreground">
                      {generatedMinutes?.actionItems.length || 0} item
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Hubungkan Risiko
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Cari dan pilih risiko yang relevan dengan notulen ini.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedRiskIds.length} risiko dipilih
                  </p>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari risiko berdasarkan kode atau judul..."
                    value={riskSearchQuery}
                    onChange={(e) => handleSearchRisks(e.target.value)}
                    className="pl-9"
                  />
                  {isLoadingRisks && (
                    <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>

                {availableRisks.length > 0 && (
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border/60 bg-muted/[0.16]">
                    {availableRisks.map((risk) => {
                      const isSelected = selectedRiskIds.includes(risk.id);
                      return (
                        <button
                          key={risk.id}
                          type="button"
                          onClick={() => handleToggleRisk(risk.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/[0.36]",
                            isSelected && "bg-primary/[0.12]"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">
                              {risk.code} • {risk.title}
                            </p>
                            {risk.status && (
                              <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                                {risk.status}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="size-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedRiskIds.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Risiko terpilih:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRiskIds.map((riskId) => {
                        const risk = allRisks.find((r) => r.id === riskId) || availableRisks.find((r) => r.id === riskId);
                        return (
                          <Badge
                            key={riskId}
                            variant="outline"
                            className="max-w-[240px] gap-1 border-primary/30 bg-primary/5"
                          >
                            <span className="truncate">
                              {risk ? `${risk.code} • ${risk.title}` : riskId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleRisk(riskId)}
                              className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <p className="text-xs text-muted-foreground">
                      Saran risiko dari analisis transkrip:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions
                        .filter((s) => s.targetType === "existing" && s.targetRiskId)
                        .map((s) => {
                          const riskId = s.targetRiskId!;
                          const isSelected = selectedRiskIds.includes(riskId);
                          return (
                            <Badge
                              key={riskId}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer",
                                isSelected && "bg-primary/10 border-primary/30"
                              )}
                              onClick={() => handleToggleRisk(riskId)}
                            >
                              {s.targetRiskCode} • {s.targetRiskTitle}
                              {isSelected ? (
                                <Check className="ml-1 size-3" />
                              ) : null}
                            </Badge>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="!-mx-0 !-mb-0 shrink-0 border-t border-border/60 bg-muted/[0.18] px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => {
                console.log("[SaveButton] Clicked!");
                handleSaveMinutes();
              }}
              disabled={isSavingMinutes}
            >
              {isSavingMinutes ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Notulen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

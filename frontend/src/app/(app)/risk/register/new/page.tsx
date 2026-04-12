"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { filterToAccessibleOrgs } from "@/lib/organization";
import { useAuth } from "@/contexts/auth-context";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import {
  Loader2,
  BookOpen,
  History,
  Save,
  Send,
  MessageSquare,
  Activity,
  Plus,
  Check,
  CheckCircle2,
  CircleDot,
  WandSparkles,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";

import {
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
  riskCategoryLabels,
  getBobot,
  calculateNilai,
  getRiskPriority,
  resolveRiskScoreSemantics,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
} from "@/lib/risk";
import { EditableList } from "@/components/shared/editable-list";
import { EditableItemsTable } from "@/components/shared/editable-items-table";
import { FormHeader } from "@/components/shared/form-shell";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationPicker } from "@/components/shared/mitigation-picker";
import { MitigationProgressTab } from "@/components/shared/mitigation-progress-tab";
import type {
  MitigationFrequency,
  RecurringInterval,
  RiskCategory,
  RiskStatus,
} from "@/types/risk";
import {
  consumeMeetingIntelligencePrefill,
  MEETING_INTELLIGENCE_PREFILL_PARAM,
  MEETING_INTELLIGENCE_PREFILL_KEY,
  type RiskDraftPrefill,
} from "@/lib/meeting-intelligence";
import {
  ReviewSidePanel,
  type RiskWorkflowState,
} from "@/components/risk/review-side-panel";

const RiskLogTimeline = dynamic(
  () =>
    import("@/components/risk/risk-log-timeline").then(
      (mod) => mod.RiskLogTimeline,
    ),
  {
    ssr: false,
    loading: () => (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Memuat log...
          </span>
        </CardContent>
      </Card>
    ),
  },
);

const CATEGORY_TITLES: Record<string, string> = {
  manusia: "Manusia",
  metode: "Metode",
  mesin: "Mesin",
  material: "Material",
  lingkungan: "Lingkungan",
};
const CATEGORY_ORDER: string[] = [
  "manusia",
  "metode",
  "mesin",
  "material",
  "lingkungan",
];
type CategoryKey = "manusia" | "metode" | "mesin" | "material" | "lingkungan";

type SectionId =
  | "identifikasi"
  | "analisis"
  | "evaluasi"
  | "penanganan"
  | "target"
  | "jadwal";
type WorkspaceView = "form" | "progress" | "log";
type CauseImpactItem = { id: string; text: string };
type RoleUser = { id: string; name: string; role: string };
type RiskSuggestion = { title: string; description: string };
type ErrorWithMessage = { message?: string; error?: string };

type RiskApiMitigation = MitigationItem & {
  ownerUserId?: string;
};

type RiskApiResponse = {
  id: string;
  status?: string;
  title?: string;
  description?: string;
  category?: RiskCategory | "" | null;
  organizationId?: string;
  code?: string;
  assessmentCycle?: string;
  draftApprovalLine?: { id: string; name: string; type?: string }[];
  cause?: string[] | string;
  riskSource?: string;
  controllability?: "C" | "UC";
  impactDesc?: string[] | string;
  existingControl?: string;
  controlEffectiveness?: string;
  probability?: number;
  impact?: number;
  weight?: number;
  riskPriority?: number;
  riskAppetite?: string;
  treatmentOption?: string;
  mitigations?: RiskApiMitigation[];
  targetProbability?: number;
  targetImpact?: number;
  targetWeight?: number;
  nextReviewDate?: string;
  // Reviewed scoring fields
  reviewedProbability?: number | null;
  reviewedImpact?: number | null;
  reviewedWeight?: number | null;
  reviewedNilai?: number | null;
  reviewedScore?: number | null;
  scoreChangeLabel?: string;
  effectivenessLabel?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

const riskCategoryValues: RiskCategory[] = [
  "strategis",
  "operasional",
  "kepatuhan",
  "finansial",
  "reputasi",
  "teknologi_informasi",
];

const riskCategoryOptions = riskCategoryValues.map((value) => ({
  value,
  label: riskCategoryLabels[value],
}));

function isRiskCategory(value: unknown): value is RiskCategory {
  return (
    typeof value === "string" &&
    riskCategoryValues.includes(value as RiskCategory)
  );
}

type RiskSaveResponse = {
  id: string;
  code?: string;
};

function currentAssessmentCycle() {
  const now = new Date();
  const half = now.getMonth() < 6 ? "H1" : "H2";
  return `${now.getFullYear()}-${half}`;
}

type CausesResponse = {
  categories: Partial<Record<CategoryKey, string[]>>;
};

type ImpactsResponse = {
  impactDescription?: string;
};

type SectionStatus = {
  id: SectionId;
  step: string;
  title: string;
  description: string;
  done: boolean;
  hint: string;
};

function AiFieldButton({
  loading,
  disabled,
  onClick,
  label,
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      onClick={onClick}
      disabled={disabled || loading}
      className="h-7 gap-2 border-primary/20 bg-primary/[0.03] px-2.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <WandSparkles className="size-3" />
      )}
      {loading ? "Memproses..." : label}
    </Button>
  );
}

function SectionHeader({
  step,
  title,
  ready,
}: {
  step: string;
  title: string;
  description?: string;
  ready: boolean;
}) {
  return (
    <CardHeader className="pb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-foreground">
            {step}. {title}
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5 self-start border-border/15 px-2.5",
            ready
              ? "bg-success/10 text-success"
              : "bg-muted/40 text-muted-foreground",
          )}
        >
          {ready ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <CircleDot className="size-3.5" />
          )}
          {ready ? "Siap" : "Perlu dilengkapi"}
        </Badge>
      </div>
    </CardHeader>
  );
}

// ----------------------
// Zod Schema
// ----------------------
const formSchema = z.object({
  title: z.string().min(3, "Judul risiko minimal 3 karakter"),
  description: z.string().min(10, "Deskripsi minimal 10 karakter"),
  category: z.enum(riskCategoryValues, {
    error: "Kategori risiko wajib dipilih",
  }),
  organizationId: z.string().optional(),
  riskCode: z.string().optional(),

  causes: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1, "Sebab tidak boleh kosong"),
      }),
    )
    .min(1, "Minimal pilih/isi 1 sebab"),

  riskSource: z.enum(["internal", "eksternal"]).default("internal"),
  controllability: z.enum(["C", "UC"]).default("C"),

  impacts: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1, "Dampak tidak boleh kosong"),
      }),
    )
    .min(1, "Minimal isi 1 dampak"),

  existingControl: z.string().optional(),
  controlEffectiveness: z.string().optional(),
  probability: z.number().min(1).max(5).default(3),
  impact: z.number().min(1).max(5).default(3),
  weight: z.number().min(0.1).default(1.0),
  nilai: z.number().min(0).default(0),

  riskPriority: z.number().min(0).default(0),
  riskAppetite: z.enum(["dalam_batas", "di_atas_batas"]).default("dalam_batas"),
  treatmentOption: z.enum(["menerima", "mitigasi"]).optional(),

  mitigations: z
    .array(
      z.object({
        id: z.string().optional(),
        action: z.string(),
        owner: z.string().default(""),
        treatmentOwnerId: z.string().optional(),
        externalPicId: z.string().optional(),
        dueDate: z.string().optional(),
        frequency: z.string().default("insidental"),
        recurringInterval: z.string().optional(),
        reportDay: z.number().optional(),
        reportDate: z.number().optional(),
      }),
    )
    .default([]),

  targetProbability: z.number().min(1).max(5).default(1),
  targetImpact: z.number().min(1).max(5).default(1),
  targetWeight: z.number().min(0.1).default(1.0),
  targetNilai: z.number().min(0).default(0),
  nextReviewDate: z.string().optional(),
});

const draftSchema = z
  .object({
    title: z.string().min(3, "Judul risiko minimal 3 karakter"),
    description: z.string().min(10, "Deskripsi minimal 10 karakter"),
    category: z.enum(riskCategoryValues, {
      error: "Kategori risiko wajib dipilih",
    }),
    organizationId: z.string().optional(),
  })
  .passthrough();

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;
function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const typedError = error as ErrorWithMessage;
    if (typedError.message) return typedError.message;
    if (typedError.error) return typedError.error;
  }
  return fallback;
}

function normalizeFormValues(values: FormInput): FormValues {
  return {
    title: values.title ?? "",
    description: values.description ?? "",
    category: isRiskCategory(values.category)
      ? values.category
      : riskCategoryValues[0],
    organizationId: values.organizationId ?? "",
    riskCode: values.riskCode ?? "",
    causes: values.causes ?? [],
    riskSource: values.riskSource ?? "internal",
    controllability: values.controllability ?? "C",
    impacts: values.impacts ?? [],
    existingControl: values.existingControl ?? "",
    controlEffectiveness: values.controlEffectiveness ?? "",
    probability: values.probability ?? 3,
    impact: values.impact ?? 3,
    weight: values.weight ?? 1,
    nilai: values.nilai ?? 0,
    riskPriority: values.riskPriority ?? 0,
    riskAppetite: values.riskAppetite ?? "dalam_batas",
    treatmentOption: values.treatmentOption,
    mitigations: (values.mitigations ?? []).map((mitigation) => ({
      ...mitigation,
      owner: mitigation.owner ?? "",
      frequency: mitigation.frequency ?? "insidental",
    })),
    targetProbability: values.targetProbability ?? 1,
    targetImpact: values.targetImpact ?? 1,
    targetWeight: values.targetWeight ?? 1,
    targetNilai: values.targetNilai ?? 0,
    nextReviewDate: values.nextReviewDate ?? "",
  };
}

function dedupeApproverIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

export default function RiskInputPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [riskId, setRiskId] = useState<string | null>(null);
  const [riskStatus, setRiskStatus] = useState<string>("draft");
  const [reviewerScoreData, setReviewerScoreData] = useState<{
    reviewedProbability: number | null;
    reviewedImpact: number | null;
    reviewedWeight: number | null;
    reviewedScore: number | null;
    reviewedNilai: number | null;
    scoreChangeLabel: string;
    effectivenessLabel: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);
  const [availableUsers, setAvailableUsers] = useState<
    { id: string; name: string; role?: string }[]
  >([]);
  const [reviewerId, setReviewerId] = useState<string>("");
  const [selectedApproverId, setSelectedApproverId] = useState<string>("");
  const [approvalLine, setApprovalLine] = useState<
    { id: string; name: string; role?: string }[]
  >([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<RiskWorkflowState | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["identifikasi"]);
  const [assessmentCycleDisplay, setAssessmentCycleDisplay] = useState(
    currentAssessmentCycle(),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
  const submitTarget = useRef<"draft" | "review">("draft");

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      organizationId: "",
      riskCode: "",
      causes: [],
      impacts: [],
      riskSource: "internal",
      controllability: "C",
      existingControl: "",
      controlEffectiveness: "",
      probability: 3,
      impact: 3,
      weight: 1.0,
      riskPriority: 0,
      riskAppetite: "dalam_batas",
      treatmentOption: undefined,
      mitigations: [],
      targetProbability: 1,
      targetImpact: 1,
      targetWeight: 1.0,
      nextReviewDate: "",
    },
  });

  const {
    watch,
    control,
    formState: { errors },
    setValue,
    setError,
    handleSubmit,
    reset,
    clearErrors,
  } = form;

  const title = watch("title") ?? "";
  const description = watch("description") ?? "";
  const category = watch("category");
  const causes = watch("causes") ?? [];
  const impacts = watch("impacts") ?? [];
  const probability = watch("probability") ?? 3;
  const impact = watch("impact") ?? 3;
  const mitigations = watch("mitigations") ?? [];
  const targetProbability = watch("targetProbability") ?? 1;
  const targetImpact = watch("targetImpact") ?? 1;
  const existingControl = watch("existingControl") ?? "";
  const controlEffectiveness = watch("controlEffectiveness") ?? "";
  const treatmentOption = watch("treatmentOption") ?? "";
  const nextReviewDate = watch("nextReviewDate") ?? "";

  const addApproverToLine = () => {
    if (!selectedApproverId) return;
    const selectedUser = availableUsers.find(
      (item) => item.id === selectedApproverId,
    );
    if (!selectedUser) return;
    setApprovalLine((current) => {
      if (current.some((item) => item.id === selectedUser.id)) return current;
      return [...current, selectedUser];
    });
    setSelectedApproverId("");
  };

  const moveApprover = (index: number, direction: -1 | 1) => {
    setApprovalLine((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      return copy;
    });
  };

  const removeApprover = (id: string) => {
    setApprovalLine((current) => current.filter((item) => item.id !== id));
  };

  const loadRiskData = useCallback(
    async (id: string) => {
      try {
        setIsSubmitting(true);
        const risk = await api.get<RiskApiResponse>(
          `/risks/${id}`,
          token ?? undefined,
        );

        setRiskId(risk.id);
        setRiskStatus(risk.status || "draft");

        const loadedCauses: CauseImpactItem[] = Array.isArray(risk.cause)
          ? risk.cause
              .filter((line) => line.trim())
              .map((line, index) => ({ id: `c-${index}`, text: line.trim() }))
          : typeof risk.cause === "string" && risk.cause
            ? risk.cause
                .split("\n")
                .filter((line) => line.trim())
                .map((line, index) => ({ id: `c-${index}`, text: line.trim() }))
            : [];

        const loadedImpacts: CauseImpactItem[] = Array.isArray(risk.impactDesc)
          ? risk.impactDesc
              .filter((line) => line.trim())
              .map((line, index) => ({ id: `i-${index}`, text: line.trim() }))
          : typeof risk.impactDesc === "string" && risk.impactDesc
            ? risk.impactDesc
                .split("\n")
                .filter((line) => line.trim())
                .map((line, index) => ({ id: `i-${index}`, text: line.trim() }))
            : [];

        reset({
          title: risk.title || "",
          description: risk.description || "",
          category: isRiskCategory(risk.category) ? risk.category : undefined,
          organizationId: risk.organizationId || "",
          riskCode: risk.code || "",
          causes: loadedCauses,
          impacts: loadedImpacts,
          riskSource: (risk.riskSource === "eksternal"
            ? "eksternal"
            : "internal") as "internal" | "eksternal",
          controllability: risk.controllability === "UC" ? "UC" : "C",
          existingControl: risk.existingControl || "",
          controlEffectiveness: risk.controlEffectiveness || "",
          probability: risk.probability || 3,
          impact: risk.impact || 3,
          weight: risk.weight || 1.0,
          riskPriority: risk.riskPriority || 0,
          riskAppetite: (risk.riskAppetite === "di_atas_batas"
            ? "di_atas_batas"
            : "dalam_batas") as "dalam_batas" | "di_atas_batas",
          treatmentOption: risk.treatmentOption as
            | "menerima"
            | "mitigasi"
            | undefined,
          mitigations: Array.isArray(risk.mitigations)
            ? risk.mitigations.map((mitigation) => ({
                ...mitigation,
                treatmentOwnerId:
                  mitigation.ownerUserId || mitigation.treatmentOwnerId,
              }))
            : [],
          targetProbability: risk.targetProbability || 1,
          targetImpact: risk.targetImpact || 1,
          targetWeight: risk.targetWeight || 1.0,
          nextReviewDate: risk.nextReviewDate || "",
        });

        setAssessmentCycleDisplay(
          risk.assessmentCycle || currentAssessmentCycle(),
        );

        // Load reviewer score data
        if (risk.reviewedProbability && risk.reviewedImpact) {
          setReviewerScoreData({
            reviewedProbability: risk.reviewedProbability,
            reviewedImpact: risk.reviewedImpact,
            reviewedWeight: risk.reviewedWeight ?? null,
            reviewedScore: risk.reviewedScore ?? null,
            reviewedNilai: risk.reviewedNilai ?? null,
            scoreChangeLabel: risk.scoreChangeLabel || "",
            effectivenessLabel: risk.effectivenessLabel || "",
          });
        } else {
          setReviewerScoreData(null);
        }
        if (
          Array.isArray(risk.draftApprovalLine) &&
          risk.draftApprovalLine.length > 0
        ) {
          const hasTypedMembers = risk.draftApprovalLine.some(
            (member) => member.type,
          );
          if (hasTypedMembers) {
            const reviewer = risk.draftApprovalLine.find(
              (member: { type?: string }) => member.type === "review",
            );
            const approvers = risk.draftApprovalLine.filter(
              (member: { type?: string }) => member.type === "approval",
            );
            setReviewerId(reviewer?.id || "");
            setApprovalLine(approvers);
          } else {
            setReviewerId("");
            setApprovalLine(risk.draftApprovalLine);
          }
        } else {
          setReviewerId("");
          setApprovalLine([]);
        }

        if (risk.status) {
          setApprovalId(null);
          setApprovalWorkflow(null);
          try {
            const approvalResult = await api.get<{
              id?: string;
              currentStatus?: string;
              currentApproverRole?: string;
              currentApproverUserId?: string;
              steps?: {
                approverUserId?: string;
                approverName?: string;
                stepType?: string;
                status?: string;
              }[];
            } | null>(
              `/approvals/by-entity?request_type=risk&entity_id=${id}`,
              token ?? undefined,
            );
            setApprovalId(approvalResult?.id ?? null);
            setApprovalWorkflow(
              approvalResult
                ? {
                    currentStatus: approvalResult.currentStatus ?? null,
                    currentApproverRole:
                      approvalResult.currentApproverRole ?? null,
                    currentApproverUserId:
                      approvalResult.currentApproverUserId ?? null,
                    steps:
                      approvalResult.steps?.map((step) => ({
                        approverUserId: step.approverUserId ?? null,
                        approverName: step.approverName ?? null,
                        stepType: step.stepType ?? null,
                        status: step.status ?? null,
                      })) ?? [],
                  }
                : null,
            );
            if (approvalResult?.steps && Array.isArray(approvalResult.steps)) {
              const reviewerStep = approvalResult.steps.find(
                (s) => s.stepType === "review",
              );
              const approvalSteps = approvalResult.steps
                .filter(
                  (step) =>
                    step.stepType === "approval" &&
                    step.approverUserId &&
                    step.approverName,
                )
                .map((step) => ({
                  id: step.approverUserId!,
                  name: step.approverName!,
                }));
              if (reviewerStep?.approverUserId) {
                setReviewerId(reviewerStep.approverUserId);
              }
              setApprovalLine(approvalSteps);
            }
          } catch (approvalError) {
            setApprovalId(null);
            setApprovalWorkflow(null);
            if (
              approvalError instanceof ApiError &&
              approvalError.status !== 404
            ) {
              console.error("Failed to load approval line:", approvalError);
            }
          }
        } else {
          setApprovalId(null);
          setApprovalWorkflow(null);
        }
      } catch (error) {
        console.error("Failed to load risk data:", error);
        toast.error("Gagal memuat data risiko. Silakan coba lagi.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [reset, token],
  );

  const currentOrganizationId = watch("organizationId");

  useEffect(() => {
    if (!riskId && user?.organizationId && organizations.length > 0) {
      if (!currentOrganizationId || currentOrganizationId === "") {
        setValue("organizationId", user.organizationId, {
          shouldValidate: true,
        });
      }
    }
  }, [
    user,
    user?.organizationId,
    riskId,
    organizations.length,
    currentOrganizationId,
    setValue,
  ]);

  useEffect(() => {
    const init = async () => {
      if (token) {
        try {
          const res = await api.get<any[]>("/organizations", token);
          const normalized = res.map((org: any) => ({
            id: org.id || org.ID,
            name: org.name || org.Name,
          }));
          const filtered = user?.isGlobal
            ? normalized
            : filterToAccessibleOrgs(
                normalized as any,
                user?.accessibleOrgIds || [],
              );
          setOrganizations(filtered);
        } catch (err) {
          console.error(err);
        }

        try {
          const usersRes = await api.get<RoleUser[]>("/users", token);
          const mappedUsers = usersRes
            .filter(
              (u) =>
                u.role === "unit" ||
                u.role === "reviewer" ||
                u.role === "pimpinan" ||
                u.role === "superadmin",
            )
            .map((u) => ({ id: u.id, name: u.name, role: u.role }));
          setAvailableUsers(mappedUsers);
        } catch (err) {
          console.error(err);
        }
      }

      const searchParams = new URLSearchParams(window.location.search);
      const existingRiskId = searchParams.get("id");
      const meetingPrefillToken = searchParams.get(
        MEETING_INTELLIGENCE_PREFILL_PARAM,
      );

      if (existingRiskId && token) {
        await loadRiskData(existingRiskId);
        return;
      }

      let meetingPrefill: RiskDraftPrefill | null = null;
      if (meetingPrefillToken) {
        meetingPrefill = consumeMeetingIntelligencePrefill(meetingPrefillToken);
      }

      if (!meetingPrefill) {
        const meetingPrefillRaw = sessionStorage.getItem(
          MEETING_INTELLIGENCE_PREFILL_KEY,
        );
        if (meetingPrefillRaw) {
          try {
            meetingPrefill = JSON.parse(meetingPrefillRaw) as RiskDraftPrefill;
          } catch (error) {
            console.error(
              "Failed to parse legacy Meeting Intelligence prefill:",
              error,
            );
          } finally {
            sessionStorage.removeItem(MEETING_INTELLIGENCE_PREFILL_KEY);
          }
        }
      }

      if (!meetingPrefill) {
        return;
      }

      try {
        reset({
          title: meetingPrefill.title || "",
          description: meetingPrefill.description || "",
          category: undefined,
          organizationId: user?.organizationId || "",
          riskCode: meetingPrefill.riskCode || "",
          causes: meetingPrefill.quote
            ? [
                {
                  id: "meeting-intelligence-quote",
                  text: meetingPrefill.quote,
                },
              ]
            : [],
          impacts: [],
          riskSource:
            (meetingPrefill.source as "internal" | "eksternal") || "internal",
          controllability: "C",
          existingControl: "",
          controlEffectiveness: "",
          probability: meetingPrefill.probability || 3,
          impact: meetingPrefill.impact || 3,
          weight: 1.0,
          riskPriority: 0,
          riskAppetite: "dalam_batas",
          treatmentOption:
            (meetingPrefill.treatmentOption as "menerima" | "mitigasi") || "",
          mitigations: meetingPrefill.mitigation
            ? [
                {
                  action: meetingPrefill.mitigation,
                  owner: "",
                  dueDate: "",
                  frequency: "insidental",
                },
              ]
            : [],
          targetProbability: Math.max(1, (meetingPrefill.probability || 3) - 1),
          targetImpact: Math.max(1, (meetingPrefill.impact || 3) - 1),
          targetWeight: 1.0,
          nextReviewDate: "",
        });
        setAssessmentCycleDisplay(currentAssessmentCycle());
        setRiskId(null);
        setRiskStatus("draft");
        toast.success(
          "Draft risiko diisi dari rekomendasi Meeting Intelligence.",
        );
      } catch (error) {
        console.error("Failed to apply Meeting Intelligence prefill:", error);
        toast.error(
          "Prefill dari Meeting Intelligence tidak dapat dibaca. Silakan isi draft secara manual.",
        );
      }
    };

    init();
  }, [loadRiskData, reset, setValue, token, user]);

  // UI state
  const [generatingCause, setGeneratingCause] = useState(false);
  const [generatingImpact, setGeneratingImpact] = useState(false);
  const [generatingRisk, setGeneratingRisk] = useState(false);
  const [riskSuggestions, setRiskSuggestions] = useState<RiskSuggestion[]>([]);
  const [showRiskSuggestions, setShowRiskSuggestions] = useState(false);
  const [activeView, setActiveView] = useState<WorkspaceView>("form");

  // Computed - using new bobot matrix and nilai calculation
  const weight = useMemo(
    () => getBobot(probability, impact),
    [probability, impact],
  );
  const nilai = useMemo(
    () => calculateNilai(probability, impact, weight),
    [probability, impact, weight],
  );
  const level = useMemo(() => getRiskLevelFromNilai(nilai), [nilai]);
  const riskPriority = useMemo(() => getRiskPriority(level), [level]);

  const targetWeight = useMemo(
    () => getBobot(targetProbability, targetImpact),
    [targetProbability, targetImpact],
  );
  const targetNilai = useMemo(
    () => calculateNilai(targetProbability, targetImpact, targetWeight),
    [targetProbability, targetImpact, targetWeight],
  );
  const targetLevel = useMemo(
    () => getRiskLevelFromNilai(targetNilai),
    [targetNilai],
  );
  const targetPriority = useMemo(
    () => getRiskPriority(targetLevel),
    [targetLevel],
  );
  const currentScoreSemantics = useMemo(
    () =>
      resolveRiskScoreSemantics({
        status: riskStatus as RiskStatus,
        probability,
        impact,
        weight,
        nilai,
        inherentScore: Math.round(nilai),
        reviewedProbability: reviewerScoreData?.reviewedProbability,
        reviewedImpact: reviewerScoreData?.reviewedImpact,
        reviewedWeight: reviewerScoreData?.reviewedWeight,
        reviewedNilai: reviewerScoreData?.reviewedNilai,
        reviewedScore: reviewerScoreData?.reviewedScore,
      }),
    [
      impact,
      nilai,
      probability,
      reviewerScoreData?.reviewedImpact,
      reviewerScoreData?.reviewedNilai,
      reviewerScoreData?.reviewedProbability,
      reviewerScoreData?.reviewedScore,
      reviewerScoreData?.reviewedWeight,
      riskStatus,
      weight,
    ],
  );
  const currentPrimarySnapshot = currentScoreSemantics.effective;
  const currentScoreLabel =
    currentScoreSemantics.isFinalized && currentScoreSemantics.usesReviewed
      ? "Skor Final"
      : "Skor Inherent";
  const canUseAiAssist =
    title.trim().length > 0 && description.trim().length > 0;

  const sectionStatuses: SectionStatus[] = [
    {
      id: "identifikasi",
      step: "1",
      title: "Identifikasi Risiko",
      description:
        "Tentukan konteks risiko, penyebab utama, dan dampak yang paling relevan.",
      done:
        title.trim().length > 0 &&
        description.trim().length > 0 &&
        !!category &&
        causes.length > 0 &&
        impacts.length > 0,
      hint: "Lengkapi judul, deskripsi, sebab, dan dampak.",
    },
    {
      id: "analisis",
      step: "2",
      title: "Analisis Risiko",
      description:
        "Nilai pengendalian yang sudah ada lalu tetapkan skor probabilitas dan dampak.",
      done:
        (existingControl || "").trim().length > 0 &&
        !!controlEffectiveness &&
        nilai > 0,
      hint: "Isi pengendalian yang ada dan nilai efektivitasnya.",
    },
    {
      id: "evaluasi",
      step: "3",
      title: "Evaluasi Risiko",
      description:
        "Tetapkan prioritas dan pilihan penanganan sebelum diajukan untuk approval.",
      done: !!treatmentOption,
      hint: "Pilih strategi penanganan risiko.",
    },
    {
      id: "penanganan",
      step: "4",
      title: "Rencana Penanganan",
      description:
        "Tentukan aksi mitigasi yang nyata, siapa PIC-nya, dan kapan eksekusinya.",
      done: mitigations.length > 0,
      hint: "Tambahkan minimal satu rencana penanganan.",
    },
    {
      id: "target",
      step: "5",
      title: "Target Penurunan",
      description:
        "Tetapkan target residual risk agar reviewer melihat tujuan akhirnya dengan jelas.",
      done: targetNilai > 0,
      hint: "Tetapkan target probabilitas dan dampak residual.",
    },
    {
      id: "jadwal",
      step: "6",
      title: "Jadwal Review",
      description:
        "Pastikan ada tanggal review agar risiko tidak berhenti di tahap pencatatan.",
      done: !!nextReviewDate,
      hint: "Tentukan tanggal review berikutnya.",
    },
  ];

  const completedSectionCount = sectionStatuses.filter(
    (section) => section.done,
  ).length;
  const missingSections = sectionStatuses.filter((section) => !section.done);
  const isFinalizeReady = missingSections.length === 0;
  const isRiskLocked =
    riskStatus === "in_review" ||
    riskStatus === "in_approval" ||
    riskStatus === "approved" ||
    riskStatus === "rejected";

  const scrollToSection = (sectionId: SectionId) => {
    if (typeof document === "undefined") return;
    setOpenSections((prev) => Array.from(new Set([...prev, sectionId])));
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const offset = 120;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
      }
    }, 100);
  };

  const getSectionIdFromField = (fieldName?: string): SectionId | undefined => {
    if (!fieldName) return undefined;
    if (
      [
        "title",
        "description",
        "category",
        "organizationId",
        "riskCode",
        "causes",
        "riskSource",
        "controllability",
        "impacts",
      ].includes(fieldName)
    ) {
      return "identifikasi";
    }
    if (
      [
        "existingControl",
        "controlEffectiveness",
        "probability",
        "impact",
        "weight",
      ].includes(fieldName)
    ) {
      return "analisis";
    }
    if (
      ["riskPriority", "riskAppetite", "treatmentOption"].includes(fieldName)
    ) {
      return "evaluasi";
    }
    if (fieldName === "mitigations") {
      return "penanganan";
    }
    if (
      ["targetProbability", "targetImpact", "targetWeight"].includes(fieldName)
    ) {
      return "target";
    }
    if (fieldName === "nextReviewDate") {
      return "jadwal";
    }
    return undefined;
  };

  useEffect(() => {
    if (!riskId && activeView !== "form") {
      setActiveView("form");
    }
  }, [riskId, activeView]);

  const buildPayload = (data: FormValues, status: string) => {
    let orgId: string | null = null;
    if (user?.role === "unit" && user.organizationId) {
      orgId = user.organizationId;
    } else if (data.organizationId && data.organizationId.trim() !== "") {
      orgId = data.organizationId;
    }

    return {
      title: data.title,
      description: data.description,
      category: data.category,
      status,
      organizationId: orgId,
      draftApprovalLine: [
        ...(reviewerId
          ? [
              {
                id: reviewerId,
                name:
                  availableUsers.find(
                    (userOption) => userOption.id === reviewerId,
                  )?.name || "Reviewer",
                type: "review" as const,
              },
            ]
          : []),
        ...approvalLine
          .filter((member) => member.id && member.id !== reviewerId)
          .map((member) => ({
            id: member.id,
            name: member.name,
            role: member.role,
            type: "approval" as const,
          })),
      ],
      cause: (data.causes || [])
        .map((cause) => cause.text)
        .filter((text) => text.trim()),
      riskSource: data.riskSource,
      controllability: data.controllability,
      impactDesc: (data.impacts || [])
        .map((impactItem) => impactItem.text)
        .filter((text) => text.trim()),
      existingControl: data.existingControl,
      controlEffectiveness: data.controlEffectiveness,
      probability: data.probability,
      impact: data.impact,
      weight: data.weight,
      riskPriority: data.riskPriority,
      riskAppetite: data.riskAppetite,
      treatmentOption: data.treatmentOption,
      targetProbability: data.targetProbability,
      targetImpact: data.targetImpact,
      targetWeight: data.targetWeight,
      nextReviewDate:
        data.nextReviewDate && data.nextReviewDate.trim() !== ""
          ? data.nextReviewDate
          : null,
      mitigations: (data.mitigations || []).map((mitigation) => ({
        action: mitigation.action,
        owner: mitigation.owner,
        ...(mitigation.treatmentOwnerId
          ? { ownerUserId: mitigation.treatmentOwnerId }
          : {}),
        dueDate:
          mitigation.dueDate && mitigation.dueDate.trim() !== ""
            ? mitigation.dueDate
            : null,
        frequency: mitigation.frequency,
        recurringInterval:
          mitigation.frequency === "rutin"
            ? mitigation.recurringInterval &&
              mitigation.recurringInterval.trim() !== ""
              ? mitigation.recurringInterval
              : "mingguan"
            : null,
        reportDay:
          mitigation.frequency === "rutin" &&
          (mitigation.recurringInterval === "mingguan" ||
            !mitigation.recurringInterval)
            ? (mitigation.reportDay ?? 5)
            : null,
        reportDate:
          mitigation.frequency === "rutin" &&
          (mitigation.recurringInterval === "bulanan" ||
            mitigation.recurringInterval === "triwulan")
            ? (mitigation.reportDate ?? 5)
            : null,
        targetCost: 0,
      })),
    };
  };

  const onSubmit = async (data: FormValues) => {
    if (isRiskLocked) {
      toast.info(
        "Risiko yang sudah final harus dikembalikan ke draft terlebih dahulu sebelum diubah.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const isDraft = submitTarget.current === "draft";
      const payload = buildPayload(data, "draft");

      let currentRiskId = riskId;

      if (currentRiskId) {
        await api.put(`/risks/${currentRiskId}`, payload, token || undefined);
      } else {
        const res = await api.post<RiskSaveResponse>(
          "/risks",
          payload,
          token || undefined,
        );
        setRiskId(res.id);
        setValue("riskCode", res.code || "");
        currentRiskId = res.id;
      }

      if (isDraft) {
        toast.success("Draft berhasil disimpan!");
        if (!riskId && currentRiskId) {
          window.history.replaceState(
            null,
            "",
            `/risk/register/new?id=${currentRiskId}`,
          );
          await loadRiskData(currentRiskId);
          return;
        }
      } else {
        if (!reviewerId) {
          toast.error("Pilih Reviewer sebelum mengajukan review.");
          return;
        }
        const approverIds = dedupeApproverIds([
          reviewerId,
          ...approvalLine.map((member) => member.id),
        ]);
        if (approverIds.length === 0) {
          toast.error("Susun reviewer dan approval line terlebih dahulu.");
          return;
        }
        try {
          await api.post(
            "/approvals/submit",
            {
              requestType: "risk",
              entityId: currentRiskId,
              notes: "",
              approverIds,
              submissionType: "review",
            },
            token || undefined,
          );
          toast.success("Risk berhasil disimpan dan diajukan untuk review!");
          router.push("/risk/register");
        } catch (approvalErr: unknown) {
          const errorMsg = getErrorMessage(approvalErr, "Unknown error");
          toast.error(`Risk disimpan, namun gagal diajukan: ${errorMsg}`);
          router.push("/risk/register");
        }
      }
    } catch (err: unknown) {
      console.error("Failed to save", err);
      const errorMessage = getErrorMessage(err, "Gagal menyimpan data.");
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    submitTarget.current = "draft";
    clearErrors();

    const values = form.getValues();
    const draftResult = draftSchema.safeParse(values);

    if (!draftResult.success) {
      draftResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (
          field === "title" ||
          field === "description" ||
          field === "category" ||
          field === "organizationId"
        ) {
          setError(field, { type: "manual", message: issue.message });
        }
      });
      toast.error(
        "Lengkapi judul, deskripsi, dan kategori sebelum menyimpan draft.",
      );
      scrollToSection("identifikasi");
      return;
    }

    await onSubmit(normalizeFormValues(values));
  };

  const handleDeleteDraft = async () => {
    if (!riskId) return;
    setShowDeleteConfirm(false);
    const promise = (async () => {
      await api.delete(`/risks/${riskId}`, undefined, token || undefined);
      router.push("/risk/register");
    })();

    toast.promise(promise, {
      loading: "Menghapus draft...",
      success: "Draft berhasil dihapus.",
      error: (err) =>
        `Error: ${getErrorMessage(err, "Gagal menghapus draft.")}`,
    });
  };

  const onValidationError = (errors: FieldErrors<FormInput>) => {
    toast.error(
      "Ada form isian yang wajib diisi atau masih salah. Periksa teks merah di bawah form.",
    );
    const [firstErrorField] = Object.keys(errors || {});
    const sectionId = getSectionIdFromField(firstErrorField);
    if (sectionId) {
      scrollToSection(sectionId);
    }
    console.error("Form Validation Errors: ", errors);
  };

  const openSubmitReviewConfirm = () => {
    submitTarget.current = "review";
    clearErrors();

    if (!reviewerId) {
      toast.error("Pilih Reviewer terlebih dahulu.");
      return;
    }

    if (!isFinalizeReady) {
      const firstMissing = missingSections[0]?.id ?? "identifikasi";
      scrollToSection(firstMissing);
      return;
    }

    setShowSubmitReviewConfirm(true);
  };

  const handleConfirmSubmitReview = () => {
    submitTarget.current = "review";
    setShowSubmitReviewConfirm(false);
    void handleSubmit(onSubmit, onValidationError)();
  };

  const showUnavailableFeatureToast = (featureName: string) => {
    toast.info(`${featureName} akan diaktifkan pada iterasi berikutnya.`);
  };

  const handleViewChange = (nextView: WorkspaceView) => {
    if (nextView !== "form" && !riskId) {
      toast.info(
        "Simpan draft terlebih dahulu untuk membuka progress mitigasi dan log komunikasi.",
      );
      return;
    }
    setActiveView(nextView);
  };

  const FormErrorMessage = ({
    error,
  }: {
    error?: string | { message?: string };
  }) => {
    const message = typeof error === "string" ? error : error?.message;
    if (!message) return null;
    return (
      <span className="mt-1 text-xs font-medium text-destructive">
        {message}
      </span>
    );
  };

  // AI Generators
  async function handleGenerateRisk() {
    if (isRiskLocked) return;
    setGeneratingRisk(true);
    setShowRiskSuggestions(false);
    try {
      const res = await api.post<{ suggestions: RiskSuggestion[] }>(
        "/ai/risk-suggestions",
        { existingRisks: [] },
        token || undefined,
      );
      setRiskSuggestions(res.suggestions || []);
      setShowRiskSuggestions(true);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingRisk(false);
    }
  }

  async function handleGenerateCause() {
    if (isRiskLocked) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Isi judul dan deskripsi dulu untuk AI");
      return;
    }
    setGeneratingCause(true);
    try {
      const res = await api.post<CausesResponse>(
        "/ai/causes",
        { title, description },
        token || undefined,
      );
      const newItems: { id: string; text: string }[] = [];
      let idx = 0;
      CATEGORY_ORDER.forEach((category) => {
        const categoryKey = category as CategoryKey;
        const categoryItems = res.categories[categoryKey] || [];
        categoryItems.forEach((itemText: string) => {
          newItems.push({
            id: `cause-${Date.now()}-${idx++}`,
            text: `[${CATEGORY_TITLES[categoryKey]}] ${itemText}`,
          });
        });
      });
      setValue("causes", newItems.length > 0 ? newItems : [], {
        shouldValidate: true,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingCause(false);
    }
  }

  async function handleGenerateImpact() {
    if (isRiskLocked) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Isi judul dan deskripsi dulu untuk AI");
      return;
    }
    setGeneratingImpact(true);
    try {
      const res = await api.post<ImpactsResponse>(
        "/ai/impacts",
        { title, description },
        token || undefined,
      );
      if (res.impactDescription) {
        const lines = res.impactDescription
          .split("\n")
          .filter((line: string) => line.trim());
        const items = lines
          .map((line: string, idx: number) => ({
            id: `impact-${Date.now()}-${idx}`,
            text: line.replace(/^\d+\.\s*/, "").trim(),
          }))
          .filter((item) => item.text);

        setValue(
          "impacts",
          items.length > 0
            ? items
            : [{ id: "impact-1", text: res.impactDescription }],
          { shouldValidate: true },
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingImpact(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="animate-fade-in pb-20">
        <FormHeader
          title="Form registrasi risiko"
          description={
            isRiskLocked
              ? "Dokumen ini terkunci karena sudah final. Gunakan draft baru jika perlu perubahan."
              : "Lengkapi identifikasi, analisis, dan rencana penanganan sebelum diajukan untuk approval."
          }
          badges={
            <>
              <Badge
                variant="outline"
                className="border-primary/15 bg-primary/[0.04] text-primary"
              >
                Draft kerja
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "border-border/15",
                  isFinalizeReady
                    ? "bg-success/10 text-success"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                {isFinalizeReady
                  ? "Siap diajukan"
                  : `${missingSections.length} bagian belum siap`}
              </Badge>
            </>
          }
          backLabel="Kembali ke register risiko"
          onBack={() => router.push("/risk/register")}
          actions={
            <div className="flex items-center gap-2 sm:gap-3">
              {riskId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        showUnavailableFeatureToast("Riwayat versi")
                      }
                    >
                      <History className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Riwayat versi</TooltipContent>
                </Tooltip>
              )}

              {(riskStatus === "draft" || !riskId) && (
                <div className="flex items-center gap-2 border-l border-border/40 pl-2 sm:pl-3 ml-1 sm:ml-2">
                  {riskId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Hapus draft</TooltipContent>
                    </Tooltip>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && submitTarget.current === "draft" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}{" "}
                    Simpan draft
                  </Button>
                  <Button
                    className="gap-2 text-sm font-semibold px-5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={openSubmitReviewConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting && submitTarget.current === "review" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}{" "}
                    Ajukan review
                  </Button>
                </div>
              )}
            </div>
          }
        />

        <div className="mb-6 max-w-4xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Ruang kerja
            </p>
            {riskId && (
              <Badge
                variant="outline"
                className="border-primary/15 bg-primary/[0.04] text-primary"
              >
                Dokumen tersimpan
              </Badge>
            )}
          </div>
          <div className="rounded-2xl border border-border/20 bg-muted/[0.18] p-1.5">
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  id: "form" as const,
                  label: "Form Aktif",
                  icon: BookOpen,
                },
                {
                  id: "progress" as const,
                  label: "Progress Mitigasi",
                  icon: Activity,
                },
                {
                  id: "log" as const,
                  label: "Activity",
                  icon: MessageSquare,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                const isDisabled = item.id !== "form" && !riskId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleViewChange(item.id)}
                    className={cn(
                      "inline-flex min-w-[180px] flex-1 items-center gap-2 rounded-[18px] px-4 py-3 text-left transition-colors",
                      isActive
                        ? "bg-background text-foreground ring-1 ring-border/35"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                      isDisabled && "opacity-60",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {activeView === "form" && (
          <div className="flex flex-col items-start gap-6 xl:flex-row">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="w-full xl:w-2/3"
            >
              <Accordion
                type="multiple"
                value={openSections}
                onValueChange={setOpenSections}
                className="space-y-6"
              >
                <AccordionItem
                  value="identifikasi"
                  id="identifikasi"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          1
                        </div>
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Identifikasi Risiko
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                          sectionStatuses[0].done
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {sectionStatuses[0].done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {sectionStatuses[0].done
                            ? "Siap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="relative space-y-1.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium">
                          Risiko
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <AiFieldButton
                          loading={generatingRisk}
                          disabled={isRiskLocked}
                          onClick={handleGenerateRisk}
                          label="Bantu rumuskan risiko"
                        />
                      </div>
                      <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Contoh: Terjadi kebakaran di gudang bahan baku"
                            disabled={isRiskLocked}
                            className={cn(
                              "text-sm",
                              errors.title && "border-destructive",
                            )}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.title?.message} />

                      {showRiskSuggestions && riskSuggestions.length > 0 && (
                        <div className="absolute z-50 mt-2 w-full rounded-lg border border-border bg-background shadow-lg">
                          <div className="border-b border-border/60 px-3 py-2">
                            <p className="text-xs font-semibold text-foreground">
                              Saran AI untuk judul risiko
                            </p>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto">
                            {riskSuggestions.map((suggestion, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setValue("title", suggestion.title);
                                  setValue(
                                    "description",
                                    suggestion.description,
                                  );
                                  setShowRiskSuggestions(false);
                                }}
                                className="w-full border-b border-border/50 p-3 text-left hover:bg-muted/30"
                              >
                                <p className="text-sm font-medium text-foreground">
                                  {suggestion.title}
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                                  {suggestion.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Deskripsi Kejadian Risiko
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Contoh: Mesin A mati secara tiba-tiba saat proses produksi berlangsung..."
                            disabled={isRiskLocked}
                            className={cn(
                              "min-h-[120px] text-sm",
                              errors.description && "border-destructive",
                            )}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.description?.message} />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Kategori Risiko
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isRiskLocked}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-9 text-sm",
                                errors.category && "border-destructive",
                              )}
                            >
                              <SelectValue placeholder="Pilih kategori risiko" />
                            </SelectTrigger>
                            <SelectContent>
                              {riskCategoryOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  className="text-sm"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormErrorMessage error={errors.category?.message} />
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Kode Risiko
                        </Label>
                        <Controller
                          name="riskCode"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              placeholder="Terisi otomatis setelah draft disimpan"
                              disabled
                              className="text-sm"
                            />
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Assessment Cycle
                        </Label>
                        <Input
                          value={assessmentCycleDisplay}
                          disabled
                          className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          Diisi otomatis mengikuti siklus aktif.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Unit Kerja
                        </Label>
                        <Controller
                          name="organizationId"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={true}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Pilih Unit Kerja" />
                              </SelectTrigger>
                              <SelectContent>
                                {organizations.map((u, idx) => (
                                  <SelectItem
                                    key={`${u.id}-${idx}`}
                                    value={u.id}
                                    className="text-sm"
                                  >
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-1.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium">
                          Sebab
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <AiFieldButton
                          loading={generatingCause}
                          disabled={!canUseAiAssist || isRiskLocked}
                          onClick={handleGenerateCause}
                          label="Susun sebab dengan AI"
                        />
                      </div>
                      <Controller
                        name="causes"
                        control={control}
                        render={({ field }) => (
                          <EditableItemsTable
                            items={field.value}
                            onChange={field.onChange}
                            placeholder="Tulis penyebab..."
                            addItemLabel="Tambah Sebab"
                            emptyMessage="Belum ada sebab"
                            disabled={isRiskLocked}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.causes?.message} />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Sumber Risiko
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Controller
                          name="riskSource"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isRiskLocked}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Pilih sumber risiko" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="internal"
                                  className="text-sm"
                                >
                                  Internal
                                </SelectItem>
                                <SelectItem
                                  value="eksternal"
                                  className="text-sm"
                                >
                                  Eksternal
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Tingkat Kendali
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Controller
                          name="controllability"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isRiskLocked}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="C" className="text-sm">
                                  Controllable
                                </SelectItem>
                                <SelectItem value="UC" className="text-sm">
                                  Uncontrollable
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium">
                          Dampak
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <AiFieldButton
                          loading={generatingImpact}
                          disabled={!canUseAiAssist || isRiskLocked}
                          onClick={handleGenerateImpact}
                          label="Susun dampak dengan AI"
                        />
                      </div>
                      <Controller
                        name="impacts"
                        control={control}
                        render={({ field }) => (
                          <EditableItemsTable
                            items={field.value}
                            onChange={field.onChange}
                            placeholder="Tulis dampak..."
                            addItemLabel="Tambah Dampak"
                            disabled={isRiskLocked}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.impacts?.message} />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="analisis"
                  id="analisis"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          2
                        </div>
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Analisis Risiko
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                          sectionStatuses[1].done
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {sectionStatuses[1].done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {sectionStatuses[1].done
                            ? "Siap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Pengendalian yang Ada
                      </Label>
                      <Controller
                        name="existingControl"
                        control={control}
                        render={({ field }) => (
                          <EditableList
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Tulis pengendalian yang sudah berjalan..."
                            disabled={isRiskLocked}
                          />
                        )}
                      />
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Efektivitas Pengendalian
                        </Label>
                        <Controller
                          name="controlEffectiveness"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isRiskLocked}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Belum dinilai" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="efektif" className="text-sm">
                                  Efektif
                                </SelectItem>
                                <SelectItem
                                  value="tidak_efektif"
                                  className="text-sm"
                                >
                                  Tidak efektif
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Probabilitas
                        </Label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <Tooltip key={val}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={isRiskLocked}
                                  onClick={() =>
                                    setValue("probability", val, {
                                      shouldValidate: true,
                                    })
                                  }
                                  className={cn(
                                    "h-10 rounded-lg border text-sm font-semibold transition-colors",
                                    val === probability
                                      ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(val, impact, getBobot(val, impact))))} ring-1 font-bold`
                                      : "bg-muted/30 hover:bg-muted/50",
                                    isRiskLocked &&
                                      "cursor-not-allowed opacity-70 hover:bg-muted/30",
                                  )}
                                >
                                  {val}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {PROBABILITY_LABELS[val]}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Dampak</Label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <Tooltip key={val}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={isRiskLocked}
                                  onClick={() =>
                                    setValue("impact", val, {
                                      shouldValidate: true,
                                    })
                                  }
                                  className={cn(
                                    "h-10 rounded-lg border text-sm font-semibold transition-colors",
                                    val === impact
                                      ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(probability, val, getBobot(probability, val))))} ring-1 font-bold`
                                      : "bg-muted/30 hover:bg-muted/50",
                                    isRiskLocked &&
                                      "cursor-not-allowed opacity-70 hover:bg-muted/30",
                                  )}
                                >
                                  {val}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {IMPACT_LABELS[val]}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-4",
                        levelToColor(currentPrimarySnapshot.level),
                      )}
                    >
                      <div className="text-left">
                        <p className="text-xs font-semibold">Hasil Asesmen</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bobot: {currentPrimarySnapshot.weight.toFixed(2)} |
                          Prioritas: {currentPrimarySnapshot.priority}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {getRiskLevelLabel(currentPrimarySnapshot.level)}
                        </p>
                        <p className="text-xs font-mono">
                          {currentScoreLabel}: {currentPrimarySnapshot.score}
                        </p>
                      </div>
                    </div>

                    {/* Reviewer Score Card — shown when approved with reviewer scores */}
                    {reviewerScoreData && riskStatus === "approved" && (
                      <div className="space-y-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 animate-in slide-in-from-top-1">
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 items-center justify-center rounded-md bg-primary/15">
                            <Check className="size-3.5 text-primary" />
                          </div>
                          <h4 className="text-sm font-semibold text-primary">
                            Skor Penilaian Reviewer
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Skor Sementara */}
                          <div className="rounded-md border border-border/50 bg-card p-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Skor Sementara
                            </p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-bold">
                                {Math.round(nilai)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                P{probability} × D{impact}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getRiskLevelLabel(level)}
                            </p>
                          </div>

                          {/* Skor Penilaian */}
                          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-1">
                            <p className="text-xs font-medium text-primary uppercase tracking-wider">
                              Skor Penilaian
                            </p>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-2xl font-bold text-primary">
                                {reviewerScoreData.reviewedNilai
                                  ? Math.round(reviewerScoreData.reviewedNilai)
                                  : (reviewerScoreData.reviewedScore ?? "—")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                P{reviewerScoreData.reviewedProbability} × D
                                {reviewerScoreData.reviewedImpact}
                              </span>
                            </div>
                            <p className="text-xs text-primary/80">
                              Skor Resmi
                            </p>
                          </div>
                        </div>

                        {/* Labels */}
                        <div className="flex flex-wrap gap-2">
                          {reviewerScoreData.scoreChangeLabel && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                reviewerScoreData.scoreChangeLabel.includes(
                                  "penurunan",
                                )
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                  : reviewerScoreData.scoreChangeLabel.includes(
                                        "peningkatan",
                                      )
                                    ? "bg-red-500/10 text-red-700 border-red-500/20"
                                    : "bg-muted text-muted-foreground border-border/50",
                              )}
                            >
                              {reviewerScoreData.scoreChangeLabel}
                            </span>
                          )}
                          {reviewerScoreData.effectivenessLabel && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                reviewerScoreData.effectivenessLabel ===
                                  "Efektif"
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-700 border-amber-500/20",
                              )}
                            >
                              {reviewerScoreData.effectivenessLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="evaluasi"
                  id="evaluasi"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          3
                        </div>
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Evaluasi Risiko
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                          sectionStatuses[2].done
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {sectionStatuses[2].done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {sectionStatuses[2].done
                            ? "Siap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Prioritas Risiko
                        </Label>
                        <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
                          <span className="font-semibold">{riskPriority}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Otomatis dari tingkat risiko)
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Selera Risiko
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Controller
                          name="riskAppetite"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={isRiskLocked}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Pilih selera risiko" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="dalam_batas"
                                  className="text-sm"
                                >
                                  Dalam batas selera risiko
                                </SelectItem>
                                <SelectItem
                                  value="di_atas_batas"
                                  className="text-sm"
                                >
                                  Di atas batas selera risiko
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Pilihan Penanganan
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="treatmentOption"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isRiskLocked}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Pilih penanganan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="menerima" className="text-sm">
                                Menerima
                              </SelectItem>
                              <SelectItem value="mitigasi" className="text-sm">
                                Mitigasi
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="penanganan"
                  id="penanganan"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          4
                        </div>
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Rencana Penanganan
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                          sectionStatuses[3].done
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {sectionStatuses[3].done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {sectionStatuses[3].done
                            ? "Siap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                    <Controller
                      name="mitigations"
                      control={control}
                      render={({ field }) => (
                        <MitigationTable
                          items={(field.value ?? []).map(
                            (mitigation): MitigationItem => ({
                              id: mitigation.id,
                              action: mitigation.action,
                              owner: mitigation.owner ?? "",
                              treatmentOwnerId: mitigation.treatmentOwnerId,
                              externalPicId: mitigation.externalPicId,
                              dueDate: mitigation.dueDate ?? "",
                              frequency:
                                (mitigation.frequency as
                                  | MitigationFrequency
                                  | undefined) ?? "insidental",
                              recurringInterval:
                                mitigation.recurringInterval as
                                  | RecurringInterval
                                  | undefined,
                              reportDay: mitigation.reportDay,
                              reportDate: mitigation.reportDate,
                            }),
                          )}
                          onChange={field.onChange}
                          users={availableUsers}
                          disabled={isRiskLocked}
                        />
                      )}
                    />
                    <FormErrorMessage error={errors.mitigations?.message} />

                    <MitigationPicker
                      title={title}
                      description={description}
                      cause={(causes || [])
                        .map((cause) => cause.text)
                        .join("\n")}
                      impactDescription={(impacts || [])
                        .map((impactItem) => impactItem.text)
                        .join("\n")}
                      onSelect={(action) =>
                        setValue("mitigations", [
                          ...(mitigations || []),
                          {
                            action,
                            owner: "",
                            dueDate: "",
                            frequency: "insidental",
                          },
                        ])
                      }
                      existingActions={(mitigations || []).map(
                        (mitigation) => mitigation.action,
                      )}
                      disabled={isRiskLocked}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="target"
                  id="target"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          5
                        </div>
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Target Penurunan
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                          sectionStatuses[4].done && sectionStatuses[5].done
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {sectionStatuses[4].done && sectionStatuses[5].done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {sectionStatuses[4].done && sectionStatuses[5].done
                            ? "Siap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Probabilitas
                        </Label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <Tooltip key={val}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={isRiskLocked}
                                  onClick={() =>
                                    setValue("targetProbability", val)
                                  }
                                  className={cn(
                                    "h-10 rounded-lg border text-sm font-semibold transition-colors",
                                    val === targetProbability
                                      ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(val, targetImpact, getBobot(val, targetImpact))))} ring-1 font-bold`
                                      : "bg-muted/30 hover:bg-muted/50",
                                    isRiskLocked &&
                                      "cursor-not-allowed opacity-70 hover:bg-muted/30",
                                  )}
                                >
                                  {val}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {PROBABILITY_LABELS[val]}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Dampak</Label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <Tooltip key={val}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  disabled={isRiskLocked}
                                  onClick={() => setValue("targetImpact", val)}
                                  className={cn(
                                    "h-10 rounded-lg border text-sm font-semibold transition-colors",
                                    val === targetImpact
                                      ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(targetProbability, val, getBobot(targetProbability, val))))} ring-1 font-bold`
                                      : "bg-muted/30 hover:bg-muted/50",
                                    isRiskLocked &&
                                      "cursor-not-allowed opacity-70 hover:bg-muted/30",
                                  )}
                                >
                                  {val}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {IMPACT_LABELS[val]}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 scroll-mt-28" id="jadwal">
                      <Label className="text-sm font-medium">
                        Jadwal Review
                      </Label>
                      <Controller
                        name="nextReviewDate"
                        control={control}
                        render={({ field }) => (
                          <Input
                            type="date"
                            value={field.value || ""}
                            onChange={field.onChange}
                            disabled={isRiskLocked}
                            className="text-sm"
                          />
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-4",
                        levelToColor(targetLevel),
                      )}
                    >
                      <div className="text-left">
                        <p className="text-xs font-semibold">
                          Target Residual Risk
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Bobot: {targetWeight.toFixed(2)} | Prioritas:{" "}
                          {targetPriority}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {getRiskLevelLabel(targetLevel)}
                        </p>
                        <p className="text-xs font-mono">
                          Skor Target: {Math.round(targetNilai)}
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem
                  value="approval-line"
                  id="approval-line"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          6
                        </div>
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Approval Line
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                          approvalLine.length > 0
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {approvalLine.length > 0 ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {approvalLine.length > 0
                            ? "Siap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                    <div className="rounded-xl border border-border/60 bg-muted/10 p-5 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground">
                          1. Reviewer (Pemeriksa)
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Pilih reviewer yang akan memeriksa dan memberikan skor
                          penilaian resmi sebelum risiko ini diajukan ke
                          pimpinan.
                        </p>
                      </div>
                      <Select
                        value={reviewerId}
                        onValueChange={setReviewerId}
                        disabled={isRiskLocked}
                      >
                        <SelectTrigger className="h-10 text-sm md:w-[360px] bg-background">
                          <SelectValue placeholder="Pilih reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers
                            .filter((u) => u.role === "reviewer")
                            .map((u) => (
                              <SelectItem
                                key={u.id}
                                value={u.id}
                                className="text-sm"
                              >
                                {u.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-xl border border-primary/10 bg-primary/[0.02] p-5 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground">
                          2. Approval Line (Pimpinan)
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Susun rantai persetujuan pimpinan. Persetujuan
                          dilakukan secara berurutan.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 md:flex-row">
                        <Select
                          value={selectedApproverId}
                          onValueChange={setSelectedApproverId}
                        >
                          <SelectTrigger className="h-9 text-sm md:w-[320px]">
                            <SelectValue placeholder="Pilih approver" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUsers
                              .filter(
                                (userOption) =>
                                  !approvalLine.some(
                                    (item) => item.id === userOption.id,
                                  ),
                              )
                              .map((userOption) => (
                                <SelectItem
                                  key={userOption.id}
                                  value={userOption.id}
                                  className="text-sm"
                                >
                                  {userOption.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2 text-xs"
                          onClick={addApproverToLine}
                          disabled={!selectedApproverId}
                        >
                          <Plus className="size-3.5" /> Tambah approver
                        </Button>
                      </div>

                      <div className="space-y-2 pt-4">
                        {approvalLine.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                            Belum ada approver. Tambahkan minimal satu user
                            sebelum klik{" "}
                            <span className="font-medium text-foreground">
                              Ajukan approval
                            </span>
                            .
                          </div>
                        ) : (
                          approvalLine.map((approver, index) => (
                            <div
                              key={approver.id}
                              className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                            >
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {index + 1}. {approver.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Urutan approval ke-{index + 1}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => moveApprover(index, -1)}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => moveApprover(index, 1)}
                                  disabled={index === approvalLine.length - 1}
                                >
                                  <ChevronDown className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => removeApprover(approver.id)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </form>

            <div className="w-full space-y-4 xl:sticky xl:top-24 xl:w-1/3">
              <Card className="border-border/20 bg-card">
                <CardContent className="pt-5 pb-4">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                      Kesiapan Finalisasi
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-primary/20 bg-primary/[0.04] text-primary"
                    >
                      {completedSectionCount}/{sectionStatuses.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {sectionStatuses.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-colors",
                          section.done
                            ? "border-success/20 bg-success/10"
                            : "border-border/60 bg-muted/20 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          {section.done ? (
                            <CheckCircle2 className="size-4 text-success" />
                          ) : (
                            <CircleDot className="size-4 text-muted-foreground" />
                          )}
                          {section.step}. {section.title}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <ReviewSidePanel
                approvalId={approvalId}
                approvalWorkflow={approvalWorkflow}
                currentUserId={user?.id || ""}
                riskStatus={riskStatus}
                userRole={user?.role || ""}
                inherentScore={currentScoreSemantics.inherent.score}
                reviewedScore={reviewerScoreData?.reviewedScore}
                reviewedProbability={reviewerScoreData?.reviewedProbability}
                reviewedImpact={reviewerScoreData?.reviewedImpact}
                token={token || undefined}
                onActionComplete={() => {
                  if (riskId) {
                    loadRiskData(riskId);
                  }
                }}
                onNavigateToLog={() => setActiveView("log")}
              />
            </div>
          </div>
        )}

        {activeView === "progress" && riskId && (
          <div className="space-y-6">
            <MitigationProgressTab riskId={riskId} token={token || ""} />
          </div>
        )}

        {activeView === "log" && riskId && (
          <RiskLogTimeline riskId={riskId} token={token || ""} />
        )}

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hapus Draft Risiko?</DialogTitle>
              <DialogDescription>
                Draft yang dihapus tidak bisa dikembalikan. Risiko berstatus
                ditinjau harus dikembalikan ke draft terlebih dahulu sebelum
                dapat dihapus.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{title || "Tanpa judul"}</p>
              <p className="text-xs text-muted-foreground">
                {riskId || "Belum tersimpan"}
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteDraft}
              >
                <Trash2 className="size-3.5" /> Hapus Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={showSubmitReviewConfirm}
          onOpenChange={setShowSubmitReviewConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ajukan Risiko untuk Review?</AlertDialogTitle>
              <AlertDialogDescription>
                Risiko akan disimpan lalu dikirim ke reviewer dan approval line
                yang sudah dipilih. Pastikan seluruh bagian sudah final sebelum
                melanjutkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div>
                <span className="font-medium text-foreground">Reviewer: </span>
                <span className="text-muted-foreground">
                  {availableUsers.find((u) => u.id === reviewerId)?.name || "-"}
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">
                  Approval line:{" "}
                </span>
                <span className="text-muted-foreground">
                  {approvalLine.length} orang
                </span>
              </div>
              <div>
                <span className="font-medium text-foreground">
                  Bagian siap:{" "}
                </span>
                <span className="text-muted-foreground">
                  {sectionStatuses.length - missingSections.length}/
                  {sectionStatuses.length}
                </span>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmSubmitReview}
                disabled={isSubmitting}
              >
                Lanjutkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

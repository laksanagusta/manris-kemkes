"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { archiveRisk, restoreRisk } from "@/lib/api/risk-register";
import { listUsers, type UserListItem } from "@/lib/api/users";
import { listAllOrganizations } from "@/lib/api/organizations";
import { filterToAccessibleOrgs } from "@/lib/organization";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { useAuth } from "@/contexts/auth-context";
import { ObjectivePicker, type ObjectiveSummary } from "@/components/risk/objective-picker";
import { LikelihoodAssessmentWizard, type LikelihoodWizardValue } from "@/components/risk/likelihood-assessment-wizard";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { cn } from "@/lib/utils";
import {
  Loader2,
  History,
  Save,
  Send,
  Activity,
  CheckCircle2,
  CircleDot,
  WandSparkles,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  GitBranch,
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
import {
  resolveDraftApprovalLine,
  createApprovalLineRow,
  moveApprovalLineRows,
  type ApprovalLineRow,
  type DraftApprovalLineMember,
} from "@/lib/risk-approval-line";
import { EditableList } from "@/components/shared/editable-list";
import { EditableItemsTable } from "@/components/shared/editable-items-table";
import { FormHeader } from "@/components/shared/form-shell";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationPicker } from "@/components/shared/mitigation-picker";
import { ProbabilityCriteriaTooltip } from "@/components/shared/probability-criteria-tooltip";
import { MitigationProgressTab } from "@/components/shared/mitigation-progress-tab";
import { RiskAnalysisTab } from "@/components/risk/risk-analysis-tab";
import type {
  RiskCategory,
  RiskStatus,
  RiskVersionTimelineItem,
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
import { OrderedUserSelectionTable } from "@/components/risk/ordered-user-selection-table";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import {
  filterApproverOptions,
  type UserPickerOption,
} from "@/lib/risk-register-user-picker";
import { getRiskApprovalCapabilityBehavior } from "@/lib/risk-approval-capability";
import {
  buildVersionHistoryItem,
  getRiskVersionDetailHref,
} from "@/lib/risk-history";
import {
  AiSuggestionModal,
  type SuggestionItem,
} from "@/components/shared/ai-suggestion-modal";

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

const VERSION_LEVEL_BADGE: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi":
    "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
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
  | "target";
type WorkspaceView = "form" | "analysis" | "progress" | "log";
type CauseImpactItem = { id: string; text: string };
type RiskSuggestion = {
  title: string;
  description: string;
  category?: RiskCategory | "" | null;
};
type ErrorWithMessage = { message?: string; error?: string };

type RiskApiMitigation = MitigationItem & {
  ownerUserId?: string;
};

type RiskApiResponse = {
  id: string;
  status?: string;
  archivedAt?: string | null;
  archivedReason?: string;
  draftId?: string | null;
  hasOngoing?: boolean;
  title?: string;
  description?: string;
  category?: RiskCategory | "" | null;
  organizationId?: string;
  code?: string;
  assessmentCycle?: string;
  draftApprovalLine?: DraftApprovalLineMember[];
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
  reviewScheduleText?: string | null;
};

const riskCategoryValues: RiskCategory[] = [
  "kebijakan",
  "reputasi",
  "fraud_korupsi",
  "legal",
  "kepatuhan",
  "operasional",
];

const riskCategoryOptions = riskCategoryValues.map((value) => ({
  value,
  label: riskCategoryLabels[value],
}));

const approvalRoleLabels: Record<string, string> = {
  superadmin: "Super Admin",
  unit: "Unit Kerja",
  reviewer: "Reviewer",
  pimpinan: "Pimpinan",
};

type TreatmentOptionValue = "avoid" | "transfer" | "mitigate" | "accept";

const treatmentOptionOptions: Array<{
  value: TreatmentOptionValue;
  label: string;
}> = [
  { value: "avoid", label: "Menghindari Risiko" },
  { value: "transfer", label: "Berbagi Risiko" },
  { value: "mitigate", label: "Mitigasi" },
  { value: "accept", label: "Menerima Risiko" },
];

function normalizeTreatmentOption(
  value?: string | null,
): TreatmentOptionValue | undefined {
  if (!value) return undefined;

  switch (value.trim().toLowerCase()) {
    case "avoid":
    case "menghindari":
    case "menghindari risiko":
      return "avoid";
    case "transfer":
    case "berbagi":
    case "berbagi risiko":
      return "transfer";
    case "mitigate":
    case "mitigasi":
    case "mitigasi risiko":
      return "mitigate";
    case "accept":
    case "terima":
    case "menerima":
    case "menerima risiko":
      return "accept";
    default:
      return undefined;
  }
}

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
  treatmentOption: z.enum(["avoid", "transfer", "mitigate", "accept"]).optional(),
  nextReviewDate: z.string().optional(),

  mitigations: z
    .array(
      z.object({
        id: z.string().optional(),
        action: z.string(),
        owner: z.string().default(""),
        treatmentOwnerId: z.string().optional(),
        externalPicId: z.string().optional(),
        dueDate: z.string().optional(),
      }),
    )
    .default([]),

  targetProbability: z.number().min(1).max(5).default(1),
  targetImpact: z.number().min(1).max(5).default(1),
  targetWeight: z.number().min(0.1).default(1.0),
  targetNilai: z.number().min(0).default(0),
  objectiveId: z.string().optional(),
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
    treatmentOption: normalizeTreatmentOption(values.treatmentOption),
    nextReviewDate: values.nextReviewDate ?? "",
    mitigations: (values.mitigations ?? []).map((mitigation) => ({
      ...mitigation,
      owner: mitigation.owner ?? "",
    })),
    targetProbability: values.targetProbability ?? 1,
    targetImpact: values.targetImpact ?? 1,
    targetWeight: values.targetWeight ?? 1,
    targetNilai: values.targetNilai ?? 0,
  };
}

function dedupeApproverIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function toUserPickerOption(
  user: Pick<
    UserListItem,
    | "id"
    | "name"
    | "role"
    | "orgName"
    | "email"
    | "username"
    | "nip"
    | "jabatan"
    | "pangkat"
  >,
): UserPickerOption {
  const subtitle =
    user.jabatan?.trim() ||
    user.orgName?.trim() ||
    approvalRoleLabels[user.role] ||
    user.role;

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    subtitle,
    email: user.email,
    username: user.username,
    nip: user.nip,
    jabatan: user.jabatan,
    pangkat: user.pangkat,
    orgName: user.orgName,
  };
}

function toHydratedUserPickerOption(user: {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
}): UserPickerOption | null {
  if (!user.id || !user.name) {
    return null;
  }

  const role = user.role ?? undefined;

  return {
    id: user.id,
    name: user.name,
    role,
    subtitle: role ? approvalRoleLabels[role] || role : undefined,
    nip: user.nip ?? undefined,
    jabatan: user.jabatan ?? undefined,
    pangkat: user.pangkat ?? undefined,
  };
}

export default function RiskInputPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const riskApprovalCapabilityBehavior = useMemo(
    () => getRiskApprovalCapabilityBehavior(user?.capabilities),
    [user?.capabilities],
  );

  const [riskId, setRiskId] = useState<string | null>(null);
  const [riskStatus, setRiskStatus] = useState<string>("assessment_draft");
  const [riskArchivedAt, setRiskArchivedAt] = useState<string | null>(null);
  const [riskArchivedReason, setRiskArchivedReason] = useState("");
  const [ongoingAssessmentId, setOngoingAssessmentId] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string }[]
  >([]);
  const [reviewerId, setReviewerId] = useState<string>("");
  const [reviewerOption, setReviewerOption] = useState<UserPickerOption | null>(
    null,
  );
  const [approvalLine, setApprovalLine] = useState<ApprovalLineRow[]>([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<RiskWorkflowState | null>(null);
  const [openSections, setOpenSections] = useState<string[]>(["identifikasi"]);
  const [objectiveSummary, setObjectiveSummary] = useState<ObjectiveSummary | undefined>(undefined);
  const [likelihoodAssessment, setLikelihoodAssessment] = useState<LikelihoodWizardValue | undefined>(undefined);
  const [assessmentCycleDisplay, setAssessmentCycleDisplay] = useState(
    currentAssessmentCycle(),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [archiveReasonInput, setArchiveReasonInput] = useState("");
  const [archiveNoteInput, setArchiveNoteInput] = useState("");
  const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [riskVersions, setRiskVersions] = useState<RiskVersionTimelineItem[]>(
    [],
  );
  const [loadingVersions, setLoadingVersions] = useState(false);
  const submitTarget = useRef<"draft" | "review">("draft");

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      organizationId: "",
      objectiveId: undefined,
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
      nextReviewDate: "",
      mitigations: [],
      targetProbability: 1,
      targetImpact: 1,
      targetWeight: 1.0,
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
  const selectedApprovalLine = approvalLine.filter((member) => member.id);
  const isApprovalLineReady =
    selectedApprovalLine.length > 0 &&
    approvalLine.every((member) => member.id);
  const submitActionLabel =
    riskApprovalCapabilityBehavior.usesDirectApprovalCopy
      ? "Finalisasi risiko"
      : "Ajukan review";

  const handleReviewerSelect = useCallback((option: UserPickerOption) => {
    setReviewerId(option.id);
    setReviewerOption(option);
  }, []);

  const handleAddApproverRow = useCallback(() => {
    setApprovalLine((current) => [...current, createApprovalLineRow()]);
  }, []);

  const handleApproverSelect = useCallback(
    (rowId: string, option: UserPickerOption) => {
      setApprovalLine((current) => {
        const filteredOption = filterApproverOptions([option], {
          reviewerId,
          selectedApproverIds: current
            .filter((member) => member.rowId !== rowId)
            .map((member) => member.id)
            .filter(Boolean),
        })[0];

        if (!filteredOption) {
          return current;
        }

        return current.map((member) =>
          member.rowId === rowId
            ? createApprovalLineRow(filteredOption, member.rowId)
            : member,
        );
      });
    },
    [reviewerId],
  );

  const moveApprover = useCallback((fromIndex: number, toIndex: number) => {
    setApprovalLine((current) =>
      moveApprovalLineRows(current, fromIndex, toIndex),
    );
  }, []);

  const removeApprover = useCallback((rowId: string) => {
    setApprovalLine((current) =>
      current.filter((item) => item.rowId !== rowId),
    );
  }, []);

  const orgFilter = user?.isGlobal
    ? undefined
    : (user?.organizationId ?? undefined);

  const loadReviewerOptions = useCallback(
    async ({ q, page, limit }: { q: string; page: number; limit: number }) => {
      if (!token) {
        return { options: [], total: 0, page, limit };
      }

      const result = await listUsers(token, {
        q: q || undefined,
        role: "reviewer",
        page,
        limit,
        organizationId: orgFilter,
      });

      return {
        options: result.data.map(toUserPickerOption),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [orgFilter, token],
  );

  const loadApproverOptions = useCallback(
    async (
      { q, page, limit }: { q: string; page: number; limit: number },
      row: ApprovalLineRow,
    ) => {
      if (!token) {
        return { options: [], total: 0, page, limit };
      }

      const result = await listUsers(token, {
        q: q || undefined,
        page,
        limit,
        organizationId: orgFilter,
      });

      return {
        options: filterApproverOptions(result.data.map(toUserPickerOption), {
          reviewerId,
          selectedApproverIds: approvalLine
            .filter((member) => member.rowId !== row.rowId)
            .map((member) => member.id)
            .filter(Boolean),
        }),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [approvalLine, orgFilter, reviewerId, token],
  );

  const loadPicOptions = useCallback(
    async ({ q, page, limit }: { q: string; page: number; limit: number }) => {
      if (!token) {
        return { options: [], total: 0, page, limit };
      }

      const result = await listUsers(token, {
        q: q || undefined,
        page,
        limit,
        organizationId: orgFilter,
      });

      return {
        options: result.data.map(toUserPickerOption),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [orgFilter, token],
  );

  const loadRiskData = useCallback(
    async (id: string) => {
      try {
        setIsSubmitting(true);
        const risk = await api.get<RiskApiResponse>(
          `/risks/${id}`,
          token ?? undefined,
        );

        setRiskId(risk.id);
        setRiskStatus(risk.status || "assessment_draft");
        setRiskArchivedAt(risk.archivedAt || null);
        setRiskArchivedReason(risk.archivedReason || "");
        setOngoingAssessmentId(
          risk.hasOngoing && risk.draftId ? risk.draftId : null,
        );

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
          treatmentOption: normalizeTreatmentOption(risk.treatmentOption),
          nextReviewDate: risk.nextReviewDate || "",
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
        });

        setAssessmentCycleDisplay(
          risk.assessmentCycle || currentAssessmentCycle(),
        );

        if (
          Array.isArray(risk.draftApprovalLine) &&
          risk.draftApprovalLine.length > 0
        ) {
          const resolvedApprovalLine = resolveDraftApprovalLine(
            risk.draftApprovalLine,
          );
          const reviewerMember = risk.draftApprovalLine.find(
            (member) => member.id === resolvedApprovalLine.reviewerId,
          );
          setReviewerId(resolvedApprovalLine.reviewerId);
          setReviewerOption(toHydratedUserPickerOption(reviewerMember ?? {}));
          setApprovalLine(
            resolvedApprovalLine.approvalLine.map((member) =>
              createApprovalLineRow(member),
            ),
          );
        } else {
          setReviewerId("");
          setReviewerOption(null);
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
                .map((step) =>
                  createApprovalLineRow({
                    id: step.approverUserId!,
                    name: step.approverName!,
                  }),
                );
              if (reviewerStep?.approverUserId) {
                setReviewerId(reviewerStep.approverUserId);
                setReviewerOption(
                  toHydratedUserPickerOption({
                    id: reviewerStep.approverUserId,
                    name: reviewerStep.approverName,
                    role: "reviewer",
                  }),
                );
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
          const res = await listAllOrganizations(token);
          const filtered = user?.isGlobal
            ? res
            : filterToAccessibleOrgs(res, user?.accessibleOrgIds || []);
          setOrganizations(
            filtered.map((org) => ({ id: org.id, name: org.name })),
          );
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
        // Load KMK Likelihood Assessment after risk data
        if (existingRiskId) {
          try {
            const la = await import("@/lib/api/likelihood-assessments").then(
              ({ getLikelihoodAssessmentByRiskId }) =>
                getLikelihoodAssessmentByRiskId(token || "", existingRiskId)
            );
            if (la) {
              setLikelihoodAssessment({
                method: la.method as import("@/types/likelihood-assessment").LikelihoodMethod,
                frequencyType: la.frequencyType as import("@/types/likelihood-assessment").FrequencyType,
                observationPeriodMonths: la.observationPeriodMonths,
                eventCount: la.eventCount,
                populationCount: la.populationCount,
                selectedProbabilityLevel: la.selectedProbabilityLevel,
                justification: la.justification,
                dataSource: la.dataSource,
                recommendedLevel: la.selectedProbabilityLevel,
              });
            }
          } catch {
            // Likelihood assessment may not exist yet — ignore
          }
        }
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
          treatmentOption: normalizeTreatmentOption(
            meetingPrefill.treatmentOption,
          ),
          nextReviewDate: "",
          mitigations: meetingPrefill.mitigation
            ? [
                {
                  action: meetingPrefill.mitigation,
                  owner: "",
                  dueDate: "",
                },
              ]
            : [],
          targetProbability: Math.max(1, (meetingPrefill.probability || 3) - 1),
          targetImpact: Math.max(1, (meetingPrefill.impact || 3) - 1),
          targetWeight: 1.0,
        });
        setAssessmentCycleDisplay(currentAssessmentCycle());
        setRiskId(null);
        setRiskStatus("assessment_draft");
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
  const [causeModalOpen, setCauseModalOpen] = useState(false);
  const [causeSuggestions, setCauseSuggestions] = useState<SuggestionItem[]>(
    [],
  );
  const [generatingImpact, setGeneratingImpact] = useState(false);
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactSuggestions, setImpactSuggestions] = useState<SuggestionItem[]>(
    [],
  );
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
      }),
    [impact, nilai, probability, riskStatus, weight],
  );
  const currentPrimarySnapshot = currentScoreSemantics.effective;
  const currentScoreLabel = "Skor Risiko";
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
        treatmentOption === "mitigate"
          ? "Tentukan aksi mitigasi yang nyata, siapa PIC-nya, dan kapan eksekusinya."
          : "Rencana penanganan hanya wajib diisi jika strategi penanganan adalah mitigasi.",
      done: treatmentOption !== "mitigate" || mitigations.length > 0,
      hint:
        treatmentOption === "mitigate"
          ? "Tambahkan minimal satu rencana penanganan."
          : "Tidak wajib untuk strategi selain mitigasi.",
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
  ];

  const completedSectionCount = sectionStatuses.filter(
    (section) => section.done,
  ).length;
  const missingSections = sectionStatuses.filter((section) => !section.done);
  const isFinalizeReady = missingSections.length === 0;
  const isRiskLocked =
    riskStatus === "assessment_in_review" ||
    riskStatus === "approved" ||
    !!riskArchivedAt;
  const canManageArchive =
    !!riskId &&
    !isReadOnlyForOrg(user, currentOrganizationId || orgFilter || "") &&
    (user?.role === "unit" ||
      user?.role === "superadmin" ||
      user?.role === "super_admin");

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

  const resolveSuggestionCategory = (suggestion: RiskSuggestion) => {
    if (isRiskCategory(suggestion.category)) {
      return suggestion.category;
    }

    const categoryMatch = suggestion.title.match(/^\[(.+?)\]/);
    if (!categoryMatch) return undefined;

    const normalizedCategory = categoryMatch[1]?.trim().toLowerCase();
    const matchedCategory = CATEGORY_ORDER.find(
      (category) => CATEGORY_TITLES[category as CategoryKey].toLowerCase() === normalizedCategory,
    );
    return matchedCategory && isRiskCategory(matchedCategory)
      ? matchedCategory
      : undefined;
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
      return "penanganan";
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
                name: reviewerOption?.name || "Reviewer",
                type: "review" as const,
              },
            ]
          : []),
        ...selectedApprovalLine
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
      nextReviewDate:
        data.nextReviewDate && data.nextReviewDate.trim() !== ""
          ? data.nextReviewDate
          : null,
      targetProbability: data.targetProbability,
      targetImpact: data.targetImpact,
      targetWeight: data.targetWeight,
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
        targetCost: 0,
      })),
      objectiveId: data.objectiveId || undefined,
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
      const submissionStatus =
        isDraft || riskApprovalCapabilityBehavior.submitsForApproval
          ? "assessment_draft"
          : "approved";
      const payload = buildPayload(data, submissionStatus);

      let currentRiskId = riskId;
      const needsDirectApprovalUpdate =
        !isDraft &&
        !riskApprovalCapabilityBehavior.submitsForApproval &&
        !currentRiskId;

      if (currentRiskId) {
        await api.put(`/risks/${currentRiskId}`, payload, token || undefined);
        if (riskId) {
          await loadRiskVersions(currentRiskId);
        }
        // Upsert likelihood assessment for existing risk
        if (currentRiskId && likelihoodAssessment) {
          await import("@/lib/api/likelihood-assessments").then(
            ({ upsertLikelihoodAssessment }) =>
              upsertLikelihoodAssessment(token || "", {
                riskId: currentRiskId as string,
                method: likelihoodAssessment.method,
                frequencyType: likelihoodAssessment.frequencyType,
                observationPeriodMonths: likelihoodAssessment.observationPeriodMonths,
                eventCount: likelihoodAssessment.eventCount,
                populationCount: likelihoodAssessment.populationCount,
                selectedProbabilityLevel: likelihoodAssessment.selectedProbabilityLevel,
                justification: likelihoodAssessment.justification,
                dataSource: likelihoodAssessment.dataSource,
              })
          );
        }
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

      // Save KMK Likelihood Assessment after risk is created/updated
      if (currentRiskId && likelihoodAssessment) {
        await import("@/lib/api/likelihood-assessments").then(
          ({ upsertLikelihoodAssessment }) =>
            upsertLikelihoodAssessment(token || "", {
              riskId: currentRiskId,
              method: likelihoodAssessment.method,
              frequencyType: likelihoodAssessment.frequencyType,
              observationPeriodMonths: likelihoodAssessment.observationPeriodMonths,
              eventCount: likelihoodAssessment.eventCount,
              populationCount: likelihoodAssessment.populationCount,
              selectedProbabilityLevel: likelihoodAssessment.selectedProbabilityLevel,
              justification: likelihoodAssessment.justification,
              dataSource: likelihoodAssessment.dataSource,
            })
        );
      }

      if (needsDirectApprovalUpdate && currentRiskId) {
        await api.put(
          `/risks/${currentRiskId}`,
          buildPayload(data, "approved"),
          token || undefined,
        );
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
        if (
          riskApprovalCapabilityBehavior.requiresReviewerSelection &&
          !reviewerId
        ) {
          toast.error("Pilih Reviewer sebelum mengajukan review.");
          return;
        }

        const approverIds = dedupeApproverIds([
          reviewerId,
          ...selectedApprovalLine.map((member) => member.id),
        ]);

        if (
          riskApprovalCapabilityBehavior.requiresApprovalLineSelection &&
          approverIds.length === 0
        ) {
          toast.error("Susun reviewer dan approval line terlebih dahulu.");
          return;
        }

        if (!riskApprovalCapabilityBehavior.submitsForApproval) {
          toast.success("Risk berhasil disimpan dan langsung disetujui!");
          router.push("/risk/register");
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

    if (
      riskApprovalCapabilityBehavior.requiresReviewerSelection &&
      !reviewerId
    ) {
      toast.error("Pilih Reviewer terlebih dahulu.");
      return;
    }

    if (!isFinalizeReady) {
      const firstMissing = missingSections[0]?.id ?? "identifikasi";
      scrollToSection(firstMissing);
      return;
    }

    if (
      riskApprovalCapabilityBehavior.requiresApprovalLineSelection &&
      !isApprovalLineReady
    ) {
      toast.error(
        "Lengkapi setiap baris approver atau hapus baris yang masih kosong.",
      );
      return;
    }

    setShowSubmitReviewConfirm(true);
  };

  const handleConfirmSubmitReview = () => {
    submitTarget.current = "review";
    setShowSubmitReviewConfirm(false);
    void handleSubmit(onSubmit, onValidationError)();
  };

  const loadRiskVersions = useCallback(
    async (id: string) => {
      if (!token) return;
      setLoadingVersions(true);
      try {
        const items = await api.get<RiskVersionTimelineItem[]>(
          `/risks/${id}/versions`,
          token,
        );
        setRiskVersions(items || []);
      } catch {
        toast.error("Gagal memuat riwayat versi.");
        setRiskVersions([]);
      } finally {
        setLoadingVersions(false);
      }
    },
    [token],
  );

  const handleViewChange = (nextView: WorkspaceView) => {
    if (nextView !== "form" && !riskId) {
      toast.info(
        "Simpan draft terlebih dahulu untuk membuka analisa detail, progress mitigasi, dan log komunikasi.",
      );
      return;
    }
    setActiveView(nextView);
  };

  const versionHistory = useMemo(() => {
    if (riskVersions.length === 0) {
      return [];
    }

    const current = riskVersions.find((version) => version.isCurrent) ?? riskVersions[0];

    return riskVersions.map((version) => buildVersionHistoryItem(version, current));
  }, [riskVersions]);

  useEffect(() => {
    if (riskId && token) {
      void loadRiskVersions(riskId);
    }
  }, [loadRiskVersions, riskId, token]);

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
    setCauseModalOpen(true);
    try {
      const res = await api.post<CausesResponse>(
        "/ai/causes",
        { title, description },
        token || undefined,
      );
      const newItems: SuggestionItem[] = [];
      let idx = 0;
      CATEGORY_ORDER.forEach((category) => {
        const categoryKey = category as CategoryKey;
        const categoryItems = res.categories[categoryKey] || [];
        categoryItems.forEach((itemText: string) => {
          newItems.push({
            id: `cause-suggestion-${Date.now()}-${idx++}`,
            text: `[${CATEGORY_TITLES[categoryKey]}] ${itemText}`,
          });
        });
      });
      setCauseSuggestions(newItems);
    } catch (err) {
      console.error(err);
      setCauseModalOpen(false);
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
    setImpactModalOpen(true);
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
            id: `impact-suggestion-${Date.now()}-${idx}`,
            text: line.replace(/^\d+\.\s*/, "").trim(),
          }))
          .filter((item) => item.text);

        setImpactSuggestions(
          items.length > 0
            ? items
            : [{ id: "impact-suggestion-1", text: res.impactDescription }],
        );
      } else {
        setImpactSuggestions([]);
      }
    } catch (err) {
      console.error(err);
      setImpactModalOpen(false);
    } finally {
      setGeneratingImpact(false);
    }
  }

  const handleArchiveCurrentRisk = async () => {
    if (!token || !riskId) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }
    if (!archiveReasonInput.trim()) {
      toast.error("Alasan arsip wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      await archiveRisk(token, riskId, {
        reason: archiveReasonInput.trim(),
        note: archiveNoteInput.trim() || undefined,
      });
      await loadRiskData(riskId);
      setShowArchiveDialog(false);
      setArchiveReasonInput("");
      setArchiveNoteInput("");
      toast.success("Risiko berhasil diarsipkan.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Risiko belum berhasil diarsipkan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreCurrentRisk = async () => {
    if (!token || !riskId) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    try {
      setIsSubmitting(true);
      await restoreRisk(token, riskId);
      await loadRiskData(riskId);
      setShowRestoreDialog(false);
      toast.success("Risiko berhasil dipulihkan.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Risiko belum berhasil dipulihkan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="animate-fade-in pb-20">
        <FormHeader
          title="Form registrasi risiko"
          description={
            isRiskLocked
              ? "Dokumen ini terkunci karena sudah final. Gunakan draft baru jika perlu perubahan."
              : riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Lengkapi identifikasi, analisis, dan rencana penanganan sebelum risiko difinalisasi langsung."
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
                  ? "Lengkap diajukan"
                  : `${missingSections.length} bagian belum siap`}
              </Badge>
            </>
          }
          backLabel="Kembali ke register risiko"
          onBack={() => router.push("/risk/register")}
          actions={
            <div className="flex items-center gap-2 sm:gap-3">
              {canManageArchive &&
                !riskArchivedAt &&
                riskStatus === "approved" && (
                  <Button
                    variant="outline"
                    className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    onClick={() => setShowArchiveDialog(true)}
                  >
                    <Trash2 className="size-4" />
                    Arsipkan
                  </Button>
                )}
              {canManageArchive && !!riskArchivedAt && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowRestoreDialog(true)}
                >
                  <GitBranch className="size-4" />
                  Pulihkan
                </Button>
              )}
              {ongoingAssessmentId && (
                <Button
                  variant="outline"
                  className="gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary"
                  onClick={() =>
                    router.push(`/risk/assessment/${ongoingAssessmentId}`)
                  }
                >
                  <Activity className="size-4" />
                  Lihat pemantauan
                </Button>
              )}

              {riskId && (
                <Sheet
                  open={historyOpen}
                  onOpenChange={setHistoryOpen}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SheetTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                        >
                          <History className="size-4" />
                        </Button>
                      </SheetTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Riwayat versi</TooltipContent>
                  </Tooltip>
                  <SheetContent
                    side="right"
                    className="sm:max-w-md overflow-y-auto"
                  >
                    <SheetHeader className="border-b border-border/50 pb-4">
                      <SheetTitle className="flex items-center gap-2 text-base font-bold">
                        <History className="size-4" />
                        Riwayat Versi
                      </SheetTitle>
                      <SheetDescription>
                        Perubahan skor risiko dari waktu ke waktu
                      </SheetDescription>
                    </SheetHeader>
                    <div className="flex-1 px-4 pb-4">
                      {loadingVersions ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-sm text-muted-foreground">
                            Memuat riwayat...
                          </span>
                        </div>
                      ) : versionHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <GitBranch className="size-8 text-muted-foreground/50 mb-3" />
                          <p className="text-sm font-medium">
                            Belum Ada Riwayat Versi
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            Riwayat versi akan tersedia setelah risiko ini
                            mengalami perubahan skor.
                          </p>
                        </div>
                      ) : (
                        <div className="relative pt-2">
                          <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border/50" />
                          <div className="flex flex-col gap-4">
                            {versionHistory.map((item, index) => (
                              <div
                                key={item.id}
                                className="flex gap-3 relative"
                              >
                                <div className="shrink-0 size-6 rounded-full bg-background border border-border/50 flex items-center justify-center z-10">
                                  {item.trend === "up" ? (
                                    <TrendingUp className="size-3.5 text-risk-extreme" />
                                  ) : item.trend === "down" ? (
                                    <TrendingDown className="size-3.5 text-success" />
                                  ) : (
                                    <Minus className="size-3.5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 pb-2">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Link
                                      href={getRiskVersionDetailHref(item)}
                                      className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 hover:no-underline"
                                    >
                                      v{versionHistory.length - index}
                                    </Link>
                                    <span className="text-sm font-semibold text-muted-foreground">
                                      {item.cycle}
                                    </span>
                                    {item.isCurrent && (
                                      <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] h-4 px-1.5">
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] font-semibold border h-5 px-1.5",
                                        VERSION_LEVEL_BADGE[
                                          item.previousLevel
                                        ] || "",
                                      )}
                                    >
                                      {item.previousLevel}
                                    </Badge>
                                    <span className="text-muted-foreground text-xs">
                                      →
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] font-semibold border h-5 px-1.5",
                                        VERSION_LEVEL_BADGE[
                                          item.currentLevel
                                        ] || "",
                                      )}
                                    >
                                      {item.currentLevel}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {(riskStatus === "assessment_draft" || !riskId) && (
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
                    {submitActionLabel}
                  </Button>
                </div>
              )}
            </div>
          }
        />

        {riskArchivedAt && (
          <Card className="mb-4 border-amber-200 bg-amber-50/80">
            <CardContent className="space-y-1 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Risiko ini diarsipkan pada{" "}
                {new Date(riskArchivedAt).toLocaleDateString("id-ID")}.
              </p>
              <p>
                Alasan: {riskArchivedReason || "Tidak ada alasan tercatat."}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 w-full xl:w-2/3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Ruang kerja
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {riskId ? (
                <Badge
                  variant="outline"
                  className="border-primary/15 bg-primary/[0.06] text-primary"
                >
                  Dokumen tersimpan
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-border/15 bg-muted/50 text-muted-foreground"
                >
                  Simpan draft untuk membuka tab lain
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "border-border/15",
                  isFinalizeReady
                    ? "bg-success/10 text-success"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                {completedSectionCount}/6 bagian siap
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/20 p-1.5">
            <div
              className="flex flex-col gap-1 sm:flex-row"
              role="tablist"
              aria-label="Ruang kerja risiko"
            >
              {[
                {
                  id: "form" as const,
                  label: "Form aktif",
                },
                {
                  id: "analysis" as const,
                  label: "Analisa detail",
                },
                {
                  id: "progress" as const,
                  label: "Progress penanganan",
                },
                {
                  id: "log" as const,
                  label: "Activity log",
                },
              ].map((item) => {
                const isActive = activeView === item.id;
                const isDisabled = item.id !== "form" && !riskId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-disabled={isDisabled}
                    disabled={isDisabled}
                    onClick={() => handleViewChange(item.id)}
                    className={cn(
                      "relative flex-1 rounded-[16px] px-4 py-3 text-left transition-all duration-200 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                      isDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {activeView === "analysis" && riskId && (
          <RiskAnalysisTab versions={riskVersions} loading={loadingVersions} />
        )}

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
                            ? "Lengkap"
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
                            {riskSuggestions.map((suggestion, idx) => {
                              const resolvedCategory =
                                resolveSuggestionCategory(suggestion);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setValue("title", suggestion.title, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    setValue(
                                      "description",
                                      suggestion.description,
                                      {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      },
                                    );
                                    if (resolvedCategory) {
                                      setValue("category", resolvedCategory, {
                                        shouldValidate: true,
                                        shouldDirty: true,
                                      });
                                    }
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
                                  {resolvedCategory ? (
                                    <p className="mt-1 text-[11px] font-medium text-primary">
                                      Kategori:{" "}
                                      {riskCategoryLabels[resolvedCategory]}
                                    </p>
                                  ) : null}
                                </button>
                              );
                            })}
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

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Sasaran & IKU
                      </Label>
                      <ObjectivePicker
                        organizationId={currentOrganizationId}
                        value={watch("objectiveId")}
                        onChange={(id, summary) => {
                          setValue("objectiveId", id, { shouldDirty: true });
                          setObjectiveSummary(summary);
                        }}
                      />
                      <p className="text-[11px] leading-[14px] text-muted-foreground">
                        Pilih sasaran organisasi yang terdampak langsung oleh risiko ini sesuai KMK.
                      </p>
                    </div>

                    {objectiveSummary && (
                      <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-semibold text-foreground">Ringkasan Sasaran</p>
                        <div className="grid gap-2 md:grid-cols-2 text-xs text-muted-foreground">
                          {objectiveSummary.tujuan && (
                            <div><span className="font-medium text-foreground">Tujuan:</span> {objectiveSummary.tujuan}</div>
                          )}
                          {objectiveSummary.sasaran && (
                            <div><span className="font-medium text-foreground">Sasaran:</span> {objectiveSummary.sasaran}</div>
                          )}
                          {objectiveSummary.indikatorKinerjaUtama && (
                            <div><span className="font-medium text-foreground">IKU:</span> {objectiveSummary.indikatorKinerjaUtama}</div>
                          )}
                          {objectiveSummary.program && (
                            <div><span className="font-medium text-foreground">Program:</span> {objectiveSummary.program}</div>
                          )}
                        </div>
                      </div>
                    )}

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
                            ? "Lengkap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md border border-border/50">
                      Nilai probabilitas dan dampak sudah mempertimbangkan
                      kontrol yang ada (residual risk).
                    </p>
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

                    {/* KMK Likelihood Assessment Wizard */}
                    <LikelihoodAssessmentWizard
                      value={likelihoodAssessment}
                      onChange={(val) => {
                        setLikelihoodAssessment(val);
                        setValue("probability", val.selectedProbabilityLevel, { shouldValidate: true });
                      }}
                      disabled={isRiskLocked}
                      compact
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <ProbabilityCriteriaTooltip className="text-sm font-medium" />
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
                        <Label className="flex h-6 items-center text-sm font-medium">
                          Dampak (Residual)
                        </Label>
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
                            ? "Lengkap"
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
                              {treatmentOptionOptions.map((option) => (
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
                            ? "Lengkap"
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
                            }),
                          )}
                          onChange={field.onChange}
                          loadPicOptions={loadPicOptions}
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
                      onSelect={(action) => {
                        const current = form.getValues("mitigations") || [];
                        setValue(
                          "mitigations",
                          [
                            ...current,
                            {
                              action,
                              owner: "",
                              dueDate: "",
                            },
                          ],
                          { shouldValidate: true },
                        );
                      }}
                      existingActions={(mitigations || []).map(
                        (mitigation) => mitigation.action,
                      )}
                      disabled={isRiskLocked}
                    />

                    <div className="space-y-1.5 pt-1">
                      <Label className="text-sm font-medium">
                        Jadwal Pelaksanaan
                      </Label>
                      <Input
                        type="text"
                        placeholder="Contoh: Triwulan I 2026, minggu ke-2"
                        value={nextReviewDate}
                        onChange={(event) =>
                          setValue("nextReviewDate", event.target.value, {
                            shouldValidate: true,
                          })
                        }
                        disabled={isRiskLocked}
                        className="h-9 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Isi bebas sesuai format jadwal yang dipakai tim.
                      </p>
                    </div>
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
                          sectionStatuses[4].done
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/40 text-muted-foreground",
                        )}
                      >
                        {sectionStatuses[4].done ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {sectionStatuses[4].done
                            ? "Lengkap"
                            : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <ProbabilityCriteriaTooltip className="text-sm font-medium" />
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
                        <Label className="flex h-6 items-center text-sm font-medium">
                          Dampak
                        </Label>
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

                {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
                  <AccordionItem
                    value="approval-line"
                    id="approval-line"
                    className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                      <div className="flex flex-1 items-center justify-between pr-4">
                        <div className="flex items-center gap-3">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                          5
                        </div>
                          <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                            Approval Line
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                            isApprovalLineReady
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-muted/40 text-muted-foreground",
                          )}
                        >
                          {isApprovalLineReady ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <CircleDot className="size-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {isApprovalLineReady
                              ? "Lengkap"
                              : "Perlu dilengkapi"}
                          </span>
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                      <div className="rounded-xl border border-border/60 bg-white p-5 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-foreground">
                            1. Reviewer (Pemeriksa)
                            <span className="text-destructive ml-0.5">*</span>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Pilih reviewer yang akan memeriksa dan memberikan
                            skor penilaian resmi sebelum risiko ini diajukan ke
                            pimpinan.
                          </p>
                        </div>
                        <RemoteUserPicker
                          title="Pilih Reviewer"
                          description="Cari reviewer yang akan memeriksa dan memberikan penilaian resmi untuk risiko ini."
                          placeholder="Pilih reviewer"
                          searchPlaceholder="Cari nama reviewer"
                          emptyMessage="Reviewer tidak ditemukan."
                          value={reviewerOption}
                          onSelect={handleReviewerSelect}
                          loadOptions={loadReviewerOptions}
                          disabled={isRiskLocked}
                        />
                      </div>

                      <div className="rounded-xl border border-primary/10 bg-white p-5 space-y-4">
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

                        <OrderedUserSelectionTable
                          rows={approvalLine}
                          loadOptions={loadApproverOptions}
                          onSelectRow={handleApproverSelect}
                          onAddRow={handleAddApproverRow}
                          onRemoveRow={removeApprover}
                          onMoveRow={moveApprover}
                          pickerTitle="Pilih approver"
                          pickerDescription="Cari approver untuk disusun ke dalam rantai persetujuan berurutan."
                          pickerPlaceholder="Pilih approver"
                          pickerSearchPlaceholder="Cari nama approver"
                          pickerEmptyMessage="Approver tidak ditemukan."
                          emptyStateMessage="Belum ada approver. Tambahkan minimal satu user sebelum klik Ajukan approval."
                          addRowLabel="Tambah Approver"
                          footerNote="Urutan baris menentukan sequence persetujuan pimpinan."
                          disabled={isRiskLocked}
                          dndGroup="risk-register-approval-line"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
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
                currentUserId={user?.id}
                riskStatus={riskStatus}
                userRole={user?.role || ""}
                inherentScore={Math.round(nilai)}
                token={token || undefined}
                onActionComplete={() => riskId && loadRiskData(riskId)}
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
                Draft yang dihapus tidak bisa dikembalikan.
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

        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Arsipkan Risiko?</DialogTitle>
              <DialogDescription>
                Risiko akan disembunyikan dari daftar aktif tetapi tetap
                tersimpan untuk audit trail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={archiveReasonInput}
                onChange={(event) => setArchiveReasonInput(event.target.value)}
                placeholder="Alasan utama arsip"
              />
              <Textarea
                value={archiveNoteInput}
                onChange={(event) => setArchiveNoteInput(event.target.value)}
                placeholder="Catatan tambahan (opsional)"
                rows={4}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveDialog(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleArchiveCurrentRisk}
                disabled={isSubmitting}
              >
                Arsipkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pulihkan Risiko?</AlertDialogTitle>
              <AlertDialogDescription>
                Risiko akan kembali tampil di daftar aktif dengan status
                terakhirnya.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestoreCurrentRisk}
                disabled={isSubmitting}
              >
                Pulihkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showSubmitReviewConfirm}
          onOpenChange={setShowSubmitReviewConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Finalisasi Risiko?"
                  : "Ajukan Risiko untuk Review?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Risiko akan disimpan dan langsung disetujui tanpa melalui reviewer atau approval line. Pastikan seluruh bagian sudah final sebelum melanjutkan."
                  : "Risiko akan disimpan lalu dikirim ke reviewer dan approval line yang sudah dipilih. Pastikan seluruh bagian sudah final sebelum melanjutkan."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
                <>
                  <div>
                    <span className="font-medium text-foreground">
                      Reviewer:{" "}
                    </span>
                    <span className="text-muted-foreground">
                      {reviewerOption?.name || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Approval line:{" "}
                    </span>
                    <span className="text-muted-foreground">
                      {selectedApprovalLine.length} orang
                    </span>
                  </div>
                </>
              )}
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

        <AiSuggestionModal
          open={causeModalOpen}
          onOpenChange={setCauseModalOpen}
          title="Saran Penyebab Risiko"
          description="Pilih penyebab yang relevan dari saran AI di bawah ini untuk ditambahkan ke daftar sebab."
          suggestions={causeSuggestions}
          isLoading={generatingCause}
          onApply={(selectedItems) => {
            const newItems = selectedItems.map((item, idx) => ({
              id: `cause-applied-${Date.now()}-${idx}`,
              text: item.text,
            }));
            const currentCauses = form.getValues("causes") || [];
            setValue("causes", [...currentCauses, ...newItems], {
              shouldValidate: true,
            });
          }}
        />

        <AiSuggestionModal
          open={impactModalOpen}
          onOpenChange={setImpactModalOpen}
          title="Saran Dampak Risiko"
          description="Pilih dampak yang relevan dari saran AI di bawah ini untuk ditambahkan ke daftar dampak."
          suggestions={impactSuggestions}
          isLoading={generatingImpact}
          onApply={(selectedItems) => {
            const newItems = selectedItems.map((item, idx) => ({
              id: `impact-applied-${Date.now()}-${idx}`,
              text: item.text,
            }));
            const currentImpacts = form.getValues("impacts") || [];
            setValue("impacts", [...currentImpacts, ...newItems], {
              shouldValidate: true,
            });
          }}
        />
      </div>
    </TooltipProvider>
  );
}

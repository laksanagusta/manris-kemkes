"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { archiveRisk, restoreRisk } from "@/lib/api/risk-register";
import {
  listRiskMonitorings,
  startMonitoring,
} from "@/lib/api/risk-monitoring";
import { listUsers, type UserListItem } from "@/lib/api/users";
import { listAllOrganizations } from "@/lib/api/organizations";
import { filterToAccessibleOrgs } from "@/lib/organization";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  TooltipProvider,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import {
  Loader2,
  RefreshCcw,
  Save,
  Send,
  ShieldAlert,
  Trash2,
} from "@/components/ui/icons";

import {
  getRiskLevelFromNilai,
  riskCategoryLabels,
  getBobot,
  calculateNilai,
  getRiskPriority,
  resolveRiskAppetite,
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
import { FormPage } from "@/components/shared/form-shell";
import {
  ActionButton,
  AccentButton,
  CollectionDialogCancel,
  CollectionPageHeader,
  FieldErrorMessage,
  Input,
  PopoverSelectField,
  RiskScoreHeatmapModal,
  RiskScorePickerTrigger,
  Textarea,
} from "@/components/shared/design-system";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationPicker } from "@/components/shared/mitigation-picker";
import {
  MitigationProgressTab,
  type MitigationProgressDraft,
} from "@/components/shared/mitigation-progress-tab";
import type {
  RiskCategory,
  RiskVersionTimelineItem,
} from "@/types/risk";
import {
  consumeMeetingIntelligencePrefill,
  MEETING_INTELLIGENCE_PREFILL_PARAM,
  MEETING_INTELLIGENCE_PREFILL_KEY,
  type RiskDraftPrefill,
} from "@/lib/meeting-intelligence";
import {
  consumeDocumentIntelligencePrefill,
  consumeLatestMitigationReportPrefill,
  DOCUMENT_INTELLIGENCE_PREFILL_PARAM,
} from "@/lib/document-intelligence-prefill";
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
  AiSuggestionModal,
  type SuggestionItem,
} from "@/components/shared/ai-suggestion-modal";
import {
  currentAssessmentCycle,
  currentMonitoringCycle,
  getSelectableMonitoringCycles,
} from "@/lib/risk-cycle-options";
import { buildRiskRegisterPayload } from "@/lib/risk-register-payload";

const RiskLogTimeline = dynamic(
  () =>
    import("@/components/risk/risk-log-timeline").then(
      (mod) => mod.RiskLogTimeline,
    ),
  {
    ssr: false,
    loading: () => (
      <Card>
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
const RISK_FORM_CARD_CLASS =
  "scroll-mt-28 overflow-hidden rounded-lg bg-card gap-0 p-0 transition-colors";
type CategoryKey = "manusia" | "metode" | "mesin" | "material" | "lingkungan";

type SectionId =
  | "identifikasi"
  | "analisis"
  | "evaluasi"
  | "penanganan"
  | "target";
type CauseImpactItem = { id: string; text: string };
type RiskSuggestion = {
  title: string;
  description: string;
  category?: RiskCategory | "" | null;
};
type RiskApiMitigation = MitigationItem & {
  ownerUserId?: string;
};

type RiskApiResponse = {
  id: string;
  versionGroupId?: string;
  versionNumber?: number;
  status?: string;
  isCurrent?: boolean;
  archivedAt?: string | null;
  archivedReason?: string;
  draftId?: string | null;
  hasOngoing?: boolean;
  title?: string;
  description?: string;
  category?: RiskCategory | "" | null;
  organizationId?: string;
  roId?: string | null;
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

type RiskStatusTone =
  | "neutral"
  | "progress"
  | "success"
  | "warning"
  | "danger"
  | "info";

function getRiskStatusLabel(status?: string | null) {
  switch ((status ?? "").trim().toLowerCase()) {
    case "draft":
      return "Draft";
    case "assessment_draft":
      return "Draft pemantauan";
    case "assessment_in_review":
    case "pending_review":
      return "Dalam review";
    case "approved":
    case "final":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
    case "archived":
      return "Diarsipkan";
    default: {
      const normalized = (status ?? "").trim().replaceAll("_", " ");
      return normalized
        ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
        : "Draft";
    }
  }
}

function getRiskStatusTone(status?: string | null): RiskStatusTone {
  switch ((status ?? "").trim().toLowerCase()) {
    case "final":
    case "approved":
      return "success";
    case "assessment_in_review":
    case "pending_review":
      return "warning";
    case "rejected":
      return "danger";
    case "assessment_draft":
      return "progress";
    default:
      return "neutral";
  }
}

type RiskSaveResponse = {
  id: string;
  code?: string;
};

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

const SIDE_PANEL_PREVIEW_LIMIT = 5;

function RiskVersionHistoryList({
  versions,
  onVersionSelect,
}: {
  versions: RiskVersionTimelineItem[];
  onVersionSelect: (versionId: string) => void;
}) {
  return (
    <div className="relative pl-6">
      <div className="space-y-5">
        {versions.map((version, index) => (
          <Link
            key={version.id}
            href={`/risk/register/new?id=${version.id}`}
            onClick={() => onVersionSelect(version.id)}
            className="group relative block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {index < versions.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[30px] -left-[16px] top-[10px] z-0 w-px bg-border/70"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-[22px] top-1 z-10 size-3 rounded-full border-2",
                version.isCurrent
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-muted-foreground bg-muted-foreground",
              )}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {version.versionNumber
                    ? `v${version.versionNumber}`
                    : "Versi"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {version.code || "Risiko"} ·{" "}
                {new Date(version.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {version.assessmentCycle
                  ? ` · ${version.assessmentCycle}`
                  : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-xs font-medium text-foreground/80">
                {version.title || "Tanpa judul"}
              </p>
              {version.changeReason && (
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                  {version.changeReason}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Match the loading-label transition in globals.css. Network work runs concurrently.
function waitForAiButtonTransition() {
  return new Promise<void>((resolve) => {
    window.setTimeout(
      resolve,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 540,
    );
  });
}

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
      aria-busy={loading}
      aria-label={loading ? "Memproses..." : label}
      data-loading={loading}
      className="risk-ai-button h-7 px-4 text-xs text-muted-foreground hover:text-foreground"
    >
      <span aria-hidden="true" className="grid overflow-hidden leading-5">
        <span className="risk-ai-idle-label col-start-1 row-start-1">
          {label}
        </span>
        <span className="risk-ai-loading-label col-start-1 row-start-1">
          Memproses...
        </span>
      </span>
    </Button>
  );
}

// ----------------------
// Zod Schema
// ----------------------
const mitigationSchema = z.object({
  id: z.string().optional(),
  action: z.string().default(""),
  owner: z.string().default(""),
  treatmentOwnerId: z.string().optional(),
  externalPicId: z.string().optional(),
  mitigationType: z
    .enum(["reduce_probability", "reduce_impact", "reduce_both"])
    .default("reduce_probability"),
  activityStage: z.string().optional(),
  expectedOutput: z.string().optional(),
  quantitativeTarget: z.string().optional(),
  supportingUnit: z.string().optional(),
  resourcesRequired: z.string().optional(),
	contingencyPlan: z.string().optional(),
	potentialObstacle: z.string().optional(),
	isBreakthroughActivity: z.boolean().default(false),
  isExistingControl: z.boolean().default(false),
});

const formSchema = z
  .object({
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
    riskAppetite: z
      .enum(["dalam_batas", "di_atas_batas"])
      .default("dalam_batas"),
    treatmentOption: z
      .enum(["avoid", "transfer", "mitigate", "accept"])
      .optional(),
    nextReviewDate: z.string().optional(),

    mitigations: z.array(mitigationSchema).default([]),

    targetProbability: z.number().min(1).max(5).default(1),
    targetImpact: z.number().min(1).max(5).default(1),
    targetWeight: z.number().min(0.1).default(1.0),
    targetNilai: z.number().min(0).default(0),
    roId: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    values.mitigations.forEach((mitigation, index) => {
      const hasContent =
        [
          mitigation.owner,
          mitigation.activityStage,
          mitigation.expectedOutput,
          mitigation.quantitativeTarget,
          mitigation.supportingUnit,
			mitigation.resourcesRequired,
			mitigation.contingencyPlan,
			mitigation.potentialObstacle,
			mitigation.treatmentOwnerId,
          mitigation.externalPicId,
        ].some((value) => Boolean(String(value ?? "").trim())) ||
        mitigation.isBreakthroughActivity ||
        mitigation.isExistingControl;

      if (hasContent && !mitigation.action.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mitigations", index, "action"],
          message: "Aksi mitigasi wajib diisi",
        });
      }
    });
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
      action: mitigation.action ?? "",
      owner: mitigation.owner ?? "",
      mitigationType: mitigation.mitigationType ?? "reduce_probability",
      activityStage: mitigation.activityStage ?? "",
      expectedOutput: mitigation.expectedOutput ?? "",
      quantitativeTarget: mitigation.quantitativeTarget ?? "",
      supportingUnit: mitigation.supportingUnit ?? "",
		resourcesRequired: mitigation.resourcesRequired ?? "",
		contingencyPlan: mitigation.contingencyPlan ?? "",
		potentialObstacle: mitigation.potentialObstacle ?? "",
		isBreakthroughActivity: mitigation.isBreakthroughActivity ?? false,
      isExistingControl: mitigation.isExistingControl ?? false,
    })),
    targetProbability: values.targetProbability ?? 1,
    targetImpact: values.targetImpact ?? 1,
    targetWeight: values.targetWeight ?? 1,
    targetNilai: values.targetNilai ?? 0,
    roId: values.roId ?? "",
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
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedRiskId = searchParams.get("id");
  const documentPrefillToken = searchParams.get(
    DOCUMENT_INTELLIGENCE_PREFILL_PARAM,
  );
  const meetingPrefillToken = searchParams.get(
    MEETING_INTELLIGENCE_PREFILL_PARAM,
  );
  const { token, user } = useAuth();
  const riskApprovalCapabilityBehavior = useMemo(
    () => getRiskApprovalCapabilityBehavior(user?.capabilities),
    [user?.capabilities],
  );

  const [riskId, setRiskId] = useState<string | null>(null);
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);
  const [riskVersionNumber, setRiskVersionNumber] = useState<number | null>(
    null,
  );
  const [riskStatus, setRiskStatus] = useState<string>("draft");
  const [riskIsCurrent, setRiskIsCurrent] = useState(false);
  const [riskArchivedAt, setRiskArchivedAt] = useState<string | null>(null);
  const [riskArchivedReason, setRiskArchivedReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizations, setOrganizations] = useState<
    { id: string; name: string; uprLevel?: string }[]
  >([]);
  const [reviewerId, setReviewerId] = useState<string>("");
  const [reviewerOption, setReviewerOption] = useState<UserPickerOption | null>(
    null,
  );
  const [approvalLine, setApprovalLine] = useState<ApprovalLineRow[]>([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<RiskWorkflowState | null>(null);
  const [assessmentCycleDisplay, setAssessmentCycleDisplay] = useState(
    currentAssessmentCycle(),
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showMonitoringDialog, setShowMonitoringDialog] = useState(false);
  const [selectedMonitoringCycle, setSelectedMonitoringCycle] = useState(
    currentMonitoringCycle(),
  );
  const [isStartingMonitoring, setIsStartingMonitoring] = useState(false);
  const [ongoingMonitoring, setOngoingMonitoring] = useState<{
    id: string;
    assessmentCycle: string;
  } | null>(null);
  const [monitoringLookupStatus, setMonitoringLookupStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [archiveReasonInput, setArchiveReasonInput] = useState("");
  const [archiveNoteInput, setArchiveNoteInput] = useState("");
  const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
  const [riskVersions, setRiskVersions] = useState<RiskVersionTimelineItem[]>(
    [],
  );
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showVersionHistoryDialog, setShowVersionHistoryDialog] =
    useState(false);
  const riskLoadRequestRef = useRef(0);
  const [ongoingAssessmentId, setOngoingAssessmentId] = useState<string | null>(
    null,
  );
  const submitTarget = useRef<"draft" | "review">("draft");

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      organizationId: "",
      roId: undefined,
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
  const mitigationActionErrors = useMemo(
    () =>
      (
        (errors.mitigations as
          | Array<{ action?: { message?: string } }>
          | undefined) ?? []
      ).map((item) => item?.action?.message),
    [errors.mitigations],
  );
  const targetProbability = watch("targetProbability") ?? 1;
  const targetImpact = watch("targetImpact") ?? 1;
  const existingControl = watch("existingControl") ?? "";
  const controlEffectiveness = watch("controlEffectiveness") ?? "";
  const treatmentOption = watch("treatmentOption") ?? "";
  const nextReviewDate = watch("nextReviewDate") ?? "";
  const riskCode = watch("riskCode") ?? "";
  const monitoringCycleOptions = useMemo(
    () => getSelectableMonitoringCycles(currentMonitoringCycle()),
    [],
  );
  const selectedApprovalLine = approvalLine.filter((member) => member.id);
  const isApprovalLineReady =
    selectedApprovalLine.length > 0 &&
    approvalLine.every((member) => member.id);
  const submitActionLabel =
    riskApprovalCapabilityBehavior.usesDirectApprovalCopy
      ? "Finalisasi"
      : "Ajukan untuk review";

  // KMK Risk Appetite Advisory
  const advisoryWeight = getBobot(probability, impact);
  const advisoryNilai = calculateNilai(probability, impact, advisoryWeight);
  const advisoryInherentScore = Math.round(advisoryNilai);
  const advisoryAppetite = resolveRiskAppetite(advisoryInherentScore);

  // Auto-set selera risiko & pilihan penanganan berdasarkan KMK
  useEffect(() => {
    setValue("riskAppetite", advisoryAppetite);
    // Auto-set pilihan penanganan: Dalam batas → terima, Di atas batas → mitigasi
    if (advisoryAppetite === "dalam_batas") {
      setValue("treatmentOption", "accept");
    } else if (advisoryAppetite === "di_atas_batas") {
      setValue("treatmentOption", "mitigate");
    }
  }, [advisoryAppetite, setValue]);

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
      const loadRequestId = ++riskLoadRequestRef.current;

      try {
        setIsSubmitting(true);
        setOngoingMonitoring(null);
        setMonitoringLookupStatus("loading");
        const risk = await api.get<RiskApiResponse>(
          `/risks/${id}`,
          token ?? undefined,
        );
        if (loadRequestId !== riskLoadRequestRef.current) return;

        setRiskId(risk.id);
        setRiskStatus(risk.status || "draft");
        setRiskIsCurrent(risk.isCurrent ?? false);
        setRiskVersionNumber(risk.versionNumber ?? null);
        setRiskArchivedAt(risk.archivedAt || null);
        setRiskArchivedReason(risk.archivedReason || "");
        setOngoingAssessmentId(
          risk.hasOngoing && risk.draftId ? risk.draftId : null,
        );

        if (risk.status === "final" && risk.isCurrent && !risk.archivedAt) {
          void listRiskMonitorings(token ?? "", {
            q: risk.code || undefined,
            lifecycle: "all",
            status: "draft",
            limit: 100,
          })
            .then((monitoringResult) => {
              if (loadRequestId !== riskLoadRequestRef.current) return;

              const existingMonitoring = monitoringResult.data.find(
                (monitoring) =>
                  monitoring.status === "draft" &&
                  (monitoring.sourceRiskId === risk.id ||
                    (risk.versionGroupId &&
                      monitoring.sourceRisk?.versionGroupId ===
                        risk.versionGroupId)),
              );

              setOngoingMonitoring(
                existingMonitoring
                  ? {
                      id: existingMonitoring.id,
                      assessmentCycle: existingMonitoring.assessmentCycle,
                    }
                  : null,
              );
              setMonitoringLookupStatus("ready");
            })
            .catch((monitoringError) => {
              if (loadRequestId !== riskLoadRequestRef.current) return;

              console.error(
                "Failed to check ongoing monitoring:",
                monitoringError,
              );
              setOngoingMonitoring(null);
              setMonitoringLookupStatus("error");
            });
        } else {
          setMonitoringLookupStatus("ready");
        }

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
          roId: risk.roId || "",
          mitigations: Array.isArray(risk.mitigations)
            ? risk.mitigations.map((mitigation) => ({
                ...mitigation,
                treatmentOwnerId:
                  mitigation.ownerUserId || mitigation.treatmentOwnerId,
                mitigationType:
                  mitigation.mitigationType || "reduce_probability",
                activityStage: mitigation.activityStage || "",
                expectedOutput: mitigation.expectedOutput || "",
                quantitativeTarget: mitigation.quantitativeTarget || "",
                supportingUnit: mitigation.supportingUnit || "",
				resourcesRequired: mitigation.resourcesRequired || "",
				contingencyPlan: mitigation.contingencyPlan || "",
				potentialObstacle: mitigation.potentialObstacle || "",
				isBreakthroughActivity:
                  mitigation.isBreakthroughActivity || false,
                isExistingControl: mitigation.isExistingControl || false,
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
          void (async () => {
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
              if (loadRequestId !== riskLoadRequestRef.current) return;

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
              if (loadRequestId !== riskLoadRequestRef.current) return;

              setApprovalId(null);
              setApprovalWorkflow(null);
              if (
                approvalError instanceof ApiError &&
                approvalError.status !== 404
              ) {
                console.error("Failed to load approval line:", approvalError);
              }
            }
          })();
        } else {
          setApprovalId(null);
          setApprovalWorkflow(null);
        }
      } catch (error) {
        if (loadRequestId !== riskLoadRequestRef.current) return;

        if (error instanceof ApiError && error.status === 404) {
          setRiskId(null);
          setRiskStatus("draft");
          setRiskIsCurrent(false);
          setRiskVersionNumber(null);
          setRiskArchivedAt(null);
          setRiskArchivedReason("");
          setOngoingAssessmentId(null);
          setOngoingMonitoring(null);
          setMonitoringLookupStatus("idle");
          setReviewerId("");
          setReviewerOption(null);
          setApprovalLine([]);
          setApprovalId(null);
          setApprovalWorkflow(null);
          setAssessmentCycleDisplay(currentAssessmentCycle());
          setRiskVersions([]);
          reset();
          toast.error("Risiko tidak ditemukan. Form baru dibuka.");
          return;
        }
        console.error("Failed to load risk data:", error);
        toast.error("Gagal memuat data risiko. Silakan coba lagi.");
      } finally {
        if (loadRequestId === riskLoadRequestRef.current) {
          setIsSubmitting(false);
        }
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
    let cancelled = false;

    const loadOrganizations = async () => {
      if (!token) return;

      try {
        const res = await listAllOrganizations(token);
        if (cancelled) return;

        const filtered = user?.isGlobal
          ? res
          : filterToAccessibleOrgs(res, user?.accessibleOrgIds || []);
        setOrganizations(
          filtered.map((org) => ({
            id: org.id,
            name: org.name,
            uprLevel: org.uprLevel,
          })),
        );
      } catch (err) {
        if (!cancelled) console.error(err);
      }
    };

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  useEffect(() => {
    const init = async () => {
      const existingRiskId = selectedRiskId;

      if (documentPrefillToken) {
        const documentPrefill =
          consumeDocumentIntelligencePrefill(documentPrefillToken);
        if (documentPrefill?.kind === "mitigation-report") {
          setMitigationProgressDraft({
            taskId: documentPrefill.taskId,
            notes: documentPrefill.notes || "",
          });
          if (existingRiskId) {
            toast.success(
              "Draft laporan mitigasi siap dipakai di tab Progress.",
            );
          }
        } else if (documentPrefill?.kind === "risk" && !existingRiskId) {
          try {
            reset({
              title: documentPrefill.title || "",
              description: documentPrefill.description || "",
              category: undefined,
              organizationId: user?.organizationId || "",
              riskCode: documentPrefill.riskCode || "",
              causes: documentPrefill.quote
                ? [
                    {
                      id: "document-intelligence-quote",
                      text: documentPrefill.quote,
                    },
                  ]
                : [],
              impacts: [],
              riskSource:
                (documentPrefill.source as "internal" | "eksternal") ||
                "internal",
              controllability: "C",
              existingControl: "",
              controlEffectiveness: "",
              probability: documentPrefill.probability || 3,
              impact: documentPrefill.impact || 3,
              weight: 1.0,
              riskPriority: 0,
              riskAppetite: "dalam_batas",
              treatmentOption: normalizeTreatmentOption(
                documentPrefill.treatmentOption,
              ),
              nextReviewDate: "",
              mitigations: documentPrefill.mitigation
                ? [
                    {
                      action: documentPrefill.mitigation,
                      owner: "",
                      mitigationType: "reduce_probability",
                      isBreakthroughActivity: false,
                      isExistingControl: false,
                    },
                  ]
                : [],
              targetProbability: Math.max(
                1,
                (documentPrefill.probability || 3) - 1,
              ),
              targetImpact: Math.max(1, (documentPrefill.impact || 3) - 1),
              targetWeight: 1.0,
            });
            setAssessmentCycleDisplay(currentAssessmentCycle());
            setRiskId(null);
            setRiskStatus("draft");
            toast.success("Draft risiko diisi dari Document Intelligence.");
            return;
          } catch (error) {
            console.error(
              "Failed to apply Document Intelligence prefill:",
              error,
            );
            toast.error(
              "Prefill dari Document Intelligence tidak dapat dibaca. Silakan isi draft secara manual.",
            );
          }
        }
      } else if (existingRiskId) {
        const latestMitigationPrefill = consumeLatestMitigationReportPrefill();
        if (latestMitigationPrefill?.kind === "mitigation-report") {
          setMitigationProgressDraft({
            taskId: latestMitigationPrefill.taskId,
            notes: latestMitigationPrefill.notes || "",
          });
          toast.success("Draft laporan mitigasi siap dipakai di tab Progress.");
        }
      }

      if (existingRiskId) {
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
            const trimmedMeetingPrefillRaw = meetingPrefillRaw.trim();
            meetingPrefill = trimmedMeetingPrefillRaw
              ? (JSON.parse(trimmedMeetingPrefillRaw) as RiskDraftPrefill)
              : null;
          } catch (error) {
            console.error(
              "Failed to parse legacy MoM Intelligence prefill:",
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
                  mitigationType: "reduce_probability",
                  isBreakthroughActivity: false,
                  isExistingControl: false,
                },
              ]
            : [],
          targetProbability: Math.max(1, (meetingPrefill.probability || 3) - 1),
          targetImpact: Math.max(1, (meetingPrefill.impact || 3) - 1),
          targetWeight: 1.0,
        });
        setAssessmentCycleDisplay(currentAssessmentCycle());
        setRiskId(null);
        setRiskStatus("draft");
        toast.success(
          "Draft risiko diisi dari rekomendasi MoM Intelligence.",
        );
      } catch (error) {
        console.error("Failed to apply MoM Intelligence prefill:", error);
        toast.error(
          "Prefill dari MoM Intelligence tidak dapat dibaca. Silakan isi draft secara manual.",
        );
      }
    };

    init();
  }, [documentPrefillToken, meetingPrefillToken, reset, selectedRiskId, setValue, user]);

  useEffect(() => {
    if (!selectedRiskId || !token) {
      riskLoadRequestRef.current += 1;
      setLoadingVersionId(null);
      if (!selectedRiskId) setRiskVersionNumber(null);
      return;
    }

    let active = true;
    setLoadingVersionId(selectedRiskId);
    void loadRiskData(selectedRiskId).finally(() => {
      if (!active) return;

      setLoadingVersionId((current) =>
        current === selectedRiskId ? null : current,
      );
    });

    return () => {
      active = false;
    };
  }, [loadRiskData, selectedRiskId, token]);

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
  const [scorePickerMode, setScorePickerMode] = useState<
    "inherent" | "target" | null
  >(null);
  const [generatingRisk, setGeneratingRisk] = useState(false);
  const [riskSuggestions, setRiskSuggestions] = useState<RiskSuggestion[]>([]);
  const [showRiskSuggestions, setShowRiskSuggestions] = useState(false);
  const [mitigationProgressDraft, setMitigationProgressDraft] =
    useState<MitigationProgressDraft | null>(null);

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
  const canUseAiAssist =
    !aiFeaturesDisabled &&
    title.trim().length > 0 &&
    description.trim().length > 0;

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
        "Tetapkan prioritas dan pilihan penanganan sebelum diajukan untuk persetujuan.",
      done: !!treatmentOption,
      hint: "Pilih strategi penanganan risiko.",
    },
    {
      id: "penanganan",
      step: "4",
      title: "Rencana Penanganan",
      description:
        "Tentukan aksi mitigasi yang nyata, siapa PIC-nya, dan kapan eksekusinya. Opsional.",
      done: true, // Always optional — no enforcement based on treatment option
      hint: "Tambahkan aksi mitigasi jika diperlukan.",
    },
    {
      id: "target",
      step: "5",
      title: "Target Penurunan",
      description:
        "Tetapkan target risiko residual agar reviewer melihat tujuan akhirnya dengan jelas.",
      done: targetNilai > 0,
      hint: "Tetapkan target probabilitas dan dampak residual.",
    },
  ];

  const missingSections = sectionStatuses.filter((section) => !section.done);
  const lockedControlClass =
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:!bg-disabled-surface disabled:!text-disabled-foreground disabled:!opacity-100";
  const isRiskLocked =
    riskStatus === "final" ||
    !!riskArchivedAt;
  const canManageMonitoring =
    Boolean(riskId) &&
    riskIsCurrent &&
    riskStatus === "final" &&
    !riskArchivedAt &&
    !isReadOnlyForOrg(user, currentOrganizationId || "");
  const canContinueMonitoring =
    canManageMonitoring &&
    monitoringLookupStatus === "ready" &&
    Boolean(ongoingMonitoring);
  const canStartMonitoring =
    canManageMonitoring &&
    monitoringLookupStatus === "ready" &&
    !ongoingMonitoring;

  const scrollToSection = (sectionId: SectionId) => {
    if (typeof document === "undefined") return;
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const offset = 120;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({
          top: offsetPosition,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
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
      (category) =>
        CATEGORY_TITLES[category as CategoryKey].toLowerCase() ===
        normalizedCategory,
    );
    return matchedCategory && isRiskCategory(matchedCategory)
      ? matchedCategory
      : undefined;
  };

  const handleApplyRiskSuggestion = (selectedItems: SuggestionItem[]) => {
    const selectedItem = selectedItems[0];
    if (!selectedItem) return;

    const selectedIndex = Number(
      selectedItem.id.replace("risk-suggestion-", ""),
    );
    const suggestion = riskSuggestions[selectedIndex];
    if (!suggestion) return;

    setValue("title", suggestion.title, {
      shouldValidate: true,
      shouldDirty: true,
    });
    setValue("description", suggestion.description, {
      shouldValidate: true,
      shouldDirty: true,
    });

    const resolvedCategory = resolveSuggestionCategory(suggestion);
    if (resolvedCategory) {
      setValue("category", resolvedCategory, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
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

  const finalizeRequiredFieldMessages: Record<
    SectionId,
    Array<{ field: keyof FormInput; message: string }>
  > = {
    identifikasi: [
      { field: "title", message: "Judul risiko wajib diisi" },
      { field: "description", message: "Deskripsi risiko wajib diisi" },
      { field: "category", message: "Kategori risiko wajib dipilih" },
      { field: "causes", message: "Minimal isi 1 sebab" },
      { field: "impacts", message: "Minimal isi 1 dampak" },
    ],
    analisis: [
      {
        field: "existingControl",
        message: "Pengendalian yang ada wajib diisi sebelum finalisasi",
      },
      {
        field: "controlEffectiveness",
        message: "Efektivitas pengendalian wajib dipilih sebelum finalisasi",
      },
    ],
    evaluasi: [
      {
        field: "treatmentOption",
        message: "Pilihan penanganan wajib dipilih sebelum finalisasi",
      },
    ],
    penanganan: [],
    target: [
      {
        field: "targetProbability",
        message: "Target probabilitas wajib dipilih sebelum finalisasi",
      },
      {
        field: "targetImpact",
        message: "Target dampak wajib dipilih sebelum finalisasi",
      },
    ],
  };

  const finalizeSchemaFields: Array<keyof FormInput> = [
    "title",
    "description",
    "category",
    "causes",
    "impacts",
  ];

  const applyFinalizeValidationErrors = (values: FormInput) => {
    const schemaFields = new Set<keyof FormInput>(finalizeSchemaFields);
    const schemaResult = formSchema.safeParse(values);
    let firstInvalidSection: SectionId | undefined;

    if (!schemaResult.success) {
      schemaResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field !== "string") {
          return;
        }

        if (!schemaFields.has(field as keyof FormInput)) {
          return;
        }

        setError(field as keyof FormInput, {
          type: "manual",
          message: issue.message,
        });

        if (!firstInvalidSection) {
          firstInvalidSection = getSectionIdFromField(field);
        }
      });
    }

    const missingFinalizeFields = missingSections.flatMap(
      (section) => finalizeRequiredFieldMessages[section.id] ?? [],
    );

    missingFinalizeFields.forEach(({ field, message }) => {
      if (schemaFields.has(field)) {
        return;
      }

      setError(field, { type: "manual", message });

      if (!firstInvalidSection) {
        firstInvalidSection = getSectionIdFromField(field);
      }
    });

    return {
      hasErrors: !schemaResult.success || missingFinalizeFields.length > 0,
      firstInvalidSection,
    };
  };

  const buildPayload = (data: FormValues, status: string) =>
    buildRiskRegisterPayload(data, status, {
      assessmentCycle: assessmentCycleDisplay,
      userRole: user?.role,
      userOrganizationId: user?.organizationId ?? null,
      reviewerId,
      reviewerOption,
      selectedApprovalLine,
    });

  const onSubmit = async (data: FormValues) => {
    if (isRiskLocked) {
      toast.info(
        "Risiko yang sudah difinalisasi hanya dapat dibaca. Buat versi baru untuk mengubah substansi.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const isDraft = submitTarget.current === "draft";
      const submissionStatus =
        isDraft || riskApprovalCapabilityBehavior.submitsForApproval
          ? "draft"
          : "final";
      const payload = buildPayload(data, submissionStatus);

      let currentRiskId = riskId;
      if (currentRiskId) {
        await api.put(`/risks/${currentRiskId}`, payload, token || undefined);
        if (riskId) {
          await loadRiskVersions(currentRiskId);
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
          toast.error("Susun reviewer dan alur persetujuan terlebih dahulu.");
          return;
        }

        if (!riskApprovalCapabilityBehavior.submitsForApproval) {
          toast.success("Risiko berhasil disimpan dan difinalisasi!");
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
          toast.success("Risiko berhasil disimpan dan diajukan untuk review!");
          router.push("/risk/register");
        } catch {
          toast.error(
            "Risiko tersimpan, tetapi pengajuan review gagal. Periksa koneksi dan coba lagi.",
          );
          router.push("/risk/register");
        }
      }
    } catch (err: unknown) {
      console.error("Failed to save", err);
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "Gagal menyimpan risiko. Periksa koneksi dan coba lagi.";
      toast.error(errorMessage);
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
      error: "Gagal menghapus draft. Periksa koneksi dan coba lagi.",
    });
  };

  const onValidationError = (errors: FieldErrors<FormInput>) => {
    toast.error(
      "Ada form isian yang wajib diisi atau masih salah. Periksa kolom yang ditandai di bawah ini.",
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

    if (
      riskApprovalCapabilityBehavior.requiresApprovalLineSelection &&
      !isApprovalLineReady
    ) {
      toast.error(
        "Lengkapi setiap baris penyetuju atau hapus baris yang masih kosong.",
      );
      return;
    }

    const { hasErrors, firstInvalidSection } = applyFinalizeValidationErrors(
      form.getValues(),
    );

    if (hasErrors) {
      toast.error(
        "Ada form isian yang wajib diisi atau masih salah. Periksa kolom yang ditandai di bawah ini.",
      );
      scrollToSection(
        firstInvalidSection ?? missingSections[0]?.id ?? "identifikasi",
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

  const handleSaveDraftHeaderRef = useRef(handleSaveDraft);
  const openSubmitReviewConfirmHeaderRef = useRef(openSubmitReviewConfirm);
  handleSaveDraftHeaderRef.current = handleSaveDraft;
  openSubmitReviewConfirmHeaderRef.current = openSubmitReviewConfirm;

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
      } finally {
        setLoadingVersions(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (riskId && token) {
      void loadRiskVersions(riskId);
    }
  }, [loadRiskVersions, riskId, token]);

  const handleVersionSelect = useCallback(
    (versionId: string) => {
      if (versionId !== selectedRiskId) {
        setLoadingVersionId(versionId);
      }
    },
    [selectedRiskId],
  );

  const FormErrorMessage = ({
    error,
    className,
  }: {
    error?: string | { message?: string };
    className?: string;
  }) => {
    const message = typeof error === "string" ? error : error?.message;
    return (
      <FieldErrorMessage className={cn("mt-1", className)}>
        {message}
      </FieldErrorMessage>
    );
  };

  // AI Generators
  async function handleGenerateRisk() {
    if (aiFeaturesDisabled || isRiskLocked) return;
    setGeneratingRisk(true);
    setRiskSuggestions([]);
    const transition = waitForAiButtonTransition();
    try {
      const res = await api.post<{ suggestions: RiskSuggestion[] }>(
        "/ai/risk-suggestions",
        { existingRisks: [] },
        token || undefined,
      );
      setRiskSuggestions(res.suggestions || []);
      await transition;
      setShowRiskSuggestions(true);
    } catch (err) {
      console.error(err);
      toast.error("Saran risiko belum berhasil dimuat. Coba lagi.");
      setShowRiskSuggestions(false);
    } finally {
      setGeneratingRisk(false);
    }
  }

  async function handleGenerateCause() {
    if (aiFeaturesDisabled || isRiskLocked) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Isi judul dan deskripsi dulu untuk AI");
      return;
    }
    setGeneratingCause(true);
    const transition = waitForAiButtonTransition();
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
              text: itemText,
              value: `[${CATEGORY_TITLES[categoryKey]}] ${itemText}`,
            });
          });
      });
      setCauseSuggestions(newItems);
      await transition;
      setCauseModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Saran penyebab belum berhasil dimuat. Coba lagi.");
      setCauseModalOpen(false);
    } finally {
      setGeneratingCause(false);
    }
  }

  async function handleGenerateImpact() {
    if (aiFeaturesDisabled || isRiskLocked) return;
    if (!title.trim() || !description.trim()) {
      toast.error("Isi judul dan deskripsi dulu untuk AI");
      return;
    }
    setGeneratingImpact(true);
    const transition = waitForAiButtonTransition();
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
      await transition;
      setImpactModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Saran dampak belum berhasil dimuat. Coba lagi.");
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
    } catch {
      toast.error("Gagal mengarsipkan risiko. Periksa koneksi dan coba lagi.");
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
    } catch {
      toast.error("Gagal memulihkan risiko. Periksa koneksi dan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMonitoringDialog = () => {
    if (!token || !riskId) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    if (!canStartMonitoring) {
      toast.info(
        ongoingMonitoring
          ? "Pemantauan untuk risiko ini sedang berjalan. Lanjutkan transaksi yang ada."
          : "Pemantauan hanya dapat dimulai dari risiko final yang aktif.",
      );
      return;
    }

    setSelectedMonitoringCycle(currentMonitoringCycle());
    setShowMonitoringDialog(true);
  };

  const handleStartMonitoring = async () => {
    if (!token || !riskId) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setIsStartingMonitoring(true);
    try {
      const result = await startMonitoring(
        token,
        riskId,
        selectedMonitoringCycle,
      );
      toast.success(
        result.existingDraft
          ? `Melanjutkan transaksi pemantauan ${selectedMonitoringCycle}.`
          : `Transaksi pemantauan ${selectedMonitoringCycle} berhasil dibuat.`,
      );
      router.push(
        result.redirectUrl || `/risk/monitoring/${result.monitoring.id}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Transaksi pemantauan belum berhasil dibuat.",
      );
    } finally {
      setIsStartingMonitoring(false);
    }
  };

  const visibleRiskVersions = riskVersions.slice(0, SIDE_PANEL_PREVIEW_LIMIT);
  const loadingVersion = riskVersions.find(
    (version) => version.id === loadingVersionId,
  );

  return (
    <TooltipProvider>
      <FormPage className="risk-form-filter-controls space-y-6 [&>header+*]:!mt-6">
        <CollectionPageHeader
          showTitle
          actionsPlacement="title"
          title={riskId ? riskCode || "Edit Risiko" : "Tambah Risiko"}
          subtitle="Identifikasi konteks, penyebab, dampak, dan penanganan risiko."
          actions={
            <>
              {riskId ? (
                <ActionButton asChild variant="outline" icon={<ShieldAlert className="size-3.5" />}>
                  <Link href={`/risk-events?riskId=${riskId}`}>Catat Kejadian</Link>
                </ActionButton>
              ) : null}
              {canContinueMonitoring && ongoingMonitoring ? (
                <ActionButton
                  asChild
                  variant="outline"
                  className="px-4"
                >
                  <Link
                    href={`/risk/monitoring/${ongoingMonitoring.id}`}
                    title={`Lanjutkan pemantauan ${ongoingMonitoring.assessmentCycle}`}
                  >
                    Lanjutkan Pemantauan
                  </Link>
                </ActionButton>
              ) : canStartMonitoring ? (
                <ActionButton
                  variant="outline"
                  icon={<RefreshCcw className="size-3.5" strokeWidth={2} />}
                  onClick={handleOpenMonitoringDialog}
                  disabled={isSubmitting || isStartingMonitoring}
                >
                  Mulai Pemantauan
                </ActionButton>
              ) : canManageMonitoring && monitoringLookupStatus === "loading" ? (
                <ActionButton variant="secondary" loading disabled>
                  Memeriksa pemantauan…
                </ActionButton>
              ) : null}
              {riskStatus === "draft" || !riskId ? (
                <>
                  <ActionButton
                    variant="outline"
                    loading={
                      isSubmitting && submitTarget.current === "draft"
                    }
                    icon={<Save className="size-3.5" />}
                    onClick={() => handleSaveDraftHeaderRef.current()}
                    disabled={isSubmitting}
                  >
                    Simpan draft
                  </ActionButton>
                  <AccentButton
                    icon={
                      isSubmitting && submitTarget.current === "review" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )
                    }
                    onClick={() =>
                      openSubmitReviewConfirmHeaderRef.current()
                    }
                    disabled={isSubmitting}
                  >
                    {submitActionLabel}
                  </AccentButton>
                </>
              ) : null}
            </>
          }
        />

        {loadingVersionId && (
          <div
            className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            <span>
              Memuat {loadingVersion?.versionNumber
                ? `versi v${loadingVersion.versionNumber}`
                : "versi risiko"}
              ...
            </span>
          </div>
        )}

        {riskArchivedAt && (
          <Card className="bg-amber-50/80">
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

        <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="min-w-0 w-full [&_[data-slot=label]]:font-medium"
            >
              <div className="space-y-6">
                <Card
                  id="identifikasi"
                  className={RISK_FORM_CARD_CLASS}
                >
                  <CardHeader className="px-5 py-4">
                    <div className="flex flex-1 flex-col gap-0.5 pr-4">
                      <p className="text-sm font-medium tracking-tight text-foreground transition-colors">
                        Identifikasi Risiko
                      </p>
                      <p className="text-xs leading-relaxed text-secondary-foreground">
                        {sectionStatuses[0].description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-5 pb-6 pt-2">
                    <div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium text-foreground">
                          Risiko
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        {!aiFeaturesDisabled ? (
                          <AiFieldButton
                            loading={generatingRisk}
                            disabled={isRiskLocked}
                            onClick={handleGenerateRisk}
                            label="Bantu rumuskan risiko"
                          />
                        ) : null}
                      </div>
                      <div className="mt-1.5">
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
                                lockedControlClass,
                                errors.title && "border-destructive",
                              )}
                            />
                          )}
                        />
                        <FormErrorMessage error={errors.title?.message} />
                      </div>

                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">
                        Deskripsi Kejadian Risiko
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Contoh: Mesin A mati tiba-tiba saat proses produksi sehingga produksi terhenti selama 2 jam."
                            disabled={isRiskLocked}
                            className={cn(
                              "min-h-[120px] text-sm",
                              lockedControlClass,
                              errors.description && "border-destructive",
                            )}
                          />
                        )}
                      />
                      <FormErrorMessage
                        error={errors.description?.message}
                        className="mt-0"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">
                        Kategori Risiko
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="category"
                        control={control}
                        render={({ field }) => (
                          <PopoverSelectField
                            value={field.value}
                            onValueChange={field.onChange}
                            options={riskCategoryOptions}
                            placeholder="Pilih kategori risiko"
                            disabled={isRiskLocked}
                            invalid={Boolean(errors.category)}
                            triggerClassName={cn(
                              lockedControlClass,
                              errors.category && "border-destructive",
                            )}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.category?.message} />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium text-foreground">
                          Sebab
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        {!aiFeaturesDisabled ? (
                          <AiFieldButton
                            loading={generatingCause}
                            disabled={!canUseAiAssist || isRiskLocked}
                            onClick={handleGenerateCause}
                            label="Susun sebab dengan AI"
                          />
                        ) : null}
                      </div>
                      <Controller
                        name="causes"
                        control={control}
                        render={({ field }) => (
                          <EditableItemsTable
                            items={field.value}
                            onChange={field.onChange}
                            placeholder="Tulis penyebab risiko"
                            addItemLabel="Tambah sebab"
                            emptyMessage="Belum ada sebab"
                            disabled={isRiskLocked}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.causes?.message} />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">
                          Sumber Risiko
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Controller
                          name="riskSource"
                          control={control}
                          render={({ field }) => (
                            <PopoverSelectField
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                { value: "internal", label: "Internal" },
                                { value: "eksternal", label: "Eksternal" },
                              ]}
                              placeholder="Pilih sumber risiko"
                              disabled={isRiskLocked}
                              triggerClassName={lockedControlClass}
                            />
                          )}
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-foreground">
                          Tingkat Kendali
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Controller
                          name="controllability"
                          control={control}
                          render={({ field }) => (
                            <PopoverSelectField
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                { value: "C", label: "Controllable" },
                                { value: "UC", label: "Uncontrollable" },
                              ]}
                              placeholder="Pilih tingkat kendali"
                              disabled={isRiskLocked}
                              triggerClassName={lockedControlClass}
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium text-foreground">
                          Dampak
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        {!aiFeaturesDisabled ? (
                          <AiFieldButton
                            loading={generatingImpact}
                            disabled={!canUseAiAssist || isRiskLocked}
                            onClick={handleGenerateImpact}
                            label="Susun dampak dengan AI"
                          />
                        ) : null}
                      </div>
                      <Controller
                        name="impacts"
                        control={control}
                        render={({ field }) => (
                          <EditableItemsTable
                            items={field.value}
                            onChange={field.onChange}
                            placeholder="Tulis dampak risiko"
                            addItemLabel="Tambah dampak"
                            disabled={isRiskLocked}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.impacts?.message} />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  id="analisis"
                  className={RISK_FORM_CARD_CLASS}
                >
                  <CardHeader className="px-5 py-4">
                    <div className="flex flex-1 flex-col gap-0.5 pr-4">
                      <p className="text-sm font-medium tracking-tight text-foreground transition-colors">
                        Analisis Risiko
                      </p>
                      <p className="text-xs leading-relaxed text-secondary-foreground">
                        {sectionStatuses[1].description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">
                        Pengendalian yang Ada
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="existingControl"
                        control={control}
                        render={({ field }) => (
                          <EditableList
                            value={field.value || ""}
                            onChange={field.onChange}
                            placeholder="Contoh: SOP inspeksi dan pemeliharaan berkala."
                            disabled={isRiskLocked}
                          />
                        )}
                      />
                      <FormErrorMessage
                        error={errors.existingControl?.message}
                      />
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <Label className="text-sm font-medium text-foreground">
                          Efektivitas Pengendalian
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Controller
                          name="controlEffectiveness"
                          control={control}
                          render={({ field }) => (
                            <PopoverSelectField
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                { value: "efektif", label: "Efektif" },
                                {
                                  value: "tidak_efektif",
                                  label: "Tidak efektif",
                                },
                              ]}
                              placeholder="Belum dinilai"
                              disabled={isRiskLocked}
                              invalid={Boolean(errors.controlEffectiveness)}
                              triggerClassName={cn(
                                "!w-full",
                                lockedControlClass,
                                errors.controlEffectiveness &&
                                  "border-destructive",
                              )}
                            />
                          )}
                        />
                        <FormErrorMessage
                          error={errors.controlEffectiveness?.message}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Label className="text-sm font-medium text-foreground">
                        Skor Risiko
                      </Label>
                      <RiskScorePickerTrigger
                        title="Skor Risiko"
                        probability={probability}
                        impact={impact}
                        onClick={() => setScorePickerMode("inherent")}
                        disabled={isRiskLocked}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  id="evaluasi"
                  className={RISK_FORM_CARD_CLASS}
                >
                  <CardHeader className="px-5 py-4">
                    <div className="flex flex-1 flex-col gap-0.5 pr-4">
                      <p className="text-sm font-medium tracking-tight text-foreground transition-colors">
                        Evaluasi Risiko
                      </p>
                      <p className="text-xs leading-relaxed text-secondary-foreground">
                        {sectionStatuses[2].description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="grid gap-5 text-sm font-normal text-muted-foreground md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-foreground">
                          Prioritas Risiko
                        </Label>
                        <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 font-normal text-muted-foreground">
                          <span>{riskPriority}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-foreground">
                          Selera Risiko
                        </Label>
                        <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1 font-normal text-muted-foreground">
                          <span>
                            {advisoryAppetite === "di_atas_batas"
                              ? "Di atas batas selera risiko"
                              : "Dalam batas selera risiko"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium text-foreground">
                        Pilihan Penanganan
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <Controller
                        name="treatmentOption"
                        control={control}
                        render={({ field }) => (
                          <PopoverSelectField
                            value={field.value}
                            onValueChange={field.onChange}
                            options={treatmentOptionOptions}
                            placeholder="Pilih penanganan"
                            disabled={isRiskLocked}
                            invalid={Boolean(errors.treatmentOption)}
                            triggerClassName={cn(
                              lockedControlClass,
                              errors.treatmentOption && "border-destructive",
                            )}
                          />
                        )}
                      />
                      <FormErrorMessage
                        error={errors.treatmentOption?.message}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  id="penanganan"
                  className={RISK_FORM_CARD_CLASS}
                >
                  <CardHeader className="px-5 py-4">
                    <div className="flex flex-1 flex-col gap-0.5 pr-4">
                      <p className="text-sm font-medium tracking-tight text-foreground transition-colors">
                        Rencana Penanganan
                      </p>
                      <p className="text-xs leading-relaxed text-secondary-foreground">
                        {sectionStatuses[3].description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="text-sm font-medium text-foreground">
                          Rencana Mitigasi
                        </Label>
                        {!aiFeaturesDisabled ? (
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
                                    mitigationType: "reduce_probability",
                                    isBreakthroughActivity: false,
                                    isExistingControl: false,
                                  },
                                ],
                                { shouldValidate: true },
                              );
                            }}
                            existingActions={(mitigations || [])
                              .map((mitigation) => mitigation.action)
                              .filter((action): action is string =>
                                Boolean(action),
                              )}
                            disabled={isRiskLocked}
                          />
                        ) : null}
                      </div>
                      <Controller
                        name="mitigations"
                        control={control}
                        render={({ field }) => (
                          <MitigationTable
                            items={(field.value ?? []).map(
                              (mitigation): MitigationItem => ({
                                id: mitigation.id,
                                action: mitigation.action ?? "",
                                owner: mitigation.owner ?? "",
                                treatmentOwnerId: mitigation.treatmentOwnerId,
                                externalPicId: mitigation.externalPicId,
                                mitigationType:
                                  mitigation.mitigationType ??
                                  "reduce_probability",
                                activityStage: mitigation.activityStage ?? "",
                                expectedOutput: mitigation.expectedOutput ?? "",
                                quantitativeTarget:
                                  mitigation.quantitativeTarget ?? "",
                                supportingUnit: mitigation.supportingUnit ?? "",
				resourcesRequired:
					mitigation.resourcesRequired ?? "",
				contingencyPlan: mitigation.contingencyPlan ?? "",
				potentialObstacle:
					mitigation.potentialObstacle ?? "",
				isBreakthroughActivity:
                                  mitigation.isBreakthroughActivity ?? false,
                                isExistingControl:
                                  mitigation.isExistingControl ?? false,
                              }),
                            )}
                            onChange={field.onChange}
                            loadPicOptions={loadPicOptions}
                            disabled={isRiskLocked}
                            actionErrors={mitigationActionErrors}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.mitigations?.message} />
                    </div>

                    <div className="flex flex-col gap-2 pt-1">
                      <Label className="text-sm font-medium text-foreground">
                        Jadwal Pelaksanaan
                      </Label>
                      <Input
                        type="text"
                        placeholder="Contoh: Minggu ke-2 pada Triwulan I 2026"
                        value={nextReviewDate}
                        onChange={(event) =>
                          setValue("nextReviewDate", event.target.value, {
                            shouldValidate: true,
                          })
                        }
                        disabled={isRiskLocked}
                        className={cn("h-10 text-sm", lockedControlClass)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  id="target"
                  className={RISK_FORM_CARD_CLASS}
                >
                  <CardHeader className="px-5 py-4">
                    <div className="flex flex-1 flex-col gap-0.5 pr-4">
                      <p className="text-sm font-medium tracking-tight text-foreground transition-colors">
                        Target Penurunan
                      </p>
                      <p className="text-xs leading-relaxed text-secondary-foreground">
                        {sectionStatuses[4].description}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 px-5 pb-6 pt-2">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center">
                        <Label className="flex h-6 items-center text-sm font-medium">
                          Pilih skor target
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                      </div>
                      <RiskScorePickerTrigger
                        title="Target penurunan"
                        probability={targetProbability}
                        impact={targetImpact}
                        onClick={() => setScorePickerMode("target")}
                        disabled={isRiskLocked}
                      />
                      <div className="grid gap-1 md:grid-cols-2">
                        <FormErrorMessage
                          error={errors.targetProbability?.message}
                        />
                        <FormErrorMessage error={errors.targetImpact?.message} />
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
                  <Card
                    id="approval-line"
                    className={RISK_FORM_CARD_CLASS}
                  >
                    <CardHeader className="px-5 py-4">
                      <div className="flex flex-1 flex-col gap-0.5 pr-4">
                        <p className="text-sm font-medium tracking-tight text-foreground transition-colors">
                          Alur Persetujuan
                        </p>
                        <p className="text-xs leading-relaxed text-secondary-foreground">
                          Susun reviewer dan rantai persetujuan pimpinan
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5 px-5 pb-6 pt-2">
                      <div className="rounded-lg bg-card p-5 space-y-3 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
                        <div className="flex flex-col gap-2">
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

                      <div className="rounded-lg bg-card p-5 space-y-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-medium text-foreground">
                            2. Alur Persetujuan (Pimpinan)
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
                          pickerTitle="Pilih penyetuju"
                          pickerDescription="Cari penyetuju untuk disusun ke dalam alur persetujuan."
                          pickerPlaceholder="Pilih penyetuju"
                          pickerSearchPlaceholder="Cari nama penyetuju"
                          pickerEmptyMessage="Penyetuju tidak ditemukan."
                          emptyStateMessage="Belum ada penyetuju. Tambahkan minimal satu pengguna sebelum mengajukan persetujuan."
                          addRowLabel="Tambah penyetuju"
                          footerNote="Urutan baris menentukan tahapan persetujuan pimpinan."
                          disabled={isRiskLocked}
                          dndGroup="risk-register-approval-line"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </form>
          </div>

          <aside className="min-w-0 self-start">
            <div className="space-y-6 xl:sticky xl:top-20">
              <Card className="gap-0 overflow-hidden rounded-lg bg-card p-0 transition-colors duration-300">
                <CardContent className="px-5 py-5 text-sm">
                  <div className="space-y-4">
                    <section aria-labelledby="risk-side-properties">
                      <h2
                        id="risk-side-properties"
                        className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                      >
                        Properti
                      </h2>
                      <dl className="mt-3 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-[13px] text-muted-foreground">Status</dt>
                          <dd className="shrink-0 text-right">
                            <Badge
                              size="compact"
                              tone={getRiskStatusTone(riskStatus)}
                            >
                              {getRiskStatusLabel(riskStatus)}
                            </Badge>
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-[13px] text-muted-foreground">Kode risiko</dt>
                          <dd className="max-w-[60%] truncate text-right font-mono text-foreground">
                            {riskCode || "Belum dibuat"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-[13px] text-muted-foreground">Versi</dt>
                          <dd className="shrink-0 text-right font-mono text-foreground">
                            {riskVersionNumber ? `v${riskVersionNumber}` : "-"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <dt className="text-[13px] text-muted-foreground">Periode asesmen</dt>
                          <dd className="shrink-0 text-right font-mono text-foreground">
                            {assessmentCycleDisplay || "-"}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    <section
                      aria-labelledby="risk-side-treatment"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          id="risk-side-treatment"
                          className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                        >
                          Penanganan
                        </h2>
                      </div>
                      <div className="mt-3">
                        {riskId ? (
                          <MitigationProgressTab
                            riskId={riskId}
                            token={token || ""}
                            aiDraft={mitigationProgressDraft}
                            onAiDraftConsumed={() =>
                              setMitigationProgressDraft(null)
                            }
                          />
                        ) : (
                          <div className="rounded-lg bg-state-surface px-3 py-4 text-center text-xs text-state-foreground">
                            Simpan draft untuk melihat progres penanganan.
                          </div>
                        )}
                      </div>
                    </section>

                    <section
                      aria-labelledby="risk-side-log"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      <h2
                        id="risk-side-log"
                        className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                      >
                        Log
                      </h2>
                      <div className="mt-3">
                        {riskId ? (
                          <RiskLogTimeline
                            riskId={riskId}
                            token={token || ""}
                          />
                        ) : (
                          <div className="rounded-lg bg-state-surface px-3 py-4 text-center text-xs text-state-foreground">
                            Simpan draft untuk mencatat log komunikasi.
                          </div>
                        )}
                      </div>
                    </section>

                    <section
                      aria-labelledby="risk-side-version-history"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          id="risk-side-version-history"
                          className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                        >
                          Riwayat versi
                        </h2>
                        {riskVersions.length > 0 && (
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {riskVersions.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        {loadingVersions ? (
                          <div className="flex items-center gap-2 rounded-lg bg-state-surface px-3 py-2 text-xs text-state-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            Memuat riwayat versi...
                          </div>
                        ) : riskVersions.length > 0 ? (
                          <RiskVersionHistoryList
                            versions={visibleRiskVersions}
                            onVersionSelect={handleVersionSelect}
                          />
                        ) : (
                          <p className="rounded-lg bg-state-surface px-3 py-2 text-xs text-state-foreground">
                            {riskId
                              ? "Belum ada riwayat versi."
                              : "Simpan draft untuk membentuk riwayat versi."}
                          </p>
                        )}
                      </div>
                      {riskVersions.length > SIDE_PANEL_PREVIEW_LIMIT && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-8 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onClick={() => setShowVersionHistoryDialog(true)}
                        >
                          Lihat semua versi ({riskVersions.length})
                        </Button>
                      )}
                    </section>
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
              />
            </div>
          </aside>
        </div>

        <Dialog
          open={showVersionHistoryDialog}
          onOpenChange={setShowVersionHistoryDialog}
        >
          <DialogContent
            className="max-w-2xl no-scrollbar"
            showCloseButton={false}
          >
            <div className="flex min-h-0 flex-col gap-5">
              <DialogHeader>
                <DialogTitle className="text-base">Riwayat Versi</DialogTitle>
              </DialogHeader>
              <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto pr-1">
                <RiskVersionHistoryList
                  versions={riskVersions}
                  onVersionSelect={(versionId) => {
                    setShowVersionHistoryDialog(false);
                    handleVersionSelect(versionId);
                  }}
                />
              </div>
              <DialogFooter>
                <CollectionDialogCancel
                  onClick={() => setShowVersionHistoryDialog(false)}
                >
                  Tutup
                </CollectionDialogCancel>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showMonitoringDialog}
          onOpenChange={(open) => {
            if (!isStartingMonitoring) {
              setShowMonitoringDialog(open);
            }
          }}
        >
          <DialogContent
            className="max-w-lg no-scrollbar"
            showCloseButton={false}
          >
            <div className="flex min-h-0 flex-col gap-5">
              <DialogHeader>
                <DialogTitle>Konfirmasi Pemantauan</DialogTitle>
                <DialogDescription>
                  Pilih periode untuk memulai pemantauan risiko ini.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Kode
                    </p>
                    <p className="font-mono text-xs text-foreground">
                      {riskCode || riskId || "-"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      Skor
                    </p>
                    <p className="text-sm text-foreground">
                      {Math.round(nilai)}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Risiko
                  </p>
                  <p className="text-sm text-foreground">
                    {title || "Tanpa judul"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium" htmlFor="new-monitoring-cycle">
                    Periode Pemantauan
                  </Label>
                  <PopoverSelectField
                    id="new-monitoring-cycle"
                    value={selectedMonitoringCycle}
                    onValueChange={setSelectedMonitoringCycle}
                    options={monitoringCycleOptions}
                    placeholder="Pilih periode pemantauan"
                    disabled={isStartingMonitoring}
                    triggerClassName="w-full"
                  />
                </div>
              </div>
              <DialogFooter>
                <CollectionDialogCancel
                  onClick={() => setShowMonitoringDialog(false)}
                  disabled={isStartingMonitoring}
                >
                  Batal
                </CollectionDialogCancel>
                <AccentButton
                  type="button"
                  icon={
                    isStartingMonitoring ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCcw className="size-3.5" strokeWidth={2} />
                    )
                  }
                  onClick={handleStartMonitoring}
                  disabled={isStartingMonitoring}
                >
                  Mulai Pemantauan
                </AccentButton>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hapus Draft Risiko?</DialogTitle>
              <DialogDescription>
                Draft yang dihapus tidak bisa dikembalikan.
              </DialogDescription>
            </DialogHeader>
            <div className="px-1">
              <p className="text-sm font-medium">{title || "Tanpa judul"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
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
                <Trash2 className="size-3.5" /> Hapus draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogContent
            className="max-w-lg no-scrollbar"
            showCloseButton={false}
          >
            <div className="flex min-h-0 flex-col gap-5">
              <DialogHeader>
                <DialogTitle>Arsipkan Risiko?</DialogTitle>
              </DialogHeader>
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                    Risiko
                  </p>
                  <p className="text-sm font-medium">
                    {title || "Tanpa judul"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {riskId || "Belum tersimpan"}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium" htmlFor="new-archive-reason">
                    Alasan utama arsip
                  </Label>
                  <Input
                    id="new-archive-reason"
                    value={archiveReasonInput}
                    onChange={(event) =>
                      setArchiveReasonInput(event.target.value)
                    }
                    placeholder="Contoh: Risiko sudah tidak relevan"
                    className="text-base sm:text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium" htmlFor="new-archive-note">
                    Catatan tambahan (opsional)
                  </Label>
                  <Textarea
                    id="new-archive-note"
                    value={archiveNoteInput}
                    onChange={(event) => setArchiveNoteInput(event.target.value)}
                    placeholder="Tambahkan konteks jika diperlukan"
                    className="min-h-[80px] text-base sm:text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <CollectionDialogCancel
                  onClick={() => setShowArchiveDialog(false)}
                >
                  Batal
                </CollectionDialogCancel>
                <AccentButton
                  onClick={handleArchiveCurrentRisk}
                  disabled={isSubmitting}
                >
                  Arsipkan
                </AccentButton>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={showRestoreDialog}
          onOpenChange={setShowRestoreDialog}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Pulihkan Risiko?</AlertDialogTitle>
              <AlertDialogDescription>
                Risiko akan kembali tampil di daftar aktif dengan status
                terakhir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <CollectionDialogCancel
                onClick={() => setShowRestoreDialog(false)}
                disabled={isSubmitting}
              >
                Batal
              </CollectionDialogCancel>
              <AlertDialogAction
                variant="primary"
                size="primary"
                onClick={handleRestoreCurrentRisk}
                disabled={isSubmitting}
              >
                Pulihkan risiko
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={showSubmitReviewConfirm}
          onOpenChange={setShowSubmitReviewConfirm}
        >
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Finalisasi Risiko?"
                  : "Ajukan Risiko untuk Review?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Risiko yang sudah difinalisasi tidak dapat diubah kembali sampai periode monitoring selanjutnya."
                  : "Risiko akan disimpan lalu dikirim ke reviewer melalui alur persetujuan yang dipilih. Tinjau seluruh bagian sebelum melanjutkan."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <CollectionDialogCancel
                onClick={() => setShowSubmitReviewConfirm(false)}
                disabled={isSubmitting}
              >
                Batal
              </CollectionDialogCancel>
              <AlertDialogAction
                variant="primary"
                size="primary"
                onClick={handleConfirmSubmitReview}
                disabled={isSubmitting}
              >
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Finalisasi"
                  : "Ajukan untuk review"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <RiskScoreHeatmapModal
          open={scorePickerMode !== null}
          onOpenChange={(open) => {
            if (!open) setScorePickerMode(null);
          }}
          title={
            scorePickerMode === "target"
              ? "Pilih skor target"
              : "Pilih skor risiko"
          }
          description="Pilih kombinasi probabilitas dan dampak untuk melihat skor serta level risikonya."
          probability={
            scorePickerMode === "target" ? targetProbability : probability
          }
          impact={scorePickerMode === "target" ? targetImpact : impact}
          onApply={({ probability: selectedProbability, impact: selectedImpact }) => {
            if (scorePickerMode === "target") {
              setValue("targetProbability", selectedProbability, {
                shouldValidate: true,
                shouldDirty: true,
              });
              setValue("targetImpact", selectedImpact, {
                shouldValidate: true,
                shouldDirty: true,
              });
              return;
            }

            setValue("probability", selectedProbability, {
              shouldValidate: true,
              shouldDirty: true,
            });
            setValue("impact", selectedImpact, {
              shouldValidate: true,
              shouldDirty: true,
            });
          }}
        />

        <AiSuggestionModal
          open={showRiskSuggestions}
          onOpenChange={setShowRiskSuggestions}
          title="Rekomendasi Judul Risiko"
          description="Pilih satu saran yang paling sesuai untuk mengisi judul dan deskripsi risiko."
          suggestions={riskSuggestions.map((suggestion, index) => {
            const resolvedCategory = resolveSuggestionCategory(suggestion);
            return {
              id: `risk-suggestion-${index}`,
              text: suggestion.title,
              description: suggestion.description,
              meta: resolvedCategory
                ? `Kategori: ${riskCategoryLabels[resolvedCategory]}`
                : undefined,
            };
          })}
          selectionMode="single"
          variant="clean-list"
          isLoading={generatingRisk}
          onApply={handleApplyRiskSuggestion}
        />

        <AiSuggestionModal
          open={causeModalOpen}
          onOpenChange={setCauseModalOpen}
          title="Saran Penyebab Risiko"
          suggestions={causeSuggestions}
          isLoading={generatingCause}
          variant="structured-list"
          onApply={(selectedItems) => {
            const newItems = selectedItems.map((item, idx) => ({
              id: `cause-applied-${Date.now()}-${idx}`,
              text: item.value ?? item.text,
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
          suggestions={impactSuggestions}
          isLoading={generatingImpact}
          variant="structured-list"
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
      </FormPage>
    </TooltipProvider>
  );
}

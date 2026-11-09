"use client";

import { businessNow } from "@/lib/business-clock";
import { RiskVersionHistoryList } from "@/components/shared/design-system/domain/risk-version-history-list";

import { createDisplayDateFormatter, formatDisplayDate } from "@/lib/display-date";
import { PropertyList, PropertyLabel } from "@/components/shared/design-system/layout/property-list";

import { DetailSidePanel } from "@/components/shared/design-system/layout/detail-side-panel";
import { RiskDetailTabs } from "@/components/risk/risk-detail-tabs";
import { RiskMonitoringList } from "@/components/risk/risk-monitoring-list";
import { RiskFinalizationNotice } from "@/components/shared/design-system/domain/risk-finalization-notice";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAIErrorMessage } from "@/lib/ai-error";
import {
  getMitigationActionErrors,
  getRiskMitigationRequirementError,
  requiresRiskMitigationPlan,
} from "@/lib/risk-mitigation-validation";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { archiveRisk, restoreRisk } from "@/lib/api/risk-register";
import {
  listRiskMonitorings,
  startMonitoring,
} from "@/lib/api/risk-monitoring";
import { listRiskEvents } from "@/lib/api/risk-events";
import { listUsers, type UserListItem } from "@/lib/api/users";
import { listAllOrganizations } from "@/lib/api/organizations";
import { filterToAccessibleOrgs } from "@/lib/organization";
import { isMonitoringWindowOpen, monitoringWindowMessage } from "@/lib/monitoring-window";
import { useAuth } from "@/contexts/auth-context";
import { canWriteInOrg, isReadOnlyForOrg } from "@/lib/auth-helpers";
import { useForm, Controller, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiAssistIconButton } from "@/components/shared/ai-assist-icon-button";
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
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";
import {
  Loader2,
  Plus,
  RefreshCcw,
  ArrowLeft,
  Save,
  Send,
  Trash2,
} from "@/components/shared/icons";

import {
  getRiskLevelLabel,
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
import { FieldContent, FieldDescription } from "@/components/ui/field";
import { EditableList } from "@/components/shared/editable-list";
import { EditableInsetItems } from "@/components/shared/editable-inset-items";
import { FormPage } from "@/components/shared/form-shell";
import {
  FormContainer,
  FormGroup,
  ActionButton,
  ActionIconButton,
  AccentButton,
  CollectionDialogCancel,
  CollectionPageHeader,
  FieldErrorMessage,
  Input,
  MonitoringCycleSelect,
  PopoverSelectField,
  RiskScoreHeatmapModal,
  RiskScorePickerTrigger,
  Textarea,
} from "@/components/shared/design-system";
import {
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationPlanList } from "@/components/shared/mitigation-plan-list";
import { MitigationPicker } from "@/components/shared/mitigation-picker";
import {
  MitigationProgressTab,
} from "@/components/shared/mitigation-progress-tab";
import type {
  RiskCategory,
  RiskVersionTimelineItem,
} from "@/types/risk";
import type { RiskEvent, RiskEventSeverity } from "@/types/risk-event";
import {
  consumeMeetingIntelligencePrefill,
  MEETING_INTELLIGENCE_PREFILL_PARAM,
  MEETING_INTELLIGENCE_PREFILL_KEY,
  type RiskDraftPrefill,
} from "@/lib/meeting-intelligence";
import {
  consumeDocumentIntelligencePrefill,
  DOCUMENT_INTELLIGENCE_PREFILL_PARAM,
} from "@/lib/document-intelligence-prefill";
import { markProcessingFindingHandled } from "@/lib/document-processing/storage";
import { RiskEventFormDialog } from "@/app/(app)/risk-events/_components/risk-event-form-sheet";
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
  getDefaultMonitoringCycle,
  getSelectableMonitoringCycles,
  getSelectableMonitoringCyclesForDate,
  isMonitoringCycleApplicable,
} from "@/lib/risk-cycle-options";
import { getMonitoringCycleBadgeStatus } from "@/lib/risk-register-monitoring";
import { RiskCreationContext, RiskFormReadiness, RiskFinalizationReview } from "@/components/shared/design-system/domain/risk-creation-guidance";
import { hasRiskScore, riskFinalizationCycle, riskPeriodLabel } from "@/lib/risk-creation";
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
        <CardContent className="flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Memuat catatan...
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
      return "Draf";
    case "assessment_draft":
      return "Draft pemantauan";
    case "assessment_in_review":
    case "pending_review":
      return "Dalam review";
    case "approved":
      return "Disetujui";
    case "final":
    case "finalized":
      return "Final";
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
    case "finalized":
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
  checks: boolean[];
  hint: string;
};

const SIDE_PANEL_PREVIEW_LIMIT = 5;
const SIDE_PANEL_EVENT_PREVIEW_LIMIT = 3;
const riskEventSeverityLabels: Record<RiskEventSeverity, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  extreme: "Ekstrem",
};
const riskEventSeverityTones: Record<
  RiskEventSeverity,
  "success" | "warning" | "danger"
> = {
  low: "success",
  medium: "warning",
  high: "danger",
  extreme: "danger",
};
const riskEventDateFormatter = createDisplayDateFormatter("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Match the loading-label transition in globals.css. Network work runs concurrently.
function waitForAiButtonTransition() {
  return new Promise<void>((resolve) => {
    window.setTimeout(
      resolve,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 540,
    );
  });
}

function FormErrorMessage({
  error,
  className,
}: {
  error?: string | { message?: string };
  className?: string;
}) {
  const message = typeof error === "string" ? error : error?.message;

  return (
    <FieldErrorMessage className={cn("mt-1", className)}>
      {message}
    </FieldErrorMessage>
  );
}

function getScoreError(probabilityError?: string, impactError?: string) {
  if (probabilityError && impactError) {
    return "Pilih probabilitas dan dampak pada heatmap.";
  }
  return probabilityError ?? impactError;
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
  return <AiAssistIconButton label={label} loading={loading} disabled={disabled} onClick={onClick} />;
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
    probability: z.number().min(1, "Tetapkan probabilitas risiko").max(5),
    impact: z.number().min(1, "Tetapkan dampak risiko").max(5),
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

    targetProbability: z.number().min(1, "Tetapkan target probabilitas").max(5),
    targetImpact: z.number().min(1, "Tetapkan target dampak").max(5),
    targetWeight: z.number().min(0.1).default(1.0),
    targetNilai: z.number().min(0).default(0),
    roId: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const mitigationRequirementError = getRiskMitigationRequirementError(
      Math.round(
        calculateNilai(
          values.probability,
          values.impact,
          getBobot(values.probability, values.impact),
        ),
      ),
      values.treatmentOption,
      values.mitigations,
    );
    if (mitigationRequirementError) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mitigations"],
        message: mitigationRequirementError,
      });
    }
    values.mitigations.forEach((mitigation, index) => {
      const hasContent =
        [
          mitigation.owner,
			mitigation.treatmentOwnerId,
          mitigation.externalPicId,
        ].some((value) => Boolean(String(value ?? "").trim()));

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
    probability: values.probability ?? 0,
    impact: values.impact ?? 0,
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
    })),
    targetProbability: values.targetProbability ?? 0,
    targetImpact: values.targetImpact ?? 0,
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
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo?.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/risk/register";
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
  const [activeDetailTab, setActiveDetailTab] = useState(() => searchParams.get("tab") === "monitoring" ? "monitoring" : "overview");
  const [detailMitigationFilter,setDetailMitigationFilter] = useState("all");
  const treatmentPanelRef = useRef<HTMLDivElement>(null);
  const [loadingVersionId, setLoadingVersionId] = useState<string | null>(null);
  const [riskVersionNumber, setRiskVersionNumber] = useState<number | null>(
    null,
  );
  const [riskStatus, setRiskStatus] = useState<string>("draft");
  const [riskIsCurrent, setRiskIsCurrent] = useState(false);
  const [riskArchivedAt, setRiskArchivedAt] = useState<string | null>(null);
  const [riskArchivedReason, setRiskArchivedReason] = useState("");
  const [documentFindingId, setDocumentFindingId] = useState<string | null>(null);
  const documentFindingHandledRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const leaveAfterSaveRef = useRef(false);
  const allowNavigationRef = useRef(false);
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
  const [riskVersionGroupId, setRiskVersionGroupId] = useState<string | undefined>();
  const [showMonitoringDialog, setShowMonitoringDialog] = useState(false);
  const [riskEventDrawerOpen, setRiskEventDrawerOpen] = useState(false);
  const [selectedMonitoringCycle, setSelectedMonitoringCycle] = useState(
    () => getDefaultMonitoringCycle(),
  );
  const [monitoringCycleStatuses, setMonitoringCycleStatuses] = useState<
    Record<string, string>
  >({});
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
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [loadingRiskEvents, setLoadingRiskEvents] = useState(false);
  const [riskEventsError, setRiskEventsError] = useState("");
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showVersionHistoryDialog, setShowVersionHistoryDialog] =
    useState(false);
  const riskLoadRequestRef = useRef(0);
  const riskEventsRequestRef = useRef(0);
  const finalizeValidationAttemptedRef = useRef(false);
  const draftValidationAttemptedRef = useRef(false);
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
      probability: 0,
      impact: 0,
      weight: 1.0,
      riskPriority: 0,
      riskAppetite: "dalam_batas",
      treatmentOption: undefined,
      nextReviewDate: "",
      mitigations: [],
      targetProbability: 0,
      targetImpact: 0,
      targetWeight: 1.0,
    },
  });

  const {
    watch,
    control,
    formState: { errors, isDirty },
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
  const probability = watch("probability") ?? 0;
  const impact = watch("impact") ?? 0;
  const mitigations = watch("mitigations") ?? [];
  const mitigationActionErrors = useMemo(
    () => getMitigationActionErrors(errors.mitigations),
    [errors.mitigations],
  );
  const targetProbability = watch("targetProbability") ?? 0;
  const targetImpact = watch("targetImpact") ?? 0;
  const existingControl = watch("existingControl") ?? "";
  const controlEffectiveness = watch("controlEffectiveness") ?? "";
  const treatmentOption = watch("treatmentOption") ?? "";
  const nextReviewDate = watch("nextReviewDate") ?? "";
  const riskCode = watch("riskCode") ?? "";
  const hasUnsavedWork = isDirty || (!riskId && Boolean(title.trim() || description.trim() || causes.length || impacts.length));
  const [monitoringNow,setMonitoringNow]=useState(()=>businessNow());
  const isInitialProfile = !riskVersionGroupId || (riskVersionNumber ?? 1) <= 1;
  const finalizationCycle = riskFinalizationCycle(assessmentCycleDisplay, isInitialProfile, monitoringNow);
  useEffect(()=>{const refresh=()=>setMonitoringNow(businessNow());const timer=setInterval(refresh,60000);window.addEventListener("focus",refresh);return()=>{clearInterval(timer);window.removeEventListener("focus",refresh);};},[]);
  const monitoringCycleOptions = useMemo(
    () =>
      getSelectableMonitoringCyclesForDate(monitoringNow).map((cycle) => ({
        ...cycle,
        status: getMonitoringCycleBadgeStatus(
          monitoringCycleStatuses[cycle.value],
          cycle.value === currentMonitoringCycle(),
          isMonitoringCycleApplicable(cycle.value, assessmentCycleDisplay),
        ),
      })),
    [monitoringCycleStatuses,monitoringNow,assessmentCycleDisplay],
  );
  const selectedMonitoringCycleOption = monitoringCycleOptions.find(
    (cycle) => cycle.value === selectedMonitoringCycle,
  );
  const selectedApprovalLine = approvalLine.filter((member) => member.id);
  const isApprovalLineReady =
    selectedApprovalLine.length > 0 &&
    approvalLine.every((member) => member.id);
  const submitActionLabel =
    riskApprovalCapabilityBehavior.usesDirectApprovalCopy
      ? "Finalisasi"
      : "Ajukan untuk review";
  const isDraftSubmitting =
    isSubmitting && submitTarget.current === "draft";
  const isReviewSubmitting =
    isSubmitting && submitTarget.current === "review";

  // KMK Risk Appetite Advisory
  const advisoryWeight = getBobot(probability, impact);
  const advisoryNilai = calculateNilai(probability, impact, advisoryWeight);
  const advisoryInherentScore = Math.round(advisoryNilai);
  const advisoryAppetite = resolveRiskAppetite(advisoryInherentScore);

  // Auto-set selera risiko & pilihan penanganan berdasarkan KMK
  useEffect(() => {
    if (!hasRiskScore(probability, impact)) return;
    setValue("riskAppetite", advisoryAppetite);
    // Auto-set pilihan penanganan: Dalam batas → terima, Di atas batas → mitigasi
    if (advisoryAppetite === "dalam_batas") {
      setValue("treatmentOption", "accept");
    } else if (advisoryAppetite === "di_atas_batas") {
      setValue("treatmentOption", "mitigate");
    }
  }, [advisoryAppetite, probability, impact, setValue]);

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

  const loadLinkedRiskEvents = useCallback(
    async (id: string) => {
      const requestId = ++riskEventsRequestRef.current;

      if (!token) {
        setRiskEvents([]);
        setRiskEventsError("");
        setLoadingRiskEvents(false);
        return;
      }

      setLoadingRiskEvents(true);
      setRiskEventsError("");
      try {
        const events = await listRiskEvents(token, id);
        if (requestId !== riskEventsRequestRef.current) return;
        setRiskEvents(events);
      } catch (error) {
        if (requestId !== riskEventsRequestRef.current) return;
        console.error("Failed to load linked risk events:", error);
        setRiskEvents([]);
        setRiskEventsError("Kejadian terkait tidak dapat dimuat.");
      } finally {
        if (requestId === riskEventsRequestRef.current) {
          setLoadingRiskEvents(false);
        }
      }
    },
    [token],
  );

  const loadRiskData = useCallback(
    async (id: string) => {
      const loadRequestId = ++riskLoadRequestRef.current;

      try {
        setOngoingMonitoring(null);
        setMonitoringCycleStatuses({});
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
        setRiskVersionGroupId(risk.versionGroupId);
        setRiskArchivedAt(risk.archivedAt || null);
        setRiskArchivedReason(risk.archivedReason || "");
        void loadLinkedRiskEvents(risk.id);
        setOngoingAssessmentId(
          risk.hasOngoing && risk.draftId ? risk.draftId : null,
        );

        if (risk.status === "final" && risk.isCurrent && !risk.archivedAt) {
          void listRiskMonitorings(token ?? "", {
            q: risk.code || undefined,
            lifecycle: "all",
            limit: 100,
          })
            .then((monitoringResult) => {
              if (loadRequestId !== riskLoadRequestRef.current) return;

              const matchingMonitorings = monitoringResult.data.filter(
                (monitoring) =>
                  (monitoring.status === "draft" ||
                    monitoring.status === "final") &&
                  (monitoring.sourceRiskId === risk.id ||
                    (risk.versionGroupId &&
                      monitoring.sourceRisk?.versionGroupId ===
                        risk.versionGroupId)),
              );
              const statusesByCycle: Record<string, string> = {};
              for (const monitoring of matchingMonitorings) {
                statusesByCycle[monitoring.assessmentCycle] = monitoring.status;
              }
              setMonitoringCycleStatuses(statusesByCycle);

              const existingMonitoring = matchingMonitorings.find(
                (monitoring) => monitoring.status === "draft",
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
              setMonitoringCycleStatuses({});
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
          probability: risk.probability ?? 0,
          impact: risk.impact ?? 0,
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
              }))
            : [],
          targetProbability: risk.targetProbability ?? 0,
          targetImpact: risk.targetImpact ?? 0,
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
          riskEventsRequestRef.current += 1;
          setRiskEvents([]);
          setRiskEventsError("");
          setLoadingRiskEvents(false);
          reset();
          toast.error("Risiko tidak ditemukan. Form baru dibuka.");
          return;
        }
        console.error("Failed to load risk data:", error);
        toast.error("Gagal memuat data risiko. Silakan coba lagi.");
      }
    },
    [loadLinkedRiskEvents, reset, token],
  );

  const reloadRiskData = useCallback(
    async (id: string) => {
      setIsSubmitting(true);
      try {
        await loadRiskData(id);
      } finally {
        setIsSubmitting(false);
      }
    },
    [loadRiskData],
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
        if (documentPrefill?.kind === "risk" && !existingRiskId) {
          try {
            setDocumentFindingId(documentPrefill.findingId ?? null);
            documentFindingHandledRef.current = false;
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
              probability: documentPrefill.probability ?? 0,
              impact: documentPrefill.impact ?? 0,
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

                    },
                  ]
                : [],
              targetProbability: 0,
              targetImpact: 0,
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
          probability: meetingPrefill.probability ?? 0,
          impact: meetingPrefill.impact ?? 0,
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

                },
              ]
            : [],
          targetProbability: 0,
          targetImpact: 0,
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
    void reloadRiskData(selectedRiskId).finally(() => {
      if (!active) return;

      setLoadingVersionId((current) =>
        current === selectedRiskId ? null : current,
      );
    });

    return () => {
      active = false;
    };
  }, [reloadRiskData, selectedRiskId, token]);

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
  const mitigationPlanRequired = requiresRiskMitigationPlan(
    advisoryInherentScore,
    treatmentOption,
  );
  const mitigationRequirementError = getRiskMitigationRequirementError(
    advisoryInherentScore,
    treatmentOption,
    mitigations,
  );

  const sectionStatuses: SectionStatus[] = [
    {
      id: "identifikasi",
      step: "1",
      title: "Identifikasi Risiko",
      description:
        "Tentukan konteks risiko, penyebab utama, dan dampak yang paling relevan.",
      checks: [
        title.trim().length >= 3,
        description.trim().length >= 10,
        isRiskCategory(category),
        causes.length > 0 && causes.every(cause => Boolean(cause.text.trim())),
        impacts.length > 0 && impacts.every(item => Boolean(item.text.trim())),
      ],
      hint: "Lengkapi judul, deskripsi, sebab, dan dampak.",
    },
    {
      id: "analisis",
      step: "2",
      title: "Analisis Risiko",
      description:
        "Nilai pengendalian yang sudah ada lalu tetapkan skor probabilitas dan dampak.",
      checks: [
        existingControl.trim().length > 0,
        Boolean(controlEffectiveness),
        hasRiskScore(probability, impact),
      ],
      hint: "Isi pengendalian, efektivitas, dan skor risiko saat ini.",
    },
    {
      id: "evaluasi",
      step: "3",
      title: "Evaluasi Risiko",
      description:
        "Tinjau prioritas dan pilih cara menangani risiko sebelum finalisasi.",
      checks: [Boolean(treatmentOption)],
      hint: "Pilih strategi penanganan risiko.",
    },
    {
      id: "penanganan",
      step: "4",
      title: "Rencana Penanganan",
      description:
        mitigationPlanRequired
          ? "Risiko ini termasuk risiko utama dan Anda memilih Mitigasi. Tambahkan minimal satu rencana penanganan baru sebelum finalisasi. Draf tetap dapat disimpan."
          : "Tentukan tindakan baru, misalnya membuat notifikasi stok minimum, beserta PIC dan tenggatnya. Opsional sesuai pilihan penanganan.",
      checks: mitigationPlanRequired ? [!mitigationRequirementError] : [],
      hint: mitigationRequirementError ?? "Tambahkan aksi mitigasi jika diperlukan.",
    },
    {
      id: "target",
      step: "5",
      title: "Target Penurunan",
      description:
        "Tetapkan kondisi risiko yang ingin dicapai setelah penanganan dilaksanakan.",
      checks: [hasRiskScore(targetProbability, targetImpact)],
      hint: "Tetapkan target probabilitas dan dampak residual.",
    },
  ];

  const readinessValidation = formSchema.safeParse(form.getValues());
  const readinessSections = sectionStatuses.map(section => {
    const inputsComplete = section.checks.every(Boolean);
    const hasValidationError = !readinessValidation.success && readinessValidation.error.issues.some(
      issue => getSectionIdFromField(String(issue.path[0])) === section.id,
    );

    const done = inputsComplete && !hasValidationError;
    const checks = inputsComplete && hasValidationError ? [...section.checks, false] : section.checks;

    return {
      ...section,
      done,
      progress: done ? 100 : Math.round((checks.filter(Boolean).length / checks.length) * 100),
    };
  });
  const missingSections = readinessSections.filter(section => !section.done);
  const lockedControlClass =
    "disabled:pointer-events-none disabled:cursor-not-allowed disabled:!bg-disabled-input-surface disabled:!text-disabled-foreground disabled:!opacity-100";
  const isRiskLocked =
    riskStatus === "final" ||
    !!riskArchivedAt;
  useEffect(() => {
    if (isRiskLocked || !hasUnsavedWork) return;
    allowNavigationRef.current = false;
    const currentHref = window.location.href;
    const currentHistoryState = window.history.state;
    const unload = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = (event: MouseEvent) => {
      if (allowNavigationRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      if (!isSubmitting) setLeaveHref(destination.href);
    };
    const traverse = (event: PopStateEvent) => {
      if (allowNavigationRef.current || window.location.href === currentHref) return;
      const destination = window.location.href;
      // Restore this form before Next handles traversal, then use the same
      // save/discard decision as a normal link. Preserve Next's history state.
      event.stopImmediatePropagation();
      window.history.pushState(currentHistoryState, "", currentHref);
      if (!isSubmitting) setLeaveHref(destination);
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("popstate", traverse, true);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("popstate", traverse, true);
      document.removeEventListener("click", leave, true);
    };
  }, [hasUnsavedWork, isRiskLocked, isSubmitting, riskId]);
  const canCreateRiskEvent = Boolean(riskId) && riskStatus === "final";
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
    isMonitoringWindowOpen(getDefaultMonitoringCycle(),monitoringNow) &&
    isMonitoringCycleApplicable(getDefaultMonitoringCycle(),assessmentCycleDisplay) &&
    (!ongoingMonitoring || ongoingMonitoring.assessmentCycle!==getDefaultMonitoringCycle());

  const scrollToSection = (sectionId: SectionId) => {
    setActiveDetailTab("overview");
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

  function getSectionIdFromField(fieldName?: string): SectionId | undefined {
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
  }

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
      { field: "probability", message: "Tetapkan probabilitas risiko sebelum finalisasi" },
      { field: "impact", message: "Tetapkan dampak risiko sebelum finalisasi" },
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
    "mitigations",
    "probability",
    "impact",
  ];

  const applyFinalizeValidationErrors = (values: FormInput) => {
    const schemaFields = new Set<keyof FormInput>(finalizeSchemaFields);
    const schemaResult = formSchema.safeParse(values);
    let firstInvalidSection: SectionId | undefined;
    const schemaErrors = new Map<keyof FormInput, string>();

    if (!schemaResult.success) {
      schemaResult.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (typeof field !== "string") {
          return;
        }

        if (!schemaFields.has(field as keyof FormInput)) {
          return;
        }

        const typedField = field as keyof FormInput;
        if (!schemaErrors.has(typedField)) {
          schemaErrors.set(typedField, issue.message);
        }

        if (!firstInvalidSection) {
          firstInvalidSection = getSectionIdFromField(field);
        }
      });
    }

    schemaFields.forEach((field) => {
      const message = schemaErrors.get(field);
      const currentMessage = form.getFieldState(field).error?.message;

      if (message && message !== currentMessage) {
        setError(field, { type: "manual", message });
      } else if (!message && currentMessage) {
        clearErrors(field);
      }
    });

    const missingFinalizeFields = missingSections.flatMap(
      (section) => finalizeRequiredFieldMessages[section.id] ?? [],
    );
    const customFinalizeFields: Array<{
      field: keyof FormInput;
      valid: boolean;
    }> = [
      { field: "existingControl", valid: Boolean(values.existingControl?.trim()) },
      { field: "controlEffectiveness", valid: Boolean(values.controlEffectiveness) },
      { field: "treatmentOption", valid: Boolean(values.treatmentOption) },
      {
        field: "targetProbability",
        valid:
          Number(values.targetProbability) >= 1 &&
          Number(values.targetProbability) <= 5,
      },
      {
        field: "targetImpact",
        valid: Number(values.targetImpact) >= 1 && Number(values.targetImpact) <= 5,
      },
    ];

    customFinalizeFields.forEach(({ field, valid }) => {
      const currentMessage = form.getFieldState(field).error?.message;

      if (valid) {
        if (currentMessage) clearErrors(field);
        return;
      }

      const message = missingFinalizeFields.find(
        (item) => item.field === field,
      )?.message;
      if (message && message !== currentMessage) {
        setError(field, { type: "manual", message });
      }
      if (!firstInvalidSection) {
        firstInvalidSection = getSectionIdFromField(field);
      }
    });

    return {
      hasErrors:
        !schemaResult.success || customFinalizeFields.some(({ valid }) => !valid),
      firstInvalidSection,
    };
  };

  useEffect(() => {
    if (finalizeValidationAttemptedRef.current) {
      applyFinalizeValidationErrors(form.getValues());
    } else if (draftValidationAttemptedRef.current) {
      const draftFields: Array<keyof FormInput> = [
        "title",
        "description",
        "category",
        "organizationId",
      ];
      const draftResult = draftSchema.safeParse(form.getValues());
      const draftErrors = new Map<keyof FormInput, string>();

      if (!draftResult.success) {
        draftResult.error.issues.forEach((issue) => {
          const field = issue.path[0];
          if (
            typeof field === "string" &&
            draftFields.includes(field as keyof FormInput) &&
            !draftErrors.has(field as keyof FormInput)
          ) {
            draftErrors.set(field as keyof FormInput, issue.message);
          }
        });
      }

      draftFields.forEach((field) => {
        const message = draftErrors.get(field);
        const currentMessage = form.getFieldState(field).error?.message;

        if (message && message !== currentMessage) {
          setError(field, { type: "manual", message });
        } else if (!message && currentMessage) {
          clearErrors(field);
        }
      });
    }
    // Recheck manual validation errors only when a value changes after validation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    description,
    category,
    causes,
    impacts,
    existingControl,
    controlEffectiveness,
    treatmentOption,
    targetProbability,
    targetImpact,
    probability,
    impact,
    mitigations,
    currentOrganizationId,
  ]);

  const buildPayload = (data: FormValues, status: string) =>
    buildRiskRegisterPayload(data, status, {
      assessmentCycle: status === "final" ? riskFinalizationCycle(assessmentCycleDisplay, isInitialProfile, businessNow()) : assessmentCycleDisplay,
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
    setSaveState("saving");
    const submittedValues = form.getValues();
    try {
      const isDraft = submitTarget.current === "draft";
      const submissionStatus =
        isDraft || riskApprovalCapabilityBehavior.submitsForApproval
          ? "draft"
          : "final";
      if (!isDraft && isInitialProfile && currentAssessmentCycle() !== currentAssessmentCycle(monitoringNow)) {
        setMonitoringNow(businessNow());
        setShowSubmitReviewConfirm(true);
        setSaveState("idle");
        toast.info("Triwulan telah berganti. Tinjau kembali periode finalisasi.");
        return;
      }
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
        if (documentFindingId && !documentFindingHandledRef.current) {
          markProcessingFindingHandled("sop_risk_universe", documentFindingId);
          documentFindingHandledRef.current = true;
        }
      }

      if (isDraft) {
        // Advance the saved baseline without discarding edits typed while saving.
        const savedValues = { ...submittedValues, riskCode: form.getValues("riskCode") };
        const editedWhileSaving = JSON.stringify(form.getValues()) !== JSON.stringify(savedValues);
        reset(savedValues, { keepValues: true });
        setValue("title", form.getValues("title"), { shouldDirty: true });
        setSavedAt(new Date());
        setSaveState("saved");
        toast.success("Draf berhasil disimpan.");
        if (leaveAfterSaveRef.current && leaveHref && !editedWhileSaving) {
          allowNavigationRef.current = true;
          router.push(leaveHref);
          return;
        }
        if (!riskId && currentRiskId) {
          const nextParams = new URLSearchParams({ id: currentRiskId });
          if (returnTo !== "/risk/register") nextParams.set("returnTo", returnTo);
          window.history.replaceState(
            null,
            "",
            `/risk/register/new?${nextParams.toString()}`,
          );
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
          allowNavigationRef.current = true;
          await loadRiskData(currentRiskId);
          toast.success("Risiko berhasil disimpan dan difinalisasi!");
          router.push(`/risk/register/new?id=${currentRiskId}&saved=final&returnTo=${encodeURIComponent(returnTo)}`);
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
          router.push(returnTo);
        } catch {
          toast.error(
            "Risiko tersimpan, tetapi pengajuan review gagal. Periksa koneksi dan coba lagi.",
          );
          router.push(returnTo);
        }
      }
    } catch (err: unknown) {
      if (!(err instanceof ApiError && err.status >= 400 && err.status < 500)) {
        console.error("Gagal menyimpan risiko", err);
      }
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "Gagal menyimpan risiko. Periksa koneksi dan coba lagi.";
      setSaveState("error");
      toast.error(errorMessage);
    } finally {
      leaveAfterSaveRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    submitTarget.current = "draft";
    finalizeValidationAttemptedRef.current = false;
    draftValidationAttemptedRef.current = false;
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
      draftValidationAttemptedRef.current = true;
      setLeaveHref(null);
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
      router.push(returnTo);
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
  };

  const openSubmitReviewConfirm = () => {
    if (isSubmitting) return;

    submitTarget.current = "review";
    finalizeValidationAttemptedRef.current = false;
    draftValidationAttemptedRef.current = false;
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

    finalizeValidationAttemptedRef.current = true;
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
      toast.error(getAIErrorMessage(err, "Saran risiko belum berhasil dimuat. Coba lagi."));
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
      toast.error(getAIErrorMessage(err, "Saran penyebab belum berhasil dimuat. Coba lagi."));
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
      toast.error(getAIErrorMessage(err, "Saran dampak belum berhasil dimuat. Coba lagi."));
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

    const currentCycle = currentMonitoringCycle();
    const previousCycle = getSelectableMonitoringCycles(currentCycle)[0]?.value;
    setSelectedMonitoringCycle(
      getDefaultMonitoringCycle(
        currentCycle,
        previousCycle ? monitoringCycleStatuses[previousCycle] : null,
        assessmentCycleDisplay,
      ),
    );
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
  const visibleRiskEvents = useMemo(
    () =>
      [...riskEvents]
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() -
            new Date(left.occurredAt).getTime(),
        )
        .slice(0, SIDE_PANEL_EVENT_PREVIEW_LIMIT),
    [riskEvents],
  );
  const loadingVersion = riskVersions.find(
    (version) => version.id === loadingVersionId,
  );
  const handleRetryRiskEvents = useCallback(() => {
    if (riskId) void loadLinkedRiskEvents(riskId);
  }, [loadLinkedRiskEvents, riskId]);
  const handleCreateRiskEvent = useCallback(() => {
    if (canCreateRiskEvent) setRiskEventDrawerOpen(true);
  }, [canCreateRiskEvent]);
  const handleRiskEventCreated = useCallback(() => {
    if (riskId) void loadLinkedRiskEvents(riskId);
  }, [loadLinkedRiskEvents, riskId]);

  const isSavedRiskView = Boolean(riskId || selectedRiskId);
  const hasContextReturnLink = returnTo !== "/risk/register";
  const showSaveActions = riskStatus === "draft" || !riskId;
  const monitoringHeaderAction = canContinueMonitoring && ongoingMonitoring && !canStartMonitoring ? (
      <ActionButton asChild variant="outline" className="px-4">
        <Link
          href={`/risk/monitoring/${ongoingMonitoring.id}`}
          title={monitoringWindowMessage(ongoingMonitoring.assessmentCycle)}
        >
          {isMonitoringWindowOpen(ongoingMonitoring.assessmentCycle,monitoringNow)?"Lanjutkan Pemantauan":"Lihat Pemantauan"}
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
    ) : null;
  const hasHeaderActions = showSaveActions || Boolean(monitoringHeaderAction) || (!isSavedRiskView && hasContextReturnLink);
  let saveMessage = riskId
    ? "Draf tersimpan. Anda dapat melanjutkan pengisian."
    : "";
  if (savedAt) saveMessage = `Tersimpan pukul ${formatDisplayDate(savedAt, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB`;
  if (hasUnsavedWork) saveMessage = "";
  if (saveState === "error") saveMessage = "Gagal menyimpan. Isian tetap tersedia, pilih Simpan draf untuk mencoba lagi.";
  if (saveState === "saving") saveMessage = "Menyimpan…";

  return (
    <TooltipProvider>
      <FormPage className="risk-form-filter-controls space-y-6">
        <CollectionPageHeader
          eyebrow={isSavedRiskView && hasContextReturnLink ? (
            <Link href={returnTo} className="inline-flex min-h-8 items-center gap-2 rounded-sm text-sm text-muted-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <ArrowLeft aria-hidden="true" className="size-4" />
              {returnTo === "/work" ? "Kembali ke pekerjaan" : "Kembali ke hasil ekstraksi"}
            </Link>
          ) : undefined}
          title="Tambah Risiko"
          showTitle={!isSavedRiskView}
          actionsPlacement="title"
          actions={hasHeaderActions ? (
            <>
              {!isSavedRiskView && hasContextReturnLink ? (
                <ActionButton asChild variant="outline">
                  <Link href={returnTo}>{returnTo === "/work" ? "Kembali ke pekerjaan" : "Kembali ke hasil ekstraksi"}</Link>
                </ActionButton>
              ) : null}
              {monitoringHeaderAction}
              {showSaveActions ? (
                <>
                  <ActionButton
                    variant="outline"
                    loading={isDraftSubmitting}
                    icon={<Save className="size-3.5" />}
                    onClick={() => handleSaveDraftHeaderRef.current()}
                    disabled={isSubmitting}
                  >
                    Simpan draf
                  </ActionButton>
                  <AccentButton
                    icon={
                      isSubmitting && submitTarget.current === "review" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )
                    }
                    onClick={() => openSubmitReviewConfirmHeaderRef.current()}
                    aria-disabled={isSubmitting || undefined}
                    disabled={isReviewSubmitting}
                    className={
                      isDraftSubmitting ? "pointer-events-none" : undefined
                    }
                  >
                    {submitActionLabel}
                  </AccentButton>
                </>
              ) : null}
            </>
          ) : undefined}
        />

        {!isRiskLocked ? (
          <RiskCreationContext
            cycle={finalizationCycle}
            originalCycle={assessmentCycleDisplay}
            saveMessage={saveMessage}
          />
        ) : null}
        {searchParams.get("saved") === "final" && riskStatus === "final" && riskId && token ? <RiskFinalizationNotice riskId={riskId} token={token} cycle={assessmentCycleDisplay} /> : null}

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
          <Card className="">
            <CardContent className="space-y-1">
              <p className="font-semibold">
                Risiko ini diarsipkan pada{" "}
                <span data-date-time="">{formatDisplayDate(new Date(riskArchivedAt), { year: "numeric", month: "2-digit", day: "2-digit" })}</span>.
              </p>
              <p>
                Alasan: {riskArchivedReason || "Tidak ada alasan tercatat."}
              </p>
            </CardContent>
          </Card>
        )}

        <RiskDetailTabs
          enabled={Boolean(riskId)}
          value={activeDetailTab}
          onValueChange={setActiveDetailTab}
          overview={
        <div className={cn(
          "grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start",
          !isRiskLocked && "xl:grid-rows-[auto_1fr]",
        )}>
          {!isRiskLocked ? (
            <div className="min-w-0 xl:col-start-2 xl:row-start-1">
              <RiskFormReadiness
                sections={readinessSections}
                onNavigate={scrollToSection}
              />
            </div>
          ) : null}
          <div className={cn("min-w-0 xl:col-start-1 xl:row-start-1", !isRiskLocked && "xl:row-span-2")}>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="min-w-0 w-full [&_[data-slot=label]]:font-medium"
            >
              <div className="space-y-6">
                <FormContainer
                  id="identifikasi"
                  title="Identifikasi Risiko"
                  description={sectionStatuses[0].description}
                  className="scroll-mt-28"
                >
                  <FormGroup className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <FieldContent className="min-w-0">
                          <Label htmlFor="risk-title" className="text-sm leading-5 font-medium text-foreground">
                            Risiko
                            <span className="text-destructive ml-0.5">*</span>
                          </Label>
                          <FieldDescription id="risk-title-help" className="text-xs leading-5">
                            Tulis singkat kejadian yang mungkin terjadi, misalnya “Distribusi obat terlambat”.
                          </FieldDescription>
                        </FieldContent>
                        {!aiFeaturesDisabled && !isRiskLocked ? (
                          <AiFieldButton
                            loading={generatingRisk}
                            disabled={isRiskLocked}
                            onClick={handleGenerateRisk}
                            label="Bantu rumuskan risiko"
                          />
                        ) : null}
                      </div>
                      <div>
                        <Controller
                          name="title"
                          control={control}
                          render={({ field }) => (
                            <Input
                              id="risk-title"
                              aria-describedby="risk-title-help"
                              {...field}
                              aria-invalid={Boolean(errors.title)}
                              disabled={isRiskLocked}
                              className={cn(
                                "",
                                lockedControlClass,
                              )}
                            />
                          )}
                        />
                        <FormErrorMessage error={errors.title?.message} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <FieldContent>
                        <Label htmlFor="risk-description" className="text-sm leading-5 font-medium text-foreground">
                          Deskripsi Kejadian Risiko
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <FieldDescription id="risk-description-help" className="text-xs leading-5">
                          Jelaskan proses yang terdampak dan kapan atau dalam kondisi apa kejadian bisa terjadi.
                        </FieldDescription>
                      </FieldContent>
                      <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            id="risk-description"
                            aria-describedby="risk-description-help"
                            {...field}
                            aria-invalid={Boolean(errors.description)}
                            disabled={isRiskLocked}
                            className={cn(
                              "",
                              lockedControlClass,
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
                  </FormGroup>
                  <FormGroup className="space-y-5">
                    <div className="space-y-2">
                      <Controller
                        name="causes"
                        control={control}
                        render={({ field }) => (
                          <EditableInsetItems
                            itemLabel="Sebab"
                            aria-describedby="risk-causes-help"
                            items={field.value}
                            invalid={Boolean(errors.causes)}
                            itemErrors={field.value.map((_, index) => errors.causes?.[index]?.text?.message)}
                            onChange={field.onChange}
                            emptyMessage="Belum ada sebab"
                            disabled={isRiskLocked}
                            header={
                              <FieldContent>
                                <Label className="text-sm leading-5 font-medium text-foreground">
                                  Sebab
                                  <span className="text-destructive ml-0.5">*</span>
                                </Label>
                                <FieldDescription id="risk-causes-help" className="text-xs leading-5">
                                  Tambahkan satu penyebab per entri. Fokus pada hal yang dapat memicu kejadian.
                                </FieldDescription>
                              </FieldContent>
                            }
                            beforeAdd={!aiFeaturesDisabled ? (
                              <AiFieldButton
                                loading={generatingCause}
                                disabled={!canUseAiAssist}
                                onClick={handleGenerateCause}
                                label="Susun sebab dengan AI"
                              />
                            ) : null}
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
                        <FieldContent>
                          <Label htmlFor="risk-controllability" className="text-sm leading-5 font-medium text-foreground">
                            Tingkat Kendali
                            <span className="text-destructive ml-0.5">*</span>
                          </Label>
                          <FieldDescription id="risk-controllability-help" className="text-xs leading-5">
                            Pilih Controllable jika unit dapat memengaruhi penyebab risiko. Pilih Uncontrollable jika penyebab berada di luar kendali unit.
                          </FieldDescription>
                        </FieldContent>
                        <Controller
                          name="controllability"
                          control={control}
                          render={({ field }) => (
                            <PopoverSelectField
                              id="risk-controllability"
                              aria-describedby="risk-controllability-help"
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

                    <div className="space-y-2">
                      <Controller
                        name="impacts"
                        control={control}
                        render={({ field }) => (
                          <EditableInsetItems
                            itemLabel="Dampak"
                            aria-describedby="risk-impacts-help"
                            items={field.value}
                            invalid={Boolean(errors.impacts)}
                            itemErrors={field.value.map((_, index) => errors.impacts?.[index]?.text?.message)}
                            onChange={field.onChange}
                            emptyMessage="Belum ada dampak"
                            disabled={isRiskLocked}
                            header={
                              <FieldContent>
                                <Label className="text-sm leading-5 font-medium text-foreground">
                                  Dampak
                                  <span className="text-destructive ml-0.5">*</span>
                                </Label>
                                <FieldDescription id="risk-impacts-help" className="text-xs leading-5">
                                  Tambahkan satu akibat per entri. Sebutkan apa yang terganggu jika kejadian terjadi.
                                </FieldDescription>
                              </FieldContent>
                            }
                            beforeAdd={!aiFeaturesDisabled ? (
                              <AiFieldButton
                                loading={generatingImpact}
                                disabled={!canUseAiAssist}
                                onClick={handleGenerateImpact}
                                label="Susun dampak dengan AI"
                              />
                            ) : null}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.impacts?.message} />
                    </div>
                  </FormGroup>
                </FormContainer>

                <FormContainer
                  id="analisis"
                  title="Analisis Risiko"
                  description={sectionStatuses[1].description}
                  className="scroll-mt-28"
                >
                  <FormGroup className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <FieldContent>
                        <Label htmlFor="risk-existing-control" className="text-sm leading-5 font-medium text-foreground">
                          Pengendalian yang Ada
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <FieldDescription id="risk-existing-control-help" className="text-xs leading-5">
                          Catat langkah yang sudah berjalan, misalnya pemeriksaan stok setiap minggu. Rencana tindakan baru diisi pada Rencana Penanganan.
                        </FieldDescription>
                      </FieldContent>
                      <Controller
                        name="existingControl"
                        control={control}
                        render={({ field }) => (
                          <EditableList
                            id="risk-existing-control"
                            aria-describedby="risk-existing-control-help"
                            invalid={Boolean(errors.existingControl)}
                            value={field.value || ""}
                            onChange={field.onChange}
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
                        <FieldContent>
                          <Label htmlFor="risk-control-effectiveness" className="text-sm leading-5 font-medium text-foreground">
                            Efektivitas Pengendalian
                            <span className="text-destructive ml-0.5">*</span>
                          </Label>
                          <FieldDescription id="risk-control-effectiveness-help" className="text-xs leading-5">
                            Gunakan bukti pelaksanaan untuk menilai apakah pengendalian yang ada membantu menekan risiko.
                          </FieldDescription>
                        </FieldContent>
                        <Controller
                          name="controlEffectiveness"
                          control={control}
                          render={({ field }) => (
                            <PopoverSelectField
                              id="risk-control-effectiveness"
                              aria-describedby="risk-control-effectiveness-help"
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
                  </FormGroup>
                  <FormGroup className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <FieldContent>
                        <Label className="text-sm leading-5 font-medium text-foreground">
                          Skor Risiko
                        </Label>
                        <FieldDescription id="risk-score-help" className="text-xs leading-5">
                          Nilai kondisi risiko dengan mempertimbangkan pengendalian yang sudah berjalan.
                        </FieldDescription>
                      </FieldContent>
                      <RiskScorePickerTrigger
                        title="Skor risiko saat ini"
                        aria-describedby="risk-score-help"
                        presentation="card"
                        invalid={Boolean(errors.probability || errors.impact)}
                        probability={probability}
                        impact={impact}
                        onClick={() => setScorePickerMode("inherent")}
                        disabled={isRiskLocked}
                      />
                      <FormErrorMessage
                        error={getScoreError(errors.probability?.message, errors.impact?.message)}
                      />
                    </div>
                  </FormGroup>
                </FormContainer>

                <FormContainer
                  id="evaluasi"
                  title="Evaluasi Risiko"
                  description={sectionStatuses[2].description}
                  className="scroll-mt-28"
                >
                  <FormGroup className="space-y-5">
                    <div className="grid gap-5 text-sm font-normal text-muted-foreground md:grid-cols-2">
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-foreground">
                          Prioritas Risiko
                        </Label>
                        <Input aria-label="Prioritas Risiko" value={hasRiskScore(probability, impact) ? riskPriority : "Belum dinilai"} readOnly />
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-medium text-foreground">
                          Selera Risiko
                        </Label>
                        <Input aria-label="Selera Risiko" readOnly
                          value={!hasRiskScore(probability, impact) ? "Belum dinilai" : advisoryAppetite === "di_atas_batas"
                              ? "Di atas batas selera risiko"
                              : "Dalam batas selera risiko"} />
                      </div>
                    </div>
                  </FormGroup>
                  <FormGroup className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <FieldContent>
                        <Label htmlFor="risk-treatment-option" className="text-sm leading-5 font-medium text-foreground">
                          Pilihan Penanganan
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <FieldDescription id="risk-treatment-option-help" className="text-xs leading-5">
                          Pilih cara unit merespons risiko. Untuk Mitigasi, uraikan tindakan yang direncanakan di Rencana Penanganan.
                        </FieldDescription>
                      </FieldContent>
                      <Controller
                        name="treatmentOption"
                        control={control}
                        render={({ field }) => (
                          <PopoverSelectField
                            id="risk-treatment-option"
                            aria-describedby="risk-treatment-option-help"
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
                  </FormGroup>
                </FormContainer>

                <FormContainer
                  id="penanganan"
                  title="Rencana Penanganan"
                  description={sectionStatuses[3].description}
                  className="scroll-mt-28"
                >
                  <FormGroup className="space-y-5">
                    <div className="space-y-3">
                      <Controller
                        name="mitigations"
                        control={control}
                        render={({ field }) => (
                          <MitigationPlanList
                            beforeAdd={!aiFeaturesDisabled ? (
                              <MitigationPicker iconOnly
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
                                        owner: user?.name ?? "",
                                        treatmentOwnerId: user?.id,
                                        mitigationType: "reduce_probability",
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
                              }),
                            )}
                            onChange={field.onChange}
                            loadPicOptions={loadPicOptions}
                            emptyStatePresentation="plain"
                            disabled={isRiskLocked}
                            hideAddButton={isRiskLocked}
                            actionErrors={mitigationActionErrors}
                            showPlaceholders={false}
                          />
                        )}
                      />
                      <FormErrorMessage error={errors.mitigations?.message} />
                    </div>
                  </FormGroup>
                  <FormGroup className="space-y-5">
                    <div className="flex flex-col gap-2 pt-1">
                      <Label className="text-sm font-medium text-foreground">
                        Jadwal Pelaksanaan
                      </Label>
                      <Input
                        type="text"
                        value={nextReviewDate}
                        onChange={(event) =>
                          setValue("nextReviewDate", event.target.value, {
                            shouldValidate: true,
                          })
                        }
                        disabled={isRiskLocked}
                        aria-invalid={Boolean(errors.nextReviewDate)}
                        className={cn("", lockedControlClass)}
                      />
                    </div>
                  </FormGroup>
                </FormContainer>

                <FormContainer
                  id="target"
                  title="Target Penurunan"
                  description={sectionStatuses[4].description}
                  className="scroll-mt-28"
                >
                  <FormGroup className="space-y-5">
                    <div className="flex flex-col gap-2">
                      <FieldContent>
                        <Label className="text-sm leading-5 font-medium">
                          Pilih skor target
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <FieldDescription id="risk-target-help" className="text-xs leading-5">
                          Pilih kondisi risiko yang ingin dicapai setelah rencana penanganan dilaksanakan. Tetapkan probabilitas dan dampak yang realistis.
                        </FieldDescription>
                      </FieldContent>
                      <RiskScorePickerTrigger
                        title="Target penurunan"
                        aria-describedby="risk-target-help"
                        presentation="card"
                        invalid={Boolean(errors.targetProbability || errors.targetImpact)}
                        probability={targetProbability}
                        impact={targetImpact}
                        onClick={() => setScorePickerMode("target")}
                        disabled={isRiskLocked}
                      />
                      <FormErrorMessage
                        error={getScoreError(errors.targetProbability?.message, errors.targetImpact?.message)}
                      />
                    </div>
                  </FormGroup>
                </FormContainer>

                {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
                  <FormContainer
                    id="approval-line"
                    title="Alur Persetujuan"
                    description="Susun reviewer dan rantai persetujuan pimpinan"
                    className="scroll-mt-28"
                  >
                    <FormGroup className="space-y-5">
                      <div className="space-y-3">
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
                          emptyMessage="Reviewer tidak ditemukan."
                          value={reviewerOption}
                          onSelect={handleReviewerSelect}
                          loadOptions={loadReviewerOptions}
                          disabled={isRiskLocked}
                          searchPlaceholder=""
                        />
                      </div>
                    </FormGroup>
                    <FormGroup className="space-y-5">
                      <div className="space-y-4">
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
                          pickerSearchPlaceholder=""
                          pickerEmptyMessage="Penyetuju tidak ditemukan."
                          emptyStateMessage="Belum ada penyetuju. Tambahkan minimal satu pengguna sebelum mengajukan persetujuan."
                          addRowLabel="Tambah penyetuju"
                          footerNote="Urutan baris menentukan tahapan persetujuan pimpinan."
                          disabled={isRiskLocked}
                          dndGroup="risk-register-approval-line"
                        />
                      </div>
                    </FormGroup>
                  </FormContainer>
                )}
              </div>
            </form>
          </div>

          <aside className={cn("min-w-0 self-start xl:col-start-2", isRiskLocked ? "xl:row-start-1" : "xl:row-start-2")}>
            <div className="space-y-6 xl:sticky xl:top-6">
              <DetailSidePanel>
                    <section aria-labelledby="risk-side-properties">
                      <h2
                        id="risk-side-properties"
                        className="text-sm font-semibold capitalize text-primary"
                      >
                        Properti
                      </h2>
                      <PropertyList compact className="[&_dt]:text-tertiary-foreground">
                        <div className="flex items-center justify-between gap-4">
                          <PropertyLabel showIcon={false}>Kode risiko</PropertyLabel>
                          <dd className="max-w-[60%] truncate text-right font-sans text-foreground">
                            {riskCode || "Belum dibuat"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <PropertyLabel showIcon={false}>Versi</PropertyLabel>
                          <dd className="shrink-0 text-right font-sans text-foreground">
                            {riskVersionNumber ? `v${riskVersionNumber}` : "-"}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <PropertyLabel showIcon={false}>Periode profil</PropertyLabel>
                          <dd className="shrink-0 text-right font-sans text-foreground">
                            {riskPeriodLabel(isRiskLocked ? assessmentCycleDisplay : finalizationCycle)}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <PropertyLabel showIcon={false}>Status</PropertyLabel>
                          <dd className="shrink-0 text-right">
                            <Badge variant={toBadgeVariant(getRiskStatusTone(riskStatus))}
                              className={getStatusBadgeClassName(getRiskStatusTone(riskStatus))}
                            >
                              {getRiskStatusLabel(riskStatus)}
                            </Badge>
                          </dd>
                        </div>
                      </PropertyList>
                    </section>

                    {!riskId && (
                    <section
                      aria-labelledby="risk-side-treatment"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          id="risk-side-treatment"
                          className="text-sm font-semibold capitalize text-primary"
                        >
                          Penanganan
                        </h2>
                      </div>
                      <div className="mt-3">
                        {riskId ? (
                          <MitigationProgressTab
                            riskId={riskId}
                            token={token || ""}
                          />
                        ) : null}
                      </div>
                    </section>

                    )}

                    <section
                      aria-labelledby="risk-side-events"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          id="risk-side-events"
                          className="text-sm font-semibold capitalize text-primary"
                        >
                          Kejadian
                        </h2>
                        <div className="flex items-center gap-2">
                          {riskEvents.length > 0 ? (
                            <span className="font-mono text-sm tabular-nums text-muted-foreground">
                              {riskEvents.length}
                            </span>
                          ) : null}
                          {canCreateRiskEvent ? (
                            <ActionIconButton
                              type="button"
                              icon={<Plus className="size-3.5" />}
                              aria-label="Catat kejadian"
                              title="Catat kejadian"
                              onClick={handleCreateRiskEvent}
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3">
                        {!riskId ? null : loadingRiskEvents ? (
                          <div
                            className="flex items-center gap-2 rounded-lg bg-state-surface px-3 py-2 text-sm text-state-foreground"
                            role="status"
                            aria-live="polite"
                          >
                            <Loader2
                              className="size-3.5 animate-spin"
                              aria-hidden="true"
                            />
                            Memuat kejadian...
                          </div>
                        ) : riskEventsError ? (
                          <div className="rounded-lg bg-state-surface px-3 py-3 text-sm text-state-foreground">
                            <p>{riskEventsError}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="mt-2"
                              onClick={handleRetryRiskEvents}
                            >
                              Coba lagi
                            </Button>
                          </div>
                        ) : visibleRiskEvents.length > 0 ? (
                          <ul className="space-y-1">
                            {visibleRiskEvents.map((event) => (
                              <li key={event.id}>
                                <Link
                                  href={`/risk-events/${event.id}`}
                                  className="group -mx-2 block rounded-md px-2 py-2 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40"
                                >
                                  <p className="truncate text-sm font-medium leading-5 text-foreground" title={event.description}>
                                    {event.description}
                                  </p>
                                  <div className="mt-1 flex min-w-0 items-center gap-2 text-sm leading-5 text-muted-foreground">
                                    <span className="min-w-0 truncate font-mono">{event.code}</span>
                                    <Badge variant={toBadgeVariant(riskEventSeverityTones[event.severity])}
                                      className={getStatusBadgeClassName(riskEventSeverityTones[event.severity])}
                                    >
                                      {riskEventSeverityLabels[event.severity]}
                                    </Badge>
                                    <time dateTime={event.occurredAt} className="ml-auto shrink-0">
                                      {riskEventDateFormatter.format(new Date(event.occurredAt))}
                                    </time>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      {riskEvents.length > SIDE_PANEL_EVENT_PREVIEW_LIMIT ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                        >
                          <Link href="/risk-events">
                            Lihat semua kejadian ({riskEvents.length})
                          </Link>
                        </Button>
                      ) : null}
                    </section>

                    <section
                      aria-labelledby="risk-side-version-history"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2
                          id="risk-side-version-history"
                          className="text-sm font-semibold capitalize text-primary"
                        >
                          Riwayat versi
                        </h2>
                      </div>

                      <div className="mt-4">
                        {loadingVersions ? (
                          <div className="flex items-center gap-2 rounded-lg bg-state-surface px-3 py-2 text-sm text-state-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            Memuat riwayat versi...
                          </div>
                        ) : riskVersions.length > 0 ? (
                          <RiskVersionHistoryList
                            versions={visibleRiskVersions}
                            onVersionSelect={handleVersionSelect}
                          />
                        ) : null}
                      </div>
                      {riskVersions.length > SIDE_PANEL_PREVIEW_LIMIT && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setShowVersionHistoryDialog(true)}
                        >
                          Lihat semua versi ({riskVersions.length})
                        </Button>
                      )}
                    </section>
                    <section
                      aria-labelledby="risk-side-log"
                      className="border-t border-dashed border-border/70 pt-5"
                    >
                      {riskId ? (
                        <RiskLogTimeline
                          key={riskId}
                          riskId={riskId}
                          token={token || ""}
                          canAdd={riskStatus !== "draft"}
                        />
                      ) : (
                        <>
                          <h2
                            id="risk-side-log"
                            className="text-sm font-semibold capitalize text-primary"
                          >
                            Catatan
                          </h2>

                        </>
                      )}
                    </section>
              </DetailSidePanel>

              <ReviewSidePanel
                approvalId={approvalId}
                approvalWorkflow={approvalWorkflow}
                currentUserId={user?.id}
                riskStatus={riskStatus}
                userRole={user?.role || ""}
                inherentScore={Math.round(nilai)}
                token={token || undefined}
                onActionComplete={() => riskId && reloadRiskData(riskId)}
              />

            </div>
          </aside>
        </div>
          }
          monitoring={<RiskMonitoringList riskId={riskId || ""} riskCode={riskCode || ""} versionGroupId={riskVersionGroupId} token={token || ""} active={activeDetailTab === "monitoring"} />}
          treatment={riskId ? (
            <div ref={treatmentPanelRef} tabIndex={-1} role="region" aria-label="Penanganan mitigasi" className="outline-none"><MitigationProgressTab mitigationFilter={detailMitigationFilter} onMitigationFilterChange={setDetailMitigationFilter} riskId={riskId} token={token || ""} showTaskList readOnly={!user || !currentOrganizationId || !canWriteInOrg(user,currentOrganizationId)} /></div>
          ) : null}
        />

        {token && riskId && canCreateRiskEvent ? (
          <RiskEventFormDialog
            open={riskEventDrawerOpen}
            onOpenChange={setRiskEventDrawerOpen}
            token={token}
            organizationId={user?.organizationId ?? undefined}
            initialRiskId={riskId}
            onCreated={handleRiskEventCreated}
          />
        ) : null}

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
                <DialogDescription>
                  Lihat perubahan yang tersimpan pada setiap versi risiko.
                </DialogDescription>
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
                  Pilih periode untuk memulai pemantauan risiko ini. Kuartal
                  berjalan tersedia mulai bulan ketiga.
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
                  <MonitoringCycleSelect
                    id="new-monitoring-cycle"
                    value={selectedMonitoringCycle}
                    onValueChange={setSelectedMonitoringCycle}
                    options={monitoringCycleOptions}
                    disabled={isStartingMonitoring}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{monitoringWindowMessage(selectedMonitoringCycle)}</p>
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
                  disabled={
                    isStartingMonitoring ||
                    selectedMonitoringCycleOption?.status === "completed" ||
                    !selectedMonitoringCycleOption ||
                    !isMonitoringWindowOpen(selectedMonitoringCycle,monitoringNow)
                  }
                >
                  {selectedMonitoringCycleOption?.status === "in-progress"
                    ? "Lanjutkan Pemantauan"
                    : `Mulai Pemantauan ${selectedMonitoringCycle}`}
                </AccentButton>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
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
                <DialogDescription>
                  Risiko akan dipindahkan dari daftar aktif. Isi alasan pengarsipan untuk melanjutkan.
                </DialogDescription>
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
                    className=""
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
                    className=""
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
          <AlertDialogContent>
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
                variant="default"
                size="default"
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
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Finalisasi Risiko?"
                  : "Ajukan Risiko untuk Review?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                  ? "Tinjau periode, penilaian, dan rencana penanganan. Setelah finalisasi, profil ini dikunci."
                  : "Risiko akan disimpan lalu dikirim ke reviewer melalui alur persetujuan yang dipilih. Tinjau seluruh bagian sebelum melanjutkan."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <RiskFinalizationReview
              cycle={finalizationCycle}
              originalCycle={assessmentCycleDisplay}
              score={nilai}
              level={getRiskLevelLabel(level)}
              target={targetNilai}
              mitigationCount={mitigations.filter(item => item.action?.trim()).length}
            />
            <AlertDialogFooter>
              <CollectionDialogCancel
                onClick={() => setShowSubmitReviewConfirm(false)}
                disabled={isSubmitting}
              >
                Kembali periksa
              </CollectionDialogCancel>
              <AlertDialogAction
                variant="default"
                size="default"
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

        <AlertDialog open={Boolean(leaveHref)} onOpenChange={open => { if (!open && !isSubmitting) setLeaveHref(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Simpan perubahan sebelum keluar?</AlertDialogTitle>
              <AlertDialogDescription>Formulir memiliki perubahan yang belum tersimpan. Draf memerlukan judul, deskripsi, dan kategori.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-wrap">
              <ActionButton disabled={isSubmitting} onClick={() => setLeaveHref(null)}>Tetap mengisi</ActionButton>
              <ActionButton disabled={isSubmitting} onClick={() => {
                if (!leaveHref) return;
                allowNavigationRef.current = true;
                router.push(leaveHref);
              }}>Keluar tanpa menyimpan</ActionButton>
              <AccentButton disabled={isSubmitting} onClick={async () => {
                leaveAfterSaveRef.current = true;
                await handleSaveDraft();
                leaveAfterSaveRef.current = false;
              }}>Simpan dan keluar</AccentButton>
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

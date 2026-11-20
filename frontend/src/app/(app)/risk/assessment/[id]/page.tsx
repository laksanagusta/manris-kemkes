"use client";

import { FormLoadingSkeleton, PageLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import { FieldHeading } from "@/components/ui/field";
import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { canWriteInOrg } from "@/lib/auth-helpers";
import { riskTransactionKind } from "@/lib/risk-transaction-kind";
import { RiskTransactionBadge } from "@/components/shared/design-system/domain/risk-transaction-badge";
import { PropertyLabel, PropertyList } from "@/components/shared/design-system/layout/property-list";
import { ProfilePeriodDetails, useProfilePeriodWorkspace } from "@/components/upr/bound-profile-period-notice";
import { monitoringObservationDate, monitoringCycleForDate, isValidMonitoringDate, todayMonitoringDate } from "@/lib/monitoring-date";
import { formatDisplayDate } from "@/lib/display-date";
import { getWorkReturnLink } from "@/lib/operator-work";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  CircleDot,
  CheckCircle2,
  PencilLine,
  Loader2,
  Save,
  Send,
} from "@/components/shared/icons";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationPlanList } from "@/components/shared/mitigation-plan-list";
import { FinalMonitoringEvidence, MitigationStatusTable } from "./_components/mitigation-status-table";
import { RiskSubstanceFields } from "@/components/risk/risk-substance-fields";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/contexts/auth-context";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { api, ApiError } from "@/lib/api";
import { getRiskDetail, updateRiskAssessment } from "@/lib/api/risk-assessment";
import {
  deleteMonitoringDraft,
  finalizeMonitoring,
  getMonitoringDetail,
  startRiskRevision,
  updateMonitoringDraft,
} from "@/lib/api/risk-monitoring";
import { validateMonitoringFinalize } from "@/lib/api/mitigation-tasks";
import {
  getBobot,
  calculateNilai,
  formatRiskScore,
  resolveRiskAssessmentClassification,
} from "@/lib/risk";
import type { Risk } from "@/types/risk";
import type { MonitoringValidationResult } from "@/types/risk";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import { listUsers } from "@/lib/api/users";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DetailSidePanel } from "@/components/shared/design-system/layout/detail-side-panel";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import {
  AccentButton,
  ActionButton,
  CollapsibleCard,
  FormGroup,
  FormPanel,
  FieldErrorMessage,
  Textarea,
  RiskScoreHeatmapModal,
  RiskScorePickerTrigger,
} from "@/components/shared/design-system";
import { OrderedUserSelectionTable } from "@/components/risk/ordered-user-selection-table";
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
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import {
  ReviewSidePanel,
  type RiskWorkflowState,
} from "@/components/risk/review-side-panel";
import {
  filterApproverOptions,
  type UserPickerOption,
} from "@/lib/risk-register-user-picker";
import {
  resolveDraftApprovalLine,
  createApprovalLineRow,
  moveApprovalLineRows,
  type ApprovalLineRow,
} from "@/lib/risk-approval-line";
import { getRiskApprovalCapabilityBehavior } from "@/lib/risk-approval-capability";
import {
  buildSubstanceDefaults,
  buildSubstancePayload,
  diffRiskSubstance,
  formatSubstanceDiffSummary,
  treatmentOptionLabels,
  type RiskSubstanceDiff,
  type RiskSubstanceValues,
} from "@/lib/risk-assessment-substance";
import { ProfilRisikoCard } from "../components/profil-risiko-card";
import { MonitoringActionsMenu } from "../components/monitoring-actions-menu";
import { type AssessmentFormValues } from "../components/hasil-pemantauan-card";
import { SimpulanCard } from "../components/simpulan-card";

function dedupeApproverIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

function formatRevisionValue(field: RiskSubstanceDiff["field"], value: unknown): string {
  if (field === "mitigations") {
    const plans = value as RiskSubstanceValues["mitigations"];
    return plans.map(({ action, owner, executionScheduleText, dueDate }) =>
      [action, owner, executionScheduleText || dueDate].filter(Boolean).join(" · "),
    ).join("\n") || "—";
  }
  if (field === "treatmentOption" && typeof value === "string") {
    return treatmentOptionLabels[value] || value || "—";
  }
  if (Array.isArray(value)) return value.join("\n") || "—";
  return value === undefined || value === null || value === "" ? "—" : String(value);
}

function getRiskOrganizationId(risk: Risk): string {
  const riskWithOrganizationId = risk as Risk & {
    organizationId?: string | null;
    organizationID?: string | null;
  };

  return (
    riskWithOrganizationId.organizationId ??
    riskWithOrganizationId.organizationID ??
    ""
  );
}

function buildRiskFromMonitoring(
  monitoring: RiskMonitoringDetail,
  sourceRisk: Risk | null,
): Risk {
  const base = (monitoring.resultRisk ?? sourceRisk ?? {}) as Risk;
  const status = monitoring.status === "draft" ? "draft" : "final";
  const revision = riskTransactionKind(monitoring) === "revision";
  const mitigations = revision ? monitoring.draftMitigations ?? [] : monitoring.draftMitigations ?? base.mitigations ?? (base.mitigation ? [base.mitigation] : []);

  return {
    ...base,
    id: monitoring.resultRisk?.id ?? monitoring.id,
    targetProbability: monitoring.draftTargetProbability || base.targetProbability,
    targetImpact: monitoring.draftTargetImpact || base.targetImpact,
    title: monitoring.draftTitle || base.title,
    description: revision ? monitoring.draftDescription : monitoring.draftDescription || base.description,
    category: monitoring.draftCategory || base.category,
    cause: revision ? monitoring.draftCause ?? [] : monitoring.draftCause?.length ? monitoring.draftCause : base.cause,
    riskSource: monitoring.draftRiskSource || base.riskSource,
    controllability: monitoring.draftControllability || base.controllability,
    impactDesc: revision ? monitoring.draftImpactDesc ?? [] : monitoring.draftImpactDesc?.length
      ? monitoring.draftImpactDesc
      : base.impactDesc,
    existingControl: revision ? monitoring.draftExistingControl : monitoring.draftExistingControl || base.existingControl,
    controlEffectiveness:
      monitoring.draftControlEffectiveness || base.controlEffectiveness,
    treatmentOption: monitoring.draftTreatmentOption || base.treatmentOption,
    probability: monitoring.observedProbability || base.probability,
    impact: monitoring.observedImpact || base.impact,
    weight: monitoring.observedWeight || base.weight,
    nilai: monitoring.observedNilai || base.nilai,
    inherentScore:
      Math.round(
        monitoring.observedNilai || base.nilai || base.inherentScore,
      ) || base.inherentScore,
    status,
    assessmentCycle: monitoring.assessmentCycle || base.assessmentCycle,
    reviewType: "periodic",
    reviewSummary: monitoring.conclusion || base.reviewSummary,
    changeReason: monitoring.changeReason || base.changeReason,
    previousRiskId: monitoring.sourceRiskId || base.previousRiskId || null,
    versionNumber:
      monitoring.resultRisk?.versionNumber ?? monitoring.sourceVersionNumber,
    mitigations,
    mitigation: mitigations[0] ?? { action: "", owner: "" },
  } as Risk;
}

const approvalRoleLabels: Record<string, string> = {
  reviewer: "Reviewer",
  approval: "Pimpinan",
};

const assessmentStatusLabel: Record<string, string> = {
  draft: "Draf Pemantauan",
  final: "Final",
};

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

const formSchema = z.object({
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  changeReason: z.string().default(""),
  reviewSummary: z.string().default(""),
});

type AssessmentFormInput = z.input<typeof formSchema>;

type AssessmentLoadError = {
  kind: "not-found" | "unknown";
  message: string;
};

function MonitoringHeaderActionsBridge({
  hasFinalResult,
  hasUnsavedChanges,
  isAssessmentLocked,
  isCheckingFinalize,
  isDeletingDraft,
  isSaving,
  monitoringDraft,
  openDeleteDraftConfirm,
  openSubmitReviewConfirm,
  handleSaveDraft,
  resultRiskHref,
  sourceRisk,
  submitActionLabel,
}: {
  hasFinalResult: boolean;
  hasUnsavedChanges: boolean;
  isAssessmentLocked: boolean;
  isCheckingFinalize: boolean;
  isDeletingDraft: boolean;
  isSaving: boolean;
  monitoringDraft: RiskMonitoringDetail | null;
  openDeleteDraftConfirm: () => void;
  openSubmitReviewConfirm: () => Promise<void>;
  handleSaveDraft: () => Promise<void>;
  resultRiskHref: string | null;
  sourceRisk: Risk;
  submitActionLabel: string;
}) {
  const setHeaderActions = useSetHeaderActions();
  const handlers = useRef({ handleSaveDraft, openSubmitReviewConfirm });
  useEffect(() => {
    handlers.current = { handleSaveDraft, openSubmitReviewConfirm };
  }, [handleSaveDraft, openSubmitReviewConfirm]);

  const actions = useMemo(() => (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isAssessmentLocked ? (
        <span
          className={cn(
            "mr-1 inline-flex min-h-9 min-w-[7rem] items-center justify-end text-[11px]",
            hasUnsavedChanges ? "text-amber-700" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          <span data-date-time="">
            {isSaving
              ? "Menyimpan…"
              : hasUnsavedChanges
                ? "Belum disimpan"
                : `Tersimpan${monitoringDraft?.updatedAt ? ` ${formatDisplayDate(new Date(monitoringDraft.updatedAt), { hour: "2-digit", minute: "2-digit" })}` : ""}`}
          </span>
        </span>
      ) : null}
      <TooltipProvider>
        <MonitoringActionsMenu
          risk={sourceRisk}
          canDeleteDraft={!isAssessmentLocked && Boolean(monitoringDraft?.id)}
          deleteDisabled={isSaving || isCheckingFinalize || isDeletingDraft}
          onDeleteDraft={openDeleteDraftConfirm}
        />
        {!isAssessmentLocked ? (
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant="outline"
              icon={<Save className="size-3.5" />}
              onClick={() => handlers.current.handleSaveDraft()}
              disabled={isSaving}
            >
              Simpan draf
            </ActionButton>
            <AccentButton
              icon={<Send className="size-3.5" />}
              onClick={() => handlers.current.openSubmitReviewConfirm()}
              disabled={isSaving || isCheckingFinalize}
            >
              {submitActionLabel}
            </AccentButton>
          </div>
        ) : null}
        {hasFinalResult && resultRiskHref ? (
          <ActionButton asChild variant="outline" size="default"><Link href={resultRiskHref}>Lihat versi hasil</Link></ActionButton>
        ) : null}
      </TooltipProvider>
    </div>
  ), [
    hasFinalResult,
    hasUnsavedChanges,
    isAssessmentLocked,
    isCheckingFinalize,
    isDeletingDraft,
    isSaving,
    monitoringDraft,
    openDeleteDraftConfirm,
    resultRiskHref,
    sourceRisk,
    submitActionLabel,
  ]);

  useEffect(() => {
    setHeaderActions(actions);
    return () => setHeaderActions(null);
  }, [actions, setHeaderActions]);

  return null;
}

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams=useSearchParams();
  const returnTarget=getWorkReturnLink(searchParams.get("returnTo"));
  const { token, user } = useAuth();
  // The former /risk/assessment route is retained as a URL compatibility
  // alias, but it must use the same monitoring transaction flow. There is no
  // standalone profile-edit/reassessment screen anymore.
  const isMonitoringRoute =
    pathname.startsWith("/risk/monitoring") ||
    pathname.startsWith("/risk/assessment");
  const backTarget = returnTarget?.href || (isMonitoringRoute
    ? "/risk/register"
    : "/risk/assessment");
  const monitoringListTarget = "/compliance/monitoring";
  const riskApprovalCapabilityBehavior = useMemo(
    () => getRiskApprovalCapabilityBehavior(user?.capabilities),
    [user?.capabilities],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<AssessmentLoadError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingFinalize, setIsCheckingFinalize] = useState(false);
  const [finalizeCheckFailed, setFinalizeCheckFailed] = useState(false);
  const [finalizeNotice, setFinalizeNotice] = useState("");
  const [finalizeBlocked, setFinalizeBlocked] = useState(false);
  const [reloadDraftRequired, setReloadDraftRequired] = useState(false);
  const [scoreReviewed, setScoreReviewed] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [exitHref, setExitHref] = useState<string | null>(null);
  const [monitoringValidation, setMonitoringValidation] =
    useState<MonitoringValidationResult | null>(null);
  const [draftRisk, setDraftRisk] = useState<Risk | null>(null);
  const [sourceRisk, setSourceRisk] = useState<Risk | null>(null);
  const [monitoringDraft, setMonitoringDraft] =
    useState<RiskMonitoringDetail | null>(null);
  const profilePeriodWorkspace = useProfilePeriodWorkspace(token, monitoringDraft?.profileVersionId);
  const [observedAt, setObservedAt] = useState(() => todayMonitoringDate());
  const isRevision = Boolean(monitoringDraft && riskTransactionKind(monitoringDraft) === "revision");
  const [substanceEditEnabled, setSubstanceEditEnabled] = useState(false);
  const [substanceDraft, setSubstanceDraft] = useState<RiskSubstanceValues>(
    () => buildSubstanceDefaults(null),
  );

  const [reviewerId, setReviewerId] = useState<string>("");
  const [reviewerOption, setReviewerOption] = useState<UserPickerOption | null>(
    null,
  );
  const [approvalLine, setApprovalLine] = useState<ApprovalLineRow[]>([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] =
    useState<RiskWorkflowState | null>(null);
  const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [targetPickerOpen,setTargetPickerOpen]=useState(false);
  const [scorePickerOpen, setScorePickerOpen] = useState(false);
  const submitTarget = useRef<"draft" | "review">("draft");

  const form = useForm<AssessmentFormInput, unknown, AssessmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      probability: 1,
      impact: 1,
      changeReason: "",
      reviewSummary: "",
    },
  });
  const { reset } = form;
  const hasUnsavedProfileChanges = useMemo(
    () => substanceEditEnabled && diffRiskSubstance(draftRisk, substanceDraft).length > 0,
    [draftRisk, substanceDraft, substanceEditEnabled],
  );
  const hasUnsavedPlans = isMonitoringRoute && diffRiskSubstance(draftRisk, {
    ...draftRisk,
    mitigations: substanceDraft.mitigations,
  }).some((change) => change.field === "mitigations");
  const hasUnsavedChanges = form.formState.isDirty || hasUnsavedProfileChanges || hasUnsavedPlans ||
    Boolean(monitoringDraft && observedAt !== monitoringObservationDate(monitoringDraft)) ||
    (isMonitoringRoute && scoreReviewed !== Boolean(monitoringDraft?.observedScoreConfirmed));

  useEffect(() => {
    if (form.formState.submitCount === 0) {
      return;
    }

    const fieldIds: Record<string, string> = {
      probability: "risk-score-picker",
      impact: "risk-score-picker",
      changeReason: "change-reason",
      reviewSummary: "monitoring-conclusion",
    };
    const firstErrorField = Object.keys(form.formState.errors)[0];
    const fieldId = firstErrorField ? fieldIds[firstErrorField] : undefined;

    if (!fieldId) {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(fieldId)?.focus();
    });
  }, [form.formState.errors, form.formState.submitCount]);

  const probability = form.watch("probability");
  const impact = form.watch("impact");

  const computedBobot = getBobot(probability, impact);
  const computedNilai = calculateNilai(probability, impact, computedBobot);
  const substanceDiffs = useMemo(
    () => diffRiskSubstance(sourceRisk, substanceDraft),
    [sourceRisk, substanceDraft],
  );
  const substanceDiffSummary = useMemo(
    () => formatSubstanceDiffSummary(sourceRisk, substanceDraft),
    [sourceRisk, substanceDraft],
  );
  const selectedApprovalLine = approvalLine.filter((member) => member.id);
  const isRiskScoreReady =
    Number.isInteger(probability) &&
    probability >= 1 &&
    probability <= 5 &&
    Number.isInteger(impact) &&
    impact >= 1 &&
    impact <= 5;
  const isApprovalLineReady =
    selectedApprovalLine.length > 0 &&
    approvalLine.every((member) => member.id);
  const isAssessmentSectionReady =
    draftRisk?.status === "final" ||
    isRiskScoreReady;
  const submitActionLabel =
    isMonitoringRoute ? "Finalisasi"
      : riskApprovalCapabilityBehavior.usesDirectApprovalCopy
      ? "Finalisasi"
      : "Ajukan review";

  const toUserPickerOption = useCallback(
    (user: {
      id: string;
      name: string;
      role: string;
      email?: string;
      username?: string;
      nip?: string | null;
      jabatan?: string | null;
      pangkat?: string | null;
      orgName?: string | null;
    }): UserPickerOption => ({
      id: user.id,
      name: user.name,
      role: user.role,
      subtitle: user.jabatan || user.orgName || undefined,
      email: user.email,
      username: user.username,
      nip: user.nip,
      jabatan: user.jabatan,
      pangkat: user.pangkat,
      orgName: user.orgName,
    }),
    [],
  );

  const riskOrganizationId = draftRisk ? getRiskOrganizationId(draftRisk) : "";
  const canManageRisk = !!riskOrganizationId && canWriteInOrg(user, riskOrganizationId);

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
        organizationId: riskOrganizationId || undefined,
      });

      return {
        options: result.data.map(toUserPickerOption),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [toUserPickerOption, token, riskOrganizationId],
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
        organizationId: riskOrganizationId || undefined,
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
    [approvalLine, reviewerId, toUserPickerOption, token, riskOrganizationId],
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
        organizationId: riskOrganizationId || undefined,
      });

      return {
        options: result.data.map(toUserPickerOption),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [riskOrganizationId, token, toUserPickerOption],
  );

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

  function showFinalizedMonitoring(finalized: RiskMonitoringDetail) {
    const finalRisk = buildRiskFromMonitoring(finalized, sourceRisk);
    setMonitoringDraft(finalized);
    setObservedAt(monitoringObservationDate(finalized));
    setDraftRisk(finalRisk);
    setSubstanceDraft(buildSubstanceDefaults(finalRisk));
    setSubstanceEditEnabled(riskTransactionKind(finalized) === "revision");
    setScoreReviewed(Boolean(finalized.observedScoreConfirmed));
    reset({
      probability: finalized.observedProbability,
      impact: finalized.observedImpact,
      changeReason: finalized.changeReason || "",
      reviewSummary: finalized.conclusion || "",
    });
    setShowSubmitReviewConfirm(false);
    setSaveError("");
  }

  async function checkMonitoringFinalization(expected = monitoringDraft, notice = "") {
    if (!token || !id || isCheckingFinalize) return;
    setMonitoringValidation(null);
    setFinalizeCheckFailed(false);
    setFinalizeBlocked(false);
    setReloadDraftRequired(false);
    setFinalizeNotice(notice);
    setIsCheckingFinalize(true);
    try {
      const latest = await getMonitoringDetail(token, id);
      if (latest.status === "final") {
        showFinalizedMonitoring(latest);
        return;
      }
      if (latest.status !== "draft" || (latest.sourceRisk && latest.sourceRisk.status !== "final")) {
        setFinalizeNotice("Profil risiko sumber sudah berubah. Muat ulang draf untuk melihat status terbaru.");
        setFinalizeBlocked(true);
        setReloadDraftRequired(true);
        return;
      }
      if (latest.updatedAt !== expected?.updatedAt) {
        setFinalizeNotice("Draf sudah diperbarui di sesi lain. Memuat versi terbaru akan mengganti perubahan yang masih terbuka di halaman ini.");
        setFinalizeBlocked(true);
        setReloadDraftRequired(true);
        return;
      }
      const review = await validateMonitoringFinalize(token, id);
      if (!review.reportRevision) {
        setFinalizeCheckFailed(true);
        return;
      }
      setMonitoringValidation(review);
    } catch {
      setFinalizeCheckFailed(true);
    } finally {
      setIsCheckingFinalize(false);
    }
  }

  const openSubmitReviewConfirm = async () => {
    if (!canManageRisk) return;
    submitTarget.current = "review";

    if (isMonitoringRoute) {
      if (isRevision && !form.getValues("changeReason")?.trim()) {
        form.setError("changeReason", { message: "Alasan revisi wajib diisi." });
        document.getElementById("change-reason")?.focus();
        return;
      }
      if (isRevision && !substanceDiffs.length && probability === sourceRisk?.probability && impact === sourceRisk?.impact) {
        setSaveError("Ubah substansi atau skor profil risiko sebelum finalisasi revisi.");
        return;
      }
      if (!isAssessmentSectionReady || !scoreReviewed) {
        form.setError("probability", { message: "Gunakan skor yang ditampilkan atau pilih probabilitas dan dampak sebelum finalisasi." });
        document.getElementById("risk-score-picker")?.focus();
        return;
      }
      setSaveError("");
      setShowSubmitReviewConfirm(true);
      await checkMonitoringFinalization();
      return;
    }

    if (
      riskApprovalCapabilityBehavior.requiresReviewerSelection &&
      !reviewerId
    ) {
      toast.error("Pilih reviewer terlebih dahulu.");
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

  const handleSaveDraft = async () => {
    if (!canManageRisk) return;
    if (
      draftRisk?.status === "final"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    submitTarget.current = "draft";
    await form.handleSubmit(onSubmit)();
  };

  const handleSubmitForReview = async () => {
    if (isSaving || (isMonitoringRoute && (!scoreReviewed || !monitoringValidation?.canFinalize || isCheckingFinalize))) return;
    if (
      draftRisk?.status === "final"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    submitTarget.current = "review";
    await form.handleSubmit(onSubmit)();
  };

  const loadRiskData = useCallback(async () => {
    if (!token || !id) return;

    try {
      setIsLoading(true);
      setLoadError(null);
      if (isMonitoringRoute) {
        const monitoring = await getMonitoringDetail(token, id);
        if (riskTransactionKind(monitoring) === "revision") {
          const target = monitoring.resultRiskId
            ? `/risk/register/new?id=${monitoring.resultRiskId}`
            : (await startRiskRevision(token, monitoring.sourceRiskId, { changeReason: monitoring.changeReason })).redirectUrl;
          router.replace(target);
          return;
        }

        const source = monitoring.sourceRisk
          ? monitoring.sourceRisk
          : await getRiskDetail(token, monitoring.sourceRiskId);
        const syntheticDraft = buildRiskFromMonitoring(monitoring, source);

        setMonitoringDraft(monitoring);
        setObservedAt(monitoringObservationDate(monitoring));
        setScoreReviewed(riskTransactionKind(monitoring) === "revision" || Boolean(monitoring.observedScoreConfirmed));
        setSaveError("");
        setDraftRisk(syntheticDraft);
        setSourceRisk(source);
        setSubstanceEditEnabled(riskTransactionKind(monitoring) === "revision");
        setSubstanceDraft(buildSubstanceDefaults(syntheticDraft));
        reset({
          probability: monitoring.observedProbability || 1,
          impact: monitoring.observedImpact || 1,
          changeReason: monitoring.changeReason || "",
          reviewSummary: monitoring.conclusion || "",
        });
        setReviewerId("");
        setReviewerOption(null);
        setApprovalLine([]);
        setApprovalId(null);
        setApprovalWorkflow(null);
        return;
      }

      const draft = await getRiskDetail(token, id);
      setMonitoringDraft(null);
      setDraftRisk(draft);
      setSubstanceEditEnabled(false);
      setSubstanceDraft(buildSubstanceDefaults(draft));

      reset({
        probability: draft.probability || 1,
        impact: draft.impact || 1,
        changeReason: draft.changeReason || "",
        reviewSummary: draft.reviewSummary || "",
      });

      if (draft.previousRiskId) {
        try {
          const source = await getRiskDetail(token, draft.previousRiskId);
          setSourceRisk(source);
        } catch (sourceError) {
          if (sourceError instanceof ApiError && sourceError.status === 404) {
            setSourceRisk(null);
          } else {
            throw sourceError;
          }
        }
      } else {
        setSourceRisk(null);
      }

      if (
        Array.isArray(draft.draftApprovalLine) &&
        draft.draftApprovalLine.length > 0
      ) {
        const resolvedApprovalLine = resolveDraftApprovalLine(
          draft.draftApprovalLine,
        );
        const reviewerMember = draft.draftApprovalLine.find(
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

      setApprovalId(null);
      setApprovalWorkflow(null);
      try {
        type ApprovalByEntityResult = {
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
        } | null;

        const approvalResult = await api.get<ApprovalByEntityResult>(
          `/approvals/by-entity?request_type=assessment&entity_id=${id}`,
          token ?? undefined,
        );
        setApprovalId(approvalResult?.id ?? null);
        setApprovalWorkflow(
          approvalResult
            ? {
                currentStatus: approvalResult.currentStatus ?? null,
                currentApproverRole: approvalResult.currentApproverRole ?? null,
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
        // Hydrate reviewer & approval line from steps if available
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
      } catch (approvalErr) {
        setApprovalId(null);
        setApprovalWorkflow(null);
        // 404 is expected when no approval exists yet
        if (!(approvalErr instanceof Error && "status" in approvalErr)) {
          console.error("Failed to load approval workflow:", approvalErr);
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setDraftRisk(null);
        setSourceRisk(null);
        setMonitoringDraft(null);
        setSubstanceDraft(buildSubstanceDefaults(null));
        reset({
          probability: 1,
          impact: 1,
          changeReason: "",
          reviewSummary: "",
        });
        setApprovalId(null);
        setApprovalWorkflow(null);
        setLoadError({
          kind: "not-found",
          message: isMonitoringRoute
            ? "Data transaksi pemantauan tidak ditemukan."
            : "Data risiko tidak ditemukan.",
        });
        toast.error(
          isMonitoringRoute
            ? "Data transaksi pemantauan tidak ditemukan."
            : "Data risiko tidak ditemukan.",
        );
        return;
      }
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Terjadi kesalahan yang tidak diketahui.";
      setLoadError({
        kind: "unknown",
        message,
      });
      toast.error("Gagal memuat data risiko", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, token, reset, isMonitoringRoute, router]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  useEffect(() => {
    if (!isMonitoringRoute || draftRisk?.status === "final" || !hasUnsavedChanges) {
      return;
    }

    const currentHref = window.location.href;
    const currentHistoryState = window.history.state;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const handleLeaveLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank" || link.hasAttribute("download")) return;
      const destination = new URL(link.href);
      if (destination.origin !== window.location.origin || destination.pathname + destination.search === window.location.pathname + window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      if (!isSaving) setExitHref(destination.pathname + destination.search + destination.hash);
    };
    const handleHistoryLeave = (event: PopStateEvent) => {
      if (window.location.href === currentHref) return;
      const destination = window.location.pathname + window.location.search + window.location.hash;
      event.stopImmediatePropagation();
      window.history.pushState(currentHistoryState, "", currentHref);
      if (!isSaving) setExitHref(destination);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handleHistoryLeave, true);
    document.addEventListener("click", handleLeaveLink, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handleHistoryLeave, true);
      document.removeEventListener("click", handleLeaveLink, true);
    };
  }, [draftRisk?.status, hasUnsavedChanges, isMonitoringRoute, isSaving]);

  const handleDeleteMonitoringDraft = async () => {
    if (!token || !monitoringDraft?.id || draftRisk?.status === "final") {
      return;
    }

    setIsDeletingDraft(true);
    try {
      await deleteMonitoringDraft(token, monitoringDraft.id);
      setShowDeleteDraftConfirm(false);
      toast.success("Draf pemantauan berhasil dihapus");
      router.replace(monitoringListTarget);
    } catch (error) {
      toast.error("Draf pemantauan gagal dihapus", {
        description:
          error instanceof Error
            ? error.message
            : "Silakan coba lagi.",
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const openDeleteDraftConfirm = useCallback(() => {
    setShowDeleteDraftConfirm(true);
  }, []);

  const onSubmit = async (values: AssessmentFormValues) => {
    if (!isValidMonitoringDate(observedAt)) {
      setSaveError("Isi tanggal pemantauan yang valid, paling lambat hari ini.");
      return;
    }
    if (!token || !id || !draftRisk) return;
    if (
      draftRisk.status === "final"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    const isFinalizing = submitTarget.current === "review";
    if (isSaving || (isMonitoringRoute && isFinalizing && (finalizeBlocked || !scoreReviewed || !monitoringValidation?.canFinalize))) return;
    setSaveError("");
    setIsSaving(true);
    let draftSaved = false;
    try {
      const newWeight = getBobot(values.probability, values.impact);
      const newNilai = calculateNilai(
        values.probability,
        values.impact,
        newWeight,
      );
      const classification = resolveRiskAssessmentClassification(newNilai);
      const mergedSubstance = buildSubstancePayload(draftRisk, {
        enabled: substanceEditEnabled,
        values: substanceDraft,
      });

      if (isMonitoringRoute) {
        const monitoring = monitoringDraft;
        const monitoringPayload: Record<string,unknown> = {
          replaceSubstance: isRevision,
          expectedUpdatedAt: monitoring?.updatedAt,
          observedAt,
          observedScoreConfirmed: scoreReviewed,
          observedProbability: values.probability,
          observedImpact: values.impact,
          conclusion: values.reviewSummary,
          mitigationProgressSummary:
            monitoring?.mitigationProgressSummary || "",
          mitigationCompletionPercent:
            monitoring?.mitigationCompletionPercent || 0,
          values: {
            targetProbability: substanceDraft.targetProbability,
            targetImpact: substanceDraft.targetImpact,
            title: mergedSubstance.title ?? draftRisk.title,
            description: mergedSubstance.description ?? draftRisk.description,
            category: mergedSubstance.category ?? draftRisk.category,
            cause: mergedSubstance.cause ?? (draftRisk.cause || []),
            riskSource:
              mergedSubstance.riskSource ?? (draftRisk.riskSource || ""),
            controllability:
              mergedSubstance.controllability ??
              (draftRisk.controllability || ""),
            impactDesc:
              mergedSubstance.impactDesc ?? (draftRisk.impactDesc || []),
            existingControl:
              mergedSubstance.existingControl ??
              (draftRisk.existingControl || ""),
            controlEffectiveness:
              mergedSubstance.controlEffectiveness ??
              (draftRisk.controlEffectiveness || ""),
            treatmentOption:
              mergedSubstance.treatmentOption ??
              (draftRisk.treatmentOption || ""),
            mitigations: substanceDraft.mitigations,
            probability: values.probability,
            impact: values.impact,
            conclusion: values.reviewSummary,
            changeReason: values.changeReason,
          },
        };

        if (!isRevision) monitoringPayload.values = { changeReason: values.changeReason };
        const updatedMonitoring = await updateMonitoringDraft(token, id, monitoringPayload);
        draftSaved = true;
        form.reset({
          ...values,
          changeReason: updatedMonitoring.changeReason || "",
          reviewSummary: updatedMonitoring.conclusion || "",
        });
        const savedRisk = buildRiskFromMonitoring(updatedMonitoring, sourceRisk);
        setMonitoringDraft(updatedMonitoring);
        setObservedAt(monitoringObservationDate(updatedMonitoring));
        setScoreReviewed(Boolean(updatedMonitoring.observedScoreConfirmed));
        setDraftRisk(savedRisk);
        setSubstanceDraft(buildSubstanceDefaults(savedRisk));
        setSubstanceEditEnabled(riskTransactionKind(updatedMonitoring) === "revision");
        if (isFinalizing && monitoringValidation) {
          try {
            const finalized = await finalizeMonitoring(token, id, {
              expectedUpdatedAt: updatedMonitoring.updatedAt,
              reportRevision: monitoringValidation.reportRevision,
            });
            showFinalizedMonitoring(finalized);
            toast.success(isRevision ? "Revisi profil risiko berhasil difinalisasi" : `Pemantauan ${finalized.assessmentCycle} berhasil difinalisasi`);
          } catch (finalizeError) {
            const message = finalizeError instanceof ApiError && finalizeError.status < 500
              ? `Draf tersimpan. ${finalizeError.message}`
              : "Draf tersimpan. Hasil finalisasi belum terkonfirmasi. Periksa status sebelum mencoba lagi.";
            await checkMonitoringFinalization(updatedMonitoring, message);
          }
        } else {
          toast.success(isRevision ? "Draf revisi berhasil disimpan" : "Draf pemantauan berhasil disimpan");
        }
        return;
      }

      const isDraftSubmission = submitTarget.current === "draft";
      const submissionStatus =
        isDraftSubmission || riskApprovalCapabilityBehavior.submitsForApproval
          ? draftRisk.status
          : "final";
      const draftApprovalLinePayload =
        riskApprovalCapabilityBehavior.showsApprovalLineEditor
          ? [
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
                  type: "approval" as const,
                })),
            ]
          : [];

      // Merge assessment fields with existing risk data so backend validation passes
      const payload = {
        title: mergedSubstance.title ?? draftRisk.title,
        description: mergedSubstance.description ?? draftRisk.description,
        category: mergedSubstance.category ?? draftRisk.category,
        status: submissionStatus,
        unitId: draftRisk.unitId,
        organizationId: getRiskOrganizationId(draftRisk),
        cause: mergedSubstance.cause ?? (draftRisk.cause || []),
        riskSource: mergedSubstance.riskSource ?? (draftRisk.riskSource || ""),
        controllability:
          mergedSubstance.controllability ?? (draftRisk.controllability || ""),
        impactDesc: mergedSubstance.impactDesc ?? (draftRisk.impactDesc || []),
        existingControl:
          mergedSubstance.existingControl ?? (draftRisk.existingControl || ""),
        controlEffectiveness:
          mergedSubstance.controlEffectiveness ??
          (draftRisk.controlEffectiveness || ""),
        probability: values.probability,
        impact: values.impact,
        weight: newWeight,
        inherentScore: Math.round(newNilai),
        nilai: Math.round(newNilai),
        riskPriority: classification.priority,
        riskAppetite: classification.appetite,
        treatmentOption:
          mergedSubstance.treatmentOption ?? (draftRisk.treatmentOption || ""),
        mitigations:
          mergedSubstance.mitigations ??
          draftRisk.mitigations ??
          (draftRisk.mitigation ? [draftRisk.mitigation] : []),
        targetProbability: draftRisk.targetProbability || 0,
        targetImpact: draftRisk.targetImpact || 0,
        targetWeight: draftRisk.targetWeight || 0,
        targetNilai: Math.round(draftRisk.targetNilai || 0),
        assessmentCycle: draftRisk.assessmentCycle || "",
        reviewType: draftRisk.reviewType || "assessment",
        changeReason: values.changeReason,
        reviewSummary: values.reviewSummary,
        draftApprovalLine: draftApprovalLinePayload,
      };

      await updateRiskAssessment(token, id, payload);

      if (
        submitTarget.current === "review" &&
        riskApprovalCapabilityBehavior.submitsForApproval
      ) {
        const approverIds = dedupeApproverIds([
          reviewerId,
          ...selectedApprovalLine.map((member) => member.id),
        ]);

        try {
          await api.post(
            "/approvals/submit",
            {
              requestType: "assessment",
              entityId: id,
              notes: "",
              approverIds,
              submissionType: "review",
            },
            token,
          );
          toast.success(
            "Pemantauan berhasil disimpan dan diajukan untuk review!",
          );
          router.push(backTarget);
        } catch (approvalErr: unknown) {
          toast.error(
            `Pemantauan disimpan, namun gagal diajukan: ${(approvalErr as Error).message}`,
          );
          router.push(backTarget);
        }
      } else if (submitTarget.current === "review") {
        toast.success("Pemantauan berhasil disimpan dan langsung disetujui!");
        router.push(backTarget);
      } else {
        toast.success("Pemantauan risiko berhasil disimpan");
        router.push(backTarget);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Silakan coba lagi.";
      if (isMonitoringRoute) {
        const draftMessage = `Draf belum dapat disimpan. Isian masih tersedia. ${message}`;
        if (isFinalizing) {
          await checkMonitoringFinalization(monitoringDraft, draftMessage);
        } else {
          setSaveError(draftMessage);
        }
      } else {
        toast.error(draftSaved ? "Draf tersimpan, tetapi langkah berikutnya gagal." : "Gagal menyimpan pemantauan", { description: message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoadingSkeleton><FormLoadingSkeleton message="Memuat data pemantauan…" /></PageLoadingSkeleton>;
  }

  if (loadError) {
    const isNotFound = loadError.kind === "not-found";

    return (
      <div
        className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4 rounded-lg bg-state-surface px-6 text-center text-state-foreground"
        role="alert"
      >
        <div className="space-y-1">
          <p className="font-medium text-state-foreground">
            {isNotFound ? "Data tidak ditemukan" : "Data belum dapat dimuat"}
          </p>
          <p className="max-w-md text-sm text-state-foreground/80">
            {loadError.message}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {!isNotFound ? (
            <Button variant="outline" onClick={loadRiskData}>
              Coba lagi
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!draftRisk || !sourceRisk) {
    return (
      <div
        className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 rounded-lg bg-state-surface text-state-foreground"
        role="alert"
      >
        <p className="text-state-foreground">Data risiko tidak ditemukan.</p>
      </div>
    );
  }

  const isAssessmentLocked = !canManageRisk || draftRisk.status === "final" || monitoringDraft?.status === "superseded";
  const monitoringCycle = monitoringCycleForDate(observedAt) || monitoringDraft?.assessmentCycle || draftRisk.assessmentCycle || "";
  const hasFinalResult = isMonitoringRoute && monitoringDraft?.status === "final";
  const sourceScore = monitoringDraft?.sourceNilai ?? sourceRisk.nilai ?? sourceRisk.inherentScore ?? 0;
  const followUpPlans = substanceDraft.mitigations.filter((plan) => plan.action.trim());
  const acceptsPreviousScore = probability === monitoringDraft?.sourceProbability && impact === monitoringDraft?.sourceImpact;
  const sourceScoreLabel = formatRiskScore(sourceScore, "—");
  const resultRiskHref = monitoringDraft?.resultRiskId
    ? `/risk/register/${monitoringDraft.resultRiskId}`
    : null;
  const monitoringHeaderBadges = (
    <div className="flex flex-wrap items-center gap-2">
      {monitoringDraft && <RiskTransactionBadge record={monitoringDraft} />}
      <Badge variant={monitoringDraft?.status === "superseded" ? "secondary" : draftRisk.status === "final" ? "default" : "secondary"}
        className={draftRisk.status === "final" ? "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : ""}
      >
        {monitoringDraft?.status === "superseded"
          ? "Digantikan"
          : assessmentStatusLabel[draftRisk.status] ?? draftRisk.status}
      </Badge>
      <Badge variant="secondary"
        className=""
      >
        {sourceRisk.code || sourceRisk.riskCode}
      </Badge>
      <Badge variant="secondary"
        className=""
      >
        Versi {draftRisk.versionNumber}
      </Badge>
      {monitoringCycle ? (
        <Badge variant="secondary"
          className=""
        >
          {monitoringCycle}
        </Badge>
      ) : null}
    </div>
  );

  const monitoringSummary = (
    <DetailSidePanel>
      <section aria-labelledby="monitoring-side-summary">
        <h2
          id="monitoring-side-summary"
          className="text-sm font-semibold text-primary"
        >
          Simpulan Pemantauan
        </h2>
        <div className="mt-3">
          <SimpulanCard
            nilaiCurrent={sourceScore}
            currentInherentScore={isMonitoringRoute ? undefined : sourceRisk.inherentScore}
            nilaiBaru={computedNilai}
            probability={probability}
            impact={impact}
          />
        </div>
      </section>
    </DetailSidePanel>
  );

  return (
    <>
      {isMonitoringRoute ? (
        <MonitoringHeaderActionsBridge
          hasFinalResult={hasFinalResult}
          hasUnsavedChanges={hasUnsavedChanges}
          isAssessmentLocked={isAssessmentLocked}
          isCheckingFinalize={isCheckingFinalize}
          isDeletingDraft={isDeletingDraft}
          isSaving={isSaving}
          monitoringDraft={monitoringDraft}
          openDeleteDraftConfirm={openDeleteDraftConfirm}
          openSubmitReviewConfirm={openSubmitReviewConfirm}
          handleSaveDraft={handleSaveDraft}
          resultRiskHref={resultRiskHref}
          sourceRisk={sourceRisk}
          submitActionLabel={submitActionLabel}
        />
      ) : null}
      <FormPage
        className="risk-form-filter-controls space-y-6"
      >
      {isMonitoringRoute ? (returnTarget || saveError) && (
        <div className="w-full min-w-0 space-y-3">
          {returnTarget && (
            <ActionButton variant="ghost" disabled={isSaving} onClick={() => {
              if (hasUnsavedChanges && draftRisk.status === "draft") setExitHref(backTarget);
              else router.push(backTarget);
            }}>{returnTarget.label}</ActionButton>
          )}
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        </div>
      ) : (
      <FormHeader
        title="Monitoring Risiko"
          badges={monitoringHeaderBadges}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <TooltipProvider>
                {(draftRisk.status === "draft" || !id) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="default"
                      className=""
                      onClick={handleSaveDraft}
                      disabled={isSaving || isAssessmentLocked}
                    >
                      <Save className="size-3.5" />{" "}
                      Simpan draf
                    </Button>
                    <Button
                      size="default"
                      className=""
                      onClick={openSubmitReviewConfirm}
                      disabled={isSaving || isCheckingFinalize || isAssessmentLocked}
                    >
                      <Send className="size-4" />{" "}
                      {submitActionLabel}
                    </Button>
                  </div>
                )}
              </TooltipProvider>
            </div>
          }
        />
      )}
      {isMonitoringRoute && !isRevision && monitoringDraft?.id && (
        <DetailSidePanel>
          <section aria-labelledby="monitoring-treatment-summary" className="min-w-0 space-y-3">
            <h2 id="monitoring-treatment-summary" className="text-sm font-semibold text-primary">Laporan Penanganan</h2>
            {monitoringDraft.status === "draft"
              ? <MitigationStatusTable key={monitoringDraft.id} monitoringId={monitoringDraft.id} />
              : <FinalMonitoringEvidence key={monitoringDraft.id} monitoringId={monitoringDraft.id} />}
          </section>
        </DetailSidePanel>
      )}
      <div className={cn(
        "grid w-full min-w-0 gap-6 xl:items-start",
        isMonitoringRoute ? "xl:grid-cols-[minmax(0,1fr)_420px]" : "xl:grid-cols-[minmax(0,1fr)_360px]",
      )}>
        {isMonitoringRoute && (
          <aside className="min-w-0 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1">
            <DetailSidePanel>
              <section aria-labelledby="monitoring-properties" className="space-y-3">
                <h2 id="monitoring-properties" className="text-sm font-semibold text-primary">Properti</h2>
                <p className="wrap-break-word text-sm text-muted-foreground">{sourceRisk.title}</p>
                <PropertyList compact className="mt-0">
                  {monitoringDraft && (
                    <div className="flex items-center justify-between gap-4">
                      <PropertyLabel>Jenis transaksi</PropertyLabel>
                      <dd className="text-right"><RiskTransactionBadge record={monitoringDraft} /></dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <PropertyLabel>Status</PropertyLabel>
                    <dd className="text-right">
                      <Badge
                        variant={monitoringDraft?.status === "superseded" ? "secondary" : draftRisk.status === "final" ? "default" : "secondary"}
                        className={draftRisk.status === "final" ? "border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" : ""}
                      >
                        {monitoringDraft?.status === "superseded"
                          ? "Digantikan"
                          : assessmentStatusLabel[draftRisk.status] ?? draftRisk.status}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <PropertyLabel>Kode risiko</PropertyLabel>
                    <dd className="max-w-[60%] break-words text-right font-mono text-foreground">
                      {sourceRisk.code || sourceRisk.riskCode || "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <PropertyLabel>Versi risiko</PropertyLabel>
                    <dd className="text-right font-mono text-foreground">{draftRisk.versionNumber ?? "—"}</dd>
                  </div>
                  {monitoringCycle ? (
                    <div className="flex items-center justify-between gap-4">
                      <PropertyLabel>Periode pemantauan</PropertyLabel>
                      <dd className="text-right font-mono text-foreground">{monitoringCycle}</dd>
                    </div>
                  ) : null}
                </PropertyList>
                <ProfilePeriodDetails loaded={profilePeriodWorkspace} periodId={monitoringDraft?.monitoringPeriodId} showProfileVersion />
              </section>
            </DetailSidePanel>
          </aside>
        )}
        {/* Left Column */}
        <div className="min-w-0 space-y-6 xl:col-start-1 xl:row-start-1">
          {!isMonitoringRoute ? (
            <ProfilRisikoCard
              risk={sourceRisk}
              detailHref={`/risk/register/${sourceRisk.id}`}
              compact={isMonitoringRoute}
            />
          ) : null}

          <div className="space-y-6">
            <CollapsibleCard.Root appearance="form" className="scroll-mt-28">
              <CollapsibleCard.Trigger className="flex-wrap hover:bg-transparent sm:px-5">
                <CollapsibleCard.Header className="min-w-0 flex-1">
                  <CollapsibleCard.Icon />
                  <CollapsibleCard.Title className="overflow-visible whitespace-normal text-base font-medium">
                    {isRevision ? "Penilaian hasil revisi" : "Hasil Pemantauan"}
                  </CollapsibleCard.Title>
                </CollapsibleCard.Header>
                {!isMonitoringRoute && (
                  <CollapsibleCard.Actions className="ms-auto flex-wrap justify-end">
                    {monitoringHeaderBadges}
                  </CollapsibleCard.Actions>
                )}
              </CollapsibleCard.Trigger>
              <CollapsibleCard.Content>
                <FormPanel>
                  <FormGroup className="grid gap-6">
                    {isRevision && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Rencana tindak lanjut</p>
                        <p className="text-xs text-muted-foreground">
                          Tinjau tindakan, PIC, dan jadwal pelaksanaan. Perubahan berlaku setelah revisi difinalisasi.
                        </p>
                        <MitigationPlanList
                          items={substanceDraft.mitigations}
                          onChange={(mitigations) => setSubstanceDraft((current) => ({ ...current, mitigations }))}
                          disabled={isAssessmentLocked || isSaving}
                          loadPicOptions={loadPicOptions}
                          showExecutionSchedule
                        />
                      </div>
                    )}
                    {(() => {
                      const mitigations =
                        draftRisk?.mitigations ??
                        sourceRisk.mitigations ??
                        (sourceRisk.mitigation ? [sourceRisk.mitigation] : []);
                      const mitigationItems: MitigationItem[] = mitigations.map(
                        (m) => ({
                          id: m.id,
                          action: m.action ?? "",
                          owner: m.owner ?? "",
                          ownerUserId: m.ownerUserId,
                          treatmentOwnerId: m.ownerUserId ?? m.treatmentOwnerId,
                          externalPicId: m.externalPicId,
                          dueDate: m.dueDate ?? "",
                          mitigationType:
                            m.mitigationType ?? "reduce_probability",
                        }),
                      );

                      if (isMonitoringRoute) return null;

                      return (
                        <div className="w-full min-w-0 space-y-2">
                          <Label className="text-sm font-medium text-foreground">
                            {mitigationItems.length > 0
                              ? "Rencana Penanganan (dari versi terakhir yang disetujui)"
                              : "Rencana Penanganan"}
                          </Label>
                          <MitigationTable
                            items={mitigationItems}
                          />
                        </div>
                      );
                    })()}

                    <div className="flex min-w-0 flex-col gap-2">
                      <FieldHeading>
                        <Label htmlFor="risk-score-picker" className="text-sm font-medium">
                          Skor Risiko Observasi<span className="text-destructive"> *</span>
                        </Label>
                        {isMonitoringRoute && (
                          <p className="leading-4 text-sm text-muted-foreground">
                            Skor sebelumnya {sourceScoreLabel}.
                            {!isAssessmentLocked && (scoreReviewed
                              ? " Skor observasi sudah ditetapkan."
                              : " Skor yang tampil berasal dari draf. Tetapkan skor observasi sebelum finalisasi.")}
                          </p>
                        )}
                      </FieldHeading>
                      <RiskScorePickerTrigger
                        id="risk-score-picker"
                        title="Skor risiko observasi"
                        presentation="card"
                        probability={probability}
                        impact={impact}
                        onClick={() => setScorePickerOpen(true)}
                        disabled={isAssessmentLocked || isSaving}
                        aria-describedby={
                          form.formState.errors.probability || form.formState.errors.impact
                            ? "risk-score-error"
                            : undefined
                        }
                      />
                      {isMonitoringRoute && !isAssessmentLocked && (
                        <div className="flex flex-wrap gap-2">
                          <ActionButton type="button" size="sm" disabled={isSaving} onClick={() => {
                            const previousProbability = monitoringDraft?.sourceProbability ?? sourceRisk.probability;
                            const previousImpact = monitoringDraft?.sourceImpact ?? sourceRisk.impact;
                            form.setValue("probability", previousProbability, { shouldDirty: true, shouldValidate: true });
                            form.setValue("impact", previousImpact, { shouldDirty: true, shouldValidate: true });
                            setScoreReviewed(true);
                          }}>Gunakan skor sebelumnya</ActionButton>
                          {!acceptsPreviousScore && !scoreReviewed && (
                            <ActionButton type="button" size="sm" disabled={isSaving} onClick={() => {
                              setScoreReviewed(true);
                              form.clearErrors(["probability", "impact"]);
                            }}>Gunakan skor draf</ActionButton>
                          )}
                          <ActionButton type="button" size="sm" disabled={isSaving} onClick={() => setScorePickerOpen(true)}>Ubah probabilitas dan dampak</ActionButton>
                        </div>
                      )}
                      <FieldErrorMessage id="risk-score-error">
                        {form.formState.errors.probability ||
                        form.formState.errors.impact
                          ? form.formState.errors.probability?.message ||
                            form.formState.errors.impact?.message ||
                            "Probabilitas dan dampak wajib diisi"
                          : undefined}
                      </FieldErrorMessage>
                    </div>
                  </FormGroup>
                  <FormGroup className="grid gap-6">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="change-reason">
                        {isRevision ? "Alasan revisi" : isMonitoringRoute ? "Alasan penilaian" : "Alasan Perubahan"}
                      </Label>
                      <Controller
                        control={form.control}
                        name="changeReason"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            id="change-reason"
                            aria-invalid={
                              form.formState.errors.changeReason ? true : undefined
                            }
                            aria-describedby={
                              form.formState.errors.changeReason
                                ? "change-reason-error"
                                : undefined
                            }
                            placeholder={isMonitoringRoute ? "Jelaskan data atau pertimbangan yang mendasari skor observasi." : "Jelaskan bukti atau pertimbangan yang mendasari perubahan…"}
                            className=""
                            disabled={isAssessmentLocked || isSaving}
                          />
                        )}
                      />
                      <FieldErrorMessage id="change-reason-error">
                        {form.formState.errors.changeReason
                          ? form.formState.errors.changeReason.message || "Wajib diisi"
                          : undefined}
                      </FieldErrorMessage>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="monitoring-conclusion">
                        {isMonitoringRoute ? "Simpulan dan tindak lanjut" : "Ringkasan Review / Saran Tindak Lanjut"}
                      </Label>
                      <Controller
                        control={form.control}
                        name="reviewSummary"
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            id="monitoring-conclusion"
                            aria-invalid={
                              form.formState.errors.reviewSummary ? true : undefined
                            }
                            aria-describedby={
                              form.formState.errors.reviewSummary
                                ? "monitoring-conclusion-error"
                                : undefined
                            }
                            placeholder={isMonitoringRoute ? "Simpulkan kondisi risiko, efektivitas mitigasi, dan keputusan periode berikutnya..." : "Tuliskan ringkasan dari hasil review dan rekomendasi tindakan..."}
                            className=""
                            disabled={isAssessmentLocked || isSaving}
                          />
                        )}
                      />
                      <FieldErrorMessage id="monitoring-conclusion-error">
                        {form.formState.errors.reviewSummary
                          ? form.formState.errors.reviewSummary.message || "Wajib diisi"
                          : undefined}
                      </FieldErrorMessage>
                    </div>
                  </FormGroup>
                </FormPanel>
              </CollapsibleCard.Content>
            </CollapsibleCard.Root>

            {(!isMonitoringRoute || isRevision) && <CollapsibleCard.Root
              appearance="form"
              className="scroll-mt-28"
              defaultOpen={isRevision}
            >
              <CollapsibleCard.Trigger className="hover:bg-transparent sm:px-5">
                <CollapsibleCard.Header>
                  <CollapsibleCard.Icon />
                  <CollapsibleCard.Text>
                    <CollapsibleCard.Title className="overflow-visible whitespace-normal text-base font-medium">
                      {isRevision ? "Revisi substansi profil risiko" : "Perubahan Substansi Risiko"}
                    </CollapsibleCard.Title>
                    <CollapsibleCard.Description>
                      Buka hanya jika ada perubahan isi risiko, kontrol, atau
                      mitigasi.
                    </CollapsibleCard.Description>
                  </CollapsibleCard.Text>
                </CollapsibleCard.Header>
                <CollapsibleCard.Actions>
                  <Badge
                    variant="outline"
                    className={cn(
                      "transition-colors",
                      substanceEditEnabled
                        ? ""
                        : "",
                    )}
                  >
                    <PencilLine className="size-3.5" />
                    <span className="hidden sm:inline">
                      {substanceEditEnabled
                        ? substanceDiffs.length > 0
                          ? `${substanceDiffs.length} perubahan`
                        : "Siap diubah"
                        : "Tidak aktif"}
                    </span>
                  </Badge>
                </CollapsibleCard.Actions>
              </CollapsibleCard.Trigger>
              <CollapsibleCard.Content>
                <FormPanel>
                  <FormGroup className="space-y-5">
                    {!isRevision && <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <FieldHeading>
                          <Label className="text-sm font-medium text-foreground">
                            Aktifkan edit substansi risiko
                          </Label>
                          <p className="max-w-2xl text-xs leading-4 text-muted-foreground">
                            Gunakan bagian ini jika ada perubahan data risiko
                          </p>
                        </FieldHeading>
                      </div>
                      <Switch
                        id="substance-edit-enabled"
                        aria-label="Aktifkan edit substansi risiko"
                        checked={substanceEditEnabled}
                        onCheckedChange={setSubstanceEditEnabled}
                        disabled={isAssessmentLocked || isSaving}
                      />
                    </div>}

                    {substanceEditEnabled ? (
                      <div className="mt-3 space-y-2 border-t border-dashed border-border pt-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className=""
                          >
                            {substanceDiffs.length > 0
                              ? `${substanceDiffs.length} bidang berubah`
                              : "Belum ada perubahan"}
                          </Badge>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {substanceDiffSummary}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Aktifkan saat ada update data risiko versi terbaru.
                      </p>
                    )}
                    {isRevision && <div className="space-y-2"><Label htmlFor="revision-target-score">Target risiko residual</Label><RiskScorePickerTrigger id="revision-target-score" title="Target risiko residual" probability={substanceDraft.targetProbability || 1} impact={substanceDraft.targetImpact || 1} onClick={()=>setTargetPickerOpen(true)} disabled={isAssessmentLocked || isSaving} /></div>}
                    <RiskSubstanceFields
                      value={substanceDraft}
                      onChange={setSubstanceDraft}
                      disabled={isAssessmentLocked || isSaving || !substanceEditEnabled}
                      loadPicOptions={loadPicOptions}
                      showMitigations={!isMonitoringRoute}
                    />
                  </FormGroup>
                </FormPanel>
              </CollapsibleCard.Content>
            </CollapsibleCard.Root>}

            {/* Approval Line */}
            {!isMonitoringRoute &&
              riskApprovalCapabilityBehavior.showsApprovalLineEditor &&
              (!id || draftRisk.status === "draft") && (
                <CollapsibleCard.Root
                  appearance="form"
                  id="approval-line"
                  className="scroll-mt-28"
                >
                  <CollapsibleCard.Trigger className="sm:px-5">
                    <CollapsibleCard.Header>
                      <CollapsibleCard.Icon />
                      <CollapsibleCard.Title className="overflow-visible whitespace-normal text-base font-medium">
                        Rantai Persetujuan
                      </CollapsibleCard.Title>
                    </CollapsibleCard.Header>
                    <CollapsibleCard.Actions>
                      <Badge
                        variant="outline"
                        className={cn(
                          "transition-colors",
                          isApprovalLineReady
                            ? ""
                            : "",
                        )}
                      >
                        {isApprovalLineReady ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <CircleDot className="size-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          {isApprovalLineReady ? "Lengkap" : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </CollapsibleCard.Actions>
                  </CollapsibleCard.Trigger>
                  <CollapsibleCard.Content>
                    <FormPanel>
                      <FormGroup className="space-y-3">
                        <div className="space-y-1.5">
                          <FieldHeading>
                            <Label className="text-sm font-medium text-foreground">
                              Reviewer (Pemeriksa)
                              <span className="text-destructive ml-0.5">*</span>
                            </Label>
                            <p className="leading-4 text-xs text-muted-foreground">
                              Pilih reviewer yang akan memeriksa dan memberikan skor
                              penilaian resmi sebelum risiko ini diajukan ke
                              pimpinan.
                            </p>
                          </FieldHeading>
                        </div>
                        <RemoteUserPicker
                          title="Pilih Reviewer"
                          description="Cari reviewer yang akan memeriksa dan memberikan penilaian resmi untuk pemantauan ini."
                          placeholder="Pilih reviewer"
                          searchPlaceholder="Cari nama reviewer"
                          emptyMessage="Reviewer tidak ditemukan."
                          value={reviewerOption}
                          onSelect={handleReviewerSelect}
                          loadOptions={loadReviewerOptions}
                          disabled={isAssessmentLocked || isSaving}
                        />
                      </FormGroup>
                      <FormGroup className="space-y-4">
                        <div className="space-y-1.5">
                          <FieldHeading>
                            <Label className="text-sm font-medium text-foreground">
                              Rantai Persetujuan (Pimpinan)
                              <span className="text-destructive ml-0.5">*</span>
                            </Label>
                            <p className="leading-4 text-xs text-muted-foreground">
                              Susun rantai persetujuan pimpinan. Persetujuan
                              dilakukan secara berurutan.
                            </p>
                          </FieldHeading>
                        </div>

                        <OrderedUserSelectionTable
                          rows={approvalLine}
                          loadOptions={loadApproverOptions}
                          onSelectRow={handleApproverSelect}
                          onAddRow={handleAddApproverRow}
                          onRemoveRow={removeApprover}
                          onMoveRow={moveApprover}
                          pickerTitle="Pilih pimpinan"
                          pickerDescription="Cari pimpinan untuk disusun ke dalam rantai persetujuan berurutan."
                          pickerPlaceholder="Pilih pimpinan"
                          pickerSearchPlaceholder="Cari nama approver"
                          pickerEmptyMessage="Pimpinan tidak ditemukan."
                          emptyStateMessage="Belum ada pimpinan. Tambahkan minimal satu user sebelum klik Ajukan review."
                          addRowLabel="Tambah Pimpinan"
                          footerNote="Urutan baris menentukan sequence persetujuan pimpinan."
                          dndGroup="assessment-approval-line"
                        />
                      </FormGroup>
                    </FormPanel>
                  </CollapsibleCard.Content>
                </CollapsibleCard.Root>
              )}
          </div>
          {isMonitoringRoute && monitoringSummary}
        </div>

        {!isMonitoringRoute && (
          <aside className="min-w-0 space-y-6 xl:sticky xl:top-6 xl:self-start">
            {monitoringSummary}
            <ReviewSidePanel
              approvalId={approvalId}
              approvalWorkflow={approvalWorkflow}
              currentUserId={user?.id}
              riskStatus={draftRisk.status}
              userRole={user?.role || ""}
              inherentScore={Math.round(computedNilai)}
              token={token || undefined}
              allowStatusFallbackWorkflowStage={
                riskApprovalCapabilityBehavior.riskApprovalWorkflowEnabled
              }
              onActionComplete={loadRiskData}
              onNavigateToLog={() =>
                router.push(`/risk/register/${sourceRisk.id}`)
              }
            />
          </aside>
        )}
      </div>
      <RiskScoreHeatmapModal open={targetPickerOpen} onOpenChange={setTargetPickerOpen} title="Target risiko residual" probability={substanceDraft.targetProbability || 1} impact={substanceDraft.targetImpact || 1} onApply={({probability,impact})=>setSubstanceDraft(current=>({...current,targetProbability:probability,targetImpact:impact}))} />
      <RiskScoreHeatmapModal
        open={scorePickerOpen}
        onOpenChange={setScorePickerOpen}
        title="Pilih skor risiko observasi"
        description="Pilih kombinasi probabilitas dan dampak untuk melihat skor serta level risikonya."
        probability={probability}
        impact={impact}
        onApply={({ probability: nextProbability, impact: nextImpact }) => {
          if (isAssessmentLocked || isSaving) return;
          if (isMonitoringRoute) setScoreReviewed(true);
          form.setValue("probability", nextProbability, {
            shouldDirty: true,
            shouldValidate: true,
          });
          form.setValue("impact", nextImpact, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
      <AlertDialog
        open={showSubmitReviewConfirm}
        onOpenChange={(open) => { if (!isSaving) setShowSubmitReviewConfirm(open); }}
      >
        <AlertDialogContent data-monitoring-finalize-dialog={isMonitoringRoute ? "" : undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              {isMonitoringRoute ? isRevision ? "Tinjau finalisasi revisi" : "Tinjau finalisasi pemantauan" : (
              riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Finalisasi pemantauan?"
                : "Ajukan Pemantauan untuk Review?")}
            </AlertDialogTitle>
            <AlertDialogDescription>Tinjau seluruh bagian sebelum melanjutkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            {isMonitoringRoute
                ? isRevision ? "Versi profil baru akan aktif setelah revisi difinalisasi." : "Finalisasi mengunci hasil pengamatan dan seluruh laporan mitigasi periode ini."
                : riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Pemantauan akan dikunci dan snapshot versi resmi akan dibuat. Tindakan ini tidak dapat dibatalkan."
                : "Pemantauan akan disimpan lalu dikirim ke reviewer dan approval line yang sudah dipilih. Pastikan seluruh bagian sudah final sebelum melanjutkan."}
          </ConfirmationConsequences>
          {isMonitoringRoute ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">{isRevision ? "Tanggal berlaku" : "Tanggal pemantauan"}</dt>
              <dd>{observedAt} · {monitoringCycle || "-"}</dd>
              {isRevision && <><dt className="text-muted-foreground">Alasan revisi</dt><dd className="wrap-break-word">{form.watch("changeReason")}</dd></>}
              <dt className="text-muted-foreground">Skor</dt>
              <dd className="tabular-nums">
                {sourceScoreLabel} → {formatRiskScore(computedNilai, "—")}
              </dd>
              <dt className="text-muted-foreground">Versi hasil</dt>
              <dd>{isRevision ? `Versi baru setelah v${sourceRisk.versionNumber || 1}` : `Versi ${sourceRisk.versionNumber || 1}`}</dd>
            </dl>
          ) : null}
          {isMonitoringRoute && !isRevision && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">Rencana tindak lanjut</p>
              <p className="text-muted-foreground">
                {followUpPlans.length > 0
                  ? `${followUpPlans.length} rencana mitigasi menjadi acuan pemantauan.`
                  : "Tidak ada rencana mitigasi pada profil ini."}
              </p>
              {followUpPlans.length > 0 && (
                <ul className="max-h-40 space-y-3 overflow-y-auto rounded-control border px-3 py-2">
                  {followUpPlans.map((plan, index) => (
                    <li key={plan.id ?? index} className="space-y-1">
                      <p className="wrap-break-word">{plan.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.owner || "PIC belum ditetapkan"} · {plan.executionScheduleText || "Jadwal pelaksanaan belum diisi"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {isMonitoringRoute && isCheckingFinalize && <p role="status" className="text-sm text-muted-foreground">Memeriksa laporan penanganan…</p>}
          {isMonitoringRoute && finalizeNotice && (
            <div role="status" className="space-y-2 text-sm">
              <p>{finalizeNotice}</p>
              {reloadDraftRequired && (
                <ActionButton type="button" size="sm" onClick={() => {
                  setShowSubmitReviewConfirm(false);
                  void loadRiskData();
                }}>Muat ulang draf</ActionButton>
              )}
            </div>
          )}
          {isMonitoringRoute && finalizeCheckFailed && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">Status laporan penanganan belum dapat diverifikasi.</p>
              <ActionButton type="button" size="sm" onClick={() => void checkMonitoringFinalization(monitoringDraft, finalizeNotice)}>Coba cek lagi</ActionButton>
            </div>
          )}
          {isMonitoringRoute && monitoringValidation && !monitoringValidation.canFinalize && (
            <p role="alert" className="text-sm text-destructive">Pemantauan belum dapat difinalisasi. Periksa status periode dan coba lagi.</p>
          )}
          {isMonitoringRoute && !isRevision && monitoringValidation && monitoringValidation.pendingTasks === 0 && (
            <p className="text-sm text-muted-foreground">
              {monitoringValidation.totalTasks ? "Semua tindakan penanganan sudah dilaporkan." : "Tidak ada tugas penanganan pada periode ini."}
            </p>
          )}
          {isMonitoringRoute && monitoringValidation && monitoringValidation.pendingTasks > 0 ? (
            <div className="flex items-start gap-2 rounded-lg bg-state-surface px-3 py-3 text-sm text-state-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-medium">{monitoringValidation.pendingTasks} tindakan belum dilaporkan.</span>{" "}
                Status dan laporan task sebelumnya tetap tersimpan. Tinjau rencana tindak lanjut sebelum finalisasi.
              </p>
            </div>
          ) : null}
          {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
            <div className="space-y-2 border-t border-dashed border-border pt-3 text-sm">
              <div>
                <span className="font-medium text-foreground">Reviewer: </span>
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
            </div>
          )}
          {isRevision && substanceDiffs.length > 0 && (
            <section className="space-y-3 text-sm" aria-label="Perubahan substansi">
              <h2 className="font-medium">Perubahan substansi</h2>
              <ul className="max-h-52 space-y-3 overflow-y-auto rounded-control border px-3 py-2">
                {substanceDiffs.map(({ field, label, before, after }) => (
                  <li key={field} className="space-y-1">
                    <p className="font-medium">{label}</p>
                    <dl className="grid gap-2 sm:grid-cols-2">
                      <div><dt className="text-xs text-muted-foreground">Sebelum</dt><dd className="whitespace-pre-line wrap-break-word">{formatRevisionValue(field, before)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Sesudah</dt><dd className="whitespace-pre-line wrap-break-word">{formatRevisionValue(field, after)}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!isRevision && substanceEditEnabled && substanceDiffs.length > 0 && (
            <div className="space-y-2 border-t border-dashed border-amber-500/30 pt-3 text-sm text-amber-800">
              <div>
                <span className="font-medium text-foreground">
                  Perubahan substansi:{" "}
                </span>
                <span className="text-muted-foreground">
                  {substanceDiffSummary}
                </span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default" disabled={isSaving}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              size="default"
              onClick={(event) => {
                if (isMonitoringRoute) event.preventDefault();
                void handleSubmitForReview();
              }}
              disabled={isSaving || isAssessmentLocked || isCheckingFinalize || (isMonitoringRoute && (finalizeBlocked || !monitoringValidation?.canFinalize))}
            >
              {isMonitoringRoute ? (isSaving ? "Memfinalisasi…" : isRevision ? "Finalisasi revisi" : "Finalisasi pemantauan") : "Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(exitHref)} onOpenChange={(open) => { if (!open) setExitHref(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluar dengan perubahan belum disimpan?</AlertDialogTitle>
            <AlertDialogDescription>Periksa perubahan sebelum meninggalkan formulir.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            Perubahan sejak penyimpanan terakhir akan hilang jika Anda keluar tanpa menyimpan. Simpan draf di formulir agar perubahan bisa dilanjutkan nanti.
          </ConfirmationConsequences>
          <AlertDialogFooter>
            <AlertDialogCancel>Lanjut mengisi</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { if (exitHref) router.push(exitHref); }}>Keluar tanpa menyimpan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showDeleteDraftConfirm}
        onOpenChange={(open) => {
          if (!isDeletingDraft) {
            setShowDeleteDraftConfirm(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Hapus draf pemantauan?
            </AlertDialogTitle>
            <AlertDialogDescription>Periksa draf pemantauan yang akan dihapus.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            Draf periode {monitoringCycle || "ini"} beserta perubahan yang
              belum disimpan akan dihapus. Risiko sumber tetap aman. Tindakan
              ini tidak dapat dibatalkan.
          </ConfirmationConsequences>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="default" disabled={isDeletingDraft}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="default"
              className="border-0 !bg-destructive !text-white hover:!bg-destructive/90 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 disabled:!opacity-50"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteMonitoringDraft();
              }}
              disabled={isDeletingDraft}
              aria-busy={isDeletingDraft}
            >
              {isDeletingDraft ? <Loader2 className="size-4 animate-spin" /> : null}
              {isDeletingDraft ? "Menghapus…" : "Hapus draf"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </FormPage>
    </>
  );
}

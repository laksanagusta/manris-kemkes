"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
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
} from "@/components/ui/icons";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationStatusTable } from "./_components/mitigation-status-table";
import { RiskSubstanceFields } from "@/components/risk/risk-substance-fields";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import { getRiskDetail, updateRiskAssessment } from "@/lib/api/risk-assessment";
import {
  deleteMonitoringDraft,
  finalizeMonitoring,
  getMonitoringDetail,
  updateMonitoringDraft,
} from "@/lib/api/risk-monitoring";
import { validateMonitoringFinalize } from "@/lib/api/mitigation-tasks";
import {
  getBobot,
  calculateNilai,
  formatRiskScore,
  resolveRiskAssessmentClassification,
} from "@/lib/risk";
import type { Risk, RiskMitigation } from "@/types/risk";
import type { MonitoringValidationResult } from "@/types/risk";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import { listUsers } from "@/lib/api/users";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import {
  AccentButton,
  ActionButton,
  CollapsibleCard,
  CollectionStatusBadge,
  CollectionPageHeader,
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
  type RiskSubstanceValues,
} from "@/lib/risk-assessment-substance";
import { ProfilRisikoCard } from "../components/profil-risiko-card";
import { MonitoringActionsMenu } from "../components/monitoring-actions-menu";
import { type AssessmentFormValues } from "../components/hasil-pemantauan-card";
import { SimpulanCard } from "../components/simpulan-card";

function dedupeApproverIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
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
  const status = monitoring.status === "final" ? "final" : "draft";

  return {
    ...base,
    id: monitoring.resultRisk?.id ?? monitoring.id,
    title: monitoring.draftTitle || base.title,
    description: monitoring.draftDescription || base.description,
    category: monitoring.draftCategory || base.category,
    cause: monitoring.draftCause?.length ? monitoring.draftCause : base.cause,
    riskSource: monitoring.draftRiskSource || base.riskSource,
    controllability: monitoring.draftControllability || base.controllability,
    impactDesc: monitoring.draftImpactDesc?.length
      ? monitoring.draftImpactDesc
      : base.impactDesc,
    existingControl: monitoring.draftExistingControl || base.existingControl,
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
    mitigations:
      (monitoring.draftMitigations?.length
        ? (monitoring.draftMitigations as RiskMitigation[])
        : base.mitigations) ?? [],
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

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { token, user } = useAuth();
  // The former /risk/assessment route is retained as a URL compatibility
  // alias, but it must use the same monitoring transaction flow. There is no
  // standalone profile-edit/reassessment screen anymore.
  const isMonitoringRoute =
    pathname.startsWith("/risk/monitoring") ||
    pathname.startsWith("/risk/assessment");
  const backTarget = isMonitoringRoute
    ? "/risk/register"
    : "/risk/assessment";
  const monitoringListTarget = "/compliance/monitoring";
  const riskApprovalCapabilityBehavior = useMemo(
    () => getRiskApprovalCapabilityBehavior(user?.capabilities),
    [user?.capabilities],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<AssessmentLoadError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingFinalize, setIsCheckingFinalize] = useState(false);
  const [monitoringValidation, setMonitoringValidation] =
    useState<MonitoringValidationResult | null>(null);
  const [draftRisk, setDraftRisk] = useState<Risk | null>(null);
  const [sourceRisk, setSourceRisk] = useState<Risk | null>(null);
  const [monitoringDraft, setMonitoringDraft] =
    useState<RiskMonitoringDetail | null>(null);
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
    isMonitoringRoute || riskApprovalCapabilityBehavior.usesDirectApprovalCopy
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

  const openSubmitReviewConfirm = async () => {
    submitTarget.current = "review";

    if (isMonitoringRoute) {
      if (!isAssessmentSectionReady) {
        toast.error("Lengkapi skor risiko sebelum finalisasi.");
        return;
      }
      if (token && id) {
        setIsCheckingFinalize(true);
        try {
          setMonitoringValidation(await validateMonitoringFinalize(token, id));
        } catch (error) {
          setMonitoringValidation(null);
          toast.error("Status mitigasi belum dapat diverifikasi", {
            description: error instanceof Error ? error.message : "Silakan coba lagi.",
          });
        } finally {
          setIsCheckingFinalize(false);
        }
      }
      setShowSubmitReviewConfirm(true);
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
        const source = monitoring.sourceRisk
          ? monitoring.sourceRisk
          : await getRiskDetail(token, monitoring.sourceRiskId);
        const syntheticDraft = buildRiskFromMonitoring(monitoring, source);

        setMonitoringDraft(monitoring);
        setDraftRisk(syntheticDraft);
        setSourceRisk(source);
        setSubstanceEditEnabled(monitoring.mode === "with_profile_revision");
        setSubstanceDraft(buildSubstanceDefaults(syntheticDraft));
        form.reset({
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

      form.reset({
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
        form.reset({
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
  }, [id, token, form, isMonitoringRoute]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  useEffect(() => {
    if (!isMonitoringRoute || draftRisk?.status === "final" || !form.formState.isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [draftRisk?.status, form.formState.isDirty, isMonitoringRoute]);

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
    if (!token || !id || !draftRisk) return;
    if (
      draftRisk.status === "final"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    const isFinalizing = submitTarget.current === "review";
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
        const monitoringPayload = {
          observedProbability: values.probability,
          observedImpact: values.impact,
          conclusion: values.reviewSummary,
          mitigationProgressSummary:
            monitoring?.mitigationProgressSummary || "",
          mitigationCompletionPercent:
            monitoring?.mitigationCompletionPercent || 0,
          values: {
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
            mitigations:
              (substanceEditEnabled ? substanceDraft.mitigations : null) ??
              mergedSubstance.mitigations ??
              draftRisk.mitigations ??
              (draftRisk.mitigation ? [draftRisk.mitigation] : []),
            probability: values.probability,
            impact: values.impact,
            conclusion: values.reviewSummary,
            changeReason: values.changeReason,
          },
        };

        const updatedMonitoring = await updateMonitoringDraft(token, id, monitoringPayload);
        draftSaved = true;
        form.reset(values);
        setMonitoringDraft(updatedMonitoring);
        setDraftRisk(buildRiskFromMonitoring(updatedMonitoring, sourceRisk));
        if (isFinalizing) {
          try {
            const finalized = await finalizeMonitoring(token, id);
            setShowSubmitReviewConfirm(false);
            toast.success(`Pemantauan ${monitoring?.assessmentCycle || ""} berhasil difinalisasi`);
            setMonitoringDraft(finalized);
            setDraftRisk(buildRiskFromMonitoring(finalized, sourceRisk));
          } catch (finalizeError) {
            toast.error("Draft tersimpan, tetapi finalisasi gagal.", {
              description:
                finalizeError instanceof Error
                  ? finalizeError.message
                  : "Silakan cek kembali kesiapan data lalu coba lagi.",
            });
          }
        } else {
          toast.success("Transaksi pemantauan berhasil disimpan");
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
      toast.error(draftSaved ? "Draft tersimpan, tetapi ada langkah berikutnya yang gagal." : "Gagal menyimpan pemantauan", {
        description: (error as Error).message || "Silakan coba lagi",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex h-[50vh] w-full items-center justify-center rounded-lg bg-state-surface text-state-foreground"
        role="status"
        aria-live="polite"
        aria-label="Memuat data pemantauan"
      >
        <div className="flex flex-col items-center gap-4 text-state-foreground">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          <p>Memuat data pemantauan...</p>
        </div>
      </div>
    );
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

  const isAssessmentLocked =
    draftRisk.status === "final";
  const monitoringCycle = monitoringDraft?.assessmentCycle || draftRisk.assessmentCycle || "";
  const hasFinalResult = isMonitoringRoute && isAssessmentLocked;
  const resultRiskHref = monitoringDraft?.resultRiskId
    ? `/risk/register/${monitoringDraft.resultRiskId}`
    : null;
  const monitoringHeaderBadges = (
    <div className="flex flex-wrap items-center gap-2">
      <CollectionStatusBadge
        tone={draftRisk.status === "final" ? "success" : "neutral"}
        className={
          draftRisk.status === "final"
            ? undefined
            : "!bg-[#0000000a] !text-[#8f8e8e]"
        }
      >
        {assessmentStatusLabel[draftRisk.status] ?? draftRisk.status}
      </CollectionStatusBadge>
      <Badge
        size="compact"
        tone="neutral"
        className="bg-muted font-mono text-[10px] text-muted-foreground"
      >
        {sourceRisk.code || sourceRisk.riskCode}
      </Badge>
      <Badge
        size="compact"
        tone="neutral"
        className="bg-muted text-muted-foreground"
      >
        Versi {draftRisk.versionNumber}
      </Badge>
      {monitoringCycle ? (
        <Badge
          size="compact"
          tone="neutral"
          className="bg-muted font-mono text-[10px] text-muted-foreground"
        >
          {monitoringCycle}
        </Badge>
      ) : null}
    </div>
  );

  const monitoringHeaderActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isAssessmentLocked ? (
        <span
          className={cn(
            "mr-1 inline-flex min-h-9 min-w-[7rem] items-center justify-end text-[11px]",
            form.formState.isDirty
              ? "text-amber-700"
              : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {isSaving
            ? "Menyimpan…"
            : form.formState.isDirty
              ? "Belum disimpan"
              : `Tersimpan${monitoringDraft?.updatedAt ? ` ${new Date(monitoringDraft.updatedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}`}
        </span>
      ) : null}
      <TooltipProvider>
        {isMonitoringRoute ? (
          <MonitoringActionsMenu
            risk={sourceRisk}
            canDeleteDraft={!isAssessmentLocked && Boolean(monitoringDraft?.id)}
            deleteDisabled={isSaving || isCheckingFinalize || isDeletingDraft}
            onDeleteDraft={openDeleteDraftConfirm}
          />
        ) : null}
        {!isAssessmentLocked ? (
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton
              variant="outline"
              icon={<Save className="size-3.5" />}
              loading={isSaving && submitTarget.current === "draft"}
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              Simpan draft
            </ActionButton>
            <AccentButton
              icon={
                (isSaving && submitTarget.current === "review") ||
                isCheckingFinalize ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )
              }
              onClick={openSubmitReviewConfirm}
              disabled={isSaving || isCheckingFinalize}
            >
              {isCheckingFinalize ? "Memeriksa kesiapan…" : submitActionLabel}
            </AccentButton>
          </div>
        ) : null}
        {hasFinalResult && resultRiskHref ? (
          <ActionButton asChild variant="outline" size="md">
            <Link href={resultRiskHref}>Lihat versi hasil</Link>
          </ActionButton>
        ) : null}
      </TooltipProvider>
    </div>
  );

  return (
    <>
      <FormPage
        className="risk-form-filter-controls space-y-6"
      >
      {isMonitoringRoute ? (
        <div className="w-full min-w-0">
          <CollectionPageHeader
            actionsPlacement="top"
            title={
              hasFinalResult
                ? "Hasil Pemantauan Risiko"
                : "Pemantauan"
            }
            actions={monitoringHeaderActions}
          />
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
                      size="md"
                      className="gap-2 border-primary/20 text-xs font-semibold hover:bg-primary/5 hover:text-primary"
                      onClick={handleSaveDraft}
                      disabled={isSaving || isAssessmentLocked}
                    >
                      {isSaving && submitTarget.current === "draft" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}{" "}
                      Simpan draft
                    </Button>
                    <Button
                      size="md"
                      className="gap-2"
                      onClick={openSubmitReviewConfirm}
                      disabled={isSaving || isCheckingFinalize || isAssessmentLocked}
                    >
                      {(isSaving && submitTarget.current === "review") || isCheckingFinalize ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}{" "}
                      {isCheckingFinalize ? "Memeriksa kesiapan…" : submitActionLabel}
                    </Button>
                  </div>
                )}
              </TooltipProvider>
            </div>
          }
        />
      )}
      <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {!isMonitoringRoute ? (
            <ProfilRisikoCard
              risk={sourceRisk}
              detailHref={`/risk/register/${sourceRisk.id}`}
              compact={isMonitoringRoute}
            />
          ) : null}

          <div className="space-y-6">
            <CollapsibleCard.Root className="scroll-mt-28">
              <CollapsibleCard.Trigger className="flex-wrap">
                <CollapsibleCard.Header className="min-w-0 flex-1">
                  <CollapsibleCard.Icon />
                  <CollapsibleCard.Title>
                    Hasil Pemantauan
                  </CollapsibleCard.Title>
                </CollapsibleCard.Header>
                <CollapsibleCard.Actions className="ms-auto flex-wrap justify-end">
                  {monitoringHeaderBadges}
                </CollapsibleCard.Actions>
              </CollapsibleCard.Trigger>
              <CollapsibleCard.Content>
              <CollapsibleCard.Body className="space-y-5 border-t-0 px-5 py-5 text-sm">
                  <div className="grid min-w-0 gap-6">
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
                        activityStage: m.activityStage ?? "",
                        expectedOutput: m.expectedOutput ?? "",
                        quantitativeTarget: m.quantitativeTarget ?? "",
                        supportingUnit: m.supportingUnit ?? "",
						resourcesRequired: m.resourcesRequired ?? "",
						contingencyPlan: m.contingencyPlan ?? "",
						potentialObstacle: m.potentialObstacle ?? "",
						isBreakthroughActivity:
                          m.isBreakthroughActivity ?? false,
                        isExistingControl: m.isExistingControl ?? false,
                      }),
                    );

                    if (isMonitoringRoute) return null;

                    return mitigationItems.length > 0 ? (
                      <div className="w-full min-w-0 space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Rencana Penanganan (dari versi terakhir yang
                          disetujui)
                        </Label>
                        <MitigationTable
                          items={mitigationItems}
                          onChange={() => {}}
                          disabled
                        />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-sm font-medium text-foreground">
                          Rencana Penanganan
                        </Label>
                        <p className="text-sm text-muted-foreground italic mt-2">
                          Belum ada rencana penanganan
                        </p>
                      </div>
                    );
                  })()}

                  <div className="flex min-w-0 flex-col gap-3">
                    <Label htmlFor="risk-score-picker" className="text-sm font-medium">
                      Skor Risiko Observasi<span className="text-destructive"> *</span>
                    </Label>
                    <RiskScorePickerTrigger
                      id="risk-score-picker"
                      title="Skor risiko observasi"
                      probability={probability}
                      impact={impact}
                      onClick={() => setScorePickerOpen(true)}
                      disabled={isAssessmentLocked}
                      aria-describedby={
                        form.formState.errors.probability || form.formState.errors.impact
                          ? "risk-score-error"
                          : undefined
                      }
                    />
                    <FieldErrorMessage id="risk-score-error">
                      {form.formState.errors.probability ||
                      form.formState.errors.impact
                        ? form.formState.errors.probability?.message ||
                          form.formState.errors.impact?.message ||
                          "Probabilitas dan dampak wajib diisi"
                        : undefined}
                    </FieldErrorMessage>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="change-reason">
                      Alasan Perubahan
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
                          placeholder="Jelaskan bukti atau pertimbangan yang mendasari perubahan..."
                          className="min-h-[100px] text-base sm:text-sm"
                          disabled={isAssessmentLocked}
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
                      {isMonitoringRoute ? "Simpulan Pemantauan" : "Ringkasan Review / Saran Tindak Lanjut"}
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
                          className="min-h-[100px] text-base sm:text-sm"
                          disabled={isAssessmentLocked}
                        />
                      )}
                    />
                    <FieldErrorMessage id="monitoring-conclusion-error">
                      {form.formState.errors.reviewSummary
                        ? form.formState.errors.reviewSummary.message || "Wajib diisi"
                        : undefined}
                    </FieldErrorMessage>
                  </div>
                  </div>
                </CollapsibleCard.Body>
              </CollapsibleCard.Content>
            </CollapsibleCard.Root>

            <CollapsibleCard.Root
              className="scroll-mt-28"
              defaultOpen={false}
            >
              <CollapsibleCard.Trigger>
                <CollapsibleCard.Header>
                  <CollapsibleCard.Icon />
                  <CollapsibleCard.Text>
                    <CollapsibleCard.Title>
                      Perubahan Substansi Risiko
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
                      "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                      substanceEditEnabled
                        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                        : "bg-muted/40 text-muted-foreground",
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
                <CollapsibleCard.Body className="space-y-5 border-t-0 px-5 py-5 text-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-foreground">
                        Aktifkan edit substansi risiko
                      </Label>
                      <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                        Gunakan bagian ini jika ada perubahan data risiko
                      </p>
                    </div>
                    <Switch
                      id="substance-edit-enabled"
                      aria-label="Aktifkan edit substansi risiko"
                      checked={substanceEditEnabled}
                      onCheckedChange={setSubstanceEditEnabled}
                      disabled={isAssessmentLocked}
                    />
                  </div>

                  {substanceEditEnabled ? (
                    <div className="mt-3 space-y-2 border-t border-dashed border-border/60 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-700"
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
                  <RiskSubstanceFields
                    value={substanceDraft}
                    onChange={setSubstanceDraft}
                    disabled={isAssessmentLocked || !substanceEditEnabled}
                    loadPicOptions={loadPicOptions}
                  />
                </CollapsibleCard.Body>
              </CollapsibleCard.Content>
            </CollapsibleCard.Root>

            {/* Approval Line */}
            {!isMonitoringRoute &&
              riskApprovalCapabilityBehavior.showsApprovalLineEditor &&
              (!id || draftRisk.status === "draft") && (
                <CollapsibleCard.Root
                  id="approval-line"
                  className="scroll-mt-28"
                >
                  <CollapsibleCard.Trigger>
                    <CollapsibleCard.Header>
                      <CollapsibleCard.Icon />
                      <CollapsibleCard.Title>
                        Rantai Persetujuan
                      </CollapsibleCard.Title>
                    </CollapsibleCard.Header>
                    <CollapsibleCard.Actions>
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
                          {isApprovalLineReady ? "Lengkap" : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </CollapsibleCard.Actions>
                  </CollapsibleCard.Trigger>
                  <CollapsibleCard.Content>
                    <CollapsibleCard.Body className="space-y-5 border-t-0 px-5 py-5 text-sm">
                      <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground">
                          Reviewer (Pemeriksa)
                          <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Pilih reviewer yang akan memeriksa dan memberikan skor
                          penilaian resmi sebelum risiko ini diajukan ke
                          pimpinan.
                        </p>
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
                        disabled={false}
                      />
                      </div>

                      <div className="space-y-4 border-t border-border/60 pt-5">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-foreground">
                          Rantai Persetujuan (Pimpinan)
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
                      </div>
                    </CollapsibleCard.Body>
                  </CollapsibleCard.Content>
                </CollapsibleCard.Root>
              )}
          </div>
        </div>

        {/* Right Column / Side Panel */}
        <aside className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <div className="space-y-6">
            <Card className="gap-0 overflow-hidden rounded-lg bg-card p-0 transition-colors duration-300">
              <CardContent className="px-5 py-5 text-sm">
                <section aria-labelledby="monitoring-side-summary">
                  <h2
                    id="monitoring-side-summary"
                    className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                  >
                    Simpulan Pemantauan
                  </h2>
                  <div className="mt-3">
                    <SimpulanCard
                      nilaiCurrent={
                        sourceRisk.nilai ?? sourceRisk.inherentScore ?? 0
                      }
                      currentInherentScore={sourceRisk.inherentScore}
                      nilaiBaru={computedNilai}
                      probability={probability}
                      impact={impact}
                    />
                  </div>
                </section>
                {isMonitoringRoute && monitoringDraft?.id ? (
                  <section
                    aria-labelledby="monitoring-side-mitigation"
                    className="mt-5 border-t border-dashed border-border/70 pt-5"
                  >
                    <h2
                      id="monitoring-side-mitigation"
                      className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground/70"
                    >
                      Pelaksanaan Mitigasi
                    </h2>
                    <div className="mt-3">
                      <MitigationStatusTable monitoringId={monitoringDraft.id} />
                    </div>
                  </section>
                ) : null}
              </CardContent>
            </Card>
            {!isMonitoringRoute && (
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
            )}
          </div>
        </aside>
      </div>
      <RiskScoreHeatmapModal
        open={scorePickerOpen}
        onOpenChange={setScorePickerOpen}
        title="Pilih skor risiko observasi"
        description="Pilih kombinasi probabilitas dan dampak untuk melihat skor serta level risikonya."
        probability={probability}
        impact={impact}
        onApply={({ probability: nextProbability, impact: nextImpact }) => {
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
        onOpenChange={setShowSubmitReviewConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              {isMonitoringRoute ||
              riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Finalisasi pemantauan?"
                : "Ajukan Pemantauan untuk Review?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isMonitoringRoute ||
              riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Pemantauan akan dikunci dan snapshot versi resmi akan dibuat. Tindakan ini tidak dapat dibatalkan."
                : "Pemantauan akan disimpan lalu dikirim ke reviewer dan approval line yang sudah dipilih. Pastikan seluruh bagian sudah final sebelum melanjutkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isMonitoringRoute ? (
            <div className="grid gap-x-6 gap-y-3 py-1 text-sm sm:grid-cols-2">
              <div className="space-y-0.5">
                <span className="text-xs uppercase text-muted-foreground">Periode</span>
                <p className="font-medium">{monitoringCycle || "-"}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs uppercase text-muted-foreground">Skor</span>
                <p className="font-medium tabular-nums">
                  {formatRiskScore(
                    monitoringDraft?.sourceNilai ??
                      sourceRisk.nilai ??
                      sourceRisk.inherentScore,
                    "—",
                  )} → {formatRiskScore(computedNilai, "—")}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs uppercase text-muted-foreground">Versi hasil</span>
                <p className="font-medium">
                  v{(monitoringDraft?.sourceVersionNumber ?? sourceRisk.versionNumber ?? 0) + 1}
                </p>
              </div>
          </div>
          ) : null}
          {isMonitoringRoute && monitoringValidation && monitoringValidation.pendingTasks > 0 ? (
            <div className="flex items-start gap-2 rounded-lg bg-state-surface px-3 py-3 text-sm text-state-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>
                <span className="font-medium">{monitoringValidation.pendingTasks} mitigasi belum dilaporkan.</span>{" "}
                Jika dilanjutkan, mitigasi tersebut akan berstatus{" "}
                <Badge
                  size="compact"
                  tone="neutral"
                  className="!bg-[#0000000a] !text-[#8f8e8e]"
                >
                  Tidak dilaporkan
                </Badge>.
              </p>
            </div>
          ) : null}
          {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
            <div className="space-y-2 border-t border-dashed border-border/70 pt-3 text-sm">
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
          {substanceEditEnabled && substanceDiffs.length > 0 && (
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
            <AlertDialogCancel variant="outline" size="md">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
              onClick={handleSubmitForReview}
              disabled={isSaving || isAssessmentLocked || isCheckingFinalize}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {isMonitoringRoute ? "Finalisasi" : "Lanjutkan"}
            </AlertDialogAction>
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
            <AlertDialogDescription>
              Draf periode {monitoringCycle || "ini"} beserta perubahan yang
              belum disimpan akan dihapus. Risiko sumber tetap aman. Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline" size="md" disabled={isDeletingDraft}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="md"
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

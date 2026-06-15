"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  CircleDot,
  CheckCircle2,
  PencilLine,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";
import { MitigationStatusTable } from "./_components/mitigation-status-table";
import { ProbabilityCriteriaTooltip } from "@/components/shared/probability-criteria-tooltip";
import { RiskSubstanceFields } from "@/components/risk/risk-substance-fields";
import { Switch } from "@/components/ui/switch";

import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import { getRiskDetail, updateRiskAssessment } from "@/lib/api/risk-assessment";
import {
  finalizeMonitoring,
  getMonitoringDetail,
  updateMonitoringDraft,
} from "@/lib/api/risk-monitoring";
import {
  getBobot,
  calculateNilai,
  PROBABILITY_LABELS,
  IMPACT_LABELS,
  levelToColor,
  getRiskLevelFromNilai,
  resolveRiskAssessmentClassification,
} from "@/lib/risk";
import type { Risk, RiskMitigation } from "@/types/risk";
import type { RiskMonitoringDetail } from "@/types/risk-monitoring";
import { listUsers } from "@/lib/api/users";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  needsSubstanceChangeReason,
  type RiskSubstanceValues,
} from "@/lib/risk-assessment-substance";
import { ProfilRisikoCard } from "../components/profil-risiko-card";
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
  const status =
    monitoring.status === "finalized" ? "approved" : "assessment_draft";

  return {
    ...base,
    id: monitoring.resultRisk?.id ?? monitoring.id,
    title: monitoring.draftTitle || base.title,
    category: monitoring.draftCategory || base.category,
    cause: monitoring.draftCause?.length ? monitoring.draftCause : base.cause,
    riskSource: monitoring.draftRiskSource || base.riskSource,
    controllability:
      monitoring.draftControllability || base.controllability,
    impactDesc: monitoring.draftImpactDesc?.length
      ? monitoring.draftImpactDesc
      : base.impactDesc,
    existingControl:
      monitoring.draftExistingControl || base.existingControl,
    controlEffectiveness:
      monitoring.draftControlEffectiveness || base.controlEffectiveness,
    treatmentOption:
      monitoring.draftTreatmentOption || base.treatmentOption,
    probability: monitoring.observedProbability || base.probability,
    impact: monitoring.observedImpact || base.impact,
    weight: monitoring.observedWeight || base.weight,
    nilai: monitoring.observedNilai || base.nilai,
    inherentScore:
      Math.round(monitoring.observedNilai || base.nilai || base.inherentScore) ||
      base.inherentScore,
    status,
    assessmentCycle: monitoring.assessmentCycle || base.assessmentCycle,
    reviewType: "periodic",
    reviewSummary: monitoring.conclusion || base.reviewSummary,
    changeReason: monitoring.changeReason || base.changeReason,
    previousRiskId: monitoring.sourceRiskId || base.previousRiskId || null,
    versionNumber: monitoring.sourceVersionNumber + 1,
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
  assessment_draft: "Draf Pemantauan",
  assessment_in_review: "Dalam Review",
  approved: "Disetujui",
};

const assessmentStatusBadgeClass: Record<string, string> = {
  assessment_draft: "border-border bg-muted/40 text-muted-foreground",
  assessment_in_review: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
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

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { token, user } = useAuth();
  const isMonitoringRoute = pathname.startsWith("/risk/monitoring");
  const backTarget = isMonitoringRoute
    ? "/risk/register?tab=monitoring-transactions"
    : "/risk/assessment";
  const riskApprovalCapabilityBehavior = useMemo(
    () => getRiskApprovalCapabilityBehavior(user?.capabilities),
    [user?.capabilities],
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const probability = form.watch("probability");
  const impact = form.watch("impact");

  const computedBobot = getBobot(probability, impact);
  const computedNilai = calculateNilai(probability, impact, computedBobot);
  const substanceDiffs = useMemo(
    () => diffRiskSubstance(sourceRisk, substanceDraft),
    [sourceRisk, substanceDraft],
  );
  const substanceChangeReasonNeeded = useMemo(
    () =>
      needsSubstanceChangeReason(
        sourceRisk,
        substanceDraft,
        substanceEditEnabled,
      ),
    [sourceRisk, substanceDraft, substanceEditEnabled],
  );
  const substanceDiffSummary = useMemo(
    () => formatSubstanceDiffSummary(sourceRisk, substanceDraft),
    [sourceRisk, substanceDraft],
  );
  const selectedApprovalLine = approvalLine.filter((member) => member.id);
  const isApprovalLineReady =
    selectedApprovalLine.length > 0 &&
    approvalLine.every((member) => member.id);
  const isAssessmentSectionReady =
    Boolean(form.watch("reviewSummary")?.trim()) &&
    (isMonitoringRoute || Boolean(form.watch("changeReason")?.trim()));
  const submitActionLabel =
    isMonitoringRoute
      ? "Finalisasi pemantauan"
      : riskApprovalCapabilityBehavior.usesDirectApprovalCopy
      ? "Finalisasi pemantauan"
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

  const openSubmitReviewConfirm = () => {
    submitTarget.current = "review";

    if (isMonitoringRoute) {
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
      draftRisk?.status === "assessment_in_review" ||
      draftRisk?.status === "approved"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    submitTarget.current = "draft";
    await form.handleSubmit(onSubmit)();
  };

  const handleSubmitForReview = async () => {
    if (
      draftRisk?.status === "assessment_in_review" ||
      draftRisk?.status === "approved"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    submitTarget.current = "review";
    setShowSubmitReviewConfirm(false);
    await form.handleSubmit(onSubmit)();
  };

  const loadRiskData = useCallback(async () => {
    if (!token || !id) return;

    try {
      setIsLoading(true);
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
        toast.error(
          isMonitoringRoute
            ? "Data transaksi pemantauan tidak ditemukan."
            : "Data risiko tidak ditemukan.",
        );
        return;
      }
      toast.error("Gagal memuat data risiko", {
        description:
          (error as Error).message || "Terjadi kesalahan yang tidak diketahui",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, token, form, isMonitoringRoute]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  const onSubmit = async (values: AssessmentFormValues) => {
    if (!token || !id || !draftRisk) return;
    if (
      draftRisk.status === "assessment_in_review" ||
      draftRisk.status === "approved"
    ) {
      toast.info("Pemantauan yang sudah diajukan tidak dapat diedit lagi.");
      return;
    }
    setIsSaving(true);
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
          conditionSummary: monitoring?.conditionSummary || "",
          eventSummary: monitoring?.eventSummary || "",
          trend: monitoring?.trend || "",
          effectivenessConclusion: monitoring?.effectivenessConclusion || "",
          followUpNote: monitoring?.followUpNote || "",
          conclusion: values.reviewSummary,
          mitigationProgressSummary: monitoring?.mitigationProgressSummary || "",
          mitigationCompletionPercent:
            monitoring?.mitigationCompletionPercent || 0,
          mitigationObstacles: monitoring?.mitigationObstacles || "",
          mitigationFollowUp: monitoring?.mitigationFollowUp || "",
          values: {
            title: mergedSubstance.title ?? draftRisk.title,
            category: mergedSubstance.category ?? draftRisk.category,
            cause: mergedSubstance.cause ?? (draftRisk.cause || []),
            riskSource: mergedSubstance.riskSource ?? (draftRisk.riskSource || ""),
            controllability:
              mergedSubstance.controllability ??
              (draftRisk.controllability || ""),
          impactDesc: mergedSubstance.impactDesc ?? (draftRisk.impactDesc || []),
          existingControl:
            mergedSubstance.existingControl ?? (draftRisk.existingControl || ""),
          controlEffectiveness:
            mergedSubstance.controlEffectiveness ??
            (draftRisk.controlEffectiveness || ""),
          treatmentOption:
            mergedSubstance.treatmentOption ?? (draftRisk.treatmentOption || ""),
            mitigations:
              mergedSubstance.mitigations ??
              draftRisk.mitigations ??
              (draftRisk.mitigation ? [draftRisk.mitigation] : []),
            probability: values.probability,
            impact: values.impact,
            conditionSummary: monitoring?.conditionSummary || "",
            eventSummary: monitoring?.eventSummary || "",
            effectiveness: monitoring?.effectivenessConclusion || "",
            conclusion: values.reviewSummary,
            changeReason: values.changeReason,
          },
        };

        await updateMonitoringDraft(token, id, monitoringPayload);
        if (submitTarget.current === "review") {
          await finalizeMonitoring(token, id);
          toast.success("Transaksi pemantauan berhasil difinalisasi");
        } else {
          toast.success("Transaksi pemantauan berhasil disimpan");
        }
        await loadRiskData();
        return;
      }

      const isDraftSubmission = submitTarget.current === "draft";
      const submissionStatus =
        isDraftSubmission || riskApprovalCapabilityBehavior.submitsForApproval
          ? draftRisk.status
          : "approved";
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
      toast.error("Gagal menyimpan pemantauan", {
        description: (error as Error).message || "Silakan coba lagi",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p>Memuat data pemantauan...</p>
        </div>
      </div>
    );
  }

  if (!draftRisk || !sourceRisk) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Data risiko tidak ditemukan.</p>
        <Button
          variant="outline"
          onClick={() => router.push(backTarget)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Button>
      </div>
    );
  }

  const isAssessmentLocked =
    draftRisk.status === "assessment_in_review" ||
    draftRisk.status === "approved";
  const defaultAccordionSections =
    !isMonitoringRoute && riskApprovalCapabilityBehavior.showsApprovalLineEditor
      ? ["hasil-pemantauan", "approval-line"]
      : ["hasil-pemantauan"];

  return (
    <FormPage className="max-w-none space-y-6 animate-fade-in">
      <FormHeader
        title="Form Pemantauan Risiko"
        description={
          isAssessmentLocked
            ? "Dokumen pemantauan ini sudah final. Gunakan riwayat versi dan ringkasan risiko untuk meninjau perubahan yang sudah disetujui."
            : "Perbarui skor residual berdasarkan kondisi terbaru, jelaskan perubahan utamanya, lalu kirim untuk review saat seluruh catatan sudah siap."
        }
        badges={
          <>
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                assessmentStatusBadgeClass[draftRisk.status] ??
                  "border-border bg-muted/40 text-muted-foreground",
              )}
            >
              {assessmentStatusLabel[draftRisk.status] ?? draftRisk.status}
            </Badge>
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/[0.06] text-primary"
            >
              {sourceRisk.code || sourceRisk.riskCode}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              Versi {draftRisk.versionNumber}
            </Badge>
          </>
        }
        backLabel={isMonitoringRoute ? "Kembali ke Pemantauan" : "Kembali"}
        onBack={() => router.push(backTarget)}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <TooltipProvider>
              {(draftRisk.status === "assessment_draft" || !id) && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-2 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
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
                    className="gap-2 text-xs font-medium shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={openSubmitReviewConfirm}
                    disabled={
                      isSaving ||
                      isAssessmentLocked
                    }
                  >
                    {isSaving && submitTarget.current === "review" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}{" "}
                    {submitActionLabel}
                  </Button>
                </div>
              )}
            </TooltipProvider>
          </div>
        }
      />
      {/* Form Content */} {/* Form Content */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.85fr)_340px] 2xl:grid-cols-[minmax(0,1.95fr)_360px] xl:items-start">
        {/* Left Column */}
        <div className="space-y-6">
          <ProfilRisikoCard
            risk={sourceRisk}
            detailHref={`/risk/register/${sourceRisk.id}`}
          />

          <Accordion
            type="multiple"
            defaultValue={defaultAccordionSections}
            className="space-y-4"
          >
            <AccordionItem
              value="hasil-pemantauan"
              className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 transition-all"
            >
              <AccordionTrigger className="group px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-600 shadow-inner ring-1 ring-inset ring-zinc-200/80 transition-colors duration-150 ease-out group-hover:bg-white">
                      <ChevronDown
                        className="h-4 w-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180"
                        aria-hidden="true"
                      />
                    </span>
                    <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                      Hasil Pemantauan
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1.5 px-2.5 py-0.5 border-border/15 font-medium transition-colors",
                      isAssessmentSectionReady
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {isAssessmentSectionReady ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <CircleDot className="size-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {isAssessmentSectionReady
                        ? "Siap dikirim"
                        : "Perlu dilengkapi"}
                    </span>
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                <div className="grid gap-6 min-w-0">
                  <div className="rounded-xl border border-border/50 bg-background px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {sourceRisk.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Nilai ulang probabilitas dan dampak residual berdasarkan
                      kondisi terbaru, lalu catat alasan perubahan dengan bahasa
                      yang singkat dan operasional.
                    </p>
                  </div>
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
                        costBenefitNote: m.costBenefitNote ?? "",
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
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                        <Label className="text-sm font-medium text-foreground">
                          Rencana Penanganan
                        </Label>
                        <p className="text-sm text-muted-foreground italic mt-2">
                          Belum ada rencana penanganan
                        </p>
                      </div>
                    );
                  })()}

                  {isMonitoringRoute &&
                    monitoringDraft?.id && (
                      <MitigationStatusTable monitoringId={monitoringDraft.id} />
                    )}

                  <TooltipProvider>
                    <div className="grid w-full min-w-0 grid-cols-1 gap-4">
                      <div className="flex min-w-0 flex-col gap-2">
                        <ProbabilityCriteriaTooltip className="text-sm font-medium" />
                        <Controller
                          control={form.control}
                          name="probability"
                          render={({ field }) => (
                            <div className="grid min-w-0 grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <Tooltip key={val}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isAssessmentLocked}
                                      onClick={() => field.onChange(val)}
                                      className={cn(
                                        "h-10 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                        val === field.value
                                          ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(val, impact, getBobot(val, impact))))} ring-1 font-bold`
                                          : "bg-muted/30 hover:bg-muted/50",
                                      )}
                                    >
                                      {val}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs"
                                  >
                                    {PROBABILITY_LABELS[val]}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )}
                        />
                        {form.formState.errors.probability && (
                          <span className="text-xs text-red-500 font-medium">
                            {form.formState.errors.probability.message ||
                              "Wajib diisi"}
                          </span>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col gap-2">
                        <Label className="flex h-6 items-center text-sm font-medium">
                          Dampak
                        </Label>
                        <Controller
                          control={form.control}
                          name="impact"
                          render={({ field }) => (
                            <div className="grid min-w-0 grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <Tooltip key={val}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isAssessmentLocked}
                                      onClick={() => field.onChange(val)}
                                      className={cn(
                                        "h-10 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                                        val === field.value
                                          ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(probability, val, getBobot(probability, val))))} ring-1 font-bold`
                                          : "bg-muted/30 hover:bg-muted/50",
                                      )}
                                    >
                                      {val}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="text-xs"
                                  >
                                    {IMPACT_LABELS[val]}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </div>
                          )}
                        />
                        {form.formState.errors.impact && (
                          <span className="text-xs text-red-500 font-medium">
                            {form.formState.errors.impact.message ||
                              "Wajib diisi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </TooltipProvider>

                  <div className="flex flex-col gap-2">
                    <Label>Alasan Perubahan Skor</Label>
                    <Controller
                      control={form.control}
                      name="changeReason"
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Tuliskan alasan mengapa skor probabilitas/dampak diubah..."
                          className="min-h-[100px]"
                          disabled={isAssessmentLocked}
                        />
                      )}
                    />
                    {form.formState.errors.changeReason && (
                      <span className="text-xs text-red-500 font-medium">
                        {form.formState.errors.changeReason.message ||
                          "Wajib diisi"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Ringkasan Review / Saran Tindak Lanjut</Label>
                    <Controller
                      control={form.control}
                      name="reviewSummary"
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Tuliskan ringkasan dari hasil review dan rekomendasi tindakan..."
                          className="min-h-[100px]"
                          disabled={isAssessmentLocked}
                        />
                      )}
                    />
                    {form.formState.errors.reviewSummary && (
                      <span className="text-xs text-red-500 font-medium">
                        {form.formState.errors.reviewSummary.message ||
                          "Wajib diisi"}
                      </span>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="perubahan-substansi"
              className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 transition-all"
            >
              <AccordionTrigger className="group px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-zinc-600 shadow-inner ring-1 ring-inset ring-zinc-200/80 transition-colors duration-150 ease-out group-hover:bg-white">
                      <ChevronDown
                        className="h-4 w-4 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180"
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                        Perubahan Substansi Risiko
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Opsional. Buka hanya jika ada perubahan isi risiko,
                        kontrol, atau mitigasi.
                      </p>
                    </div>
                  </div>
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
                        : "Opsional"}
                    </span>
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium text-foreground">
                        Aktifkan edit substansi risiko
                      </Label>
                      <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
                        Section ini dipakai kalau ada perubahan data risiko
                      </p>
                    </div>
                    <Switch
                      checked={substanceEditEnabled}
                      onCheckedChange={setSubstanceEditEnabled}
                      disabled={isAssessmentLocked}
                    />
                  </div>

                  {substanceEditEnabled ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border/60 bg-background/80 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-amber-500/10 text-amber-700"
                        >
                          {substanceDiffs.length > 0
                            ? `${substanceDiffs.length} bidang berubah`
                            : "Belum ada perubahan"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-border/60 bg-background text-muted-foreground"
                        >
                          {substanceChangeReasonNeeded
                            ? "Alasan perubahan opsional"
                            : "Alasan perubahan belum diperlukan"}
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
                </div>

                <div className="rounded-xl border border-border/50 bg-background px-4 py-4">
                  <RiskSubstanceFields
                    value={substanceDraft}
                    onChange={setSubstanceDraft}
                    disabled={isAssessmentLocked || !substanceEditEnabled}
                    loadPicOptions={loadPicOptions}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Accordion Approval Line */}
            {!isMonitoringRoute &&
              riskApprovalCapabilityBehavior.showsApprovalLineEditor &&
              (!id || draftRisk.status === "assessment_draft") && (
                <AccordionItem
                  value="approval-line"
                  id="approval-line"
                  className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 transition-all"
                >
                  <AccordionTrigger className="group px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                    <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                          Rantai Persetujuan
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
                          {isApprovalLineReady ? "Lengkap" : "Perlu dilengkapi"}
                        </span>
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                    <div className="rounded-xl border border-border/60 bg-white p-5 space-y-3">
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

                    <div className="rounded-xl border border-primary/10 bg-white p-5 space-y-4">
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
                  </AccordionContent>
                </AccordionItem>
              )}
          </Accordion>
        </div>

        {/* Right Column / Side Panel */}
        <div className="space-y-4 xl:sticky xl:top-24">
          <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Simpulan Pemantauan
              </p>
            </div>
            <div className="p-4">
              <SimpulanCard
                nilaiCurrent={sourceRisk.nilai ?? sourceRisk.inherentScore ?? 0}
                currentInherentScore={sourceRisk.inherentScore}
                nilaiBaru={computedNilai}
                probability={probability}
                impact={impact}
                targetScore={sourceRisk.targetScore ?? 0}
              />
            </div>
          </div>
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
      </div>
      <AlertDialog
        open={showSubmitReviewConfirm}
        onOpenChange={setShowSubmitReviewConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isMonitoringRoute ||
              riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Finalisasi Pemantauan?"
                : "Ajukan Pemantauan untuk Review?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isMonitoringRoute ||
              riskApprovalCapabilityBehavior.usesDirectApprovalCopy
                ? "Pastikan seluruh bagian sudah final sebelum melanjutkan."
                : "Pemantauan akan disimpan lalu dikirim ke reviewer dan approval line yang sudah dipilih. Pastikan seluruh bagian sudah final sebelum melanjutkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {riskApprovalCapabilityBehavior.showsApprovalLineEditor && (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
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
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
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
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitForReview}
              disabled={isSaving || isAssessmentLocked}
            >
              {isMonitoringRoute ? "Finalisasi" : "Lanjutkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

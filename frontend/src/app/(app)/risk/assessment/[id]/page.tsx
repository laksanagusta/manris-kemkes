"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send, Trash2, ChevronUp, ChevronDown, X, GripVertical, History, GitBranch, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  MitigationTable,
  type MitigationItem,
} from "@/components/shared/mitigation-table";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { getRiskDetail, updateRiskAssessment } from "@/lib/api/risk-assessment";
import { getBobot, calculateNilai, PROBABILITY_LABELS, IMPACT_LABELS, levelToColor, getRiskLevelFromNilai, getRiskLevelLabel } from "@/lib/risk";
import type { Risk, RiskVersionTimelineItem } from "@/types/risk";
import { listUsers } from "@/lib/api/users";
import {
  buildVersionHistoryItem,
  type RiskRegisterHistoryItem,
} from "@/lib/risk-history";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { CircleDot, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormHeader } from "@/components/shared/form-shell";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import {
  ReviewSidePanel,
  type RiskWorkflowState,
} from "@/components/risk/review-side-panel";
import { filterApproverOptions, type UserPickerOption } from "@/lib/risk-register-user-picker";
import {
  resolveDraftApprovalLine,
  type DraftApprovalLineMember,
} from "@/lib/risk-approval-line";
import { ProfilRisikoCard } from "../components/profil-risiko-card";
import { type AssessmentFormValues } from "../components/hasil-pemantauan-card";
import { SimpulanCard } from "../components/simpulan-card";

const VERSION_LEVEL_BADGE: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi": "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const RiskLogTimeline = dynamic(
  () =>
    import("@/components/risk/risk-log-timeline").then(
      (mod) => mod.RiskLogTimeline,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Memuat log...
        </span>
      </div>
    ),
  },
);

type ApprovalLineUser = { id: string; name: string; email?: string; role?: string };

function dedupeApproverIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}

const approvalRoleLabels: Record<string, string> = {
  reviewer: "Reviewer",
  approval: "Pimpinan",
};

function toHydratedUserPickerOption(user: {
  id?: string | null;
  name?: string | null;
  role?: string | null;
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
  };
}

function toApprovalLineUser(option: UserPickerOption): ApprovalLineUser {
  return {
    id: option.id,
    name: option.name,
    role: option.role,
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
  const { token, user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draftRisk, setDraftRisk] = useState<Risk | null>(null);
  const [sourceRisk, setSourceRisk] = useState<Risk | null>(null);

  const [reviewerId, setReviewerId] = useState<string>("");
  const [reviewerOption, setReviewerOption] = useState<UserPickerOption | null>(null);
  const [approvalLine, setApprovalLine] = useState<ApprovalLineUser[]>([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalWorkflow, setApprovalWorkflow] = useState<RiskWorkflowState | null>(null);
  const [showSubmitReviewConfirm, setShowSubmitReviewConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versionHistory, setVersionHistory] = useState<RiskRegisterHistoryItem[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
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

  const toUserPickerOption = (user: any): UserPickerOption => ({
    id: user.id,
    name: user.name,
    role: user.role,
    subtitle: user.organizationName,
  });

  const toApprovalLineUser = (option: UserPickerOption): ApprovalLineUser => ({
    id: option.id,
    name: option.name,
    role: option.role,
  });

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
      });

      return {
        options: result.data.map(toUserPickerOption),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [token],
  );

  const loadApproverOptions = useCallback(
    async ({ q, page, limit }: { q: string; page: number; limit: number }) => {
      if (!token) {
        return { options: [], total: 0, page, limit };
      }

      const result = await listUsers(token, {
        q: q || undefined,
        page,
        limit,
      });

      return {
        options: filterApproverOptions(
          result.data.map(toUserPickerOption),
          {
            reviewerId,
            selectedApproverIds: approvalLine.map((member) => member.id),
          },
        ),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    },
    [approvalLine, reviewerId, token],
  );

  const handleReviewerSelect = useCallback((option: UserPickerOption) => {
    setReviewerId(option.id);
    setReviewerOption(option);
  }, []);

  const handleApproverSelect = useCallback(
    (option: UserPickerOption) => {
      const filteredOption = filterApproverOptions([option], {
        reviewerId,
        selectedApproverIds: approvalLine.map((member) => member.id),
      })[0];

      if (!filteredOption) {
        return;
      }

      const selectedUser = toApprovalLineUser(filteredOption);
      setApprovalLine((current) => {
        if (current.some((item) => item.id === selectedUser.id)) {
          return current;
        }

        return [...current, selectedUser];
      });
    },
    [approvalLine, reviewerId],
  );

  const fetchVersionHistory = useCallback(
    async (riskId: string) => {
      if (!token) return;
      setLoadingVersions(true);
      try {
        const items = await api.get<RiskVersionTimelineItem[]>(
          `/risks/${riskId}/versions`,
          token,
        );
        const current = items.find((v) => v.isCurrent) ?? items[0];
        if (!current) {
          setVersionHistory([]);
          return;
        }
        setVersionHistory(
          items
            .filter((v) => v.status === "approved" || v.isCurrent)
            .map((v) => buildVersionHistoryItem(v, current)),
        );
      } catch {
        toast.error("Gagal memuat riwayat versi.");
        setVersionHistory([]);
      } finally {
        setLoadingVersions(false);
      }
    },
    [token],
  );

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

  const openSubmitReviewConfirm = () => {
    const approverIds = dedupeApproverIds([
      reviewerId,
      ...approvalLine.map((member) => member.id),
    ]);
    if (approverIds.length === 0) {
      toast.error("Pilih reviewer dan susun approval line terlebih dahulu.");
      return;
    }
    setShowSubmitReviewConfirm(true);
  };

  const handleSaveDraft = async () => {
    submitTarget.current = "draft";
    await form.handleSubmit(onSubmit)();
  };

  const handleSubmitForReview = async () => {
    submitTarget.current = "review";
    setShowSubmitReviewConfirm(false);
    await form.handleSubmit(onSubmit)();
  };

  const loadRiskData = useCallback(async () => {
    if (!token || !id) return;
    
    try {
      setIsLoading(true);
      const draft = await getRiskDetail(token, id);
      setDraftRisk(draft);

      form.reset({
        probability: draft.probability || 1,
        impact: draft.impact || 1,
        changeReason: draft.changeReason || "",
        reviewSummary: draft.reviewSummary || "",
      });

      if (draft.previousRiskId) {
        const source = await getRiskDetail(token, draft.previousRiskId);
        setSourceRisk(source);
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
        setApprovalLine(resolvedApprovalLine.approvalLine);
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
                currentApproverUserId: approvalResult.currentApproverUserId ?? null,
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
            .map((step) => ({
              id: step.approverUserId!,
              name: step.approverName!,
            }));
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
        if (approvalErr instanceof Error && !(approvalErr as any).status) {
          console.error("Failed to load approval workflow:", approvalErr);
        }
      }
    } catch (error) {
      toast.error("Gagal memuat data risiko", {
        description: (error as Error).message || "Terjadi kesalahan yang tidak diketahui",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, token, form]);

  useEffect(() => {
    loadRiskData();
  }, [loadRiskData]);

  const onSubmit = async (values: AssessmentFormValues) => {
    if (!token || !id || !draftRisk) return;
    setIsSaving(true);
    try {
      const newWeight = getBobot(values.probability, values.impact);
      const newNilai = calculateNilai(values.probability, values.impact, newWeight);
      // Merge assessment fields with existing risk data so backend validation passes
      const payload = {
        title: draftRisk.title,
        description: draftRisk.description,
        category: draftRisk.category,
        status: draftRisk.status,
        unitId: draftRisk.unitId,
        organizationId: (draftRisk as any).organizationId || (draftRisk as any).organizationID || "",
        cause: draftRisk.cause || [],
        riskSource: draftRisk.riskSource || "",
        controllability: draftRisk.controllability || "",
        impactDesc: draftRisk.impactDesc || [],
        existingControl: draftRisk.existingControl || "",
        controlEffectiveness: draftRisk.controlEffectiveness || "",
        probability: values.probability,
        impact: values.impact,
        weight: newWeight,
        inherentScore: Math.round(newNilai),
        nilai: Math.round(newNilai),
        riskPriority: draftRisk.riskPriority || 0,
        riskAppetite: draftRisk.riskAppetite || "",
        treatmentOption: draftRisk.treatmentOption || "",
        mitigations: draftRisk.mitigations?.length ? draftRisk.mitigations : (draftRisk.mitigation ? [draftRisk.mitigation] : []),
        targetProbability: draftRisk.targetProbability || 0,
        targetImpact: draftRisk.targetImpact || 0,
        targetWeight: draftRisk.targetWeight || 0,
        targetNilai: Math.round(draftRisk.targetNilai || 0),
        assessmentCycle: draftRisk.assessmentCycle || "",
        reviewType: draftRisk.reviewType || "assessment",
        changeReason: values.changeReason,
        reviewSummary: values.reviewSummary,
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
          ...approvalLine
            .filter((member) => member.id && member.id !== reviewerId)
            .map((member) => ({
              id: member.id,
              name: member.name,
              type: "approval" as const,
            })),
        ],
      };

      await updateRiskAssessment(token, id, payload);

      if (submitTarget.current === "review") {
        const approverIds = dedupeApproverIds([
          reviewerId,
          ...approvalLine.map((member) => member.id),
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
          toast.success("Pemantauan berhasil disimpan dan diajukan untuk review!");
          router.push("/risk/assessment");
        } catch (approvalErr: unknown) {
          toast.error(`Pemantauan disimpan, namun gagal diajukan: ${(approvalErr as Error).message}`);
          router.push("/risk/assessment");
        }
      } else {
        toast.success("Pemantauan risiko berhasil disimpan");
        router.push("/risk/assessment");
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
        <Button variant="outline" onClick={() => router.push("/risk/assessment")}>
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <FormHeader
        title="Form Pemantauan Risiko"
        description={`${sourceRisk.code || sourceRisk.riskCode} - ${sourceRisk.title}`}
        badges={
          <>
            <Badge variant="outline" className="font-medium">
              Status: {draftRisk.status}
            </Badge>
            <Badge variant="secondary" className="font-medium">
              Versi: {draftRisk.versionNumber}
            </Badge>
          </>
        }
        backLabel="Kembali ke Pemantauan"
        onBack={() => router.push("/risk/assessment")}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            {id && (
              <Sheet
                open={historyOpen}
                onOpenChange={(open) => {
                  setHistoryOpen(open);
                  if (open && id) fetchVersionHistory(id);
                }}
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
                              className="flex gap-3 relative cursor-pointer hover:bg-muted/30 rounded-md p-1 -m-1 transition-colors"
                              onClick={() => router.push(`/risk/register/${item.riskId}`)}
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
                                  <span className="text-sm font-semibold">
                                    v{versionHistory.length - index} — {item.cycle}
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
                                      VERSION_LEVEL_BADGE[item.previousLevel] || "",
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
                                      VERSION_LEVEL_BADGE[item.currentLevel] || "",
                                    )}
                                  >
                                    {item.currentLevel}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">
                                  {item.changeReason}
                                </p>
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

            <TooltipProvider>
              {(draftRisk.status === "assessment_draft" || !id) && (
                <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-2 text-xs font-medium border-primary/20 hover:bg-primary/5 hover:text-primary"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  {isSaving && submitTarget.current === "draft" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}{" "}
                  Simpan draft
                </Button>
                <Button
                  className="gap-2 text-sm font-semibold px-5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={openSubmitReviewConfirm}
                  disabled={isSaving}
                >
                  {isSaving && submitTarget.current === "review" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}{" "}
                  Ajukan review
                </Button>
              </div>
            )}
          </TooltipProvider>
          </div>
        }
      />

      {/* Form Content */}      {/* Form Content */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Left Column */}
        <div className="w-full xl:w-2/3 space-y-6">
          <ProfilRisikoCard risk={sourceRisk} />
          
          <Accordion
            type="multiple"
            defaultValue={["hasil-pemantauan", "approval-line"]}
            className="space-y-4"
          >
            <AccordionItem
              value="hasil-pemantauan"
              className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                <div className="flex flex-1 items-center justify-between pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                      1
                    </div>
                    <p className="text-sm md:text-base font-semibold text-foreground transition-colors">
                      Hasil Pemantauan
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 px-5 pb-6 pt-2">
                <div className="grid gap-6">
                  {(() => {
                    const mitigations = draftRisk?.mitigations ?? sourceRisk.mitigations ?? (sourceRisk.mitigation ? [sourceRisk.mitigation] : []);
                    const mitigationItems: MitigationItem[] = mitigations.map((m) => ({
                      id: m.id,
                      action: m.action ?? "",
                      owner: m.owner ?? "",
                      treatmentOwnerId: m.treatmentOwnerId,
                      externalPicId: m.externalPicId,
                      dueDate: m.dueDate ?? "",
                      frequency: (m.frequency as MitigationItem["frequency"]) ?? "insidental",
                      recurringInterval: m.recurringInterval as MitigationItem["recurringInterval"],
                      reportDay: m.reportDay,
                      reportDate: m.reportDate,
                    }));
                    return mitigationItems.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Rencana Penanganan (dari versi terakhir yang disetujui)
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
                        <p className="text-sm text-muted-foreground italic mt-2">Belum ada rencana penanganan</p>
                      </div>
                    );
                  })()}

                  <TooltipProvider>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <Label>Probabilitas</Label>
                        <Controller
                          control={form.control}
                          name="probability"
                          render={({ field }) => (
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <Tooltip key={val}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(val)}
                                      className={cn(
                                        "h-10 rounded-lg border text-sm font-semibold transition-colors",
                                        val === field.value
                                          ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(val, impact, getBobot(val, impact))))} ring-1 font-bold`
                                          : "bg-muted/30 hover:bg-muted/50"
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
                          )}
                        />
                        {form.formState.errors.probability && (
                          <span className="text-xs text-red-500 font-medium">
                            {form.formState.errors.probability.message || "Wajib diisi"}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label>Dampak (Residual)</Label>
                        <Controller
                          control={form.control}
                          name="impact"
                          render={({ field }) => (
                            <div className="grid grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <Tooltip key={val}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(val)}
                                      className={cn(
                                        "h-10 rounded-lg border text-sm font-semibold transition-colors",
                                        val === field.value
                                          ? `${levelToColor(getRiskLevelFromNilai(calculateNilai(probability, val, getBobot(probability, val))))} ring-1 font-bold`
                                          : "bg-muted/30 hover:bg-muted/50"
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
                          )}
                        />
                        {form.formState.errors.impact && (
                          <span className="text-xs text-red-500 font-medium">
                            {form.formState.errors.impact.message || "Wajib diisi"}
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
                        />
                      )}
                    />
                    {form.formState.errors.changeReason && (
                      <span className="text-xs text-red-500 font-medium">
                        {form.formState.errors.changeReason.message || "Wajib diisi"}
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
                        />
                      )}
                    />
                    {form.formState.errors.reviewSummary && (
                      <span className="text-xs text-red-500 font-medium">
                        {form.formState.errors.reviewSummary.message || "Wajib diisi"}
                      </span>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Accordion Approval Line */}
            {(!id || draftRisk.status === "assessment_draft") && (
              <AccordionItem
                value="approval-line"
                id="approval-line"
                className="scroll-mt-28 rounded-xl border border-border/40 bg-card shadow-sm data-[state=open]:border-primary/20 overflow-hidden transition-all"
              >
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div>div>p]:text-primary">
                  <div className="flex flex-1 items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/80 text-xs font-bold text-foreground">
                        2
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
                        Pilih reviewer yang akan memeriksa dan memberikan skor penilaian resmi sebelum risiko ini diajukan ke pimpinan.
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
                        2. Approval Line (Pimpinan)
                        <span className="text-destructive ml-0.5">*</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Susun rantai persetujuan pimpinan. Persetujuan dilakukan secara berurutan.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <RemoteUserPicker
                        title="Tambah Approver"
                        description="Cari approver untuk disusun ke dalam rantai persetujuan berurutan."
                        placeholder="Pilih approver"
                        searchPlaceholder="Cari nama approver"
                        emptyMessage="Approver tidak ditemukan."
                        value={null}
                        onSelect={handleApproverSelect}
                        loadOptions={loadApproverOptions}
                        disabled={false}
                        className="md:w-[320px]"
                      />
                    </div>

                    <div className="space-y-2 pt-4">
                      {approvalLine.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                          Belum ada approver. Tambahkan minimal satu user sebelum klik{" "}
                          <span className="font-medium text-foreground">Ajukan review</span>.
                        </div>
                      ) : (
                        <div className="border border-border/50 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <tbody className="divide-y divide-border/50">
                              {approvalLine.map((approver, index) => (
                                <tr key={approver.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="w-8 px-2 py-2">
                                    <div className="flex items-center justify-center text-muted-foreground">
                                      <GripVertical className="size-3.5" />
                                    </div>
                                  </td>
                                  <td className="w-8 px-2 py-2">
                                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 rounded-full w-5 h-5 flex items-center justify-center">
                                      {index + 1}
                                    </span>
                                  </td>
                                  <td className="flex-1 px-2 py-2">
                                    <div>
                                      <p className="text-sm font-medium text-foreground">
                                        {approver.name}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="w-auto px-2 py-2">
                                    <div className="flex items-center justify-end gap-1">
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
                                        className="size-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => removeApprover(approver.id)}
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        {/* Right Column / Side Panel */}
        <div className="w-full space-y-4 xl:sticky xl:top-24 xl:w-1/3">
          <SimpulanCard
            nilaiCurrent={sourceRisk.inherentScore || sourceRisk.nilai || 0}
            nilaiBaru={computedNilai}
            probability={probability}
            impact={impact}
            targetScore={sourceRisk.targetNilai ?? sourceRisk.targetScore ?? 0}
          />
          <ReviewSidePanel
            approvalId={approvalId}
            approvalWorkflow={approvalWorkflow}
            currentUserId={user?.id}
            riskStatus={draftRisk.status}
            userRole={user?.role || ""}
            inherentScore={Math.round(computedNilai)}
            token={token || undefined}
            onActionComplete={loadRiskData}
            onNavigateToLog={() => {}}
          />
        </div>
      </div>

<AlertDialog
        open={showSubmitReviewConfirm}
        onOpenChange={setShowSubmitReviewConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ajukan Pemantauan untuk Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Pemantauan akan disimpan lalu dikirim ke reviewer dan approval line
              yang sudah dipilih. Pastikan seluruh bagian sudah final sebelum
              melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
                {approvalLine.length} orang
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmitForReview}>
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

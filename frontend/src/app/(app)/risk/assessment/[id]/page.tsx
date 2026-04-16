"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Send, Trash2, ChevronUp, ChevronDown, X, GripVertical } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { getRiskDetail, updateRiskAssessment } from "@/lib/api/risk-assessment";
import { getBobot, calculateNilai } from "@/lib/risk";
import type { Risk } from "@/types/risk";
import { listUsers } from "@/lib/api/users";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { RemoteUserPicker, type UserPickerOption } from "@/components/risk/remote-user-picker";
import {
  ReviewSidePanel,
  type RiskWorkflowState,
} from "@/components/risk/review-side-panel";
import { filterApproverOptions } from "@/lib/risk-register-user-picker";
import { dedupeApproverIds, type ApprovalLineUser } from "@/lib/risk-approval-line";
import { ProfilRisikoCard } from "../components/profil-risiko-card";
import {
  HasilPemantauanCard,
  type AssessmentFormValues,
} from "../components/hasil-pemantauan-card";
import { SimpulanCard } from "../components/simpulan-card";

const formSchema = z.object({
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  changeReason: z.string().min(1, "Alasan perubahan tidak boleh kosong"),
  reviewSummary: z.string().min(1, "Uraian pemantauan tidak boleh kosong"),
});

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
  const submitTarget = useRef<"draft" | "review">("draft");

  const form = useForm<AssessmentFormValues>({
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
    email: user.email,
    role: user.role,
    organizationName: user.organizationName,
  });

  const toApprovalLineUser = (option: UserPickerOption): ApprovalLineUser => ({
    id: option.id,
    name: option.name,
    email: option.email,
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
        cause: draftRisk.cause || [],
        riskSource: draftRisk.riskSource || "",
        controllability: draftRisk.controllability || "",
        impactDesc: draftRisk.impactDesc || [],
        existingControl: draftRisk.existingControl || "",
        controlEffectiveness: draftRisk.controlEffectiveness || "",
        probability: values.probability,
        impact: values.impact,
        weight: newWeight,
        riskPriority: draftRisk.riskPriority || 0,
        riskAppetite: draftRisk.riskAppetite || "",
        treatmentOption: draftRisk.treatmentOption || "",
        mitigation: draftRisk.mitigation || { id: "", title: "", description: "", responsibleId: "", deadline: "", status: "pending", progress: 0, createdAt: "", updatedAt: "" },
        targetProbability: draftRisk.targetProbability || 0,
        targetImpact: draftRisk.targetImpact || 0,
        targetWeight: draftRisk.targetWeight || 0,
        assessmentCycle: draftRisk.assessmentCycle || "",
        reviewType: draftRisk.reviewType || "assessment",
        change_reason: values.changeReason,
        review_summary: values.reviewSummary,
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
              requestType: "risk",
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
          <TooltipProvider>
            {(draftRisk.status === "draft" || !id) && (
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
        }
      />

      {/* Form Content */}
      <div className="flex flex-col gap-6">
        <ProfilRisikoCard risk={sourceRisk} />

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <HasilPemantauanCard form={form} />
          
          <div className="space-y-6">
            <SimpulanCard
              nilaiCurrent={sourceRisk.nilai || 0}
              nilaiBaru={computedNilai}
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

        {(draftRisk.status === "draft" || !id) && (
          <div className="rounded-xl border border-border/60 bg-white p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground">Approval Line</h3>
              <p className="text-sm text-muted-foreground">
                Susun reviewer dan approver yang akan memeriksa pemantauan risiko ini.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-white p-5 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  1. Reviewer (Pemeriksa)
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pilih reviewer yang akan memeriksa dan memberikan skor penilaian resmi.
                </p>
              </div>
              <RemoteUserPicker
                title="Pilih Reviewer"
                description="Cari reviewer yang akan memeriksa dan memberikan penilaian resmi untuk pemantauan risiko ini."
                placeholder="Pilih reviewer"
                searchPlaceholder="Cari nama reviewer"
                emptyMessage="Reviewer tidak ditemukan."
                value={reviewerOption}
                onSelect={handleReviewerSelect}
                loadOptions={loadReviewerOptions}
                disabled={false}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-white p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">
                  2. Approval Line (Persetujuan Berjenjang)
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Susun approval line secara berurutan mulai dari jabatan terendah ke tertinggi.
                </p>
              </div>

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

              {approvalLine.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                  <table className="w-full">
                    <tbody>
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
                                className="size-8 text-destructive hover:bg-destructive/10"
                                onClick={() => removeApprover(approver.id)}
                              >
                                <X className="size-4" />
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
        )}
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

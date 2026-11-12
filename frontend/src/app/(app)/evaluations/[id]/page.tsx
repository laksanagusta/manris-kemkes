"use client";

import { createDisplayDateFormatter } from "@/lib/display-date";
import { EvaluationItemLayout, EvaluationConclusion } from "@/components/evaluation/evaluation-form-layout";
import { PropertyList, PropertyLabel } from "@/components/shared/design-system/layout/property-list";


import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  Loader2,
  Copy,
  MoreHorizontal,
  RefreshCw,
  Save,
  Send,
} from "@/components/shared/icons";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import {
  downloadEvaluationPdf,
  finalizeEvaluation,
  getEvaluation,
  reopenEvaluation,
  updateEvaluation,
} from "@/lib/api/evaluations";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { evaluationStatusLabel, isEvaluationEditable } from "@/lib/evaluations";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormPage } from "@/components/shared/form-shell";
import {
  FormContainer,
  FormGroup,
  ActionButton,
  AccentButton,
  CollectionPageHeader,
  IllustratedEmptyState,
} from "@/components/shared/design-system";
import type {
  Evaluation,
  EvaluationItem,
  EvaluationSection,
  EvaluationStatus,
  UpdateEvaluationRequest,
} from "@/types/evaluation";


function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return createDisplayDateFormatter("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMonitoringPeriodLabel(period: string) {
  const trimmed = period.trim();
  if (!trimmed) {
    return "";
  }

  const [year, cycle] = trimmed.split("-");
  if (!year || !cycle) {
    return trimmed;
  }

  if (cycle === "Q1") {
    return `Kuartal I Tahun ${year}`;
  }

  if (cycle === "Q2" || cycle === "H1") {
    return `Semester I Tahun ${year}`;
  }

  if (cycle === "Q3") {
    return `Kuartal III Tahun ${year}`;
  }

  if (cycle === "Q4" || cycle === "H2") {
    return `Semester II Tahun ${year}`;
  }

  return trimmed;
}

function resolveEselonIOrganization(
  unitOrganization: OrganizationListItem | undefined,
  organizationsById: Map<string, OrganizationListItem>,
) {
  if (!unitOrganization) {
    return undefined;
  }

  if (unitOrganization.uprLevel === "upr_t1") {
    return unitOrganization;
  }

  let current = unitOrganization;
  while (current.parentId) {
    const parent = organizationsById.get(current.parentId);
    if (!parent) {
      break;
    }
    if (parent.uprLevel === "upr_t1") {
      return parent;
    }
    current = parent;
  }

  return undefined;
}

function cloneEvaluation(evaluation: Evaluation): Evaluation {
  return {
    ...evaluation,
    sections: (evaluation.sections ?? []).map((section) => ({
      ...section,
      items: (section.items ?? []).map((item) => ({ ...item })),
    })),
  };
}

function toUpdateRequest(evaluation: Evaluation): UpdateEvaluationRequest {
  return {
    reportNumber: evaluation.reportNumber,
    reportDate: evaluation.reportDate ?? null,
    assignmentLetterNumber: evaluation.assignmentLetterNumber,
    assignmentLetterDate: evaluation.assignmentLetterDate ?? null,
    monitoringDateRange: evaluation.monitoringDateRange,
    unitCode: evaluation.unitCode,
    unitLocation: evaluation.unitLocation,
    unitAddress: evaluation.unitAddress,
    unitEselonI: evaluation.unitEselonI,
    unitLeaderName: evaluation.unitLeaderName,
    teamCoordinator: evaluation.teamCoordinator,
    teamLead: evaluation.teamLead,
    teamMembers: evaluation.teamMembers,
    problems: evaluation.problems,
    recommendations: evaluation.recommendations,
    sections: (evaluation.sections ?? []).map((section) => ({
      id: section.id,
      templateSectionId: section.templateSectionId ?? null,
      sectionKey: section.sectionKey,
      title: section.title,
      description: section.description,
      conclusion: section.conclusion,
      sortOrder: section.sortOrder,
      items: (section.items ?? []).map((item) => ({
        id: item.id,
        templateItemId: item.templateItemId ?? null,
        itemKey: item.itemKey,
        itemNo: item.itemNo,
        label: item.label,
        answer: item.answer,
        condition: item.condition,
        description: item.description,
        analysis: item.analysis,
        sortOrder: item.sortOrder,
      })),
    })),
  };
}

function formatStatus(status: EvaluationStatus) {
  return evaluationStatusLabel[status];
}

const evaluationCardClass =
  "scroll-mt-28 [&_[data-slot=form-header]>div>div]:text-sm";

const statusTones: Record<EvaluationStatus, BadgeVariant> = {
  draft: "secondary",
  final: "default",
};

function updateSectionField(
  sections: EvaluationSection[],
  sectionIndex: number,
  patch: Partial<EvaluationSection>,
) {
  return sections.map((section, index) =>
    index === sectionIndex ? { ...section, ...patch } : section,
  );
}

function updateItemField(
  items: EvaluationItem[],
  itemIndex: number,
  patch: Partial<EvaluationItem>,
) {
  return items.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item));
}

export default function EvaluationDetailPage() {
  const params = useParams<{ id: string }>();
  const evaluationId = params?.id;
  const { token } = useAuth();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<
    "save" | "finalize" | "reopen" | "download" | null
  >(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  useEffect(() => {
    if (!token || !evaluationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getEvaluation(token, evaluationId),
      listAllOrganizations(token).catch(() => [] as OrganizationListItem[]),
    ])
      .then(([item, orgs]) => {
        setEvaluation(cloneEvaluation(item));
        setOrganizations(orgs);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Gagal memuat detail evaluasi.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, evaluationId]);

  const organizationNameById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((org) => [org.id, org])),
    [organizations],
  );
  const editable = evaluation ? isEvaluationEditable(evaluation) : false;
  const evaluationSections = evaluation?.sections ?? [];
  const totalItems = evaluationSections.reduce(
    (count, section) => count + (section.items?.length ?? 0),
    0,
  );
  const answeredItems = evaluationSections.reduce((count, section) => {
    return (
      count +
      (section.items?.filter((item) => item.answer === "yes" || item.answer === "no")
        .length ?? 0)
    );
  }, 0);
  const completionPct =
    totalItems > 0 ? Math.round((answeredItems / totalItems) * 100) : 0;
  const unresolvedItems = totalItems - answeredItems;

  const patchEvaluation = useCallback((patch: Partial<Evaluation>) => {
    setEvaluation((current) => (current ? { ...current, ...patch } : current));
  }, []);

  useEffect(() => {
    if (!evaluation || organizations.length === 0) {
      return;
    }

    const nextPatch: Partial<Evaluation> = {};
    const evaluationOrganization = organizationById.get(evaluation.organizationId);
    const eselonIOrganization = resolveEselonIOrganization(
      evaluationOrganization,
      organizationById,
    );

    if (!evaluation.monitoringDateRange.trim()) {
      nextPatch.monitoringDateRange = formatMonitoringPeriodLabel(evaluation.period);
    }

    if (!evaluation.unitLocation.trim() && evaluationOrganization?.location) {
      nextPatch.unitLocation = evaluationOrganization.location;
    }

    if (!evaluation.unitAddress.trim() && evaluationOrganization?.address) {
      nextPatch.unitAddress = evaluationOrganization.address;
    }

    if (!evaluation.unitEselonI.trim() && eselonIOrganization?.id) {
      nextPatch.unitEselonI = eselonIOrganization.name;
    }

    if (Object.keys(nextPatch).length > 0) {
      patchEvaluation(nextPatch);
    }
  }, [evaluation, organizationById, organizations.length, patchEvaluation]);

  const handleSave = async () => {
    if (!token || !evaluation) {
      toast.error("Data evaluasi belum tersedia.");
      return;
    }

    setSavingAction("save");
    try {
      const response = await updateEvaluation(token, evaluation.id, toUpdateRequest(evaluation));
      setEvaluation(cloneEvaluation(response));
      toast.success("Evaluasi tersimpan.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan evaluasi.");
    } finally {
      setSavingAction(null);
    }
  };

  const handleFinalize = async () => {
    if (!token || !evaluation) {
      toast.error("Data evaluasi belum tersedia.");
      return;
    }

    setSavingAction("finalize");
    try {
      const saved = await updateEvaluation(token, evaluation.id, toUpdateRequest(evaluation));
      const finalResult = await finalizeEvaluation(token, saved.id);
      setEvaluation(cloneEvaluation(finalResult));
      toast.success("Evaluasi berhasil difinalisasi.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal finalisasi evaluasi.");
    } finally {
      setSavingAction(null);
    }
  };

  const handleReopen = async () => {
    if (!token || !evaluation) {
      toast.error("Data evaluasi belum tersedia.");
      return;
    }

    setSavingAction("reopen");
    try {
      const response = await reopenEvaluation(token, evaluation.id);
      setEvaluation(cloneEvaluation(response));
      toast.success("Evaluasi dibuka kembali.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal membuka kembali evaluasi.");
    } finally {
      setSavingAction(null);
    }
  };

  const handleDownload = async () => {
    if (!token || !evaluation) {
      toast.error("Data evaluasi belum tersedia.");
      return;
    }

    setSavingAction("download");
    try {
      await downloadEvaluationPdf(token, evaluation.id, `evaluasi-mr-${evaluation.period}.pdf`);
      toast.success("PDF evaluasi sedang diunduh.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal mengunduh PDF evaluasi.");
    } finally {
      setSavingAction(null);
    }
  };

  const handleCopyEvaluationId = async () => {
    if (!evaluation) {
      toast.error("Data evaluasi belum tersedia.");
      return;
    }

    try {
      await navigator.clipboard.writeText(evaluation.id);
      toast.success("ID evaluasi disalin.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyalin ID evaluasi.");
    }
  };

  if (loading) {
    return (
      <div className="font-display flex min-h-[50vh] items-center justify-center rounded-lg bg-state-surface text-sm text-state-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Memuat evaluasi...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="font-display rounded-lg bg-state-surface px-6 py-10 text-center text-state-foreground">
        <div className="space-y-3">
          <p className="text-sm font-medium">Evaluasi tidak ditemukan</p>
          <p className="text-sm text-state-foreground">
            Periksa kembali tautan atau buka daftar evaluasi untuk memilih data yang benar.
          </p>
        </div>
      </div>
    );
  }

  const orgName =
    organizationNameById.get(evaluation.organizationId) ?? evaluation.organizationId;

  return (
    <FormPage className="evaluation-form space-y-6 [&>header+*]:!mt-6">
      <CollectionPageHeader
        showTitle
        actionsPlacement="title"
        title={`Evaluasi ${evaluation.period}`}
        subtitle="Evaluasi pemantauan oleh masing-masing organisasi untuk menghasilkan laporan evaluasi."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionButton
                  type="button"
                  size="icon-xs"
                  className="text-muted-foreground"
                  aria-label="Aksi evaluasi"
                >
                  <MoreHorizontal className="size-3.5" />
                </ActionButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => void handleDownload()}
                  disabled={savingAction === "download"}
                >
                  {savingAction === "download" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Unduh PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void handleCopyEvaluationId()}>
                  <Copy className="size-3.5" />
                  Salin ID evaluasi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {editable ? (
              <>
                <ActionButton
                  type="button"
                  variant="outline"
                  loading={savingAction === "save"}
                  icon={<Save className="size-3.5" />}
                  onClick={() => void handleSave()}
                  disabled={savingAction === "save" || savingAction === "finalize"}
                >
                  Simpan
                </ActionButton>
                <AccentButton
                  type="button"
                  icon={
                    savingAction === "finalize" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Send className="size-3.5" />
                    )
                  }
                  onClick={() => setShowFinalizeConfirm(true)}
                  disabled={savingAction === "finalize"}
                >
                  Finalisasi
                </AccentButton>
              </>
            ) : (
              <ActionButton
                type="button"
                variant="secondary"
                loading={savingAction === "reopen"}
                icon={<RefreshCw className="size-3.5" />}
                onClick={() => void handleReopen()}
                disabled={savingAction === "reopen"}
              >
                Buka Kembali
              </ActionButton>
            )}
          </>
        }
      />

      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalisasi evaluasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Setelah difinalisasi, evaluasi akan terkunci dan PDF diambil dari data yang tersimpan.
              Pastikan semua poin, kesimpulan, dan keterangan sudah benar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              size="default"
                            disabled={savingAction === "finalize"}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="default"
              size="default"
              onClick={() => {
                setShowFinalizeConfirm(false);
                void handleFinalize();
              }}
              disabled={savingAction === "finalize"}
            >
              Lanjut finalisasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0 space-y-6">
          <FormContainer
            id="hasil-evaluasi"
            className={evaluationCardClass}
            title="Hasil Pemantauan dan Evaluasi"
            description="Isi jawaban, uraian kondisi, dan keterangan untuk setiap poin evaluasi."
          >
            {evaluationSections.length === 0 ? (
              <FormGroup>
                <IllustratedEmptyState
                  title="Belum ada bagian evaluasi"
                  description="Bagian evaluasi belum tersedia untuk penilaian ini."
                />
              </FormGroup>
            ) : null}

            {evaluationSections.map((section, sectionIndex) => {
              const sectionItems = section.items ?? [];
              const answeredSectionItems = sectionItems.filter(
                (item) => item.answer === "yes" || item.answer === "no",
              ).length;

              return (
                <FormGroup key={section.id} className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base font-semibold text-foreground">
                        {section.title}
                      </h3>
                      {section.description ? (
                        <p className="text-sm leading-relaxed text-secondary-foreground">
                          {section.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {answeredSectionItems} / {sectionItems.length} terisi
                    </span>
                  </div>

                  <div className="space-y-8">
                    {sectionItems.map((item, itemIndex) => (
                      <EvaluationItemLayout
                        key={item.id}
                        itemNo={item.itemNo}
                        label={item.label}
                        description={item.description}
                        promptId={`evaluation-prompt-${item.id}`}
                        answer={
                          <>
                            <Label htmlFor={`evaluation-answer-${item.id}`} className="text-sm font-normal text-foreground">
                              Jawaban
                            </Label>
                            <Select
                              value={item.answer}
                              onValueChange={(value) => {
                                setEvaluation((current) =>
                                  current
                                    ? {
                                        ...current,
                                        sections: updateSectionField(
                                          current.sections,
                                          sectionIndex,
                                          {
                                            items: updateItemField(
                                              current.sections[sectionIndex].items,
                                              itemIndex,
                                              {
                                                answer: value as EvaluationItem["answer"],
                                              },
                                            ),
                                          },
                                        ),
                                      }
                                    : current,
                                );
                              }}
                              disabled={!editable}
                            >
                              <SelectTrigger id={`evaluation-answer-${item.id}`} aria-describedby={`evaluation-prompt-${item.id}`} className="w-full">
                                <SelectValue placeholder="Ya/Tidak" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unset">Belum diisi</SelectItem>
                                <SelectItem value="yes">Ya</SelectItem>
                                <SelectItem value="no">Tidak</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        }
                      >
                        <div className="space-y-2">
                          <Label htmlFor={`evaluation-condition-${item.id}`} className="text-sm font-normal text-foreground">
                            Uraian kondisi
                          </Label>
                          <Textarea
                            id={`evaluation-condition-${item.id}`}
                            value={item.condition}
                            onChange={(event) => {
                              setEvaluation((current) =>
                                current
                                  ? {
                                      ...current,
                                      sections: updateSectionField(
                                        current.sections,
                                        sectionIndex,
                                        {
                                          items: updateItemField(
                                            current.sections[sectionIndex].items,
                                            itemIndex,
                                            { condition: event.target.value },
                                          ),
                                        },
                                      ),
                                    }
                                  : current,
                              );
                            }}
                            disabled={!editable}
                            className="min-h-28 resize-y leading-relaxed"
                            placeholder="Uraikan kondisi aktual yang ditemukan"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`evaluation-analysis-${item.id}`} className="text-sm font-normal text-foreground">
                            Keterangan
                          </Label>
                          <Textarea
                            id={`evaluation-analysis-${item.id}`}
                            value={item.analysis}
                            onChange={(event) => {
                              setEvaluation((current) =>
                                current
                                  ? {
                                      ...current,
                                      sections: updateSectionField(
                                        current.sections,
                                        sectionIndex,
                                        {
                                          items: updateItemField(
                                            current.sections[sectionIndex].items,
                                            itemIndex,
                                            { analysis: event.target.value },
                                          ),
                                        },
                                      ),
                                    }
                                  : current,
                              );
                            }}
                            disabled={!editable}
                            className="min-h-28 resize-y leading-relaxed"
                            placeholder="Tuliskan keterangan singkat yang relevan"
                          />
                        </div>
                      </EvaluationItemLayout>
                    ))}
                  </div>

                  <EvaluationConclusion>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label htmlFor={`evaluation-conclusion-${section.id}`} className="text-sm font-medium text-foreground">
                        Kesimpulan bagian
                      </Label>
                    </div>
                    <Textarea
                      id={`evaluation-conclusion-${section.id}`}
                      value={section.conclusion}
                      onChange={(event) => {
                        setEvaluation((current) =>
                          current
                            ? {
                                ...current,
                                sections: updateSectionField(current.sections, sectionIndex, {
                                  conclusion: event.target.value,
                                }),
                              }
                            : current,
                        );
                      }}
                      disabled={!editable}
                      className="min-h-28 resize-y leading-relaxed"
                      placeholder="Ringkas hasil evaluasi dan hal yang perlu ditindaklanjuti"
                    />
                  </EvaluationConclusion>
                </FormGroup>
              );
            })}
          </FormContainer>

          <FormContainer
            id="permasalahan-saran"
            className={evaluationCardClass}
            title="Permasalahan dan saran"
            description="Ringkas hambatan utama dan langkah perbaikannya, tanpa mengulang isi tiap poin."
          >
            <FormGroup className="[&_[data-slot=label]]:font-normal">
              <div className="space-y-2">
                <Label htmlFor="evaluation-problems" className="text-sm font-normal text-foreground">
                  Permasalahan
                </Label>
                <Textarea
                  id="evaluation-problems"
                  value={evaluation.problems}
                  onChange={(event) => patchEvaluation({ problems: event.target.value })}
                  disabled={!editable}
                  className="min-h-28 resize-y leading-relaxed"
                  placeholder="Tuliskan hambatan utama yang perlu ditindaklanjuti"
                />
              </div>
            </FormGroup>
            <FormGroup className="[&_[data-slot=label]]:font-normal">
              <div className="space-y-2">
                <Label htmlFor="evaluation-recommendations" className="text-sm font-normal text-foreground">
                  Saran perbaikan
                </Label>
                <Textarea
                  id="evaluation-recommendations"
                  value={evaluation.recommendations}
                  onChange={(event) =>
                    patchEvaluation({ recommendations: event.target.value })
                  }
                  disabled={!editable}
                  className="min-h-28 resize-y leading-relaxed"
                  placeholder="Tuliskan rekomendasi yang paling relevan dan praktis"
                />
              </div>
            </FormGroup>
          </FormContainer>
        </div>

        <aside className="min-w-0 self-start xl:sticky xl:top-6">
          <div className="space-y-6">
            <Card className={evaluationCardClass}>
              <CardHeader>
                <CardTitle>Status kerja</CardTitle>
                <CardDescription>Pantau kelengkapan isian sebelum evaluasi difinalisasi.</CardDescription>
                <CardAction>
                  <Badge variant={statusTones[evaluation.status]}>
                    {formatStatus(evaluation.status)}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Kelengkapan poin</span>
                    <span className="font-medium text-foreground">
                      {answeredItems} / {totalItems}
                    </span>
                  </div>
                  <Progress value={completionPct} className="h-1.5" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {unresolvedItems === 0
                      ? "Semua poin evaluasi sudah diisi."
                      : `${unresolvedItems} poin masih kosong. Fokuskan dulu pada yang belum diisi.`}
                  </p>
                </div>

                <PropertyList>
                  <div className="grid grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] items-start gap-4">
                    <PropertyLabel showIcon={false}>Organisasi</PropertyLabel>
                    <dd className="min-w-0 break-words text-sm text-foreground">
                      {orgName}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] items-start gap-4">
                    <PropertyLabel showIcon={false}>Kode</PropertyLabel>
                    <dd className="font-mono text-sm tabular-nums text-foreground">
                      {evaluation.code}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] items-start gap-4">
                    <PropertyLabel showIcon={false}>Periode</PropertyLabel>
                    <dd className="font-mono text-sm tabular-nums text-foreground">
                      {evaluation.period}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] items-start gap-4">
                    <PropertyLabel showIcon={false}>Template</PropertyLabel>
                    <dd className="min-w-0 break-words text-sm text-foreground">
                      {evaluation.templateName || evaluation.templateId}
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] items-start gap-4">
                    <PropertyLabel showIcon={false}>Diperbarui</PropertyLabel>
                    <dd className="min-w-0 text-sm text-foreground">
                      <span data-date-time="">{formatDateTime(evaluation.updatedAt)}</span>
                    </dd>
                  </div>
                  <div className="grid grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] items-start gap-4">
                    <PropertyLabel showIcon={false}>Finalisasi</PropertyLabel>
                    <dd className="min-w-0 text-sm text-foreground">
                      <span data-date-time="">{formatDateTime(evaluation.finalizedAt)}</span>
                    </dd>
                  </div>
                </PropertyList>

                <div className="rounded-lg bg-muted/50 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                  Sebelum finalisasi, pastikan kesimpulan bagian dan permasalahan
                  sudah sesuai dengan isi poin. Setelah final, data terkunci dan
                  PDF diambil dari evaluasi tersimpan.
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </FormPage>
  );
}

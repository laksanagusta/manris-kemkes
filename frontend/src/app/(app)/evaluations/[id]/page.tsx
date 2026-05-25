"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  Lock,
  PencilLine,
  RefreshCw,
  Save,
  Send,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function cloneEvaluation(evaluation: Evaluation): Evaluation {
  return {
    ...evaluation,
    sections: evaluation.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item })),
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
    sections: evaluation.sections.map((section) => ({
      id: section.id,
      templateSectionId: section.templateSectionId ?? null,
      sectionKey: section.sectionKey,
      title: section.title,
      description: section.description,
      conclusion: section.conclusion,
      sortOrder: section.sortOrder,
      items: section.items.map((item) => ({
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

const statusStyles: Record<EvaluationStatus, string> = {
  draft: "border-border/60 bg-muted/40 text-muted-foreground",
  final: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
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

  const editable = evaluation ? isEvaluationEditable(evaluation) : false;

  const patchEvaluation = (patch: Partial<Evaluation>) => {
    setEvaluation((current) => (current ? { ...current, ...patch } : current));
  };

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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Memuat evaluasi...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <Card className="border-border/50 bg-card/90 shadow-sm">
        <CardContent className="space-y-3 px-6 py-10 text-center">
          <p className="text-sm font-medium">Evaluasi tidak ditemukan</p>
          <p className="text-sm text-muted-foreground">
            Periksa kembali tautan atau buka daftar evaluasi untuk memilih data yang benar.
          </p>
          <Button asChild variant="outline">
            <Link href="/evaluations">Kembali ke daftar</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const orgName =
    organizationNameById.get(evaluation.organizationId) ?? evaluation.organizationId;

  return (
    <div className="space-y-8 animate-fade-in">
      <section className="flex flex-col gap-4 border-b border-border/40 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 px-0 text-muted-foreground">
            <Link href="/evaluations">
              <ArrowLeft className="size-4" />
              Kembali ke daftar evaluasi
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">
                Evaluasi {evaluation.period}
              </h1>
              <Badge variant="outline" className={cn("whitespace-nowrap", statusStyles[evaluation.status])}>
                {formatStatus(evaluation.status)}
              </Badge>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {orgName} · {evaluation.templateName || evaluation.templateId}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => void handleDownload()}
            disabled={savingAction === "download"}
          >
            {savingAction === "download" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            PDF
          </Button>
          {editable ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleSave()}
                disabled={savingAction === "save" || savingAction === "finalize"}
              >
                {savingAction === "save" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Simpan
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={() => void handleFinalize()}
                disabled={savingAction === "finalize"}
              >
                {savingAction === "finalize" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Finalisasi
              </Button>
            </>
          ) : (
            <Button
              type="button"
              className="gap-2"
              onClick={() => void handleReopen()}
              disabled={savingAction === "reopen"}
            >
              {savingAction === "reopen" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Buka Kembali
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-6">
          <Card className="border-border/50 bg-card/90 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold">Identitas Evaluasi</CardTitle>
                {!editable ? (
                  <Badge variant="outline" className="gap-1.5 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
                    <Lock className="size-3.5" />
                    Terkunci
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1.5 border-primary/20 bg-primary/[0.06] text-[10px] text-primary">
                    <PencilLine className="size-3.5" />
                    Draft
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>No. Laporan</Label>
                <Input
                  value={evaluation.reportNumber}
                  onChange={(event) => patchEvaluation({ reportNumber: event.target.value })}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Laporan</Label>
                <Input
                  type="date"
                  value={evaluation.reportDate ?? ""}
                  onChange={(event) =>
                    patchEvaluation({
                      reportDate: event.target.value ? event.target.value : null,
                    })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>No. Surat Tugas</Label>
                <Input
                  value={evaluation.assignmentLetterNumber}
                  onChange={(event) =>
                    patchEvaluation({ assignmentLetterNumber: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Surat Tugas</Label>
                <Input
                  type="date"
                  value={evaluation.assignmentLetterDate ?? ""}
                  onChange={(event) =>
                    patchEvaluation({
                      assignmentLetterDate: event.target.value ? event.target.value : null,
                    })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Periode Pemantauan</Label>
                <Input
                  value={evaluation.monitoringDateRange}
                  onChange={(event) =>
                    patchEvaluation({ monitoringDateRange: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Kode Unit</Label>
                <Input
                  value={evaluation.unitCode}
                  onChange={(event) => patchEvaluation({ unitCode: event.target.value })}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Lokasi Unit</Label>
                <Input
                  value={evaluation.unitLocation}
                  onChange={(event) =>
                    patchEvaluation({ unitLocation: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Alamat Unit</Label>
                <Textarea
                  value={evaluation.unitAddress}
                  onChange={(event) =>
                    patchEvaluation({ unitAddress: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Eselon I</Label>
                <Input
                  value={evaluation.unitEselonI}
                  onChange={(event) =>
                    patchEvaluation({ unitEselonI: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Pimpinan Unit</Label>
                <Input
                  value={evaluation.unitLeaderName}
                  onChange={(event) =>
                    patchEvaluation({ unitLeaderName: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Koordinator Tim</Label>
                <Input
                  value={evaluation.teamCoordinator}
                  onChange={(event) =>
                    patchEvaluation({ teamCoordinator: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Ketua Tim</Label>
                <Input
                  value={evaluation.teamLead}
                  onChange={(event) => patchEvaluation({ teamLead: event.target.value })}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Anggota Tim</Label>
                <Textarea
                  value={evaluation.teamMembers}
                  onChange={(event) =>
                    patchEvaluation({ teamMembers: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/90 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-sm font-semibold">
                8. Hasil Pemantauan dan Evaluasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {evaluation.sections.map((section, sectionIndex) => (
                <div key={section.id} className="space-y-4 rounded-xl border border-border/50 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    {section.description ? (
                      <p className="text-xs leading-5 text-muted-foreground">
                        {section.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    {section.items.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {item.itemNo}
                            </p>
                            <p className="text-sm leading-6">{item.label}</p>
                          </div>
                          <div className="min-w-32">
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
                                              { answer: value as EvaluationItem["answer"] },
                                            ),
                                          },
                                        ),
                                      }
                                    : current,
                                );
                              }}
                              disabled={!editable}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Jawaban" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unset">Belum diisi</SelectItem>
                                <SelectItem value="yes">Ya</SelectItem>
                                <SelectItem value="no">Tidak</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Kondisi</Label>
                            <Textarea
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
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Uraian / Analisis</Label>
                            <Textarea
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
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Kesimpulan Section</Label>
                    <Textarea
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
                    />
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                <Label>Permasalahan</Label>
                <Textarea
                  value={evaluation.problems}
                  onChange={(event) => patchEvaluation({ problems: event.target.value })}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Saran Perbaikan</Label>
                <Textarea
                  value={evaluation.recommendations}
                  onChange={(event) =>
                    patchEvaluation({ recommendations: event.target.value })
                  }
                  disabled={!editable}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 bg-card/90 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-sm font-semibold">Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Organisasi</span>
                <span className="text-right font-medium">{orgName}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Periode</span>
                <span className="font-medium">{evaluation.period}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Template</span>
                <span className="max-w-[220px] truncate text-right font-medium">
                  {evaluation.templateName || evaluation.templateId}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{evaluationStatusLabel[evaluation.status]}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Dibuat</span>
                <span className="font-medium">{formatDateTime(evaluation.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Diperbarui</span>
                <span className="font-medium">{formatDateTime(evaluation.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Finalisasi</span>
                <span className="font-medium">{formatDateTime(evaluation.finalizedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/90 shadow-sm">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-sm font-semibold">Catatan Operasional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
              <p>
                Draft bisa diedit sampai difinalisasi. Setelah final, evaluasi terkunci dan
                PDF diambil dari data evaluasi yang tersimpan.
              </p>
              <p>
                Rekap mitigasi di PDF dibangun langsung dari data risiko saat ekspor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

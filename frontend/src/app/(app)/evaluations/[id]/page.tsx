"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Download,
  Loader2,
  Lock,
  PencilLine,
  Copy,
  MoreHorizontal,
  RefreshCw,
  Save,
  Send,
} from "@/components/ui/icons";
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
import { listUsers, type UserListItem } from "@/lib/api/users";
import { evaluationStatusLabel, isEvaluationEditable } from "@/lib/evaluations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormPage } from "@/components/shared/form-shell";
import {
  ActionButton,
  AccentButton,
  CollectionPageHeader,
  FormBackAction,
} from "@/components/shared/design-system";
import { OrderedUserSelectionTable } from "@/components/risk/ordered-user-selection-table";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { cn } from "@/lib/utils";
import type {
  Evaluation,
  EvaluationItem,
  EvaluationSection,
  EvaluationStatus,
  UpdateEvaluationRequest,
} from "@/types/evaluation";
import {
  createApprovalLineRow,
  moveApprovalLineRows,
  type ApprovalLineRow,
} from "@/lib/risk-approval-line";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
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

function toUserPickerOption(user: UserListItem): UserPickerOption {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    subtitle: user.jabatan?.trim() || user.orgName?.trim() || user.role,
    email: user.email,
    username: user.username,
    nip: user.nip ?? undefined,
    jabatan: user.jabatan ?? undefined,
    pangkat: user.pangkat ?? undefined,
    orgName: user.orgName ?? undefined,
  };
}

function toStoredUserPickerValue(value: string): UserPickerOption | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return {
    id: trimmed,
    name: trimmed,
  };
}

function parseTeamMemberRows(value: string): ApprovalLineRow[] {
  const members = value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return members.map((member) =>
    createApprovalLineRow({
      id: member,
      name: member,
    }),
  );
}

function serializeTeamMemberRows(rows: ApprovalLineRow[]) {
  return rows
    .map((row) => row.name.trim())
    .filter(Boolean)
    .join("\n");
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
  "scroll-mt-28 overflow-hidden rounded-xl bg-card gap-0 p-0 transition-colors duration-200";

const statusTones: Record<EvaluationStatus, "neutral" | "success"> = {
  draft: "neutral",
  final: "success",
};

function getAnswerLabel(value: EvaluationItem["answer"]) {
  if (value === "yes") return "Ya";
  if (value === "no") return "Tidak";
  return "Belum diisi";
}

function getAnswerTone(value: EvaluationItem["answer"]):
  | "neutral"
  | "success"
  | "danger" {
  if (value === "yes") return "success";
  if (value === "no") return "danger";
  return "neutral";
}

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
  const [teamMemberRows, setTeamMemberRows] = useState<ApprovalLineRow[]>([]);
  const [unitEselonISelection, setUnitEselonISelection] = useState("");
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
  const eselonIOrganizations = useMemo(() => {
    const uprT1Organizations = organizations.filter(
      (org) => org.uprLevel === "upr_t1",
    );

    return uprT1Organizations.length > 0 ? uprT1Organizations : organizations;
  }, [organizations]);

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

  const evaluationRef = useRef<Evaluation | null>(null);
  evaluationRef.current = evaluation;
  const loadedEvaluationId = evaluation?.id;

  useEffect(() => {
    if (!loadedEvaluationId) {
      return;
    }

    const currentEvaluation = evaluationRef.current;
    if (!currentEvaluation) {
      return;
    }

    setTeamMemberRows(parseTeamMemberRows(currentEvaluation.teamMembers));
  }, [loadedEvaluationId]);

  const unitEselonI = evaluation?.unitEselonI ?? "";

  useEffect(() => {
    if (!unitEselonI.trim()) {
      setUnitEselonISelection("");
      return;
    }

    const current = organizations.find((org) => org.name === unitEselonI);
    setUnitEselonISelection(current?.id ?? "");
  }, [organizations, unitEselonI]);

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
      setUnitEselonISelection(eselonIOrganization.id);
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
      setTeamMemberRows(parseTeamMemberRows(response.teamMembers));
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
      setTeamMemberRows(parseTeamMemberRows(finalResult.teamMembers));
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
      setTeamMemberRows(parseTeamMemberRows(response.teamMembers));
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

  const loadOrganizationUsers = useCallback(
    async ({
      q,
      page,
      limit,
    }: {
      q: string;
      page: number;
      limit: number;
    }) => {
      if (!token || !evaluation) {
        return { options: [], total: 0, page, limit };
      }

      const response = await listUsers(token, {
        q,
        page,
        limit,
        organizationId: evaluation.organizationId,
      });

      return {
        options: response.data.map(toUserPickerOption),
        total: response.total,
        page: response.page,
        limit: response.limit,
      };
    },
    [evaluation, token],
  );

  const updateTeamMemberRows = useCallback(
    (updater: (current: ApprovalLineRow[]) => ApprovalLineRow[]) => {
      setTeamMemberRows((current) => {
        const nextRows = updater(current);
        patchEvaluation({ teamMembers: serializeTeamMemberRows(nextRows) });
        return nextRows;
      });
    },
    [patchEvaluation],
  );

  const handleTeamMemberSelect = useCallback(
    (rowId: string, option: UserPickerOption) => {
      updateTeamMemberRows((current) =>
        current.map((row) =>
          row.rowId === rowId
            ? {
                ...row,
                id: option.id,
                name: option.name,
                role: option.role,
                subtitle: option.subtitle,
                nip: option.nip ?? "",
                jabatan: option.jabatan ?? "",
                pangkat: option.pangkat ?? "",
              }
            : row,
        ),
      );
    },
    [updateTeamMemberRows],
  );

  const handleTeamMemberAdd = useCallback(() => {
    updateTeamMemberRows((current) => [...current, createApprovalLineRow()]);
  }, [updateTeamMemberRows]);

  const handleTeamMemberRemove = useCallback(
    (rowId: string) => {
      updateTeamMemberRows((current) =>
        current.filter((row) => row.rowId !== rowId),
      );
    },
    [updateTeamMemberRows],
  );

  const handleTeamMemberMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateTeamMemberRows((current) => moveApprovalLineRows(current, fromIndex, toIndex));
    },
    [updateTeamMemberRows],
  );

  if (loading) {
    return (
      <div className="font-display flex min-h-[50vh] items-center justify-center rounded-xl bg-state-surface text-sm text-state-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Memuat evaluasi...
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="font-display rounded-xl bg-state-surface px-6 py-10 text-center text-state-foreground">
        <div className="space-y-3">
          <p className="text-sm font-medium">Evaluasi tidak ditemukan</p>
          <p className="text-sm text-state-foreground">
            Periksa kembali tautan atau buka daftar evaluasi untuk memilih data yang benar.
          </p>
          <FormBackAction href="/evaluations" label="Kembali ke daftar" />
        </div>
      </div>
    );
  }

  const orgName =
    organizationNameById.get(evaluation.organizationId) ?? evaluation.organizationId;

  return (
    <FormPage className="evaluation-form space-y-6 [&>header+*]:!mt-12">
      <CollectionPageHeader
        backActionPlacement="local"
        backAction={<FormBackAction href="/evaluations" label="Kembali" />}
        showTitle
        actionsPlacement="title"
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTones[evaluation.status]} size="compact">
              {formatStatus(evaluation.status)}
            </Badge>
            <Badge
              tone="neutral"
              size="compact"
              className="max-w-[240px] truncate"
            >
              {orgName}
            </Badge>
          </div>
        }
        title={`Evaluasi ${evaluation.period}`}
        subtitle="Lengkapi identitas, temuan, dan kesimpulan evaluasi pemantauan."
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
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
              disabled={savingAction === "finalize"}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
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

      <div className="grid w-full min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="space-y-6">
          <Card id="identitas-evaluasi" className={evaluationCardClass}>
            <CardHeader className="px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium tracking-tight text-foreground">
                    Identitas Evaluasi
                  </CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Lengkapi metadata laporan, unit kerja, dan susunan tim evaluasi.
                  </p>
                </div>
                {!editable ? (
                  <Badge tone="warning" size="micro" className="gap-1.5">
                    <Lock className="size-3.5" />
                    Terkunci
                  </Badge>
                ) : (
                  <Badge tone="neutral" size="micro" className="gap-1.5">
                    <PencilLine className="size-3.5" />
                    Draft
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 px-5 pb-6 pt-2 [&_[data-slot=label]]:font-normal">
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
                  value={evaluation.monitoringDateRange || formatMonitoringPeriodLabel(evaluation.period)}
                  readOnly
                  disabled
                />
                <p className="text-[11px] text-muted-foreground">
                  Diambil otomatis dari periode evaluasi.
                </p>
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
                  value={evaluation.unitLocation || organizationById.get(evaluation.organizationId)?.location || ""}
                  readOnly
                  disabled
                />
                <p className="text-[11px] text-muted-foreground">
                  Diambil otomatis dari data organisasi.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Alamat Unit</Label>
                <Textarea
                  value={evaluation.unitAddress || organizationById.get(evaluation.organizationId)?.address || ""}
                  readOnly
                  disabled
                />
                <p className="text-[11px] text-muted-foreground">
                  Diambil otomatis dari data organisasi.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Eselon I</Label>
                <Select
                  value={unitEselonISelection || ""}
                  onValueChange={(value) => {
                    const selected = eselonIOrganizations.find((org) => org.id === value);
                    setUnitEselonISelection(value);
                    patchEvaluation({ unitEselonI: selected?.name ?? value });
                  }}
                  disabled={!editable}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih organisasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {eselonIOrganizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pimpinan Unit</Label>
                <RemoteUserPicker
                  title="Pilih pimpinan unit"
                  description="Cari user yang bertugas sebagai pimpinan unit."
                  placeholder="Pilih pimpinan unit"
                  searchPlaceholder="Cari nama pimpinan"
                  emptyMessage="User tidak ditemukan."
                  value={toStoredUserPickerValue(evaluation.unitLeaderName)}
                  onSelect={(option) => patchEvaluation({ unitLeaderName: option.name })}
                  loadOptions={loadOrganizationUsers}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Koordinator Tim</Label>
                <RemoteUserPicker
                  title="Pilih koordinator tim"
                  description="Cari user yang bertugas sebagai koordinator tim."
                  placeholder="Pilih koordinator tim"
                  searchPlaceholder="Cari nama koordinator"
                  emptyMessage="User tidak ditemukan."
                  value={toStoredUserPickerValue(evaluation.teamCoordinator)}
                  onSelect={(option) => patchEvaluation({ teamCoordinator: option.name })}
                  loadOptions={loadOrganizationUsers}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2">
                <Label>Ketua Tim</Label>
                <RemoteUserPicker
                  title="Pilih ketua tim"
                  description="Cari user yang bertugas sebagai ketua tim."
                  placeholder="Pilih ketua tim"
                  searchPlaceholder="Cari nama ketua"
                  emptyMessage="User tidak ditemukan."
                  value={toStoredUserPickerValue(evaluation.teamLead)}
                  onSelect={(option) => patchEvaluation({ teamLead: option.name })}
                  loadOptions={loadOrganizationUsers}
                  disabled={!editable}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Anggota Tim</Label>
                  <span className="text-[11px] text-muted-foreground">
                    Daftar user tim, urutan bisa disusun ulang.
                  </span>
                </div>
                <OrderedUserSelectionTable
                  rows={teamMemberRows}
                  loadOptions={loadOrganizationUsers}
                  onSelectRow={handleTeamMemberSelect}
                  onAddRow={handleTeamMemberAdd}
                  onRemoveRow={handleTeamMemberRemove}
                  onMoveRow={handleTeamMemberMove}
                  pickerTitle="Pilih anggota tim"
                  pickerDescription="Cari user yang menjadi anggota tim evaluasi."
                  pickerPlaceholder="Pilih anggota tim"
                  pickerSearchPlaceholder="Cari nama anggota"
                  pickerEmptyMessage="User tidak ditemukan."
                  emptyStateMessage="Belum ada anggota tim. Tambahkan minimal satu user bila perlu."
                  addRowLabel="Tambah Anggota"
                  footerNote="Urutan baris akan dipakai sebagai susunan anggota tim."
                  disabled={!editable}
                  dndGroup="evaluation-team-members"
                />
              </div>
            </CardContent>
          </Card>

          <Card id="hasil-evaluasi" className={evaluationCardClass}>
            <CardHeader className="px-5 py-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium tracking-tight text-foreground">
                  Hasil Pemantauan dan Evaluasi
                </CardTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Isi jawaban, uraian kondisi, dan keterangan untuk setiap poin evaluasi.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-5 pb-6 pt-2">
              {evaluationSections.length === 0 ? (
                <div className="rounded-xl bg-state-surface px-4 py-8 text-sm text-state-foreground">
                  Belum ada section evaluasi yang tersedia.
                </div>
              ) : null}

              {evaluationSections.map((section, sectionIndex) => {
                const sectionItems = section.items ?? [];
                const answeredSectionItems = sectionItems.filter(
                  (item) => item.answer === "yes" || item.answer === "no",
                ).length;

                return (
                  <section
                    key={section.id}
                    className={cn(
                      "space-y-5",
                      sectionIndex !== 0 && "border-t border-border/60 pt-6",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h3 className="text-base font-medium tracking-tight text-foreground">
                          {section.title}
                        </h3>
                        {section.description ? (
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {section.description}
                          </p>
                        ) : null}
                      </div>
                      <Badge
                        tone="neutral"
                        size="compact"
                        className="whitespace-nowrap"
                      >
                        {sectionItems.length} poin
                      </Badge>
                    </div>

                    <div className="space-y-5">
                      {sectionItems.map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className="space-y-4 border-t border-border/60 pt-5 first:border-t-0 first:pt-0"
                        >
                          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
                            <div className="min-w-0 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs tracking-[0.12em] text-muted-foreground">
                                  {item.itemNo}
                                </span>
                                <Badge
                                  tone={getAnswerTone(item.answer)}
                                  size="micro"
                                >
                                  {getAnswerLabel(item.answer)}
                                </Badge>
                              </div>
                              <p className="text-sm leading-6 text-foreground text-pretty">
                                {item.label}
                              </p>
                              {item.description ? (
                                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="w-full space-y-2">
                              <Label className="text-sm font-normal text-foreground">
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
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Ya/Tidak" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unset">Belum diisi</SelectItem>
                                  <SelectItem value="yes">Ya</SelectItem>
                                  <SelectItem value="no">Tidak</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-normal text-foreground">
                                Uraian kondisi
                              </Label>
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
                                className="min-h-28"
                                placeholder="Uraikan kondisi aktual yang ditemukan"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-normal text-foreground">
                                Keterangan
                              </Label>
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
                                className="min-h-28"
                                placeholder="Tuliskan keterangan singkat yang relevan"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-sm font-normal text-foreground">
                          Kesimpulan section
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {answeredSectionItems}/{sectionItems.length} poin terisi
                        </span>
                      </div>
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
                        className="min-h-28"
                        placeholder="Simpulkan section ini secara singkat"
                      />
                    </div>
                  </section>
                );
              })}

            </CardContent>
          </Card>

          <Card id="permasalahan-saran" className={evaluationCardClass}>
            <CardHeader className="px-5 py-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium tracking-tight text-foreground">
                  Permasalahan dan saran
                </CardTitle>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ringkas hambatan utama dan langkah perbaikannya, tanpa mengulang isi tiap poin.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 px-5 pb-6 pt-2 [&_[data-slot=label]]:font-normal">
              <div className="space-y-2">
                <Label className="text-sm font-normal text-foreground">
                  Permasalahan
                </Label>
                <Textarea
                  value={evaluation.problems}
                  onChange={(event) => patchEvaluation({ problems: event.target.value })}
                  disabled={!editable}
                  className="min-h-28"
                  placeholder="Tuliskan hambatan utama yang perlu ditindaklanjuti"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-normal text-foreground">
                  Saran perbaikan
                </Label>
                <Textarea
                  value={evaluation.recommendations}
                  onChange={(event) =>
                    patchEvaluation({ recommendations: event.target.value })
                  }
                  disabled={!editable}
                  className="min-h-28"
                  placeholder="Tuliskan rekomendasi yang paling relevan dan praktis"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="min-w-0 self-start">
          <div className="space-y-6 xl:sticky xl:top-20">
            <Card className={evaluationCardClass}>
              <CardHeader className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium tracking-tight text-foreground">
                    Status kerja
                  </CardTitle>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Pantau kelengkapan isian sebelum evaluasi difinalisasi.
                  </p>
                </div>
                <Badge tone={statusTones[evaluation.status]} size="micro">
                  {formatStatus(evaluation.status)}
                </Badge>
              </div>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5 pt-2">
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

                <dl className="divide-y divide-border/60 border-y border-border/60">
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">Organisasi</dt>
                    <dd className="max-w-[190px] truncate text-right text-sm font-medium text-foreground">
                      {orgName}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">Kode</dt>
                    <dd className="font-mono text-xs tabular-nums text-foreground">
                      {evaluation.code}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">Periode</dt>
                    <dd className="font-mono text-xs tabular-nums text-foreground">
                      {evaluation.period}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">Template</dt>
                    <dd className="max-w-[190px] truncate text-right text-sm font-medium text-foreground">
                      {evaluation.templateName || evaluation.templateId}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">Diperbarui</dt>
                    <dd className="text-right text-sm font-medium text-foreground">
                      {formatDateTime(evaluation.updatedAt)}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2.5">
                    <dt className="text-sm text-muted-foreground">Finalisasi</dt>
                    <dd className="text-right text-sm font-medium text-foreground">
                      {formatDateTime(evaluation.finalizedAt)}
                    </dd>
                  </div>
                </dl>

                <div className="rounded-xl bg-muted/50 px-3 py-3 text-sm leading-relaxed text-muted-foreground">
                  Sebelum finalisasi, pastikan kesimpulan section dan permasalahan
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

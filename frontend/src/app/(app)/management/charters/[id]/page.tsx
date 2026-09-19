"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Archive,
  Check,
  GitBranch,
  History,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
} from "@/components/ui/icons";

import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import {
  ActionButton,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  CollectionDialogCancel,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionStatusBadge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownActionMenu,
  DocumentListSection,
  DocumentFormSection,
  FieldErrorMessage,
  Input,
  Label,
  LoadingActionButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  VersionTimeline,
} from "@/components/shared/design-system";
import { useAuth } from "@/contexts/auth-context";
import {
  archiveRiskCharter,
  createRiskCharterRevision,
  deleteRiskCharterDraft,
  finalizeRiskCharter,
  getRiskCharter,
  listRiskCharterVersions,
  restoreRiskCharter,
  updateRiskCharter,
} from "@/lib/api/risk-charters";
import { listUsers } from "@/lib/api/users";
import type { UserPickerOption } from "@/lib/risk-register-user-picker";
import type {
  RiskCharter,
  RiskCharterLegalBasis,
  RiskCharterStakeholder,
  RiskCharterUPRMember,
  RiskCharterUPRRole,
} from "@/types/risk-charter";

const statusPresentation = {
  draft: { label: "Draf", tone: "neutral" },
  active: { label: "Aktif", tone: "success" },
  superseded: { label: "Digantikan", tone: "neutral" },
  archived: { label: "Diarsipkan", tone: "neutral" },
} as const;

const roleLabel: Record<RiskCharterUPRRole, string> = {
  chair: "Ketua",
  secretary: "Sekretaris",
  member: "Anggota",
  supervisor: "Pengawas",
};

const formSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Judul Piagam wajib diisi")
    .max(120, "Judul Piagam maksimal 120 karakter"),
  scope: z.string(),
  legalBases: z.array(
    z.object({ id: z.string(), reference: z.string(), provision: z.string() }),
  ),
  internalContext: z.string(),
  externalContext: z.string(),
  stakeholders: z.array(
    z.object({ id: z.string(), name: z.string(), relationship: z.string() }),
  ),
  uprStructure: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["chair", "secretary", "member", "supervisor"]),
      name: z.string(),
      position: z.string(),
      userId: z.string().optional(),
    }),
  ),
});

type FormValues = z.infer<typeof formSchema>;

type ListEditorState =
  | {
      kind: "legal";
      index: number | null;
      values: RiskCharterLegalBasis;
    }
  | {
      kind: "stakeholder";
      index: number | null;
      values: RiskCharterStakeholder;
    }
  | {
      kind: "upr";
      index: number | null;
      values: RiskCharterUPRMember;
    };

function normalizeFormValues(charter: RiskCharter): FormValues {
  return {
    title: charter.title ?? "",
    scope: charter.scope ?? "",
    legalBases: (charter.legalBases ?? []).map((item, index) => ({
      id: item.id || `legal-${index + 1}`,
      reference: item.reference ?? "",
      provision: item.provision ?? "",
    })),
    internalContext: charter.internalContext ?? "",
    externalContext: charter.externalContext ?? "",
    stakeholders: (charter.stakeholders ?? []).map((item, index) => ({
      id: item.id || `stakeholder-${index + 1}`,
      name: item.name ?? "",
      relationship: item.relationship ?? "",
    })),
    uprStructure: (charter.uprStructure ?? []).map((item, index) => {
      const legacyItem = item as RiskCharterUPRMember & { title?: string };
      return {
        id: item.id || `upr-${index + 1}`,
        role: roleLabel[item.role] ? item.role : "member",
        name: item.name ?? "",
        position: item.position ?? legacyItem.title ?? "",
        userId: item.userId || undefined,
      };
    }),
  };
}

function createRowId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function ReadOnlyValue({ children }: { children: ReactNode }) {
  return (
    <p className="min-h-10 whitespace-pre-wrap py-2 text-sm leading-6 text-secondary-foreground">
      {children || <span className="text-muted-foreground">Belum diisi</span>}
    </p>
  );
}

export default function RiskCharterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [charter, setCharter] = useState<RiskCharter | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<RiskCharter[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [listEditor, setListEditor] = useState<ListEditorState | null>(null);
  const [listEditorError, setListEditorError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      scope: "",
      legalBases: [],
      internalContext: "",
      externalContext: "",
      stakeholders: [],
      uprStructure: [],
    },
    mode: "onBlur",
  });

  const { errors, isDirty } = form.formState;
  const isEditable = charter?.status === "draft";
  const watched = form.watch();

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setLoadError(null);
      const loadedCharter = await getRiskCharter(token, id);
      setCharter(loadedCharter);
      form.reset(normalizeFormValues(loadedCharter));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat Piagam.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [form, id, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const saveDraft = useCallback(
    async (values?: FormValues) => {
      if (!token || !charter || !isEditable) return false;
      const nextValues = values ?? (await form.trigger() ? form.getValues() : null);
      if (!nextValues) return false;
      try {
        setSaving(true);
        const updated = await updateRiskCharter(token, charter.id, nextValues);
        setCharter(updated);
        form.reset(normalizeFormValues(updated));
        toast.success("Draf Piagam tersimpan.");
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Draf belum berhasil disimpan.",
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [charter, form, isEditable, token],
  );

  useEffect(() => {
    if (!isEditable) return;
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void form.handleSubmit((values) => saveDraft(values))();
      }
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [form, isEditable, saveDraft]);

  const finalizationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!watched.title.trim()) issues.push("Judul Piagam");
    if (!watched.scope.trim()) issues.push("Ruang lingkup");
    if (
      watched.legalBases.length === 0 ||
      watched.legalBases.some((item) => !item.reference.trim())
    ) {
      issues.push("Minimal satu dasar hukum dengan referensi");
    }
    if (!watched.internalContext.trim()) issues.push("Konteks internal");
    if (!watched.externalContext.trim()) issues.push("Konteks eksternal");
    if (
      watched.stakeholders.length === 0 ||
      watched.stakeholders.some(
        (item) => !item.name.trim() || !item.relationship.trim(),
      )
    ) {
      issues.push("Minimal satu stakeholder eksternal beserta hubungannya");
    }
    const completeMembers = watched.uprStructure.filter(
      (item) => item.name.trim() && item.position.trim(),
    );
    const count = (role: RiskCharterUPRRole) =>
      completeMembers.filter((item) => item.role === role).length;
    if (
      count("chair") !== 1 ||
      count("secretary") !== 1 ||
      count("member") < 1 ||
      count("supervisor") !== 1
    ) {
      issues.push("Ketua, sekretaris, minimal satu anggota, dan pengawas UPR");
    }
    return issues;
  }, [watched]);

  const navigate = useCallback(
    (path: string) => {
      if (!isDirty) {
        router.push(path);
        return;
      }
      setPendingPath(path);
      setLeaveOpen(true);
    },
    [isDirty, router],
  );

  const loadVersions = useCallback(async () => {
    if (!token || !charter) return;
    try {
      setHistoryLoading(true);
      setVersions(await listRiskCharterVersions(token, charter.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Riwayat versi gagal dimuat.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [charter, token]);

  const openHistory = useCallback(() => {
    setHistoryOpen(true);
    void loadVersions();
  }, [loadVersions]);

  const runWorkflow = useCallback(
    async (action: () => Promise<RiskCharter>, successMessage: string) => {
      try {
        setWorking(true);
        const updated = await action();
        setCharter(updated);
        form.reset(normalizeFormValues(updated));
        toast.success(successMessage);
        return updated;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Tindakan belum berhasil.",
        );
        return null;
      } finally {
        setWorking(false);
      }
    },
    [form],
  );

  if (loading) {
    return (
      <FormPage className="max-w-[672px]">
        <CollectionLoadingState message="Memuat detail Piagam..." />
      </FormPage>
    );
  }

  if (loadError || !charter) {
    return (
    <FormPage className="max-w-[672px]">
        <FormHeader
          title="Detail Piagam"
          subtitle="Piagam belum dapat ditampilkan."
          showTitle
        />
        <CollectionErrorState
          title="Gagal memuat Piagam"
          message={loadError ?? "Data Piagam tidak ditemukan."}
          onReload={() => void loadData()}
        />
      </FormPage>
    );
  }

  const status = statusPresentation[charter.status];
  const canDelete =
    charter.status === "draft" &&
    (charter.createdBy === user?.id ||
      user?.role === "superadmin" ||
      user?.role === "super_admin");

  function replaceLegalBases(items: RiskCharterLegalBasis[]) {
    form.setValue("legalBases", items, { shouldDirty: true });
  }

  function replaceStakeholders(items: RiskCharterStakeholder[]) {
    form.setValue("stakeholders", items, { shouldDirty: true });
  }

  function replaceUPRStructure(items: RiskCharterUPRMember[]) {
    form.setValue("uprStructure", items, { shouldDirty: true });
  }

  function openLegalEditor(index?: number) {
    const values =
      index === undefined
        ? { id: createRowId("legal"), reference: "", provision: "" }
        : watched.legalBases[index];
    if (!values) return;
    setListEditor({
      kind: "legal",
      index: index ?? null,
      values: { ...values },
    });
    setListEditorError(null);
  }

  function openStakeholderEditor(index?: number) {
    const values =
      index === undefined
        ? { id: createRowId("stakeholder"), name: "", relationship: "" }
        : watched.stakeholders[index];
    if (!values) return;
    setListEditor({
      kind: "stakeholder",
      index: index ?? null,
      values: { ...values },
    });
    setListEditorError(null);
  }

  function openUPREditor(index?: number) {
    const values =
      index === undefined
        ? { id: createRowId("upr"), role: "member" as const, name: "", position: "" }
        : watched.uprStructure[index];
    if (!values) return;
    setListEditor({
      kind: "upr",
      index: index ?? null,
      values: { ...values },
    });
    setListEditorError(null);
  }

  function closeListEditor(open: boolean) {
    if (open) return;
    setListEditor(null);
    setListEditorError(null);
  }

  function saveListEditor() {
    if (!listEditor) return;

    if (listEditor.kind === "legal") {
      const reference = listEditor.values.reference.trim();
      if (!reference) {
        setListEditorError("Referensi wajib diisi.");
        return;
      }
      const next = {
        ...listEditor.values,
        reference,
        provision: listEditor.values.provision.trim(),
      };
      const items = [...watched.legalBases];
      if (listEditor.index === null) items.push(next);
      else items[listEditor.index] = next;
      replaceLegalBases(items);
    }

    if (listEditor.kind === "stakeholder") {
      const name = listEditor.values.name.trim();
      const relationship = listEditor.values.relationship.trim();
      if (!name || !relationship) {
        setListEditorError("Nama pihak dan hubungan wajib diisi.");
        return;
      }
      const next = { ...listEditor.values, name, relationship };
      const items = [...watched.stakeholders];
      if (listEditor.index === null) items.push(next);
      else items[listEditor.index] = next;
      replaceStakeholders(items);
    }

    if (listEditor.kind === "upr") {
      if (!listEditor.values.userId) {
        setListEditorError(
          "Pilih pengguna organisasi agar nama dan jabatan terisi otomatis.",
        );
        return;
      }
      const name = listEditor.values.name.trim();
      const position = listEditor.values.position.trim();
      if (!name || !position) {
        setListEditorError("Jabatan pengguna belum tersedia.");
        return;
      }
      const next = { ...listEditor.values, name, position };
      const items = [...watched.uprStructure];
      if (listEditor.index === null) items.push(next);
      else items[listEditor.index] = next;
      replaceUPRStructure(items);
    }

    setListEditor(null);
    setListEditorError(null);
  }

  const loadUserOptions = async ({
    q,
    page,
    limit,
  }: {
    q: string;
    page: number;
    limit: number;
  }) => {
    if (!token) return { options: [], total: 0, page, limit };
    const result = await listUsers(token, {
      q,
      page,
      limit,
      status: "active",
      organizationId: charter.organizationId,
    });
    return {
      ...result,
      options: result.data.map(
        (item): UserPickerOption => ({
          id: item.id,
          name: item.name,
          role: item.role,
          email: item.email,
          nip: item.nip,
          jabatan: item.jabatan,
          pangkat: item.pangkat,
          orgName: item.orgName,
          subtitle: [item.jabatan, item.nip].filter(Boolean).join(" · "),
        }),
      ),
    };
  };

  return (
    <FormPage className="max-w-[672px] space-y-0">
      <div className="px-6 pb-0 lg:px-8">
        <FormHeader
          title="Detail Piagam"
          subtitle="Tinjau mandat dan ruang lingkup piagam manajemen risiko."
          showTitle
          badges={
            <>
            <CollectionStatusBadge tone={status.tone}>
              {status.label}
            </CollectionStatusBadge>
          </>
          }
          actionsPlacement="header"
          actions={
            <div className="flex items-center gap-2">
              <DropdownActionMenu
                label="Tindakan Piagam"
                items={[
                  {
                    id: "history",
                    label: "Riwayat versi",
                    icon: <History className="size-3.5" aria-hidden="true" />,
                    onSelect: openHistory,
                  },
                  ...(charter.status === "active" && charter.isCurrent
                    ? [
                        {
                          id: "revision",
                          label: "Buat revisi",
                          icon: <GitBranch className="size-3.5" aria-hidden="true" />,
                          onSelect: () => setRevisionOpen(true),
                        },
                        {
                          id: "archive",
                          label: "Arsipkan",
                          icon: <Archive className="size-3.5" aria-hidden="true" />,
                          onSelect: () => setArchiveOpen(true),
                        },
                      ]
                    : []),
                  ...(charter.status === "archived"
                    ? [
                        {
                          id: "restore",
                          label: "Pulihkan",
                          icon: <RotateCcw className="size-3.5" aria-hidden="true" />,
                          onSelect: () => setRestoreOpen(true),
                        },
                      ]
                    : []),
                  ...(canDelete
                    ? [
                        {
                          id: "delete",
                          label: "Hapus draf",
                          tone: "danger" as const,
                          icon: <Trash2 className="size-3.5" aria-hidden="true" />,
                          onSelect: () => setDeleteOpen(true),
                        },
                      ]
                    : []),
                ]}
              />
              {isEditable ? (
                <LoadingActionButton
                  type="button"
                  variant="secondary"
                  size="primary"
                  loading={saving}
                  loadingLabel="Menyimpan..."
                  disabled={!isDirty}
                  onClick={form.handleSubmit((values) => saveDraft(values))}
                >
                  <Save className="size-4" />
                  Simpan draf
                </LoadingActionButton>
              ) : null}
              {charter.status === "draft" ? (
                <ActionButton
                  type="button"
                  variant="primary"
                  size="primary"
                  icon={<Check className="size-4" />}
                  onClick={() => {
                    if (isDirty) {
                      toast.info("Simpan perubahan sebelum finalisasi.");
                      return;
                    }
                    setFinalizeOpen(true);
                  }}
                >
                  Finalisasi
                </ActionButton>
              ) : null}
            </div>
          }
        />
      </div>

      <form onSubmit={form.handleSubmit((values) => saveDraft(values))}>
        <div className="space-y-3 pb-8 lg:pb-10">
        <section className="px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <Label htmlFor="charter-title">
              Judul Piagam
            </Label>
            {isEditable ? (
              <Textarea
                id="charter-title"
                {...form.register("title")}
                maxLength={120}
                rows={1}
                placeholder="Judul Piagam"
                aria-invalid={Boolean(errors.title)}
                className="min-h-0 resize-none overflow-hidden rounded-none border-0 bg-transparent px-0 py-1 text-2xl font-semibold leading-tight tracking-tight shadow-none placeholder:text-muted-foreground/60 hover:border-0 focus:border-0 focus-visible:border-0 focus-visible:ring-0 lg:text-3xl"
              />
            ) : (
              <h1 className="break-words whitespace-pre-wrap text-2xl font-semibold leading-tight tracking-tight text-foreground lg:text-3xl">
                {watched.title}
              </h1>
            )}
            <FieldErrorMessage>{errors.title?.message}</FieldErrorMessage>
          </div>
        </section>

        <DocumentFormSection
          showDivider={false}
          stacked
          title="Ruang Lingkup"
          titleId="charter-scope-label"
          className="!mt-6 gap-3 py-0 lg:py-0"
        >
            {isEditable ? (
              <Textarea
                id="charter-scope"
                aria-labelledby="charter-scope-label"
                {...form.register("scope")}
                placeholder="Tuliskan ruang lingkup penerapan manajemen risiko."
                className="min-h-32 resize-none leading-6"
              />
            ) : (
              <ReadOnlyValue>{watched.scope}</ReadOnlyValue>
            )}
        </DocumentFormSection>

          <DocumentListSection
            title="Dasar Hukum"
            addLabel="Tambah dasar hukum"
            onAdd={isEditable ? () => openLegalEditor() : undefined}
            emptyMessage="Belum ada dasar hukum."
            className="mx-6 !mt-6 lg:mx-8"
            items={watched.legalBases.map((item, index) => ({
              id: item.id,
              title: item.reference || "Referensi belum diisi",
              meta: item.provision || "Ketentuan relevan belum diisi",
              action: isEditable ? (
                <DropdownActionMenu
                  label={`Tindakan dasar hukum ${index + 1}`}
                  className="border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-muted-foreground"
                  items={[
                    {
                      id: "edit",
                      label: "Edit",
                      icon: <Pencil className="size-3.5" aria-hidden="true" />,
                      onSelect: () => openLegalEditor(index),
                    },
                    {
                      id: "delete",
                      label: "Hapus",
                      tone: "danger",
                      icon: <Trash2 className="size-3.5" aria-hidden="true" />,
                      onSelect: () =>
                        replaceLegalBases(
                          watched.legalBases.filter(
                            (candidate) => candidate.id !== item.id,
                          ),
                        ),
                    },
                  ]}
                />
              ) : null,
            }))}
          />

        <DocumentFormSection
          showDivider={false}
          stacked
          title="Konteks Internal"
          titleId="charter-internal-context-label"
          className="!mt-6 gap-3 py-0 lg:py-0"
        >
            {isEditable ? (
              <Textarea
                id="charter-internal-context"
                aria-labelledby="charter-internal-context-label"
                {...form.register("internalContext")}
                placeholder="Tuliskan kondisi internal yang memengaruhi pengelolaan risiko."
                className="min-h-32 resize-none leading-6"
              />
            ) : (
              <ReadOnlyValue>{watched.internalContext}</ReadOnlyValue>
            )}
        </DocumentFormSection>

        <DocumentFormSection
          showDivider={false}
          stacked
          title="Konteks Eksternal"
          titleId="charter-external-context-label"
          className="!mt-6 gap-3 py-0 lg:py-0"
        >
            {isEditable ? (
              <Textarea
                id="charter-external-context"
                aria-labelledby="charter-external-context-label"
                {...form.register("externalContext")}
                placeholder="Tuliskan kondisi eksternal yang memengaruhi pengelolaan risiko."
                className="min-h-32 resize-none leading-6"
              />
            ) : (
              <ReadOnlyValue>{watched.externalContext}</ReadOnlyValue>
            )}
        </DocumentFormSection>

          <DocumentListSection
            title="Stakeholder Eksternal"
            addLabel="Tambah stakeholder"
            onAdd={isEditable ? () => openStakeholderEditor() : undefined}
            emptyMessage="Belum ada stakeholder eksternal."
            className="mx-6 !mt-6 lg:mx-8"
            items={watched.stakeholders.map((item, index) => ({
              id: item.id,
              title: item.name || "Nama pihak belum diisi",
              meta: item.relationship || "Hubungan belum diisi",
              action: isEditable ? (
                <DropdownActionMenu
                  label={`Tindakan stakeholder ${index + 1}`}
                  className="border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-muted-foreground"
                  items={[
                    {
                      id: "edit",
                      label: "Edit",
                      icon: <Pencil className="size-3.5" aria-hidden="true" />,
                      onSelect: () => openStakeholderEditor(index),
                    },
                    {
                      id: "delete",
                      label: "Hapus",
                      tone: "danger",
                      icon: <Trash2 className="size-3.5" aria-hidden="true" />,
                      onSelect: () =>
                        replaceStakeholders(
                          watched.stakeholders.filter(
                            (candidate) => candidate.id !== item.id,
                          ),
                        ),
                    },
                  ]}
                />
              ) : null,
            }))}
          />

          <DocumentListSection
            title="Struktur UPR"
            addLabel="Tambah personel"
            onAdd={isEditable ? () => openUPREditor() : undefined}
            emptyMessage="Belum ada personel UPR."
            className="mx-6 !mt-6 lg:mx-8"
            items={watched.uprStructure.map((member, index) => ({
              id: member.id,
              title: member.name || "Personel belum diisi",
              meta:
                [roleLabel[member.role], member.position].filter(Boolean).join(" · ") ||
                "Peran dan jabatan belum diisi",
              action: isEditable ? (
                <DropdownActionMenu
                  label={`Tindakan personel ${index + 1}`}
                  className="border-0 bg-transparent text-muted-foreground shadow-none hover:bg-transparent hover:text-muted-foreground"
                  items={[
                    {
                      id: "edit",
                      label: "Edit",
                      icon: <Pencil className="size-3.5" aria-hidden="true" />,
                      onSelect: () => openUPREditor(index),
                    },
                    {
                      id: "delete",
                      label: "Hapus",
                      tone: "danger",
                      icon: <Trash2 className="size-3.5" aria-hidden="true" />,
                      onSelect: () =>
                        replaceUPRStructure(
                          watched.uprStructure.filter(
                            (candidate) => candidate.id !== member.id,
                          ),
                        ),
                    },
                  ]}
                />
              ) : null,
            }))}
          />
        </div>
      </form>

      <Dialog open={Boolean(listEditor)} onOpenChange={closeListEditor}>
        <DialogContent className="max-w-2xl no-scrollbar" showCloseButton={false}>
          <div className="flex min-h-0 flex-col gap-5">
            <DialogHeader>
              <DialogTitle>
                {listEditor?.kind === "legal"
                  ? listEditor.index === null
                    ? "Tambah dasar hukum"
                    : "Edit dasar hukum"
                  : listEditor?.kind === "stakeholder"
                    ? listEditor.index === null
                      ? "Tambah stakeholder eksternal"
                      : "Edit stakeholder eksternal"
                    : listEditor?.kind === "upr"
                      ? listEditor.index === null
                        ? "Tambah personel UPR"
                        : "Edit personel UPR"
                      : "Tambah item"}
              </DialogTitle>
              <DialogDescription>
                Lengkapi data ini untuk menampilkannya sebagai item di daftar Piagam.
              </DialogDescription>
            </DialogHeader>

            {listEditor?.kind === "legal" ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="legal-reference-modal">Referensi</Label>
                  <Input
                    id="legal-reference-modal"
                    autoFocus
                    value={listEditor.values.reference}
                    placeholder="Contoh: KMK Nomor HK.01.07/..."
                    onChange={(event) =>
                      setListEditor((current) =>
                        current?.kind === "legal"
                          ? {
                              ...current,
                              values: {
                                ...current.values,
                                reference: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="legal-provision-modal">Ketentuan relevan</Label>
                  <Input
                    id="legal-provision-modal"
                    value={listEditor.values.provision}
                    placeholder="Pasal atau pokok ketentuan"
                    onChange={(event) =>
                      setListEditor((current) =>
                        current?.kind === "legal"
                          ? {
                              ...current,
                              values: {
                                ...current.values,
                                provision: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {listEditor?.kind === "stakeholder" ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="stakeholder-name-modal">Nama pihak</Label>
                  <Input
                    id="stakeholder-name-modal"
                    autoFocus
                    value={listEditor.values.name}
                    placeholder="Nama instansi atau pihak"
                    onChange={(event) =>
                      setListEditor((current) =>
                        current?.kind === "stakeholder"
                          ? {
                              ...current,
                              values: {
                                ...current.values,
                                name: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="stakeholder-relationship-modal">Hubungan</Label>
                  <Textarea
                    id="stakeholder-relationship-modal"
                    value={listEditor.values.relationship}
                    placeholder="Kepentingan, ekspektasi, atau peran"
                    className="min-h-24 resize-none"
                    onChange={(event) =>
                      setListEditor((current) =>
                        current?.kind === "stakeholder"
                          ? {
                              ...current,
                              values: {
                                ...current.values,
                                relationship: event.target.value,
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            {listEditor?.kind === "upr" ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="upr-role-modal">Peran</Label>
                  <Select
                    value={listEditor.values.role}
                    onValueChange={(value) =>
                      setListEditor((current) =>
                        current?.kind === "upr"
                          ? {
                              ...current,
                              values: {
                                ...current.values,
                                role: value as RiskCharterUPRRole,
                              },
                            }
                          : current,
                      )
                    }
                  >
                    <SelectTrigger id="upr-role-modal" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabel).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Pilih pengguna organisasi</Label>
                  <RemoteUserPicker
                    title="Pilih personel UPR"
                    description="Pilih pengguna dari organisasi yang sama; nama dan jabatan terisi otomatis."
                    placeholder="Cari pengguna"
                    searchPlaceholder="Cari nama, NIP, atau jabatan"
                    emptyMessage="Pengguna tidak ditemukan."
                    value={
                      listEditor.values.userId
                        ? {
                            id: listEditor.values.userId,
                            name: listEditor.values.name,
                            jabatan: listEditor.values.position,
                          }
                        : null
                    }
                    loadOptions={loadUserOptions}
                    onSelect={(option) =>
                      setListEditor((current) =>
                        current?.kind === "upr"
                          ? {
                              ...current,
                              values: {
                                ...current.values,
                                userId: option.id,
                                name: option.name,
                                position: option.jabatan ?? "",
                              },
                            }
                          : current,
                      )
                    }
                  />
                </div>
              </div>
            ) : null}

            <FieldErrorMessage>{listEditorError}</FieldErrorMessage>

            <DialogFooter>
              <CollectionDialogCancel
                type="button"
                variant="outline"
                size="md"
                onClick={() => closeListEditor(false)}
              >
                Batal
              </CollectionDialogCancel>
              <LoadingActionButton
                type="button"
                variant="primary"
                size="primary"
                onClick={saveListEditor}
              >
                Simpan
              </LoadingActionButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-md" showCloseButton={false}>
          <SheetHeader className="-mx-5 -mt-5 border-b border-border/70">
            <SheetTitle>Riwayat versi</SheetTitle>
            <SheetDescription>
              Setiap versi tersimpan sebagai snapshot yang hanya dapat dibaca.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {historyLoading ? (
              <CollectionLoadingState message="Memuat riwayat versi..." />
            ) : versions.length === 0 ? (
              <p className="text-sm text-secondary-foreground">Belum ada riwayat versi.</p>
            ) : (
              <VersionTimeline
                activeId={charter.id}
                onSelect={(versionId) => {
                  setHistoryOpen(false);
                  navigate(`/management/charters/${versionId}`);
                }}
                items={versions.map((version) => ({
                  id: version.id,
                  title: `Versi ${version.versionNumber}`,
                  status: version.id === charter.id ? "Dibuka" : undefined,
                  description:
                    version.revisionReason ||
                    (version.versionNumber === 1 ? "Versi awal" : "Tanpa catatan revisi"),
                  meta: (
                    <CollectionStatusBadge tone={statusPresentation[version.status].tone}>
                      {statusPresentation[version.status].label}
                    </CollectionStatusBadge>
                  ),
                }))}
              />
            )}
          </div>
          <SheetFooter className="-mx-5 -mb-5 border-t border-border/70 px-5 py-4">
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="md"
              className="w-full border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
              onClick={() => setHistoryOpen(false)}
            >
              Batal
            </CollectionDialogCancel>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <AlertDialogContent className="max-w-2xl no-scrollbar">
          <AlertDialogHeader>
            <AlertDialogTitle>Finalisasi Piagam?</AlertDialogTitle>
            <AlertDialogDescription>
              Setelah difinalisasi, Piagam menjadi aktif dan terkunci. Perubahan
              berikutnya harus dibuat melalui revisi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {finalizationIssues.length > 0 ? (
            <div className="rounded-lg bg-warning/10 p-4 text-sm text-foreground">
              <p className="font-medium text-secondary-foreground">Lengkapi bagian berikut terlebih dahulu:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                {finalizationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
              disabled={working || finalizationIssues.length > 0}
              onClick={() => {
                void runWorkflow(
                  () => finalizeRiskCharter(token!, charter.id),
                  "Piagam telah difinalisasi dan aktif.",
                );
              }}
            >
              Finalisasi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="max-w-2xl no-scrollbar" showCloseButton={false}>
          <div className="flex min-h-0 flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="text-base">Buat revisi Piagam</DialogTitle>
              <DialogDescription>
                Sistem akan membuat draf versi baru. Versi aktif tetap berlaku
                sampai revisi difinalisasi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="revision-reason">Alasan revisi</Label>
              <Textarea
                id="revision-reason"
                value={revisionReason}
                onChange={(event) => setRevisionReason(event.target.value)}
                placeholder="Jelaskan perubahan yang mendasari revisi ini."
                className="min-h-28 resize-none"
              />
              <p className="text-xs text-secondary-foreground">Minimal 10 karakter.</p>
            </div>
            <DialogFooter>
              <CollectionDialogCancel
                type="button"
                variant="outline"
                size="md"
                className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
                onClick={() => setRevisionOpen(false)}
              >
                Batal
              </CollectionDialogCancel>
              <LoadingActionButton
                type="button"
                variant="primary"
                size="primary"
                loading={working}
                loadingLabel="Membuat revisi..."
                disabled={revisionReason.trim().length < 10}
                onClick={async () => {
                  if (!token) return;
                  try {
                    setWorking(true);
                    const response = await createRiskCharterRevision(
                      token,
                      charter.id,
                      revisionReason,
                    );
                    setRevisionOpen(false);
                    toast.success(
                      response.existing
                        ? "Draf revisi yang ada dibuka."
                        : "Draf revisi berhasil dibuat.",
                    );
                    router.push(`/management/charters/${response.data.id}`);
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Revisi belum berhasil dibuat.",
                    );
                  } finally {
                    setWorking(false);
                  }
                }}
              >
                Buat revisi
              </LoadingActionButton>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent className="max-w-2xl no-scrollbar">
          <AlertDialogHeader>
            <AlertDialogTitle>Arsipkan Piagam?</AlertDialogTitle>
            <AlertDialogDescription>
              Piagam tidak lagi menjadi versi aktif, tetapi tetap tersimpan dan
              dapat dipulihkan selama belum ada Piagam pengganti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
              onClick={() =>
                void runWorkflow(
                  () => archiveRiskCharter(token!, charter.id),
                  "Piagam diarsipkan.",
                )
              }
            >
              Arsipkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent className="max-w-2xl no-scrollbar">
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan Piagam?</AlertDialogTitle>
            <AlertDialogDescription>
              Piagam akan kembali menjadi versi aktif jika belum ada Piagam
              current untuk organisasi, level UPR, dan tahun yang sama.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="primary"
              size="primary"
              onClick={() =>
                void runWorkflow(
                  () => restoreRiskCharter(token!, charter.id),
                  "Piagam dipulihkan dan aktif kembali.",
                )
              }
            >
              Pulihkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-2xl no-scrollbar">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus draf secara permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Seluruh isi draf Piagam akan
              dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="primary"
              onClick={async () => {
                if (!token) return;
                try {
                  setWorking(true);
                  await deleteRiskCharterDraft(token, charter.id);
                  toast.success("Draf Piagam dihapus permanen.");
                  router.replace("/management/charters");
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Draf belum berhasil dihapus.",
                  );
                } finally {
                  setWorking(false);
                }
              }}
            >
              Hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent className="max-w-2xl no-scrollbar">
          <AlertDialogHeader>
            <AlertDialogTitle>Tinggalkan perubahan?</AlertDialogTitle>
            <AlertDialogDescription>
              Perubahan yang belum disimpan akan hilang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end">
            <AlertDialogCancel
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
            >
              Tetap di halaman
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="primary"
              onClick={() => {
                if (pendingPath) router.push(pendingPath);
              }}
            >
              Tinggalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormPage>
  );
}

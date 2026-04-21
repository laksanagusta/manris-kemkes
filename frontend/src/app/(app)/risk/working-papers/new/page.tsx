"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useForm, useFieldArray, Controller, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/dom/sortable";
import { useSortable } from "@dnd-kit/react/sortable";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createWorkingPaper } from "@/lib/api/working-papers";
import { getWorkingPaperCreateErrorMessage } from "@/lib/api/working-paper-create-error";
import { createEmptyWorkingPaperSignatory } from "@/lib/working-paper-signatories";

import {
  FormPage,
  FormHeader,
  FormSection,
} from "@/components/shared/form-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Save,
  FileSearch,
  GripVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  getRiskLevelLabel,
  riskCategoryLabels,
  getRiskLevelFromNilai,
} from "@/lib/risk";

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  Rendah: "bg-risk-low/15 text-risk-low border-risk-low/20",
  Sedang: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  Tinggi: "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi":
    "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const formSchema = z.object({
  title: z.string().min(3, "Judul kertas kerja harus diisi (min. 3 karakter)"),
  description: z.string().optional(),
  assessment_cycle: z.string().optional(),
  risks: z
    .array(
      z.object({
        risk_id: z.string(),
        source_mode: z.enum(["latest_approved", "review_periodic"]),
      }),
    )
    .min(1, "Pilih minimal 1 risiko untuk kertas kerja"),
  signatories: z
    .array(
      z.object({
        user_id: z.string().min(1, "Pengguna harus dipilih"),
        signer_jabatan: z.string(),
        signer_pangkat: z.string(),
        signer_name: z.string(),
        signer_nip: z.string().optional(),
      }),
    )
    .min(1, "Minimal 1 penandatangan harus ditambahkan"),
});

type FormValues = z.infer<typeof formSchema>;
type SignatoryValue = FormValues["signatories"][number];

type RiskOption = {
  id: string;
  code: string;
  title: string;
  category: string;
  status: string;
  isCurrent: boolean;
  nilai: number;
};
type UserOption = {
  id: string;
  name: string;
  email: string;
  username: string;
  nip?: string;
  jabatan?: string;
  pangkat?: string;
};

type SortableDragEndEvent = {
  canceled: boolean;
  operation: {
    source: { id: unknown; index?: number; initialIndex?: number } | null;
    target: { id: unknown; index?: number } | null;
  };
};

interface SortableSignatoryRowProps {
  rowId: string;
  index: number;
  control: Control<FormValues>;
  signatory: SignatoryValue | undefined;
  userIdError?: string;
  loadingUsers: boolean;
  users: UserOption[];
  userSearch: string;
  userPage: number;
  userTotal: number;
  onUserSearchChange: (value: string) => void;
  onUserSelect: (index: number, userId: string) => void;
  onPreviousUserPage: () => void;
  onNextUserPage: () => void;
  canGoToPreviousUserPage: boolean;
  canGoToNextUserPage: boolean;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function SortableSignatoryRow({
  rowId,
  index,
  control,
  signatory,
  userIdError,
  loadingUsers,
  users,
  userSearch,
  userPage,
  userTotal,
  onUserSearchChange,
  onUserSelect,
  onPreviousUserPage,
  onNextUserPage,
  canGoToPreviousUserPage,
  canGoToNextUserPage,
  onRemove,
  canRemove,
}: SortableSignatoryRowProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: rowId,
    index,
    group: "working-paper-signatories",
  });

  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border/30 transition-colors hover:bg-muted/30",
        isDragging && "bg-muted/40 opacity-60",
      )}
    >
      <TableCell className="w-10">
        <button
          type="button"
          ref={handleRef}
          className="flex size-7 cursor-grab items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
          aria-label={`Ubah urutan penandatangan ${index + 1}`}
        >
          <GripVertical className="size-3.5" />
        </button>
      </TableCell>
      <TableCell className="w-10">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted/70 text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>
      </TableCell>
      <TableCell className="align-top">
        <div className="space-y-2">
          <Controller
            control={control}
            name={`signatories.${index}.user_id` as const}
            render={({ field: { value, onChange } }) => (
              <Select
                value={value}
                onValueChange={(nextValue) => {
                  onChange(nextValue);
                  onUserSelect(index, nextValue);
                }}
                disabled={loadingUsers}
              >
                <SelectTrigger
                  className={cn("h-8 text-xs", userIdError && "border-destructive")}
                >
                  <SelectValue placeholder="Pilih penandatangan..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="border-b p-2">
                    <Input
                      placeholder="Cari pengguna..."
                      value={userSearch}
                      onChange={(event) => onUserSearchChange(event.target.value)}
                      className="h-8"
                      onClick={(event) => event.stopPropagation()}
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    <SelectGroup>
                      {users.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name} ({option.email})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {users.length === 0 && (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        Tidak ada pengguna ditemukan
                      </div>
                    )}
                  </div>
                  {userTotal > 10 && (
                    <div className="flex items-center justify-between border-t p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!canGoToPreviousUserPage}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPreviousUserPage();
                        }}
                        className="h-6 text-xs"
                      >
                        ← Prev
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {userPage} / {Math.max(1, Math.ceil(userTotal / 10))}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!canGoToNextUserPage}
                        onClick={(event) => {
                          event.stopPropagation();
                          onNextUserPage();
                        }}
                        className="h-6 text-xs"
                      >
                        Next →
                      </Button>
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          />
          {userIdError && <p className="text-xs text-destructive">{userIdError}</p>}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {signatory?.signer_nip || "-"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate" title={signatory?.signer_jabatan || "-"}>
            {signatory?.signer_jabatan || "-"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemove(index)}
            disabled={!canRemove}
            aria-label={`Hapus penandatangan ${index + 1}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </tr>
  );
}

/* ── Page component ─────────────────────────────────────────── */

export default function CreateWorkingPaperPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [loadingRisks, setLoadingRisks] = useState(true);
  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [searchRisk, setSearchRisk] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchDebounced, setUserSearchDebounced] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);

  const assessmentCycle = (() => {
    const now = new Date();
    return `${now.getFullYear()}-H${now.getMonth() < 6 ? 1 : 2}`;
  })();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assessment_cycle: assessmentCycle,
      risks: [],
      signatories: [createEmptyWorkingPaperSignatory()],
    },
  });

  const {
    fields: signatoryFields,
    append: appendSignatory,
    move: moveSignatory,
    remove: removeSignatory,
  } = useFieldArray({
    control,
    name: "signatories",
  });

  const watchRisks = watch("risks");
  const watchedSignatories = watch("signatories") ?? [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setUserSearchDebounced(userSearch);
      setUserPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  useEffect(() => {
    if (!token) return;

    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const orgFilter = user?.isGlobal ? undefined : user?.organizationId ?? undefined;
        const res = await api.get<{ data: UserOption[]; total: number }>(
          `/users?limit=10&page=${userPage}${userSearchDebounced ? `&q=${encodeURIComponent(userSearchDebounced)}` : ""}${orgFilter ? `&organizationId=${orgFilter}` : ""}`,
          token,
        );
        setUsers(res?.data || []);
        setUserTotal(res?.total || 0);
      } catch (error) {
        console.error("Failed to load users", error);
        toast.error("Gagal memuat data pengguna");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [token, userSearchDebounced, userPage, user]);

  useEffect(() => {
    if (!token) return;

    const fetchInitialData = async () => {
      try {
        setLoadingRisks(true);

        const risksRes = await api.get<RiskOption[]>("/risks?status=approved", token);

        const validRisks = (risksRes || []).filter(
          (r) => r.status === "approved" && r.isCurrent,
        );
        setRisks(validRisks);
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast.error("Gagal memuat data risiko");
      } finally {
        setLoadingRisks(false);
      }
    };

    fetchInitialData();
  }, [token]);

  const filteredRisks = risks.filter(
    (r) =>
      (r.title && r.title.toLowerCase().includes(searchRisk.toLowerCase())) ||
      (r.code && r.code.toLowerCase().includes(searchRisk.toLowerCase())),
  );

  const selectedRiskIds = watchRisks.map((r) => r.risk_id);

  const handleToggleRisk = (riskId: string, checked: boolean) => {
    const current = watchRisks || [];
    if (checked) {
      setValue(
        "risks",
        [...current, { risk_id: riskId, source_mode: "latest_approved" }],
        { shouldValidate: true },
      );
    } else {
      setValue(
        "risks",
        current.filter((r) => r.risk_id !== riskId),
        { shouldValidate: true },
      );
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      const newRisks = filteredRisks.map((r) => {
        const existing = watchRisks.find((wr) => wr.risk_id === r.id);
        return (
          existing || { risk_id: r.id, source_mode: "latest_approved" as const }
        );
      });
      setValue("risks", newRisks, { shouldValidate: true });
    } else {
      setValue("risks", [], { shouldValidate: true });
    }
  };

  const handleSourceModeChange = (
    riskId: string,
    mode: "latest_approved" | "review_periodic",
  ) => {
    const current = watchRisks || [];
    setValue(
      "risks",
      current.map((r) =>
        r.risk_id === riskId ? { ...r, source_mode: mode } : r,
      ),
      { shouldValidate: true },
    );
  };

  const handleUserSelect = useCallback((index: number, userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setValue(`signatories.${index}.user_id`, userId, {
        shouldValidate: true,
      });
      setValue(`signatories.${index}.signer_name`, user.name, {
        shouldValidate: true,
      });
      setValue(
        `signatories.${index}.signer_nip`,
        user.nip || "",
        { shouldValidate: true },
      );
      setValue(`signatories.${index}.signer_jabatan`, user.jabatan || "", {
        shouldValidate: true,
      });
      setValue(`signatories.${index}.signer_pangkat`, user.pangkat || "", {
        shouldValidate: true,
      });
    }
  }, [setValue, users]);

  const handleAddSignatory = useCallback(() => {
    appendSignatory(createEmptyWorkingPaperSignatory());
  }, [appendSignatory]);

  const handleRemoveSignatory = useCallback((index: number) => {
    removeSignatory(index);
  }, [removeSignatory]);

  const totalUserPages = Math.max(1, Math.ceil(userTotal / 10));

  const handlePreviousUserPage = useCallback(() => {
    setUserPage((page) => Math.max(1, page - 1));
  }, []);

  const handleNextUserPage = useCallback(() => {
    setUserPage((page) => Math.min(totalUserPages, page + 1));
  }, [totalUserPages]);

  const handleSignatoryDragEnd = useCallback(
    (event: SortableDragEndEvent) => {
      if (event.canceled) return;

      const { source, target } = event.operation;

      if (!source || !target) return;
      if (!isSortable(source as never) || !isSortable(target as never)) return;

      const fromIndex = (source as { initialIndex: number }).initialIndex;
      const toIndex = (target as { index: number }).index;

      if (fromIndex === toIndex) return;

      moveSignatory(fromIndex, toIndex);
    },
    [moveSignatory],
  );

  const onSubmit = async (data: FormValues) => {
    if (!token) return;
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        assessment_cycle: data.assessment_cycle || undefined,
        risks: data.risks,
        signatories: data.signatories.map((sig, idx) => ({
          user_id: sig.user_id,
          sequence_no: idx + 1,
          signer_name: sig.signer_name,
          signer_jabatan: sig.signer_jabatan,
          signer_pangkat: sig.signer_pangkat,
          signer_nip: sig.signer_nip || undefined,
        })),
      };

      const result = await createWorkingPaper(payload, token);
      toast.success("Kertas kerja berhasil dibuat");
      router.push(`/risk/working-papers/${result.id}`);
    } catch (error) {
      console.error(error);
      toast.error(getWorkingPaperCreateErrorMessage(error));
    }
  };

  return (
    <FormPage className="max-w-7xl">
      <FormHeader
        title="Buat Kertas Kerja Baru"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            Pilih risiko dan atur penandatangan untuk menghasilkan dokumen
            kertas kerja.
            <Badge variant="secondary" className="font-mono text-[11px]">
              {assessmentCycle}
            </Badge>
          </span>
        }
        backLabel="Kembali ke Kertas Kerja"
        onBack={() => router.push("/risk/working-papers")}
        actions={
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Buat Kertas Kerja
              </>
            )}
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Informasi Kertas Kerja ─────────────────────── */}
        <FormSection
          title="Informasi Kertas Kerja"
          description="Masukkan detail identifikasi untuk kertas kerja ini"
        >
          <div className="space-y-2">
            <Label htmlFor="title">
              Judul Kertas Kerja <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: Kertas Kerja Manajemen Risiko IT 2024"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Textarea
              id="description"
              placeholder="Penjelasan singkat mengenai tujuan pembuatan kertas kerja ini..."
              {...register("description")}
              className="min-h-[100px]"
            />
          </div>
        </FormSection>

        {/* ── Pilih Risiko ───────────────────────────────── */}
        <FormSection
          title="Pilih Risiko"
          description="Pilih risiko yang telah disetujui (minimal 1)"
          action={
            <Badge variant="secondary" className="px-2.5 py-0.5">
              {watchRisks.length} dipilih
            </Badge>
          }
        >
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <Input
                placeholder="Cari judul atau kode risiko..."
                value={searchRisk}
                onChange={(e) => setSearchRisk(e.target.value)}
                className="h-9 pr-8"
              />
              {searchRisk && (
                <button
                  type="button"
                  onClick={() => setSearchRisk("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {errors.risks && (
            <p className="text-xs text-destructive">
              {typeof errors.risks.message === "string"
                ? errors.risks.message
                : "Pilih minimal 1 risiko"}
            </p>
          )}

          <Card className="overflow-hidden border-border/50 bg-card/80 py-0 backdrop-blur-sm">
            <CardContent className="p-0">
              {loadingRisks ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground">
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Memuat daftar
                  risiko...
                </div>
              ) : risks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <div className="inline-flex size-12 items-center justify-center rounded-full bg-muted">
                    <FileSearch className="size-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Belum ada risiko yang disetujui
                    </p>
                    <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                      Kertas kerja membutuhkan risiko berstatus disetujui. Buat
                      dan ajukan risiko terlebih dahulu.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/risk/register">Buka Register Risiko</Link>
                  </Button>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[50px] text-center whitespace-nowrap">
                          <Checkbox
                            checked={
                              filteredRisks.length > 0 &&
                              filteredRisks.every((r) =>
                                selectedRiskIds.includes(r.id),
                              )
                            }
                            onCheckedChange={(checked) =>
                              handleToggleAll(!!checked)
                            }
                            aria-label="Pilih semua risiko"
                          />
                        </TableHead>
                        <TableHead className="w-[100px] whitespace-nowrap">Kode</TableHead>
                        <TableHead className="max-w-[280px] whitespace-nowrap">
                          Judul Risiko
                        </TableHead>
                        <TableHead className="w-[140px] whitespace-nowrap">Kategori</TableHead>
                        <TableHead className="w-[120px] text-center whitespace-nowrap">
                          Nilai
                        </TableHead>
                        <TableHead className="w-[140px] text-center whitespace-nowrap">
                          Tingkat
                        </TableHead>
                        <TableHead className="w-[180px] whitespace-nowrap">Sumber Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRisks.length > 0 ? (
                        filteredRisks.map((risk) => {
                          const isChecked = selectedRiskIds.includes(risk.id);
                          const riskEntry = watchRisks.find(
                            (r) => r.risk_id === risk.id,
                          );
                          const displayNilai = risk.nilai ?? 0;
                          const lvlLabel = getRiskLevelLabel(
                            getRiskLevelFromNilai(displayNilai),
                          );
                          return (
                            <TableRow
                              key={risk.id}
                              className={isChecked ? "bg-primary/5" : ""}
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleToggleRisk(risk.id, !!checked)
                                  }
                                  aria-label={`Pilih ${risk.code}`}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {risk.code}
                              </TableCell>
                              <TableCell className="max-w-[280px] font-medium">
                                <span className="block truncate" title={risk.title}>
                                  {risk.title}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs">
                                {riskCategoryLabels[
                                  risk.category as keyof typeof riskCategoryLabels
                                ] || risk.category}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {Math.round(displayNilai)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    levelBadgeVariant[lvlLabel] ||
                                    "bg-muted text-muted-foreground"
                                  }
                                >
                                  {lvlLabel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {isChecked ? (
                                  <Select
                                    value={riskEntry?.source_mode || "latest_approved"}
                                    onValueChange={(val) =>
                                      handleSourceModeChange(
                                        risk.id,
                                        val as
                                          | "latest_approved"
                                          | "review_periodic",
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="latest_approved">
                                        Versi Terakhir Disetujui
                                      </SelectItem>
                                      <SelectItem value="review_periodic">
                                        Tinjauan Periodik
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-xs text-muted-foreground">
                                    &mdash;
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24">
                            <div className="flex flex-col gap-1 text-left">
                              <p className="text-sm font-medium text-muted-foreground">
                                Pencarian tidak menemukan risiko
                              </p>
                              <p className="text-xs text-muted-foreground/70">
                                Pastikan unit dan jenis risiko yang dicari sudah benar
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </FormSection>

        {/* ── Konfigurasi Penandatangan ──────────────────── */}
        <FormSection
          title="Konfigurasi Penandatangan"
          description="Tambah penandatangan, atur urutan dengan drag handle, dan tentukan sequence penandatanganan dokumen"
          action={
            <Badge variant="secondary" className="px-2.5 py-0.5">
              {signatoryFields.length} penandatangan
            </Badge>
          }
        >
          <div className="space-y-3">
            {errors.signatories && typeof errors.signatories.message === "string" && (
              <p className="text-xs text-destructive">{errors.signatories.message}</p>
            )}

            <DragDropProvider onDragEnd={handleSignatoryDragEnd}>
              <Card className="overflow-hidden border-border/50 bg-card/80 py-0 backdrop-blur-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10">
                          <span className="sr-only">Pegangan drag</span>
                        </TableHead>
                        <TableHead className="w-10 text-center">
                          <span className="sr-only">Urutan</span>
                        </TableHead>
                        <TableHead className="w-[360px] whitespace-nowrap">Nama</TableHead>
                        <TableHead className="w-[220px] whitespace-nowrap">NIP</TableHead>
                        <TableHead className="whitespace-nowrap">Jabatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signatoryFields.map((field, index) => (
                        <SortableSignatoryRow
                          key={field.id}
                          rowId={field.id}
                          index={index}
                          control={control}
                          signatory={watchedSignatories[index]}
                          userIdError={errors.signatories?.[index]?.user_id?.message}
                          loadingUsers={loadingUsers}
                          users={users}
                          userSearch={userSearch}
                          userPage={userPage}
                          userTotal={userTotal}
                          onUserSearchChange={setUserSearch}
                          onUserSelect={handleUserSelect}
                          onPreviousUserPage={handlePreviousUserPage}
                          onNextUserPage={handleNextUserPage}
                          canGoToPreviousUserPage={userPage > 1}
                          canGoToNextUserPage={userPage < totalUserPages}
                          onRemove={handleRemoveSignatory}
                          canRemove={signatoryFields.length > 1}
                        />
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex items-center justify-between gap-3 border-t border-border/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      Urutan baris menentukan sequence penandatangan pada payload dokumen.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSignatory}
                      className="gap-2 border-dashed text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
                    >
                      <Plus className="size-3.5" />
                      Tambah Penandatangan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </DragDropProvider>
          </div>
        </FormSection>
      </form>
    </FormPage>
  );
}

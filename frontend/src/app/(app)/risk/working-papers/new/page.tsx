"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { createWorkingPaper } from "@/lib/api/working-papers";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { getRiskLevelLabel, riskCategoryLabels, getRiskLevelFromNilai } from "@/lib/risk";

const levelBadgeVariant: Record<string, string> = {
  "Sangat Rendah": "bg-green-100 text-green-700 border-green-200",
  "Rendah": "bg-risk-low/15 text-risk-low border-risk-low/20",
  "Sedang": "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  "Tinggi": "bg-risk-high/15 text-risk-high border-risk-high/20",
  "Sangat Tinggi": "bg-risk-extreme/15 text-risk-extreme border-risk-extreme/20",
};

const formSchema = z.object({
  title: z.string().min(3, "Judul kertas kerja harus diisi (min. 3 karakter)"),
  description: z.string().optional(),
  assessment_cycle: z.string().optional(),
  risk_ids: z.array(z.string()).min(1, "Pilih minimal 1 risiko untuk kertas kerja"),
  signatories: z.array(z.object({
    user_id: z.string().min(1, "Pengguna harus dipilih"),
    signer_title: z.string().min(1, "Jabatan penandatangan harus diisi"),
    signer_role_label: z.string().min(1, "Peran (contoh: Pihak Pertama) harus diisi"),
    signer_name: z.string(),
    signer_nip: z.string().optional(),
  })).min(1, "Minimal 1 penandatangan harus ditambahkan"),
});

type FormValues = z.infer<typeof formSchema>;

type RiskOption = { id: string; code: string; title: string; category: string; status: string; isCurrent: boolean; nilai: number };
type UserOption = { id: string; name: string; email: string; username: string; nip?: string };

export default function CreateWorkingPaperPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [loadingRisks, setLoadingRisks] = useState(true);
  const [risks, setRisks] = useState<RiskOption[]>([]);
  const [searchRisk, setSearchRisk] = useState("");
  
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assessment_cycle: new Date().getFullYear().toString(),
      risk_ids: [],
      signatories: [
        {
          user_id: "",
          signer_title: "",
          signer_role_label: "Pihak Pertama",
          signer_name: "",
          signer_nip: "",
        }
      ],
    }
  });

  const { fields: signatoryFields, append: appendSignatory, remove: removeSignatory } = useFieldArray({
    control,
    name: "signatories",
  });

  const watchRiskIds = watch("risk_ids");

  useEffect(() => {
    if (!token) return;

    const fetchInitialData = async () => {
      try {
        setLoadingRisks(true);
        setLoadingUsers(true);
        
        const [risksRes, usersRes] = await Promise.all([
          api.get<RiskOption[]>("/risks?status=approved", token),
          api.get<UserOption[]>("/users", token)
        ]);
        
        const validRisks = (risksRes || []).filter(r => r.status === "approved" && r.isCurrent);
        setRisks(validRisks);
        setUsers(usersRes || []);
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast.error("Gagal memuat data risiko atau pengguna");
      } finally {
        setLoadingRisks(false);
        setLoadingUsers(false);
      }
    };

    fetchInitialData();
  }, [token]);

  const filteredRisks = risks.filter(r => 
    (r.title && r.title.toLowerCase().includes(searchRisk.toLowerCase())) || 
    (r.code && r.code.toLowerCase().includes(searchRisk.toLowerCase()))
  );

  const handleToggleRisk = (riskId: string, checked: boolean) => {
    const current = watchRiskIds || [];
    if (checked) {
      setValue("risk_ids", [...current, riskId], { shouldValidate: true });
    } else {
      setValue("risk_ids", current.filter(id => id !== riskId), { shouldValidate: true });
    }
  };

  const handleUserSelect = (index: number, userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setValue(`signatories.${index}.user_id`, userId, { shouldValidate: true });
      setValue(`signatories.${index}.signer_name`, user.name, { shouldValidate: true });
      setValue(`signatories.${index}.signer_nip`, user.nip || user.username || "", { shouldValidate: true });
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!token) return;
    try {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        assessment_cycle: data.assessment_cycle || undefined,
        risk_ids: data.risk_ids,
        signatories: data.signatories.map((sig, idx) => ({
          user_id: sig.user_id,
          sequence_no: idx + 1,
          signer_name: sig.signer_name,
          signer_title: sig.signer_title,
          signer_role_label: sig.signer_role_label,
          signer_nip: sig.signer_nip || undefined,
        })),
      };

      const result = await createWorkingPaper(payload, token);
      toast.success("Kertas kerja berhasil dibuat");
      router.push(`/risk/working-papers/${result.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Gagal membuat kertas kerja");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 -ml-3 text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/risk/working-papers")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Buat Kertas Kerja Baru</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih risiko dan atur penandatangan untuk menghasilkan dokumen kertas kerja.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Informasi Kertas Kerja</CardTitle>
            <CardDescription>Masukkan detail identifikasi untuk kertas kerja ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Judul Kertas Kerja <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Contoh: Kertas Kerja Manajemen Risiko IT 2024"
                {...register("title")}
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
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

            <div className="space-y-2">
              <Label htmlFor="assessment_cycle">Siklus Asesmen (Opsional)</Label>
              <Input
                id="assessment_cycle"
                placeholder="Contoh: 2024"
                {...register("assessment_cycle")}
                className="max-w-[200px]"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg">Pilih Risiko</CardTitle>
              <CardDescription>Pilih risiko yang telah disetujui (minimal 1)</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="px-2.5 py-0.5">
                {watchRiskIds.length} dipilih
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center max-w-sm">
              <Input
                placeholder="Cari judul atau kode risiko..."
                value={searchRisk}
                onChange={(e) => setSearchRisk(e.target.value)}
                className="h-9"
              />
            </div>
            
            {errors.risk_ids && <p className="text-sm text-destructive">{errors.risk_ids.message}</p>}

            <div className="border rounded-md overflow-hidden bg-card">
              {loadingRisks ? (
                <div className="p-8 flex justify-center items-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" /> Memuat daftar risiko...
                </div>
              ) : risks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Tidak ada risiko berstatus disetujui yang dapat dipilih.
                </div>
              ) : (
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[50px] text-center">Pilih</TableHead>
                        <TableHead className="w-[100px]">Kode</TableHead>
                        <TableHead>Judul Risiko</TableHead>
                        <TableHead className="w-[140px]">Kategori</TableHead>
                        <TableHead className="w-[120px] text-center">Nilai</TableHead>
                        <TableHead className="w-[140px] text-center">Tingkat</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRisks.length > 0 ? (
                        filteredRisks.map((risk) => {
                          const isChecked = watchRiskIds.includes(risk.id);
                          const lvlLabel = getRiskLevelLabel(getRiskLevelFromNilai(risk.nilai || 0));
                          return (
                            <TableRow 
                              key={risk.id}
                              className={isChecked ? "bg-primary/5" : ""}
                            >
                              <TableCell className="text-center">
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleToggleRisk(risk.id, !!checked)}
                                  aria-label={`Pilih ${risk.code}`}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {risk.code}
                              </TableCell>
                              <TableCell className="font-medium">
                                {risk.title}
                              </TableCell>
                              <TableCell className="text-xs">
                                {riskCategoryLabels[risk.category as keyof typeof riskCategoryLabels] || risk.category}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {risk.nilai?.toFixed(2) || "0.00"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={levelBadgeVariant[lvlLabel] || "bg-muted text-muted-foreground"}
                                >
                                  {lvlLabel}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Pencarian tidak menemukan risiko.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg">Konfigurasi Penandatangan</CardTitle>
              <CardDescription>Tentukan urutan penandatangan dokumen</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendSignatory({
                user_id: "",
                signer_title: "",
                signer_role_label: "",
                signer_name: "",
                signer_nip: "",
              })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Baris
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.signatories?.root && (
              <p className="text-sm text-destructive">{errors.signatories.root.message}</p>
            )}

            <div className="space-y-4">
              {signatoryFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-4 p-4 border rounded-md bg-muted/20 relative group">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    <div className="space-y-2">
                      <Label>Pengguna <span className="text-destructive">*</span></Label>
                      <Controller
                        control={control}
                        name={`signatories.${index}.user_id`}
                        render={({ field: { value, onChange } }) => (
                          <Select
                            value={value}
                            onValueChange={(val) => {
                              onChange(val);
                              handleUserSelect(index, val);
                            }}
                            disabled={loadingUsers}
                          >
                            <SelectTrigger className={errors.signatories?.[index]?.user_id ? "border-destructive" : ""}>
                              <SelectValue placeholder="Pilih pengguna..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.name} ({u.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.signatories?.[index]?.user_id && (
                        <p className="text-[10px] text-destructive">{errors.signatories[index]?.user_id?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Jabatan (saat penandatanganan) <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Cth: Direktur Utama"
                        {...register(`signatories.${index}.signer_title`)}
                        className={errors.signatories?.[index]?.signer_title ? "border-destructive" : ""}
                      />
                      {errors.signatories?.[index]?.signer_title && (
                        <p className="text-[10px] text-destructive">{errors.signatories[index]?.signer_title?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Peran Label <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Cth: Pihak Pertama"
                        {...register(`signatories.${index}.signer_role_label`)}
                        className={errors.signatories?.[index]?.signer_role_label ? "border-destructive" : ""}
                      />
                      {errors.signatories?.[index]?.signer_role_label && (
                        <p className="text-[10px] text-destructive">{errors.signatories[index]?.signer_role_label?.message}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeSignatory(index)}
                    disabled={signatoryFields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 sticky bottom-4 z-20 bg-background/80 backdrop-blur p-4 rounded-xl border shadow-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/risk/working-papers")}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
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
        </div>
      </form>
    </div>
  );
}

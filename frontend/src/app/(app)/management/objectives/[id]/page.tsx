"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleDot,
  Goal,
  Loader2,
  Save,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations } from "@/lib/api/organizations";
import {
  createRiskObjective,
  getRiskObjective,
  updateRiskObjective,
} from "@/lib/api/risk-objectives";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskObjective, RiskObjectiveStatus } from "@/types/risk-objective";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const statusLabel: Record<RiskObjectiveStatus, string> = {
  draft: "Draft",
  in_review: "Dalam Review",
  approved: "Disetujui",
  archived: "Diarsipkan",
};

const statusVariant: Record<RiskObjectiveStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  in_review: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  approved: "bg-success/15 text-success border-success/20",
  archived: "bg-amber-500/15 text-amber-700 border-amber-500/20",
};

const formSchema = z.object({
  organizationId: z.string().min(1, "Organisasi wajib dipilih"),
  period: z.string().min(1, "Periode wajib diisi"),
  tujuan: z.string().min(1, "Tujuan wajib diisi"),
  sasaran: z.string().min(1, "Sasaran wajib diisi"),
  indikatorKinerjaUtama: z.string().min(1, "IKU wajib diisi"),
  target: z.string().default(""),
  program: z.string().default(""),
  kegiatan: z.string().default(""),
  processBusiness: z.string().default(""),
});

type FormValues = z.output<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;
type SectionId =
  | "identitas"
  | "iku"
  | "target"
  | "program"
  | "kegiatan"
  | "proses";

function normalizeFormValues(objective?: RiskObjective | null): FormValues {
  return {
    organizationId: objective?.organizationId ?? "",
    period: objective?.period ?? "",
    tujuan: objective?.tujuan ?? "",
    sasaran: objective?.sasaran ?? "",
    indikatorKinerjaUtama: objective?.indikatorKinerjaUtama ?? "",
    target: objective?.target ?? "",
    program: objective?.program ?? "",
    kegiatan: objective?.kegiatan ?? "",
    processBusiness: objective?.processBusiness ?? "",
  };
}

export default function RiskObjectiveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const isCreateMode = id === "new";

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [objective, setObjective] = useState<RiskObjective | null>(null);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: normalizeFormValues(null),
    mode: "onBlur",
  });

  const { formState } = form;
  const isDirty = formState.isDirty;

  useEffect(() => {
    if (!token) return;

    const activeToken = token;
    let active = true;

    async function load() {
      try {
        setLoading(!isCreateMode);
        const [orgs, currentObjective] = await Promise.all([
          listAllOrganizations(activeToken),
          isCreateMode ? Promise.resolve(null) : getRiskObjective(activeToken, id),
        ]);

        if (!active) return;
        setOrganizations(orgs);
        setObjective(currentObjective);
        form.reset(normalizeFormValues(currentObjective));
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Gagal memuat sasaran.";
        toast.error(message);
        router.push("/management/objectives");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [form, id, isCreateMode, router, token]);

  const watched = form.watch();

  // Unsaved changes warning
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const sections = useMemo(() => {
    const items: Array<{ id: SectionId; title: string; required: boolean; done: boolean }> = [
      {
        id: "identitas",
        title: "Identitas Sasaran",
        required: true,
        done: Boolean(watched.organizationId && watched.period && watched.tujuan && watched.sasaran),
      },
      {
        id: "iku",
        title: "Indikator Kinerja Utama",
        required: true,
        done: Boolean(watched.indikatorKinerjaUtama?.trim()),
      },
      { id: "target", title: "Target", required: false, done: Boolean(watched.target?.trim()) },
      { id: "program", title: "Program", required: false, done: Boolean(watched.program?.trim()) },
      { id: "kegiatan", title: "Kegiatan", required: false, done: Boolean(watched.kegiatan?.trim()) },
      { id: "proses", title: "Proses Bisnis", required: false, done: Boolean(watched.processBusiness?.trim()) },
    ];

    return items;
  }, [watched]);

  async function onSubmit(values: FormValues) {
    if (!token) return;

    const activeToken = token;

    try {
      setSaving(true);
      const payload = {
        ...values,
        status: "draft" as RiskObjectiveStatus,
      };

      const response = isCreateMode
        ? await createRiskObjective(activeToken, payload)
        : await updateRiskObjective(activeToken, id, payload);

      toast.success(isCreateMode ? "Sasaran berhasil dibuat." : "Sasaran berhasil diperbarui.");
      router.replace(`/management/objectives/${response.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan sasaran.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <FormPage className="max-w-4xl">
        <Card className="border-border/40 shadow-sm">
          <CardContent className="flex min-h-[320px] items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Memuat detail sasaran...
          </CardContent>
        </Card>
      </FormPage>
    );
  }

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title={isCreateMode ? "Buat Sasaran & IKU" : "Detail Sasaran & IKU"}
        description={
          isCreateMode
            ? "Lengkapi sasaran, IKU, target, dan program untuk memudahkan perumusan risiko."
            : "Perbarui isi sasaran dan IKU sesuai kebutuhan unit kerja."
        }
        onBack={() => router.push("/management/objectives")}
        backLabel="Kembali ke Sasaran & IKU"
        badges={
          <>
            <Badge className="gap-2 border-primary/15 bg-primary/[0.06] px-2.5 py-0.5 text-primary">
              <Goal className="size-3.5" />
              Risk Governance
            </Badge>
            {!isCreateMode && objective ? (
              <Badge className={cn("border", statusVariant[objective.status])}>
                {statusLabel[objective.status]}
              </Badge>
            ) : null}
          </>
        }
        actions={
          <Button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isCreateMode ? "Simpan Sasaran" : "Perbarui Sasaran"}
          </Button>
        }
      />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-border/40 shadow-sm">
          <CardContent className="space-y-0 p-0">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                {index > 0 && <Separator className="bg-border/50" />}
                <div className={cn("flex items-center gap-2", index === 0 ? "px-6 pt-6 pb-4" : "px-6 pt-5 pb-4")}>
                  <h3 className="text-sm font-semibold text-foreground md:text-base">{section.title}</h3>
                  {section.required ? (
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary/80">Wajib</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">opsional</span>
                  )}
                  <div
                    className={cn(
                      "ml-auto flex size-6 shrink-0 items-center justify-center rounded-full",
                      section.done ? "bg-success/10 text-success" : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {section.done ? <CheckCircle2 className="size-3.5" /> : <CircleDot className="size-3.5" />}
                  </div>
                </div>

                <div className="px-6 pb-6">
                {section.id === "identitas" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Organisasi</Label>
                      <Select value={watched.organizationId} onValueChange={(value) => form.setValue("organizationId", value, { shouldValidate: true })}>
                        <SelectTrigger className={cn(formState.errors.organizationId && "border-destructive")}>
                          <SelectValue placeholder="Pilih organisasi" />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((organization) => (
                            <SelectItem key={organization.id} value={organization.id}>
                              {organization.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formState.errors.organizationId && (
                        <p className="text-xs text-destructive">{formState.errors.organizationId.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Periode</Label>
                      <Input
                        value={watched.period}
                        onChange={(event) => form.setValue("period", event.target.value, { shouldValidate: true })}
                        placeholder="Contoh: 2026-H1"
                        className={cn(formState.errors.period && "border-destructive")}
                      />
                      {formState.errors.period && (
                        <p className="text-xs text-destructive">{formState.errors.period.message}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tujuan</Label>
                      <Input
                        value={watched.tujuan}
                        onChange={(event) => form.setValue("tujuan", event.target.value, { shouldValidate: true })}
                        placeholder="Tujuan strategis yang ingin dicapai"
                        className={cn(formState.errors.tujuan && "border-destructive")}
                      />
                      {formState.errors.tujuan && (
                        <p className="text-xs text-destructive">{formState.errors.tujuan.message}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Sasaran</Label>
                      <Input
                        value={watched.sasaran}
                        onChange={(event) => form.setValue("sasaran", event.target.value, { shouldValidate: true })}
                        placeholder="Sasaran spesifik yang mendukung tujuan"
                        className={cn(formState.errors.sasaran && "border-destructive")}
                      />
                      {formState.errors.sasaran && (
                        <p className="text-xs text-destructive">{formState.errors.sasaran.message}</p>
                      )}
                    </div>
                  </div>
                ) : null}

                {section.id === "iku" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Indikator kuantitatif yang mengukur keberhasilan pencapaian sasaran. Gunakan formula atau target angka yang terukur.
                    </p>
                    <Input
                      value={watched.indikatorKinerjaUtama}
                      onChange={(event) => form.setValue("indikatorKinerjaUtama", event.target.value, { shouldValidate: true })}
                      placeholder="Contoh: Persentase kepatuhan terhadap SOP mencapai 95%"
                      className={cn(formState.errors.indikatorKinerjaUtama && "border-destructive")}
                    />
                    {formState.errors.indikatorKinerjaUtama && (
                      <p className="text-xs text-destructive">{formState.errors.indikatorKinerjaUtama.message}</p>
                    )}
                  </div>
                ) : null}

                {section.id === "target" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Target capaian yang ingin diwujudkan dalam periode terkait. Sertakan angka dan satuan bila memungkinkan.
                    </p>
                    <Textarea
                      value={watched.target}
                      onChange={(event) => form.setValue("target", event.target.value)}
                      placeholder="Tuliskan target capaian beserta angka dan satuan."
                      className="min-h-[120px]"
                    />
                  </div>
                ) : null}

                {section.id === "program" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Program kerja yang dirancang untuk mencapai sasaran dan memenuhi target IKU.
                    </p>
                    <Textarea
                      value={watched.program}
                      onChange={(event) => form.setValue("program", event.target.value)}
                      placeholder="Tuliskan program kerja yang mendukung pencapaian sasaran."
                      className="min-h-[120px]"
                    />
                  </div>
                ) : null}

                {section.id === "kegiatan" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Rincian kegiatan operasional yang menjabarkan program menjadi langkah konkret yang dapat dipantau.
                    </p>
                    <Textarea
                      value={watched.kegiatan}
                      onChange={(event) => form.setValue("kegiatan", event.target.value)}
                      placeholder="Tuliskan rincian kegiatan operasional."
                      className="min-h-[120px]"
                    />
                  </div>
                ) : null}

                {section.id === "proses" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Proses bisnis utama yang terkait dengan sasaran dan IKU ini. Menjelaskan alur kerja internal yang relevan.
                    </p>
                    <Textarea
                      value={watched.processBusiness}
                      onChange={(event) => form.setValue("processBusiness", event.target.value)}
                      placeholder="Tuliskan proses bisnis utama yang terkait."
                      className="min-h-[120px]"
                    />
                  </div>
                ) : null}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>
      </form>
    </FormPage>
  );
}
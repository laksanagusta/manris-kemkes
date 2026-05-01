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
  ClipboardPenLine,
  Loader2,
  Save,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations } from "@/lib/api/organizations";
import { listUsers } from "@/lib/api/users";
import {
  createRiskCharter,
  getRiskCharter,
  updateRiskCharter,
} from "@/lib/api/risk-charters";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { UserListItem } from "@/lib/api/users";
import type { RiskCharter, RiskCharterStatus, RiskCharterUPRLevel } from "@/types/risk-charter";
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

const statusLabel: Record<RiskCharterStatus, string> = {
  draft: "Draft",
  in_review: "Dalam Review",
  approved: "Disetujui",
  archived: "Diarsipkan",
};

const statusVariant: Record<RiskCharterStatus, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  in_review: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  approved: "bg-success/15 text-success border-success/20",
  archived: "bg-amber-500/15 text-amber-700 border-amber-500/20",
};

const uprLevelLabel: Record<RiskCharterUPRLevel, string> = {
  eksekutif: "Eksekutif",
  upr_t1: "UPR T1",
  upr_t2: "UPR T2",
};

const formSchema = z.object({
  organizationId: z.string().min(1, "Organisasi wajib dipilih"),
  uprLevel: z.enum(["eksekutif", "upr_t1", "upr_t2"]),
  period: z.string().min(1, "Periode wajib diisi"),
  riskOwnerName: z.string().min(1, "Risk owner wajib diisi"),
  riskOwnerUserId: z.string().optional(),
  riskTeamName: z.string().default(""),
  scope: z.string().default(""),
  legalBasis: z.string().default(""),
  internalContext: z.string().default(""),
  externalContext: z.string().default(""),
  stakeholderSummary: z.string().default(""),
  status: z.enum(["draft", "in_review", "approved", "archived"]),
});

type FormValues = z.output<typeof formSchema>;
type FormInput = z.input<typeof formSchema>;
type SectionId =
  | "identitas"
  | "scope"
  | "legal"
  | "internal"
  | "external"
  | "stakeholder";

function normalizeFormValues(charter?: RiskCharter | null): FormValues {
  return {
    organizationId: charter?.organizationId ?? "",
    uprLevel: charter?.uprLevel ?? "upr_t1",
    period: charter?.period ?? "",
    riskOwnerName: charter?.riskOwnerName ?? "",
    riskOwnerUserId: charter?.riskOwnerUserId ?? "",
    riskTeamName: charter?.riskTeamName ?? "",
    scope: charter?.scope ?? "",
    legalBasis: charter?.legalBasis ?? "",
    internalContext: charter?.internalContext ?? "",
    externalContext: charter?.externalContext ?? "",
    stakeholderSummary: charter?.stakeholderSummary ?? "",
    status: charter?.status ?? "draft",
  };
}

export default function RiskCharterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const isCreateMode = id === "new";

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [charter, setCharter] = useState<RiskCharter | null>(null);

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
        const [orgs, currentCharter] = await Promise.all([
          listAllOrganizations(activeToken),
          isCreateMode ? Promise.resolve(null) : getRiskCharter(activeToken, id),
        ]);
        const usersRes = await listUsers(activeToken, { limit: 200 });

        if (!active) return;
        setOrganizations(orgs);
        setUsers(usersRes.data ?? []);
        setCharter(currentCharter);
        form.reset(normalizeFormValues(currentCharter));
      } catch (err) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Gagal memuat piagam.";
        toast.error(message);
        router.push("/management/charters");
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
        title: "Identitas Piagam",
        required: true,
        done: Boolean(watched.organizationId && watched.period && watched.uprLevel && watched.riskOwnerName),
      },
      { id: "scope", title: "Ruang Lingkup", required: false, done: Boolean(watched.scope?.trim()) },
      { id: "legal", title: "Dasar Hukum", required: false, done: Boolean(watched.legalBasis?.trim()) },
      { id: "internal", title: "Konteks Internal", required: false, done: Boolean(watched.internalContext?.trim()) },
      { id: "external", title: "Konteks Eksternal", required: false, done: Boolean(watched.externalContext?.trim()) },
      { id: "stakeholder", title: "Ringkasan Stakeholder", required: false, done: Boolean(watched.stakeholderSummary?.trim()) },
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
        riskOwnerUserId: values.riskOwnerUserId || undefined,
      };

      const response = isCreateMode
        ? await createRiskCharter(activeToken, payload)
        : await updateRiskCharter(activeToken, id, payload);

      toast.success(isCreateMode ? "Piagam berhasil dibuat." : "Piagam berhasil diperbarui.");
      router.replace(`/management/charters/${response.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan piagam.";
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
            Memuat detail piagam...
          </CardContent>
        </Card>
      </FormPage>
    );
  }

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title={isCreateMode ? "Buat Piagam MR" : "Detail Piagam MR"}
        description={
          isCreateMode
            ? "Lengkapi konteks, dasar hukum, dan identitas piagam untuk memudahkan peninjauan ulang."
            : "Perbarui isi piagam sesuai kebutuhan unit kerja."
        }
        onBack={() => router.push("/management/charters")}
        backLabel="Kembali ke Piagam MR"
        badges={
          <>
            <Badge className="gap-2 border-primary/15 bg-primary/[0.06] px-2.5 py-0.5 text-primary">
              <ClipboardPenLine className="size-3.5" />
              Risk Governance
            </Badge>
            {!isCreateMode && charter ? (
              <Badge className={cn("border", statusVariant[charter.status])}>
                {statusLabel[charter.status]}
              </Badge>
            ) : null}
          </>
        }
        actions={
          <Button onClick={form.handleSubmit(onSubmit)} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isCreateMode ? "Simpan Piagam" : "Perbarui Piagam"}
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
                      <Label>Level UPR</Label>
                      <Select value={watched.uprLevel} onValueChange={(value) => form.setValue("uprLevel", value as RiskCharterUPRLevel, { shouldValidate: true })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih level UPR" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(uprLevelLabel).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formState.errors.uprLevel && (
                        <p className="text-xs text-destructive">{formState.errors.uprLevel.message}</p>
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
                    <div className="space-y-2">
                      <Label>Risk Owner</Label>
                      <Select value={watched.riskOwnerUserId ?? ""} onValueChange={(value) => {
                        const user = users.find((u) => u.id === value);
                        form.setValue("riskOwnerUserId", value, { shouldValidate: true });
                        if (user) form.setValue("riskOwnerName", user.name, { shouldValidate: true });
                      }}>
                        <SelectTrigger className={cn(formState.errors.riskOwnerName && "border-destructive")}>
                          <SelectValue placeholder="Pilih risk owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name}{user.jabatan ? ` \u2014 ${user.jabatan}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {watched.riskOwnerName && !watched.riskOwnerUserId ? (
                        <p className="text-xs text-muted-foreground">{watched.riskOwnerName}</p>
                      ) : null}
                      {formState.errors.riskOwnerName && (
                        <p className="text-xs text-destructive">{formState.errors.riskOwnerName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Tim Risiko / Sekretariat UPR</Label>
                      <Input value={watched.riskTeamName} onChange={(event) => form.setValue("riskTeamName", event.target.value)} placeholder="Nama tim, sekretariat, atau unit koordinasi" />
                    </div>
                  </div>
                ) : null}

                {section.id === "scope" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Cakupan proses, unit, dan area kerja yang termasuk dalam piagam. Juga batasan yang tidak termasuk.
                    </p>
                    <Textarea
                      value={watched.scope}
                      onChange={(event) => form.setValue("scope", event.target.value)}
                      placeholder="Jelaskan cakupan piagam, proses, unit, dan area kerja yang termasuk dalam charter ini."
                      className="min-h-[160px]"
                    />
                  </div>
                ) : null}

                {section.id === "legal" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Regulasi, keputusan, pedoman, atau mandat yang menjadi landasan piagam. Cantumkan nomor dan tahun peraturan.
                    </p>
                    <Textarea
                      value={watched.legalBasis}
                      onChange={(event) => form.setValue("legalBasis", event.target.value)}
                      placeholder="Cantumkan regulasi, keputusan, pedoman, atau mandat yang menjadi dasar piagam."
                      className="min-h-[160px]"
                    />
                  </div>
                ) : null}

                {section.id === "internal" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Kondisi internal: struktur organisasi, kapasitas sumber daya, budaya risiko, dan isu operasional utama.
                    </p>
                    <Textarea
                      value={watched.internalContext}
                      onChange={(event) => form.setValue("internalContext", event.target.value)}
                      placeholder="Tuliskan kondisi internal, struktur organisasi, kapasitas, dan isu operasional utama yang memengaruhi charter."
                      className="min-h-[180px]"
                    />
                  </div>
                ) : null}

                {section.id === "external" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Faktor regulasi, politik, sosial, lintas instansi, dan kondisi lingkungan eksternal yang memengaruhi pengelolaan risiko.
                    </p>
                    <Textarea
                      value={watched.externalContext}
                      onChange={(event) => form.setValue("externalContext", event.target.value)}
                      placeholder="Tuliskan faktor regulasi, politik, sosial, lintas instansi, dan kondisi eksternal lain yang relevan."
                      className="min-h-[180px]"
                    />
                  </div>
                ) : null}

                {section.id === "stakeholder" ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-5 text-muted-foreground">
                      Pihak utama yang terpengaruh atau memengaruhi charter: ekspektasi, peran, dan keterkaitannya dengan pengelolaan risiko.
                    </p>
                    <Textarea
                      value={watched.stakeholderSummary}
                      onChange={(event) => form.setValue("stakeholderSummary", event.target.value)}
                      placeholder="Ringkas stakeholder utama, ekspektasi mereka, dan keterkaitannya dengan charter MR."
                      className="min-h-[180px]"
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
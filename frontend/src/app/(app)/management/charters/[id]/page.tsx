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
import {
  createRiskCharter,
  getRiskCharter,
  updateRiskCharter,
} from "@/lib/api/risk-charters";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskCharter, RiskCharterUPRLevel } from "@/types/risk-charter";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const uprLevelLabel: Record<RiskCharterUPRLevel, string> = {
  eksekutif: "Eksekutif",
  upr_t1: "UPR T1",
  upr_t2: "UPR T2",
};

const charterStatusLabel: Record<string, string> = {
  draft: "Draft",
  in_review: "Diperiksa",
  active: "Aktif",
  archived: "Diarsipkan",
};

function getCharterStatusBadgeClass(status?: string) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "in_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "archived":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

const formSchema = z.object({
  organizationId: z.string().min(1, "Organisasi wajib dipilih"),
  uprLevel: z.enum(["eksekutif", "upr_t1", "upr_t2"]),
  period: z.string().min(1, "Periode wajib diisi"),
  scope: z.string().default(""),
  legalBasis: z.string().default(""),
  internalContext: z.string().default(""),
  externalContext: z.string().default(""),
  stakeholderSummary: z.string().default(""),
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

function normalizeFormValues(
  charter?: RiskCharter | null,
  defaults?: {
    organizationId?: string;
    uprLevel?: RiskCharterUPRLevel;
    period?: string;
  },
): FormValues {
  return {
    organizationId: charter?.organizationId ?? defaults?.organizationId ?? "",
    uprLevel: charter?.uprLevel ?? defaults?.uprLevel ?? "upr_t1",
    period: charter?.period ?? defaults?.period ?? currentAssessmentCycle(),
    scope: charter?.scope ?? "",
    legalBasis: charter?.legalBasis ?? "",
    internalContext: charter?.internalContext ?? "",
    externalContext: charter?.externalContext ?? "",
    stakeholderSummary: charter?.stakeholderSummary ?? "",
  };
}

export default function RiskCharterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const isCreateMode = id === "new";

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
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
          isCreateMode
            ? Promise.resolve(null)
            : getRiskCharter(activeToken, id),
        ]);

        if (!active) return;
        setOrganizations(orgs);
        setCharter(currentCharter);
        form.reset(
          normalizeFormValues(currentCharter, {
            organizationId:
              currentCharter?.organizationId ?? user?.organizationId ?? "",
            uprLevel:
              currentCharter?.uprLevel ??
              (orgs.find(
                (organization) => organization.id === user?.organizationId,
              )?.uprLevel as RiskCharterUPRLevel | undefined) ??
              "upr_t1",
            period: currentCharter?.period ?? currentAssessmentCycle(),
          }),
        );
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Gagal memuat piagam.";
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
  }, [form, id, isCreateMode, router, token, user?.organizationId]);

  const watched = form.watch();
  const currentStatus = charter?.status ?? "draft";
  const currentOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => organization.id === watched.organizationId,
      ) ?? null,
    [organizations, watched.organizationId],
  );

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
    const items: Array<{
      id: SectionId;
      title: string;
      required: boolean;
      done: boolean;
    }> = [
      {
        id: "identitas",
        title: "Identitas Piagam",
        required: true,
        done: Boolean(
          watched.organizationId && watched.period && watched.uprLevel,
        ),
      },
      {
        id: "scope",
        title: "Ruang Lingkup",
        required: false,
        done: Boolean(watched.scope?.trim()),
      },
      {
        id: "legal",
        title: "Dasar Hukum",
        required: false,
        done: Boolean(watched.legalBasis?.trim()),
      },
      {
        id: "internal",
        title: "Konteks Internal",
        required: false,
        done: Boolean(watched.internalContext?.trim()),
      },
      {
        id: "external",
        title: "Konteks Eksternal",
        required: false,
        done: Boolean(watched.externalContext?.trim()),
      },
      {
        id: "stakeholder",
        title: "Ringkasan Stakeholder",
        required: false,
        done: Boolean(watched.stakeholderSummary?.trim()),
      },
    ];

    return items;
  }, [watched]);

  async function onSubmit(values: FormValues) {
    if (!token) return;

    const activeToken = token;

    try {
      setSaving(true);
      const payload = { ...values };

      const response = isCreateMode
        ? await createRiskCharter(activeToken, payload)
        : await updateRiskCharter(activeToken, id, payload);

      toast.success(
        isCreateMode
          ? "Piagam berhasil dibuat."
          : "Piagam berhasil diperbarui.",
      );
      router.replace(`/management/charters/${response.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan piagam.";
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
        title={isCreateMode ? "Buat Piagam" : "Detail Piagam"}
        description={
          isCreateMode
            ? "Lengkapi konteks, dasar hukum, dan identitas piagam untuk memudahkan peninjauan ulang."
            : "Perbarui isi piagam sesuai kebutuhan unit kerja."
        }
        onBack={() => router.push("/management/charters")}
        backLabel="Kembali ke Piagam"
        badges={
          <>
            <Badge className="gap-2 -primary/15 bg-primary/[0.06] px-2.5 py-0.5 text-primary">
              <ClipboardPenLine className="size-3.5" />
              Risk Governance
            </Badge>
            <Badge
 variant="outline"
 className={cn(
 "gap-2 px-2.5 py-0.5 text-[11px]",
 getCharterStatusBadgeClass(currentStatus),
 )}
            >
              {charterStatusLabel[currentStatus] ?? currentStatus}
            </Badge>
          </>
        }
        actions={
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {isCreateMode ? "Simpan Piagam" : "Perbarui Piagam"}
          </Button>
        }
      />

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-border/40 shadow-sm">
          <CardContent className="space-y-0 p-0">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                {index > 0 && <Separator className="bg-border/50" />}
                <div
                  className={cn(
                    "flex items-center gap-2",
                    index === 0 ? "px-6 pt-6 pb-4" : "px-6 pt-5 pb-4",
                  )}
                >
                  <h3 className="text-sm font-semibold text-foreground md:text-base">
                    {section.title}
                  </h3>
                  {section.required ? (
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-primary/80">
                      Wajib
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      opsional
                    </span>
                  )}
                  <div
                    className={cn(
                      "ml-auto flex size-6 shrink-0 items-center justify-center rounded-full",
                      section.done
                        ? "bg-success/10 text-success"
                        : "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {section.done ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <CircleDot className="size-3.5" />
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  {section.id === "identitas" ? (
                    <div className="space-y-4">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Identitas piagam diturunkan otomatis dari konteks akun
                        dan organisasi aktif. Ubah konteks organisasi melalui
                        pengaturan akun bila perlu.
                      </p>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Organisasi
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {currentOrganization?.name ??
                              user?.orgName ??
                              "Belum tersedia"}
                          </p>
                          {!watched.organizationId ? (
                            <p className="mt-2 text-xs text-destructive">
                              Organisasi aktif belum tersedia pada akun ini.
                            </p>
                          ) : null}
                          {formState.errors.organizationId ? (
                            <p className="mt-2 text-xs text-destructive">
                              {formState.errors.organizationId.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Level UPR
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {uprLevelLabel[watched.uprLevel] ??
                              watched.uprLevel}
                          </p>
                          {formState.errors.uprLevel ? (
                            <p className="mt-2 text-xs text-destructive">
                              {formState.errors.uprLevel.message}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            Periode
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {watched.period || currentAssessmentCycle()}
                          </p>
                          {formState.errors.period ? (
                            <p className="mt-2 text-xs text-destructive">
                              {formState.errors.period.message}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {section.id === "scope" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Cakupan proses, unit, dan area kerja yang termasuk dalam
                        piagam. Juga batasan yang tidak termasuk.
                      </p>
                      <Textarea
                        value={watched.scope}
                        onChange={(event) =>
                          form.setValue("scope", event.target.value)
                        }
                        placeholder="Jelaskan cakupan piagam, proses, unit, dan area kerja yang termasuk dalam charter ini."
                        className="min-h-[160px]"
                      />
                    </div>
                  ) : null}

                  {section.id === "legal" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Regulasi, keputusan, pedoman, atau mandat yang menjadi
                        landasan piagam. Cantumkan nomor dan tahun peraturan.
                      </p>
                      <Textarea
                        value={watched.legalBasis}
                        onChange={(event) =>
                          form.setValue("legalBasis", event.target.value)
                        }
                        placeholder="Cantumkan regulasi, keputusan, pedoman, atau mandat yang menjadi dasar piagam."
                        className="min-h-[160px]"
                      />
                    </div>
                  ) : null}

                  {section.id === "internal" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Kondisi internal: struktur organisasi, kapasitas sumber
                        daya, budaya risiko, dan isu operasional utama.
                      </p>
                      <Textarea
                        value={watched.internalContext}
                        onChange={(event) =>
                          form.setValue("internalContext", event.target.value)
                        }
                        placeholder="Tuliskan kondisi internal, struktur organisasi, kapasitas, dan isu operasional utama yang memengaruhi charter."
                        className="min-h-[180px]"
                      />
                    </div>
                  ) : null}

                  {section.id === "external" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Faktor regulasi, politik, sosial, lintas instansi, dan
                        kondisi lingkungan eksternal yang memengaruhi
                        pengelolaan risiko.
                      </p>
                      <Textarea
                        value={watched.externalContext}
                        onChange={(event) =>
                          form.setValue("externalContext", event.target.value)
                        }
                        placeholder="Tuliskan faktor regulasi, politik, sosial, lintas instansi, dan kondisi eksternal lain yang relevan."
                        className="min-h-[180px]"
                      />
                    </div>
                  ) : null}

                  {section.id === "stakeholder" ? (
                    <div className="space-y-2">
                      <p className="text-xs leading-5 text-muted-foreground">
                        Pihak utama yang terpengaruh atau memengaruhi charter:
                        ekspektasi, peran, dan keterkaitannya dengan pengelolaan
                        risiko.
                      </p>
                      <Textarea
                        value={watched.stakeholderSummary}
                        onChange={(event) =>
                          form.setValue(
                            "stakeholderSummary",
                            event.target.value,
                          )
                        }
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

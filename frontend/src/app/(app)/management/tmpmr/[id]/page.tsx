"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
} from "@/components/ui/icons";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import {
  approveTMPMRAssessment,
  createTMPMRAssessment,
  getTMPMRAssessment,
  reviewTMPMRAssessment,
  submitTMPMRAssessment,
  updateTMPMRAssessment,
} from "@/lib/api/tmpmr";
import type {
  TMPMRAssessment,
  TMPMRDimension,
  TMPMRItem,
  TMPMRStatus,
} from "@/types/tmpmr";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

type TMPMRDimensionTemplate = {
  key: TMPMRDimension;
  title: string;
  description: string;
  question: string;
};

const dimensionTemplates: TMPMRDimensionTemplate[] = [
  {
    key: "governance",
    title: "Governance",
    description: "Kepemimpinan, mandat, dan tata kelola manajemen risiko.",
    question: "Tata kelola manajemen risiko telah ditetapkan dan dijalankan.",
  },
  {
    key: "context_criteria",
    title: "Context & Criteria",
    description: "Konteks, ruang lingkup, dan kriteria penilaian risiko.",
    question: "Konteks, cakupan, dan kriteria risiko telah terdokumentasi.",
  },
  {
    key: "risk_assessment",
    title: "Risk Assessment",
    description: "Identifikasi, analisis, dan evaluasi risiko.",
    question: "Identifikasi, analisis, dan evaluasi risiko dilakukan berbasis sasaran.",
  },
  {
    key: "risk_treatment",
    title: "Risk Treatment",
    description: "Perlakuan risiko dan penanggung jawab tindak lanjut.",
    question: "Perlakuan risiko disusun, dipantau, dan memiliki penanggung jawab.",
  },
  {
    key: "monitoring_review",
    title: "Monitoring & Review",
    description: "Pemantauan, reviu, dan eskalasi perbaikan.",
    question: "Pemantauan dan reviu risiko dilakukan secara berkala.",
  },
  {
    key: "recording_reporting",
    title: "Recording & Reporting",
    description: "Pencatatan, pelaporan, dan bukti audit.",
    question: "Pencatatan dan pelaporan risiko tersedia sebagai bukti audit.",
  },
];

const statusLabel: Record<TMPMRStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewed: "Reviewed",
  approved: "Approved",
};

const statusStyles: Record<TMPMRStatus, string> = {
  draft: "border-border/60 bg-muted/40 text-muted-foreground",
  submitted: "border-primary/20 bg-primary/5 text-primary",
  reviewed: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const maturityStyles = [
  { match: "Awal", className: "border-border/60 bg-muted/40 text-muted-foreground" },
  { match: "Berkembang", className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { match: "Terdefinisi", className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  { match: "Terkelola", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { match: "Optimum", className: "border-primary/20 bg-primary/5 text-primary" },
];

function currentPeriod() {
  return new Date().getFullYear().toString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function calculateMaturityLevel(score: number) {
  if (score < 1.5) return "Awal";
  if (score < 2.5) return "Berkembang";
  if (score < 3.5) return "Terdefinisi";
  if (score < 4.5) return "Terkelola";
  return "Optimum";
}

function getMaturityClass(maturityLevel: string) {
  return maturityStyles.find((item) => maturityLevel.includes(item.match))?.className ??
    "border-border/60 bg-muted/40 text-muted-foreground";
}

function cloneDefaultItems(): TMPMRItem[] {
  return dimensionTemplates.map((template) => ({
    id: "",
    assessmentId: "",
    dimension: template.key,
    question: template.question,
    score: 0,
    evidenceUrl: "",
    notes: "",
    createdAt: "",
    updatedAt: "",
  }));
}

function mergeItems(items: TMPMRItem[]) {
  const byDimension = new Map(items.map((item) => [item.dimension, item]));
  return dimensionTemplates.map((template) => {
    const item = byDimension.get(template.key);
    return {
      id: item?.id ?? "",
      assessmentId: item?.assessmentId ?? "",
      dimension: template.key,
      question: item?.question?.trim() || template.question,
      score: typeof item?.score === "number" ? item.score : 0,
      evidenceUrl: item?.evidenceUrl ?? "",
      notes: item?.notes ?? "",
      createdAt: item?.createdAt ?? "",
      updatedAt: item?.updatedAt ?? "",
    } satisfies TMPMRItem;
  });
}

export default function TMPMRDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const isCreateMode = id === "new";

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [assessment, setAssessment] = useState<TMPMRAssessment | null>(null);
  const [organizationId, setOrganizationId] = useState("");
  const [period, setPeriod] = useState(currentPeriod());
  const [assessorId, setAssessorId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<TMPMRItem[]>(cloneDefaultItems());
  const [reviewNote, setReviewNote] = useState("");

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [orgs, currentAssessment] = await Promise.all([
        listAllOrganizations(token),
        isCreateMode ? Promise.resolve(null) : getTMPMRAssessment(token, id),
      ]);

      setOrganizations(orgs);

      if (isCreateMode) {
        setAssessment(null);
        setOrganizationId((current) => current || user?.organizationId || orgs[0]?.id || "");
        setPeriod((current) => current || currentPeriod());
        setAssessorId(user?.id);
        setItems(cloneDefaultItems());
        setReviewNote("");
      } else if (currentAssessment) {
        setAssessment(currentAssessment);
        setOrganizationId(currentAssessment.organizationId);
        setPeriod(currentAssessment.period);
        setAssessorId(currentAssessment.assessorId ?? user?.id);
        setItems(mergeItems(currentAssessment.items ?? []));
        setReviewNote(currentAssessment.reviewNote ?? "");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat TMPMR.";
      toast.error(message);
      router.push("/management/tmpmr");
    } finally {
      setLoading(false);
    }
  }, [id, isCreateMode, router, token, user?.id, user?.organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isCreateMode) return;
    if (!organizationId && user?.organizationId) {
      setOrganizationId(user.organizationId);
    }
    if (!assessorId && user?.id) {
      setAssessorId(user.id);
    }
  }, [assessorId, isCreateMode, organizationId, user?.id, user?.organizationId]);

  const status = assessment?.status ?? (isCreateMode ? "draft" : null);
  const isApproved = status === "approved";
  const isDraft = isCreateMode || status === "draft";
  const isSubmitted = status === "submitted";
  const isReviewed = status === "reviewed";
  const canEditItems = !isApproved && isDraft;
  const canSave = !isApproved;
  const canSubmit = !isCreateMode && status === "draft";
  const canReview = status === "submitted";
  const canApprove = status === "reviewed";
  const summary = useMemo(() => {
    const totalScore = items.reduce((sum, item) => sum + Number(item.score || 0), 0);
    const score = items.length > 0 ? totalScore / items.length : 0;
    const completed = items.filter((item) => Number(item.score) > 0).length;

    return {
      score,
      maturityLevel: calculateMaturityLevel(score),
      completed,
      readyToSubmit: items.length > 0 && items.every((item) => Number(item.score) > 0),
    };
  }, [items]);

  const organizationName = useMemo(
    () => organizations.find((item) => item.id === organizationId)?.name || "Belum dipilih",
    [organizationId, organizations],
  );

  const updateItem = useCallback(
    (index: number, patch: Partial<TMPMRItem>) => {
      setItems((current) =>
        current.map((item, currentIndex) =>
          currentIndex === index ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  const buildPayload = useCallback(() => {
    return {
      organizationId,
      period: period.trim(),
      assessorId: assessorId || user?.id || undefined,
      items: items.map((item) => ({
        id: item.id || undefined,
        dimension: item.dimension,
        question: item.question.trim(),
        score: Number(item.score || 0),
        evidenceUrl: item.evidenceUrl.trim(),
        notes: item.notes.trim(),
      })),
    };
  }, [assessorId, items, organizationId, period, user?.id]);

  const handleSave = useCallback(async () => {
    if (!token) return;
    if (!organizationId) {
      toast.error("Organisasi harus dipilih.");
      return;
    }
    if (!period.trim()) {
      toast.error("Periode harus diisi.");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      const response = isCreateMode
        ? await createTMPMRAssessment(token, payload)
        : await updateTMPMRAssessment(token, id, payload);

      setAssessment(response);
      setOrganizationId(response.organizationId);
      setPeriod(response.period);
      setAssessorId(response.assessorId ?? user?.id);
      setItems(mergeItems(response.items ?? []));
      setReviewNote(response.reviewNote ?? "");

      toast.success(isCreateMode ? "TMPMR berhasil dibuat." : "TMPMR berhasil disimpan.");
      if (isCreateMode) {
        router.replace(`/management/tmpmr/${response.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan TMPMR.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [buildPayload, id, isCreateMode, organizationId, period, router, token, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (!token || !assessment) return;
    if (!summary.readyToSubmit) {
      toast.error("Pastikan seluruh skor sudah diisi sebelum submit.");
      return;
    }

    try {
      setSaving(true);
      const response = await submitTMPMRAssessment(token, assessment.id);
      setAssessment(response);
      setItems(mergeItems(response.items ?? []));
      setReviewNote(response.reviewNote ?? "");
      toast.success("TMPMR berhasil diajukan.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengajukan TMPMR.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [assessment, summary.readyToSubmit, token]);

  const handleReview = useCallback(async () => {
    if (!token || !assessment) return;
    if (!reviewNote.trim()) {
      toast.error("Catatan review perlu diisi.");
      return;
    }

    try {
      setSaving(true);
      const response = await reviewTMPMRAssessment(token, assessment.id, {
        reviewerId: user?.id,
        reviewNote: reviewNote.trim(),
      });
      setAssessment(response);
      setItems(mergeItems(response.items ?? []));
      setReviewNote(response.reviewNote ?? "");
      toast.success("TMPMR berhasil direview.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mereview TMPMR.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [assessment, reviewNote, token, user?.id]);

  const handleApprove = useCallback(async () => {
    if (!token || !assessment) return;

    try {
      setSaving(true);
      const response = await approveTMPMRAssessment(token, assessment.id);
      setAssessment(response);
      setItems(mergeItems(response.items ?? []));
      setReviewNote(response.reviewNote ?? "");
      toast.success("TMPMR berhasil di-approve.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal meng-approve TMPMR.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [assessment, token]);

  const statusBadges = (
    <>
      <Badge className="gap-2 -primary/15 bg-primary/[0.06] px-2.5 py-0.5 text-primary">
        <ClipboardList className="size-3.5" />
        Risk Governance
      </Badge>
      <Badge variant="outline" className={cn("px-2.5 py-0.5", status ? statusStyles[status] : statusStyles.draft)}>
        {status ? statusLabel[status] : "Draft"}
      </Badge>
      {isApproved ? (
        <Badge variant="outline" className="gap-1.5 -emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-3.5" />
          Read-only
        </Badge>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <FormPage className="max-w-7xl">
        <Card>
          <CardContent className="flex min-h-[360px] items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Memuat detail TMPMR...
          </CardContent>
        </Card>
      </FormPage>
    );
  }

  return (
    <FormPage className="max-w-7xl">
      <FormHeader
        title={isCreateMode ? "Buat TMPMR" : "Detail TMPMR"}
        onBack={() => router.push("/management/tmpmr")}
        backLabel="Kembali ke TMPMR"
        badges={statusBadges}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={loadData} disabled={saving}>
              <RefreshCw className="size-4" />
              Muat Ulang
            </Button>
            {canSave ? (
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {isCreateMode ? "Simpan Draft" : "Simpan"}
              </Button>
            ) : null}
            {canSubmit ? (
              <Button variant="secondary" onClick={handleSubmit} disabled={saving || !summary.readyToSubmit} className="gap-2">
                <Send className="size-4" />
                Submit
              </Button>
            ) : null}
            {canReview ? (
              <Button variant="secondary" onClick={handleReview} disabled={saving || !reviewNote.trim()} className="gap-2">
                <ShieldCheck className="size-4" />
                Review
              </Button>
            ) : null}
            {canApprove ? (
              <Button variant="success" onClick={handleApprove} disabled={saving} className="gap-2">
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <FormSection
            title="Identitas Assessment"
            description="Tetapkan organisasi dan periode yang dinilai. Data ini menentukan satu assessment per organisasi dan periode."
            contentClassName="space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tmpmr-organization">Organisasi</Label>
                <Select
                  value={organizationId}
                  onValueChange={setOrganizationId}
                  disabled={!isDraft || isApproved}
                >
                  <SelectTrigger id="tmpmr-organization">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="tmpmr-period">Periode</Label>
                <Input
                  id="tmpmr-period"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  placeholder={currentPeriod()}
                  disabled={!isDraft || isApproved}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Penilai</Label>
                <Input
                  value={assessorId || user?.id || "-"}
                  disabled
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label>Status Terkini</Label>
                <div className="flex h-8 items-center">
                  <Badge variant="outline" className={cn("px-2.5 py-0.5", status ? statusStyles[status] : statusStyles.draft)}>
                    {status ? statusLabel[status] : "Draft"}
                  </Badge>
                </div>
              </div>
            </div>
          </FormSection>

          {dimensionTemplates.map((template, index) => {
            const item = items[index];
            const fieldPrefix = `tmpmr-${template.key}`;

            return (
              <FormSection
                key={template.key}
                title={template.title}
                description={template.description}
                contentClassName="space-y-5"
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Pertanyaan</p>
                  <p className="text-sm leading-6 text-muted-foreground">{item.question}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-score`}>Skor 0-5</Label>
                    <Select
                      value={String(item.score)}
                      onValueChange={(value) => updateItem(index, { score: Number(value) })}
                      disabled={!canEditItems}
                    >
                      <SelectTrigger id={`${fieldPrefix}-score`}>
                        <SelectValue placeholder="Pilih skor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Belum diisi</SelectItem>
                        <SelectItem value="1">1 - Awal</SelectItem>
                        <SelectItem value="2">2 - Dasar</SelectItem>
                        <SelectItem value="3">3 - Terdefinisi</SelectItem>
                        <SelectItem value="4">4 - Terkelola</SelectItem>
                        <SelectItem value="5">5 - Optimum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${fieldPrefix}-evidence`}>Evidence URL</Label>
                      <Input
                        id={`${fieldPrefix}-evidence`}
                        value={item.evidenceUrl}
                        onChange={(event) => updateItem(index, { evidenceUrl: event.target.value })}
                        placeholder="https://..."
                        disabled={!canEditItems}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`${fieldPrefix}-notes`}>Catatan</Label>
                      <Textarea
                        id={`${fieldPrefix}-notes`}
                        value={item.notes}
                        onChange={(event) => updateItem(index, { notes: event.target.value })}
                        placeholder="Tambahkan ringkasan bukti, temuan, atau tindak lanjut."
                        disabled={!canEditItems}
                      />
                    </div>
                  </div>
                </div>
              </FormSection>
            );
          })}

          {(isSubmitted || isReviewed || isApproved) ? (
            <FormSection
              title="Catatan Review"
              description="Catatan reviewer dipakai saat assessment masuk ke tahap review."
              contentClassName="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="tmpmr-review-note">Review note</Label>
                <Textarea
                  id="tmpmr-review-note"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Tulis catatan review."
                  disabled={!canReview && !isReviewed}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isReviewed || isApproved
                  ? "Catatan ini sudah tersimpan dan bersifat informatif."
                  : "Isi catatan ini sebelum menekan tombol Review."}
              </p>
            </FormSection>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="space-y-4 px-4 py-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                  Ringkasan
                </p>
                <div className="space-y-1">
                  <p className="text-base font-semibold leading-6">
                    {organizationName}
                  </p>
                  <p className="text-sm text-muted-foreground">Periode {period || "-"}</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Skor Rata-rata
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    {summary.score.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Maturity Level
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className={cn("px-2.5 py-0.5", getMaturityClass(summary.maturityLevel))}>
                      {summary.maturityLevel}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Kelengkapan Item
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {summary.completed} / {dimensionTemplates.length} item terisi
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.readyToSubmit
                      ? "Seluruh skor sudah terisi dan assessment siap diajukan."
                      : "Masih ada item dengan skor 0."}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Status Alur
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={cn("px-2.5 py-0.5", status ? statusStyles[status] : statusStyles.draft)}>
                    {status ? statusLabel[status] : "Draft"}
                  </Badge>
                  {isApproved ? (
                    <Badge variant="outline" className="-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      Selesai
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-4 text-xs text-muted-foreground">
                <p>Diperbarui: {formatDateTime(assessment?.updatedAt)}</p>
                <p>Dibuat: {formatDateTime(assessment?.createdAt)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/20">
            <CardContent className="space-y-3 px-4 py-4">
              <p className="text-sm font-medium">Panduan singkat</p>
              <p className="text-sm leading-6 text-secondary-foreground">
                Isi skor dari 1 sampai 5 untuk semua dimensi sebelum submit. Setelah masuk review, item dikunci dan hanya catatan review yang bisa diperbarui.
              </p>
              {!isCreateMode ? (
                <Button variant="outline" size="sm" asChild className="gap-2">
                  <Link href="/reports">
                    Lihat Reports
                    <RefreshCw className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </FormPage>
  );
}

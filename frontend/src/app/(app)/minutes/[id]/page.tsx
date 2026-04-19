"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { deleteMeetingMinute, getMeetingMinute } from "@/lib/meeting-minutes";
import type { MeetingMinuteWithRisks } from "@/types/meeting-minute";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CalendarDays, Users, CheckCircle2, Link2, AlertCircle, Clock, User, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MeetingMinuteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState<MeetingMinuteWithRisks | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!token || !id) return;

    setLoading(true);
    getMeetingMinute(id, token)
      .then(data => {
        setMinutes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat detail notulen...</p>
        </div>
      </div>
    );
  }

  if (!minutes) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="size-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">Notulen Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Notulen tidak ditemukan atau Anda tidak memiliki akses.</p>
          <Button onClick={() => router.push("/minutes")} variant="outline">Kembali ke Daftar Notulen</Button>
        </div>
      </div>
    );
  }

  const priorityConfig = {
    High: { label: "Tinggi", variant: "destructive" as const },
    Medium: { label: "Sedang", variant: "default" as const },
    Low: { label: "Rendah", variant: "secondary" as const },
  };

  const statusConfig = {
    open: { label: "Terbuka", variant: "outline" as const, className: "border-orange-500/50 text-orange-600" },
    on_track: { label: "On Track", variant: "outline" as const, className: "border-green-500/50 text-green-600" },
    blocked: { label: "Terblokir", variant: "outline" as const, className: "border-red-500/50 text-red-600" },
  };

  const handleDelete = async () => {
    if (!token || !minutes) return;

    setIsDeleting(true);
    try {
      await deleteMeetingMinute(minutes.id, token);
      toast.success("Notulen berhasil dihapus.");
      router.push("/minutes");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal menghapus notulen.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <FormPage>
      <FormHeader
        title={minutes.title}
        description="Detail notulen rapat dan informasi terkait."
        badges={
          <>
            <Badge variant="outline" className="font-mono text-[10px]">
              {minutes.id.substring(0, 8)}
            </Badge>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <CalendarDays className="size-3" />
              {new Date(minutes.date).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Badge>
          </>
        }
        actions={
          !isReadOnlyForOrg(user, minutes.organizationId || "") ? (
            <Button
              variant="outline"
              className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-4" /> Hapus Notulen
            </Button>
          ) : undefined
        }
        onBack={() => router.back()}
      />

      <div className="grid gap-8 lg:gap-12 md:grid-cols-3 items-start">
        <div className="md:col-span-2 space-y-8 lg:space-y-10">
          <FormSection
            title="Informasi Rapat"
            description="Peserta, agenda, dan ringkasan notulen."
          >
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4.5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Peserta</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {minutes.participants.map((participant, idx) => (
                    <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-secondary/60 hover:bg-secondary/80 transition-colors">
                      {participant}
                    </Badge>
                  ))}
                </div>
              </div>

              {minutes.agenda.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Agenda</h3>
                  <ul className="grid gap-2">
                    {minutes.agenda.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1.5 size-1.5 rounded-full bg-primary/40 shrink-0" />
                        <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Ringkasan</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{minutes.summary}</p>
              </div>

              {minutes.nextCheckIn && (
                <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-4 shadow-sm">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="size-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Next Check-in</span>
                    <span className="text-sm font-semibold text-foreground">
                      {new Date(minutes.nextCheckIn).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          {minutes.keyPoints.length > 0 && (
            <FormSection title="Poin-Poin Kunci">
              <ul className="grid gap-4">
                {minutes.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-4">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <div className="size-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-sm leading-relaxed text-muted-foreground mt-0.5">{point}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}

          {minutes.decisions.length > 0 && (
            <FormSection
              title="Keputusan"
              action={
                <div className="flex size-8 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="size-4.5 text-success" />
                </div>
              }
            >
              <ul className="grid gap-4">
                {minutes.decisions.map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:shadow-md">
                    <CheckCircle2 className="size-5 text-success mt-0.5 shrink-0" />
                    <span className="text-sm font-medium leading-relaxed text-foreground">{decision}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}

          {minutes.actionItems.length > 0 && (
            <FormSection title="Tindak Lanjut">
              <div className="grid gap-4">
                {minutes.actionItems.map((action, idx) => (
                  <div key={idx} className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold leading-snug text-foreground">{action.task}</p>
                      <Badge
                        variant={priorityConfig[action.priority].variant}
                        className="shrink-0 px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold"
                      >
                        {priorityConfig[action.priority].label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{action.pic}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{new Date(action.deadline).toLocaleDateString("id-ID")}</span>
                      </div>
                      {action.status && (
                        <div className="ml-auto">
                          <Badge
                            variant={statusConfig[action.status].variant}
                            className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusConfig[action.status].className)}
                          >
                            {statusConfig[action.status].label}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {action.notes && (
                      <p className="text-sm leading-relaxed text-muted-foreground italic pl-3 border-l-2 border-border/60">{action.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          {minutes.openIssues.length > 0 && (
            <FormSection title="Isu Terbuka">
              <ul className="grid gap-3">
                {minutes.openIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-4 rounded-lg bg-amber-500/5 p-3.5 border border-amber-500/10">
                    <AlertCircle className="size-5 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-sm leading-relaxed text-amber-950 dark:text-amber-200/90">{issue}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}
        </div>

        <div className="space-y-8 lg:space-y-10">
          <FormSection
            title="Risiko Terkait"
            action={<Link2 className="size-4.5 text-muted-foreground" />}
          >
            {(minutes.linkedRisks?.length ?? 0) > 0 ? (
              <div className="grid gap-3">
                {minutes.linkedRisks.map((risk) => (
                  <Link
                    key={risk.id}
                    href={`/risk/register/${risk.riskId}`}
                    className="group flex flex-col gap-1.5 rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {risk.riskCode || risk.riskId.substring(0, 8)}
                      </span>
                      <Badge variant="outline" className="shrink-0 px-2 py-0 text-[9px] uppercase tracking-wider font-bold">Lihat</Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {risk.riskTitle || "Risiko"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/20 py-8 px-4 text-center">
                <Link2 className="size-6 text-muted-foreground/50" />
                <p className="text-xs font-medium text-muted-foreground">
                  Tidak ada risiko yang terkait.
                </p>
              </div>
            )}
          </FormSection>

          <FormSection title="Metadata">
            <div className="grid gap-5 rounded-xl bg-muted/20 p-5 border border-border/30">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Dibuat Oleh</span>
                <span className="text-sm font-medium text-foreground">{minutes.createdByName}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Dibuat Pada</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(minutes.createdAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Terakhir Diperbarui</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(minutes.updatedAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </FormSection>
        </div>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Notulen?</DialogTitle>
            <DialogDescription>
              Notulen ini akan dihapus permanen beserta relasinya dengan risiko terkait.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">{minutes.title}</p>
            <p className="text-xs text-muted-foreground">{minutes.id}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormPage>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { ActionButton } from "@/components/shared/design-system";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { deleteMeetingMinute, getMeetingMinute } from "@/lib/meeting-minutes";
import { exportMeetingMinuteDocument } from "@/lib/meeting-minute-export";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, CalendarDays, Users, CheckCircle2, Link2, AlertCircle, Clock, Trash2, Download, ArrowLeft } from "@/components/ui/icons";
import Link from "next/link";
import { toast } from "sonner";

export default function MeetingMinuteDetailPage() {
  if (isAIFeaturesDisabled()) {
    return (
      <AIFeaturesDisabledState
        title="Detail Briefing Dinonaktifkan"
        description="Akses ke detail briefing meeting intelligence sedang dimatikan melalui environment frontend."
        backHref="/overview"
      />
    );
  }

  return <MeetingMinuteDetailContent />;
}

function MeetingMinuteDetailContent() {
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
          <p className="text-sm text-muted-foreground">Memuat detail briefing...</p>
        </div>
      </div>
    );
  }

  if (!minutes) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="size-10 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold">Briefing Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-4">Briefing tidak ditemukan atau Anda tidak memiliki akses.</p>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            icon={<ArrowLeft className="size-3.5" aria-hidden="true" />}
            onClick={() => router.push("/minutes")}
          >
            Kembali ke Daftar Briefing
          </ActionButton>
        </div>
      </div>
    );
  }

  const priorityConfig = {
    High: { label: "Tinggi", variant: "destructive" as const },
    Medium: { label: "Sedang", variant: "default" as const },
    Low: { label: "Rendah", variant: "secondary" as const },
  };

  const handleDelete = async () => {
    if (!token || !minutes) return;

    setIsDeleting(true);
    try {
      await deleteMeetingMinute(minutes.id, token);
      toast.success("Briefing berhasil dihapus.");
      router.push("/minutes");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Gagal menghapus briefing.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExport = () => {
    if (!minutes) return;

    exportMeetingMinuteDocument(minutes);
    toast.success("Briefing berhasil diekspor.");
  };

  return (
    <FormPage>
      <FormHeader
        title={minutes.title}
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
          <>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="size-4" /> Export Briefing
            </Button>
            {!isReadOnlyForOrg(user, minutes.organizationId || "") ? (
              <>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="size-4" /> Hapus Briefing
                </Button>
              </>
            ) : null}
          </>
        }
        onBack={() => router.back()}
      />

      <div className="grid gap-8 lg:gap-12 md:grid-cols-3 items-start">
        <div className="md:col-span-2 space-y-8 lg:space-y-10">
          <FormSection
            title="Informasi Rapat"
            description="Peserta, agenda, dan ringkasan briefing."
          >
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4.5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Peserta</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {minutes.participants.map((participant, idx) => (
                    <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-secondary/60 hover:bg-sidebar-accent transition-colors">
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
                <p className="text-sm leading-relaxed text-muted-foreground">{minutes.summary}</p>
              </div>

              {minutes.nextCheckIn && (
                <div className="flex items-center gap-2.5 rounded-xl bg-muted/20 p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Clock className="size-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-muted-foreground">Next check-in</span>
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
                  <li key={idx} className="flex items-start gap-4 rounded-xl bg-card p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 transition-all">
                    <CheckCircle2 className="size-5 text-success mt-0.5 shrink-0" />
                    <span className="text-sm font-medium leading-relaxed text-foreground">{decision}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}

          {minutes.actionItems.length > 0 && (
            <FormSection title="Tindak Lanjut">
              <div className="overflow-hidden rounded-2xl border border-border/50">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="min-w-[260px] text-sm">Tindak Lanjut</TableHead>
                        <TableHead className="min-w-[140px] text-sm">PIC</TableHead>
                        <TableHead className="min-w-[120px] text-sm">Deadline</TableHead>
                        <TableHead className="w-[110px] text-sm">Prioritas</TableHead>
                        <TableHead className="min-w-[220px] text-sm">Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {minutes.actionItems.map((action, idx) => (
                        <TableRow key={`${action.task}-${idx}`} className="border-border/50 hover:bg-muted/20">
                          <TableCell className="align-top">
                            <div className="max-w-[320px]">
                              <p className="truncate text-sm font-semibold leading-snug text-foreground" title={action.task}>
                                {action.task}
                              </p>
                              {action.ownerUnit ? (
                                <p className="mt-1 truncate text-xs text-muted-foreground" title={action.ownerUnit}>
                                  {action.ownerUnit}
                                </p>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[180px] align-top text-sm text-foreground">
                            <span className="block truncate" title={action.pic}>
                              {action.pic}
                            </span>
                          </TableCell>
                          <TableCell className="align-top text-sm text-foreground whitespace-nowrap">
                            {new Date(action.deadline).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge
                              variant={priorityConfig[action.priority].variant}
                              className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            >
                              {priorityConfig[action.priority].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[260px] align-top text-sm text-muted-foreground">
                            {action.notes ? (
                              <span className="block truncate" title={action.notes}>
                                {action.notes}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">&mdash;</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
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
                    className="group flex flex-col gap-1.5 rounded-xl bg-card p-4 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 transition-all hover:bg-primary/[0.02]"
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
            <DialogTitle>Hapus Briefing?</DialogTitle>
            <DialogDescription>
              Briefing ini akan dihapus permanen beserta relasinya dengan risiko terkait.
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
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
  const { token } = useAuth();
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
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="size-4" /> Hapus Notulen
          </Button>
        }
        onBack={() => router.back()}
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <FormSection
            title="Informasi Rapat"
            description="Peserta, agenda, dan ringkasan notulen."
          >
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Peserta</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {minutes.participants.map((participant, idx) => (
                    <Badge key={idx} variant="secondary">
                      {participant}
                    </Badge>
                  ))}
                </div>
              </div>

              {minutes.agenda.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Agenda</p>
                  <ul className="list-disc list-inside space-y-1">
                    {minutes.agenda.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Ringkasan</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{minutes.summary}</p>
              </div>

              {minutes.nextCheckIn && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next Check-in:</span>
                  <span className="font-medium">
                    {new Date(minutes.nextCheckIn).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </FormSection>

          {minutes.keyPoints.length > 0 && (
            <FormSection title="Poin-Poin Kunci">
              <ul className="space-y-2">
                {minutes.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <div className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}

          {minutes.decisions.length > 0 && (
            <FormSection
              title="Keputusan"
              action={
                <CheckCircle2 className="size-4 text-success" />
              }
            >
              <ul className="space-y-2">
                {minutes.decisions.map((decision, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{decision}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}

          {minutes.actionItems.length > 0 && (
            <FormSection title="Tindak Lanjut">
              <div className="space-y-3">
                {minutes.actionItems.map((action, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm font-medium flex-1">{action.task}</p>
                      <Badge
                        variant={priorityConfig[action.priority].variant}
                        className="shrink-0"
                      >
                        {priorityConfig[action.priority].label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="size-3" />
                        <span>{action.pic}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{new Date(action.deadline).toLocaleDateString("id-ID")}</span>
                      </div>
                      {action.status && (
                        <Badge
                          variant={statusConfig[action.status].variant}
                          className={cn("text-[10px]", statusConfig[action.status].className)}
                        >
                          {statusConfig[action.status].label}
                        </Badge>
                      )}
                    </div>
                    {action.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{action.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </FormSection>
          )}

          {minutes.openIssues.length > 0 && (
            <FormSection title="Isu Terbuka">
              <ul className="space-y-2">
                {minutes.openIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm">
                    <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{issue}</span>
                  </li>
                ))}
              </ul>
            </FormSection>
          )}
        </div>

        <div className="space-y-6">
          <FormSection
            title="Risiko Terkait"
            action={<Link2 className="size-4 text-muted-foreground" />}
          >
            {(minutes.linkedRisks?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                {minutes.linkedRisks.map((risk) => (
                  <Link
                    key={risk.id}
                    href={`/risk/register/${risk.riskId}`}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {risk.riskCode || risk.riskId.substring(0, 8)}
                      </span>
                      <p className="text-sm font-medium mt-0.5 truncate">{risk.riskTitle || "Risiko"}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 ml-2">Lihat</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Tidak ada risiko yang terkait dengan notulen ini.
              </p>
            )}
          </FormSection>

          <FormSection title="Metadata">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dibuat Oleh</p>
                <p className="text-sm font-medium">{minutes.createdByName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dibuat Pada</p>
                <p className="text-sm font-medium">
                  {new Date(minutes.createdAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Terakhir Diperbarui</p>
                <p className="text-sm font-medium">
                  {new Date(minutes.updatedAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
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

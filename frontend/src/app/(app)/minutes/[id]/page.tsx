"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import {
  ActionButton,
  CollectionDialogCancel,
  DestructiveButton,
  FormBackAction,
} from "@/components/shared/design-system";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { isReadOnlyForOrg } from "@/lib/auth-helpers";
import { deleteMeetingMinute, getMeetingMinute } from "@/lib/meeting-minutes";
import { exportMeetingMinuteDocument } from "@/lib/meeting-minute-export";
import type { MeetingMinuteWithRisks } from "@/types/meeting-minute";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CalendarDays,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Loader2,
  Trash2,
  UserRound,
  Users,
} from "@/components/ui/icons";
import Link from "next/link";
import { toast } from "sonner";

function BriefingSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t border-border/70 px-6 py-6 md:px-8 ${className ?? ""}`}>
      <h3 className="text-base font-medium tracking-tight text-foreground">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BriefingProperty({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[1.25rem_minmax(7rem,9rem)_minmax(0,1fr)] items-start gap-x-2 text-sm">
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function MeetingMinuteDetailPage() {
  if (isAIFeaturesDisabled()) {
    return (
      <AIFeaturesDisabledState
        title="Detail Notulen Dinonaktifkan"
        description="Akses ke detail notulen meeting intelligence sedang dimatikan melalui environment frontend."
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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;

    let active = true;

    setLoading(true);
    setLoadError(false);
    setMinutes(null);
    getMeetingMinute(id, token)
      .then(data => {
        if (!active) return;
        setMinutes(data);
      })
      .catch(err => {
        console.error(err);
        if (!active) return;
        const status = err instanceof ApiError ? err.status : undefined;
        setLoadError(status !== 403 && status !== 404);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, token, reloadKey]);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex min-h-[400px] items-center justify-center rounded-xl bg-state-surface text-state-foreground"
      >
        <div className="flex flex-col items-center gap-2">
          <Loader2 aria-hidden="true" className="size-6 motion-safe:animate-spin text-primary" />
          <p className="text-sm text-state-foreground">Memuat detail notulen...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="flex min-h-[400px] items-center justify-center rounded-xl bg-state-surface px-6 text-state-foreground"
      >
        <div className="max-w-md text-center">
          <AlertCircle aria-hidden="true" className="mx-auto mb-4 size-10 text-destructive" />
          <h2 className="text-xl font-semibold">Notulen belum dapat dimuat</h2>
          <p className="mb-4 mt-2 text-sm text-state-foreground">
            Periksa koneksi Anda, lalu coba lagi.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ActionButton type="button" onClick={() => setReloadKey((current) => current + 1)}>
              Coba lagi
            </ActionButton>
            <FormBackAction
              label="Kembali ke daftar notulen"
              onClick={() => router.push("/minutes")}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!minutes) {
    return (
      <div
        role="alert"
        className="flex min-h-[400px] items-center justify-center rounded-xl bg-state-surface text-state-foreground"
      >
        <div className="text-center">
          <AlertCircle aria-hidden="true" className="mx-auto mb-4 size-10 text-destructive" />
          <h2 className="text-xl font-semibold">Notulen Tidak Ditemukan</h2>
          <p className="mb-4 mt-2 text-sm text-state-foreground">
            Notulen tidak ditemukan atau Anda tidak memiliki akses.
          </p>
          <FormBackAction
            label="Kembali ke daftar notulen"
            onClick={() => router.push("/minutes")}
          />
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!token || !minutes) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteMeetingMinute(minutes.id, token);
      toast.success("Notulen berhasil dihapus.");
      setShowDeleteConfirm(false);
      router.push("/minutes");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Notulen belum berhasil dihapus.";
      const actionableMessage = `${message} Coba lagi.`;
      setDeleteError(actionableMessage);
      toast.error(actionableMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    if (!minutes) return;

    exportMeetingMinuteDocument(minutes);
    toast.success("Notulen berhasil diekspor.");
  };

  const actionItemsByDeadline = minutes.actionItems.reduce<
    Record<string, MeetingMinuteWithRisks["actionItems"]>
  >((groups, item) => {
    const deadline = item.deadline
      ? new Date(item.deadline).toLocaleDateString("id-ID", {
          weekday: "short",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Tanpa tenggat";

    groups[deadline] = [...(groups[deadline] ?? []), item];
    return groups;
  }, {});

  return (
    <FormPage className="space-y-0">
      <FormHeader
        title={minutes.title}
        actions={
          <>
            <ActionButton icon={<Download aria-hidden="true" className="size-4" />} onClick={handleExport}>
              Ekspor Notulen
            </ActionButton>
            {!isReadOnlyForOrg(user, minutes.organizationId || "") ? (
              <ActionButton
                icon={<Trash2 aria-hidden="true" className="size-4" />}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteConfirm(true);
                }}
              >
                Hapus Notulen
              </ActionButton>
            ) : null}
          </>
        }
        onBack={() => router.back()}
      />

      <Card className="gap-0 overflow-hidden p-0">
        <header className="px-6 py-6 md:px-8 md:py-7">
          <h2 className="text-xl font-medium tracking-tight text-foreground md:text-2xl">
            {minutes.title}
          </h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
            <UserRound className="size-4" aria-hidden="true" />
            <span>Dibuat oleh {minutes.createdByName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {new Date(minutes.createdAt).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>

          <dl className="mt-6 grid gap-x-12 gap-y-4 lg:grid-cols-2">
            <BriefingProperty icon={<CalendarDays className="size-4" />} label="Tanggal rapat">
              {new Date(minutes.date).toLocaleDateString("id-ID", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </BriefingProperty>
            <BriefingProperty icon={<Clock className="size-4" />} label="Check-in berikutnya">
              {minutes.nextCheckIn
                ? new Date(minutes.nextCheckIn).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Belum dijadwalkan"}
            </BriefingProperty>
            <BriefingProperty icon={<Users className="size-4" />} label="Peserta">
              {minutes.participants.length > 0 ? (
                <div className="space-y-1">
                  <p>{minutes.participants.length} peserta</p>
                  <ul className="space-y-0.5 text-sm font-normal leading-5 text-muted-foreground">
                    {minutes.participants.map((participant, index) => (
                      <li key={`${participant}-${index}`} className="break-words">
                        {participant}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                "Belum tercatat"
              )}
            </BriefingProperty>
            <BriefingProperty icon={<FileText className="size-4" />} label="ID notulen">
              <span className="font-mono text-xs">{minutes.id.substring(0, 8)}</span>
            </BriefingProperty>
          </dl>
        </header>

        <BriefingSection title="Ringkasan">
          <p className="text-sm leading-6 text-muted-foreground">
            {minutes.summary || "Belum ada ringkasan yang tercatat."}
          </p>
        </BriefingSection>

        <BriefingSection title="Agenda">
          {minutes.agenda.length > 0 ? (
            <ul className="space-y-2">
              {minutes.agenda.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                >
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-muted-foreground/60"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada agenda yang tercatat.</p>
          )}
        </BriefingSection>

        {minutes.keyPoints.length > 0 ? (
          <BriefingSection title="Poin kunci">
            <ul className="space-y-2">
              {minutes.keyPoints.map((point, index) => (
                <li key={`${point}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </BriefingSection>
        ) : null}

        {minutes.actionItems.length > 0 ? (
          <BriefingSection title="Tindak lanjut">
            <div className="space-y-4">
              {Object.entries(actionItemsByDeadline).map(([deadline, items]) => (
                <div key={deadline}>
                  <div className="rounded-md bg-muted/60 px-3 py-2 text-xs font-medium text-secondary-foreground">
                    {deadline}
                  </div>
                  <ul className="divide-y divide-border/70">
                    {items.map((action, index) => (
                      <li
                        key={`${action.task}-${index}`}
                        className="px-2 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-5 text-foreground">{action.task}</p>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            {[
                              action.pic ? `PIC: ${action.pic}` : null,
                              action.ownerUnit,
                              action.notes,
                            ].filter(Boolean).join(" · ") || "Detail tindak lanjut belum dilengkapi."}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </BriefingSection>
        ) : null}

        {minutes.openIssues.length > 0 ? (
          <BriefingSection title="Isu terbuka">
            <ul className="space-y-2">
              {minutes.openIssues.map((issue, index) => (
                <li key={`${issue}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-muted-foreground/45" aria-hidden="true" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </BriefingSection>
        ) : null}

        {minutes.decisions.length > 0 ? (
          <BriefingSection title="Keputusan">
            <ul className="space-y-2">
              {minutes.decisions.map((decision, index) => (
                <li key={`${decision}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-2 size-2 shrink-0 rounded-full bg-foreground/60" aria-hidden="true" />
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </BriefingSection>
        ) : null}

        <BriefingSection title="Risiko terkait" className="pb-7">
          {(minutes.linkedRisks?.length ?? 0) > 0 ? (
            <div className="divide-y divide-border/70">
              {minutes.linkedRisks.map((risk) => (
                <Link
                  key={risk.id}
                  href={`/risk/register/${risk.riskId}`}
                  className="group block w-full rounded-md px-3 py-3 text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-mono text-xs leading-5 text-muted-foreground">
                        {risk.riskCode || risk.riskId.substring(0, 8)}
                      </span>
                      <span className="mt-0.5 block text-foreground">
                        {risk.riskTitle || "Risiko"}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada risiko yang terkait.</p>
          )}
        </BriefingSection>
      </Card>

      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setDeleteError(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Hapus Notulen?</DialogTitle>
            <DialogDescription>
              Notulen ini akan dihapus permanen beserta relasinya dengan risiko terkait.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-0.5 py-1 text-sm">
            <p className="font-medium">{minutes.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{minutes.id}</p>
          </div>
          {deleteError ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {deleteError}
            </p>
          ) : null}
          <DialogFooter>
            <CollectionDialogCancel onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              Batal
            </CollectionDialogCancel>
            <DestructiveButton onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" /> : null}
              {isDeleting ? "Menghapus..." : "Hapus"}
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormPage>
  );
}

"use client";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { ActionHint } from "@/components/shared/design-system/actions/action-hint";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Lock,
  MoreHorizontal,
  Plus,
  Trash2,
} from "@/components/shared/icons";
import {
  CollectionEmptyState,
  CollectionSearchField,
  DynamicTableFilters,
} from "@/components/shared/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PopoverSelectField } from "@/components/shared/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type {
  AnnualCandidate,
  AnnualMember,
  AnnualMemberExclusionInput,
  AnnualMemberInput,
  AnnualProfile,
} from "@/lib/api/upr-workflow";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import {
  annualMemberReadiness,
  annualProfileListHref,
  annualProfileReadiness,
  type AnnualBatchResult,
} from "@/lib/annual-profile";
import {
  getStatusBadgeClassName,
  toBadgeVariant,
} from "@/lib/badge-variant";
import {
  getRiskLevelFromNilai,
  getRiskLevelLabel,
  levelToColor,
} from "@/lib/risk";
import { AnnualCandidateDialog } from "./annual-candidate-dialog";
import { AnnualMemberDialog } from "./annual-member-dialog";
import { AnnualMemberRemovalDialog } from "./annual-member-removal-dialog";
import { AnnualExclusionReview } from "./annual-exclusion-review";
import {
  WorkflowError,
  WorkflowTable,
  workflowDate,
  workflowError,
} from "./workflow-ui";

import type { ProfilePeriodWorkspace, ProfilePeriodProgress } from "@/lib/api/profile-periods";
import { RiskMonitoringPeriodCell } from "./profile-period-cells";
import periodStyles from "./annual-profile-periods.module.css";

export interface AnnualProfileContentProps {
  readOnly?: boolean;
  periodWorkspace?: ProfilePeriodWorkspace;
  onApprovePeriodClosure?: (periodId: string, reason: string) => Promise<void>;
  onStartPeriodMonitoring?: (member: AnnualMember, period: ProfilePeriodProgress) => void;
  year: number;
  profile: AnnualProfile;
  candidates: AnnualCandidate[];
  organization: string;
  busy: boolean;
  candidateError?: string;
  returnTo: string;
  onRetryCandidates: () => void;
  onSelectVersion: (id: string) => void;
  onDraft: () => Promise<void>;
  onAdd: (
    candidates: AnnualCandidate[],
    date: string,
    reason: string,
  ) => Promise<AnnualBatchResult>;
  onSave: (input: AnnualMemberInput) => Promise<void>;
  onRemove: (member: AnnualMember, exclusion?: AnnualMemberExclusionInput) => Promise<void>;
  onCancelExclusion: (groupId: string) => Promise<void>;
  onFinalize: () => Promise<void>;
  onDeleteDraft: () => Promise<void>;
}

function ProfileScore({ score }: { score: number | null }) {
  if (score === null)
    return <span className="text-muted-foreground">Belum dinilai</span>;
  const level = getRiskLevelFromNilai(score);
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums">{score}</span>
      {level && (
        <Badge variant="outline" className={levelToColor(level)}>
          {getRiskLevelLabel(level)}
        </Badge>
      )}
    </div>
  );
}

export function AnnualProfileContent({
  readOnly = false,
  year,
  periodWorkspace,
  onApprovePeriodClosure,
  onStartPeriodMonitoring,
  profile,
  candidates,
  organization,
  busy,
  candidateError = "",
  returnTo,
  onRetryCandidates,
  onSelectVersion,
  onDraft,
  onAdd,
  onSave,
  onRemove,
  onCancelExclusion,
  onFinalize,
  onDeleteDraft,
}: AnnualProfileContentProps) {
  const setHeaderActions = useSetHeaderActions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const periodDisclosureId = useId();
  const [periodDisclosure, setPeriodDisclosure] = useState<{
    groupId: string | null;
    animate: boolean;
  }>({ groupId: null, animate: false });
  const [profileActionsOpen, setProfileActionsOpen] = useState(false);
  const addTrigger = useRef<HTMLButtonElement>(null);
  const [picker, setPicker] = useState(false);
  const [correcting, setCorrecting] = useState<AnnualCandidate | null>(null);
  const [editing, setEditing] = useState<AnnualMember | null>(null);
  const [review, setReview] = useState(false);
  const reviewTitle = useRef<HTMLHeadingElement>(null);
  const [removing, setRemoving] = useState<AnnualMember | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [closurePeriod, setClosurePeriod] = useState<ProfilePeriodProgress | null>(null);
  const [closureReason, setClosureReason] = useState("");
  const [closureError, setClosureError] = useState("");
  const closureReasonId = useId();
  const [deleteError, setDeleteError] = useState("");
  const selected = profile.selected;
  const draft = !readOnly && Boolean(selected && !selected.finalizedAt);
  const completionPeriods = periodWorkspace?.periods.filter((period) =>
    period.blocksRevision || period.administrativeClosureReason) ?? [];
  const blockingPeriod = completionPeriods.find((period) => period.blocksRevision);
  const revisionBlockHint = blockingPeriod
    ? `Selesaikan pemantauan ${blockingPeriod.label}, Kertas Kerja, dan Evaluasi sebelum merevisi profil. Jika jendela sudah tutup, hubungi Super Admin.`
    : undefined;
  const exclusions = profile.exclusions ?? [];
  const hasExclusions = exclusions.length > 0;
  const versionSelect = selected ? (
    <PopoverSelectField
      ariaLabel="Pilih versi profil"
      value={selected.id}
      onValueChange={onSelectVersion}
      disabled={busy}
      placeholder="Pilih versi profil"
      triggerClassName="w-52"
      options={profile.versions.map((item) => ({
        value: item.id,
        label: `Versi ${item.version} · ${item.finalizedAt ? "Final" : "Draf"}`,
      }))}
    />
  ) : null;
  const readiness = annualProfileReadiness(profile);
  const periodCount = periodWorkspace?.periods.length ?? 0;
  const hasMonitoringPeriods = periodCount > 0;
  const periodFrequencyLabels = {
    monthly: "Bulanan",
    quarterly: "Triwulanan",
    semester: "Semesteran",
  } as const;
  const periodDisclosureLabel = periodWorkspace?.rule
    ? `${periodFrequencyLabels[periodWorkspace.rule.frequency]} · ${periodCount} periode`
    : "Periode pemantauan";
  const tableColumnCount =
    (draft ? 5 : readOnly ? 3 : 4) + (hasMonitoringPeriods ? 1 : 0);
  const latestFinal = profile.versions
    .filter((item) => item.finalizedAt)
    .sort((a, b) => b.version - a.version)[0];
  const existingDraft = profile.versions.find((item) => !item.finalizedAt);
  const createRevisionHint = existingDraft ? undefined : revisionBlockHint;
  const query = search.trim().toLocaleLowerCase("id");
  const visible = profile.members.filter((member) => {
    const ready = annualMemberReadiness(member, profile.objectives).ready;
    return (
      (!draft || status === "all" || (status === "ready" ? ready : !ready)) &&
      `${member.code} ${member.title}`.toLocaleLowerCase("id").includes(query)
    );
  });
  const createHref = `/risk/register/new?returnTo=${encodeURIComponent(returnTo)}`;
  const riskHref = (member: AnnualMember) =>
    member.riskStatus === "draft" && draft
      ? `/risk/register/new?id=${member.riskId}&returnTo=${encodeURIComponent(returnTo)}`
      : `/risk/register/${member.riskId}`;

  const createDraft = useCallback(async () => {
    setActionError("");
    try {
      await onDraft();
    } catch (cause) {
      setActionError(workflowError(cause));
    }
  }, [onDraft]);

  const profileHeaderAction = useMemo(() => {
    if (!selected || readOnly) return null;
    if (!draft) {
      return (
        <ActionHint reason={createRevisionHint}>
          <Button
            disabled={busy || Boolean(createRevisionHint)}
            onClick={() =>
              existingDraft
                ? onSelectVersion(existingDraft.id)
                : void createDraft()
            }
          >
            {existingDraft ? "Lanjutkan revisi" : "Buat revisi"}
          </Button>
        </ActionHint>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu
          modal={false}
          open={profileActionsOpen}
          onOpenChange={setProfileActionsOpen}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="Tindakan profil"
              title="Tindakan profil"
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 max-w-[calc(100vw-2rem)]"
            onCloseAutoFocus={(event) => {
              if (deleteOpen || review) event.preventDefault();
            }}
          >
            {hasExclusions && (
              <DropdownMenuItem onSelect={() => {
                setReview(true);
                setDialogError("");
              }}>
                Tinjau pengeluaran
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={() => {
                setDeleteError("");
                setDeleteOpen(true);
              }}
            >
              <Trash2 aria-hidden="true" />
              <span>Hapus draf</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          ref={addTrigger}
          variant="outline"
          disabled={busy}
          onClick={() => setPicker(true)}
        >
          <Plus aria-hidden="true" data-icon="inline-start" />
          Risiko baru
        </Button>
        <ActionHint reason={revisionBlockHint}>
          <Button
            disabled={busy || !readiness.total || Boolean(revisionBlockHint)}
            onClick={() => {
              setReview(true);
              setDialogError("");
            }}
          >
            Finalisasi
          </Button>
        </ActionHint>
      </div>
    );
  }, [
    busy,
    createDraft,
    createRevisionHint,
    deleteOpen,
    draft,
    existingDraft,
    hasExclusions,
    onSelectVersion,
    picker,
    profileActionsOpen,
    readOnly,
    readiness.total,
    revisionBlockHint,
    review,
    selected,
  ]);

  useEffect(() => {
    setHeaderActions(profileHeaderAction);
  }, [profileHeaderAction, setHeaderActions]);

  useEffect(
    () => () => setHeaderActions(null),
    [setHeaderActions],
  );

  return (
    <div className="space-y-3" aria-busy={busy}>
      {draft && latestFinal && (
        <Alert variant="info" className="flex items-center gap-3">
          <AlertCircle aria-hidden="true" className="shrink-0 translate-y-0" />
          <AlertDescription className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 leading-5">
            <span className="min-w-0 flex-1">
              Revisi ini masih draf. Versi {latestFinal.version} adalah profil
              final terakhir, difinalisasi{" "}
              {workflowDate(latestFinal.finalizedAt)}.
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onSelectVersion(latestFinal.id)}
            >
              Lihat versi final
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {selected && (
        <Card role="region" aria-label="Ringkasan profil">
          <CardContent>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-x-6 gap-y-4">
              {profile.code && (
                <div className="space-y-1">
                  <dt className="text-sm text-secondary-foreground">Kode profil</dt>
                  <dd className="font-medium tabular-nums">{profile.code}</dd>
                </div>
              )}
              {readOnly && (
                <div className="min-w-0 space-y-1">
                  <dt className="text-xs text-muted-foreground">Unit</dt>
                  <dd className="flex flex-wrap items-center gap-2">
                    <span className="wrap-anywhere font-medium">{organization}</span>
                    <Badge variant="outline">Hanya baca</Badge>
                  </dd>
                </div>
              )}
              {periodWorkspace?.rule && (
                <div className="min-w-0 space-y-1">
                  <dt className="text-sm text-secondary-foreground">Pemantauan</dt>
                  <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="min-w-0 wrap-anywhere font-medium">{periodWorkspace.rule.name}</span>
                    <span className="text-muted-foreground">{year}</span>
                  </dd>
                </div>
              )}
              <div className="space-y-1">
                <dt className="text-sm text-secondary-foreground">Status</dt>
                <dd className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge
                    variant={selected.finalizedAt ? "outline" : "secondary"}
                    className={selected.finalizedAt ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : undefined}
                  >
                    {selected.finalizedAt ? "Final" : "Draf"}
                  </Badge>
                  {selected.finalizedAt && (
                    <Lock
                      role="img"
                      aria-label="Profil terkunci"
                      className="size-5 text-muted-foreground"
                    />
                  )}
                </dd>
              </div>
              {selected.finalizedAt && (
                <div className="space-y-1">
                  <dt className="text-xs text-muted-foreground">Tanggal finalisasi</dt>
                  <dd className="font-medium">{workflowDate(selected.finalizedAt)}</dd>
                </div>
              )}
            </dl>
            {completionPeriods.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                {completionPeriods.map((period) => (
                  <li key={period.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p>{period.label} · {period.blocksRevision ? "Menahan finalisasi revisi" : "Ditutup secara administratif"}</p>
                      {period.canCloseAdministratively && !onApprovePeriodClosure && (
                        <p className="text-muted-foreground">Jendela sudah tutup. Hubungi Super Admin untuk penutupan administratif.</p>
                      )}
                      {period.administrativeClosureReason && (
                        <p className="wrap-anywhere text-muted-foreground">{period.administrativeClosureReason}</p>
                      )}
                    </div>
                    {period.canCloseAdministratively && onApprovePeriodClosure && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setClosureReason("");
                          setClosureError("");
                          setClosurePeriod(period);
                        }}
                      >
                        Tutup secara administratif
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
      {actionError && <WorkflowError message={actionError} />}
      <Dialog open={Boolean(closurePeriod)} onOpenChange={(open) => {
        if (!open && !busy) setClosurePeriod(null);
      }}>
        {closurePeriod && (
          <DialogContent showCloseButton={!busy}>
            <DialogHeader>
              <DialogTitle>Tutup {closurePeriod.label} secara administratif?</DialogTitle>
              <DialogDescription className="sr-only">Persetujuan penutupan administratif</DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy || !closureReason.trim() || !onApprovePeriodClosure) return;
                setClosureError("");
                try {
                  await onApprovePeriodClosure(closurePeriod.id, closureReason.trim());
                  setClosurePeriod(null);
                } catch (cause) {
                  setClosureError(workflowError(cause));
                }
              }}
            >
              <ConfirmationConsequences variant="plain" className="text-tertiary-foreground">
                Penutupan ini membuka blokir revisi dari periode ini. Status pemantauan, Kertas Kerja, dan Evaluasi tetap tercatat sesuai progresnya.
              </ConfirmationConsequences>
              <div className="space-y-2">
                <Label htmlFor={closureReasonId}>Alasan penutupan</Label>
                <Textarea id={closureReasonId} value={closureReason} maxLength={2000} required disabled={busy}
                  onChange={(event) => setClosureReason(event.target.value)} />
              </div>
              {closureError && <WorkflowError message={closureError} />}
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setClosurePeriod(null)}>Batal</Button>
                <Button type="submit" disabled={busy || !closureReason.trim()}>
                  {busy ? "Menyimpan…" : "Setujui penutupan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>
      {!selected ? (
        <CollectionEmptyState
          title={`Belum ada profil ${year}`}
          description="Buka daftar profil dan gunakan Tambah profil untuk memilih risiko awal."
          action={
            <Button asChild>
              <Link href={annualProfileListHref}>Buka daftar profil</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section
            aria-label="Risiko dalam profil"
            className={`space-y-3 ${periodStyles.memberMonitoringTable}`}
          >
            <DynamicTableFilters
              search={
                profile.members.length > 0 ? (
                  <CollectionSearchField
                    aria-label="Cari risiko dalam profil"
                    placeholder="Cari kode atau nama risiko"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                ) : undefined
              }
              columns={versionSelect}
              fields={
                draft && profile.members.length > 0
                  ? [
                      {
                        id: "readiness",
                        label: "Status Penilaian",
                        value: status,
                        onChange: setStatus,
                        options: [
                          { value: "all", label: "Semua risiko" },
                          { value: "incomplete", label: "Belum siap" },
                          { value: "ready", label: "Siap" },
                        ],
                      },
                    ]
                  : []
              }
              disabled={busy}
            />
            <WorkflowTable
              headerClassName="!font-normal"
              columns={[
                "Risiko",
                "Skor Awal",
                "Berlaku sejak",
                ...(draft ? ["Status Penilaian"] : []),
                ...(hasMonitoringPeriods ? ["Pemantauan"] : []),
                ...(readOnly ? [] : ["Aksi"]),
              ]}
            >
              {visible.map((member) => {
                const state = annualMemberReadiness(member, profile.objectives);
                const periodExpanded = periodDisclosure.groupId === member.groupId;
                const detailsId = `${periodDisclosureId}-${member.groupId}`;
                const hasExistingMonitoring = periodWorkspace?.periods.some((period) =>
                  period.monitorings.some((item) => item.groupId === member.groupId && item.id),
                ) ?? false;
                const canOpenMonitoringPeriods = Boolean(selected?.finalizedAt || hasExistingMonitoring);
                const memberPeriods = periodWorkspace?.periods.filter((period) =>
                  Boolean(selected?.finalizedAt) || period.monitorings.some((item) => item.groupId === member.groupId && item.id),
                ) ?? [];
                return (
                  <Fragment key={member.groupId}>
                    <TableRow>
                      <TableCell className="min-w-56 whitespace-normal">
                        {member.riskId ? (
                          <Link
                            href={riskHref(member)}
                            className="group/risk block max-w-full rounded-sm no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-ring"
                          >
                            <span className="text-xs text-muted-foreground group-hover/risk:text-primary">
                              {member.code}
                            </span>
                            <span className="block font-medium text-foreground group-hover/risk:text-primary">
                              {member.title}
                            </span>
                          </Link>
                        ) : (
                          <>
                            <span className="text-xs text-muted-foreground">
                              {member.code}
                            </span>
                            <p className="font-medium">{member.title}</p>
                          </>
                        )}
                        {member.changeReason && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {member.changeReason}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <ProfileScore
                          score={member.baseline?.score ?? member.score}
                        />
                      </TableCell>
                      <TableCell>{workflowDate(member.effectiveFrom)}</TableCell>
                      {draft && (
                        <TableCell className="min-w-36 whitespace-normal">
                          <Badge
                            variant={toBadgeVariant(state.tone)}
                            className={getStatusBadgeClassName(state.tone)}
                          >
                            {state.ready && (
                              <CheckCircle2
                                aria-hidden="true"
                                data-icon="inline-start"
                              />
                            )}
                            {state.label}
                          </Badge>
                        </TableCell>
                      )}
                      {hasMonitoringPeriods && (
                        <TableCell className="whitespace-normal">
                          {canOpenMonitoringPeriods && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-expanded={periodExpanded}
                              aria-controls={detailsId}
                              aria-label={`${periodDisclosureLabel} untuk ${member.code}`}
                              onClick={(event) => setPeriodDisclosure({
                                groupId: periodExpanded ? null : member.groupId,
                                animate: event.detail > 0,
                              })}
                              className="h-auto min-h-7 whitespace-normal"
                            >
                              {periodDisclosureLabel}
                              <ChevronDown
                                aria-hidden="true"
                                data-animate={periodDisclosure.animate || undefined}
                                className={`${periodStyles.chevron} ${periodExpanded ? "rotate-180" : ""}`}
                              />
                            </Button>
                          )}
                        </TableCell>
                      )}
                      {!readOnly && <TableCell>
                        {draft && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={busy}
                                aria-label={`Opsi untuk ${member.code}`}
                              >
                                <MoreHorizontal aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-max min-w-56 max-w-[calc(100vw-2rem)]"
                            >
                              {draft && !member.riskId && (
                                <DropdownMenuItem
                                  onSelect={() => setEditing(member)}
                                >
                                  Penilaian
                                </DropdownMenuItem>
                              )}
                              {member.riskId && state.assessment && (
                                <DropdownMenuItem
                                  onSelect={() => setEditing(member)}
                                >
                                  Penilaian ulang
                                </DropdownMenuItem>
                              )}
                              {member.riskId &&
                                draft &&
                                !state.assessment && (
                                  <DropdownMenuItem asChild>
                                    <Link href={riskHref(member)}>
                                      Lanjutkan penilaian
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                              {draft && member.canRemove && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="min-w-max whitespace-nowrap"
                                  onSelect={() => setRemoving(member)}
                                >
                                  Keluarkan dari profil
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>}
                    </TableRow>
                    {hasMonitoringPeriods && (
                      <TableRow
                        id={detailsId}
                        className={periodStyles.detailRow}
                        aria-hidden={!periodExpanded}
                      >
                        <TableCell
                          colSpan={tableColumnCount}
                          className="border-0 p-0 whitespace-normal"
                        >
                          <div
                            className={`motion-panel ${periodStyles.disclosure}`}
                            data-open={periodExpanded}
                            data-animate={periodDisclosure.animate || undefined}
                          >
                            <div className={periodStyles.clip} inert={!periodExpanded}>
                              <div className="bg-muted/30 p-3">
                                <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr))]">
                                  {memberPeriods.map((period) => (
                                    <RiskMonitoringPeriodCell
                                      key={period.id}
                                      period={period}
                                      groupId={member.groupId}
                                      disabled={busy}
                                      readOnly={readOnly}
                                      profileFinalized={Boolean(selected?.finalizedAt)}
                                      onStart={!readOnly && !draft && member.riskId && onStartPeriodMonitoring
                                        ? () => onStartPeriodMonitoring(member, period)
                                        : undefined}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {!visible.length && (
                <TableRow>
                  <TableCell
                    colSpan={tableColumnCount}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {profile.members.length
                      ? "Tidak ada risiko yang sesuai pencarian atau kesiapan yang dipilih."
                      : "Belum ada risiko dalam profil."}
                  </TableCell>
                </TableRow>
              )}
            </WorkflowTable>
          </section>
        </>
      )}
      {picker && draft && (
        <AnnualCandidateDialog
          year={year}
          candidates={candidates.filter((candidate) =>
            !exclusions.some((item) => item.groupId === candidate.groupId),
          )}
          members={profile.members}
          pending={busy}
          error={candidateError}
          retry={onRetryCandidates}
          close={() => setPicker(false)}
          restoreFocus={() => addTrigger.current?.focus()}
          createHref={createHref}
          onAdd={onAdd}
          nextPeriodLabel={periodWorkspace?.periods.find((period) => !period.scopeLocked)?.label}
          onCorrect={periodWorkspace?.periods.some((period) => period.scopeLocked) ? (candidate) => {
            setPicker(false);
            setCorrecting(candidate);
          } : undefined}
        />
      )}
      {(editing || correcting) && draft && (
        <AnnualMemberDialog
          key={editing?.groupId ?? correcting?.groupId}
          selection={{
            member: editing ?? undefined,
            candidate: correcting ?? candidates.find((item) => item.groupId === editing?.groupId),
          }}
          objectives={profile.objectives}
          year={year}
          periods={periodWorkspace?.periods}
          startCorrection={Boolean(correcting)}
          pending={busy}
          close={() => {
            setEditing(null);
            setCorrecting(null);
            if (correcting) requestAnimationFrame(() => addTrigger.current?.focus());
          }}
          save={onSave}
        />
      )}
      <Dialog
        open={review}
        onOpenChange={(open) => {
          if (!busy) setReview(open);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle ref={reviewTitle} tabIndex={-1}>
              Tinjau profil {year} · Versi {selected?.version}
            </DialogTitle>
            <DialogDescription>
              Pastikan penilaian final dan tanggal berlaku sudah sesuai. Sasaran
              dapat ditautkan bila relevan.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-secondary-foreground">Unit</dt>
              <dd>{organization}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-secondary-foreground">Kelengkapan</dt>
              <dd>
                {readiness.ready} dari {readiness.total} risiko siap
              </dd>
            </div>
            {review && draft && <AnnualExclusionReview
              exclusions={exclusions}
              year={year}
              periods={periodWorkspace?.periods}
              busy={busy}
              onCancel={async (groupId) => {
                setDialogError("");
                try {
                  await onCancelExclusion(groupId);
                  reviewTitle.current?.focus();
                } catch (cause) {
                  setDialogError(workflowError(cause));
                }
              }}
            />}
            <div className="space-y-1">
              <dt className="text-secondary-foreground">Sasaran tertaut (opsional)</dt>
              <dd>
                {
                  new Set(
                    profile.members
                      .map(
                        (item) =>
                          item.baseline?.objective ??
                          profile.objectives.find(
                            (objective) => objective.id === item.objectiveId,
                          )?.title,
                      )
                      .filter(Boolean),
                  ).size
                }{" "}
                sasaran terkait
              </dd>
            </div>
          </dl>
          <ConfirmationConsequences
            variant={readiness.canFinalize ? "plain" : "default"}
            className={readiness.canFinalize ? "text-tertiary-foreground" : "text-sm"}
          >
            {readiness.canFinalize
              ? "Finalisasi mengunci anggota profil, versi penilaian, baseline, sasaran yang ditautkan, dan rencana. Perubahan berikutnya dibuat melalui revisi profil tahunan."
              : "Profil belum siap difinalisasi. Finalkan penilaian untuk setiap risiko sebelum melanjutkan."}
          </ConfirmationConsequences>
          {dialogError && <WorkflowError message={dialogError} />}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setReview(false);
                if (!readiness.canFinalize) {
                  setStatus("incomplete");
                  setSearch("");
                }
              }}
            >
              {readiness.canFinalize ? "Kembali" : "Lengkapi risiko"}
            </Button>
            <Button
              disabled={busy || !draft || !readiness.canFinalize || Boolean(revisionBlockHint)}
              onClick={async () => {
                setDialogError("");
                try {
                  await onFinalize();
                  setReview(false);
                } catch (cause) {
                  setDialogError(workflowError(cause));
                }
              }}
            >
              {busy ? "Memfinalisasi…" : "Finalisasi profil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {removing && draft && (
        <AnnualMemberRemovalDialog
          key={removing.groupId}
          member={removing}
          pending={busy}
          close={() => setRemoving(null)}
          remove={(exclusion) => onRemove(removing, exclusion)}
        />
      )}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!busy) setDeleteOpen(open);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Hapus draf profil secara permanen?</DialogTitle>
            <DialogDescription>Periksa versi draf profil yang akan dihapus.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences variant="plain">
            Profil {year} · Versi {selected?.version}. Semua risiko dan
              perubahan yang tercatat di draf ini akan dilepas dari profil.
              Data risiko di Register tetap tersimpan. Draf revisi yang dihapus
              juga tidak mengubah versi final sebelumnya. Draf yang dihapus tidak dapat dipulihkan.
          </ConfirmationConsequences>
          {deleteError && <WorkflowError message={deleteError} />}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleteOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setDeleteError("");
                try {
                  await onDeleteDraft();
                  setDeleteOpen(false);
                } catch (cause) {
                  setDeleteError(workflowError(cause));
                }
              }}
            >
              {busy ? "Menghapus…" : "Hapus draf permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

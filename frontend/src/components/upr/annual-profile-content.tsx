"use client";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  WorkflowError,
  WorkflowTable,
  workflowDate,
  workflowError,
} from "./workflow-ui";

import type { ProfilePeriodWorkspace, ProfilePeriodProgress } from "@/lib/api/profile-periods";
import { RiskMonitoringPeriodCell } from "./profile-period-cells";

export interface AnnualProfileContentProps {
  readOnly?: boolean;
  periodWorkspace?: ProfilePeriodWorkspace;
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
  onRemove: (member: AnnualMember) => Promise<void>;
  onFinalize: () => Promise<void>;
  onDeleteDraft: () => Promise<void>;
}

function ProfileScore({ score }: { score: number | null }) {
  if (score === null)
    return <span className="text-muted-foreground">Belum final</span>;
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
  onFinalize,
  onDeleteDraft,
}: AnnualProfileContentProps) {
  const setHeaderActions = useSetHeaderActions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [profileActionsOpen, setProfileActionsOpen] = useState(false);
  const addTrigger = useRef<HTMLButtonElement>(null);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<AnnualMember | null>(null);
  const [review, setReview] = useState(false);
  const [removing, setRemoving] = useState<AnnualMember | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const selected = profile.selected;
  const draft = !readOnly && Boolean(selected && !selected.finalizedAt);
  const versionSelect = selected ? (
    <Select
      value={selected.id}
      onValueChange={onSelectVersion}
      disabled={busy}
    >
      <SelectTrigger className="w-52" aria-label="Pilih versi profil">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {profile.versions.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            Versi {item.version} · {item.finalizedAt ? "Final" : "Draf"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null;
  const readiness = annualProfileReadiness(profile);
  const latestFinal = profile.versions
    .filter((item) => item.finalizedAt)
    .sort((a, b) => b.version - a.version)[0];
  const existingDraft = profile.versions.find((item) => !item.finalizedAt);
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
        <Button
          disabled={busy}
          onClick={() =>
            existingDraft
              ? onSelectVersion(existingDraft.id)
              : void createDraft()
          }
        >
          {existingDraft ? "Lanjutkan revisi" : "Buat revisi"}
        </Button>
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
              if (deleteOpen) event.preventDefault();
            }}
          >
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
        <Button
          disabled={busy || !readiness.total}
          onClick={() => {
            setReview(true);
            setDialogError("");
          }}
        >
          Finalisasi
        </Button>
      </div>
    );
  }, [
    busy,
    createDraft,
    deleteOpen,
    draft,
    existingDraft,
    onSelectVersion,
    picker,
    profileActionsOpen,
    readOnly,
    readiness.total,
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
      {selected && (
        <Card role="region" aria-label="Ringkasan profil">
          <CardContent>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-x-6 gap-y-4">
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
                  <dt className="text-xs text-muted-foreground">Pemantauan</dt>
                  <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="min-w-0 wrap-anywhere font-medium">{periodWorkspace.rule.name}</span>
                    <span className="text-muted-foreground">{year}</span>
                  </dd>
                </div>
              )}
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground">Status</dt>
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
          </CardContent>
        </Card>
      )}
      {actionError && <WorkflowError message={actionError} />}
      {draft && latestFinal && (
        <Alert variant="info">
          <AlertCircle aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
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
          <section aria-label="Risiko dalam profil" className="space-y-3">
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
              columns={[
                "Risiko",
                "Skor Awal",
                "Berlaku sejak",
                ...(draft ? ["Status Penilaian"] : []),
                ...(periodWorkspace?.periods.map(period => period.label) ?? []),
                ...(readOnly ? [] : ["Aksi"]),
              ]}
            >
              {visible.map((member) => {
                const state = annualMemberReadiness(member, profile.objectives);
                return (
                  <TableRow key={member.groupId}>
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
                    {periodWorkspace?.periods.map(period => <TableCell key={period.id}>
                      <RiskMonitoringPeriodCell period={period} groupId={member.groupId} disabled={busy} readOnly={readOnly}
                        onStart={!readOnly && !draft && member.riskId && onStartPeriodMonitoring ? () => onStartPeriodMonitoring(member, period) : undefined} />
                    </TableCell>)}
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
                                Siapkan penilaian
                              </DropdownMenuItem>
                            )}
                            {draft && member.riskId && state.objective && (
                              <DropdownMenuItem
                                onSelect={() => setEditing(member)}
                              >
                                Ubah sasaran
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
                                className="min-w-max whitespace-nowrap"
                                onSelect={() => {
                                  setRemoving(member);
                                  setDialogError("");
                                }}
                              >
                                Keluarkan dari profil
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>}
                  </TableRow>
                );
              })}
              {!visible.length && (
                <TableRow>
                  <TableCell
                    colSpan={(draft ? 5 : readOnly ? 3 : 4) + (periodWorkspace?.periods.length ?? 0)}
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
          candidates={candidates}
          members={profile.members}
          pending={busy}
          error={candidateError}
          retry={onRetryCandidates}
          close={() => setPicker(false)}
          restoreFocus={() => addTrigger.current?.focus()}
          createHref={createHref}
          onAdd={onAdd}
        />
      )}
      {editing && draft && (
        <AnnualMemberDialog
          key={editing.groupId}
          selection={{
            member: editing,
            candidate: candidates.find(
              (item) => item.groupId === editing.groupId,
            ),
          }}
          objectives={profile.objectives}
          year={year}
          pending={busy}
          close={() => setEditing(null)}
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
            <DialogTitle>
              Tinjau profil {year} · Versi {selected?.version}
            </DialogTitle>
            <DialogDescription>
              Pastikan penilaian final dan tanggal berlaku sudah sesuai. Sasaran
              dapat ditautkan bila relevan.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 text-sm">
            <div className="space-y-1">
              <dt className="text-muted-foreground">Unit</dt>
              <dd>{organization}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Kesiapan</dt>
              <dd>
                {readiness.ready} dari {readiness.total} risiko siap
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">Sasaran tertaut (opsional)</dt>
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
          <ul
            className="max-h-56 space-y-3 overflow-y-auto"
            aria-label="Ringkasan risiko dan tanggal berlaku"
          >
            {profile.members.map((member) => (
              <li key={member.groupId} className="space-y-1 text-sm">
                <p className="font-medium">
                  {member.code} · {member.title}
                </p>
                <p className="text-muted-foreground">
                  {member.baseline?.objective ??
                    profile.objectives.find(
                      (item) => item.id === member.objectiveId,
                    )?.title ??
                    "Tanpa sasaran (opsional)"}{" "}
                  · Berlaku {workflowDate(member.effectiveFrom)}
                </p>
                {!annualMemberReadiness(member, profile.objectives).ready && (
                  <p>
                    {annualMemberReadiness(member, profile.objectives).label}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <ConfirmationConsequences>
              {readiness.canFinalize
                ? "Finalisasi mengunci anggota profil, versi penilaian, baseline, sasaran yang ditautkan, dan rencana. Perubahan berikutnya dibuat sebagai revisi."
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
              disabled={busy || !draft || !readiness.canFinalize}
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
      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Keluarkan risiko dari profil?</DialogTitle>
            <DialogDescription>Periksa risiko yang akan dikeluarkan dari draf profil.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences>
            {removing?.code} · {removing?.title}. Keanggotaan risiko ini akan dihapus dari draf profil. Risiko tetap tersimpan di Register dan dapat ditambahkan kembali ke draf profil ini.
          </ConfirmationConsequences>
          {dialogError && <WorkflowError message={dialogError} />}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              Batal
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!removing) return;
                setDialogError("");
                try {
                  await onRemove(removing);
                  setRemoving(null);
                } catch (cause) {
                  setDialogError(workflowError(cause));
                }
              }}
            >
              {busy ? "Mengeluarkan…" : "Keluarkan dari profil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <ConfirmationConsequences>
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

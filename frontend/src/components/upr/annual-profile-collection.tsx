"use client";

import Link from "next/link";
import { TableLoadingSkeleton } from "@/components/shared/design-system/feedback/loading-skeleton";
import type { MonitoringRule } from "@/lib/api/monitoring-rules";
import type { ProfilePeriodWorkspace } from "@/lib/api/profile-periods";
import { AnnualProfilePeriods } from "./annual-profile-periods";
import periodStyles from "./annual-profile-periods.module.css";
import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, MoreHorizontal, Plus, Trash2 } from "@/components/shared/icons";
import {
  CollectionEmptyState,
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";
import { CollectionCode } from "@/components/shared/design-system/collections/collection-code";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { annualProfileHref, groupAnnualProfiles } from "@/lib/annual-profile";
import type {
  AnnualPickupRisk,
  AnnualProfileListVersion,
} from "@/lib/api/upr-workflow";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { AnnualProfileInitiationDialog } from "./annual-profile-initiation-dialog";
import { WorkflowError, WorkflowTable, workflowDate, workflowError } from "./workflow-ui";

export function AnnualProfileCollection({
  organization,
  readAll = false,
  versions,
  defaultYear,
  loading,
  error,
  retry,
  loadPickup,
  loadRules,
  periodProgress = {},
  retryPeriodProgress = retry,
  organizationId,
  create,
  openProfile,
  deleteDraft,
  embedded = false,
}: {
  organization: string;
  readAll?: boolean;
  versions: AnnualProfileListVersion[];
  defaultYear: number;
  loading?: boolean;
  error?: string;
  retry: () => void;
  loadPickup: (
    year: number,
    source: string | null,
  ) => Promise<AnnualPickupRisk[]>;
  loadRules?: (search?: string, signal?: AbortSignal) => Promise<MonitoringRule[]>;
  periodProgress?: Record<string, ProfilePeriodWorkspace | {error: string}>;
  retryPeriodProgress?: () => void;
  organizationId?: string;
  create: (
    year: number,
    source: string | null,
    riskIds: string[],
    monitoringRuleId?: string,
  ) => Promise<void>;
  openProfile: (year: number, version: string) => void;
  deleteDraft: (profile: AnnualProfileListVersion) => Promise<void>;
  embedded?: boolean;
}) {
  const setHeaderActions = useSetHeaderActions();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] =
    useState<AnnualProfileListVersion | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const addTrigger = useRef<HTMLButtonElement>(null);
  const profiles = groupAnnualProfiles(versions);
  const ownVersions = versions.filter((version) => !version.organizationId || version.organizationId === organizationId);
  const disclosureId = useId();
  const isMobile = useIsMobile();
  const [disclosure, setDisclosure] = useState<{ profileId: string | null; animate: boolean }>({ profileId: null, animate: false });
  const canAdd = Boolean(organization && !loading && !error);
  const add = useMemo(
    () => (
      <Button
        ref={addTrigger}
        disabled={!canAdd}
        onClick={() => setAdding(true)}
      >
        <Plus aria-hidden="true" />
        Tambah profil
      </Button>
    ),
    [canAdd],
  );
  const headerAction = embedded ? (canAdd ? add : undefined) : add;

  useEffect(() => {
    if (embedded) return;
    setHeaderActions(headerAction ?? null);
    return () => setHeaderActions(null);
  }, [embedded, headerAction, setHeaderActions]);

  return (
    <PageStack className={embedded ? undefined : "md:space-y-0"}>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{organization}</p>
          {headerAction}
        </div>
      ) : (
        <CollectionPageHeader
          title="Profil Risiko Tahunan"
          showTitle
          className="md:sr-only"
        />
      )}
      {loading ? (
        <TableLoadingSkeleton message="Memuat daftar profil…" />
      ) : !organization && !readAll ? (
        <Alert>
          <AlertDescription>
            Akun harus terhubung ke organisasi untuk membuka profil tahunan.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <WorkflowError message={error} retry={retry} />
      ) : profiles.length === 0 ? (
        <CollectionEmptyState
          title="Belum ada profil risiko tahunan"
          description={readAll ? undefined : "Pilih tahun dan risiko awal untuk mulai menyusun profil unit."}
        />
      ) : (
        <div className={periodStyles.collection}>
          <WorkflowTable
            columns={[
              { label: "Kode profil", header: "Kode profil", className: "whitespace-nowrap" },
              { label: "Tahun", header: "Tahun", className: "whitespace-nowrap" },
              { label: "Unit", header: "Unit", className: "hidden md:table-cell" },
              "Status",
              { label: "Jumlah risiko", header: "Jumlah risiko", className: "hidden md:table-cell" },
              { label: "Terakhir diperbarui", header: "Terakhir diperbarui", className: "hidden md:table-cell" },
              "Pemantauan",
              "Aksi",
            ]}
          >
            {profiles.map(({ year, draft, final, updatedAt }) => {
              const latest = draft ?? final;
              const processProfile = final ?? draft;
              if (!latest || !processProfile) return null;
              const ownerId = latest.organizationId ?? organizationId;
              const ownerName = latest.organizationName ?? organization;
              const readOnly = ownerId !== organizationId;
              const openLabel = draft && !readOnly ? "Lanjutkan draf" : "Buka profil";
              const expanded = disclosure.profileId === processProfile.id;
              const detailsId = `${disclosureId}-${processProfile.id}`;
              const progress = periodProgress[processProfile.id];
              const schedule = progress && "periods" in progress ? progress : undefined;
              const scheduleLabel =
                progress && "error" in progress
                  ? "Jadwal gagal dimuat"
                  : schedule?.rule
                    ? `${{ monthly: "Bulanan", quarterly: "Triwulanan", semester: "Semesteran" }[schedule.rule.frequency]} · ${schedule.periods.length} periode`
                    : schedule
                      ? "Dokumen tertaut"
                      : "Lihat jadwal";
              return (
                <Fragment key={processProfile.id}>
                  <TableRow>
                    <TableCell className="tabular-nums whitespace-normal">
                      <div className="space-y-1">
                        {latest.code ? (
                          <CollectionCode
                            code={latest.code}
                            href={embedded ? undefined : annualProfileHref(year, latest.id)}
                            onOpen={embedded ? () => openProfile(year, latest.id) : undefined}
                            linkClassName="inline-flex h-auto min-h-8 items-center rounded-sm px-0 py-0 text-sm font-normal tabular-nums text-primary no-underline hover:opacity-80 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            linkLabel={`${openLabel} ${latest.code} · ${year} · ${ownerName}`}
                          />
                        ) : (
                          <span className="text-xs font-normal text-muted-foreground">—</span>
                        )}
                        <div className="space-y-1 md:hidden">
                          <p className="text-xs font-normal text-muted-foreground">{ownerName}</p>
                          <p className="text-sm font-normal text-muted-foreground">
                            {latest.riskCount} risiko
                            {draft &&
                              final &&
                              ` di draf · ${final.riskCount} di final`}
                          </p>
                          <p className="text-xs font-normal text-muted-foreground">
                            Diperbarui {workflowDate(updatedAt)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums font-normal">
                      {latest.code ? (
                        year
                      ) : embedded ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto min-h-8 px-0 py-0 tabular-nums font-normal no-underline hover:no-underline"
                          aria-label={`${openLabel} ${year} · ${ownerName}`}
                          onClick={() => openProfile(year, latest.id)}
                        >
                          {year}
                        </Button>
                      ) : (
                        <Link
                          className="inline-flex min-h-8 items-center rounded-sm tabular-nums font-normal no-underline hover:no-underline hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          href={annualProfileHref(year, latest.id)}
                          aria-label={`${openLabel} ${year} · ${ownerName}`}
                        >
                          {year}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-normal md:table-cell">{ownerName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {final && (
                          <Badge variant="outline">v{final.version} Final</Badge>
                        )}
                        {draft && (
                          <Badge variant="secondary">
                            v{draft.version} {final ? "Draf revisi" : "Draf"}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden tabular-nums md:table-cell">
                      {latest.riskCount}
                      {draft && final && (
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          di draf · {final.riskCount} di final
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {workflowDate(updatedAt)}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        aria-label={`${scheduleLabel} profil ${year} · ${ownerName}`}
                        onClick={(event) => setDisclosure({ profileId: expanded ? null : processProfile.id, animate: event.detail > 0 })}
                        className="h-auto min-h-7 whitespace-normal"
                      >
                        {scheduleLabel}
                        <ChevronDown aria-hidden="true" data-animate={disclosure.animate || undefined}
                          className={`${periodStyles.chevron} ${expanded ? "rotate-180" : ""}`} />
                      </Button>
                    </TableCell>
                    <TableCell className="w-10 text-right">
                      {draft && !readOnly && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Tindakan draf profil ${year}`}
                              title={`Tindakan draf profil ${year}`}
                            >
                              <MoreHorizontal aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                if (!draft) return;
                                setDeleteError("");
                                setDeleting(draft);
                              }}
                            >
                              <Trash2 aria-hidden="true" />
                              <span>Hapus draf</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow id={detailsId} className={periodStyles.detailRow} aria-hidden={!expanded}>
                    <TableCell colSpan={isMobile ? 5 : 8} className={periodStyles.detailCell}>
                      <div className={`motion-panel ${periodStyles.disclosure}`} data-open={expanded} data-animate={disclosure.animate || undefined}>
                        <div className={periodStyles.clip} inert={!expanded}>
                          <div className="bg-muted/30 p-3">
                            <AnnualProfilePeriods
                              key={processProfile.id}
                              workspace={progress}
                              profileId={processProfile.id}
                              organizationId={ownerId}
                              finalized={Boolean(processProfile.finalizedAt)}
                              readOnly={readOnly}
                              retry={retryPeriodProgress}
                            />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                </Fragment>
              );
            })}
          </WorkflowTable>
        </div>
      )}
      {adding && (
        <AnnualProfileInitiationDialog
          defaultYear={defaultYear}
          versions={ownVersions}
          loadPickup={loadPickup}
          loadRules={loadRules}
          create={async (year, source, ids, ruleId) => {
            await create(year, source, ids, ruleId);
            setAdding(false);
          }}
          openProfile={(year, version) => {
            setAdding(false);
            openProfile(year, version);
          }}
          close={() => setAdding(false)}
          restoreFocus={() => addTrigger.current?.focus()}
        />
      )}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (deletePending) return;
          if (!open) {
            setDeleting(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent showCloseButton={!deletePending}>
          <DialogHeader>
            <DialogTitle>Hapus draf profil secara permanen?</DialogTitle>
            <DialogDescription>Periksa versi draf profil yang akan dihapus.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences variant="plain">
            Profil {deleting?.year} · Versi {deleting?.version}. Data draf ini
            akan dihapus. Risiko di Register dan versi final profil sebelumnya
            tetap tersimpan.
          </ConfirmationConsequences>
          {deleteError && <WorkflowError message={deleteError} />}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deletePending}
              onClick={() => setDeleting(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending || !deleting}
              onClick={async () => {
                if (!deleting) return;
                setDeletePending(true);
                setDeleteError("");
                try {
                  await deleteDraft(deleting);
                  setDeleting(null);
                } catch (cause) {
                  setDeleteError(workflowError(cause));
                } finally {
                  setDeletePending(false);
                }
              }}
            >
              {deletePending ? "Menghapus…" : "Hapus draf permanen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}

"use client";

import type { MonitoringRule } from "@/lib/api/monitoring-rules";
import type { ProfilePeriodWorkspace } from "@/lib/api/profile-periods";
import { periodColumns } from "@/lib/profile-period-progress";
import { ProfileDocumentPeriodCell } from "./profile-period-cells";
import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "@/components/shared/icons";
import {
  CollectionEmptyState,
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";
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
  versions,
  defaultYear,
  loading,
  error,
  retry,
  loadPickup,
  loadRules,
  periodProgress = {},
  organizationId,
  create,
  openProfile,
  deleteDraft,
  embedded = false,
}: {
  organization: string;
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
  const dynamicColumns = periodColumns(Object.values(periodProgress).flatMap(value => "periods" in value ? [value.periods] : []));
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
    <PageStack>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{organization}</p>
          {headerAction}
        </div>
      ) : (
        <CollectionPageHeader
          title="Profil Risiko Tahunan"
          showTitle
          titleClassName="md:sr-only"
        />
      )}
      {Object.values(periodProgress).some(value => "error" in value) && <WorkflowError message="Sebagian progres periode gagal dimuat. Muat ulang untuk melihat status terbaru." retry={retry} />}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat daftar profil…
        </p>
      ) : !organization ? (
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
          description="Pilih tahun dan risiko awal untuk mulai menyusun profil unit."
        />
      ) : (
        <WorkflowTable
          columns={[
            "Tahun",
            "Status",
            "Jumlah risiko",
            "Terakhir diperbarui",
            ...dynamicColumns,
            "Aksi",
          ]}
          hiddenOnMobile={["Jumlah risiko", "Terakhir diperbarui"]}
        >
          {profiles.map(({ year, draft, final, updatedAt }) => {
            const latest = draft ?? final;
            const processProfile = final ?? draft;
            if (!latest) return null;
            return (
              <TableRow key={year}>
                <TableCell className="tabular-nums font-medium whitespace-normal">
                  <div className="space-y-1">
                    {embedded ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto min-h-8 px-0 py-0 tabular-nums font-medium no-underline hover:no-underline"
                        aria-label={`${draft ? "Lanjutkan draf" : "Buka profil"} ${year}`}
                        onClick={() => openProfile(year, latest.id)}
                      >
                        {year}
                      </Button>
                    ) : (
                      <Link
                        className="inline-flex min-h-8 items-center tabular-nums no-underline hover:no-underline hover:text-primary"
                        href={annualProfileHref(year, latest.id)}
                        aria-label={`${draft ? "Lanjutkan draf" : "Buka profil"} ${year}`}
                      >
                        {year}
                      </Link>
                    )}
                    <div className="space-y-1 sm:hidden">
                      <p className="text-xs font-normal text-muted-foreground">
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
                <TableCell className="hidden tabular-nums sm:table-cell">
                  {latest.riskCount}
                  {draft && final && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      di draf · {final.riskCount} di final
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {workflowDate(updatedAt)}
                </TableCell>
                {dynamicColumns.map(label => {
                  const workspace = processProfile ? periodProgress[processProfile.id] : undefined;
                  const period = workspace && "periods" in workspace ? workspace.periods.find(p => p.label === label) : undefined;
                  return <TableCell key={label}>{period ? <ProfileDocumentPeriodCell period={period} profileId={processProfile!.id} organizationId={organizationId} canCreate={Boolean(processProfile?.finalizedAt)} /> : <span className="text-xs text-muted-foreground">{workspace && "error" in workspace ? "Progres gagal dimuat" : "—"}</span>}</TableCell>;
                })}
                <TableCell className="w-10 text-right">
                  {draft && (
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
            );
          })}
        </WorkflowTable>
      )}
      {adding && (
        <AnnualProfileInitiationDialog
          defaultYear={defaultYear}
          versions={versions}
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
          <ConfirmationConsequences>
            Profil {deleting?.year} · Versi {deleting?.version}. Data dan
              keanggotaan draf ini akan dihapus. Risiko di Register dan versi
              final sebelumnya tetap tersimpan.
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

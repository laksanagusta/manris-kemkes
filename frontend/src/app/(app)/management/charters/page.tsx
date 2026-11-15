"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  Archive,
  MoreHorizontal,
  RotateCcw,
} from "@/components/shared/icons";

import { useAuth } from "@/contexts/auth-context";
import {
  archiveRiskCharter,
  listRiskCharters,
  restoreRiskCharter,
} from "@/lib/api/risk-charters";
import { listAllOrganizations } from "@/lib/api/organizations";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskCharter } from "@/types/risk-charter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RiskCharterCard } from "@/components/shared/design-system/domain/risk-charter-card";
import {
  CollectionPagination,
  CollectionEmptyState,
  CollectionErrorState,
  TableLoadingSkeleton,
  CollectionPageHeader,
} from "@/components/shared/design-system";
import {
  ActionButton,
  Card,
  CardContent,
  PageStack,
} from "@/components/shared/design-system";

import { RiskCharterQuickCreate } from "./_components/risk-charter-quick-create";

const uprLevelLabel: Record<string, string> = {
  eksekutif: "Eksekutif",
  upr_t1: "UPR T1",
  upr_t2: "UPR T2",
};

const charterStatusLabel: Record<string, string> = {
  draft: "Draf",
  active: "Aktif",
  superseded: "Digantikan",
  archived: "Diarsipkan",
};

export default function RiskChartersPage() {
  const { token, user } = useAuth();

  const requestVersion = useRef(0);
  const [items, setItems] = useState<RiskCharter[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [hasOwnCharter, setHasOwnCharter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!token) return;
      const request = ++requestVersion.current;

      try {
        if (showLoading) setLoading(true);
        setError(null);

        const activeToken = token;

        const [charters, own] = await Promise.all([
          listRiskCharters(activeToken, { page, limit }),
          user?.organizationId
            ? listRiskCharters(activeToken, { organization_id: user.organizationId, page: 1, limit: 1 })
            : null,
        ]);
        if (request !== requestVersion.current) return;
        setItems(charters.data ?? []);
        setTotal(charters.total);
        setHasOwnCharter(Boolean(own?.total));
        const lastPage = Math.max(1, Math.ceil(charters.total / limit));
        if (page > lastPage) setPage(lastPage);
      } catch (err) {
        if (request !== requestVersion.current) return;
        const message =
          err instanceof Error ? err.message : "Gagal memuat daftar piagam.";
        setError(message);
        toast.error(message);
      } finally {
        if (request === requestVersion.current) setLoading(false);
      }
    },
    [token, user?.organizationId, page, limit],
  );

  useEffect(() => {
    void loadData();
    return () => { requestVersion.current += 1; };
  }, [loadData]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listAllOrganizations(token)
      .then((orgs) => { if (!cancelled) setOrganizations(orgs); })
      .catch(() => { if (!cancelled) toast.error("Gagal memuat nama organisasi."); });
    return () => { cancelled = true; };
  }, [token]);

  const handleArchive = useCallback(
    async (charterId: string) => {
      if (!token) return;
      const charter = items.find((i) => i.id === charterId);
      if (!charter) return;
      try {
        await archiveRiskCharter(token, charterId);
        toast.success("Piagam berhasil diarsipkan.");
        loadData(false);
      } catch {
        toast.error("Gagal mengarsipkan piagam.");
      }
    },
    [token, items, loadData],
  );

  const handleRestore = useCallback(
    async (charterId: string) => {
      if (!token) return;
      try {
        await restoreRiskCharter(token, charterId);
        toast.success("Piagam berhasil dipulihkan.");
        loadData(false);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Gagal memulihkan Piagam.",
        );
      }
    },
    [token, loadData],
  );

  const organizationMap = useMemo(
    () =>
      new Map(
        organizations.map((organization) => [
          organization.id,
          organization.name,
        ]),
      ),
    [organizations],
  );

  const showInitialLoading = loading && items.length === 0;

  if (showInitialLoading) {
    return (
      <PageStack>
        <TableLoadingSkeleton message="Memuat daftar piagam..." />
      </PageStack>
    );
  }

  if (error && items.length === 0) {
    return (
      <PageStack>
        <CollectionErrorState
          message={error}
          onReload={() => loadData()}
        />
      </PageStack>
    );
  }

  const createAction = (
    <RiskCharterQuickCreate
      organization={organizations.find((item) => item.id === user?.organizationId)}
    />
  );
  const canCreateOwn = user?.organizationId &&
    !hasOwnCharter;

  return (
    <PageStack>
      <CollectionPageHeader
        title="Piagam Manrisk"
        actions={items.length > 0 && canCreateOwn ? createAction : undefined}
      />

      {error ? (
        <CollectionErrorState message={error} onReload={() => loadData()} />
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent>
            <CollectionEmptyState
              title="Belum ada piagam Manrisk"
              description="Buat piagam untuk menetapkan arah dan mandat manajemen risiko."
              action={createAction}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap items-start gap-4">
          {items.map((item) => {
            const canArchive = item.status === "active" && item.isCurrent;
            const canRestore = item.status === "archived";

            return (
              <RiskCharterCard
                key={item.id}
                charter={item}
                organizationName={organizationMap.get(item.organizationId) ?? "Organisasi tidak ditemukan"}
                statusLabel={charterStatusLabel[item.status] ?? item.status}
                levelLabel={uprLevelLabel[item.uprLevel] ?? item.uprLevel}
                actions={
                    canArchive || canRestore ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <ActionButton
                            variant="ghost"
                            size="icon-xs"
                            icon={<MoreHorizontal className="size-3.5" />}
                            aria-label={`Tindakan untuk ${item.title}`}
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canArchive ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleArchive(item.id)}
                            >
                              <Archive className="size-3.5" />
                              Arsipkan
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleRestore(item.id)}>
                              <RotateCcw className="size-3.5" />
                              Pulihkan
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null
                }
              />
            );
          })}
        </div>
      )}
      <CollectionPagination standalone
        itemLabel="piagam" total={total} page={page} pageSize={limit}
        disabled={loading} onPageChange={setPage}
        onPageSizeChange={(value) => { setLimit(value); setPage(1); }}
      />
    </PageStack>
  );
}

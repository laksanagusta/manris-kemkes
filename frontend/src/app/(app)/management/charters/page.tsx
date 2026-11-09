"use client";

import { newestCreatedFirst } from "@/lib/collection-created-at";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Archive,
  MoreHorizontal,
  Plus,
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
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionPageHeader,
} from "@/components/shared/design-system";
import {
  AccentButton,
  ActionButton,
  Card,
  CardContent,
  PageStack,
} from "@/components/shared/design-system";

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

  const [items, setItems] = useState<RiskCharter[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!token) return;

      try {
        if (showLoading) setLoading(true);
        setError(null);

        const activeToken = token;

        const [charters, orgs] = await Promise.all([
          (async () => {
            const rows: RiskCharter[] = [];
            let page = 1;
            while (true) {
              const response = await listRiskCharters(activeToken, { page, limit: 100 });
              const data = response.data ?? [];
              rows.push(...data);
              if (data.length === 0 || rows.length >= response.total) return rows;
              page += 1;
            }
          })(),
          listAllOrganizations(activeToken),
        ]);

        setItems([...charters].sort(newestCreatedFirst));
        setOrganizations(orgs);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat daftar piagam.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <CollectionLoadingState message="Memuat daftar piagam..." />
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
    <AccentButton asChild>
      <Link href="/management/charters/new">
        <Plus className="size-4" />
        Buat Piagam
      </Link>
    </AccentButton>
  );
  const canCreateOwn = user?.organizationId &&
    !items.some((item) => item.organizationId === user.organizationId);

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
    </PageStack>
  );
}

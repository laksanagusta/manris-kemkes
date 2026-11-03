"use client";
import { newestCreatedFirst } from "@/lib/collection-created-at";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import {
  useCallback,
  useDeferredValue,
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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionPagination,
  CollectionPageHeader,
  CollectionSearchField,
  DynamicTableFilters,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionToolbar,
} from "@/components/shared/design-system";
import {
  AccentButton,
  ActionButton,
  PageStack,
} from "@/components/shared/design-system";
import { getStatusBadgeClassName, toBadgeVariant } from "@/lib/badge-variant";

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

const charterStatusTone: Record<
  string,
  "neutral" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  active: "success",
  superseded: "neutral",
  archived: "neutral",
};

export default function RiskChartersPage() {
  const { token } = useAuth();

  const [items, setItems] = useState<RiskCharter[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const deferredSearch = useDeferredValue(search);

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

  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return items.filter((item) => {
      if (periodFilter !== "all" && item.period !== periodFilter) return false;
      if (!query) return true;
      const orgName =
        organizationMap.get(item.organizationId)?.toLowerCase() ?? "";
      return [
        item.title.toLowerCase(),
        orgName,
        item.period.toLowerCase(),
        uprLevelLabel[item.uprLevel]?.toLowerCase() ??
          item.uprLevel.toLowerCase(),
      ].some((value) => value.includes(query));
    });
  }, [deferredSearch, items, organizationMap, periodFilter]);

  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, periodFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
    setPage((current) => Math.min(current, totalPages));
  }, [filteredItems.length, pageSize]);

  const availablePeriods = useMemo(
    () =>
      [...new Set(items.map((item) => item.period).filter(Boolean))]
        .sort()
        .reverse(),
    [items],
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

  return (
    <PageStack>
      <CollectionPageHeader title="Piagam Manrisk" />

      {error ? (
        <CollectionErrorState message={error} onReload={() => loadData()} />
      ) : null}

      <div className="space-y-4">
      <CollectionToolbar
        className="w-full"
        leading={
          <DynamicTableFilters
            search={
              <CollectionSearchField
                id="charter-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, organisasi, UPR, atau tahun"
              />
            }
            fields={[
              {
                id: "period",
                label: "Periode",
                value: periodFilter,
                onChange: setPeriodFilter,
                options: [
                  { value: "all", label: "Semua periode" },
                  ...availablePeriods.map((period) => ({ value: period, label: period })),
                ],
              },
            ]}
          />
        }
        actions={
          <AccentButton asChild>
            <Link href="/management/charters/new">
              <Plus className="size-4" />
              Buat Piagam
            </Link>
          </AccentButton>
        }
      />

      <CollectionTableCard>
        {filteredItems.length === 0 ? (
          <CollectionEmptyState
            title={items.length === 0 ? "Belum ada piagam Manrisk" : "Tidak ada piagam yang cocok"}
            description={
              items.length === 0
                ? "Buat piagam untuk menetapkan arah dan mandat manajemen risiko."
                : "Ubah kata kunci pencarian atau periode untuk melihat piagam lain."
            }
          />
        ) : (
          <Table className="min-w-[1040px] table-fixed">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[17%]" />
              <col className="w-40" />
<col className="w-[10%]" />
            </colgroup>
            <CollectionTableHeader density="compact">
              <CollectionTableHeaderRow>
                <CollectionTableHead className="">
                  Judul Piagam
                </CollectionTableHead>
                <CollectionTableHead >UPR</CollectionTableHead>
                <CollectionTableHead >Periode</CollectionTableHead>
                <CollectionTableHead >Status</CollectionTableHead>
                <CollectionTableHead >Diperbarui</CollectionTableHead>
                <CreatedAtHead />
                <CollectionTableHead className="sticky right-0 z-10 w-[84px] text-center">
                  <span className="sr-only">Aksi</span>
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="h-10 hover:bg-transparent hover:[&>td]:bg-muted/50 [&>td]:transition-[background-color]"
                >
                  <TableCell className="max-w-[280px] truncate align-middle">
                    <div className="min-w-0">
                      <Link
                        href={`/management/charters/${item.id}`}
                        className="block truncate font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                      >
                        {item.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {organizationMap.get(item.organizationId) ??
                          "Organisasi tidak ditemukan"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle">
                    {uprLevelLabel[item.uprLevel] ?? item.uprLevel}
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle">
                    {item.period}
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge variant={toBadgeVariant(charterStatusTone[item.status] ?? "neutral")}
                      className={getStatusBadgeClassName(charterStatusTone[item.status] ?? "neutral")}
                    >
                      {charterStatusLabel[item.status] ?? item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap align-middle">
                    {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <CreatedAtCell record={item} />
                  <TableCell className="sticky right-0 bg-card">
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <ActionButton
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground"
                            icon={<MoreHorizontal className="size-3.5" />}
                            aria-label={`Tindakan piagam ${item.period}`}
                            title="Tindakan"
                          />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {item.status === "active" && item.isCurrent ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleArchive(item.id)}
                            >
                              <Archive className="size-3.5" />
                              Arsipkan
                            </DropdownMenuItem>
                          ) : null}
                          {item.status === "archived" ? (
                            <DropdownMenuItem onClick={() => handleRestore(item.id)}>
                              <RotateCcw className="size-3.5" />
                              Pulihkan
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <CollectionPagination
          itemLabel="piagam"
          page={page}
          pageSize={pageSize}
          total={filteredItems.length}
          disabled={loading}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
        />
      </CollectionTableCard>
      </div>
    </PageStack>
  );
}

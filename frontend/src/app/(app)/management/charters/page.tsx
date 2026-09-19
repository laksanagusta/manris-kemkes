"use client";

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
} from "@/components/ui/icons";

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
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionLoadingState,
  CollectionPagination,
  CollectionPageHeader,
  CollectionSearchField,
  CollectionStatusBadge,
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

  const hasActiveFilters = search !== "" || periodFilter !== "all";

  const resetFilters = useCallback(() => {
    setSearch("");
    setPeriodFilter("all");
    setPage(1);
  }, []);

  const deferredSearch = useDeferredValue(search);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!token) return;

      try {
        if (showLoading) setLoading(true);
        setError(null);

        const activeToken = token;

        const [charters, orgs] = await Promise.all([
          listRiskCharters(activeToken, {
            period: periodFilter === "all" ? undefined : periodFilter,
            limit: 100,
          }),
          listAllOrganizations(activeToken),
        ]);

        setItems(charters.data ?? []);
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
    [token, periodFilter],
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
    if (!query) return items;

    return items.filter((item) => {
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
  }, [deferredSearch, items, organizationMap]);

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
      <CollectionPageHeader title="Piagam Manris" />

      {error ? (
        <CollectionErrorState message={error} onReload={() => loadData()} />
      ) : null}

      <div className="space-y-4">
      <CollectionToolbar
        className="w-full"
        leading={
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <CollectionSearchField
              id="charter-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, organisasi, UPR, atau tahun"
            />
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-9 w-full sm:w-56">
                <SelectValue placeholder="Semua periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua periode</SelectItem>
                {availablePeriods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters ? (
              <ActionButton
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground"
                icon={<RotateCcw className="size-3.5" />}
              >
                Reset filter
              </ActionButton>
            ) : null}
          </div>
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
            title={items.length === 0 ? "Belum ada piagam Manris" : "Tidak ada piagam yang cocok"}
            description={
              items.length === 0
                ? "Buat piagam untuk menetapkan arah dan mandat manajemen risiko."
                : "Ubah kata kunci pencarian atau periode untuk melihat piagam lain."
            }
          />
        ) : (
          <Table className="min-w-[880px] table-fixed">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
              <col className="w-[17%]" />
              <col className="w-[10%]" />
            </colgroup>
            <CollectionTableHeader density="compact">
              <CollectionTableHeaderRow>
                <CollectionTableHead className="pl-4 pr-3">
                  Judul Piagam
                </CollectionTableHead>
                <CollectionTableHead className="px-3">UPR</CollectionTableHead>
                <CollectionTableHead className="px-3">Periode</CollectionTableHead>
                <CollectionTableHead className="px-3">Status</CollectionTableHead>
                <CollectionTableHead className="px-3">Diperbarui</CollectionTableHead>
                <CollectionTableHead className="sticky right-0 z-10 w-[84px] bg-table-header px-3 text-center">
                  Aksi
                </CollectionTableHead>
              </CollectionTableHeaderRow>
            </CollectionTableHeader>
            <TableBody>
              {paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="h-10 border-0 hover:bg-transparent hover:[&>td]:bg-muted/50 [&>td]:transition-[background-color]"
                >
                  <TableCell className="max-w-[280px] truncate py-2 pr-3 pl-4 align-middle">
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
                  <TableCell className="whitespace-nowrap px-3 py-2 align-middle">
                    {uprLevelLabel[item.uprLevel] ?? item.uprLevel}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2 align-middle">
                    {item.period}
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    <CollectionStatusBadge
                      tone={charterStatusTone[item.status] ?? "neutral"}
                    >
                      {charterStatusLabel[item.status] ?? item.status}
                    </CollectionStatusBadge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-2 align-middle text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card px-3 py-2">
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

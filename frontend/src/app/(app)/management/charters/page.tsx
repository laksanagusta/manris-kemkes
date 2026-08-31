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
  ArrowUpRight,
  Archive,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
} from "@/components/ui/icons";

import { useAuth } from "@/contexts/auth-context";
import { listRiskCharters } from "@/lib/api/risk-charters";
import { listAllOrganizations } from "@/lib/api/organizations";
import { updateRiskCharter } from "@/lib/api/risk-charters";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskCharter } from "@/types/risk-charter";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import {
  CollectionPagination,
  CollectionPageHeader,
  CollectionSearchField,
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
  draft: "Draft",
  in_review: "Diperiksa",
  active: "Aktif",
  archived: "Diarsipkan",
};

function getCharterStatusBadgeClass(status?: string) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "in_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "archived":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

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
        await updateRiskCharter(token, charterId, {
          organizationId: charter.organizationId,
          uprLevel: charter.uprLevel,
          period: charter.period,
          scope: charter.scope,
          legalBasis: charter.legalBasis,
          internalContext: charter.internalContext,
          externalContext: charter.externalContext,
          stakeholderSummary: charter.stakeholderSummary,
          status: "archived",
        });
        toast.success("Piagam berhasil diarsipkan.");
        loadData(false);
      } catch {
        toast.error("Gagal mengarsipkan piagam.");
      }
    },
    [token, items, loadData],
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

  return (
    <PageStack>
      <CollectionPageHeader title="Piagam Manris" />

      <CollectionToolbar
        className="w-full"
        leading={
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 w-full sm:w-80 sm:flex-none">
              <CollectionSearchField
                id="charter-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari organisasi, UPR, atau periode"
              />
            </div>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-56">
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
        <Table className="min-w-[880px] table-fixed">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[17%]" />
            <col className="w-[10%]" />
          </colgroup>
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead className="pl-4 pr-3">
                Organisasi
              </CollectionTableHead>
              <CollectionTableHead className="px-3">UPR</CollectionTableHead>
              <CollectionTableHead className="px-3">
                Periode
              </CollectionTableHead>
              <CollectionTableHead className="px-3">
                Status
              </CollectionTableHead>
              <CollectionTableHead className="px-3">
                Diperbarui
              </CollectionTableHead>
              <CollectionTableHead className="px-3 text-right">
                Aksi
              </CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  Memuat data piagam...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">{error}</p>
                    <ActionButton
                      variant="outline"
                      size="sm"
                      onClick={() => loadData()}
                      icon={<RefreshCw className="size-3.5" />}
                    >
                      Coba lagi
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Tidak ada piagam manris yang ditemukan
                </TableCell>
              </TableRow>
            ) : (
              paginatedItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/20">
                  <TableCell className="max-w-[200px] truncate font-medium">
                    <span className="text-foreground">
                      {organizationMap.get(item.organizationId) ??
                        "Organisasi tidak ditemukan"}
                    </span>
                  </TableCell>
                  <TableCell>{uprLevelLabel[item.uprLevel] ?? item.uprLevel}</TableCell>
                  <TableCell>{item.period}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-6 rounded-full px-2 text-[10px] font-medium",
                        getCharterStatusBadgeClass(item.status),
                      )}
                    >
                      {charterStatusLabel[item.status] ?? item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(item.updatedAt).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <ActionButton
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          icon={<MoreHorizontal className="size-3.5" />}
                        >
                        </ActionButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/management/charters/${item.id}`}
                            className="gap-2"
                          >
                            <ArrowUpRight className="size-3.5" />
                            Buka
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleArchive(item.id)}
                          disabled={false}
                        >
                          <Archive className="size-3.5" />
                          Arsipkan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
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
    </PageStack>
  );
}

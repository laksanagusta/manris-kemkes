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
  ChevronLeft,
  ChevronRight,
  Archive,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { listRiskCharters } from "@/lib/api/risk-charters";
import { listAllOrganizations } from "@/lib/api/organizations";
import { updateRiskCharter } from "@/lib/api/risk-charters";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskCharter } from "@/types/risk-charter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const uprLevelLabel: Record<string, string> = {
  eksekutif: "Eksekutif",
  upr_t1: "UPR T1",
  upr_t2: "UPR T2",
};

const charterStatusLabel: Record<string, string> = {
  draft: "Draft",
  in_review: "Diperiksa",
  approved: "Disahkan",
  archived: "Diarsipkan",
};

function getCharterStatusBadgeClass(status?: string) {
  switch (status) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "in_review":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "archived":
      return "border-slate-200 bg-slate-50 text-slate-600";
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
  const pageSize = 5;

  const hasActiveFilters =
    search !== "" || periodFilter !== "all";

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
          riskOwnerName: charter.riskOwnerName,
          riskOwnerUserId: charter.riskOwnerUserId || undefined,
          riskTeamName: charter.riskTeamName,
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
        item.riskOwnerName.toLowerCase(),
        uprLevelLabel[item.uprLevel]?.toLowerCase() ??
          item.uprLevel.toLowerCase(),
      ].some((value) => value.includes(query));
    });
  }, [deferredSearch, items, organizationMap]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(
    () => filteredItems.slice((page - 1) * pageSize, page * pageSize),
    [filteredItems, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, periodFilter]);

  const availablePeriods = useMemo(
    () =>
      [...new Set(items.map((item) => item.period).filter(Boolean))]
        .sort()
        .reverse(),
    [items],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
            Risk Governance
          </p>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Piagam MR</h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Kelola piagam manajemen risiko untuk menetapkan konteks, ruang lingkup, dan struktur UPR secara konsisten antar unit kerja.
            </p>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link href="/management/charters/new">
            <Plus className="size-4" />
            Buat Piagam MR
          </Link>
        </Button>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-[15px] font-semibold">
            Daftar Piagam
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tinjau piagam berdasarkan periode, owner, dan status, lalu buka
            detail untuk memperbarui isi charter dengan struktur yang
            konsisten.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="space-y-2">
              <Label htmlFor="charter-search">Cari piagam</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="charter-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari organisasi, owner, atau periode"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Periode</Label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
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
            </div>
          </div>

          {hasActiveFilters && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-2 text-muted-foreground"
              >
                <RotateCcw className="size-3.5" />
                Reset filter
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisasi</TableHead>
                  <TableHead>UPR</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Risk Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperbarui</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Memuat data piagam...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="space-y-3">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadData()}
                          className="gap-2"
                        >
                          <RefreshCw className="size-3.5" />
                          Coba lagi
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Tidak ada piagam MR yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {organizationMap.get(item.organizationId) ??
                          "Organisasi tidak ditemukan"}
                      </TableCell>
                      <TableCell>
                        {uprLevelLabel[item.uprLevel] ?? item.uprLevel}
                      </TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {item.riskOwnerName}
                      </TableCell>
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
                            <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link href={`/management/charters/${item.id}`} className="gap-2">
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
          </div>

          {filteredItems.length >= pageSize && (
            <div className="flex items-center justify-between px-2">
              <p className="text-xs text-muted-foreground">
                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredItems.length)} dari {filteredItems.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="px-2 text-sm tabular-nums text-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

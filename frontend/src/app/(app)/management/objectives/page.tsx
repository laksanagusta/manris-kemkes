"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Goal,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import {
  listRiskObjectives,
  updateRiskObjective,
} from "@/lib/api/risk-objectives";
import { listAllOrganizations } from "@/lib/api/organizations";
import type { OrganizationListItem } from "@/lib/api/organizations";
import type { RiskObjective } from "@/types/risk-objective";
import {
  Card,
  CardContent,
  CardDescription,
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

export default function RiskObjectivesPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [items, setItems] = useState<RiskObjective[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [statusFilter] = useState<string | "all">("all");
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

        const [objectives, orgs] = await Promise.all([
          listRiskObjectives(activeToken, {
            period: periodFilter === "all" ? undefined : periodFilter,
          }),
          listAllOrganizations(activeToken),
        ]);

        setItems(objectives.data ?? []);
        setOrganizations(orgs);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat daftar sasaran.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [token, periodFilter, statusFilter],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArchive = useCallback(
    async (objectiveId: string) => {
      if (!token) return;
      const objective = items.find((i) => i.id === objectiveId);
      if (!objective) return;
      try {
        await updateRiskObjective(token, objectiveId, {
          organizationId: objective.organizationId,
          charterId: objective.charterId || undefined,
          period: objective.period,
          tujuan: objective.tujuan,
          sasaran: objective.sasaran,
          indikatorKinerjaUtama: objective.indikatorKinerjaUtama,
          target: objective.target,
          program: objective.program,
          kegiatan: objective.kegiatan,
          processBusiness: objective.processBusiness,
        });
        toast.success("Sasaran berhasil diarsipkan.");
        loadData(false);
      } catch {
        toast.error("Gagal mengarsipkan sasaran.");
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
        item.tujuan.toLowerCase(),
        item.sasaran.toLowerCase(),
        item.indikatorKinerjaUtama.toLowerCase(),
      ].some((value) => value.includes(query));
    });
  }, [deferredSearch, items, organizationMap]);

  const summary = useMemo(
    () => ({
      total: filteredItems.length,
    }),
    [filteredItems],
  );

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
            <h2 className="text-2xl font-semibold tracking-tight">
              Sasaran &amp; IKU
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Kelola sasaran organisasi dan indikator kinerja utama yang menjadi acuan analisis risiko dan pemantauan kinerja.
            </p>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link href="/management/objectives/new">
            <Plus className="size-4" />
            Buat Sasaran
          </Link>
        </Button>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-[15px] font-semibold">
            Daftar Sasaran
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Tinjau sasaran berdasarkan periode, organisasi, dan status, lalu
            buka detail untuk memperbarui isi dan target.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="space-y-2">
              <Label htmlFor="objective-search">Cari sasaran</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="objective-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari organisasi, sasaran, atau IKU"
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
                  <TableHead>Periode</TableHead>
                  <TableHead>Sasaran</TableHead>
                  <TableHead>IKU</TableHead>
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
                      Memuat data sasaran...
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
                      Tidak ada sasaran &amp; IKU yang ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="max-w-[200px] truncate font-medium">
                        {organizationMap.get(item.organizationId) ??
                          "Organisasi tidak ditemukan"}
                      </TableCell>
                      <TableCell>{item.period}</TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {item.sasaran}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {item.indikatorKinerjaUtama}
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
                              <Link href={`/management/objectives/${item.id}`} className="gap-2">
                                <ArrowUpRight className="size-3.5" />
                                Buka
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleArchive(item.id)}
                              disabled={false}
                            >
                              <Trash2 className="size-3.5" />
                              Hapus
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
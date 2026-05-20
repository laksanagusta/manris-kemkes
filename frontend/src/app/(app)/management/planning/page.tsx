"use client";

import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  ChevronRight,
  Layers3,
  Network,
  RefreshCw,
  Search,
  ShieldCheck,
  Link2,
} from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  listPlanningObjectiveCompatibility,
  type ListPlanningObjectiveCompatibilityParams,
} from "@/lib/api/planning";
import type { PlanningObjectiveCompatibilityItem } from "@/types/planning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  draft: "Draf",
  in_review: "Diperiksa",
  approved: "Disahkan",
  archived: "Diarsipkan",
};

type PlanningHierarchyLevel =
  | "tujuan"
  | "sasaran"
  | "iku"
  | "program"
  | "kegiatan";

type PlanningHierarchyNode = {
  key: string;
  title: string;
  level: PlanningHierarchyLevel;
  count: number;
  periods: string[];
  organizationIds: string[];
  children: PlanningHierarchyNode[];
  items: PlanningObjectiveCompatibilityItem[];
};

const hierarchyLevelLabel: Record<PlanningHierarchyLevel, string> = {
  tujuan: "Tujuan",
  sasaran: "Sasaran",
  iku: "IKU",
  program: "Program",
  kegiatan: "Kegiatan",
};

const nextHierarchyLevelLabel: Record<PlanningHierarchyLevel, string> = {
  tujuan: "sasaran",
  sasaran: "IKU",
  iku: "program",
  program: "kegiatan",
  kegiatan: "RO",
};

const hierarchyToneClass: Record<PlanningHierarchyLevel, string> = {
  tujuan:
    "border-slate-300/80 bg-[linear-gradient(180deg,rgba(245,248,252,0.96),rgba(241,245,250,0.9))]",
  sasaran:
    "border-slate-300/70 bg-[linear-gradient(180deg,rgba(250,251,253,0.98),rgba(246,248,251,0.94))]",
  iku:
    "border-slate-300/70 bg-[linear-gradient(180deg,rgba(252,252,253,0.98),rgba(247,249,252,0.95))]",
  program:
    "border-slate-300/70 bg-[linear-gradient(180deg,rgba(253,253,253,0.98),rgba(248,249,252,0.95))]",
  kegiatan:
    "border-slate-300/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,250,252,0.96))]",
};

const hierarchyBadgeClass: Record<PlanningHierarchyLevel, string> = {
  tujuan: "border-sky-200 bg-sky-50 text-sky-700",
  sasaran: "border-cyan-200 bg-cyan-50 text-cyan-700",
  iku: "border-violet-200 bg-violet-50 text-violet-700",
  program: "border-amber-200 bg-amber-50 text-amber-700",
  kegiatan: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function pushUnique(values: string[], value?: string) {
  if (!value) return;
  if (!values.includes(value)) {
    values.push(value);
  }
}

function createHierarchyNode(
  key: string,
  title: string,
  level: PlanningHierarchyLevel,
): PlanningHierarchyNode {
  return {
    key,
    title,
    level,
    count: 0,
    periods: [],
    organizationIds: [],
    children: [],
    items: [],
  };
}

function findOrCreateChild(
  nodes: PlanningHierarchyNode[],
  key: string,
  title: string,
  level: PlanningHierarchyLevel,
) {
  const existing = nodes.find((node) => node.key === key);
  if (existing) return existing;
  const created = createHierarchyNode(key, title, level);
  nodes.push(created);
  return created;
}

function buildPlanningHierarchyTree(
  items: PlanningObjectiveCompatibilityItem[],
): PlanningHierarchyNode[] {
  const root: PlanningHierarchyNode[] = [];

  for (const item of items) {
    const tujuanTitle = item.tujuan.trim() || "(Tanpa Tujuan)";
    const sasaranTitle = item.sasaran.trim() || "(Tanpa Sasaran)";
    const ikuTitle = item.indikatorKinerjaUtama.trim() || "(Tanpa IKU)";
    const programTitle = item.program.trim() || "(Tanpa Program)";
    const kegiatanTitle = item.kegiatan.trim() || "(Tanpa Kegiatan)";

    const tujuanKey = `tujuan:${tujuanTitle}`;
    const sasaranKey = `${tujuanKey}::sasaran:${sasaranTitle}`;
    const ikuKey = `${sasaranKey}::iku:${ikuTitle}`;
    const programKey = `${ikuKey}::program:${programTitle}`;
    const kegiatanKey = `${programKey}::kegiatan:${kegiatanTitle}`;

    const tujuanNode = findOrCreateChild(root, tujuanKey, tujuanTitle, "tujuan");
    const sasaranNode = findOrCreateChild(
      tujuanNode.children,
      sasaranKey,
      sasaranTitle,
      "sasaran",
    );
    const ikuNode = findOrCreateChild(
      sasaranNode.children,
      ikuKey,
      ikuTitle,
      "iku",
    );
    const programNode = findOrCreateChild(
      ikuNode.children,
      programKey,
      programTitle,
      "program",
    );
    const kegiatanNode = findOrCreateChild(
      programNode.children,
      kegiatanKey,
      kegiatanTitle,
      "kegiatan",
    );

    [
      tujuanNode,
      sasaranNode,
      ikuNode,
      programNode,
      kegiatanNode,
    ].forEach((node) => {
      pushUnique(node.periods, item.period);
      pushUnique(node.organizationIds, item.organizationId);
    });
    kegiatanNode.items.push(item);
  }

  const assignCounts = (node: PlanningHierarchyNode): number => {
    const childCount = node.children.reduce(
      (sum, child) => sum + assignCounts(child),
      0,
    );
    node.count = node.items.length + childCount;
    return node.count;
  };

  root.forEach((node) => assignCounts(node));
  return root;
}

function formatCountLabel(count: number, label: string) {
  return `${count} ${label}`;
}

function PlanningHierarchyLoadingState() {
  return (
    <div className="space-y-3 px-6 py-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/50 bg-background/80 px-5 py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-18 rounded-full" />
                <Skeleton className="h-5 w-52" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanningHierarchyTable({
  nodes,
  expandedNodeKeys,
  onToggleNode,
  depth = 0,
}: {
  nodes: PlanningHierarchyNode[];
  expandedNodeKeys: ReadonlySet<string>;
  onToggleNode: (key: string) => void;
  depth?: number;
}) {
  if (nodes.length === 0) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-300/70 bg-white/95 shadow-sm shadow-slate-950/[0.03]",
        depth > 0 && "rounded-xl",
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/90 hover:bg-slate-50/90">
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <PlanningHierarchyRows
            nodes={nodes}
            expandedNodeKeys={expandedNodeKeys}
            onToggleNode={onToggleNode}
            depth={depth}
          />
        </TableBody>
      </Table>
    </div>
  );
}

function PlanningHierarchyRows({
  nodes,
  expandedNodeKeys,
  onToggleNode,
  depth = 0,
}: {
  nodes: PlanningHierarchyNode[];
  expandedNodeKeys: ReadonlySet<string>;
  onToggleNode: (key: string) => void;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => {
        const isExpandable = node.children.length > 0 || node.items.length > 0;
        const isExpanded = expandedNodeKeys.has(node.key);
        const childCount = node.children.length;
        const leafCount = node.items.length;

        return (
          <Fragment key={node.key}>
            <TableRow
              className={cn(
                "group hover:bg-slate-50/70",
                depth > 0 && "bg-slate-50/30",
              )}
            >
              <TableCell className="align-top">
                <div
                  className="flex min-w-0 items-center gap-3"
                  style={{ paddingLeft: `${depth * 22}px` }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isExpandable) onToggleNode(node.key);
                    }}
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors",
                      isExpandable
                        ? "hover:bg-slate-100"
                        : "cursor-default bg-slate-50 text-slate-300",
                    )}
                    aria-label={
                      isExpandable
                        ? `${isExpanded ? "Tutup" : "Buka"} ${node.title}`
                        : node.title
                    }
                    aria-expanded={isExpandable ? isExpanded : undefined}
                  >
                    {isExpandable ? (
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform duration-200",
                          isExpanded && "rotate-90",
                        )}
                      />
                    ) : (
                      <span className="size-1.5 rounded-full bg-slate-400" />
                    )}
                  </button>
                  <div className="min-w-0 space-y-1 py-0.5">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 text-sm font-medium text-slate-950 md:text-base">
                        {node.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Link2 className="size-3.5" />
                        {node.count}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {hierarchyLevelLabel[node.level]}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>

            {isExpanded && node.children.length > 0 ? (
              <PlanningHierarchyRows
                nodes={node.children}
                expandedNodeKeys={expandedNodeKeys}
                onToggleNode={onToggleNode}
                depth={depth + 1}
              />
            ) : null}

            {isExpanded && node.children.length === 0 && node.items.length > 0
              ? node.items.map((item) => (
                  <TableRow key={item.id} className="bg-slate-50/20 hover:bg-slate-50/50">
                    <TableCell className="align-top">
                      <div
                        className="flex min-w-0 items-center gap-3"
                        style={{ paddingLeft: `${(depth + 1) * 22}px` }}
                      >
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm">
                          <span className="size-1.5 rounded-full bg-slate-400" />
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="min-w-0 text-sm text-slate-950 md:text-base">
                              {item.processBusiness || item.target || "RO belum diberi judul"}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Link2 className="size-3.5" />
                              1
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {statusLabel[item.status] ?? item.status}
                            {item.period ? ` · ${item.period}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </Fragment>
        );
      })}
    </>
  );
}

function statusClass(status?: string) {
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

export default function PlanningManagementPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<PlanningObjectiveCompatibilityItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");

  const deferredSearch = useDeferredValue(search);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!token) return;
      try {
        if (showLoading) setLoading(true);
        setError(null);
        const params: ListPlanningObjectiveCompatibilityParams = {
          q: deferredSearch.trim() || undefined,
          period: periodFilter === "all" ? undefined : periodFilter,
          organization_id:
            organizationFilter === "all" ? undefined : organizationFilter,
          page: 1,
          limit: 100,
        };
        const [rows, orgs] = await Promise.all([
          listPlanningObjectiveCompatibility(token, params),
          listAllOrganizations(token),
        ]);
        setItems(rows.data ?? []);
        setOrganizations(orgs);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal memuat struktur kinerja.";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [deferredSearch, organizationFilter, periodFilter, token],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const organizationMap = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations],
  );

  const periods = useMemo(
    () =>
      [...new Set(items.map((item) => item.period).filter(Boolean))]
        .sort()
        .reverse(),
    [items],
  );

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) =>
      [
        item.tujuan,
        item.sasaran,
        item.indikatorKinerjaUtama,
        item.target,
        item.program,
        item.kegiatan,
        item.processBusiness,
        organizationMap.get(item.organizationId) ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [deferredSearch, items, organizationMap]);

  const totalOrganizations = useMemo(
    () => new Set(filtered.map((item) => item.organizationId)).size,
    [filtered],
  );
  const totalPeriods = useMemo(
    () => new Set(filtered.map((item) => item.period)).size,
    [filtered],
  );
  const planningHierarchyTree = useMemo(
    () => buildPlanningHierarchyTree(filtered),
    [filtered],
  );
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setExpandedNodeKeys(new Set(planningHierarchyTree.map((node) => node.key)));
  }, [planningHierarchyTree]);

  const toggleNode = useCallback((key: string) => {
    setExpandedNodeKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const activeToken = token;

  if (!activeToken) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-10 text-sm text-muted-foreground">
          Silakan masuk untuk mengelola Struktur Kinerja.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[28px] border border-slate-300/70 bg-[linear-gradient(180deg,rgba(250,252,255,0.98),rgba(244,248,252,0.96))] shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:px-7">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-sky-200 bg-sky-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700"
              >
                Risk Governance
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Struktur aktif
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-slate-950 text-balance">
                  Struktur Kinerja & RO yang siap dipakai sebagai jangkar risiko
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 text-pretty">
                  Tinjau jalur kerja dari tujuan sampai RO, cek periode dan
                  cakupan satker, lalu pastikan register risiko selalu merujuk
                  ke struktur yang tepat.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-4 text-sky-700" />
                  Sumber referensi utama untuk pemilihan RO
                </span>
                <span className="inline-flex items-center gap-2">
                  <Network className="size-4 text-slate-500" />
                  Explorer bertingkat untuk tujuan sampai kegiatan
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-300/80 bg-white/92 p-4 shadow-sm shadow-slate-950/[0.04]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Snapshot
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Cakupan struktur yang sedang terlihat.
                </p>
              </div>
              <Button
                variant="outline"
                className="gap-2 bg-white"
                onClick={() => loadData()}
                disabled={loading}
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Muat ulang
              </Button>
            </div>
            <Separator className="my-4 bg-slate-200/80" />
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/80 px-3 py-3">
                <dt className="inline-flex items-center gap-2 text-slate-600">
                  <Layers3 className="size-4 text-sky-700" />
                  Struktur cocok
                </dt>
                <dd className="font-semibold tabular-nums text-slate-950">
                  {filtered.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/80 px-3 py-3">
                <dt className="inline-flex items-center gap-2 text-slate-600">
                  <Building2 className="size-4 text-emerald-700" />
                  Satker terjangkau
                </dt>
                <dd className="font-semibold tabular-nums text-slate-950">
                  {totalOrganizations}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/80 px-3 py-3">
                <dt className="inline-flex items-center gap-2 text-slate-600">
                  <CalendarRange className="size-4 text-amber-700" />
                  Periode aktif
                </dt>
                <dd className="font-semibold tabular-nums text-slate-950">
                  {totalPeriods}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-300/70 bg-white/94 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.35)]">
        <div className="grid gap-5 border-b border-slate-200/80 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_220px_220px] lg:px-7">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                Explorer struktur
              </p>
              <p className="mt-1 max-w-[60ch] text-sm leading-6 text-slate-600">
                Mulai dari tujuan, buka level di bawahnya sesuai kebutuhan,
                lalu telusuri RO yang tersedia untuk periode dan satker yang
                sedang dipantau.
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="planning-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari tujuan, sasaran, IKU, program, kegiatan, atau RO"
                className="h-11 rounded-xl border-slate-300/80 bg-slate-50/70 pl-9 shadow-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Periode</Label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-11 rounded-xl border-slate-300/80 bg-slate-50/70 shadow-none">
                <SelectValue placeholder="Semua periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua periode</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">Satker</Label>
            <Select
              value={organizationFilter}
              onValueChange={setOrganizationFilter}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-300/80 bg-slate-50/70 shadow-none">
                <SelectValue placeholder="Semua satker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua satker</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6 py-3 text-xs text-slate-600 lg:px-7">
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700"
          >
            {formatCountLabel(planningHierarchyTree.length, "tujuan")}
          </Badge>
          {periodFilter !== "all" ? (
            <Badge
              variant="outline"
              className="border-sky-200 bg-sky-50 text-sky-700"
            >
              Periode: {periodFilter}
            </Badge>
          ) : null}
          {organizationFilter !== "all" ? (
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
            >
              Satker:{" "}
              {organizationMap.get(organizationFilter) ?? organizationFilter}
            </Badge>
          ) : null}
          {deferredSearch.trim() ? (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700"
            >
              Kata kunci: {deferredSearch.trim()}
            </Badge>
          ) : null}
        </div>

        <div className="border-t border-slate-200/80">
          {error ? (
            <div className="px-6 py-10 lg:px-7">
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                {error}
              </div>
            </div>
          ) : null}

          {loading ? (
            <PlanningHierarchyLoadingState />
          ) : planningHierarchyTree.length === 0 ? (
            <div className="px-6 py-12 lg:px-7">
              <div className="max-w-xl space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-5">
                <p className="text-sm font-semibold text-slate-900">
                  Tidak ada struktur yang cocok
                </p>
                <p className="text-sm leading-6 text-slate-600">
                  Coba longgarkan filter periode atau satker, atau gunakan kata
                  kunci yang lebih umum agar jalur struktur kembali terlihat.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-3 py-3 md:px-4 md:py-4">
              <PlanningHierarchyTable
                nodes={planningHierarchyTree}
                expandedNodeKeys={expandedNodeKeys}
                onToggleNode={toggleNode}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

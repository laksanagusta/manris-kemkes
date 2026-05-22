"use client";

import {
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { ChevronRight, Search } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

const hierarchyBadgeClass: Record<PlanningHierarchyLevel, string> = {
  tujuan: "border-zinc-200 bg-zinc-50 text-zinc-700",
  sasaran: "border-zinc-200 bg-zinc-50 text-zinc-700",
  iku: "border-zinc-200 bg-zinc-50 text-zinc-700",
  program: "border-zinc-200 bg-zinc-50 text-zinc-700",
  kegiatan: "border-zinc-200 bg-zinc-50 text-zinc-700",
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
    <div className="overflow-hidden rounded-b-2xl rounded-t-none bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)] ring-1 ring-inset ring-zinc-200/80">
      <div className="flex flex-col gap-3 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:flex-row md:items-start md:justify-between md:px-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-3.5 w-72 rounded-full" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="relative w-full overflow-x-auto">
        <Table className="min-w-[1180px]">
          <TableHeader className="[&_tr]:border-b [&_tr]:border-zinc-200">
            <TableRow className="border-zinc-200 transition-colors hover:bg-transparent">
              <TableHead className="w-[52%] whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
                Struktur
              </TableHead>
              <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Level
              </TableHead>
              <TableHead className="w-32 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Periode
              </TableHead>
              <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Jumlah
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableRow key={index} className="border-zinc-200/80">
                <TableCell className="align-top pl-4 pr-2 py-2 md:pl-6">
                  <div className="flex min-w-0 items-center gap-3 py-0.5">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <div className="min-w-0 space-y-2">
                      <Skeleton className="h-4 w-32 rounded-full" />
                      <Skeleton className="h-3.5 w-40 rounded-full" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell className="align-top">
                  <Skeleton className="h-4 w-24 rounded-full" />
                </TableCell>
                <TableCell className="align-top">
                  <Skeleton className="h-4 w-28 rounded-full" />
                </TableCell>
                <TableCell className="align-top">
                  <Skeleton className="h-4 w-8 rounded-full" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
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
    <div className="overflow-hidden rounded-b-2xl rounded-t-none bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)] ring-1 ring-inset ring-zinc-200/80">
      <div className="relative w-full overflow-x-auto">
        <Table className="min-w-[880px]">
          <TableHeader className="[&_tr]:border-b [&_tr]:border-zinc-200">
            <TableRow className="border-zinc-200 transition-colors hover:bg-transparent">
              <TableHead className="w-[52%] whitespace-nowrap pl-4 pr-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
                Struktur
              </TableHead>
              <TableHead className="w-28 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Level
              </TableHead>
              <TableHead className="w-32 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Periode
              </TableHead>
              <TableHead className="w-24 whitespace-nowrap px-2.5 text-left align-middle text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                Jumlah
              </TableHead>
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

        return (
          <Fragment key={node.key}>
            <TableRow
              className={cn(
                "h-12 border-zinc-200/80 transition-colors hover:bg-zinc-50/70",
                depth > 0 && "bg-zinc-50/30",
              )}
            >
              <TableCell className="align-middle pl-4 pr-2 py-2 md:pl-6">
                <div className="flex h-full min-w-0 items-center">
                  <div
                    className="flex min-w-0 items-center gap-2.5"
                    style={{ paddingLeft: `${depth * 18}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isExpandable) onToggleNode(node.key);
                      }}
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 shadow-sm transition-colors",
                        isExpandable
                          ? "hover:bg-zinc-100"
                          : "cursor-default bg-zinc-50 text-zinc-300",
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
                        <span className="size-1.5 rounded-full bg-zinc-400" />
                      )}
                    </button>
                    <div className="min-w-0 space-y-0.5 py-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="min-w-0 text-[13px] font-semibold leading-5 text-zinc-900">
                          {node.title}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="align-middle text-[12px] leading-5 text-zinc-600">
                <div className="flex h-full items-center">
                  <Badge className={cn("w-fit", hierarchyBadgeClass[node.level])}>
                    {hierarchyLevelLabel[node.level]}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-[12px] leading-5 text-zinc-600">
                {node.periods[0] ?? "-"}
                {node.periods.length > 1 ? ` +${node.periods.length - 1}` : ""}
              </TableCell>
              <TableCell className="text-[12px] font-semibold leading-5 text-zinc-900">
                {node.count}
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
                  <TableRow
                    key={item.id}
                    className="h-12 border-zinc-200/80 bg-zinc-50/20 hover:bg-zinc-50/70"
                  >
                    <TableCell className="align-middle">
                      <div className="flex h-full min-w-0 items-center">
                        <div
                          className="flex min-w-0 items-center gap-2.5"
                          style={{ paddingLeft: `${(depth + 1) * 18}px` }}
                        >
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 shadow-sm">
                            <span className="size-1 rounded-full bg-zinc-400" />
                          </span>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="min-w-0 text-[13px] font-medium leading-5 text-zinc-900">
                                {item.processBusiness || item.target || "RO belum diberi judul"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle text-[12px] leading-5 text-zinc-600">
                      <div className="flex h-full items-center">
                        <Badge className="border-zinc-200 bg-zinc-50 text-zinc-700">
                          RO
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] leading-5 text-zinc-600">
                      {item.period || "-"}
                    </TableCell>
                    <TableCell className="text-[12px] font-semibold leading-5 text-zinc-900">
                      1
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

  const planningHierarchyTree = useMemo(
    () => buildPlanningHierarchyTree(filtered),
    [filtered],
  );
  const [expandedNodeKeys, setExpandedNodeKeys] = useState<Set<string>>(
    () => new Set(),
  );

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Struktur Kinerja
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola jalur tujuan, sasaran, IKU, program, kegiatan, dan RO dalam
            satu tampilan kerja yang konsisten dengan risk register.
          </p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="planning-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari tujuan, sasaran, IKU, program, kegiatan, atau RO"
                className="h-8 pl-8 text-xs bg-background/80 border border-border/50"
              />
            </div>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="h-8 w-full min-w-[180px] text-xs bg-background/80 border border-border/50 md:w-44">
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

            <Select
              value={organizationFilter}
              onValueChange={setOrganizationFilter}
            >
              <SelectTrigger className="h-8 w-full min-w-[180px] text-xs bg-background/80 border border-border/50 md:w-44">
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
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(24,24,27,0.05)] ring-1 ring-inset ring-zinc-200/80">
        <div className="flex flex-col gap-3 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:flex-row md:items-start md:justify-between md:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
                Daftar struktur kinerja
              </h2>
              <p className="mt-1 text-xs text-zinc-500 text-pretty">
                Telusuri tujuan, sasaran, IKU, program, kegiatan, dan RO dalam
                satu tabel kerja yang konsisten dengan risk register.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-zinc-600 tabular-nums ring-1 ring-inset ring-zinc-200">
              {formatCountLabel(planningHierarchyTree.length, "tujuan")}
            </span>
          </div>
        </div>

        {error ? (
          <div className="border-b border-zinc-200/80 px-4 py-4 md:px-6">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          </div>
        ) : null}

        {loading ? (
          <PlanningHierarchyLoadingState />
        ) : planningHierarchyTree.length === 0 ? (
          <div className="px-4 py-10 md:px-6">
            <div className="max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-5">
              <p className="text-sm font-semibold text-zinc-900">
                Tidak ada struktur yang cocok
              </p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Coba longgarkan filter periode atau satker, atau gunakan kata
                kunci yang lebih umum agar jalur struktur kembali terlihat.
              </p>
            </div>
          </div>
        ) : (
          <PlanningHierarchyTable
            nodes={planningHierarchyTree}
            expandedNodeKeys={expandedNodeKeys}
            onToggleNode={toggleNode}
          />
        )}
      </div>
    </div>
  );
}

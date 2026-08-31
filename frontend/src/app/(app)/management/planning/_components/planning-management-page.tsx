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
import { ChevronRight } from "@/components/ui/icons";

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
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CollectionEmptyState,
  CollectionErrorState,
  CollectionSearchField,
  CollectionTableCard,
  CollectionTableHead,
  CollectionTableHeader,
  CollectionTableHeaderRow,
  CollectionPageHeader,
} from "@/components/shared/design-system";
import { PageStack } from "@/components/shared/design-system";

type PlanningHierarchyLevel =
  | "agreement"
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
  agreement: "Perjanjian Kinerja",
  tujuan: "Tujuan",
  sasaran: "Sasaran",
  iku: "IKU",
  program: "Program",
  kegiatan: "Kegiatan",
};

const hierarchyBadgeClass: Record<PlanningHierarchyLevel, string> = {
  agreement: "border-border bg-muted text-muted-foreground",
  tujuan: "border-border bg-muted text-muted-foreground",
  sasaran: "border-border bg-muted text-muted-foreground",
  iku: "border-border bg-muted text-muted-foreground",
  program: "border-border bg-muted text-muted-foreground",
  kegiatan: "border-border bg-muted text-muted-foreground",
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
    const planningTitle =
      item.planningTitle?.trim() || "(Tanpa Perjanjian Kinerja)";
    const tujuanText = item.tujuan?.trim() || "";
    const sasaranText = item.sasaran?.trim() || "";
    const indicatorText =
      item.indikatorKinerjaUtama?.trim() || item.indicatorTitle?.trim() || "";
    const programText = item.program?.trim() || "";
    const activityText = item.kegiatan?.trim() || item.activityTitle?.trim() || "";
    const roText = item.processBusiness?.trim() || item.target?.trim() || "";

    const agreementKey = `agreement:${planningTitle}`;
    const agreementNode = findOrCreateChild(
      root,
      agreementKey,
      planningTitle,
      "agreement",
    );
    const hasHierarchyDetail =
      Boolean(tujuanText || sasaranText || indicatorText || programText || activityText || roText);
    if (!hasHierarchyDetail) {
      pushUnique(agreementNode.periods, item.period);
      pushUnique(agreementNode.organizationIds, item.organizationId);
      continue;
    }

    const tujuanKey = `${agreementKey}::tujuan:${tujuanText || "(Tanpa Tujuan)"}`;
    const tujuanNode = findOrCreateChild(
      agreementNode.children,
      tujuanKey,
      tujuanText || "(Tanpa Tujuan)",
      "tujuan",
    );
    const hasSasaranBranch = Boolean(sasaranText || indicatorText || programText || activityText || roText);
    if (!hasSasaranBranch) {
      pushUnique(agreementNode.periods, item.period);
      pushUnique(agreementNode.organizationIds, item.organizationId);
      pushUnique(tujuanNode.periods, item.period);
      pushUnique(tujuanNode.organizationIds, item.organizationId);
      continue;
    }

    const sasaranKey = `${tujuanKey}::sasaran:${sasaranText || "(Tanpa Sasaran)"}`;
    const sasaranNode = findOrCreateChild(
      tujuanNode.children,
      sasaranKey,
      sasaranText || "(Tanpa Sasaran)",
      "sasaran",
    );
    const hasIkuBranch = Boolean(indicatorText || programText || activityText || roText);
    if (!hasIkuBranch) {
      [agreementNode, tujuanNode, sasaranNode].forEach((node) => {
        pushUnique(node.periods, item.period);
        pushUnique(node.organizationIds, item.organizationId);
      });
      continue;
    }

    const indicatorKey = `${sasaranKey}::iku:${indicatorText || "(Tanpa IKU)"}`;
    const indicatorNode = findOrCreateChild(
      sasaranNode.children,
      indicatorKey,
      indicatorText || "(Tanpa IKU)",
      "iku",
    );
    const hasProgramBranch = Boolean(programText || activityText || roText);
    if (!hasProgramBranch) {
      [agreementNode, tujuanNode, sasaranNode, indicatorNode].forEach((node) => {
        pushUnique(node.periods, item.period);
        pushUnique(node.organizationIds, item.organizationId);
      });
      continue;
    }

    const programNode = findOrCreateChild(
      indicatorNode.children,
      `${indicatorKey}::program:${programText || "(Tanpa Program)"}`,
      programText || "(Tanpa Program)",
      "program",
    );
    const hasActivityBranch = Boolean(activityText || roText);
    if (!hasActivityBranch) {
      [agreementNode, tujuanNode, sasaranNode, indicatorNode, programNode].forEach((node) => {
        pushUnique(node.periods, item.period);
        pushUnique(node.organizationIds, item.organizationId);
      });
      continue;
    }

    const kegiatanNode = findOrCreateChild(
      programNode.children,
      `${indicatorKey}::program:${programText || "(Tanpa Program)"}::kegiatan:${activityText || "(Tanpa Kegiatan)"}`,
      activityText || "(Tanpa Kegiatan)",
      "kegiatan",
    );

    [
      agreementNode,
      tujuanNode,
      sasaranNode,
      indicatorNode,
      programNode,
      kegiatanNode,
    ].forEach((node) => {
      pushUnique(node.periods, item.period);
      pushUnique(node.organizationIds, item.organizationId);
    });
    if (roText) {
      kegiatanNode.items.push(item);
    }
  }

  const assignCounts = (node: PlanningHierarchyNode): number => {
    const childCount = node.children.reduce(
      (sum, child) => sum + assignCounts(child),
      0,
    );
    node.count = node.items.length + childCount || 1;
    return node.count;
  };

  root.forEach((node) => assignCounts(node));
  return root;
}

function PlanningHierarchyLoadingState() {
  return (
    <Table className="min-w-[880px]">
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead className="w-[52%] pl-4 pr-2.5 md:pl-6">
                Struktur
              </CollectionTableHead>
              <CollectionTableHead className="w-28 px-2.5">
                Level
              </CollectionTableHead>
              <CollectionTableHead className="w-32 px-2.5">
                Periode
              </CollectionTableHead>
              <CollectionTableHead className="w-24 px-2.5">
                Jumlah
              </CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableRow key={index} className="border-border/80">
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
    <Table className="min-w-[880px]">
          <CollectionTableHeader>
            <CollectionTableHeaderRow>
              <CollectionTableHead className="w-[52%] pl-4 pr-2.5 md:pl-6">
                Struktur
              </CollectionTableHead>
              <CollectionTableHead className="w-28 px-2.5">
                Level
              </CollectionTableHead>
              <CollectionTableHead className="w-32 px-2.5">
                Periode
              </CollectionTableHead>
              <CollectionTableHead className="w-24 px-2.5">
                Jumlah
              </CollectionTableHead>
            </CollectionTableHeaderRow>
          </CollectionTableHeader>
          <TableBody>
            <PlanningHierarchyRows
              nodes={nodes}
              expandedNodeKeys={expandedNodeKeys}
              onToggleNode={onToggleNode}
              depth={depth}
            />
          </TableBody>
    </Table>
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
                "h-12 border-border/80 transition-colors hover:bg-muted/70",
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
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors",
                        isExpandable
                          ? "hover:bg-sidebar-accent"
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
                    className="h-12 border-border/80 bg-muted/20 hover:bg-muted/70"
                  >
                    <TableCell className="align-middle">
                      <div className="flex h-full min-w-0 items-center">
                        <div
                          className="flex min-w-0 items-center gap-2.5"
                          style={{ paddingLeft: `${(depth + 2) * 18}px` }}
                        >
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm">
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
                        <Badge className="bg-muted text-muted-foreground">
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

export function PlanningManagementPage() {
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
      <Card>
        <CardContent className="py-10 text-sm text-muted-foreground">
          Silakan masuk untuk mengelola Struktur Kinerja.
        </CardContent>
      </Card>
    );
  }

  return (
    <PageStack>
      <CollectionPageHeader
        title="Struktur Kinerja"
      />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
        <CollectionSearchField
          id="planning-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cari perjanjian kinerja, tujuan, sasaran, IKU, program, kegiatan, atau RO"
        />

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-full min-w-[180px] md:w-44">
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

        <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
          <SelectTrigger className="w-full min-w-[180px] md:w-44">
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

      {error ? <CollectionErrorState message={error} /> : null}

      <CollectionTableCard>
        {loading ? (
          <PlanningHierarchyLoadingState />
        ) : planningHierarchyTree.length === 0 ? (
          <CollectionEmptyState
            title="Tidak ada struktur yang cocok"
            description="Coba longgarkan filter periode atau satker, atau gunakan kata kunci yang lebih umum."
          />
        ) : (
          <PlanningHierarchyTable
            nodes={planningHierarchyTree}
            expandedNodeKeys={expandedNodeKeys}
            onToggleNode={toggleNode}
          />
        )}
      </CollectionTableCard>
    </PageStack>
  );
}

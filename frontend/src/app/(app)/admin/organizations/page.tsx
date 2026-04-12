"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useTransition,
  useDeferredValue,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Building2,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  type Organization,
  type OrganizationTreeNode,
  buildOrganizationTree,
} from "@/lib/organization";
import { flattenVisibleOrganizationTree } from "@/lib/organization-tree";
import { OrganizationFormDialog } from "@/components/organization/organization-form-dialog";
import { OrganizationDeleteDialog } from "@/components/organization/organization-delete-dialog";
import { OrganizationRowActions } from "@/components/organization/organization-row-actions";
import { listOrganizations } from "@/lib/api/organizations";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function getOrganizationKey(org: OrganizationTreeNode) {
  return org.id || `${org.name}-${org.parentId ?? "root"}-${org.createdAt}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return "";
}

function normalizeOrganization(value: unknown): Organization | null {
  if (!isRecord(value)) return null;

  const id = readStringField(value, ["id", "ID"]);
  const name = readStringField(value, ["name", "Name"]);
  const parentId = readStringField(value, ["parentId", "parent_id", "ParentID"]);
  const createdAt = readStringField(value, ["createdAt", "created_at", "CreatedAt"]);

  if (!id || !name) return null;

  return {
    id,
    name,
    ...(parentId ? { parentId } : {}),
    createdAt,
  };
}

function OrgRow({
  org,
  level = 0,
  isExpanded = false,
  parentNameMap,
  onEdit,
  onDelete,
  onToggleExpand,
}: {
  org: OrganizationTreeNode;
  level?: number;
  isExpanded?: boolean;
  parentNameMap: Map<string, string>;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onToggleExpand: (orgId: string) => void;
}) {
  const hasChildren = org.children && org.children.length > 0;
  const createdAt = new Date(org.createdAt);
  const createdAtLabel = Number.isNaN(createdAt.getTime())
    ? "—"
    : createdAt.toLocaleDateString("id-ID");
  const handleToggleExpand = useCallback(() => {
    onToggleExpand(org.id);
  }, [onToggleExpand, org.id]);

  return (
    <TableRow className="border-border/30 hover:bg-muted/30 transition-colors">
      <TableCell className="max-w-[300px]">
        <div
          className="flex items-center gap-2"
          style={{ paddingLeft: `${level * 24}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={handleToggleExpand}
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${org.name}`}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  isExpanded && "rotate-90"
                )}
              />
            </button>
          ) : (
            <span className="inline-flex size-4 shrink-0" />
          )}
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium">{org.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {org.parentId
          ? parentNameMap.get(org.parentId) || "—"
          : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {createdAtLabel}
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] h-5 px-1.5",
            hasChildren
              ? "text-primary border-primary/20"
              : "text-muted-foreground"
          )}
        >
          {hasChildren ? `${org.children!.length} sub-unit` : "Unit"}
        </Badge>
      </TableCell>
      <TableCell>
        <OrganizationRowActions
          organization={org}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}

export default function OrganizationsManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [collapsedOrgIds, setCollapsedOrgIds] = useState<Set<string>>(new Set());
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedOrg, setSelectedOrg] = useState<Organization | undefined>();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), 10),
  );

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const nextSearch = searchParams.get("q") ?? "";
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);

    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setPage((current) => (current === nextPage ? current : nextPage));
    setLimit((current) => (current === nextLimit ? current : nextLimit));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const normalizedSearch = search.trim();

    if (normalizedSearch) {
      nextParams.set("q", normalizedSearch);
    } else {
      nextParams.delete("q");
    }

    if (page === 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", page.toString());
    }

    if (limit === 10) {
      nextParams.delete("limit");
    } else {
      nextParams.set("limit", limit.toString());
    }

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    const currentUrl = searchParams.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    if (nextUrl === currentUrl) {
      return;
    }

    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
    });
  }, [search, page, limit, pathname, router, searchParams, startTransition]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    setLoading(true);

    listOrganizations(token, {
      q: deferredSearch.trim() || undefined,
      page,
      limit,
    })
      .then((result) => {
        if (cancelled) return;

        const normalized = (result.data ?? [])
          .map((item) => normalizeOrganization(item))
          .filter((org): org is Organization => org !== null);

        setOrganizations(normalized);
        setTotal(result.total ?? 0);
        setPage(result.page ?? page);
        setLimit(result.limit ?? limit);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch organizations", error);
        toast.error("Gagal memuat data organisasi");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, deferredSearch, page, limit]);

  const handleRefetch = useCallback(() => {
    if (!token) return;

    setLoading(true);
    listOrganizations(token, {
      q: deferredSearch.trim() || undefined,
      page,
      limit,
    })
      .then((result) => {
        const normalized = (result.data ?? [])
          .map((item) => normalizeOrganization(item))
          .filter((org): org is Organization => org !== null);

        setOrganizations(normalized);
        setTotal(result.total ?? 0);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch organizations", error);
        toast.error("Gagal memuat data organisasi");
        setLoading(false);
      });
  }, [token, deferredSearch, page, limit]);

  const handleCreateClick = () => {
    setDialogMode("create");
    setSelectedOrg(undefined);
    setIsFormDialogOpen(true);
  };

  const handleEditClick = (org: Organization) => {
    setDialogMode("edit");
    setSelectedOrg(org);
    setIsFormDialogOpen(true);
  };

  const handleDeleteClick = (org: Organization) => {
    setSelectedOrg(org);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleExpand = useCallback((orgId: string) => {
    setCollapsedOrgIds((current) => {
      const next = new Set(current);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  }, []);

  // Memoized Map for O(1) parent name lookups
  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organizations) {
      map.set(org.id, org.name);
    }
    return map;
  }, [organizations]);

  const orgTree = buildOrganizationTree(organizations);
  const visibleOrgRows = useMemo(
    () => flattenVisibleOrganizationTree(orgTree, collapsedOrgIds),
    [orgTree, collapsedOrgIds]
  );

  const totalPages = Math.ceil(total / limit) || 1;
  const rootUnits = organizations.filter((o) => !o.parentId).length;
  const subUnits = organizations.length - rootUnits;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Organization Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola struktur organisasi dan unit kerja
          </p>
        </div>
        <Button
          className="gap-2 shadow-lg shadow-primary/20"
          onClick={handleCreateClick}
          aria-label="Tambah Organisasi"
        >
          <Plus className="size-4" />
          Tambah Organisasi
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Unit</p>
              <p className="text-2xl font-bold mt-1">{total}</p>
            </div>
            <Building2 className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unit Induk</p>
            <p className="text-2xl font-bold mt-1">{rootUnits}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sub Unit</p>
            <p className="text-2xl font-bold mt-1">{subUnits}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari organisasi..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="h-8 pl-8 text-xs bg-card border-border/50"
        />
      </div>

      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs">Nama Organisasi</TableHead>
              <TableHead className="text-xs w-40">Parent Unit</TableHead>
              <TableHead className="text-xs w-32">Dibuat</TableHead>
              <TableHead className="text-xs w-24">Tipe</TableHead>
              <TableHead className="text-xs w-10">
                <span className="sr-only">Aksi</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground text-xs"
                >
                  Belum ada data organisasi.
                </TableCell>
              </TableRow>
            ) : (
              visibleOrgRows.map((org) => (
                <OrgRow
                  key={getOrganizationKey(org)}
                  org={org}
                  level={org.level}
                  isExpanded={org.isExpanded}
                  parentNameMap={parentNameMap}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onToggleExpand={handleToggleExpand}
                />
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
            {Math.min(page * limit, total)} dari {total} organisasi
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={page === 1 || isPending}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="text-xs font-medium bg-primary/10 text-primary"
              disabled
            >
              {page}
            </Button>
            <span className="px-1 text-xs text-muted-foreground">
              dari {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              disabled={page === totalPages || total === 0 || isPending}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <OrganizationFormDialog
          mode={dialogMode}
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          token={token ?? undefined}
          organizations={organizations}
          initialOrganization={selectedOrg}
          onSuccess={handleRefetch}
        />

      <OrganizationDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        organization={selectedOrg}
        token={token ?? undefined}
        onSuccess={handleRefetch}
      />
    </div>
  );
}

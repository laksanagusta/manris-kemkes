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

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CollectionPageHeader,
  CollectionPagination,
  CollectionToolbar,
  CollectionEmptyState,
  CollectionSearchField,
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Building2,
  Loader2,
} from "@/components/shared/icons";
import { useAuth } from "@/contexts/auth-context";
import {
  type Organization,
} from "@/lib/organization";
import { OrganizationFormDialog } from "@/components/organization/organization-form-dialog";
import { OrganizationDeleteDialog } from "@/components/organization/organization-delete-dialog";
import { OrganizationRowActions } from "@/components/organization/organization-row-actions";
import { listAllOrganizations, listOrganizations } from "@/lib/api/organizations";

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

const uprLevelLabel: Record<string, string> = {
  kementerian: "Kementerian",
  upr_t1: "UPR T1",
  upr_t2: "UPR T2",
};

function getOrganizationKey(org: Organization) {
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
  const uprLevel = readStringField(value, ["uprLevel", "upr_level", "UPRLevel"]);
  const createdAt = readStringField(value, ["createdAt", "created_at", "CreatedAt"]);

  if (!id || !name) return null;

  return {
    id,
    name,
    ...(parentId ? { parentId } : {}),
    ...(uprLevel ? { uprLevel } : {}),
    createdAt,
  };
}

function OrgRow({
  org,
  parentNameMap,
  onEdit,
  onDelete,
}: {
  org: Organization;
  parentNameMap: Map<string, string>;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}) {
  const createdAt = new Date(org.createdAt);
  const createdAtLabel = Number.isNaN(createdAt.getTime())
    ? "—"
    : createdAt.toLocaleDateString("id-ID");

  return (
    <TableRow className="hover:bg-muted/30 transition-colors">
      <TableCell className="max-w-[220px]">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-xs font-medium text-foreground">
            {org.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="">
        {org.parentId
          ? parentNameMap.get(org.parentId) || "—"
          : "—"}
      </TableCell>
      <TableCell className="">
        {uprLevelLabel[org.uprLevel || ""] || org.uprLevel || "—"}
      </TableCell>
      <TableCell className="">
        {createdAtLabel}
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
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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

    Promise.all([
      listOrganizations(token, {
        q: deferredSearch.trim() || undefined,
        page,
        limit,
      }),
      listAllOrganizations(token, {
        q: deferredSearch.trim() || undefined,
      }),
    ])
      .then(([result, allResult]) => {
        if (cancelled) return;

        const normalized = (result.data ?? [])
          .map((item) => normalizeOrganization(item))
          .filter((org): org is Organization => org !== null)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        setOrganizations(normalized);
        setAllOrganizations(
          (allResult ?? [])
            .map((item) => normalizeOrganization(item))
            .filter((org): org is Organization => org !== null),
        );
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
    Promise.all([
      listOrganizations(token, {
        q: deferredSearch.trim() || undefined,
        page,
        limit,
      }),
      listAllOrganizations(token, {
        q: deferredSearch.trim() || undefined,
      }),
    ])
      .then(([result, allResult]) => {
        const normalized = (result.data ?? [])
          .map((item) => normalizeOrganization(item))
          .filter((org): org is Organization => org !== null)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        setOrganizations(normalized);
        setAllOrganizations(
          (allResult ?? [])
            .map((item) => normalizeOrganization(item))
            .filter((org): org is Organization => org !== null)
            .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
        );
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

  // Memoized Map for O(1) parent name lookups
  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of allOrganizations) {
      map.set(org.id, org.name);
    }
    return map;
  }, [allOrganizations]);

  const rootUnits = organizations.filter((o) => !o.parentId).length;
  const subUnits = organizations.length - rootUnits;

  return (
    <PageStack>
      <div className="space-y-6">
        <CollectionPageHeader title="Organization Management" />

        <MetricGrid className="md:grid-cols-3 xl:grid-cols-3">
          <KpiCard
            label="Total Unit"
            value={total}
            tone="white"
            icon={<Building2 className="size-5 text-muted-foreground" />}
          />
          <KpiCard label="Unit Induk" value={rootUnits} tone="white" />
          <KpiCard label="Sub Unit" value={subUnits} tone="white" />
        </MetricGrid>

        <div className="space-y-4">
        <CollectionToolbar
          className="w-full"
          leading={
            <CollectionSearchField
              containerClassName="w-full sm:w-80 sm:flex-none"
              placeholder="Cari organisasi..."
              aria-label="Cari organisasi"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          }
          actions={
            <Button
              size="default"
              className="w-full sm:w-auto"
              onClick={handleCreateClick}
              aria-label="Tambah Organisasi"
            >
              <Plus className="size-4" />
              Tambah Organisasi
            </Button>
          }
        />

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[220px] whitespace-nowrap">Nama Organisasi</TableHead>
                <TableHead className="w-40 whitespace-nowrap">Parent Unit</TableHead>
                <TableHead className="w-28 whitespace-nowrap">UPR Level</TableHead>
                <TableHead className="w-32 whitespace-nowrap">Dibuat</TableHead>
                <TableHead className="w-10 whitespace-nowrap">
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
                  <TableCell colSpan={5} className="h-24">
                    <CollectionEmptyState
                      title="Belum ada data organisasi"
                      description="Tambahkan organisasi baru untuk memulai."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <OrgRow
                    key={getOrganizationKey(org)}
                    org={org}
                    parentNameMap={parentNameMap}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                ))
              )}
            </TableBody>
          </Table>

          <CollectionPagination
            itemLabel="organisasi"
            page={page}
            pageSize={limit}
            total={total}
            disabled={isPending}
            onPageChange={setPage}
            onPageSizeChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        </Card>
        </div>

        <OrganizationFormDialog
          mode={dialogMode}
          open={isFormDialogOpen}
          onOpenChange={setIsFormDialogOpen}
          token={token ?? undefined}
          organizations={allOrganizations}
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
    </PageStack>
  );
}

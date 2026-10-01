"use client";

import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useState,
  useTransition,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  MinusCircle,
  Plus,
  Search,
  MoreHorizontal,
  ShieldCheck,
  ShieldX,
  Users,
} from "@/components/shared/icons";
import { toast } from "sonner";

import { AdminOnlyState } from "@/components/admin/admin-only-state";
import {
  CollectionPageHeader,
  CollectionPagination,
  CollectionToolbar,
  CollectionEmptyState,
  KpiCard,
  MetricGrid,
  PageStack,
} from "@/components/shared/design-system";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import {
  approveUserRegistration,
  listUsers,
  rejectUserRegistration,
  type UserListItem,
} from "@/lib/api/users";
import { cn } from "@/lib/utils";
import { getStatusBadgeClassName, toBadgeVariant, type StatusTone } from "@/lib/badge-variant";

const roleMeta: Record<string, { label: string; variant: BadgeVariant }> = {
  superadmin: {
    label: "Super Admin",
    variant: "default",
  },
  unit: {
    label: "Unit Kerja",
    variant: "secondary",
  },
  reviewer: {
    label: "Reviewer",
    variant: "outline",
  },
  pimpinan: {
    label: "Pimpinan",
    variant: "ghost",
  },
};

const statusMeta: Record<
  string,
  { label: string; tone: StatusTone; dotClassName: string }
> = {
  pending_activation: {
    label: "Menunggu aktivasi",
    tone: "warning",
    dotClassName: "bg-warning",
  },
  active: {
    label: "Aktif",
    tone: "success",
    dotClassName: "bg-success",
  },
  inactive: {
    label: "Nonaktif",
    tone: "neutral",
    dotClassName: "bg-muted-foreground",
  },
};

const getInitials = (name: string) =>
  name
    .replace(/(Dr\.|Ir\.|Prof\.|M\.Kes)/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

function formatLastLoggedIn(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

type StatusFilterValue = "all" | "pending_activation" | "active" | "inactive";
type RoleFilterValue = "all" | "superadmin" | "unit" | "reviewer" | "pimpinan";

function getStatusFilter(value: string | null): StatusFilterValue {
  if (
    value === "pending_activation" ||
    value === "active" ||
    value === "inactive"
  ) {
    return value;
  }
  return "all";
}

function getRoleFilter(value: string | null): RoleFilterValue {
  if (
    value === "superadmin" ||
    value === "unit" ||
    value === "reviewer" ||
    value === "pimpinan"
  ) {
    return value;
  }
  return "all";
}

export default function UsersManagementPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, loading: authLoading } = useAuth();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageState, setPageState] = useState<"loading" | "ready" | "forbidden">(
    "loading",
  );
  const isSuperadmin = user?.role === "superadmin";

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(() =>
    getStatusFilter(searchParams.get("status")),
  );
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>(() =>
    getRoleFilter(searchParams.get("role")),
  );
  const [page, setPage] = useState(() =>
    parsePositiveInt(searchParams.get("page"), 1),
  );
  const [limit, setLimit] = useState(() =>
    parsePositiveInt(searchParams.get("limit"), 10),
  );
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    type: "approve" | "reject";
  } | null>(null);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const nextSearch = searchParams.get("q") ?? "";
    const nextStatus = getStatusFilter(searchParams.get("status"));
    const nextRole = getRoleFilter(searchParams.get("role"));
    const nextPage = parsePositiveInt(searchParams.get("page"), 1);
    const nextLimit = parsePositiveInt(searchParams.get("limit"), 10);

    setSearch((current) => (current === nextSearch ? current : nextSearch));
    setStatusFilter((current) => (current === nextStatus ? current : nextStatus));
    setRoleFilter((current) => (current === nextRole ? current : nextRole));
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

    if (statusFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", statusFilter);
    }

    if (roleFilter === "all") {
      nextParams.delete("role");
    } else {
      nextParams.set("role", roleFilter);
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
  }, [
    search,
    statusFilter,
    roleFilter,
    page,
    limit,
    pathname,
    router,
    searchParams,
    startTransition,
  ]);

  useEffect(() => {
    if (authLoading || !token || !isSuperadmin) return;

    let cancelled = false;

    listUsers(token, {
      q: deferredSearch.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      role: roleFilter === "all" ? undefined : roleFilter,
      page,
      limit,
    })
      .then((result) => {
        if (!cancelled) {
          setUsers(result.data ?? []);
          setTotal(result.total ?? 0);
          setPage(result.page ?? page);
          setLimit(result.limit ?? limit);
          setPageState("ready");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 403) {
          setPageState("forbidden");
          return;
        }
        console.error(error);
        setPageState("ready");
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isSuperadmin, token, deferredSearch, statusFilter, roleFilter, page, limit]);

  if (authLoading || (isSuperadmin && pageState === "loading")) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center gap-3">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Memuat data pengguna...
        </span>
      </div>
    );
  }

  if (!isSuperadmin || pageState === "forbidden") {
    return <AdminOnlyState />;
  }

  const handleRegistrationAction = async (
    managedUser: UserListItem,
    action: "approve" | "reject",
  ) => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    setPendingAction({ id: managedUser.id, type: action });

    try {
      if (action === "approve") {
        await approveUserRegistration(token, managedUser.id);
        setUsers((current) =>
          current.map((userRow) =>
            userRow.id === managedUser.id
              ? { ...userRow, status: "active" }
              : userRow,
          ),
        );
        toast.success(`Registrasi ${managedUser.name} disetujui.`);
        return;
      }

      await rejectUserRegistration(token, managedUser.id);
      setUsers((current) => current.filter((userRow) => userRow.id !== managedUser.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success(`Registrasi ${managedUser.name} ditolak.`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Aksi registrasi belum berhasil diproses.",
      );
    } finally {
      setPendingAction(null);
    }
  };

  const stats = [
    {
      label: "Total akun",
      value: total,
      icon: Users,
      iconClassName: "text-muted-foreground",
    },
    {
      label: statusMeta.pending_activation.label,
      value: users.filter((managedUser) => managedUser.status === "pending_activation")
        .length,
      icon: Clock3,
      iconClassName: "text-warning",
    },
    {
      label: statusMeta.active.label,
      value: users.filter((managedUser) => managedUser.status === "active").length,
      icon: CheckCircle2,
      iconClassName: "text-success",
    },
    {
      label: statusMeta.inactive.label,
      value: users.filter((managedUser) => managedUser.status === "inactive").length,
      icon: MinusCircle,
      iconClassName: "text-muted-foreground",
    },
  ];

  return (
    <PageStack className="flex flex-col">
      <CollectionPageHeader title="Administrasi pengguna" />

      <MetricGrid>
        {stats.map((stat) => (
          <KpiCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            tone="white"
            icon={<stat.icon className={cn("size-5", stat.iconClassName)} />}
          />
        ))}
      </MetricGrid>

      <div className="space-y-4">
      <CollectionToolbar
        className="w-full"
        leading={
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 w-full sm:w-80 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari pengguna, NIP, atau email"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className=""
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(getStatusFilter(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending_activation">Menunggu Aktivasi</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(getRoleFilter(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="unit">Unit Kerja</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="pimpinan">Pimpinan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          <Button asChild size="default" className="w-full sm:w-auto">
            <Link href="/admin/users/new">
              <Plus data-icon="inline-start" />
              Tambah pengguna
            </Link>
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-24 whitespace-nowrap">User</TableHead>
                <TableHead className="w-32 whitespace-nowrap">Phone</TableHead>
                <TableHead className="w-32 whitespace-nowrap">NIP</TableHead>
                <TableHead className="w-28 whitespace-nowrap">Role</TableHead>
                <TableHead className="w-36 whitespace-nowrap">Jabatan</TableHead>
                <TableHead className="w-28 whitespace-nowrap">Pangkat</TableHead>
                <TableHead className="w-40 whitespace-nowrap">Organisasi</TableHead>
                <TableHead className="w-44 whitespace-nowrap">Terakhir login</TableHead>
                <TableHead className="w-40 whitespace-nowrap">Status</TableHead>
                <TableHead className="w-16 whitespace-nowrap">
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24">
                    <CollectionEmptyState
                      title="Belum ada data pengguna"
                      description="Tambahkan pengguna baru untuk memulai."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                users.map((managedUser) => {
                  const role = roleMeta[managedUser.role];
                  const status =
                    statusMeta[managedUser.status] ?? statusMeta.inactive;

                  return (
                    <TableRow
                      key={managedUser.id}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="max-w-[250px] px-24">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                            {getInitials(managedUser.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-foreground">
                              {managedUser.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {managedUser.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                       <TableCell className="">
                         {managedUser.phoneNumber || "\u2014"}
                       </TableCell>
                       <TableCell className="">
                         {managedUser.nip || "\u2014"}
                       </TableCell>
                      <TableCell>
                        <Badge
                          variant={role?.variant ?? "secondary"}
                        >
                          {role?.label ?? managedUser.role}
                        </Badge>
                      </TableCell>
                       <TableCell className="">
                         {managedUser.jabatan || "\u2014"}
                       </TableCell>
                       <TableCell className="">
                         {managedUser.pangkat || "\u2014"}
                       </TableCell>
                       <TableCell className="max-w-[200px]">
                         <span className="block truncate">
                           {managedUser.role === "superadmin"
                             ? "Semua organisasi"
                             : managedUser.orgName || "Belum ditetapkan"}
                         </span>
                       </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatLastLoggedIn(managedUser.lastLoggedIn)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={toBadgeVariant(status.tone)} className={getStatusBadgeClassName(status.tone)}>
                          <span
                            className={cn(
                              "mr-1 size-1.5 rounded-full",
                              status.dotClassName,
                            )}
                          />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className=""
                              aria-label={`Aksi untuk ${managedUser.name}`}
                            >
                              <MoreHorizontal className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {managedUser.status === "pending_activation" ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleRegistrationAction(managedUser, "approve")
                                  }
                                >
                                  {pendingAction?.id === managedUser.id &&
                                  pendingAction?.type === "approve" ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="size-3.5" />
                                  )}
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    handleRegistrationAction(managedUser, "reject")
                                  }
                                >
                                  {pendingAction?.id === managedUser.id &&
                                  pendingAction?.type === "reject" ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : (
                                    <ShieldX className="size-3.5" />
                                  )}
                                  Reject
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem disabled>
                                Tidak ada aksi
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <CollectionPagination
            itemLabel="pengguna"
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
      </CardContent>
      </Card>
      </div>
    </PageStack>
  );
}

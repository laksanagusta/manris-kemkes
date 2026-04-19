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
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MoreHorizontal,
  MinusCircle,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { AdminOnlyState } from "@/components/admin/admin-only-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { listUsers, type UserListItem } from "@/lib/api/users";
import { cn } from "@/lib/utils";

const roleMeta: Record<string, { label: string; badgeClassName: string }> = {
  superadmin: {
    label: "Super Admin",
    badgeClassName: "border-primary/20 bg-primary/15 text-primary",
  },
  unit: {
    label: "Unit Kerja",
    badgeClassName: "border-chart-2/20 bg-chart-2/15 text-chart-2",
  },
  reviewer: {
    label: "Reviewer",
    badgeClassName: "border-risk-medium/20 bg-risk-medium/15 text-risk-medium",
  },
  pimpinan: {
    label: "Pimpinan",
    badgeClassName: "border-chart-4/20 bg-chart-4/15 text-chart-4",
  },
};

const statusMeta: Record<
  string,
  { label: string; badgeClassName: string; dotClassName: string }
> = {
  pending_activation: {
    label: "Menunggu aktivasi",
    badgeClassName: "border-warning/25 bg-warning/10 text-warning",
    dotClassName: "bg-warning",
  },
  active: {
    label: "Aktif",
    badgeClassName: "border-success/25 bg-success/10 text-success",
    dotClassName: "bg-success",
  },
  inactive: {
    label: "Nonaktif",
    badgeClassName: "border-border bg-muted text-muted-foreground",
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
          setUsers(
            [...(result.data ?? [])].sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
          );
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

  const totalPages = Math.ceil(total / limit) || 1;

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
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Administrasi pengguna
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun, sampaikan password sementara secara manual, dan
            pantau aktivasi awal pengguna.
          </p>
        </div>
        <Button asChild className="shadow-lg shadow-primary/20">
          <Link href="/admin/users/new">
            <Plus data-icon="inline-start" />
            Tambah pengguna
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/80">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
              </div>
              <stat.icon className={cn("size-5", stat.iconClassName)} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari pengguna, username, atau email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-8 border-border/50 bg-card pl-8 text-xs"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(getStatusFilter(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-40 text-xs bg-card border-border/50">
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
          <SelectTrigger className="h-8 w-36 text-xs bg-card border-border/50">
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

      <Card className="overflow-hidden border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Daftar pengguna</CardTitle>
          <CardDescription>
            Status <span className="font-medium text-foreground">Menunggu
            aktivasi</span> berarti akun sudah dibuat, tetapi pengguna masih
            harus mengganti password sementara saat login pertama.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-xs whitespace-nowrap">User</TableHead>
                <TableHead className="w-32 text-xs whitespace-nowrap">Username</TableHead>
                <TableHead className="w-32 text-xs whitespace-nowrap">NIP</TableHead>
                <TableHead className="w-28 text-xs whitespace-nowrap">Role</TableHead>
                <TableHead className="w-36 text-xs whitespace-nowrap">Jabatan</TableHead>
                <TableHead className="w-28 text-xs whitespace-nowrap">Pangkat</TableHead>
                <TableHead className="w-40 text-xs whitespace-nowrap">Organisasi</TableHead>
                <TableHead className="w-40 text-xs whitespace-nowrap">Status</TableHead>
                <TableHead className="w-10 text-xs whitespace-nowrap"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-xs text-muted-foreground"
                  >
                    Belum ada data pengguna.
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
                      className="border-border/30 transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="max-w-[250px]">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {getInitials(managedUser.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">
                              {managedUser.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {managedUser.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                       <TableCell className="text-sm font-mono text-muted-foreground">
                         {managedUser.username}
                       </TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                         {managedUser.nip || "\u2014"}
                       </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 border px-1.5 text-[10px] font-semibold",
                            role?.badgeClassName ??
                              "border-border bg-muted text-muted-foreground",
                          )}
                        >
                          {role?.label ?? managedUser.role}
                        </Badge>
                      </TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                         {managedUser.jabatan || "\u2014"}
                       </TableCell>
                       <TableCell className="text-sm text-muted-foreground">
                         {managedUser.pangkat || "\u2014"}
                       </TableCell>
                       <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                         <span className="block truncate">
                           {managedUser.role === "superadmin"
                             ? "Semua organisasi"
                             : managedUser.orgName || "Belum ditetapkan"}
                         </span>
                       </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 border px-1.5 text-[10px]",
                            status.badgeClassName,
                          )}
                        >
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
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          aria-label={`Opsi untuk ${managedUser.name}`}
                        >
                          <MoreHorizontal className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Menampilkan {total === 0 ? 0 : (page - 1) * limit + 1} -{" "}
              {Math.min(page * limit, total)} dari {total} pengguna
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
        </CardContent>
      </Card>
    </div>
  );
}

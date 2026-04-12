"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

type ManagedUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  status: string;
  nip?: string | null;
  jabatan?: string | null;
  pangkat?: string | null;
  orgName?: string | null;
};

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

export default function UsersManagementPage() {
  const { token, user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [pageState, setPageState] = useState<"loading" | "ready" | "forbidden">(
    "loading",
  );
  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (authLoading || !token || !isSuperadmin) return;

    let cancelled = false;

    api
      .get<ManagedUser[]>("/users", token)
      .then((result) => {
        if (!cancelled) {
          setUsers(result);
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
  }, [authLoading, isSuperadmin, token]);

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

  const stats = [
    {
      label: "Total akun",
      value: users.length,
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

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari pengguna, username, atau email"
          className="h-8 border-border/50 bg-card pl-8 text-xs"
        />
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
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="w-32 text-xs">Username</TableHead>
                <TableHead className="w-32 text-xs">NIP</TableHead>
                <TableHead className="w-28 text-xs">Role</TableHead>
                <TableHead className="w-36 text-xs">Jabatan</TableHead>
                <TableHead className="w-28 text-xs">Pangkat</TableHead>
                <TableHead className="w-40 text-xs">Organisasi</TableHead>
                <TableHead className="w-40 text-xs">Status</TableHead>
                <TableHead className="w-10 text-xs"></TableHead>
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
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {managedUser.username}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {managedUser.nip || "—"}
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
                      <TableCell className="text-xs text-muted-foreground">
                        {managedUser.jabatan || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {managedUser.pangkat || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Plus, Search, MoreHorizontal, Users, Shield, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

const roleVariant: Record<string, string> = {
  superadmin: "bg-primary/15 text-primary border-primary/20",
  unit: "bg-chart-2/15 text-chart-2 border-chart-2/20",
  reviewer: "bg-risk-medium/15 text-risk-medium border-risk-medium/20",
  pimpinan: "bg-chart-4/15 text-chart-4 border-chart-4/20",
};

const getInitials = (name: string) => {
  return name
    .replace(/(Dr\.|Ir\.|Prof\.|M\.Kes)/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(n => n[0])
    .join("")
    .toUpperCase() || "?";
};
export default function UsersManagementPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get<any[]>("/users", token)
        .then(res => {
          setUsers(res);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola pengguna sistem dan assignment role
          </p>
        </div>
        <Link href="/admin/users/new">
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="size-4" />
            Tambah User
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total User</p>
              <p className="text-2xl font-bold mt-1">{users.length}</p>
            </div>
            <Users className="size-5 text-muted-foreground" />
          </CardContent>
        </Card>
        {Object.entries(roleVariant).map(([role, cls]) => {
          const count = users.filter((u: any) => u.role === role).length;
          return (
            <Card key={role} className="border-border/50 bg-card/80">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{role}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cari user..." className="h-8 pl-8 text-xs bg-card border-border/50" />
      </div>

      {/* Table */}
      <Card className="border-border/50 bg-card/80 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs w-32">Username</TableHead>
              <TableHead className="text-xs w-28">Role</TableHead>
              <TableHead className="text-xs w-40">Organisasi</TableHead>
              <TableHead className="text-xs w-20">Status</TableHead>
              <TableHead className="text-xs w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="size-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                  Belum ada data user.
                </TableCell>
              </TableRow>
            ) : users.map((user: any) => (
              <TableRow
                key={user.id}
                className="border-border/30 hover:bg-muted/30 transition-colors"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {getInitials(user.name)}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{user.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-mono text-muted-foreground">
                  {user.username}
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border h-5 px-1.5",
                      roleVariant[user.role] || "bg-muted text-muted-foreground"
                    )}
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {user.orgName || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-5 px-1.5",
                      user.status === "active"
                        ? "text-success border-success/20"
                        : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full mr-1",
                        user.status === "active"
                          ? "bg-success"
                          : "bg-muted-foreground"
                      )}
                    />
                    {user.status === "active" ? "Aktif" : "Tidak Aktif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-xs" className="text-muted-foreground">
                    <MoreHorizontal className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

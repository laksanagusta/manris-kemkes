"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Plus, Search, Building2, Loader2, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  Organization,
  OrganizationTreeNode,
  buildOrganizationTree,
} from "@/lib/organization";
import { OrganizationFormDialog } from "@/components/organization/organization-form-dialog";
import { OrganizationDeleteDialog } from "@/components/organization/organization-delete-dialog";
import { OrganizationRowActions } from "@/components/organization/organization-row-actions";

function OrgRow({
  org,
  level = 0,
  parentNameMap,
  onEdit,
  onDelete,
}: {
  org: OrganizationTreeNode;
  level?: number;
  parentNameMap: Map<string, string>;
  onEdit: (org: Organization) => void;
  onDelete: (org: Organization) => void;
}) {
  const hasChildren = org.children && org.children.length > 0;

  return (
    <>
      <TableRow className="border-border/30 hover:bg-muted/30 transition-colors">
        <TableCell>
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            ) : (
              <span className="size-3.5" />
            )}
            <Building2 className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium">{org.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {org.parent_id
            ? parentNameMap.get(org.parent_id) || "—"
            : "—"}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {new Date(org.created_at).toLocaleDateString("id-ID")}
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
      {org.children?.map((child) => (
        <OrgRow
          key={child.id}
          org={child}
          level={level + 1}
          parentNameMap={parentNameMap}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function OrganizationsManagementPage() {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedOrg, setSelectedOrg] = useState<Organization | undefined>();

  const fetchOrganizations = useCallback(async () => {
    if (!token) return;

    try {
      const res = await api.get<Organization[]>("/organizations", token);
      setOrganizations(res);
    } catch (error) {
      console.error("Failed to fetch organizations", error);
      toast.error("Gagal memuat data organisasi");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleRefetch = useCallback(() => {
    setLoading(true);
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Memoized Map for O(1) parent name lookups
  const parentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const org of organizations) {
      map.set(org.id, org.name);
    }
    return map;
  }, [organizations]);

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

  const orgTree = buildOrganizationTree(organizations);
  const totalUnits = organizations.length;
  const rootUnits = organizations.filter((o) => !o.parent_id).length;
  const subUnits = totalUnits - rootUnits;

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
              <p className="text-2xl font-bold mt-1">{totalUnits}</p>
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
              orgTree.map((org) => (
                <OrgRow
                  key={org.id}
                  org={org}
                  parentNameMap={parentNameMap}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))
            )}
          </TableBody>
        </Table>
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
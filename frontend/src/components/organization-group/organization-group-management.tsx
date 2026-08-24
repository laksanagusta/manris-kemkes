"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "@/components/ui/icons";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CollectionPagination,
  CollectionTableHead,
} from "@/components/shared/design-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Organization } from "@/lib/organization";
import {
  buildDescendantOrganizationOptions,
  groupMembersToIds,
  type OrganizationDescendantOption,
} from "@/lib/organization-group";
import {
  createOrganizationGroup,
  deleteOrganizationGroup,
  listOrganizationGroups,
  updateOrganizationGroup,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import type { User } from "@/contexts/auth-context";

type Props = {
  token: string | null;
  user: User | null;
  organizations: Organization[];
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function descendantLabel(option: OrganizationDescendantOption) {
  return option.name;
}

export function OrganizationGroupManagement({
  token,
  user,
  organizations,
}: Props) {
  const [groups, setGroups] = useState<OrganizationGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingGroup, setEditingGroup] = useState<OrganizationGroupListItem | null>(null);
  const [ownerOrganizationId, setOwnerOrganizationId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [memberSearch, setMemberSearch] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<OrganizationGroupListItem | null>(null);

  const ownerDefaultId = user?.organizationId ?? "";
  const descendantOptions = useMemo(() => {
    if (!ownerOrganizationId) return [];
    return buildDescendantOrganizationOptions(organizations, ownerOrganizationId);
  }, [organizations, ownerOrganizationId]);

  const filteredDescendantOptions = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return descendantOptions;
    return descendantOptions.filter((option) => {
      const haystack = `${option.name} ${option.location ?? ""} ${option.uprLevel ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [descendantOptions, memberSearch]);

  const selectedMemberSet = useMemo(
    () => new Set(selectedMemberIds),
    [selectedMemberIds],
  );

  const isMemberSearchActive = memberSearch.trim().length > 0;

  const loadGroups = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await listOrganizationGroups(token, {
        ownerOrganizationId: user?.isGlobal
          ? undefined
          : user?.organizationId ?? undefined,
        includeMembers: true,
        page: 1,
        limit: 200,
      });
      setGroups(response.data ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat grup organisasi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGroups();
  }, [token, user]);

  const resetForm = () => {
    setEditingGroup(null);
    setMode("create");
    setOwnerOrganizationId(ownerDefaultId);
    setName("");
    setDescription("");
    setSelectedMemberIds([]);
    setGroupSearch("");
    setPage(1);
    setMemberSearch("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && saving) {
      return;
    }

    setDialogOpen(open);

    if (!open) {
      resetForm();
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (group: OrganizationGroupListItem) => {
    setMode("edit");
    setEditingGroup(group);
    setOwnerOrganizationId(group.ownerOrganizationId);
    setName(group.name);
    setDescription(group.description ?? "");
    setSelectedMemberIds(groupMembersToIds(group.members));
    setGroupSearch("");
    setMemberSearch("");
    setDialogOpen(true);
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const handleSelectAll = () => {
    setSelectedMemberIds(descendantOptions.map((item) => item.id));
  };

  const handleSelectFiltered = () => {
    setSelectedMemberIds((current) => {
      const next = new Set(current);
      for (const option of filteredDescendantOptions) {
        next.add(option.id);
      }
      return [...next];
    });
  };

  const handleClearAll = () => {
    setSelectedMemberIds([]);
  };

  const handleSave = async () => {
    if (!token) {
      toast.error("Sesi login tidak ditemukan.");
      return;
    }

    if (!ownerOrganizationId) {
      toast.error("Pilih owner organisasi terlebih dahulu.");
      return;
    }

    if (!name.trim()) {
      toast.error("Nama grup wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ownerOrganizationId,
        name: name.trim(),
        description: description.trim(),
        memberOrganizationIds: selectedMemberIds,
      };

      if (mode === "edit" && editingGroup) {
        await updateOrganizationGroup(token, editingGroup.id, payload);
        toast.success("Grup organisasi diperbarui.");
      } else {
        await createOrganizationGroup(token, payload);
        toast.success("Grup organisasi dibuat.");
      }

      setDialogOpen(false);
      resetForm();
      await loadGroups();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan grup organisasi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !groupToDelete) return;

    setSaving(true);
    try {
      await deleteOrganizationGroup(token, groupToDelete.id);
      toast.success("Grup organisasi dihapus.");
      setDeleteOpen(false);
      setGroupToDelete(null);
      await loadGroups();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Gagal menghapus grup organisasi.",
      );
    } finally {
      setSaving(false);
    }
  };

  const visibleGroups = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) => {
      const haystack = `${group.name} ${group.ownerOrganizationName} ${group.description}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [groups, groupSearch]);

  const totalGroups = visibleGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return visibleGroups.slice(start, start + limit);
  }, [visibleGroups, currentPage, limit]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-white smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
        <div className="flex flex-col gap-4 p-4 shadow-[inset_0_-1px_rgba(24,24,27,0.06)] md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-zinc-900 text-balance">
                Grup Organisasi
              </h2>
              <p className="mt-1 text-xs text-zinc-500 text-pretty">
                Kelompokkan unit turunan yang sering dipakai sebagai scope laporan.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <div className="relative w-full max-w-sm md:w-[260px]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={groupSearch}
                  onChange={(event) => {
                    setGroupSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari grup..."
                  className="h-8 border-border bg-card pl-9 text-sm shadow-none"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Badge tone="neutral" size="compact" className="tabular-nums">
                  {totalGroups} grup
                </Badge>
                <Button className="h-8 gap-2 text-xs" variant="outline" onClick={openCreateDialog}>
                  <Plus className="size-3.5" />
                  Tambah Grup
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto">
          <Table className="min-w-[920px]">
            <TableHeader className="[&_tr]:border-b [&_tr]:border-border">
              <TableRow className="border-b border-border transition-colors hover:bg-transparent">
                <CollectionTableHead density="compact" className="w-[30%] whitespace-nowrap pl-4 pr-2.5 text-left align-middle uppercase tracking-[0.12em] text-zinc-500 md:pl-6">
                  Nama Grup
                </CollectionTableHead>
                <CollectionTableHead density="compact" className="w-[30%] whitespace-nowrap px-2.5 text-left align-middle uppercase tracking-[0.12em] text-zinc-500">
                  Pemilik
                </CollectionTableHead>
                <CollectionTableHead density="compact" className="w-24 whitespace-nowrap px-2.5 text-left align-middle uppercase tracking-[0.12em] text-zinc-500">
                  Anggota
                </CollectionTableHead>
                <CollectionTableHead density="compact" className="w-32 whitespace-nowrap px-2.5 text-left align-middle uppercase tracking-[0.12em] text-zinc-500">
                  Diperbarui
                </CollectionTableHead>
                <CollectionTableHead density="compact" className="w-28 whitespace-nowrap px-2.5 text-left align-middle uppercase tracking-[0.12em] text-zinc-500">
                  Aksi
                </CollectionTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className="border-border/80 transition-colors hover:bg-muted/70">
                  <TableCell colSpan={5} className="py-12 text-left text-xs text-zinc-500">
                    <Loader2 className="size-5 animate-spin text-zinc-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedGroups.length === 0 ? (
                <TableRow className="border-border/80 transition-colors hover:bg-muted/70">
                  <TableCell colSpan={5} className="py-8 text-left text-xs text-zinc-500">
                    Tidak ada grup organisasi yang ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group) => (
                  <TableRow
                    key={group.id}
                    className="border-border/80 transition-colors hover:bg-muted/70"
                  >
                    <TableCell className="pl-4 pr-2 align-middle md:pl-6">
                      <div className="max-w-[250px]">
                        <p className="block truncate text-sm font-semibold leading-relaxed text-zinc-900">
                          {group.name}
                        </p>
                        {group.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                            {group.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-2.5 align-middle text-zinc-600">
                      <div className="max-w-[280px] truncate text-sm">
                        {group.ownerOrganizationName}
                      </div>
                    </TableCell>
                    <TableCell className="px-2.5 align-middle">
                      <Badge tone="neutral" size="micro">
                        <Users className="size-3" />
                        {group.memberCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2.5 align-middle text-xs text-zinc-600">
                      {formatDateTime(group.updatedAt)}
                    </TableCell>
                    <TableCell className="px-2.5 align-middle">
                      <div className="flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          onClick={() => openEditDialog(group)}
                          aria-label={`Edit grup ${group.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground"
                          onClick={() => {
                            setGroupToDelete(group);
                            setDeleteOpen(true);
                          }}
                          aria-label={`Hapus grup ${group.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <CollectionPagination
          itemLabel="grup"
          page={currentPage}
          pageSize={limit}
          total={totalGroups}
          disabled={loading}
          onPageChange={setPage}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl" showCloseButton={!saving}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {mode === "edit" ? "Edit Grup Organisasi" : "Tambah Grup Organisasi"}
            </DialogTitle>
            <DialogDescription className="max-w-xl">
              Atur nama grup dan pilih organisasi anggota yang ingin dimasukkan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="group-name">Nama Grup</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Contoh: Jawa Timur"
                disabled={saving}
                className="h-9"
              />
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="group-description">Deskripsi</Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Catatan tambahan grup"
                disabled={saving}
                className="min-h-[88px] resize-none"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">Anggota</p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {selectedMemberIds.length} dipilih, {filteredDescendantOptions.length} ditampilkan.
                  </p>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Users className="size-3.5" />
                  {selectedMemberIds.length}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isMemberSearchActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectFiltered}
                    disabled={saving || filteredDescendantOptions.length === 0}
                  >
                    Pilih hasil pencarian
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={saving || descendantOptions.length === 0}
                >
                  Pilih semua
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={saving || selectedMemberIds.length === 0}
                >
                  Kosongkan
                </Button>
              </div>

              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Cari organisasi..."
                  className="h-9 pl-9"
                  disabled={saving}
                />
              </div>

              <ScrollArea className="h-[320px] rounded-lg border border-border/60 bg-muted/10">
                <div className="space-y-1 p-2">
                  {filteredDescendantOptions.length === 0 ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada organisasi turunan untuk owner ini.
                    </div>
                  ) : (
                    filteredDescendantOptions.map((option) => {
                      const checked = selectedMemberSet.has(option.id);
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
                            checked && "bg-background",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => handleToggleMember(option.id)}
                            disabled={saving}
                            className="mt-0.5"
                          />
                          <div
                            className="min-w-0 flex-1"
                            style={{ paddingLeft: `${option.depth * 14}px` }}
                          >
                            <p className="truncate font-medium">
                              {descendantLabel(option)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {option.location ?? option.uprLevel ?? "Unit"}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saving}
              className="sm:min-w-24"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !ownerOrganizationId || !name.trim()}
              className="sm:min-w-36"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "edit" ? "Simpan Perubahan" : "Simpan Grup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Grup Organisasi</DialogTitle>
            <DialogDescription>
              Grup {groupToDelete?.name ? `"${groupToDelete.name}"` : "ini"} akan dihapus dan tidak bisa dipilih lagi sebagai filter laporan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving || !groupToDelete}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

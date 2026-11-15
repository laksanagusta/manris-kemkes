"use client";

import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { createDisplayDateFormatter } from "@/lib/display-date";
import { useRemoteCollectionSorting } from "@/components/shared/design-system/collections/collection-sorting";
import { CreatedAtHead, CreatedAtCell } from "@/components/shared/design-system/collections/collection-created-at";


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "@/components/shared/icons";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CollectionPagination,
  DynamicTableFilters,
  CollectionSearchField,
  CollectionTableHead,
  CollectionTableCard,
  CollectionToolbar,
  CollectionEmptyState,
  CollectionErrorState,
  IllustratedEmptyState,
  DropdownActionMenu,
} from "@/components/shared/design-system";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { FieldHeading,
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { groupMembersToIds } from "@/lib/organization-group";
import {
  listAllOrganizations,
  listOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  createOrganizationGroup,
  deleteOrganizationGroup,
  listOrganizationGroups,
  listOrganizationGroupOptions,
  updateOrganizationGroup,
  type OrganizationGroupListItem,
  type OrganizationGroupFilterOption,
} from "@/lib/api/organization-groups";
import type { User } from "@/contexts/auth-context";

type Props = {
  token: string | null;
  user: User | null;
};

type OrganizationMemberOption = Pick<
  OrganizationListItem,
  "id" | "name" | "parentId" | "location" | "uprLevel"
>;

function mergeMemberOptions(
  current: Map<string, OrganizationMemberOption>,
  options: readonly OrganizationMemberOption[],
) {
  const next = new Map(current);
  for (const option of options) {
    next.set(option.id, option);
  }
  return next;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return createDisplayDateFormatter("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function OrganizationGroupManagement({
  token,
  user,
}: Props) {
  const [groups, setGroups] = useState<OrganizationGroupListItem[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [filterOptions, setFilterOptions] = useState<OrganizationGroupFilterOption[]>([]);
  const [loadError, setLoadError] = useState(false);
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
  const [memberOptions, setMemberOptions] = useState<OrganizationListItem[]>([]);
  const [memberOptionsTotal, setMemberOptionsTotal] = useState(0);
  const [memberOptionsQuery, setMemberOptionsQuery] = useState<string | null>(null);
  const [memberOptionsLoading, setMemberOptionsLoading] = useState(false);
  const [memberOptionsError, setMemberOptionsError] = useState(false);
  const [memberOptionCache, setMemberOptionCache] = useState<
    Map<string, OrganizationMemberOption>
  >(new Map());
  const [bulkSelectionMode, setBulkSelectionMode] = useState<
    "all" | "filtered" | null
  >(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const groupsRequestId = useRef(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { controls, sortBy, sortOrder } = useRemoteCollectionSorting({
    "Nama Grup": "name",
    Pemilik: "owner",
    Anggota: "member_count",
    Diperbarui: "updated_at",
  }, () => setPage(1));
  const [memberSearch, setMemberSearch] = useState("");
  const [groupToDelete, setGroupToDelete] = useState<OrganizationGroupListItem | null>(null);
  const memberComboboxAnchor = useComboboxAnchor();
  const memberComboboxPopup = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chips = memberComboboxAnchor.current;
    if (!chips) return;
    chips.scrollTop = chips.scrollHeight;
  }, [memberComboboxAnchor, selectedMemberIds]);

  const ownerDefaultId = user?.organizationId ?? "";
  const memberSearchQuery = memberSearch.trim();
  const isMemberSearchActive = memberSearch.trim().length > 0;
  const memberOptionsAreCurrent = memberOptionsQuery === memberSearchQuery;
  const visibleMemberOptions = memberOptionsAreCurrent ? memberOptions : [];
  const visibleMemberOptionsTotal = memberOptionsAreCurrent ? memberOptionsTotal : 0;
  const isMemberOptionsLoading = Boolean(
    dialogOpen &&
      ownerOrganizationId &&
      token &&
      (!memberOptionsAreCurrent || memberOptionsLoading),
  );
  const isMemberOptionsError = memberOptionsAreCurrent && memberOptionsError;
  const memberOptionIds = useMemo(
    () => visibleMemberOptions.map((option) => option.id),
    [visibleMemberOptions],
  );
  const comboboxItemIds = useMemo(
    () => Array.from(new Set([...selectedMemberIds, ...memberOptionIds])),
    [memberOptionIds, selectedMemberIds],
  );
  const memberOptionById = useMemo(
    () => mergeMemberOptions(memberOptionCache, visibleMemberOptions),
    [memberOptionCache, visibleMemberOptions],
  );

  useEffect(() => {
    if (!dialogOpen || !ownerOrganizationId || !token) return;

    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      setMemberOptionsLoading(true);
      setMemberOptionsError(false);
      void listOrganizations(token, {
        ancestorId: ownerOrganizationId,
        q: memberSearchQuery || undefined,
        page: 1,
        limit: 6,
      })
        .then((response) => {
          if (cancelled) return;
          const options = response.data ?? [];
          setMemberOptions(options);
          setMemberOptionsTotal(response.total ?? options.length);
          setMemberOptionsQuery(memberSearchQuery);
          setMemberOptionCache((current) => mergeMemberOptions(current, options));
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Failed to search descendant organizations", error);
          setMemberOptions([]);
          setMemberOptionsTotal(0);
          setMemberOptionsQuery(memberSearchQuery);
          setMemberOptionsError(true);
        })
        .finally(() => {
          if (!cancelled) setMemberOptionsLoading(false);
        });
    }, memberSearchQuery ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [dialogOpen, memberSearchQuery, ownerOrganizationId, token]);

  const groupOwnerScope = user?.isGlobal ? undefined : user?.organizationId ?? undefined;
  const loadGroups = useCallback(async () => {
    const requestId = ++groupsRequestId.current;
    if (!token) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(false);
    try {
      const [response, options] = await Promise.all([
        listOrganizationGroups(token, {
          ownerOrganizationId: ownerFilter === "all" ? groupOwnerScope : ownerFilter,
          groupId: groupFilter === "all" ? undefined : groupFilter,
          q: groupSearch.trim(),
          sortBy,
          sortOrder,
          includeMembers: true,
          page,
          limit,
        }),
        listOrganizationGroupOptions(token, groupOwnerScope),
      ]);
      if (requestId !== groupsRequestId.current) return;
      setFilterOptions(options);
      const lastPage = Math.max(1, Math.ceil(response.total / limit));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setGroups(response.data ?? []);
      setTotalGroups(response.total);
      setLoading(false);
    } catch (error) {
      if (requestId !== groupsRequestId.current) return;
      setGroups([]);
      setLoadError(true);
      console.error(error);
      toast.error("Gagal memuat grup organisasi.");
      setLoading(false);
    }
  }, [groupFilter, groupOwnerScope, groupSearch, limit, ownerFilter, page, sortBy, sortOrder, token]);

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => { void loadGroups(); }, groupSearch.trim() ? 250 : 0);
    return () => {
      window.clearTimeout(timeout);
      groupsRequestId.current += 1;
    };
  }, [groupSearch, loadGroups]);

  const resetForm = () => {
    setEditingGroup(null);
    setMode("create");
    setOwnerOrganizationId(ownerDefaultId);
    setName("");
    setDescription("");
    setSelectedMemberIds([]);
    setMemberOptions([]);
    setMemberOptionsTotal(0);
    setMemberOptionsQuery(null);
    setMemberOptionsLoading(false);
    setMemberOptionsError(false);
    setMemberOptionCache(new Map());
    setGroupSearch("");
    setPage(1);
    setMemberSearch("");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && (saving || bulkSelectionMode)) {
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
    setMemberOptions([]);
    setMemberOptionsTotal(0);
    setMemberOptionsQuery(null);
    setMemberOptionsLoading(false);
    setMemberOptionsError(false);
    setMemberOptionCache(
      new Map<string, OrganizationMemberOption>(
        (group.members ?? []).map((member) => [member.id, member] as const),
      ),
    );
    setGroupSearch("");
    setMemberSearch("");
    setDialogOpen(true);
  };

  const handleSelectAll = async () => {
    if (!token || !ownerOrganizationId) return;

    setBulkSelectionMode("all");
    try {
      const options = await listAllOrganizations(token, {
        ancestorId: ownerOrganizationId,
      });
      setMemberOptionCache((current) => mergeMemberOptions(current, options));
      setSelectedMemberIds(options.map((option) => option.id));
    } catch (error) {
      console.error("Failed to load descendant organizations", error);
      toast.error("Gagal memuat organisasi turunan.");
    } finally {
      setBulkSelectionMode(null);
    }
  };

  const handleSelectFiltered = async () => {
    if (!token || !ownerOrganizationId || !memberSearchQuery) return;

    setBulkSelectionMode("filtered");
    try {
      const options = await listAllOrganizations(token, {
        ancestorId: ownerOrganizationId,
        q: memberSearchQuery,
      });
      setMemberOptionCache((current) => mergeMemberOptions(current, options));
      setSelectedMemberIds((current) => {
        const next = new Set(current);
        for (const option of options) next.add(option.id);
        return [...next];
      });
    } catch (error) {
      console.error("Failed to select matching organizations", error);
      toast.error("Gagal memuat hasil pencarian organisasi.");
    } finally {
      setBulkSelectionMode(null);
    }
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

  const groupOptions = useMemo(() => [
    { value: "all", label: "Semua grup" },
    ...filterOptions.map((group) => ({ value: group.id, label: group.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "id")),
    ...(groupFilter !== "all" && !filterOptions.some(({ id }) => id === groupFilter)
      ? [{ value: groupFilter, label: groupFilter }] : []),
  ], [filterOptions, groupFilter]);
  const ownerOptions = useMemo(() => [
    { value: "all", label: "Semua pemilik" },
    ...Array.from(new Map(filterOptions.map((group) => [
      group.ownerOrganizationId,
      { value: group.ownerOrganizationId, label: group.ownerOrganizationName },
    ])).values()).sort((a, b) => a.label.localeCompare(b.label, "id")),
    ...(ownerFilter !== "all" && !filterOptions.some(({ ownerOrganizationId }) => ownerOrganizationId === ownerFilter)
      ? [{ value: ownerFilter, label: ownerFilter }] : []),
  ], [filterOptions, ownerFilter]);

  return (
    <div className="space-y-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">Grup Organisasi</h2>
          <Badge variant="secondary" className="tabular-nums">
            {totalGroups} grup
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Kelompokkan unit turunan yang sering dipakai sebagai scope laporan.
        </p>
      </div>
      <CollectionToolbar
        actions={
          <Button size="default" variant="outline" onClick={openCreateDialog}>
            <Plus data-icon="inline-start" />
            Tambah Grup
          </Button>
        }
        leading={
          <DynamicTableFilters
            search={
              <CollectionSearchField
                value={groupSearch}
                onChange={(event) => {
                  setGroupSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Cari grup..."
                aria-label="Cari grup organisasi"
              />
            }
            fields={[
              {
                id: "group",
                label: "Nama grup",
                value: groupFilter,
                onChange: (value) => { setGroupFilter(value); setPage(1); },
                options: groupOptions,
              },
              {
                id: "owner", organizationScope: true,
                label: "Pemilik",
                value: ownerFilter,
                onChange: (value) => { setOwnerFilter(value); setPage(1); },
                options: ownerOptions,
              },
            ]}
          />
        }
      />
      <CollectionTableCard stickyActions sorting={controls}>
        <Table className="min-w-[1320px]">
          <TableHeader>
            <TableRow className="transition-colors hover:bg-transparent">
              <CollectionTableHead density="compact" className="w-[20%] whitespace-nowrap text-left align-middle">
                Nama Grup
              </CollectionTableHead>
              <CollectionTableHead className="w-[240px]">Deskripsi</CollectionTableHead>
              <CollectionTableHead density="compact" className="w-[20%] whitespace-nowrap text-left align-middle">
                Pemilik
              </CollectionTableHead>
              <CollectionTableHead density="compact" className="w-24 whitespace-nowrap text-left align-middle">
                Anggota
              </CollectionTableHead>
              <CollectionTableHead density="compact" className="w-32 whitespace-nowrap text-left align-middle">
                Diperbarui
              </CollectionTableHead>
              <CreatedAtHead />
              <CollectionTableHead density="compact" data-collection-action="" className="w-12 whitespace-nowrap">
                <span className="sr-only">Aksi</span>
              </CollectionTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="transition-colors hover:bg-muted/70">
                <TableCell colSpan={7} className="text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-disabled-foreground" />
                </TableCell>
              </TableRow>
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <CollectionErrorState
                    message="Grup organisasi belum berhasil dimuat."
                    onReload={() => { void loadGroups(); }}
                  />
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="">
                  <CollectionEmptyState
                    title="Tidak ada grup organisasi yang ditemukan."
                    description="Coba ubah kata kunci atau filter pencarian."
                  />
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow
                  key={group.id}
                  className="transition-colors hover:bg-muted/70"
                >
                  <TableCell className="align-middle">
                    <span className="block max-w-[250px] truncate font-medium" title={group.name}>{group.name}</span>
                  </TableCell>
                  <TableCell className="max-w-[240px] text-muted-foreground">{group.description || "—"}</TableCell>
                  <TableCell className="align-middle">
                    <div className="max-w-[280px] truncate text-sm">
                      {group.ownerOrganizationName}
                    </div>
                  </TableCell>
                  <TableCell className="align-middle">
                    <Badge variant="secondary">
                      <Users className="size-3" />
                      {group.memberCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-middle">
                    <span data-date-time="">{formatDateTime(group.updatedAt)}</span>
                  </TableCell>
                  <CreatedAtCell record={group} />
                  <TableCell data-collection-action="" className="text-center">
                    <DropdownActionMenu
                      label={`Tindakan grup ${group.name}`}
                      items={[
                        {
                          id: "edit",
                          label: "Edit grup",
                          icon: <Pencil className="size-3.5" aria-hidden="true" />,
                          onSelect: () => openEditDialog(group),
                        },
                        {
                          id: "delete",
                          label: "Hapus grup",
                          icon: <Trash2 className="size-3.5" aria-hidden="true" />,
                          tone: "danger",
                          onSelect: () => {
                            setGroupToDelete(group);
                            setDeleteOpen(true);
                          },
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      <CollectionPagination
        itemLabel="grup"
        page={page}
        pageSize={limit}
        total={totalGroups}
        disabled={loading || loadError}
        onPageChange={setPage}
        onPageSizeChange={(nextLimit) => {
          setLimit(nextLimit);
          setPage(1);
        }}
      />
      </CollectionTableCard>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          onInteractOutside={(event) => {
            if (event.target instanceof Node && memberComboboxPopup.current?.contains(event.target)) {
              event.preventDefault();
            }
          }}
          className="flex w-[calc(100%-2rem)] max-h-[calc(100svh-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
          showCloseButton={!saving && !bulkSelectionMode}
        >
          <DialogHeader className="shrink-0 border-b px-6 py-5 pr-14">
            <DialogTitle>
              {mode === "edit" ? "Edit Grup Organisasi" : "Tambah Grup Organisasi"}
            </DialogTitle>
            <DialogDescription>
              Atur nama grup dan pilih organisasi anggota yang ingin dimasukkan.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FieldGroup className="gap-4">
              <Field>
                <FieldHeading>
                  <FieldLabel htmlFor="group-name">Nama Grup</FieldLabel>
                  <FieldDescription className="text-xs">
                    Gunakan nama yang mudah dikenali saat memilih cakupan laporan.
                  </FieldDescription>
                </FieldHeading>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: Jawa Timur"
                  disabled={saving}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="group-description">Deskripsi</FieldLabel>
                <Textarea
                  id="group-description"
                  rows={2}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Catatan tambahan grup"
                  disabled={saving}
                  className="resize-none"
                />
              </Field>
            </FieldGroup>

            <Separator className="my-5" />

            <section aria-labelledby="group-members-title" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 id="group-members-title" className="text-sm font-medium text-foreground">
                    Anggota organisasi
                  </h2>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {isMemberOptionsLoading ? (
                      "Mencari organisasi..."
                    ) : (
                      <>
                        {visibleMemberOptions.length} hasil teratas ditampilkan dari{" "}
                        {visibleMemberOptionsTotal}{" "}
                        {isMemberSearchActive ? "organisasi cocok." : "unit turunan."}
                      </>
                    )}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  <Users className="size-3.5" aria-hidden="true" />
                  {selectedMemberIds.length} dipilih
                </Badge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {isMemberSearchActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSelectFiltered()}
                      disabled={
                        saving ||
                        bulkSelectionMode !== null ||
                        isMemberOptionsLoading ||
                        visibleMemberOptionsTotal === 0
                      }
                    >
                      {bulkSelectionMode === "filtered" ? (
                        <Loader2
                          className="size-3.5 animate-spin"
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                      ) : null}
                      Pilih hasil pencarian
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSelectAll()}
                    disabled={
                      saving || bulkSelectionMode !== null || !ownerOrganizationId
                    }
                  >
                    {bulkSelectionMode === "all" ? (
                      <Loader2
                        className="size-3.5 animate-spin"
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                    ) : null}
                    Pilih semua
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={saving || bulkSelectionMode !== null || selectedMemberIds.length === 0}
                >
                  Kosongkan pilihan
                </Button>
              </div>

              <Combobox
                multiple
                autoHighlight
                highlightItemOnHover
                openOnInputClick
                items={comboboxItemIds}
                filteredItems={memberOptionIds}
                filter={null}
                value={selectedMemberIds}
                onValueChange={(nextValues) => setSelectedMemberIds(nextValues)}
                inputValue={memberSearch}
                onInputValueChange={setMemberSearch}
                disabled={saving || bulkSelectionMode !== null}
              >
                <ComboboxChips
                  ref={memberComboboxAnchor}
                  className="max-h-32 min-h-10 w-full overflow-y-auto"
                >
                  <ComboboxValue>
                    {(values) => (
                      <>
                        {values.map((value: string) => (
                          <ComboboxChip key={value} className="max-w-full">
                            <span className="max-w-48 truncate">
                              {memberOptionById.get(value)?.name ?? value}
                            </span>
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          aria-label="Cari organisasi anggota"
                          placeholder={
                            values.length === 0
                              ? "Pilih organisasi..."
                              : "Cari organisasi..."
                          }
                          className="min-w-28 flex-1"
                        />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent
                  ref={memberComboboxPopup}
                  anchor={memberComboboxAnchor}
                  className="pointer-events-auto"
                >
                  <ComboboxEmpty>
                    {isMemberOptionsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Memuat organisasi...
                      </div>
                    ) : (
                      <IllustratedEmptyState
                        title={
                          isMemberOptionsError
                            ? "Pencarian gagal. Coba ubah kata kunci."
                            : isMemberSearchActive
                              ? "Tidak ada organisasi yang cocok dengan pencarian ini."
                              : "Tidak ada organisasi turunan untuk owner ini."
                        }
                        size="compact"
                        className="py-2"
                      />
                    )}
                  </ComboboxEmpty>
                  <ComboboxList>
                    {(optionId: string) => {
                      const option = memberOptionById.get(optionId);
                      return (
                        <ComboboxItem key={optionId} value={optionId} className="items-start py-2">
                          <span className="min-w-0 flex-1 space-y-0.5">
                            <span className="block truncate font-medium">
                              {option?.name ?? optionId}
                            </span>
                            {option ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {option.location ?? option.uprLevel ?? "Unit"}
                              </span>
                            ) : null}
                          </span>
                        </ComboboxItem>
                      );
                    }}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </section>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={saving || bulkSelectionMode !== null}
              className="sm:min-w-24"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || bulkSelectionMode !== null || !ownerOrganizationId || !name.trim()}
              className="sm:min-w-36"
            >
              {saving ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden="true" /> : null}
              {mode === "edit" ? "Simpan Perubahan" : "Simpan Grup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Grup Organisasi</DialogTitle>
            <DialogDescription>Periksa grup organisasi yang akan dihapus.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences>
            Grup {groupToDelete?.name ? `"${groupToDelete.name}"` : "ini"} akan dihapus permanen dan tidak bisa dipilih lagi sebagai filter laporan. Organisasi anggotanya tetap tersimpan. Tindakan ini tidak dapat dibatalkan.
          </ConfirmationConsequences>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving || !groupToDelete}>
              {saving ? <Loader2 className="size-4 animate-spin" data-icon="inline-start" aria-hidden="true" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

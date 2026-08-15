"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "@/components/ui/icons";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { listOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import {
  Organization,
  OrganizationAction,
  toOrganizationRequestBody,
  getOrganizationActionErrorMessage,
} from "@/lib/organization";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const uprLevelOptions = [
  { value: "kementerian", label: "Kementerian" },
  { value: "upr_t1", label: "UPR T1" },
  { value: "upr_t2", label: "UPR T2" },
] as const;

const rootParentOption: OrganizationListItem = {
  id: "__ROOT__",
  name: "Tanpa parent (unit induk)",
  createdAt: "",
};

interface OrganizationFormDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string;
  organizations: Organization[];
  initialOrganization?: Organization;
  onSuccess?: () => void;
}

export function OrganizationFormDialog({
  mode,
  open,
  onOpenChange,
  token,
  organizations,
  initialOrganization,
  onSuccess,
}: OrganizationFormDialogProps) {
  const [name, setName] = useState("");
  const [parentValue, setParentValue] = useState<string>("__ROOT__");
  const [parentLabel, setParentLabel] = useState<string>(rootParentOption.name);
  const [uprLevel, setUprLevel] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState("");
  const deferredParentQuery = useDeferredValue(parentQuery.trim());
  const [parentOptions, setParentOptions] = useState<OrganizationListItem[]>([]);
  const [parentLoading, setParentLoading] = useState(false);

  const parentOptionsById = useMemo(
    () =>
      new Map(
        organizations.map((org) => [
          org.id,
          {
            id: org.id,
            name: org.name,
            uprLevel: org.uprLevel,
            createdAt: org.createdAt,
          } satisfies OrganizationListItem,
        ]),
      ),
    [organizations],
  );

  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setIsSubmitting(false);

      if (mode === "create") {
        setName("");
        setParentValue("__ROOT__");
        setParentLabel(rootParentOption.name);
        setUprLevel("");
      } else if (mode === "edit" && initialOrganization) {
        setName(initialOrganization.name);
        setParentValue(initialOrganization.parentId || "__ROOT__");
        setParentLabel(
          (initialOrganization.parentId
            ? parentOptionsById.get(initialOrganization.parentId)?.name
            : undefined) ?? rootParentOption.name,
        );
        setUprLevel(initialOrganization.uprLevel || "");
      }
    }
  }, [open, mode, initialOrganization, parentOptionsById]);

  useEffect(() => {
    if (!parentPickerOpen || !token) {
      return;
    }

    let active = true;
    (async () => {
      try {
        setParentLoading(true);
        const response = await listOrganizations(token, {
          q: deferredParentQuery || undefined,
          page: 1,
          limit: 6,
        });
        if (!active) return;
        const items = (response.data ?? []).filter((org) => org.id !== initialOrganization?.id);
        setParentOptions(items);
      } catch {
        if (active) setParentOptions([]);
      } finally {
        if (active) setParentLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [deferredParentQuery, initialOrganization?.id, parentPickerOpen, token]);

  const selectParent = useCallback((option: OrganizationListItem) => {
    setParentValue(option.id);
    setParentLabel(option.name);
    setParentPickerOpen(false);
    setParentQuery("");
    setErrorMessage(null);
  }, []);

  const selectedParentLabel =
    parentValue === "__ROOT__"
      ? rootParentOption.name
      : parentLabel || parentOptionsById.get(parentValue)?.name || "Parent unit terpilih";

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Nama organisasi wajib diisi");
      return;
    }
    if (mode === "create" && !uprLevel) {
      setErrorMessage("UPR level wajib dipilih");
      return;
    }

    if (!token) {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const body = toOrganizationRequestBody({
        name: trimmedName,
        parentId: parentValue,
        uprLevel: mode === "create" ? uprLevel : initialOrganization?.uprLevel,
      });

      if (mode === "create") {
        await api.post("/organizations", body, token);
        toast.success("Organisasi berhasil ditambahkan");
      } else {
        if (!initialOrganization?.id) {
          toast.error("Terjadi kesalahan. Silakan coba lagi.");
          return;
        }
        await api.put(`/organizations/${initialOrganization.id}`, body, token);
        toast.success("Organisasi berhasil diperbarui");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const actionType: OrganizationAction = mode === "create" ? "create" : "update";
      const message = getOrganizationActionErrorMessage(actionType, error);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSubmitting) {
      return;
    }
    onOpenChange(newOpen);
  };

  const title = mode === "create" ? "Tambah organisasi" : "Ubah organisasi";
  const submitLabel = mode === "create" ? "Simpan organisasi" : "Perbarui organisasi";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isSubmitting}>
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label
              htmlFor="organization-name"
              className="text-sm font-medium leading-none"
            >
              Nama organisasi
             <span className="text-destructive ml-0.5">*</span>
            </label>
            <Input
              id="organization-name"
              placeholder="Masukkan nama organisasi"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMessage(null);
              }}
              disabled={isSubmitting}
              aria-invalid={!!errorMessage}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Parent unit
            </label>
            <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between gap-2 font-normal"
                  disabled={isSubmitting}
                >
                  <span className="truncate">
                    {selectedParentLabel}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={8}
                className="w-[var(--radix-popover-trigger-width)] overflow-hidden p-0"
              >
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 size-4 shrink-0 opacity-50" />
                  <SearchInput
                    type="search"
                    className="h-10 rounded-none border-0 bg-transparent px-0 py-3 shadow-none"
                    placeholder="Cari parent unit..."
                    value={parentQuery}
                    onChange={(event) => setParentQuery(event.target.value)}
                  />
                </div>
                <ScrollArea className="h-64">
                  <div className="p-1">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        parentValue === "__ROOT__" && "bg-accent text-accent-foreground",
                      )}
                      onClick={() => selectParent(rootParentOption)}
                    >
                      <Check className={cn("size-4 shrink-0", parentValue === "__ROOT__" ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{rootParentOption.name}</span>
                    </button>

                    {parentLoading ? (
                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Memuat parent unit...
                      </div>
                    ) : parentOptions.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Parent unit belum ditemukan.
                      </div>
                    ) : (
                      parentOptions.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                            parentValue === org.id && "bg-accent text-accent-foreground",
                          )}
                          onClick={() => selectParent(org)}
                        >
                          <Check className={cn("size-4 shrink-0", parentValue === org.id ? "opacity-100" : "opacity-0")} />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{org.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {org.uprLevel || "Organisasi"}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          {mode === "create" ? (
            <div className="space-y-2">
              <label
                htmlFor="organization-upr-level"
                className="text-sm font-medium leading-none"
              >
                UPR level
                <span className="text-destructive ml-0.5">*</span>
              </label>
              <Select
                value={uprLevel}
                onValueChange={(value) => {
                  setUprLevel(value);
                  setErrorMessage(null);
                }}
                disabled={isSubmitting}
              >
                <SelectTrigger id="organization-upr-level">
                  <SelectValue placeholder="Pilih UPR level" />
                </SelectTrigger>
                <SelectContent>
                  {uprLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="sm:mr-2"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

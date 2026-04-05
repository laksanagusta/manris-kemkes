"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Organization,
  OrganizationAction,
  getAvailableParentOptions,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setIsSubmitting(false);

      if (mode === "create") {
        setName("");
        setParentValue("__ROOT__");
      } else if (mode === "edit" && initialOrganization) {
        setName(initialOrganization.name);
        setParentValue(initialOrganization.parent_id || "__ROOT__");
      }
    }
  }, [open, mode, initialOrganization]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Nama organisasi wajib diisi");
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

  const currentOrgId = mode === "edit" && initialOrganization ? initialOrganization.id : "";
  const availableParents = getAvailableParentOptions(organizations, currentOrgId);

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
            <label
              htmlFor="organization-parent"
              className="text-sm font-medium leading-none"
            >
              Parent unit
            </label>
            <Select
              value={parentValue}
              onValueChange={(value) => setParentValue(value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="organization-parent">
                <SelectValue placeholder="Pilih parent unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ROOT__">
                  <span className="text-muted-foreground">Tanpa parent (unit induk)</span>
                </SelectItem>
                {availableParents.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
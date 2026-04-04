"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Organization, getOrganizationActionErrorMessage } from "@/lib/organization";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

interface OrganizationDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization;
  token?: string;
  onSuccess?: () => void;
}

export function OrganizationDeleteDialog({
  open,
  onOpenChange,
  organization,
  token,
  onSuccess,
}: OrganizationDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!organization?.id || !token) {
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/organizations/${organization.id}`, undefined, token);

      toast.success("Organisasi berhasil dihapus.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to delete organization", error);
      const errorMessage = getOrganizationActionErrorMessage("delete", error);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isDeleting) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDeleting}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-500/15 text-red-600">
              <Trash2 className="size-4" />
            </div>
            <DialogTitle className="text-lg">Hapus organisasi</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Tindakan ini akan menghapus organisasi terpilih secara permanen.
            {organization?.name && (
              <span className="block mt-1 font-medium text-foreground">
                &ldquo;{organization.name}&rdquo;
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="sm:mr-2"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                Hapus organisasi
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
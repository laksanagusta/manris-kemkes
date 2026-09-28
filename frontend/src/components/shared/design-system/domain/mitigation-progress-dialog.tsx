"use client";

import type { ReactNode } from "react";

import { CollectionDialogCancel } from "../collections/collection-dialog-cancel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  MitigationProgressForm,
  type MitigationProgressFormProps,
} from "./mitigation-progress-form";

type MitigationProgressDialogProps = MitigationProgressFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  footerActions: ReactNode;
  className?: string;
};

export function MitigationProgressDialog({
  open,
  onOpenChange,
  title,
  footerActions,
  className,
  ...formProps
}: MitigationProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-2xl no-scrollbar", className)}
        showCloseButton={false}
      >
        <div className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription>
              Masukkan bukti dan catatan untuk melaporkan progres penanganan.
            </DialogDescription>
          </DialogHeader>
          <div>
            <MitigationProgressForm {...formProps} />
          </div>
          <DialogFooter>
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="default"
              className="border-0 shadow-black"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </CollectionDialogCancel>
            {footerActions}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

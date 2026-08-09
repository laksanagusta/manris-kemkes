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

import {
  MitigationProgressForm,
  type MitigationProgressFormProps,
} from "./mitigation-progress-form";

type MitigationProgressDialogProps = MitigationProgressFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footerActions: ReactNode;
  className?: string;
};

export function MitigationProgressDialog({
  open,
  onOpenChange,
  title,
  description,
  footerActions,
  className,
  ...formProps
}: MitigationProgressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className ?? "max-w-md rounded-2xl p-6 shadow-2xl"}>
        <DialogHeader className="items-start gap-0 px-4 py-6 text-left">
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-xs">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <MitigationProgressForm {...formProps} />
        <DialogFooter>
          <CollectionDialogCancel
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Batal
          </CollectionDialogCancel>
          {footerActions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import type { ReactNode } from "react";

import { CollectionDialogCancel } from "../collections/collection-dialog-cancel";
import {
  Dialog,
  DialogContent,
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
          <DialogHeader className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both">
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>
          <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[40ms]">
            <MitigationProgressForm {...formProps} />
          </div>
          <DialogFooter className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-(--ease-out) motion-safe:fill-mode-both motion-safe:delay-[80ms]">
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
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

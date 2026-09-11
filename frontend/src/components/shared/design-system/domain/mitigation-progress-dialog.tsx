"use client";

import { useRef, useState, type ReactNode } from "react";

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
  type MitigationProgressFormHandle,
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
  const [evidenceEditorOpen, setEvidenceEditorOpen] = useState(false);
  const evidenceEditorControlRef = useRef<MitigationProgressFormHandle>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setEvidenceEditorOpen(false);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn("max-w-2xl no-scrollbar", className)}
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (!evidenceEditorOpen) return;

          event.preventDefault();
          evidenceEditorControlRef.current?.cancelEvidenceEditor();
        }}
      >
        <div className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </DialogHeader>
          <div>
            <MitigationProgressForm
              {...formProps}
              evidenceEditorOpen={evidenceEditorOpen}
              onEvidenceEditorOpenChange={setEvidenceEditorOpen}
              evidenceEditorControlRef={evidenceEditorControlRef}
            />
          </div>
          <DialogFooter>
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
              onClick={() => handleOpenChange(false)}
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

"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { CollectionDialogCancel } from "../collections/collection-dialog-cancel";
import {
  MitigationProgressForm,
  type MitigationProgressFormProps,
} from "./mitigation-progress-form";

export type MitigationProgressFlowView = "detail" | "form";

type MitigationProgressFlowDialogProps = MitigationProgressFormProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: MitigationProgressFlowView;
  onViewChange: (view: MitigationProgressFlowView) => void;
  detailTitle: ReactNode;
  detailDescription: ReactNode;
  detailContent: ReactNode;
  detailAction?: ReactNode;
  formTitle: ReactNode;
  formDescription?: ReactNode;
  footerActions: ReactNode;
  onFormCancel?: () => void;
  className?: string;
};

export function MitigationProgressFlowDialog({
  open,
  onOpenChange,
  view,
  onViewChange,
  detailTitle,
  detailDescription,
  detailContent,
  detailAction,
  formTitle,
  formDescription = "Masukkan bukti dan catatan untuk melaporkan progres penanganan.",
  footerActions,
  onFormCancel,
  className,
  ...formProps
}: MitigationProgressFlowDialogProps) {
  const [modalElement, setModalElement] = useState<HTMLDivElement | null>(null);
  const [bodyContentElement, setBodyContentElement] =
    useState<HTMLDivElement | null>(null);
  const [detailNeedsScroll, setDetailNeedsScroll] = useState(false);
  const modalHeightRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      modalHeightRef.current = null;
      return;
    }

    const modal = modalElement;
    const bodyContent = bodyContentElement;
    if (!modal || !bodyContent) return;

    let frame = 0;
    let pending = false;

    const measureAndAnimate = () => {
      pending = false;
      if (!modal.isConnected) return;

      // The dialog zooms in from 95% on open. offsetHeight reads the layout
      // height without that transform, so the first measurement stays accurate.
      const currentHeight = modal.offsetHeight;
      const previousHeight = currentHeight || modalHeightRef.current || 0;
      const previousInlineHeight = modal.style.height;
      const previousInlineMaxHeight = modal.style.maxHeight;
      const previousInlineTransition = modal.style.transition;
      const body = modal.querySelector<HTMLElement>('[data-slot="modal-body"]');
      const previousBodyFlex = body?.style.flex ?? "";
      const previousBodyHeight = body?.style.height ?? "";
      const previousBodyMaxHeight = body?.style.maxHeight ?? "";
      const previousBodyOverflow = body?.style.overflow ?? "";

      modal.style.transition = "none";
      modal.style.height = "auto";
      modal.style.maxHeight = "none";
      if (body) {
        body.style.flex = "none";
        body.style.height = "auto";
        body.style.maxHeight = "none";
        body.style.overflow = "visible";
      }

      const naturalHeight = modal.offsetHeight;
      const maxHeight = Math.max(0, window.innerHeight - 16);
      const targetHeight = Math.min(naturalHeight, maxHeight);
      const nextDetailNeedsScroll = view === "detail" && naturalHeight > maxHeight;
      setDetailNeedsScroll((current) =>
        current === nextDetailNeedsScroll ? current : nextDetailNeedsScroll,
      );

      if (body) {
        body.style.flex = previousBodyFlex;
        body.style.height = previousBodyHeight;
        body.style.maxHeight = previousBodyMaxHeight;
        body.style.overflow = previousBodyOverflow;
      }
      modal.style.height = previousInlineHeight;
      modal.style.maxHeight = previousInlineMaxHeight;
      modal.style.transition = previousInlineTransition;

      if (!targetHeight) return;
      if (modalHeightRef.current === null) {
        // Let the first render keep its natural height. This avoids locking in
        // a stale flex measurement before the dialog's content has settled.
        modal.style.height = previousInlineHeight;
        modalHeightRef.current = targetHeight;
        return;
      }
      if (Math.abs(targetHeight - previousHeight) < 1) {
        modal.style.height = `${targetHeight}px`;
        modalHeightRef.current = targetHeight;
        return;
      }

      modal.style.height = `${previousHeight}px`;
      void modal.offsetHeight;
      modal.style.height = `${targetHeight}px`;
      modalHeightRef.current = targetHeight;
    };

    const scheduleMeasure = () => {
      if (pending) return;
      pending = true;
      frame = window.requestAnimationFrame(measureAndAnimate);
    };

    scheduleMeasure();
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(bodyContent);

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [bodyContentElement, modalElement, open, view]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      onViewChange("detail");
    }
    onOpenChange(nextOpen);
  };

  const handleFormCancel = () => {
    if (view === "form" && onFormCancel) {
      onFormCancel();
      return;
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        ref={setModalElement}
        data-dynamic-height="true"
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0",
          className,
        )}
        showCloseButton={false}
      >
        <DialogHeader className="w-full shrink-0 gap-0.5 p-4 text-left">
          <DialogTitle className="text-base">
            {view === "detail" ? detailTitle : formTitle}
          </DialogTitle>
          <DialogDescription>
            {view === "detail" ? detailDescription : formDescription}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div
          data-slot="modal-body"
          className={cn(
            "min-h-0 flex-1 px-4 py-5",
            view === "form" || detailNeedsScroll
              ? "overflow-y-auto overscroll-contain no-scrollbar"
              : "overflow-visible",
          )}
        >
          <div ref={setBodyContentElement}>
            {view === "detail" ? (
              detailContent
            ) : (
              <MitigationProgressForm {...formProps} />
            )}
          </div>
        </div>
        <Separator />
        <DialogFooter className="m-0 shrink-0 rounded-none border-0 bg-transparent p-4 sm:flex-row sm:justify-between">
          <CollectionDialogCancel
            type="button"
            variant="outline"
            size="default"
            onClick={handleFormCancel}
          >
            {view === "detail" ? "Tutup" : onFormCancel ? "Batal" : "Tutup"}
          </CollectionDialogCancel>
          {view === "detail" ? detailAction : footerActions}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

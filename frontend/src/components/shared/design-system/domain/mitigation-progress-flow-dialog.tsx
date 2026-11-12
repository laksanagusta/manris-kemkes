"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDisplayDate } from "@/lib/display-date";
import type { MitigationTask } from "@/types/risk";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { CollectionDialogCancel } from "../collections/collection-dialog-cancel";
import {
  MitigationProgressForm,
  type MitigationProgressFormProps,
} from "./mitigation-progress-form";

export type MitigationProgressFlowView = "detail" | "form";

type MitigationProgressFlowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  detailTitle: ReactNode;
  detailDescription: ReactNode;
  detailContent: ReactNode;
  detailAction?: ReactNode;
  formDescription?: ReactNode;
  reportTask?: Pick<MitigationTask, "mitigationAction" | "riskCode" | "periodLabel" | "dueDate"> | null;
  availabilityMessage?: string;
  reportSent?: boolean;
  submitError?: string;
  dirty?: boolean;
  submitting?: boolean;
  onFormCancel?: () => void;
  className?: string;
  onCloseAutoFocus?: ComponentProps<typeof DialogContent>["onCloseAutoFocus"];
};

type MitigationProgressDialogMode =
  | (MitigationProgressFormProps & {
      readOnly?: false;
      view: MitigationProgressFlowView;
      onViewChange: (view: MitigationProgressFlowView) => void;
      formTitle: ReactNode;
      footerActions: ReactNode;
    })
  | {
      readOnly: true;
      view?: never;
      onViewChange?: never;
      formTitle?: never;
      footerActions?: never;
    };

export function MitigationProgressFlowDialog(props: MitigationProgressFlowDialogProps & MitigationProgressDialogMode) {
  const {
    open,
    onOpenChange,
    trigger,
    view = "detail",
    onViewChange,
    detailTitle,
    detailDescription,
    detailContent,
    detailAction,
    formTitle,
    formDescription = "Catat pelaksanaan tindakan penanganan untuk periode ini.",
    footerActions,
    reportTask,
    availabilityMessage,
    reportSent,
    submitError,
    dirty,
    submitting,
    onFormCancel,
    className,
    onCloseAutoFocus,
  } = props;
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const previousViewRef = useRef(view);
  useLayoutEffect(() => {
    if (open && previousViewRef.current !== view) titleRef.current?.focus();
    previousViewRef.current = view;
  }, [open, view]);

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

  const dueDate = reportTask ? new Date(reportTask.dueDate) : null;
  const heading = reportSent ? "Laporan penanganan terkirim" : detailTitle;

  const close = () => {
    setConfirmDiscard(false);
    onViewChange?.("detail");
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) onOpenChange(true);
    else if (!submitting && dirty) setConfirmDiscard(true);
    else if (!submitting) close();
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
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        onCloseAutoFocus={onCloseAutoFocus}
        ref={setModalElement}
        data-dynamic-height="true"
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0",
          className,
        )}
        showCloseButton={view === "form" && !submitting}
      >
        <DialogHeader className={cn("w-full shrink-0 gap-0.5 p-4 text-left", view === "form" && "pr-16")}>
          <DialogTitle ref={titleRef} tabIndex={-1} className="text-base outline-none">
            {view === "detail" ? heading : formTitle}
          </DialogTitle>
          <DialogDescription>
            {view === "form"
              ? formDescription
              : reportSent
                ? `Laporan ini menjadi bahan pemantauan periode ${reportTask?.periodLabel || "ini"}.`
                : detailDescription}
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
              <>
                {availabilityMessage && (
                  <p className="mb-4 text-sm text-muted-foreground">{availabilityMessage}</p>
                )}
                {detailContent}
              </>
            ) : (
              <div className="space-y-4">
                {reportTask && (
                  <div className="space-y-1 border-b border-border pb-3 pr-6">
                    <p className="wrap-break-word text-sm font-medium">
                      {reportTask.mitigationAction || "Tindakan penanganan"}
                    </p>
                    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <li>{reportTask.riskCode || "Kode risiko belum tersedia"}</li>
                      <li>Periode {reportTask.periodLabel || "belum tersedia"}</li>
                      {dueDate && Number.isFinite(dueDate.getTime()) && (
                        <li>
                          Tenggat{" "}
                          <time dateTime={reportTask.dueDate} data-date-time="">
                            {formatDisplayDate(dueDate, {
                              dateStyle: "medium",
                              timeZone: "Asia/Jakarta",
                            })}
                          </time>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
                <fieldset disabled={submitting} className="min-w-0">
                  {!props.readOnly && <MitigationProgressForm {...props} />}
                </fieldset>
                {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
              </div>
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
            disabled={submitting}
          >
            {view === "detail" ? "Tutup" : onFormCancel ? "Kembali ke detail" : "Tutup"}
          </CollectionDialogCancel>
          {view === "detail" ? detailAction : footerActions}
        </DialogFooter>
        <AlertDialog open={open && confirmDiscard} onOpenChange={setConfirmDiscard}>
          <AlertDialogContent onCloseAutoFocus={(event) => {
            event.preventDefault();
            titleRef.current?.focus();
          }}>
            <AlertDialogHeader>
              <AlertDialogTitle>Buang isian laporan?</AlertDialogTitle>
              <AlertDialogDescription>Catatan dan link bukti yang belum dikirim akan hilang.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Lanjut mengisi</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={close}>Buang isian</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

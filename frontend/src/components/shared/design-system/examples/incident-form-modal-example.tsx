"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon } from "@/components/shared/icons";

export function IncidentFormModalExample() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [occurredDate, setOccurredDate] = useState<Date>();
  const [modal, setModal] = useState<HTMLDivElement | null>(null);
  const [bodyContent, setBodyContent] = useState<HTMLDivElement | null>(null);
  const previousHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      previousHeight.current = null;
      return;
    }
    if (!modal || !bodyContent) return;

    const measure = () => {
      // DialogContent opens with a zoom transform; offsetHeight keeps the
      // layout measurement independent from that visual transform.
      const startHeight = modal.offsetHeight;
      const body = modal.querySelector<HTMLElement>('[data-slot="modal-body"]');
      const previousBodyFlex = body?.style.flex ?? "";
      const previousBodyOverflow = body?.style.overflow ?? "";
      modal.style.transition = "none";
      modal.style.height = "auto";
      modal.style.maxHeight = "none";
      if (body) {
        body.style.flex = "none";
        body.style.overflow = "visible";
      }
      const naturalHeight = modal.offsetHeight;
      const targetHeight = Math.min(naturalHeight, window.innerHeight - 16);
      if (body) {
        body.style.flex = previousBodyFlex;
        body.style.overflow = previousBodyOverflow;
      }
      modal.style.maxHeight = "";
      modal.style.height = previousHeight.current === null ? `${targetHeight}px` : `${startHeight}px`;
      void modal.offsetHeight;
      modal.style.transition = "";
      modal.style.height = `${targetHeight}px`;
      previousHeight.current = targetHeight;
    };

    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(bodyContent);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open, step, modal, bodyContent]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Lihat contoh modal</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          ref={setModal}
          data-dynamic-height="true"
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl"
        >
          <DialogHeader className="w-full shrink-0 gap-0.5 p-4 text-left">
            <DialogTitle>{step === 0 ? "Catat kejadian" : "Detail tambahan"}</DialogTitle>
            <DialogDescription>{step === 0 ? "Isi fakta utama sebelum melanjutkan." : "Lengkapi konteks yang tersedia."}</DialogDescription>
          </DialogHeader>
          <Separator />
          <div data-slot="modal-body" className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div ref={setBodyContent}>
              {step === 0 ? (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="modal-example-date">Tanggal kejadian</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button id="modal-example-date" type="button" variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon aria-hidden="true" data-icon="inline-start" />
                          {occurredDate ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(occurredDate) : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar mode="single" selected={occurredDate} onSelect={setOccurredDate} />
                      </PopoverContent>
                    </Popover>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="modal-example-description">Apa yang terjadi?</FieldLabel>
                    <Textarea id="modal-example-description" placeholder="Jelaskan kejadian secara faktual." />
                  </Field>
                </FieldGroup>
              ) : (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="modal-example-location">Lokasi</FieldLabel>
                    <Input id="modal-example-location" />
                  </Field>
                </FieldGroup>
              )}
            </div>
          </div>
          <Separator />
          <DialogFooter className="m-0 shrink-0 rounded-none border-0 bg-transparent p-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => step === 0 ? setOpen(false) : setStep(0)}>{step === 0 ? "Batal" : "Kembali"}</Button>
            <Button type="button" onClick={() => step === 0 ? setStep(1) : setOpen(false)}>{step === 0 ? "Lanjut" : "Selesai"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

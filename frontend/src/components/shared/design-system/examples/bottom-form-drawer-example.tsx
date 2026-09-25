"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon } from "@/components/shared/icons";
import { Textarea } from "@/components/ui/textarea";
import {
  bottomFormDrawerClassName,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/shared/app-drawer";

export function BottomFormDrawerExample() {
  const [open, setOpen] = useState(false);
  const [occurredDate, setOccurredDate] = useState<Date>();

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Lihat contoh drawer
      </Button>
      <Drawer direction="bottom" open={open} onOpenChange={setOpen} handleOnly>
        <DrawerContent
          dynamicHeight
          showCloseButton={false}
          className={bottomFormDrawerClassName}
        >
          <DrawerHeader className="w-full text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle>Catat kejadian</DrawerTitle>
            <DrawerDescription>Isi fakta utama sebelum melanjutkan.</DrawerDescription>
          </DrawerHeader>
          <Separator />
          <DrawerBody className="px-4 py-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="drawer-example-date">Tanggal kejadian</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="drawer-example-date"
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon aria-hidden="true" data-icon="inline-start" />
                      {occurredDate
                        ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(occurredDate)
                        : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar mode="single" selected={occurredDate} onSelect={setOccurredDate} />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel htmlFor="drawer-example-description">Apa yang terjadi?</FieldLabel>
                <Textarea id="drawer-example-description" placeholder="Jelaskan kejadian secara faktual." />
              </Field>
            </FieldGroup>
          </DrawerBody>
          <Separator />
          <DrawerFooter>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>Selesai</Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

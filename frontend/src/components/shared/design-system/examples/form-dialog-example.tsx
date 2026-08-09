"use client";

import { useState } from "react";

import {
  AccentButton,
  ActionButton,
} from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function FormDialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Open Form Dialog</Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] min-h-0 flex-col gap-0 overflow-hidden overscroll-contain rounded-2xl p-0 shadow-2xl sm:max-w-md">
        <form
          className="flex min-h-0 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <DialogHeader className="!-mx-0 !-mt-0 shrink-0 border-b border-border/60 bg-background px-6 py-5">
            <DialogTitle className="text-base font-semibold leading-tight tracking-tight text-foreground">
              Buat evaluasi
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-[38ch] text-sm leading-5 text-muted-foreground">
              Pilih organisasi dan periode untuk membuat draft evaluasi.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="space-y-2">
              <Label htmlFor="design-system-organization">Organisasi</Label>
              <Select defaultValue="pusat">
                <SelectTrigger id="design-system-organization" className="h-9 text-sm">
                  <SelectValue placeholder="Pilih organisasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pusat">Direktorat Jenderal</SelectItem>
                  <SelectItem value="regional">Unit Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="design-system-period">Periode</Label>
              <Select defaultValue="2026-H2">
                <SelectTrigger id="design-system-period" className="h-9 text-sm">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026-H1">2026 H1</SelectItem>
                  <SelectItem value="2026-H2">2026 H2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="!-mx-0 !-mb-0 shrink-0 border-t border-border/60 bg-muted/[0.18] px-6 py-4 sm:flex-row">
            <ActionButton
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full shadow-none sm:w-auto"
            >
              Batal
            </ActionButton>
            <AccentButton type="submit" className="w-full sm:w-auto">
              Buat draft
            </AccentButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

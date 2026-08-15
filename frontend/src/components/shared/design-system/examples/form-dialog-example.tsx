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
      <DialogContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-tight tracking-tight text-foreground">
              Buat evaluasi
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-[38ch]">
              Pilih organisasi dan periode untuk membuat draft evaluasi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
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

          <DialogFooter className="sm:flex-row">
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

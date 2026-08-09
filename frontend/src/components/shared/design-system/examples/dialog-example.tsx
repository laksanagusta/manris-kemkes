"use client";

import { useState } from "react";

import { CollectionDialogCancel } from "@/components/shared/design-system";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DialogExample() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent className="max-w-md rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="items-start gap-0 px-4 py-6 text-left">
            <DialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Hapus Draft Risiko?
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl bg-muted px-3 py-2 text-sm ring-1 ring-inset ring-border">
            <p className="font-medium">Contoh Item</p>
            <p className="text-xs text-muted-foreground">RISK-001</p>
          </div>
          <DialogFooter>
            <CollectionDialogCancel onClick={() => setDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <Button size="sm" onClick={() => setDialogOpen(false)}>
              Hapus Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm">Open AlertDialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl p-6 shadow-2xl">
          <AlertDialogHeader className="items-start gap-0 px-4 py-6 text-left">
            <AlertDialogTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Konfirmasi Pemantauan
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-2xl bg-muted p-3 ring-1 ring-inset ring-border">
            <div className="text-sm">
              <span className="font-medium text-foreground">Kode: </span>
              <span className="font-mono text-xs text-muted-foreground">RISK-001</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-foreground">Judul: </span>
              <span className="text-muted-foreground">Contoh Risiko</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" size="sm" className="shadow-none">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction size="sm">Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

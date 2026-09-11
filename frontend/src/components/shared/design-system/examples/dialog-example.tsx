"use client";

import { useState } from "react";

import { CollectionDialogCancel, DestructiveButton } from "@/components/shared/design-system";
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
        <DialogContent>
          <DialogHeader>
          <DialogTitle className="text-base">
              Hapus Draft Risiko?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-0.5 py-1 text-sm">
            <p className="font-medium">Contoh Item</p>
            <p className="text-xs text-muted-foreground">RISK-001</p>
          </div>
          <DialogFooter>
            <CollectionDialogCancel onClick={() => setDialogOpen(false)}>
              Batal
            </CollectionDialogCancel>
            <DestructiveButton
              onClick={() => setDialogOpen(false)}
            >
              Hapus
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm">Open AlertDialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Konfirmasi Pemantauan
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-xl bg-accent p-3 ring-1 ring-inset ring-border">
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
            <AlertDialogCancel variant="outline" size="md">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction variant="primary" size="primary">
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

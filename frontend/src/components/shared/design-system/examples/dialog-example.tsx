"use client";

import { useState } from "react";

import { CollectionDialogCancel, DestructiveButton } from "@/components/shared/design-system";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DialogExample() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-3">
      <Dialog open={referenceOpen} onOpenChange={setReferenceOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Contoh modal satu isian</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah referensi</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={(event) => {
            event.preventDefault();
            setReferenceOpen(false);
          }}>
            <div className="space-y-3">
              <DialogDescription>Tambahkan tautan sebagai referensi.</DialogDescription>
                <Input type="url" aria-label="Tautan referensi" placeholder="Masukkan URL referensi" className="px-3.5" required />
            </div>
            <DialogFooter>
              <Button type="submit">Tambah referensi</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">
              Hapus Draft Risiko?
            </DialogTitle>
            <DialogDescription>
              Draft yang dihapus tidak bisa dikembalikan.
            </DialogDescription>
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
            <AlertDialogDescription>
              Periksa detail risiko sebelum memulai pemantauan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 rounded-lg bg-accent p-3 ring-1 ring-inset ring-border">
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
            <AlertDialogCancel variant="outline" size="default">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction variant="default" size="default">
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

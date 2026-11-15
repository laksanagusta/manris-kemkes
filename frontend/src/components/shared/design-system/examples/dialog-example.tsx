"use client";

import { ActionConfirmationDialog } from "@/components/shared/design-system/actions/action-confirmation-dialog";
import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { useState } from "react";

import { CollectionDialogCancel, DestructiveButton } from "@/components/shared/design-system";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function DialogExample() {
  const [finalizeOpen, setFinalizeOpen] = useState(false);
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
          <Button size="sm">Contoh hapus draf</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-base">
              Hapus Draft Risiko?
            </DialogTitle>
            <DialogDescription>Periksa draf risiko yang akan dihapus.</DialogDescription>
          </DialogHeader>
          <ConfirmationConsequences variant="plain">
            Draf risiko beserta isinya akan dihapus permanen dan tidak dapat dipulihkan.
          </ConfirmationConsequences>
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

      <Button size="sm" onClick={() => setFinalizeOpen(true)}>Contoh finalisasi</Button>
      <ActionConfirmationDialog
        open={finalizeOpen} onOpenChange={setFinalizeOpen}
        title="Finalisasi profil?" description="Periksa seluruh penilaian sebelum finalisasi."
        confirmLabel="Finalisasi profil" onConfirm={() => undefined}
      >
        Anggota profil, penilaian, sasaran tertaut, dan rencana akan dikunci sebagai versi final. Perubahan berikutnya dibuat melalui revisi.
      </ActionConfirmationDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm">Contoh mulai pemantauan</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">
              Konfirmasi Pemantauan
            </AlertDialogTitle>
            <AlertDialogDescription>Periksa risiko sebelum memulai pemantauan.</AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmationConsequences>
            Draf pemantauan akan dibuat dari risiko ini. Rencana mitigasi sebelumnya disalin untuk ditinjau sebelum finalisasi.
          </ConfirmationConsequences>
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

"use client";

import { ProfilePeriodPicker, type ProfilePeriodSelection } from "@/components/upr/profile-period-picker";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@/components/shared/icons";
import { AccentButton, CollectionDialogCancel } from "@/components/shared/design-system";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function WorkingPaperCreateButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <AccentButton
      size="default"
      onClick={onClick}
      icon={<Plus className="size-3.5" strokeWidth={2.5} />}
    >
      Buat KK Pemantauan dan Reviu
    </AccentButton>
  );
}

export function WorkingPaperCreateDialog({
  open, onOpenChange, token, organizationId, observedAt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string | null;
  organizationId?: string | null;
  observedAt?: string;
}) {
  const router = useRouter();
  const [selection,setSelection] = useState<ProfilePeriodSelection | null>(null);
  return <Dialog open={open} onOpenChange={value=>{setSelection(null);onOpenChange(value);}}>
    <DialogContent showCloseButton={false}>
      <DialogHeader><DialogTitle>Pilih Profil Risiko Tahunan</DialogTitle><DialogDescription>Seluruh risiko dalam versi profil final yang dipilih otomatis masuk ke KK. Pilih periode sesuai rules profil.</DialogDescription></DialogHeader>
      {open && token && organizationId ? <ProfilePeriodPicker token={token} organizationId={organizationId} process="workingPaper" onChange={setSelection} /> : <p className="text-sm text-muted-foreground">Akun perlu terhubung ke unit kerja.</p>}
      <DialogFooter>
        <CollectionDialogCancel type="button" onClick={()=>{setSelection(null);onOpenChange(false);}}>Batal</CollectionDialogCancel>
        <AccentButton type="button" disabled={!selection} onClick={()=>{
          if(!selection || !organizationId) return;
          if(selection.existingRecordId){
            const id=selection.existingRecordId;setSelection(null);onOpenChange(false);router.push(`/risk/working-papers/${id}`);return;
          }
          const query=new URLSearchParams({profile_version_id:selection.profileVersionId,org_id:organizationId});
          if(selection.monitoringPeriodId) query.set('monitoring_period_id',selection.monitoringPeriodId);
          if(selection.observedAt || observedAt) query.set('observation_cutoff',selection.observedAt || observedAt!);
          setSelection(null);onOpenChange(false);router.push(`/risk/working-papers/new?${query}`);
        }}>Lanjutkan</AccentButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

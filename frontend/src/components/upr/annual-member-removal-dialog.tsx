"use client";

import { useId, useState } from "react";
import { ConfirmationConsequences } from "@/components/shared/design-system/actions/confirmation-consequences";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AnnualMember, AnnualMemberExclusionInput } from "@/lib/api/upr-workflow";
import { WorkflowError, workflowError } from "./workflow-ui";

export function AnnualMemberRemovalDialog({
  member,
  pending,
  close,
  remove,
}: {
  member: AnnualMember;
  pending: boolean;
  close: () => void;
  remove: (input?: AnnualMemberExclusionInput) => Promise<void>;
}) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const inherited = member.fromPreviousVersion;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) close(); }}>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Keluarkan risiko dari profil?</DialogTitle>
          <DialogDescription>{member.code} · {member.title}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (pending || (inherited && !reason.trim())) return;
            setError("");
            try {
              await remove(inherited ? { changeReason: reason.trim() } : undefined);
              close();
            } catch (cause) {
              setError(workflowError(cause));
            }
          }}
        >
          {!inherited && (
            <ConfirmationConsequences>
              Risiko dikeluarkan dari draf ini. Risiko tetap tersimpan di
              Register dan dapat ditambahkan kembali.
            </ConfirmationConsequences>
          )}
          {inherited && (
            <div className="space-y-2">
              <Label htmlFor={`${id}-reason`}>Alasan pengeluaran</Label>
              <Textarea
                id={`${id}-reason`}
                placeholder="Catat alasan berdasarkan hasil reviu"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={2000}
                disabled={pending}
                required
              />
            </div>
          )}
          {error && <WorkflowError message={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={close}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || Boolean(inherited && !reason.trim())}
            >
              {pending ? "Menyimpan…" : inherited ? "Terapkan" : "Keluarkan dari profil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

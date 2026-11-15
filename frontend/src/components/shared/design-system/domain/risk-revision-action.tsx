"use client";

import Link from "next/link";
import { ApiError } from "@/lib/api";
import { FieldHeading } from "@/components/ui/field";
import { useId, useRef, useState, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { startRiskRevision, type StartRiskRevisionResponse } from "@/lib/api/risk-monitoring";

export function RiskRevisionAction({ token, riskId, disabled, disabledReason, draftHref, onStarted, onConflict, start = startRiskRevision }: {
  token: string;
  riskId: string;
  disabled?: boolean;
  disabledReason?: string;
  draftHref?: string;
  onConflict?: () => void;
  onStarted: (result: StartRiskRevisionResponse) => void;
  start?: typeof startRiskRevision;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const canSubmit = reason.trim().length >= 10;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || disabled || !canSubmit) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await start(token, riskId, { changeReason: reason.trim() });
      onStarted(result);
      setReason("");
      setOpen(false);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) onConflict?.();
      setError(cause instanceof Error ? cause.message : "Draf revisi belum berhasil dibuat. Coba lagi.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (draftHref) {
    return disabled
      ? <Button variant="outline" disabled title={disabledReason}>Lanjutkan revisi</Button>
      : <Button variant="outline" asChild><Link href={draftHref}>Lanjutkan revisi</Link></Button>;
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!inFlight.current) setOpen(next); }}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} title={disabledReason}>Revisi</Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Revisi profil risiko</DialogTitle>
          <DialogDescription>Buka draf untuk mengubah substansi risiko dan rencana mitigasi. Versi baru berlaku setelah finalisasi.</DialogDescription>
        </DialogHeader>
        <form id={id} className="space-y-2" onSubmit={handleSubmit}>
          <FieldHeading>
            <Label htmlFor={`${id}-reason`}>Alasan revisi</Label>
            <p id={`${id}-hint`} className="leading-4 text-xs text-muted-foreground">Jelaskan perubahan yang diperlukan, minimal 10 karakter.</p>
          </FieldHeading>
          <Textarea
            id={`${id}-reason`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            minLength={10}
            maxLength={1000}
            required
            disabled={pending}
            aria-describedby={`${id}-hint`}
          />

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Batal</Button>
          <Button form={id} type="submit" disabled={disabled || pending || !canSubmit} aria-busy={pending}>
            {pending ? "Menyiapkan…" : "Buka draf revisi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

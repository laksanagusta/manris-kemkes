"use client";

import { useState, type ReactNode } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmationConsequences } from "./confirmation-consequences";

export function ActionConfirmationDialog({
  open, onOpenChange, title, description, children, confirmLabel,
  variant = "default", onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  confirmLabel: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | boolean | Promise<void | boolean>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (pending) return;
      setError("");
      onOpenChange(next);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <ConfirmationConsequences>{children}</ConfirmationConsequences>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction variant={variant} disabled={pending} onClick={async (event) => {
            event.preventDefault();
            if (pending) return;
            setPending(true);
            setError("");
            try {
              if (await onConfirm() !== false) onOpenChange(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Tindakan belum berhasil. Coba lagi.");
            } finally {
              setPending(false);
            }
          }}>
            {pending ? "Memproses…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

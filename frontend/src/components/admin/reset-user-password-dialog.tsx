"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ConfirmationConsequences } from "@/components/shared/design-system";
import { Copy } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { resetUserPassword, type PasswordResetResult, type UserListItem } from "@/lib/api/users";
import { createDisplayDateFormatter } from "@/lib/display-date";

export function ResetUserPasswordDialog({
  user,
  token,
  onClose,
}: {
  user: UserListItem;
  token: string;
  onClose: () => void;
}) {
  const formId = useId();
  const passwordId = useId();
  const outputId = useId();
  const outputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PasswordResetResult | null>(null);
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    if (result) outputRef.current?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || result) return;
    setError("");
    setPending(true);
    try {
      setResult(await resetUserPassword(token, user.id, currentPassword));
      setCurrentPassword("");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429
        ? "Terlalu banyak percobaan. Tunggu satu menit sebelum mencoba lagi."
        : err instanceof ApiError && err.status >= 500
          ? "Hasil reset belum dapat dipastikan. Coba lagi untuk membuat password sementara baru."
          : err instanceof ApiError ? err.message : "Koneksi terputus. Coba lagi untuk membuat password sementara baru.");
    } finally {
      setPending(false);
    }
  }

  async function copyPassword() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopyStatus("Password sementara disalin.");
    } catch {
      outputRef.current?.select();
      setCopyStatus("Salin password sementara dari kolom.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          const trigger = document.getElementById(`user-actions-${user.id}`);
          if (!trigger) return;
          event.preventDefault();
          trigger.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{result ? "Password sementara siap" : "Reset password"}</DialogTitle>
          <DialogDescription>
            {user.name}{user.nip ? ` · NIP ${user.nip}` : ""}
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="flex flex-col gap-4">
            <ConfirmationConsequences>
              Sampaikan password ini secara langsung kepada pengguna sebelum menutup dialog. Password berlaku hingga{" "}
              {createDisplayDateFormatter("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Jakarta",
              }).format(new Date(result.expiresAt))} WIB.
            </ConfirmationConsequences>
            <Field className="gap-2">
              <FieldLabel htmlFor={outputId}>Password sementara</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Input ref={outputRef} id={outputId} value={result.temporaryPassword} readOnly className="min-w-0 flex-1 font-mono" />
                <Button type="button" variant="outline" onClick={copyPassword}>
                  <Copy data-icon="inline-start" aria-hidden="true" />
                  Salin
                </Button>
              </div>
              <span role="status" className="text-xs text-muted-foreground">{copyStatus}</span>
            </Field>
          </div>
        ) : (
          <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
            <ConfirmationConsequences>
              Semua sesi pengguna akan berakhir. Pengguna harus masuk dengan password sementara dan membuat password baru dalam 24 jam.
            </ConfirmationConsequences>
            {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
            <Field className="gap-2">
              <FieldLabel htmlFor={passwordId}>Password Super Admin Anda</FieldLabel>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                disabled={pending}
              />
            </Field>
          </form>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            {result ? "Tutup" : "Batal"}
          </Button>
          {!result && (
            <Button type="submit" form={formId} disabled={pending} aria-busy={pending}>
              {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
              {pending ? "Memproses..." : "Reset password"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

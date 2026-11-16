"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api";
import { requestEmailVerification } from "@/lib/api/auth";

export function RecoveryEmailSettings() {
  const { user, token, refreshProfile } = useAuth();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [requestedFor, setRequestedFor] = useState("");
  const [error, setError] = useState("");
  const email = user?.email ?? "";
  const verified = user?.emailVerified === true;
  const awaitingVerification = !verified && !!requestedFor && requestedFor === email;

  useEffect(() => {
    if (!token) return;
    let request: AbortController | undefined;
    const refresh = () => {
      request?.abort();
      request = new AbortController();
      void refreshProfile(request.signal).catch(() => {});
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      request?.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [refreshProfile, token]);

  function changeOpen(next: boolean) {
    if (!next && pending) return;
    setError("");
    setOpen(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) return;
    const password = String(new FormData(event.currentTarget).get("currentPassword") ?? "");
    setError("");
    setPending(true);
    try {
      await requestEmailVerification(token, password);
      setRequestedFor(email);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.status === 429 ? "Terlalu banyak percobaan. Coba lagi dalam satu menit." : err.message
        : "Koneksi terputus. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  if (!user) return null;
  return (
    <>
      <Separator />
      <div className="grid gap-4 py-4 md:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] md:items-start">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Email pemulihan</h3>
          <p className="text-xs text-muted-foreground">Untuk reset password dari halaman masuk.</p>
        </div>
        <div className="flex min-w-0 flex-col items-start gap-2 md:items-end">
          <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
            <span className="min-w-0 break-all text-sm">{email || "Isi email di pengaturan Akun"}</span>
            {email && <Badge variant={verified ? "outline" : "secondary"}>{verified ? "Terverifikasi" : "Belum terverifikasi"}</Badge>}
          </div>
          {awaitingVerification && (
            <p role="status" className="text-xs text-muted-foreground md:text-right">
              Permintaan pengiriman diterima. Periksa kotak masuk dan folder spam untuk tautan verifikasi.
            </p>
          )}
          {!verified && email && (
            <Dialog open={open} onOpenChange={changeOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">
                  {awaitingVerification ? "Kirim ulang tautan" : "Verifikasi email"}
                </Button>
              </DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Verifikasi email</DialogTitle>
                  <DialogDescription>Konfirmasi password saat ini untuk mengirim tautan ke {email}.</DialogDescription>
                </DialogHeader>
                <form id={`verify-email-${id}`} onSubmit={submit} className="flex flex-col gap-4">
                  {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
                  <Field className="gap-2">
                    <FieldLabel htmlFor={`email-password-${id}`}>Password saat ini</FieldLabel>
                    <Input id={`email-password-${id}`} name="currentPassword" type="password" autoComplete="current-password" required disabled={pending} />
                  </Field>
                </form>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => changeOpen(false)} disabled={pending}>Batal</Button>
                  <Button type="submit" form={`verify-email-${id}`} disabled={pending} aria-busy={pending}>
                    {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
                    {pending ? "Memproses..." : "Kirim tautan verifikasi"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </>
  );
}

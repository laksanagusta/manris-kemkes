"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ComponentProps, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { ArrowRight } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { VerificationDeliveryStatusPanel } from "@/components/verification-delivery-status";
import { ApiError } from "@/lib/api";
import { confirmEmailVerification, requestPasswordReset, resendRegistrationVerification, resetPasswordByEmail } from "@/lib/api/auth";

const footerLink = "font-medium text-foreground underline-offset-4 hover:underline";
const recoveryHelp = "/docs/account-access#reset-password";

function RecoveryCard({ title, description, footer, children }: {
  title: string;
  description: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main data-motion-page className="grid min-h-svh place-items-center bg-muted/50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-[400px]">
        <AuthCard title={title} description={description} footer={
          <>
            <a href="/login" className={footerLink}>Kembali ke halaman masuk</a>
            {footer}
          </>
        }>
          {children}
        </AuthCard>
      </div>
    </main>
  );
}

function CredentialInput(props: ComponentProps<typeof Input>) {
  return (
    <Input {...props} data-field-outline="outer" data-autofill-surface="white"
      className="h-11 rounded-control bg-white text-neutral-900 placeholder:text-neutral-500 dark:bg-white" />
  );
}

function RecoverySubmit({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending || disabled} aria-busy={pending}>
      {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {pending ? "Memproses..." : children}
      {!pending && <ArrowRight data-icon="inline-end" aria-hidden="true" />}
    </Button>
  );
}

function actionError(error: unknown) {
  if (error instanceof ApiError && error.status === 429) {
    return "Terlalu banyak percobaan. Tunggu satu menit dan coba lagi.";
  }
  return error instanceof ApiError ? error.message : "Koneksi terputus. Silakan coba lagi.";
}

export function ForgotPasswordScreen() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const help = <Link href={recoveryHelp} className={footerLink}>Bantuan pemulihan akun</Link>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const nip = String(new FormData(event.currentTarget).get("nip") ?? "").trim();
    setError("");
    setPending(true);
    try {
      await requestPasswordReset(nip);
      setSent(true);
    } catch (err) {
      setError(actionError(err));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <RecoveryCard title="Periksa email" description="Jika NIP cocok dengan akun aktif dan emailnya telah terverifikasi, tautan reset akan dikirim." footer={help}>
        <Alert role="status">
          <AlertDescription>Periksa folder spam jika email belum terlihat. Tautan berlaku 30 menit.</AlertDescription>
        </Alert>
      </RecoveryCard>
    );
  }

  return (
    <RecoveryCard title="Lupa password?" description="Masukkan NIP untuk meminta tautan reset ke email akun yang telah terverifikasi." footer={help}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
        <Field className="gap-1.5">
          <FieldLabel htmlFor="recovery-nip">NIP</FieldLabel>
          <CredentialInput id="recovery-nip" name="nip" autoComplete="username" inputMode="numeric" maxLength={64} required />
        </Field>
        <RecoverySubmit pending={pending}>Kirim tautan reset</RecoverySubmit>
      </form>
    </RecoveryCard>
  );
}

export function ResendRegistrationVerificationScreen() {
  const [pending, setPending] = useState<"resend" | "status" | null>(null);
  const [result, setResult] = useState<{ deliveryId?: string } | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    const statusOnly = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "status";
    setError("");
    setPending(statusOnly ? "status" : "resend");
    try {
      const response = await resendRegistrationVerification(
        String(form.get("nip") ?? "").trim(),
        String(form.get("password") ?? ""),
        statusOnly,
      );
      setResult({ deliveryId: response.deliveryId });
    } catch (err) {
      setError(actionError(err));
    } finally {
      setPending(null);
    }
  }

  if (result) {
    return (
      <RecoveryCard title="Status pengiriman verifikasi" description="Pengiriman tautan menggunakan alamat email yang Anda daftarkan.">
        <div className="flex flex-col gap-4">
          {result.deliveryId ? (
            <VerificationDeliveryStatusPanel deliveryId={result.deliveryId} />
          ) : (
            <Alert role="status">
              <AlertDescription>Belum ada status pengiriman yang bisa ditampilkan. Jika email sudah terverifikasi, tunggu persetujuan Super Admin.</AlertDescription>
            </Alert>
          )}
          <Button type="button" variant="outline" onClick={() => setResult(null)}>Kembali ke formulir</Button>
        </div>
      </RecoveryCard>
    );
  }

  return (
    <RecoveryCard title="Kirim ulang tautan verifikasi" description="Masukkan NIP dan password yang Anda gunakan saat mendaftar.">
      <form onSubmit={submit} className="flex flex-col gap-5">
        {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
        <Field className="gap-1.5">
          <FieldLabel htmlFor="registration-nip">NIP</FieldLabel>
          <CredentialInput id="registration-nip" name="nip" autoComplete="username" inputMode="numeric" maxLength={64} required />
        </Field>
        <Field className="gap-1.5">
          <FieldLabel htmlFor="registration-password">Password</FieldLabel>
          <CredentialInput id="registration-password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <RecoverySubmit pending={pending === "resend"} disabled={pending === "status"}>Kirim tautan verifikasi</RecoverySubmit>
        <Button type="submit" value="status" variant="outline" className="h-11 w-full" disabled={pending !== null} aria-busy={pending === "status"}>
          {pending === "status" && <Spinner data-icon="inline-start" aria-hidden="true" />}
          {pending === "status" ? "Memeriksa…" : "Cek status pengiriman"}
        </Button>
      </form>
    </RecoveryCard>
  );
}

function subscribeToFragment(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function readEmailToken() {
  return new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
}

function useEmailToken() {
  return useSyncExternalStore(subscribeToFragment, readEmailToken, () => null);
}

function clearEmailToken() {
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
}

type VerificationOutcome = { token: string; attempt: number } & (
  | { status: "verified"; pendingApproval: boolean }
  | { status: "invalid" }
  | { status: "failed"; message: string }
);

export function VerifyEmailScreen() {
  const token = useEmailToken();
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<VerificationOutcome | null>(null);
  const request = useRef<{
    token: string;
    attempt: number;
    response: ReturnType<typeof confirmEmailVerification>;
  } | null>(null);

  useEffect(() => {
    if (!token) return;

    let active = true;
    // Reuse the same POST when React reruns the effect for an already submitted token.
    if (request.current?.token !== token || request.current.attempt !== attempt) {
      request.current = { token, attempt, response: confirmEmailVerification(token) };
    }
    void request.current.response.then((result) => {
      if (!active || readEmailToken() !== token) return;
      setOutcome({ token, attempt, status: "verified", pendingApproval: result.pendingApproval === true });
      clearEmailToken();
    }).catch((err: unknown) => {
      if (!active || readEmailToken() !== token) return;
      setOutcome(err instanceof ApiError && err.type === "INVALID_EMAIL_TOKEN"
        ? { token, attempt, status: "invalid" }
        : { token, attempt, status: "failed", message: actionError(err) });
    });
    return () => { active = false; };
  }, [attempt, token]);

  if (outcome?.status === "verified" && (token === "" || outcome.token === token)) {
    return (
      <RecoveryCard title="Email terverifikasi"
        description={outcome.pendingApproval
          ? "Registrasi Anda sekarang menunggu persetujuan Super Admin. Anda bisa masuk setelah akun disetujui."
          : "Anda sekarang dapat memakai email ini untuk memulihkan password."} />
    );
  }

  const currentOutcome = outcome?.token === token && outcome.attempt === attempt ? outcome : null;
  if (token === "" || currentOutcome?.status === "invalid") {
    return (
      <RecoveryCard title="Tautan tidak dapat digunakan"
        description="Untuk verifikasi akun yang sudah aktif, minta tautan baru dari Pengaturan → Keamanan.">
        <Button asChild className="h-11 w-full">
          <Link href="/verify-email/resend">Kirim ulang tautan registrasi</Link>
        </Button>
      </RecoveryCard>
    );
  }

  if (currentOutcome?.status === "failed") {
    return (
      <RecoveryCard title="Verifikasi belum berhasil" description="Coba verifikasi ulang dengan tautan ini.">
        <div className="flex flex-col gap-4">
          <Alert variant="destructive" role="alert"><AlertDescription>{currentOutcome.message}</AlertDescription></Alert>
          <Button type="button" className="h-11 w-full" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</Button>
        </div>
      </RecoveryCard>
    );
  }

  return (
    <RecoveryCard title="Verifikasi email" description="Tunggu sebentar selagi Manrisk memverifikasi alamat email Anda.">
      <p role="status" className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden="true" /> Memverifikasi email…
      </p>
    </RecoveryCard>
  );
}

export function ResetPasswordScreen() {
  const token = useEmailToken();
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || pending) return;
    setError("");
    const fields = new FormData(event.currentTarget);
    const password = String(fields.get("newPassword") ?? "");
    const confirmation = String(fields.get("confirmPassword") ?? "");
    if (Array.from(password).length < 8 || new TextEncoder().encode(password).length > 72 || password !== confirmation) {
      setError(password !== confirmation ? "Konfirmasi harus sama dengan password baru." : "Gunakan minimal 8 karakter dan maksimal 72 byte.");
      return;
    }

    setPending(true);
    try {
      await resetPasswordByEmail(token, password, confirmation);
      setComplete(true);
      clearEmailToken();
    } catch (err) {
      if (err instanceof ApiError && err.type === "INVALID_EMAIL_TOKEN") setInvalid(true);
      else setError(actionError(err));
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <RecoveryCard title="Password berhasil diganti"
        description="Semua sesi sebelumnya telah berakhir. Masuk dengan password baru Anda." />
    );
  }

  if (invalid || token === "") {
    return (
      <RecoveryCard title="Tautan tidak dapat digunakan"
        description="Tautan mungkin kedaluwarsa, sudah digunakan, atau tidak lengkap. Minta tautan reset baru.">
        <Button asChild className="h-11 w-full"><Link href="/forgot-password">Minta tautan baru</Link></Button>
      </RecoveryCard>
    );
  }

  return (
    <RecoveryCard title="Buat password baru" description="Gunakan password baru untuk masuk lagi ke Manrisk.">
      {token === null ? <Spinner aria-label="Memuat tautan" /> : (
        <form onSubmit={submit} className="flex flex-col gap-5">
          {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
          <FieldGroup className="gap-4">
            <Field className="gap-1.5">
              <FieldLabel htmlFor="recovery-password">Password baru</FieldLabel>
              <CredentialInput id="recovery-password" name="newPassword" type="password" autoComplete="new-password" aria-describedby="recovery-password-help" required />
              <FieldDescription id="recovery-password-help">Minimal 8 karakter.</FieldDescription>
            </Field>
            <Field className="gap-1.5">
              <FieldLabel htmlFor="recovery-confirmation">Konfirmasi password baru</FieldLabel>
              <CredentialInput id="recovery-confirmation" name="confirmPassword" type="password" autoComplete="new-password" required />
            </Field>
          </FieldGroup>
          <RecoverySubmit pending={pending}>Simpan password baru</RecoverySubmit>
        </form>
      )}
    </RecoveryCard>
  );
}

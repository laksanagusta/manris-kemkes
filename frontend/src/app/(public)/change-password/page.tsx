"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";

export default function ChangePasswordPage() {
  const router = useRouter();
  const {
    changePassword,
    completeFirstPasswordChange,
    isAuthenticated,
    loading,
    requiresPasswordChange,
  } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSetupFlow = requiresPasswordChange;

  const getErrorMessage = (error: unknown) => {
    return error instanceof Error
      ? error.message
      : "Gagal memperbarui password. Silakan coba lagi.";
  };

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if ((!isSetupFlow && !currentPassword) || !newPassword || !confirmPassword) {
      setError("Isi password baru dan konfirmasi password terlebih dahulu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password harus sama dengan password baru.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = isSetupFlow
        ? await completeFirstPasswordChange(newPassword, confirmPassword)
        : await changePassword(currentPassword, newPassword, confirmPassword);

      router.replace(isSetupFlow ? result.redirectTo : "/account");
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-primary/5 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-muted-foreground/5 blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute left-[20%] top-[60%] h-[40%] w-[40%] rounded-full bg-foreground/5 blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in">
        <div className="mb-8 text-center">
          <Image src="/logo.svg" alt="MANRIS logo" width={44} height={44} className="mx-auto" />
          <h1 className="text-xl font-semibold">MANRIS</h1>
          <p className="text-muted-foreground">
            {isSetupFlow
              ? "Aktivasi akun pada login pertama"
              : "Kelola keamanan akun Anda"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSetupFlow ? "Ubah Password Sementara" : "Ubah Password"}</CardTitle>
            <CardDescription>
              {isSetupFlow
                ? "Password baru wajib dibuat sebelum Anda dapat mengakses dashboard dan menu aplikasi."
                : "Perbarui password akun dengan memasukkan password saat ini terlebih dahulu."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
              {error && (
                <Alert variant="destructive" aria-live="polite"><AlertDescription>{error}</AlertDescription></Alert>
              )}

              {!isSetupFlow && (
                <Field>
                  <FieldLabel htmlFor="current-password">
                    Password Saat Ini
                  </FieldLabel>
                  <Input
                    id="current-password"
                    type="password"
                    placeholder="masukkan password saat ini"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="new-password">
                  Password Baru
                </FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="minimal 8 karakter"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">
                  Konfirmasi Password Baru
                </FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="ulangi password baru"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </Field>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {isSubmitting ? "Memproses..." : "Simpan Password Baru"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                {isSetupFlow
                  ? "Setelah berhasil, sesi setup akan ditukar menjadi sesi penuh dan Anda akan diarahkan ke overview."
                  : "Setelah berhasil, Anda akan kembali ke halaman account."}
              </p>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

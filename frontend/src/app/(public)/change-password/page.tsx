"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function ChangePasswordPage() {
  const router = useRouter();
  const {
    completeFirstPasswordChange,
    isAuthenticated,
    loading,
    postAuthRedirectPath,
    requiresPasswordChange,
  } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!requiresPasswordChange) {
      router.replace(postAuthRedirectPath);
    }
  }, [isAuthenticated, loading, postAuthRedirectPath, requiresPasswordChange, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
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
      const result = await completeFirstPasswordChange(newPassword, confirmPassword);
      router.replace(result.redirectTo);
    } catch (error: unknown) {
      setError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !isAuthenticated || !requiresPasswordChange) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-primary/5 blur-3xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-chart-4/5 blur-3xl animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute left-[20%] top-[60%] h-[40%] w-[40%] rounded-full bg-chart-2/5 blur-3xl animate-[pulse_12s_ease-in-out_infinite_4s]" />
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
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 p-2.5">
            <Image src="/logo.svg" alt="MANRIS logo" width={44} height={44} className="object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="gradient-text">MANRIS</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aktivasi akun pada login pertama
          </p>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Ubah Password Sementara
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Password baru wajib dibuat sebelum Anda dapat mengakses dashboard dan menu aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div aria-live="polite" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password" className="text-xs font-medium">
                  Password Baru
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="minimal 8 karakter"
                  className="h-10 border-border/50 bg-muted/30 focus-visible:ring-primary/30"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password" className="text-xs font-medium">
                  Konfirmasi Password Baru
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="ulangi password baru"
                  className="h-10 border-border/50 bg-muted/30 focus-visible:ring-primary/30"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="h-10 w-full gap-2 text-sm font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Simpan Password Baru
                    <ArrowRight data-icon="inline-end" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Setelah berhasil, sesi setup akan ditukar menjadi sesi penuh dan Anda akan diarahkan ke overview.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

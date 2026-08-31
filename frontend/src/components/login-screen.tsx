"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "@/components/ui/icons";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { login, isAuthenticated, loading, postAuthRedirectPath } = useAuth();

  const getErrorMessage = (err: unknown) => {
    return err instanceof Error
      ? err.message
      : "Login gagal. Periksa kredensial Anda.";
  };

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace(postAuthRedirectPath);
    }
  }, [isAuthenticated, loading, postAuthRedirectPath, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login(nip, password);
      router.replace(result.redirectTo);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-x-hidden overflow-y-auto bg-background antialiased">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="motion-safe:animate-[pulse_8s_ease-in-out_infinite] absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-primary/5 blur-3xl" />
        <div className="motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s] absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-muted-foreground/5 blur-3xl" />
        <div className="motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s] absolute left-[20%] top-[60%] h-[40%] w-[40%] rounded-full bg-foreground/5 blur-3xl" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 motion-safe:animate-fade-in">
        <Card className="bg-card">
          <CardHeader className="items-center justify-items-center gap-3 pb-4 text-center">
            <Image
              src="/logo.svg"
              alt="MANRIS logo"
              width={48}
              height={48}
              priority
              className="size-12 object-contain"
            />
            <CardTitle className="text-base font-semibold tracking-tight text-balance">
              Masuk ke Manris
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive"
                >
                  {error}
                </div>
              )}
              <div className="flex w-full flex-col items-stretch gap-2 text-left">
                <Label htmlFor="nip" className="text-xs font-medium">
                  NIP
                </Label>
                <Input
                  id="nip"
                  name="nip"
                  placeholder="masukkan NIP"
                  autoComplete="username"
                  inputMode="numeric"
                  className="h-10 border-input bg-muted/30 focus-visible:ring-primary/30"
                  required
                  value={nip}
                  onChange={(event) => setNip(event.target.value)}
                />
              </div>

              <div className="flex w-full flex-col items-stretch gap-2 text-left">
                <div className="flex flex-col items-start gap-1">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Hubungi administrator jika perlu reset
                  </span>
                </div>
                <div className="relative w-full">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="masukkan password"
                    autoComplete="current-password"
                    className="h-10 border-input bg-muted/30 pr-10 focus-visible:ring-primary/30"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Sembunyikan password" : "Tampilkan password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-0 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="primary"
                className="w-full"
                disabled={isLoading}
                aria-busy={isLoading}
                aria-label={isLoading ? "Memproses login" : undefined}
              >
                {isLoading ? (
                  <div
                    className="motion-safe:animate-spin size-4 rounded-full border-2 border-primary-foreground border-t-transparent"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="inline-flex items-center justify-center gap-[6px]">
                    <span>Masuk</span>
                    <ArrowRight data-icon="inline-end" className="translate-y-px" />
                  </span>
                )}
              </Button>
              <div className="flex justify-center">
                <Link
                  href="/panduan-risiko"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Panduan
                </Link>
                <span className="mx-2 text-muted-foreground/40">•</span>
                <Link
                  href="/register"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Daftar akun
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-pretty text-muted-foreground/60">
            Kementerian Kesehatan RI · Ditjen Penanggulangan Penyakit
          </p>
          <p className="mt-1 text-[10px] text-pretty text-muted-foreground/40">
            Tim Kerja Manajemen Risiko Reformasi Birokrasi dan Monev
          </p>
        </div>
      </div>
    </div>
  );
}

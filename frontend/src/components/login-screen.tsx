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
          <Image
            src="/logo.svg"
            alt="MANRIS logo"
            width={48}
            height={48}
            priority
            className="mx-auto size-12 object-contain"
          />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle>Masuk ke Akun Anda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div
                  aria-live="polite"
                  className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="nip" className="text-xs font-medium">
                  NIP
                </Label>
                <Input
                  id="nip"
                  placeholder="masukkan NIP"
                  className="h-10 border-border/50 bg-muted/30 focus-visible:ring-primary/30"
                  required
                  value={nip}
                  onChange={(event) => setNip(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium">
                    Password
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Hubungi administrator jika perlu reset
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="masukkan password"
                    className="h-10 border-border/50 bg-muted/30 pr-10 focus-visible:ring-primary/30"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
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
              >
                {isLoading ? (
                  <div className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Masuk
                    <ArrowRight data-icon="inline-end" />
                  </>
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
          <p className="text-xs text-muted-foreground/60">
            Kementerian Kesehatan RI · Ditjen Penanggulangan Penyakit
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/40">
            Tim Kerja Manajemen Risiko Reformasi Birokrasi dan Monev
          </p>
        </div>
      </div>
    </div>
  );
}

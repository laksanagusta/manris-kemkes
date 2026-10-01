"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "@/components/shared/icons";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { login, isAuthenticated, loading, postAuthRedirectPath } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace(postAuthRedirectPath);
  }, [isAuthenticated, loading, postAuthRedirectPath, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = await login(nip, password);
      router.replace(result.redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal. Periksa kredensial Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-x-hidden overflow-y-auto bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="motion-safe:animate-[pulse_8s_ease-in-out_infinite] absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-primary/5 blur-3xl" />
        <div className="motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s] absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-muted-foreground/5 blur-3xl" />
        <div className="motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s] absolute left-[20%] top-[60%] h-[40%] w-[40%] rounded-full bg-foreground/5 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.02]" aria-hidden="true" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      <div className="relative w-full max-w-md px-4 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-6">
          <header className="flex flex-col items-center gap-4 text-center">
            <span className="font-logo text-[24px] leading-6 font-semibold lowercase tracking-[-0.4px] text-tertiary-foreground underline decoration-dashed decoration-2 underline-offset-4">Manris</span>
            <h1 className="text-base leading-5 font-medium tracking-tight text-balance">Masuk untuk melanjutkan</h1>
          </header>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup className="gap-2">
              {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
              <Field>
                <FieldLabel htmlFor="nip" className="sr-only">NIP</FieldLabel>
                <Input id="nip" name="nip" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" placeholder="Masukkan NIP" autoComplete="username" inputMode="numeric" required value={nip} onChange={(event) => setNip(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="sr-only">Password</FieldLabel>
                <InputGroup className="h-11 bg-white dark:bg-white dark:text-neutral-900">
                  <InputGroupInput id="password" name="password" type={showPassword ? "text" : "password"} className="h-11 bg-transparent dark:bg-transparent dark:text-neutral-900 dark:placeholder:text-neutral-500" placeholder="Masukkan password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                  <InputGroupAddon align="inline-end" className="py-0">
                    <InputGroupButton aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} size="icon-xs" className="h-11 w-11 hover:bg-transparent hover:text-inherit">
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription className="text-xs text-tertiary-foreground">Hubungi administrator jika perlu reset</FieldDescription>
              </Field>
            </FieldGroup>
            <div className="flex flex-col gap-1">
              <Button type="submit" className="h-11 w-full rounded-full" disabled={isLoading} aria-busy={isLoading}>
                {isLoading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {isLoading ? "Memproses..." : "Masuk"}
              </Button>
              <nav className="flex" aria-label="Bantuan akun">
                <Button asChild variant="outline" className="h-11 w-full rounded-full"><Link href="/register">Daftar akun</Link></Button>
              </nav>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

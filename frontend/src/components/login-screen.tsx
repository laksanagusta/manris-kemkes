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
          <h1 className="text-center text-xl font-semibold">Masuk ke Manris</h1>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
              <Field>
                <FieldLabel htmlFor="nip">NIP</FieldLabel>
                <Input id="nip" name="nip" className="h-9 bg-white dark:bg-white" placeholder="Masukkan NIP" autoComplete="username" inputMode="numeric" required value={nip} onChange={(event) => setNip(event.target.value)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <FieldDescription>Hubungi administrator jika perlu reset</FieldDescription>
                <InputGroup className="h-9 bg-white dark:bg-white">
                  <InputGroupInput id="password" name="password" type={showPassword ? "text" : "password"} className="h-9 bg-transparent dark:bg-transparent" placeholder="Masukkan password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)} size="icon-xs">
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Button type="submit" className="h-9 w-full rounded-full" disabled={isLoading} aria-busy={isLoading}>
                {isLoading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {isLoading ? "Memproses..." : "Masuk"}
              </Button>
            </FieldGroup>
          </form>
          <nav className="flex items-center justify-center gap-1" aria-label="Bantuan akun">
            <Button asChild variant="link"><Link href="/register">Daftar akun</Link></Button>
          </nav>
        </div>
      </div>
    </div>
  );
}

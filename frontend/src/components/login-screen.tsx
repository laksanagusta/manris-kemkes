"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "@/components/shared/icons";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
    <main data-motion-page className="grid min-h-svh place-items-center bg-muted/50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-[400px]">
        <AuthCard
          title="Masuk ke Manrisk"
          description="Isi NIP dan password untuk melanjutkan."
          footer={
            <>
              <p>
                Belum punya akun?{" "}
                <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Daftar
                </Link>
              </p>
              <p className="text-xs">
                Kendala masuk? Hubungi administrator.{" "}
                <Link href="/docs" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Docs
                </Link>
              </p>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FieldGroup className="gap-4">
              {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
              <Field className="gap-1.5">
                <FieldLabel htmlFor="nip">
                  NIP
                </FieldLabel>
                <Input
                  id="nip"
                  name="nip"
                  data-field-outline="outer"
                  data-autofill-surface="white"
                  className="h-11 rounded-control bg-white text-neutral-900 placeholder:text-neutral-500 dark:bg-white"
                  placeholder="Masukkan NIP"
                  autoComplete="username"
                  inputMode="numeric"
                  required
                  value={nip}
                  onChange={(event) => setNip(event.target.value)}
                />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="password">
                  Password
                </FieldLabel>
                <InputGroup data-field-outline="outer" className="h-11 rounded-control bg-white text-neutral-900 dark:bg-white">
                  <InputGroupInput
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    data-autofill-surface="white"
                    className="h-auto self-stretch bg-transparent text-neutral-900 placeholder:text-neutral-500 dark:bg-transparent"
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <InputGroupAddon align="inline-end" className="py-0">
                    <InputGroupButton
                      aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                      size="icon-xs"
                      className="h-10 w-10 text-neutral-500 hover:bg-transparent! dark:hover:bg-transparent! hover:text-inherit! dark:hover:text-inherit!"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button type="submit" className="h-11 w-full" disabled={isLoading} aria-busy={isLoading}>
              {isLoading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {isLoading ? "Memproses..." : "Masuk"}
              {!isLoading ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
            </Button>
          </form>
        </AuthCard>
      </div>
    </main>
  );
}

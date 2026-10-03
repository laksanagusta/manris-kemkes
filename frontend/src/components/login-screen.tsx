"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "@/components/shared/icons";
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
    <div className="flex min-h-svh bg-white">
      <aside className="hidden w-[38%] shrink-0 flex-col justify-between bg-neutral-900 px-10 py-10 text-white md:flex lg:px-14">
        <div className="flex flex-col gap-10">
          <span className="font-logo text-[22px] font-semibold lowercase leading-7 tracking-[-0.4px]">
            manrisk
          </span>
          <p className="max-w-md text-balance text-4xl font-medium leading-[1.2] tracking-tight">
            Seluruh siklus manajemen risiko dalam satu tempat.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <nav aria-label="Bantuan">
            <Link href="/panduan" className="text-sm text-white/80 transition-colors hover:text-white">
              Docs
            </Link>
          </nav>
          <p className="text-sm text-white/60">
            Kendala masuk? Hubungi administrator.
          </p>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 items-center px-6 py-10 md:items-start md:px-12 lg:justify-start lg:pl-24">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <span className="font-logo text-[22px] font-semibold lowercase leading-7 tracking-[-0.4px] text-neutral-900">
              manrisk
            </span>
          </div>
          <div aria-hidden="true" className="hidden h-7 md:block" />
          <div className="md:mt-10">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Masuk ke Manrisk
          </h1>
          <p className="mt-2 text-[15px] text-neutral-500">
            Isi NIP dan password untuk melanjutkan.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
            <FieldGroup className="gap-5">
              {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
              <Field>
                <FieldLabel htmlFor="nip" className="text-sm font-medium text-neutral-900">
                  NIP
                </FieldLabel>
                <Input
                  id="nip"
                  name="nip"
                  data-autofill-surface="white"
                  className="mt-1.5 h-12 rounded-lg bg-white text-neutral-900 placeholder:text-neutral-400"
                  placeholder="Masukkan NIP"
                  autoComplete="username"
                  inputMode="numeric"
                  required
                  value={nip}
                  onChange={(event) => setNip(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password" className="text-sm font-medium text-neutral-900">
                  Password
                </FieldLabel>
                <InputGroup className="mt-1.5 h-12 rounded-lg bg-white text-neutral-900">
                  <InputGroupInput
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    data-autofill-surface="white"
                    className="h-12 rounded-lg bg-transparent text-neutral-900 placeholder:text-neutral-400"
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
                      className="h-12 w-11 text-neutral-500 hover:bg-transparent! hover:text-inherit!"
                    >
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>

            <Button type="submit" className="h-12 w-full rounded-lg" disabled={isLoading} aria-busy={isLoading}>
              {isLoading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>

            <p className="text-center text-sm text-neutral-500">
              Belum punya akun?{" "}
              <Link href="/register" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
                Daftar
              </Link>
            </p>
          </form>
          </div>
        </div>
      </main>
    </div>
  );
}

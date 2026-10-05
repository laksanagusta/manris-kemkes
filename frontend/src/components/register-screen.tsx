"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ManriskMark } from "@/components/manrisk-mark";
import {
  ChevronsUpDown,
  Eye,
  EyeOff,
} from "@/components/shared/icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IllustratedEmptyState } from "@/components/shared/design-system/feedback/illustrated-empty-state";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ApiError } from "@/lib/api";
import {
  listRegistrationOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { registerUser } from "@/lib/api/auth";

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [organizationPickerOpen, setOrganizationPickerOpen] = useState(false);
  const [organizationQuery, setOrganizationQuery] = useState("");
  const deferredOrganizationQuery = useDeferredValue(
    organizationQuery.trim().toLowerCase(),
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [nip, setNip] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [pangkat, setPangkat] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId),
    [organizationId, organizations],
  );

  const filteredOrganizations = useMemo(() => {
    if (!deferredOrganizationQuery) return organizations;
    return organizations.filter((organization) =>
      organization.name.toLowerCase().includes(deferredOrganizationQuery),
    );
  }, [deferredOrganizationQuery, organizations]);

  useEffect(() => {
    let cancelled = false;

    listRegistrationOrganizations()
      .then((result) => {
        if (!cancelled) {
          setOrganizations(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Daftar organisasi belum berhasil dimuat.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !name ||
      !email ||
      !organizationId ||
      !nip ||
      !password ||
      !confirmPassword
    ) {
      setError("Lengkapi semua field wajib terlebih dahulu.");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password harus sama.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name,
        email,
        password,
        organizationId,
        nip,
        jabatan,
        pangkat,
      });
      setSuccess(
        "Registrasi berhasil. Akun sekarang menunggu approval sebelum bisa digunakan.",
      );
      setName("");
      setEmail("");
      setOrganizationId("");
      setNip("");
      setJabatan("");
      setPangkat("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Registrasi belum berhasil disimpan.",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = (organization: OrganizationListItem) => {
    setOrganizationId(organization.id);
    setOrganizationPickerOpen(false);
    setOrganizationQuery("");
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-x-hidden overflow-y-auto bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="motion-safe:animate-[pulse_8s_ease-in-out_infinite] absolute -left-[40%] -top-[40%] h-[80%] w-[80%] rounded-full bg-primary/5 blur-3xl" />
        <div className="motion-safe:animate-[pulse_10s_ease-in-out_infinite_2s] absolute -bottom-[30%] -right-[30%] h-[70%] w-[70%] rounded-full bg-muted-foreground/5 blur-3xl" />
        <div className="motion-safe:animate-[pulse_12s_ease-in-out_infinite_4s] absolute left-[20%] top-[60%] h-[40%] w-[40%] rounded-full bg-foreground/5 blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-0 opacity-[0.02]" aria-hidden="true" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      <div data-motion-page className="relative w-full max-w-3xl px-4 py-8 motion-safe:animate-fade-in">
        <div className="flex flex-col gap-6">
          <header className="flex w-full flex-col items-start gap-4 text-left">
            <span className="inline-flex items-center gap-2"><ManriskMark /><span className="font-logo text-[24px] leading-6 font-semibold lowercase tracking-[-0.4px] text-tertiary-foreground underline decoration-dashed decoration-2 underline-offset-4">Manrisk</span></span>
            <h1 className="text-base leading-5 font-medium tracking-tight text-balance">Buat akun baru</h1>
            <div className="flex w-full flex-col gap-1 text-left text-sm text-muted-foreground">
              <p>Akun yang dibuat akan berstatus menunggu aktivasi sampai admin menyetujui registrasi.</p>
            </div>
          </header>
          <form id="registration-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup className="grid gap-x-2 gap-y-4 md:grid-cols-2">
              {error ? <Alert variant="destructive" className="md:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
              {success ? <Alert className="md:col-span-2"><AlertDescription>{success}</AlertDescription></Alert> : null}
              <Field>
                <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
                <Input id="name" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@kemenkes.go.id" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="organization">Unit kerja</FieldLabel>
                <Popover open={organizationPickerOpen} onOpenChange={setOrganizationPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button id="organization" type="button" variant="outline" role="combobox" aria-expanded={organizationPickerOpen} disabled={orgLoading} className="h-11 w-full justify-between bg-white dark:bg-white dark:text-neutral-900">
                      <span className="min-w-0 flex-1 truncate text-left">{orgLoading ? "Memuat organisasi..." : selectedOrganization?.name || "Pilih unit kerja"}</span>
                      <ChevronsUpDown data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)]" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput placeholder="Cari nama unit kerja..." value={organizationQuery} onValueChange={setOrganizationQuery} />
                      <CommandList>
                        <CommandEmpty>
                          <IllustratedEmptyState
                            title="Tidak ada unit kerja ditemukan."
                            size="compact"
                            className="py-2"
                          />
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredOrganizations.map((organization) => (
                            <CommandItem key={organization.id} value={organization.name} data-checked={organization.id === organizationId} onSelect={() => selectOrganization(organization)}>
                              {organization.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel htmlFor="nip">NIP</FieldLabel>
                <Input id="nip" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={nip} onChange={(event) => setNip(event.target.value)} placeholder="Nomor induk pegawai" required />
              </Field>
              <Field>
                <FieldLabel htmlFor="jabatan">Jabatan</FieldLabel>
                <Input id="jabatan" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={jabatan} onChange={(event) => setJabatan(event.target.value)} placeholder="Jabatan" />
              </Field>
              <Field>
                <FieldLabel htmlFor="pangkat">Pangkat</FieldLabel>
                <Input id="pangkat" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={pangkat} onChange={(event) => setPangkat(event.target.value)} placeholder="Pangkat" />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup className="h-11 bg-white dark:bg-white dark:text-neutral-900">
                  <InputGroupInput id="password" className="h-11 bg-transparent dark:bg-transparent dark:text-neutral-900 dark:placeholder:text-neutral-500" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Buat password sendiri" required />
                  <InputGroupAddon align="inline-end" className="py-0"><InputGroupButton size="icon-xs" className="h-11 w-11 hover:bg-transparent! dark:hover:bg-transparent! hover:text-inherit! dark:hover:text-inherit!" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Konfirmasi password</FieldLabel>
                <InputGroup className="h-11 bg-white dark:bg-white dark:text-neutral-900">
                  <InputGroupInput id="confirmPassword" className="h-11 bg-transparent dark:bg-transparent dark:text-neutral-900 dark:placeholder:text-neutral-500" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password" required />
                  <InputGroupAddon align="inline-end" className="py-0"><InputGroupButton size="icon-xs" className="h-11 w-11 hover:bg-transparent! dark:hover:bg-transparent! hover:text-inherit! dark:hover:text-inherit!" aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
            <div className="flex flex-col gap-1">
              <Button type="submit" className="h-11 w-full rounded-full" disabled={loading || orgLoading} aria-busy={loading}>
                {loading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
                {loading ? "Memproses..." : "Daftar sekarang"}
              </Button>
              <nav className="flex" aria-label="Bantuan akun">
                <Button asChild variant="outline" className="h-11 w-full rounded-full"><Link href="/login">Sudah punya akun? Masuk</Link></Button>
              </nav>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

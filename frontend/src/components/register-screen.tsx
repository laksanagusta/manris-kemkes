"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronsUpDown,
  Eye,
  EyeOff,
} from "@/components/shared/icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-[35%] -top-[30%] h-[70%] w-[70%] rounded-full bg-primary/5 blur-3xl animate-[pulse_10s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-25%] right-[-25%] h-[60%] w-[60%] rounded-full bg-muted-foreground/5 blur-3xl animate-[pulse_12s_ease-in-out_infinite_2s]" />
      </div>
      <div className="absolute inset-0 opacity-[0.02]" aria-hidden="true" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />

      <div className="relative z-10 w-full max-w-3xl animate-fade-in">
        <header className="mb-8 text-center">
          <h1 className="text-xl font-semibold">Manris</h1>
          <p className="text-muted-foreground">Registrasi mandiri untuk pengguna unit kerja</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Buat akun baru</CardTitle>
            <CardDescription>Akun yang dibuat akan berstatus menunggu aktivasi sampai admin menyetujui registrasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="registration-form" onSubmit={handleSubmit}>
              <FieldGroup className="grid md:grid-cols-2">
                {error ? <Alert variant="destructive" className="md:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
                {success ? <Alert className="md:col-span-2"><AlertDescription>{success}</AlertDescription></Alert> : null}
                <Field>
                  <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
                  <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Dr. Andi Pratama, M.Kes" required />
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@kemenkes.go.id" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="organization">Unit kerja</FieldLabel>
                  <Popover open={organizationPickerOpen} onOpenChange={setOrganizationPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button id="organization" type="button" variant="outline" role="combobox" aria-expanded={organizationPickerOpen} disabled={orgLoading} className="w-full justify-between">
                        <span className="min-w-0 flex-1 truncate text-left">{orgLoading ? "Memuat organisasi..." : selectedOrganization?.name || "Pilih unit kerja"}</span>
                        <ChevronsUpDown data-icon="inline-end" aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)]" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Cari nama unit kerja..." value={organizationQuery} onValueChange={setOrganizationQuery} />
                        <CommandList>
                          <CommandEmpty>Tidak ada unit kerja ditemukan.</CommandEmpty>
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
                  <Input id="nip" value={nip} onChange={(event) => setNip(event.target.value)} placeholder="Nomor induk pegawai" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="jabatan">Jabatan</FieldLabel>
                  <Input id="jabatan" value={jabatan} onChange={(event) => setJabatan(event.target.value)} placeholder="Jabatan" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="pangkat">Pangkat</FieldLabel>
                  <Input id="pangkat" value={pangkat} onChange={(event) => setPangkat(event.target.value)} placeholder="Pangkat" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Buat password sendiri" required />
                    <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Konfirmasi password</FieldLabel>
                  <InputGroup>
                    <InputGroupInput id="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password" required />
                    <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs" aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                  </InputGroup>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button type="submit" form="registration-form" disabled={loading || orgLoading}>
              {loading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {loading ? "Memproses..." : "Daftar sekarang"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">Sudah punya akun? <Button asChild variant="link"><Link href="/login">Masuk</Link></Button></p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

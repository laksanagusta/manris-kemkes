"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import {
  ArrowRight,
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
import { VerificationDeliveryAlert, VerificationDeliveryStatusPanel } from "@/components/verification-delivery-status";

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgLoading, setOrgLoading] = useState(true);
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState<{
    email: string;
    verificationQueued: boolean;
    deliveryId?: string;
  } | null>(null);
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
      const result = await registerUser({
        name,
        email,
        password,
        organizationId,
        nip,
        jabatan,
        pangkat,
      });
      setRegistration({
        email: email.trim(),
        verificationQueued: result.verificationQueued,
        deliveryId: result.verificationDeliveryId,
      });
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

  const resendLink = (
    <Link href="/verify-email/resend" className="font-medium underline underline-offset-4">Kirim ulang tautan verifikasi</Link>
  );

  return (
    <main data-motion-page className="grid min-h-svh place-items-center bg-muted/50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-[560px]">
        <AuthCard
          title={registration ? "Registrasi tersimpan" : "Buat akun baru"}
          description={registration
            ? `Alamat verifikasi Anda adalah ${registration.email}. Setelah email terverifikasi, Super Admin dapat menyetujui akun Anda.`
            : "Verifikasi email Anda, lalu tunggu persetujuan Super Admin sebelum masuk."}
          footer={
            <p>
              Sudah punya akun?{" "}
              <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
                Masuk
              </Link>
            </p>
          }
        >
          {registration ? (
            registration.deliveryId ? (
              <VerificationDeliveryStatusPanel deliveryId={registration.deliveryId}>{resendLink}</VerificationDeliveryStatusPanel>
            ) : (
              <VerificationDeliveryAlert status={registration.verificationQueued ? "queued" : "failed"}>{resendLink}</VerificationDeliveryAlert>
            )
          ) : <form id="registration-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <FieldGroup className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              {error ? <Alert variant="destructive" className="sm:col-span-2"><AlertDescription>{error}</AlertDescription></Alert> : null}
              <Field className="gap-1.5">
                <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
                <Input id="name" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" type="email" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@kemenkes.go.id" required />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="organization">Unit kerja</FieldLabel>
                <Popover open={organizationPickerOpen} onOpenChange={setOrganizationPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button id="organization" type="button" variant="outline" role="combobox" aria-expanded={organizationPickerOpen} disabled={orgLoading} className="h-11 w-full justify-between bg-white dark:bg-white dark:text-neutral-900">
                      <span className="min-w-0 flex-1 truncate text-left">{orgLoading ? "Memuat organisasi..." : selectedOrganization?.name || "Pilih unit kerja"}</span>
                      <ChevronsUpDown data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-content-available-width)]" align="start">
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
              <Field className="gap-1.5">
                <FieldLabel htmlFor="nip">NIP</FieldLabel>
                <Input id="nip" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={nip} onChange={(event) => setNip(event.target.value)} placeholder="Nomor induk pegawai" required />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="jabatan">Jabatan</FieldLabel>
                <Input id="jabatan" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={jabatan} onChange={(event) => setJabatan(event.target.value)} placeholder="Jabatan" />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="pangkat">Pangkat</FieldLabel>
                <Input id="pangkat" className="h-11 bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500" value={pangkat} onChange={(event) => setPangkat(event.target.value)} placeholder="Pangkat" />
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <InputGroup className="h-11 bg-white dark:bg-white dark:text-neutral-900">
                  <InputGroupInput id="password" className="h-auto self-stretch bg-transparent dark:bg-transparent dark:text-neutral-900 dark:placeholder:text-neutral-500" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Buat password sendiri" required />
                  <InputGroupAddon align="inline-end" className="py-0"><InputGroupButton size="icon-xs" className="h-10 w-10 hover:bg-transparent! dark:hover:bg-transparent! hover:text-inherit! dark:hover:text-inherit!" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                </InputGroup>
              </Field>
              <Field className="gap-1.5">
                <FieldLabel htmlFor="confirmPassword">Konfirmasi password</FieldLabel>
                <InputGroup className="h-11 bg-white dark:bg-white dark:text-neutral-900">
                  <InputGroupInput id="confirmPassword" className="h-auto self-stretch bg-transparent dark:bg-transparent dark:text-neutral-900 dark:placeholder:text-neutral-500" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Ulangi password" required />
                  <InputGroupAddon align="inline-end" className="py-0"><InputGroupButton size="icon-xs" className="h-10 w-10 hover:bg-transparent! dark:hover:bg-transparent! hover:text-inherit! dark:hover:text-inherit!" aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((current) => !current)}>{showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</InputGroupButton></InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
            <Button type="submit" className="h-11 w-full" disabled={loading || orgLoading} aria-busy={loading}>
              {loading ? <Spinner data-icon="inline-start" aria-hidden="true" /> : null}
              {loading ? "Memproses..." : "Daftar sekarang"}
              {!loading ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
            </Button>
          </form>}
        </AuthCard>
      </div>
    </main>
  );
}

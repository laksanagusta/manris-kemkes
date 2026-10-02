"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { KeyRound, Save } from "@/components/shared/icons";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DitherAvatar } from "@/components/dither-kit/avatar";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";

type ProfileFormState = {
  name: string;
  email: string;
  nip: string;
  jabatan: string;
  pangkat: string;
};

const emptyProfile: ProfileFormState = {
  name: "",
  email: "",
  nip: "",
  jabatan: "",
  pangkat: "",
};

function ActiveDeviceRow() {
  const [device] = useState(() => {
    if (typeof navigator === "undefined") {
      return { deviceName: "Macintosh", browserName: "Chrome", lastActive: "Aktif sekarang" };
    }

    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent;
    const browserMatch = userAgent.match(/(edg|chrome|firefox|version)[\/]([\d.]+)/i);
    const browser = browserMatch?.[1]?.toLowerCase() === "edg"
      ? "Edge"
      : browserMatch?.[1]?.toLowerCase() === "firefox"
        ? "Firefox"
        : browserMatch?.[1]?.toLowerCase() === "version"
          ? "Safari"
          : "Chrome";
    const version = browserMatch?.[2] ?? "";

    return {
      deviceName: platform.includes("mac") ? "Macintosh" : platform.includes("win") ? "Windows" : "Perangkat ini",
      browserName: `${browser}${version ? ` ${version}` : ""}`,
      lastActive: `Hari ini pukul ${new Intl.DateTimeFormat("id-ID", { hour: "numeric", minute: "2-digit" }).format(new Date())}`,
    };
  });

  return (
    <>
      <Separator />
      <div className="grid gap-4 py-4 md:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] md:items-start">
        <h3 className="text-sm font-medium text-foreground">Perangkat aktif</h3>
        <div className="flex min-w-0 items-start gap-4 md:justify-self-end">
          <Image src="/device-mockups/macbook-air-silver.svg" alt="" width={72} height={42} className="mt-1 h-auto w-[72px] shrink-0 object-contain" aria-hidden="true" />
          <div className="min-w-0 space-y-1 text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{device.deviceName}</span>
              <Badge variant="secondary">Perangkat ini</Badge>
            </div>
            <p>{device.browserName}</p>
            <p>Sesi aktif di perangkat ini</p>
            <p>{device.lastActive}</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function AccountSettings({ view = "account" }: { view?: "account" | "security" }) {
  const { user, updateProfile, changePassword } = useAuth();
  const passwordTriggerRef = useRef<HTMLButtonElement>(null);
  const [profile, setProfile] = useState<ProfileFormState>(emptyProfile);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(emptyProfile);
      return;
    }

    setProfile({
      name: user.name || "",
      email: user.email || "",
      nip: user.nip || "",
      jabatan: user.jabatan || "",
      pangkat: user.pangkat || "",
    });
  }, [user]);

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);

    try {
      await updateProfile(profile);
      toast.success("Profil berhasil diperbarui.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
  };

  const handlePasswordDialogChange = (open: boolean) => {
    if (savingPassword && !open) {
      return;
    }

    setIsPasswordDialogOpen(open);

    if (!open) {
      resetPasswordForm();
      setSavingPassword(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Lengkapi password saat ini, password baru, dan konfirmasi password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi password harus sama dengan password baru.");
      return;
    }

    setPasswordError("");
    setSavingPassword(true);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setIsPasswordDialogOpen(false);
      resetPasswordForm();
      toast.success("Password berhasil diperbarui.");
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error ? error.message : "Gagal memperbarui password.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {view === "account" && <section className="space-y-3" aria-labelledby="account-details-heading">
        <h2 id="account-details-heading" className="text-sm text-muted-foreground">Detail profil</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Card>
            <CardContent>
              <div className="mb-4 flex items-center justify-between gap-4">
                <span>Avatar</span>
                <DitherAvatar name={user?.name || "User"} size={32} className="overflow-hidden rounded-full" />
              </div>
              <Separator />
              <FieldGroup className="mt-4">
                {([
                  ["name", "Nama lengkap", "Nama lengkap", true],
                  ["email", "Email", "nama@manrisk.local", true],
                  ["nip", "NIP", "Nomor induk pegawai", true],
                  ["jabatan", "Jabatan", "Jabatan", false],
                  ["pangkat", "Pangkat", "Pangkat / golongan", false],
                ] as const).map(([key, label, placeholder, required], index) => (
                  <div key={key} className="space-y-4">
                    {index > 0 && <Separator />}
                    <Field orientation="responsive">
                      <FieldLabel htmlFor={`account-${key}`}>{label}</FieldLabel>
                      <div className="w-full @md/field-group:basis-[280px] @md/field-group:shrink-0">
                        <Input id={`account-${key}`} type={key === "email" ? "email" : "text"} value={profile[key]} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} placeholder={placeholder} required={required} disabled={savingProfile} />
                      </div>
                    </Field>
                  </div>
                ))}
                <Separator />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>Unit kerja</span>
                  <span className="text-sm text-muted-foreground">{user?.orgName || "-"}</span>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={savingProfile}><Save data-icon="inline-start" />{savingProfile ? "Menyimpan..." : "Simpan profil"}</Button>
          </div>
        </form>
      </section>}
      {view === "security" && <section className="space-y-3" aria-labelledby="account-security-heading">
        <h2 id="account-security-heading" className="text-sm text-muted-foreground">Keamanan</h2>
        <Card>
          <CardContent>
            <div className="grid gap-4 py-4 md:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] md:items-center">
              <div>
                <h3 className="text-sm font-medium text-foreground">Password</h3>
              </div>
              <div className="flex justify-start md:justify-end">
                <Button ref={passwordTriggerRef} type="button" variant="outline" onClick={() => handlePasswordDialogChange(true)}><KeyRound data-icon="inline-start" />Ganti Password</Button>
              </div>
            </div>
            <ActiveDeviceRow />
          </CardContent>
        </Card>
      </section>}

      <Dialog open={isPasswordDialogOpen} onOpenChange={handlePasswordDialogChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} onCloseAutoFocus={(event) => { event.preventDefault(); passwordTriggerRef.current?.focus(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              Ganti Password
            </DialogTitle>
            <DialogDescription>
              Perbarui password akun tanpa meninggalkan halaman profil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div
                aria-live="polite"
                className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {passwordError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="current-password">Password Saat Ini</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Password saat ini"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Password baru"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password Baru</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulangi password baru"
                required
              />
            </div>

            <p className="text-xs leading-5 text-tertiary-foreground">
              Gunakan kombinasi yang sulit ditebak dan pastikan password baru tidak sama dengan yang lama.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="" disabled={savingPassword}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" className="" disabled={savingPassword}>
                <KeyRound className="size-4" />
                {savingPassword ? "Menyimpan..." : "Perbarui Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

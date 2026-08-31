"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Save, UserRound } from "@/components/ui/icons";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

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

export default function AccountPage() {
  const { user, updateProfile, changePassword } = useAuth();
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

  const roleLabel = useMemo(() => {
    switch (user?.role) {
      case "superadmin":
        return "Super Admin";
      case "reviewer":
        return "Reviewer";
      case "pimpinan":
        return "Pimpinan";
      case "unit":
        return "Unit Kerja";
      default:
        return user?.role || "-";
    }
  }, [user?.role]);

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
    <PageStack className="max-w-3xl">
      <CollectionPageHeader
        title="Akun Saya"
        actions={
          <div className="text-sm text-muted-foreground">
            {user?.orgName ? `${roleLabel} • ${user.orgName}` : roleLabel}
          </div>
        }
      />

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <UserRound className="size-4" /> Profil Pengguna
          </CardTitle>
          <CardDescription>
            Informasi ini tampil pada sesi login dan halaman akun Anda.
          </CardDescription>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => handlePasswordDialogChange(true)}
            >
              <KeyRound className="size-4" />
              Ganti Password
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="account-name">Nama Lengkap</Label>
              <Input
                id="account-name"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nama lengkap"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                type="email"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                placeholder="nama@manris.local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-nip">NIP</Label>
              <Input
                id="account-nip"
                value={profile.nip}
                onChange={(event) => setProfile((current) => ({ ...current, nip: event.target.value }))}
                placeholder="Nomor induk pegawai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-jabatan">Jabatan</Label>
              <Input
                id="account-jabatan"
                value={profile.jabatan}
                onChange={(event) => setProfile((current) => ({ ...current, jabatan: event.target.value }))}
                placeholder="Jabatan"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="account-pangkat">Pangkat</Label>
              <Input
                id="account-pangkat"
                value={profile.pangkat}
                onChange={(event) => setProfile((current) => ({ ...current, pangkat: event.target.value }))}
                placeholder="Pangkat / golongan"
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" className="gap-2" disabled={savingProfile}>
                <Save className="size-4" />
                {savingProfile ? "Menyimpan..." : "Simpan Profil"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isPasswordDialogOpen} onOpenChange={handlePasswordDialogChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
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
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulangi password baru"
                required
              />
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              Gunakan kombinasi yang sulit ditebak dan pastikan password baru tidak sama dengan yang lama.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="gap-2" disabled={savingPassword}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" className="gap-2" disabled={savingPassword}>
                <KeyRound className="size-4" />
                {savingPassword ? "Menyimpan..." : "Perbarui Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageStack>
  );
}

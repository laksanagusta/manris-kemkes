"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { KeyRound, Save, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Lengkapi password saat ini, password baru, dan konfirmasi password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password harus sama dengan password baru.");
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password berhasil diperbarui.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Account</h1>
          <p className="text-sm text-muted-foreground">
            Kelola informasi profil dan keamanan akun untuk sesi Anda saat ini.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {user?.orgName ? `${roleLabel} • ${user.orgName}` : roleLabel}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <UserRound className="size-4" /> Profil Pengguna
            </CardTitle>
            <CardDescription>
              Informasi ini akan tampil pada sesi login dan halaman account Anda.
            </CardDescription>
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

        <div className="space-y-6">
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="size-4" /> Ringkasan Akses
              </CardTitle>
              <CardDescription>
                Ringkasan identitas akun aktif pada sesi ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Role</p>
                <p className="font-medium text-foreground">{roleLabel}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Unit</p>
                <p className="font-medium text-foreground">{user?.orgName || "-"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground/80">Status</p>
                <p className="font-medium capitalize text-foreground">{user?.status || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="size-4" /> Ganti Password
              </CardTitle>
              <CardDescription>
                Gunakan password saat ini untuk mengatur password baru.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
                <div className="flex items-center justify-between gap-3">
                  <Link href="/change-password" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Buka halaman ganti password penuh
                  </Link>
                  <Button type="submit" className="gap-2" disabled={savingPassword}>
                    <KeyRound className="size-4" />
                    {savingPassword ? "Menyimpan..." : "Perbarui Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

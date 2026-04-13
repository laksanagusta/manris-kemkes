"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AdminOnlyState } from "@/components/admin/admin-only-state";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { api, ApiError } from "@/lib/api";
import { listAllOrganizations } from "@/lib/api/organizations";
import {
  filterToAccessibleOrgs,
  type Organization,
} from "@/lib/organization";

const roleOptions = [
  {
    value: "superadmin",
    label: "Super Admin",
    description: "mengelola pengguna, organisasi, dan pengaturan sistem.",
  },
  {
    value: "pimpinan",
    label: "Pimpinan",
    description: "meninjau dan menyetujui dokumen lintas unit.",
  },
  {
    value: "reviewer",
    label: "Reviewer",
    description:
      "memeriksa kelengkapan dan kualitas dokumen pengelolaan risiko.",
  },
  {
    value: "unit",
    label: "Unit Kerja",
    description: "mengelola risiko dan insiden pada unit kerja masing-masing.",
  },
] as const;

export default function NewUserPage() {
  const router = useRouter();
  const { token, user, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("unit");
  const [orgId, setOrgId] = useState("");
  const [nip, setNip] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [pangkat, setPangkat] = useState("");
  const isSuperadmin = user?.role === "superadmin";

  useEffect(() => {
    if (authLoading || !token || !isSuperadmin) return;

    let cancelled = false;

    listAllOrganizations(token)
      .then((result) => {
        if (cancelled) return;
        const filtered = user?.isGlobal
          ? result
          : filterToAccessibleOrgs(result, user?.accessibleOrgIds || []);
        setOrganizations(filtered);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [authLoading, isSuperadmin, token, user]);

  const handleRoleChange = (value: string) => {
    setRole(value);
    if (value === "superadmin") {
      setOrgId("");
    }
  };

  const handleSave = async () => {
    if (!name || !username || !email || !password) {
      toast.error(
        "Lengkapi nama, username, email, dan password terlebih dahulu.",
      );
      return;
    }

    if (role !== "superadmin" && !orgId) {
      toast.error("Pilih unit kerja untuk pengguna ini.");
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/users",
        {
          name,
          username,
          email,
          password,
          role,
          organizationId: role === "superadmin" ? null : orgId,
          nip,
          jabatan,
          pangkat,
        },
        token || undefined,
      );
      toast.success(
        "Pengguna berhasil dibuat. Sampaikan username dan password sementara secara manual. Akun akan tetap menunggu aktivasi sampai password diganti saat login pertama.",
      );
      router.push("/admin/users");
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && error.status === 403) {
        toast.error("Hanya Super Admin yang dapat membuat pengguna baru.");
      } else {
        toast.error("Pengguna baru belum berhasil disimpan.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center gap-3">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Menyiapkan formulir pengguna...
        </span>
      </div>
    );
  }

  if (!isSuperadmin) {
    return <AdminOnlyState title="Pembuatan pengguna hanya untuk Super Admin" />;
  }

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title="Tambah pengguna"
        description="Buat akun baru, tetapkan peran, lalu sampaikan username dan password sementara secara manual. Akun akan berstatus menunggu aktivasi sampai pengguna mengganti password saat login pertama."
        badges={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/[0.04] text-primary"
            >
              Administrasi akses
            </Badge>
            <Badge
              variant="outline"
              className="border-warning/20 bg-warning/10 text-warning"
            >
              Password sementara
            </Badge>
          </div>
        }
        backLabel="Kembali ke daftar pengguna"
        onBack={() => router.push("/admin/users")}
        actions={
          <Button className="text-xs" onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {loading ? "Menyimpan..." : "Buat pengguna"}
          </Button>
        }
      />

      <FormSection
        title="Informasi akun"
        description="Gunakan identitas kerja resmi yang akan dipakai pengguna saat login. Password sementara hanya berlaku untuk login pertama."
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Nama lengkap<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              placeholder="Contoh: Dr. Andi Pratama, M.Kes"
              className="h-10 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Username<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              placeholder="Contoh: andi.pratama"
              className="h-10 text-sm"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Email<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Contoh: andi@kemenkes.go.id"
              className="h-10 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Password sementara
              <span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Minimal 8 karakter untuk login pertama"
              className="h-10 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Bagikan password sementara ini secara manual. Setelah login
              pertama, pengguna wajib mengganti password dan status akun baru
              berubah menjadi aktif.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Informasi kepegawaian"
        description="Data profil pegawai untuk identifikasi dalam sistem."
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">NIP</Label>
            <Input
              placeholder="Contoh: 198501012010011001"
              className="h-10 text-sm"
              value={nip}
              onChange={(event) => setNip(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Jabatan</Label>
            <Input
              placeholder="Contoh: Kepala Seksi Surveilans"
              className="h-10 text-sm"
              value={jabatan}
              onChange={(event) => setJabatan(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Pangkat</Label>
            <Input
              placeholder="Contoh: Pembina Tk. I (IV/b)"
              className="h-10 text-sm"
              value={pangkat}
              onChange={(event) => setPangkat(event.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Peran dan unit kerja"
        description="Pilih peran sesuai kewenangan kerja agar akses pengguna tetap tepat sasaran sejak akun dibuat."
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Peran<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roleOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-sm"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Unit kerja
              {role !== "superadmin" ? (
                <span className="ml-0.5 text-destructive">*</span>
              ) : null}
            </Label>
            <Select
              value={orgId}
              onValueChange={setOrgId}
              disabled={role === "superadmin"}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue
                  placeholder={
                    role === "superadmin"
                      ? "Berlaku untuk semua organisasi"
                      : "Pilih unit kerja"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {organizations.map((organization) => (
                    <SelectItem
                      key={organization.id}
                      value={organization.id}
                      className="text-sm"
                    >
                      {organization.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-muted/20 px-4 py-4">
          <p className="text-xs font-medium text-foreground">Ringkasan peran</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {roleOptions.map((option) => (
              <p key={option.value}>
                <span className="font-medium text-foreground">
                  {option.label}
                </span>{" "}
                {option.description}
              </p>
            ))}
          </div>
        </div>
      </FormSection>
    </FormPage>
  );
}

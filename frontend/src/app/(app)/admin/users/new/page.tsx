"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { api } from "@/lib/api";
import { filterToAccessibleOrgs } from "@/lib/organization";
import { useAuth } from "@/contexts/auth-context";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewUserPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("unit");
  const [orgId, setOrgId] = useState("");

  useEffect(() => {
    if (!token) return;

    api
      .get<{ id: string; name: string }[]>("/organizations", token)
      .then((res) => {
        const filtered = user?.isGlobal ? res : filterToAccessibleOrgs(res as any, user?.accessibleOrgIds || []);
        setOrganizations(filtered);
      })
      .catch(console.error);
  }, [token, user]);

  const handleSave = async () => {
    if (!name || !username || !email || !password) {
      toast.error("Lengkapi nama, username, email, dan password terlebih dahulu.");
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
        },
        token || undefined,
      );
      router.push("/admin/users");
    } catch (err) {
      console.error(err);
      toast.error("Pengguna baru belum berhasil disimpan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title="Tambah pengguna"
        description="Tambahkan akun baru dan atur peran aksesnya sebelum disimpan."
        badges={
          <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
            Administrasi akses
          </Badge>
        }
        backLabel="Kembali ke daftar pengguna"
        onBack={() => router.push("/admin/users")}
        actions={
          <Button className="gap-2 text-xs" onClick={handleSave} disabled={loading}>
            <Save className="size-3.5" />
            {loading ? "Menyimpan..." : "Simpan pengguna"}
          </Button>
        }
      />

      <FormSection
        title="Informasi akun"
        description="Gunakan identitas yang dipakai pengguna saat masuk ke sistem."
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Nama lengkap<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              placeholder="Contoh: Dr. Andi Pratama, M.Kes"
              className="h-10 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Username<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              placeholder="Contoh: andi.pratama"
              className="h-10 text-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Email<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              type="email"
              placeholder="Contoh: andi@kemenkes.go.id"
              className="h-10 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Password<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              type="password"
              placeholder="Minimal 8 karakter"
              className="h-10 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Peran dan unit kerja"
        description="Pilih cakupan akses agar pengguna hanya melihat data yang memang perlu dikelola."
        contentClassName="space-y-5"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Peran<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="superadmin" className="text-sm">
                  Super Admin
                </SelectItem>
                <SelectItem value="pimpinan" className="text-sm">
                  Pimpinan / Approver
                </SelectItem>
                <SelectItem value="unit" className="text-sm">
                  Unit Kerja / Risk Officer
                </SelectItem>
                <SelectItem value="viewer" className="text-sm">
                  Viewer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Unit kerja {role !== "superadmin" &&<span className="text-destructive ml-0.5">*</span>}
            </Label>
            <Select value={orgId} onValueChange={setOrgId} disabled={role === "superadmin"}>
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
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id} className="text-sm">
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-2xl border border-border/15 bg-muted/20 px-4 py-4">
          <p className="text-xs font-medium text-foreground">Ringkasan peran</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Super Admin</span> mengelola
              pengguna dan konfigurasi sistem.
            </p>
            <p>
              <span className="font-medium text-foreground">Pimpinan</span> meninjau dan
              menyetujui dokumen lintas unit.
            </p>
            <p>
              <span className="font-medium text-foreground">Unit Kerja</span> mengelola
              risiko dan insiden di unitnya.
            </p>
            <p>
              <span className="font-medium text-foreground">Viewer</span> hanya melihat
              data tanpa mengubah isian.
            </p>
          </div>
        </div>
      </FormSection>
    </FormPage>
  );
}

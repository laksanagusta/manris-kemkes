"use client";
import { toast } from "sonner";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ArrowLeft, UserPlus, Save } from "lucide-react";
import { useRouter } from "next/navigation";

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
    if (token) {
      api.get<{ id: string; name: string }[]>("/organizations", token)
        .then(res => setOrganizations(res))
        .catch(console.error);
    }
  }, [token]);

  const handleSave = async () => {
    if (!name || !username || !email || !password) {
      toast.error("Harap lengkapi field wajib");
      return;
    }
    setLoading(true);
    try {
      await api.post("/users", {
        name,
        username,
        email,
        password,
        role,
        organizationId: role === "superadmin" ? null : orgId,
      }, token || undefined);
      router.push("/management/users");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan pengguna baru");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground">
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah User</h1>
            <p className="text-sm text-muted-foreground">Daftarkan pengguna baru ke sistem MANRIS</p>
          </div>
        </div>
        <Button className="gap-2 shadow-lg shadow-primary/20 text-xs" onClick={handleSave} disabled={loading}>
          <Save className="size-3.5" /> {loading ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>

      {/* User Info */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> Informasi Pengguna
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input placeholder="Dr. Andi Pratama, M.Kes" className="text-xs" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Username <span className="text-destructive">*</span></Label>
              <Input placeholder="andi.pratama" className="text-xs" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Email <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="andi@kemenkes.go.id" className="text-xs" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
              <Input type="password" placeholder="Min. 8 karakter" className="text-xs" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role & Organization */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Role & Organisasi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Role <span className="text-destructive">*</span></Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin" className="text-xs">Super Admin</SelectItem>
                  <SelectItem value="pimpinan" className="text-xs">Pimpinan / Approver</SelectItem>
                  <SelectItem value="unit" className="text-xs">Unit Kerja / Risk Officer</SelectItem>
                  <SelectItem value="viewer" className="text-xs">Viewer (Read-Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit Kerja / Organisasi {role !== "superadmin" && <span className="text-destructive">*</span>}</Label>
              <Select value={orgId} onValueChange={setOrgId} disabled={role === "superadmin"}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={role === "superadmin" ? "Semua Organisasi" : "Pilih Organisasi..."} />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id} className="text-xs">
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Role explanation */}
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground">Penjelasan Role:</p>
            <div className="grid gap-1.5 text-[10px] text-muted-foreground">
              <div><span className="font-semibold text-foreground">Super Admin</span> — Akses penuh: kelola user, konfigurasi sistem</div>
              <div><span className="font-semibold text-foreground">Pimpinan</span> — Approve/reject risiko, lihat semua unit</div>
              <div><span className="font-semibold text-foreground">Unit Kerja</span> — CRUD risiko di unit sendiri</div>
              <div><span className="font-semibold text-foreground">Viewer</span> — Hanya bisa melihat data</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

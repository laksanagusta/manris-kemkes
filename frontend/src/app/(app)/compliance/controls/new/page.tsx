"use client";
import { toast } from "sonner";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";

export default function NewControlPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [type, setType] = useState("preventif");
  const [frequency, setFrequency] = useState("harian");

  const handleSave = async () => {
    if (!name || !owner) {
      toast("Nama dan PIC Control (Owner) wajib diisi!");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description,
        owner,
        type,
        frequency,
        organizationId: user?.organizationId,
      };

      await api.post("/controls", payload, token || undefined);
      router.push("/controls");
    } catch (error) {
      console.error("Failed to create control:", error);
      toast.error("Gagal menambahkan control library");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md pt-2 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah Kontrol</h1>
            <p className="text-sm text-muted-foreground">Tambah item baru ke pustaka pengendalian (Control Library)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2 shadow-lg shadow-primary/20 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5" />
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </div>

      {/* Control Form */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Detail Kontrol Utama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Nama Kontrol <span className="text-destructive">*</span>
            </Label>
            <Input 
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pengecekan suhu cold chain harian" 
              className="text-xs" 
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Deskripsi</Label>
            <Textarea 
              value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan mekanisme kontrol ini secara rinci..." 
              className="min-h-[80px] text-xs" 
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">
                 PIC / Penanggung Jawab <span className="text-destructive">*</span>
              </Label>
              <Input 
                value={owner} onChange={(e) => setOwner(e.target.value)}
                placeholder="Contoh: Dr. Andi" 
                className="text-xs" 
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipe Kontrol</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventif" className="text-xs">Preventif</SelectItem>
                  <SelectItem value="detektif" className="text-xs">Detektif</SelectItem>
                  <SelectItem value="korektif" className="text-xs">Korektif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frekuensi</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian" className="text-xs">Harian</SelectItem>
                  <SelectItem value="mingguan" className="text-xs">Mingguan</SelectItem>
                  <SelectItem value="bulanan" className="text-xs">Bulanan</SelectItem>
                  <SelectItem value="triwulan" className="text-xs">Triwulan</SelectItem>
                  <SelectItem value="tahunan" className="text-xs">Tahunan</SelectItem>
                  <SelectItem value="insidental" className="text-xs">Insidental</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { FormHeader, FormPage, FormSection } from "@/components/shared/form-shell";
import { Badge } from "@/components/ui/badge";
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
      toast.error("Lengkapi nama kontrol dan penanggung jawab terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      await api.post(
        "/controls",
        {
          name,
          description,
          owner,
          type,
          frequency,
          organizationId: user?.organizationId,
        },
        token || undefined,
      );
      router.push("/compliance/controls");
    } catch (error) {
      console.error("Failed to create control:", error);
      toast.error("Kontrol baru belum berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title="Tambah kontrol"
        description="Catat kontrol baru agar bisa dipakai di register risiko dan monitoring."
        badges={
          <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
            Pustaka kontrol
          </Badge>
        }
        backLabel="Kembali ke pustaka kontrol"
        onBack={() => router.push("/compliance/controls")}
        actions={
          <Button className="gap-2 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5" />
            {saving ? "Menyimpan..." : "Simpan kontrol"}
          </Button>
        }
      />

      <FormSection
        title="Detail kontrol"
        description="Tulis nama, tujuan, dan pola pelaksanaan kontrol secara ringkas."
        contentClassName="space-y-5"
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Nama kontrol <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Pengecekan suhu cold chain harian"
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Deskripsi</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan bagaimana kontrol ini dijalankan."
            className="min-h-28 text-sm leading-6"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Penanggung jawab <span className="text-destructive">*</span>
            </Label>
            <Input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Contoh: Tim logistik vaksin"
              className="h-10 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tipe kontrol</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preventif" className="text-sm">
                  Preventif
                </SelectItem>
                <SelectItem value="detektif" className="text-sm">
                  Detektif
                </SelectItem>
                <SelectItem value="korektif" className="text-sm">
                  Korektif
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5 md:max-w-sm">
          <Label className="text-sm font-medium">Frekuensi</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="harian" className="text-sm">
                Harian
              </SelectItem>
              <SelectItem value="mingguan" className="text-sm">
                Mingguan
              </SelectItem>
              <SelectItem value="bulanan" className="text-sm">
                Bulanan
              </SelectItem>
              <SelectItem value="triwulan" className="text-sm">
                Triwulan
              </SelectItem>
              <SelectItem value="tahunan" className="text-sm">
                Tahunan
              </SelectItem>
              <SelectItem value="insidental" className="text-sm">
                Insidental
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FormSection>
    </FormPage>
  );
}

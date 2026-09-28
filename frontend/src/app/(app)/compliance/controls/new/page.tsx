"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "@/components/shared/icons";

import { api, ApiError } from "@/lib/api";
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
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    owner?: string;
  }>({});

  const handleSave = async () => {
    const nextErrors = {
      ...(name.trim() ? {} : { name: "Nama kontrol wajib diisi." }),
      ...(owner.trim() ? {} : { owner: "Penanggung jawab wajib diisi." }),
    };
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      document
        .getElementById(nextErrors.name ? "control-name" : "control-owner")
        ?.focus();
      return;
    }

    setSaving(true);
    try {
      await api.post(
        "/controls",
        {
          name: name.trim(),
          description,
          owner: owner.trim(),
          type,
          frequency,
          organizationId: user?.organizationId,
        },
        token || undefined,
      );
      toast.success("Kontrol berhasil disimpan.");
      router.push("/compliance/controls");
    } catch (error) {
      console.error("Failed to create control:", error);
      toast.error(
        error instanceof ApiError && error.message.trim()
          ? error.message
          : "Kontrol belum berhasil disimpan. Periksa data dan coba lagi.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage>
      <FormHeader
        title="Tambah kontrol"
        badges={
          <Badge variant="secondary">
            Pustaka kontrol
          </Badge>
        }
        actions={
          <Button className="" onClick={handleSave} disabled={saving}>
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
          <Label htmlFor="control-name" className="text-sm font-medium">
            Nama kontrol<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            id="control-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) {
                setFieldErrors((current) => ({ ...current, name: undefined }));
              }
            }}
            placeholder="Contoh: Pengecekan suhu cold chain harian"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "control-name-error" : undefined}
            className=""
          />
          {fieldErrors.name ? (
            <p id="control-name-error" className="text-xs text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Deskripsi</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan bagaimana kontrol ini dijalankan."
            className=""
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="control-owner" className="text-sm font-medium">
              Penanggung jawab<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="control-owner"
              value={owner}
              onChange={(e) => {
                setOwner(e.target.value);
                if (fieldErrors.owner) {
                  setFieldErrors((current) => ({ ...current, owner: undefined }));
                }
              }}
              placeholder="Contoh: Tim logistik vaksin"
              aria-invalid={Boolean(fieldErrors.owner)}
              aria-describedby={fieldErrors.owner ? "control-owner-error" : undefined}
              className=""
            />
            {fieldErrors.owner ? (
              <p id="control-owner-error" className="text-xs text-destructive">
                {fieldErrors.owner}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Tipe kontrol</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="">
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
            <SelectTrigger className="">
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

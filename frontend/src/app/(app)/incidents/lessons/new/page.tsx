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

export default function NewLessonPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("risiko");
  const [sourceRef, setSourceRef] = useState("");
  const [successFactors, setSuccessFactors] = useState("");
  const [failureFactors, setFailureFactors] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSave = async () => {
    if (!title || !description) {
      toast.error("Lengkapi judul dan ringkasan pembelajaran terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await api.post(
        "/lessons",
        {
          title,
          description,
          sourceType,
          sourceRef,
          successFactors,
          failureFactors,
          recommendations,
          tags: tagsArray,
          organizationId: user?.organizationId,
        },
        token || undefined,
      );
      router.push("/incidents/lessons");
    } catch (error) {
      console.error("Failed to create lesson:", error);
      toast.error("Pembelajaran baru belum berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage className="max-w-4xl">
      <FormHeader
        title="Tambah pembelajaran"
        description="Catat pembelajaran dari risiko atau insiden agar bisa dipakai pada evaluasi berikutnya."
        badges={
          <Badge variant="outline" className="border-primary/15 bg-primary/[0.04] text-primary">
            Lessons learned
          </Badge>
        }
        backLabel="Kembali ke lessons learned"
        onBack={() => router.push("/incidents/lessons")}
        actions={
          <Button className="gap-2 text-xs" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5" />
            {saving ? "Menyimpan..." : "Simpan pembelajaran"}
          </Button>
        }
      />

      <FormSection
        title="Informasi dasar"
        description="Mulai dari ringkasan pembelajaran dan sumber referensinya."
        contentClassName="space-y-5"
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Judul pembelajaran<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: Redundansi cold chain harus diuji berkala"
            className="h-10 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Ringkasan pembelajaran<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan konteks, kejadian, dan pelajaran yang paling penting."
            className="min-h-28 text-sm leading-6"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Sumber referensi</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risiko" className="text-sm">
                  Risiko
                </SelectItem>
                <SelectItem value="insiden" className="text-sm">
                  Insiden
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ID referensi</Label>
            <Input
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="Contoh: R-001 atau INC-002"
              className="h-10 text-sm"
            />
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Analisis"
        description="Pisahkan apa yang berhasil, apa yang gagal, dan apa yang perlu dilakukan berikutnya."
        contentClassName="space-y-5"
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Faktor keberhasilan</Label>
          <Textarea
            value={successFactors}
            onChange={(e) => setSuccessFactors(e.target.value)}
            placeholder="Tuliskan hal yang membantu situasi berjalan baik."
            className="min-h-24 text-sm leading-6"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Faktor kegagalan</Label>
          <Textarea
            value={failureFactors}
            onChange={(e) => setFailureFactors(e.target.value)}
            placeholder="Tuliskan hambatan atau penyebab kegagalan yang perlu diingat."
            className="min-h-24 text-sm leading-6"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Rekomendasi</Label>
          <Textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Tuliskan tindak lanjut yang paling relevan."
            className="min-h-24 text-sm leading-6"
          />
        </div>
      </FormSection>

      <FormSection
        title="Tag"
        description="Gunakan tag singkat agar pembelajaran mudah ditemukan kembali."
      >
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Tag</Label>
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Contoh: cold-chain, infrastruktur, SDM"
            className="h-10 text-sm"
          />
        </div>
      </FormSection>
    </FormPage>
  );
}

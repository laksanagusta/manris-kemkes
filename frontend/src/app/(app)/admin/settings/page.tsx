"use client";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CollectionPageHeader,
  FormContainer,
  FormGroup,
  PageStack,
} from "@/components/shared/design-system";
import {
  Settings2,
  Save,
  Target,
  Gauge,
  AlertTriangle,
  FileText,
} from "@/components/shared/icons";

const probabilityScale = [
  { level: 1, label: "Rare", description: "Hampir tidak mungkin terjadi (<5%)" },
  { level: 2, label: "Unlikely", description: "Kecil kemungkinan terjadi (5-25%)" },
  { level: 3, label: "Possible", description: "Mungkin terjadi (25-50%)" },
  { level: 4, label: "Likely", description: "Besar kemungkinan terjadi (50-75%)" },
  { level: 5, label: "Almost Certain", description: "Hampir pasti terjadi (>75%)" },
];

const impactScale = [
  { level: 1, label: "Insignificant", description: "Dampak minimal, tidak mengganggu operasi" },
  { level: 2, label: "Minor", description: "Dampak kecil, gangguan operasi ringan" },
  { level: 3, label: "Moderate", description: "Dampak sedang, gangguan operasi menengah" },
  { level: 4, label: "Major", description: "Dampak besar, gangguan operasi signifikan" },
  { level: 5, label: "Catastrophic", description: "Dampak sangat besar, kegagalan total" },
];

const scaleVariants: BadgeVariant[] = [
  "secondary",
  "secondary",
  "outline",
  "destructive",
  "destructive",
];

export default function CriteriaPage() {
  return (
    <PageStack>
      <CollectionPageHeader
        title="Scope, Context & Criteria"
        actions={
          <Button className="">
            <Save className="size-4" />
            Simpan Perubahan
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scope */}
        <FormContainer
          title={<span className="flex items-center gap-2"><FileText className="size-4" />Objek & Ruang Lingkup</span>}
        >
          <FormGroup className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="criteria-object-kind">Jenis Objek</Label>
              <Input id="criteria-object-kind" defaultValue="Direktorat Jenderal" className="" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criteria-object-name">Nama Objek</Label>
              <Input id="criteria-object-name" defaultValue="Ditjen Pencegahan dan Pengendalian Penyakit (P2P)" className="" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criteria-scope">Pernyataan Ruang Lingkup</Label>
              <Textarea id="criteria-scope"
                defaultValue="Manajemen risiko mencakup seluruh kegiatan pencegahan, pengendalian, dan penanggulangan penyakit yang berada di bawah koordinasi Ditjen P2P Kementerian Kesehatan RI."
                className="resize-none"
              />
            </div>
          </FormGroup>
        </FormContainer>

        {/* Context */}
        <FormContainer
          title={<span className="flex items-center gap-2"><Settings2 className="size-4" />Konteks Internal & Eksternal</span>}
        >
          <FormGroup className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="criteria-internal">Konteks Internal</Label>
              <Textarea id="criteria-internal"
                defaultValue="Struktur organisasi, SDM, anggaran, kapasitas laboratorium, sistem informasi kesehatan, infrastruktur logistik vaksin dan obat."
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criteria-external">Konteks Eksternal</Label>
              <Textarea id="criteria-external"
                defaultValue="Regulasi WHO, pandemi global, perubahan iklim, resistensi antimikroba, dinamika politik kesehatan, kerjasama lintas sektor."
                className="resize-none"
              />
            </div>
          </FormGroup>
        </FormContainer>

        {/* Appetite & Tolerance */}
        <FormContainer
          title={<span className="flex items-center gap-2"><Target className="size-4" />Risk Appetite & Tolerance</span>}
        >
          <FormGroup className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="criteria-appetite">Risk Appetite</Label>
              <Input id="criteria-appetite" defaultValue="Sedang (skor ≤ 9)" className="" />
              <p className="text-xs text-muted-foreground">
                Batas selera risiko yang bisa diterima organisasi
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="criteria-tolerance">Risk Tolerance</Label>
              <Input id="criteria-tolerance" defaultValue="Tinggi (skor ≤ 16)" className="" />
              <p className="text-xs text-muted-foreground">
                Batas toleransi penyimpangan dari appetite
              </p>
            </div>
          </FormGroup>
        </FormContainer>
      </div>

      {/* Probability Scale */}
      <FormContainer
        title={<span className="flex items-center gap-2"><Gauge className="size-4" />Skala Probabilitas (1-5)</span>}
      >
        {probabilityScale.map((item, index) => (
          <FormGroup key={item.level} className="flex flex-wrap items-center gap-3">
            <Badge
              variant={scaleVariants[index]}
              className="w-7"
            >
              {item.level}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
            <Input
              defaultValue={item.description}
              aria-label={item.label}
              className="w-full lg:max-w-[300px]"
            />
          </FormGroup>
        ))}
      </FormContainer>

      {/* Impact Scale */}
      <FormContainer
        title={<span className="flex items-center gap-2"><AlertTriangle className="size-4" />Skala Dampak (1-5)</span>}
      >
        {impactScale.map((item, index) => (
          <FormGroup key={item.level} className="flex flex-wrap items-center gap-3">
            <Badge
              variant={scaleVariants[index]}
              className="w-7"
            >
              {item.level}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold">{item.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
            <Input
              defaultValue={item.description}
              aria-label={item.label}
              className="w-full lg:max-w-[300px]"
            />
          </FormGroup>
        ))}
      </FormContainer>
    </PageStack>
  );
}

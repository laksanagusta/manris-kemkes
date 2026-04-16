"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { getRiskDetail, updateRiskAssessment } from "@/lib/api/risk-assessment";
import { getBobot, calculateNilai } from "@/lib/risk";
import type { Risk } from "@/types/risk";

import { Button } from "@/components/ui/button";
import { ProfilRisikoCard } from "../components/profil-risiko-card";
import {
  HasilPemantauanCard,
  type AssessmentFormValues,
} from "../components/hasil-pemantauan-card";
import { SimpulanCard } from "../components/simpulan-card";

const formSchema = z.object({
  probability: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  changeReason: z.string().min(1, "Alasan perubahan tidak boleh kosong"),
  reviewSummary: z.string().min(1, "Uraian pemantauan tidak boleh kosong"),
});

export default function AssessmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [draftRisk, setDraftRisk] = useState<Risk | null>(null);
  const [sourceRisk, setSourceRisk] = useState<Risk | null>(null);

  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      probability: 1,
      impact: 1,
      changeReason: "",
      reviewSummary: "",
    },
  });

  const probability = form.watch("probability");
  const impact = form.watch("impact");

  const computedBobot = getBobot(probability, impact);
  const computedNilai = calculateNilai(probability, impact, computedBobot);

  useEffect(() => {
    if (!token || !id) return;

    async function fetchData() {
      try {
        setIsLoading(true);
        const draft = await getRiskDetail(token!, id);
        setDraftRisk(draft);

        form.reset({
          probability: draft.probability || 1,
          impact: draft.impact || 1,
          changeReason: draft.changeReason || "",
          reviewSummary: draft.reviewSummary || "",
        });

        if (draft.previousRiskId) {
          const source = await getRiskDetail(token!, draft.previousRiskId);
          setSourceRisk(source);
        }
      } catch (error) {
        toast.error("Gagal memuat data risiko", {
          description: (error as Error).message || "Terjadi kesalahan yang tidak diketahui",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id, token, form]);

  const onSubmit = async (values: AssessmentFormValues) => {
    if (!token || !id) return;
    setIsSaving(true);
    try {
      const payload = {
        probability: values.probability,
        impact: values.impact,
        weight: getBobot(values.probability, values.impact),
        nilai: calculateNilai(
          values.probability,
          values.impact,
          getBobot(values.probability, values.impact),
        ),
        change_reason: values.changeReason,
        review_summary: values.reviewSummary,
      };

      await updateRiskAssessment(token, id, payload);
      toast.success("Pemantauan risiko berhasil disimpan");
      router.push("/risk/assessment");
    } catch (error) {
      toast.error("Gagal menyimpan pemantauan", {
        description: (error as Error).message || "Silakan coba lagi",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p>Memuat data pemantauan...</p>
        </div>
      </div>
    );
  }

  if (!draftRisk || !sourceRisk) {
    return (
      <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Data risiko tidak ditemukan.</p>
        <Button variant="outline" onClick={() => router.push("/risk/assessment")}>
          <ArrowLeft className="mr-2 size-4" />
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/risk/assessment")}
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Kembali</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Form Pemantauan Risiko
            </h1>
            <p className="text-muted-foreground">
              {sourceRisk.code || sourceRisk.riskCode} - {sourceRisk.title}
            </p>
          </div>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Simpan Pemantauan
        </Button>
      </div>

      <div className="flex flex-col gap-8">
        <ProfilRisikoCard risk={sourceRisk} />

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          <HasilPemantauanCard form={form} />
          
          <div className="space-y-8">
            <SimpulanCard
              nilaiCurrent={sourceRisk.nilai || 0}
              nilaiBaru={computedNilai}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

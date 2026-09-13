"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { DocumentProcessingWorkspace } from "@/components/intelligence/document-processing/document-processing-workspace";
import { useAuth } from "@/contexts/auth-context";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import {
  analyzeDocumentIntelligence,
  type AnalyzeDocumentIntelligenceInput,
} from "@/lib/api/document-intelligence";
import {
  createDocumentIntelligencePrefillToken,
  DOCUMENT_INTELLIGENCE_PREFILL_PARAM,
  saveDocumentIntelligencePrefill,
} from "@/lib/document-intelligence-prefill";
import type { DocumentAnalysisMode } from "@/types/document-intelligence";
import type { Finding } from "@/types/document-processing";

function mapFindingToRisk(finding: Finding) {
  return {
    kind: "risk" as const,
    title: finding.title,
    description: `${finding.summary}\n\nTindakan yang disarankan: ${finding.recommendedAction}`,
    source: "internal",
    probability: finding.severity === "high" || finding.severity === "critical" ? 4 : 3,
    impact: finding.severity === "high" || finding.severity === "critical" ? 4 : 3,
    mitigation: finding.recommendedAction,
    quote: finding.source.quote,
    treatmentOption: "mitigasi" as const,
  };
}

export default function DocumentIntelligencePage() {
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const { token, user } = useAuth();
  const router = useRouter();

  if (aiFeaturesDisabled) {
    return (
      <AIFeaturesDisabledState
        title="Document Intelligence Dinonaktifkan"
        description="Analisis dokumen berbasis AI sementara tidak tersedia. Hubungi administrator untuk mengaktifkannya kembali."
      />
    );
  }

  function openRiskDraft(finding: Finding) {
    const prefillToken = createDocumentIntelligencePrefillToken();
    saveDocumentIntelligencePrefill(prefillToken, mapFindingToRisk(finding));
    router.push(`/risk/register/new?${DOCUMENT_INTELLIGENCE_PREFILL_PARAM}=${prefillToken}`);
  }

  async function runLegacyAnalysis(
    file: File,
    mode: DocumentAnalysisMode,
    period?: string,
  ) {
    if (!token) {
      toast.error("Sesi Anda telah berakhir. Masuk kembali untuk menyinkronkan hasil analisis.", {
        action: {
          label: "Masuk kembali",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }
    const input: AnalyzeDocumentIntelligenceInput = {
      file,
      mode,
      period,
      organizationId: user?.organizationId || undefined,
    };
    try {
      await analyzeDocumentIntelligence(token, input);
      toast.success("Hasil analisis berhasil disinkronkan ke server.");
    } catch {
      toast.error("Hasil lokal tersimpan, tetapi sinkronisasi ke server gagal.", {
        description: "Periksa koneksi lalu coba lagi.",
        action: {
          label: "Coba lagi",
          onClick: () => void runLegacyAnalysis(file, mode, period),
        },
      });
    }
  }

  return <DocumentProcessingWorkspace onRunLegacyAnalysis={runLegacyAnalysis} onUseRiskDraft={openRiskDraft} />;
}

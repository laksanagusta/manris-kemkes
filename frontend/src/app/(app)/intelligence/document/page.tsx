"use client";

import { useRouter } from "next/navigation";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { DocumentProcessingWorkspace } from "@/components/intelligence/document-processing/document-processing-workspace";
import { useAuth } from "@/contexts/auth-context";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import {
  createDocumentIntelligencePrefillToken,
  DOCUMENT_INTELLIGENCE_PREFILL_PARAM,
  saveDocumentIntelligencePrefill,
} from "@/lib/document-intelligence-prefill";
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

  return (
    <DocumentProcessingWorkspace
      authToken={token ?? undefined}
      organizationId={user?.organizationId || undefined}
      onUseRiskDraft={openRiskDraft}
    />
  );
}

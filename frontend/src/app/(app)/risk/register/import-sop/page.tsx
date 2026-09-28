"use client";

import { useEffect, useState } from "react";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { DocumentProcessingWorkspace } from "@/components/intelligence/document-processing/document-processing-workspace";
import { RiskDraftDialog } from "@/components/intelligence/document-processing/risk-draft-dialog";
import { useAuth } from "@/contexts/auth-context";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import {
  loadLatestProcessingJob,
  markProcessingFindingHandled,
} from "@/lib/document-processing/storage";
import type { Finding } from "@/types/document-processing";

export default function ImportSopPage() {
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const { token, user } = useAuth();
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [reportedFindingIds, setReportedFindingIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setReportedFindingIds(
      new Set(
        loadLatestProcessingJob("sop_risk_universe")?.handledFindingIds ?? [],
      ),
    );
  }, []);

  function handleSaved(findingId: string) {
    markProcessingFindingHandled("sop_risk_universe", findingId);
    setReportedFindingIds((current) => {
      const next = new Set(current);
      next.add(findingId);
      return next;
    });
    setSelectedFinding(null);
  }

  if (aiFeaturesDisabled) {
    return (
      <AIFeaturesDisabledState
        title="Ekstraksi SOP Dinonaktifkan"
        description="Analisis dokumen berbasis AI sementara tidak tersedia. Hubungi administrator untuk mengaktifkannya kembali."
      />
    );
  }

  return (
    <>
      <DocumentProcessingWorkspace
        authToken={token ?? undefined}
        organizationId={user?.organizationId || undefined}
        analysisMode="sop_risk_universe"
        heading="Ekstrak risiko dari SOP"
        description="Unggah satu SOP. Manris akan menemukan kandidat risiko, kontrol, dan langkah proses beserta sumbernya."
        onUseRiskDraft={setSelectedFinding}
        reportedFindingIds={reportedFindingIds}
      />
      <RiskDraftDialog
        finding={selectedFinding}
        open={Boolean(selectedFinding)}
        onOpenChange={(open) => {
          if (!open) setSelectedFinding(null);
        }}
        authToken={token ?? undefined}
        organizationId={user?.organizationId || undefined}
        userRole={user?.role}
        onSaved={handleSaved}
      />
    </>
  );
}

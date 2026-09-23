"use client";

import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { MitigationReportWorkspace } from "@/components/intelligence/document-processing/mitigation-report-workspace";
import { useAuth } from "@/contexts/auth-context";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";

export default function MitigationImportPage() {
  const { token, user } = useAuth();

  if (isAIFeaturesDisabled()) {
    return (
      <AIFeaturesDisabledState
        title="Impor Laporan Dinonaktifkan"
        description="Analisis dokumen berbasis AI sementara tidak tersedia. Hubungi administrator untuk mengaktifkannya kembali."
      />
    );
  }

  return (
    <MitigationReportWorkspace
      authToken={token ?? undefined}
      organizationId={user?.organizationId || undefined}
    />
  );
}

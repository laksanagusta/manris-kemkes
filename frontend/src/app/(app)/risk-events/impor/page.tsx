"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { DocumentProcessingWorkspace } from "@/components/intelligence/document-processing/document-processing-workspace";
import { AIFeaturesDisabledState } from "@/components/shared/ai-features-disabled-state";
import { RiskEventFormDialog } from "../_components/risk-event-form-sheet";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { listRiskEvents } from "@/lib/api/risk-events";
import { loadLatestProcessingJob, markProcessingFindingHandled } from "@/lib/document-processing/storage";
import type { Finding } from "@/types/document-processing";

const mode = "risk_event_extraction";

export default function ImportRiskEventsPage() {
  const { token, user } = useAuth();
  if (isAIFeaturesDisabled()) return <AIFeaturesDisabledState title="Ekstraksi kejadian dinonaktifkan" description="Analisis dokumen berbasis AI sementara tidak tersedia. Hubungi administrator untuk mengaktifkannya kembali." />;
  if (!user || !token) return null;
  const scope = `${user.id}:${user.organizationId ?? "global"}`;
  return <RiskEventImportWorkspace key={scope} token={token} organizationId={user.organizationId || undefined} scope={scope} />;
}

function RiskEventImportWorkspace({ token, organizationId, scope }: { token: string; organizationId?: string; scope: string }) {
  const [selected, setSelected] = useState<Finding | null>(null);
  const [handled, setHandled] = useState<Set<string>>(() => new Set(loadLatestProcessingJob(mode, scope)?.handledFindingIds ?? []));

  useEffect(() => {
    let active = true;
    if (token) void listRiskEvents(token).then((events) => {
      if (!active) return;
      setHandled((current) => new Set([...current, ...events.filter((event) => event.extractionKey).map((event) => "api-finding-event-" + event.extractionKey)]));
    }).catch(() => { /* Database uniqueness still prevents duplicate saves. */ });
    return () => { active = false; };
  }, [token, scope]);

  const candidate = selected?.eventDraft;
  return <>
    <DocumentProcessingWorkspace
      key={scope}
      authToken={token}
      organizationId={organizationId}
      storageScope={scope}
      analysisMode={mode}
      heading="Ekstrak kejadian dari dokumen"
      description="Unggah satu dokumen. Tinjau fakta kejadian yang sudah terjadi, lengkapi informasi yang belum tercantum, lalu simpan satu per satu."
      onUseRiskEvent={(finding) => { if (!handled.has(finding.id)) setSelected(finding); }}
      reportedFindingIds={handled}
    />
    {selected && candidate ? <RiskEventFormDialog
      key={selected.id}
      open
      onOpenChange={(open) => { if (!open) setSelected(null); }}
      token={token}
      organizationId={organizationId}
      initialDraft={{ ...candidate.event, financialLoss: candidate.event.financialLoss ?? undefined, financialLossKnown: candidate.event.financialLossKnown ?? undefined, sourceDocumentName: selected.source.documentName, sourceRefs: candidate.sourceRefs, extractionKey: candidate.clientKey }}
      missingFields={candidate.missingFields}
      onCreated={() => {
        markProcessingFindingHandled(mode, selected.id, scope);
        setHandled((current) => new Set([...current, selected.id]));
        setSelected(null);
      }}
    /> : null}
  </>;
}

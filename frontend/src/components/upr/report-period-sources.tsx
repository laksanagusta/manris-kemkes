import { FormContainer, FormGroup } from "@/components/shared/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SemesterSnapshot } from "@/lib/api/upr-workflow";
import { periodLabel, workflowDate } from "./workflow-ui";

export function ReportPeriodSources({ snapshot }: { snapshot: SemesterSnapshot }) {
  const periods = snapshot.periods ?? [];
  const corrections = snapshot.corrections ?? [];
  if (periods.length === 0) return null;

  return (
    <FormContainer title="Sumber data per periode">
      <FormGroup className="grid gap-3">
        {periods.some((period) => period.needsReview) && (
          <Alert variant="info" role="note">
            <AlertDescription>Cocokkan periode bertanda Perlu ditinjau dengan dokumen historis sebelum mengirim.</AlertDescription>
          </Alert>
        )}
        <ul className="grid gap-2 text-sm">
          {periods.map((period) => {
            const documents = snapshot.supporting.filter((source) => source.period === period.period && source.sourceId);
            return (
              <li key={period.id}>
                <p>{period.label || periodLabel(period.period)} · Profil v{period.profileVersion}{period.needsReview ? " · Perlu ditinjau" : ""}</p>
                {documents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {documents.map((source) => `${source.code ?? ""}${source.profileVersion ? ` (Profil v${source.profileVersion})` : ""}`).join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        {corrections.length > 0 && (
          <section className="grid gap-2">
            <h3 className="text-sm font-medium">Koreksi historis</h3>
            <ul className="grid gap-2 text-sm">
              {corrections.map((correction) => (
                <li key={`${correction.period}-${correction.groupId}`}>
                  <p>{correction.riskCode} · {periodLabel(correction.period)} · Profil v{correction.profileVersion}</p>
                  <p className="text-xs text-muted-foreground">Berlaku {workflowDate(correction.effectiveFrom)} · {correction.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </FormGroup>
    </FormContainer>
  );
}

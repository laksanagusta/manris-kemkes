import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/design-system";
import type { RiskEventSourceRef } from "@/types/risk-event";

export function RiskEventSourceCard({ name, sources }: { name?: string; sources?: RiskEventSourceRef[] }) {
  if (!name || !sources?.length) return null;
  return <Card><CardHeader><CardTitle>Sumber dokumen</CardTitle></CardHeader><CardContent className="space-y-3">
    <p className="break-words text-sm font-medium">{name}</p>
    {sources.map((source, index) => <div key={`${source.location}-${index}`} className="space-y-1">
      {source.location ? <p className="text-xs text-muted-foreground">{source.location}</p> : null}
      <blockquote className="whitespace-pre-wrap break-words text-sm text-secondary-foreground">“{source.quote}”</blockquote>
    </div>)}
  </CardContent></Card>;
}

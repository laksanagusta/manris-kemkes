import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProfilePeriodWorkspace } from "@/lib/api/profile-periods";
import { ProfileDocumentPeriodCell, ProfilePeriodCardHeader } from "./profile-period-cells";
import { workflowDate, WorkflowError } from "./workflow-ui";

const documentLabels = { workingPaper: "Kertas kerja", evaluation: "Evaluasi" };

export function AnnualProfilePeriods({ workspace, profileId, organizationId, finalized, readOnly, retry }: {
  workspace?: ProfilePeriodWorkspace | { error: string };
  profileId: string;
  organizationId?: string;
  finalized: boolean;
  readOnly?: boolean;
  retry: () => void;
}) {
  return (
    <>
      {!workspace ? (
        <p role="status" className="text-xs text-muted-foreground">Memuat progres periode…</p>
      ) : "error" in workspace ? (
        <WorkflowError message="Progres periode gagal dimuat." retry={retry} />
      ) : (
        <div className="space-y-3">
          {!workspace.rule ? (
            <div className="space-y-2">
              <p className="text-xs">Belum terhubung ke aturan pemantauan.</p>
              {workspace.linkedDocuments?.length ? (
                <ul aria-label="Dokumen tertaut" className="flex flex-wrap gap-2">
                  {workspace.linkedDocuments.map((document) => {
                    const basePath = document.kind === "workingPaper" ? "/risk/working-papers" : "/evaluations";
                    const date = document.observationCutoff && workflowDate(document.observationCutoff);
                    return (
                      <li key={document.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <Button variant="outline" size="xs" asChild>
                          <Link href={`${basePath}/${document.id}`}>Lihat {documentLabels[document.kind].toLowerCase()}{date ? ` · ${date}` : ""}</Link>
                        </Button>
                        <Badge variant={document.complete ? "outline" : "secondary"} className={document.complete ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" : undefined}>
                          {document.complete ? document.kind === "workingPaper" ? "Selesai" : "Final" : "Dalam proses"}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-xs text-muted-foreground">Belum ada dokumen yang tertaut.</p>}
              {workspace.linkedDocuments?.length && !workspace.linkedDocuments.some((document) => document.kind === "evaluation") ? (
                <p className="text-xs text-muted-foreground">Belum ada Evaluasi yang tertaut.</p>
              ) : null}
            </div>
          ) : workspace.periods.length ? (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,248px),1fr))]">
              {workspace.periods.map((period) => (
                <section key={period.id} aria-label={period.label} className="min-w-0 rounded-lg border border-border bg-card">
                  <ProfilePeriodCardHeader period={period} />
                  <ProfileDocumentPeriodCell period={period} profileId={profileId} organizationId={organizationId} canCreate={finalized && Boolean(organizationId)} readOnly={readOnly} inline />
                </section>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Aturan ini belum memiliki periode pemantauan.</p>}
        </div>
      )}
    </>
  );
}

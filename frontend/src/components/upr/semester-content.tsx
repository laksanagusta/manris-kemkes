import { latestSemesterMonitoring } from "@/lib/semester-monitoring";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  reportKindLabel,
  type SemesterSnapshot,
  type EvaluationSnapshot,
  type WorkingPaperSnapshot,
} from "@/lib/api/upr-workflow";
import {
  WorkingPaperContent,
  EvaluationContent,
} from "./supporting-document-content";
import { periodLabel, WorkflowTable, workflowDate } from "./workflow-ui";

export function SemesterContent({ snapshot }: { snapshot: SemesterSnapshot }) {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm">
          Kondisi per <strong>{workflowDate(snapshot.cutoff)}</strong>
          {snapshot.profile && (
            <>
              {" "}
              · Profil v{snapshot.profile.version} · final{" "}
              {workflowDate(snapshot.profile.finalizedAt)}
            </>
          )}
        </p>
        {snapshot.reason && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {snapshot.reason}
          </p>
        )}
        {!snapshot.profile && (
          <p className="text-sm text-muted-foreground">
            Belum ada profil final pada tanggal batas. Jika profil ditetapkan
            belakangan, pilih versinya dan isi alasan penggunaan.
          </p>
        )}
      </div>
      <WorkflowTable
        columns={["Risiko", "Sasaran", "Baseline", "Aktual pemantauan"]}
      >
        {snapshot.risks.length ? (
          snapshot.risks.map((risk) => {
            const latest = latestSemesterMonitoring(risk);
            return (
            <TableRow key={risk.groupId}>
              <TableCell className="min-w-52 whitespace-normal">
                <p className="font-medium">
                  {risk.code} · {risk.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Berlaku {workflowDate(risk.effectiveFrom)}
                </p>
                {risk.changeReason && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {risk.changeReason}
                  </p>
                )}
                {risk.mitigations.length > 0 && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">
                      Rencana penanganan
                    </summary>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {risk.mitigations.map((item) => (
                        <li key={item.id}>
                          {item.action}
                          {item.owner ? ` · ${item.owner}` : ""}
                          {item.due_date
                            ? ` · ${workflowDate(item.due_date)}`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                {Boolean(risk.mitigationReports?.length || risk.events?.length) && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">Pelaksanaan mitigasi dan kejadian</summary>
                    <ul className="mt-2 space-y-2">
                      {risk.mitigationReports?.map((item) => (
                        <li key={item.id}>
                          <p>{workflowDate(item.reportedOn)} · {item.action}</p>
                          <p className="whitespace-pre-wrap text-muted-foreground">{item.notes}</p>
                        </li>
                      ))}
                      {risk.events?.map((item) => (
                        <li key={item.id}>{workflowDate(item.occurredOn)} · {item.code} · {item.description}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </TableCell>
              <TableCell className="whitespace-normal">
                {risk.objective}
              </TableCell>
              <TableCell>{risk.score}</TableCell>
              <TableCell className="min-w-44 whitespace-normal">
                {latest ? (
                  <div className="space-y-2">
                    <p><strong>{latest.score ?? "—"}</strong> · {periodLabel(latest.period)}</p>
                    <p className="text-xs text-muted-foreground">
                      {latest.observedAtInferred ? "Tanggal perkiraan data lama" : "Diamati"} {workflowDate(latest.observedAt ?? null)}
                    </p>
                    {latest.conclusion && <p className="text-xs text-muted-foreground">{latest.conclusion}</p>}
                    {latest.mitigationProgress && <p className="text-xs text-muted-foreground">{latest.mitigationProgress}</p>}
                    <details className="text-xs">
                      <summary className="cursor-pointer">Riwayat pemantauan ({risk.monitoring.length})</summary>
                      <ul className="mt-2 space-y-2">
                        {risk.monitoring.map((item) => (
                          <li key={item.id}>
                            {item.observedAt ? workflowDate(item.observedAt) : periodLabel(item.period)}{item.observedAtInferred ? " (perkiraan data lama)" : ""} · {item.score ?? "—"}
                            {item.conclusion && <p className="text-muted-foreground">{item.conclusion}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ) : "Belum dipantau pada periode ini"}
              </TableCell>
            </TableRow>
          ); })
        ) : (
          <TableRow>
            <TableCell colSpan={4}>
              Belum ada risiko yang dapat ditampilkan untuk periode ini.
            </TableCell>
          </TableRow>
        )}
      </WorkflowTable>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Kelengkapan dokumen</h3>
        <ul className="space-y-2 text-sm">
          {snapshot.supporting.length === 0 && <li className="text-muted-foreground">Belum ada dokumen pendukung yang dipilih.</li>}
          {snapshot.supporting.map((item) => (
            <li
              key={item.sourceId ?? `${item.kind}-${item.period}`}
              className="flex flex-wrap items-center gap-2"
            >
              <span>
                {reportKindLabel[item.kind]} · {periodLabel(item.period)}
              </span>
              <Badge variant="outline">
                {item.sourceId ? item.code || "Tersedia" : "Belum lengkap"}
              </Badge>
              {item.contents && (
                <details className="w-full">
                  <summary className="cursor-pointer text-sm">
                    Buka versi dokumen pendukung
                  </summary>
                  <div className="mt-3">
                    {item.kind === "working_paper" ? (
                      <WorkingPaperContent
                        paper={item.contents as WorkingPaperSnapshot}
                      />
                    ) : (
                      <EvaluationContent
                        evaluation={item.contents as EvaluationSnapshot}
                      />
                    )}
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

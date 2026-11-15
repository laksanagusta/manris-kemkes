import { TableCell, TableRow } from "@/components/ui/table";
import type {
  EvaluationSnapshot,
  WorkingPaperSnapshot,
} from "@/lib/api/upr-workflow";
import { WorkflowTable, workflowDate, workflowTime } from "./workflow-ui";

export function WorkingPaperContent({
  paper,
}: {
  paper: WorkingPaperSnapshot;
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm">
        {paper.code} · {paper.title} · Selesai{" "}
        {workflowDate(paper.completed_at)}
      </p>
      <WorkflowTable
        columns={["Risiko", "Baseline", "Aktual", "Penanganan dan pemantauan"]}
      >
        {paper.risks?.length ? (
          paper.risks.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-normal">
                {item.risk.code} · {item.risk.title}
              </TableCell>
              <TableCell>{item.risk.inherentScore}</TableCell>
              <TableCell>
                {item.risk.monitoring?.status === "final"
                  ? Math.round(item.risk.monitoring.observedNilai)
                  : (item.result_risk?.inherentScore ?? "—")}
              </TableCell>
              <TableCell className="whitespace-normal">
                {item.risk.mitigations?.map((action, index) => (
                  <p key={index}>{action}</p>
                ))}
                {item.risk.monitoring?.mitigationProgressSummary && (
                  <p>{item.risk.monitoring.mitigationProgressSummary}</p>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4}>Dokumen ini tidak memuat risiko.</TableCell>
          </TableRow>
        )}
      </WorkflowTable>
      {Boolean(paper.signatories?.length) && (
        <ul className="space-y-1 text-sm">
          {paper.signatories?.map((person) => (
            <li key={person.id}>
              {person.signer_name} · {person.signer_jabatan}
              {person.signed_at && ` · ${workflowTime(person.signed_at)}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function EvaluationContent({
  evaluation,
}: {
  evaluation: EvaluationSnapshot;
}) {
  return (
    <section className="space-y-4">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium">Nomor laporan</dt>
          <dd>{evaluation.reportNumber || evaluation.code}</dd>
        </div>
        <div>
          <dt className="font-medium">Tanggal laporan</dt>
          <dd>{workflowDate(evaluation.reportDate)}</dd>
        </div>
        {evaluation.monitoringDateRange && (
          <div>
            <dt className="font-medium">Rentang pemantauan</dt>
            <dd>{evaluation.monitoringDateRange}</dd>
          </div>
        )}
        {evaluation.assignmentLetterNumber && (
          <div>
            <dt className="font-medium">Surat tugas</dt>
            <dd>{evaluation.assignmentLetterNumber}</dd>
          </div>
        )}
      </dl>
      {evaluation.sections?.map((section) => (
        <section className="space-y-2" key={section.id}>
          <h2 className="font-semibold">{section.title}</h2>
          {section.description && (
            <p className="whitespace-pre-wrap text-sm">{section.description}</p>
          )}
          {Boolean(section.items?.length) && (
            <WorkflowTable
              columns={["Butir evaluasi", "Jawaban", "Hasil penelaahan"]}
            >
              {section.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-normal">
                    {item.label}
                  </TableCell>
                  <TableCell>
                    {item.answer === "yes"
                      ? "Ya"
                      : item.answer === "no"
                        ? "Tidak"
                        : "—"}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap">
                    {[item.condition, item.description, item.analysis]
                      .filter(Boolean)
                      .join("\n") || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </WorkflowTable>
          )}
          {section.conclusion && (
            <p className="whitespace-pre-wrap text-sm">{section.conclusion}</p>
          )}
        </section>
      ))}
      {evaluation.problems && (
        <p className="whitespace-pre-wrap text-sm">
          <strong>Masalah</strong>
          <br />
          {evaluation.problems}
        </p>
      )}
      {evaluation.recommendations && (
        <p className="whitespace-pre-wrap text-sm">
          <strong>Rekomendasi</strong>
          <br />
          {evaluation.recommendations}
        </p>
      )}
    </section>
  );
}

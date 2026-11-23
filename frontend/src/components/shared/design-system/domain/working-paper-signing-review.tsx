import { ConfirmationConsequences } from "../actions/confirmation-consequences";
import { createDisplayDateFormatter } from "@/lib/display-date";
import type { WorkingPaperSignatory } from "@/types/working-paper";

const date = createDisplayDateFormatter("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });

export function WorkingPaperSigningReview({ cutoff, period, riskCount, signatories }: {
  cutoff?: string;
  period?: string;
  riskCount: number;
  signatories: Pick<WorkingPaperSignatory, "id" | "sequence_no" | "signer_name">[];
}) {
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-muted-foreground">{cutoff ? "Tanggal batas pengamatan" : "Periode"}</dt>
          <dd className="mt-1 font-medium">
            {cutoff ? <time dateTime={cutoff}>{date.format(new Date(cutoff))}</time> : period || "Belum tercatat"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Risiko disertakan</dt>
          <dd className="mt-1 font-medium">{riskCount} risiko</dd>
        </div>
      </dl>
      <div className="space-y-2">
        <h3 className="font-normal text-secondary-foreground">Urutan penandatangan</h3>
        <ol className="max-h-40 list-decimal space-y-1 overflow-y-auto ps-5">
          {[...signatories].sort((a, b) => a.sequence_no - b.sequence_no).map((signatory) => (
            <li key={signatory.id} className="wrap-anywhere">{signatory.signer_name}</li>
          ))}
        </ol>
      </div>
      <div className="space-y-2 rounded-lg border border-border bg-workspace p-3">
        <h3 className="font-medium text-secondary-foreground">Penguncian dokumen</h3>
        <ConfirmationConsequences variant="plain" className="text-muted-foreground">
          Setelah TTE dimulai, hasil Pemantauan dan isi KK Pemantauan dan Reviu dikunci untuk semua penandatangan.
        </ConfirmationConsequences>
      </div>
    </div>
  );
}

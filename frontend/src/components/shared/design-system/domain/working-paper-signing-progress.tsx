import { Check } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import type { WorkingPaper } from "@/types/working-paper";

type Signatory = Pick<WorkingPaper["signatories"][number], "sequence_no" | "signer_name" | "status">;

export function WorkingPaperSigningProgress({ signatories }: { signatories: readonly Signatory[] }) {
  if (signatories.length === 0) {
    return <span className="text-sm text-muted-foreground" aria-label="Belum ada penandatangan">–</span>;
  }

  const ordered = [...signatories].sort((first, second) => first.sequence_no - second.sequence_no);
  const signedCount = ordered.filter((signatory) => signatory.status === "signed").length;
  const details = ordered.map((signatory) => {
    const name = signatory.signer_name || `Penandatangan ${signatory.sequence_no}`;
    return `${name} ${signatory.status === "signed" ? "sudah" : "belum"} menandatangani`;
  });
  const label = `Progres Tanda Tangan: ${signedCount} dari ${ordered.length} sudah menandatangani. ${details.join(". ")}.`;

  return (
    <span role="img" aria-label={label} title={label} className="flex flex-wrap items-center gap-1">
      {ordered.map((signatory) => {
        const complete = signatory.status === "signed";

        return (
          <span key={signatory.sequence_no} aria-hidden="true" className={cn(
            "grid size-5 place-items-center rounded-sm border text-[0.625rem] font-medium tabular-nums",
            complete ? "border-workspace-data/25 bg-workspace-data/15 text-foreground" : "border-border bg-card text-muted-foreground",
          )}>
            {complete ? <Check className="size-3" /> : signatory.sequence_no}
          </span>
        );
      })}
    </span>
  );
}

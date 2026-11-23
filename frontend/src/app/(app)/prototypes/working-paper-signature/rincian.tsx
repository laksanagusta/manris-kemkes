import { CheckCircle2, ChevronDown, Lock } from "@/components/shared/icons";
import { archiveDescription, completionTitle, lockDescription } from "./copy";

export function Rincian() {
  return (
    <div className="@container rounded-(--surface-radius) bg-card px-4 py-2.5 shadow-(--surface-shadow-low)">
      <details className="group">
        <summary className="grid min-h-11 cursor-pointer list-none items-center gap-x-4 gap-y-2 rounded-sm py-1 text-start outline-ring focus-visible:outline-2 focus-visible:outline-offset-4 @min-[38rem]:grid-cols-[minmax(0,1fr)_auto] [&::-webkit-details-marker]:hidden">
          <span className="flex items-start gap-3" role="status">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-(--badge-green-surface) text-(--badge-green-foreground)">
              <CheckCircle2 aria-hidden="true" className="size-4" />
            </span>
            <span className="grid gap-0.5 text-sm">
              <span className="font-semibold text-foreground">{completionTitle}</span>
              <span className="text-muted-foreground">{archiveDescription}</span>
            </span>
          </span>
          <span className="flex min-h-11 items-center gap-2 ps-11 text-sm font-medium text-secondary-foreground @min-[38rem]:ps-0">
            <Lock aria-hidden="true" className="size-4 text-muted-foreground" />
            Isi dokumen terkunci
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground group-open:rotate-180" />
          </span>
        </summary>
        <p className="mt-2 border-t border-border pb-1 ps-11 pt-3 text-sm text-muted-foreground">{lockDescription}</p>
      </details>
    </div>
  );
}

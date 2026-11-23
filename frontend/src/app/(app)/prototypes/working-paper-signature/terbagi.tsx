import { CheckCircle2, Lock } from "@/components/shared/icons";
import { archiveDescription, completionTitle, lockDescription } from "./copy";

export function Terbagi() {
  return (
    <div role="status" className="@container overflow-hidden rounded-(--surface-radius) bg-card shadow-(--surface-shadow-low)">
      <div className="grid @min-[48rem]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex items-start gap-3 bg-(--badge-green-surface) px-4 py-4">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-(--badge-green-foreground)" />
          <div className="grid gap-1 text-sm">
            <p className="font-semibold text-(--badge-green-foreground)">{completionTitle}</p>
            <p className="text-foreground">{archiveDescription}</p>
          </div>
        </div>
        <div className="flex items-start gap-3 border-t border-border px-4 py-4 @min-[48rem]:border-s @min-[48rem]:border-t-0">
          <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="grid gap-1 text-sm">
            <p className="font-semibold text-foreground">Isi dokumen terkunci</p>
            <p className="text-muted-foreground">{lockDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

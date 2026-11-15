import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import styles from "./evaluation-form-layout.module.css";

/** Shared reading order and responsive geometry for evaluation points. */
export function EvaluationItemLayout({
  itemNo, label, description, promptId, answer, children,
}: {
  itemNo: string;
  label: string;
  description?: string;
  promptId: string;
  answer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.item}>
      <div className={styles.itemHeader}>
        <span className={`${styles.itemNumber} bg-muted font-mono text-sm tabular-nums text-muted-foreground`}>{itemNo}</span>
        <div className="min-w-0">
          <p id={promptId} className="text-sm font-medium leading-6 text-foreground text-pretty">{label}</p>
          {description ? <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        <div className={`${styles.answer} space-y-2`}>{answer}</div>
      </div>
      <div className={styles.details}>{children}</div>
    </div>
  );
}

export function EvaluationConclusion({ children }: { children: ReactNode }) {
  return <div className="space-y-2 rounded-md bg-muted/30 p-4">{children}</div>;
}

export function EvaluationDetailLayout({ details, children }: { details: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <aside aria-label="Detail evaluasi" className="min-w-0 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1">
        {details}
      </aside>
      <div className="flex min-w-0 flex-col gap-6 xl:col-start-1 xl:row-start-1">
        {children}
      </div>
    </div>
  );
}

export function EvaluationOverview({
  organization,
  status,
  answered,
  total,
  children,
}: {
  organization: string;
  status: ReactNode;
  answered: number;
  total: number;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {status}
        <p className="min-w-0 wrap-anywhere text-sm text-muted-foreground">{organization}</p>
      </div>
      {total > 0 && (
        <div className="grid gap-2">
          <span className="text-sm tabular-nums">{answered} dari {total} poin terisi</span>
          <Progress aria-label="Kelengkapan poin evaluasi" value={Math.round((answered / total) * 100)} className="h-1.5" />
        </div>
      )}
      {children}
    </div>
  );
}

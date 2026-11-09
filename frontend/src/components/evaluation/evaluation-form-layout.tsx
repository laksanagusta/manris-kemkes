import type { ReactNode } from "react";
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

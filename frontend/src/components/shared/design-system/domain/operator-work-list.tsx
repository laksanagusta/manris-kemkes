import Link from "next/link";
import { cn } from "@/lib/utils";
import type { OperatorWorkItem } from "@/types/operator-work";
import styles from "./operator-work-list.module.css";

export type OpenWorkReport = (item: OperatorWorkItem, trigger: HTMLButtonElement) => void;

const rowClass = "flex min-h-9 items-center rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11";
const titleClass = "min-w-0 max-w-[75ch] wrap-anywhere text-pretty";

export function OperatorWorkList({
  items, itemHref, onNavigate, onOpenReport, completingKey, onCompletionEnd,
}: {
  items: OperatorWorkItem[];
  itemHref: (item: OperatorWorkItem) => string;
  onNavigate?: () => void;
  onOpenReport?: OpenWorkReport;
  completingKey?: string | null;
  onCompletionEnd?: () => void;
}) {
  return (
    <ul className="divide-y divide-border" aria-label="Daftar pekerjaan">
      {items.map((item) => {
        const title = item.mitigationAction || item.riskTitle;
        const completing = item.key === completingKey;

        return (
          <li
            key={item.key}
            className={cn("text-sm", completing && styles.completing)}
            onAnimationEnd={completing ? (event) => {
              if (event.target === event.currentTarget) onCompletionEnd?.();
            } : undefined}
          >
            {completing ? (
              <span className={rowClass}>
                <span className={cn(titleClass, "relative")}>
                  {title}
                  <span aria-hidden="true" className={cn(
                    "pointer-events-none absolute inset-0 wrap-anywhere text-pretty text-transparent line-through decoration-foreground",
                    styles.strike,
                  )}>{title}</span>
                </span>
              </span>
            ) : item.kind === "mitigation_report" && onOpenReport ? (
              <button
                type="button"
                className={cn(rowClass, "w-full cursor-pointer text-start")}
                aria-haspopup="dialog"
                disabled={Boolean(completingKey)}
                onClick={(event) => onOpenReport(item, event.currentTarget)}
              >
                <span className={titleClass}>{title}</span>
              </button>
            ) : (
              <Link href={itemHref(item)} onNavigate={onNavigate} className={rowClass}>
                <span className={titleClass}>{title}</span>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

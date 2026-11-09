import Link from "next/link";
import type { OperatorWorkItem } from "@/types/operator-work";

export function OperatorWorkList({ items, itemHref, onNavigate }: {
  items: OperatorWorkItem[];
  itemHref: (item: OperatorWorkItem) => string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="divide-y divide-border" aria-label="Daftar pekerjaan">
      {items.map((item) => (
        <li key={item.key} className="text-sm">
          <Link
            href={itemHref(item)}
            onNavigate={onNavigate}
            className="flex min-h-9 items-center rounded-sm py-2 focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11"
          >
            <span className="min-w-0 max-w-[75ch] wrap-anywhere text-pretty">{item.mitigationAction || item.riskTitle}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

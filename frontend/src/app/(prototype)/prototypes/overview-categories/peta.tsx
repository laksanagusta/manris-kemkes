import { useState } from "react";
import { categories, formatShare, totalRisks } from "./data";
import styles from "./variants.module.css";

const columns = [categories.slice(0, 2), categories.slice(2)];
const columnWidths = columns.map((column) =>
  `${column.reduce((sum, category) => sum + category.total, 0)}fr`,
).join(" ");

export function Peta() {
  const [selected, setSelected] = useState(categories[0]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        role="group"
        aria-label="Peta proporsi kategori"
        className={styles.treemap}
        style={{ gridTemplateColumns: columnWidths }}
      >
        {columns.map((column) => (
          <div key={column[0].key} className="flex min-w-0 flex-col">
            {column.map((category) => (
              <div key={category.key} className="min-h-0 min-w-0 p-0.5" style={{ flex: `${category.total} 1 0` }}>
                <button
                  type="button"
                  className={styles.tile}
                  style={{ "--category-color": category.color } as React.CSSProperties}
                  aria-label={`${category.label}, ${category.total} risiko, ${formatShare(category.total)}`}
                  aria-pressed={selected.key === category.key}
                  onClick={() => setSelected(category)}
                >
                  <span className="min-w-0 truncate">{category.label}</span>
                  <span className="hidden shrink-0 tabular-nums sm:inline">{formatShare(category.total)}</span>
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-t border-border pt-3" aria-live="polite">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Kategori terpilih</p>
          <p className="text-sm font-semibold">{selected.label}</p>
        </div>
        <p className="text-sm tabular-nums text-muted-foreground">
          <strong className="font-semibold text-foreground">{selected.total}</strong> dari {totalRisks} risiko · {formatShare(selected.total)}
        </p>
      </div>
    </div>
  );
}

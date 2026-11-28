import { useState } from "react";
import { categories, formatShare, levels } from "./data";
import styles from "./variants.module.css";

export function Rincian() {
  const [selected, setSelected] = useState(categories[0]);

  return (
    <div className={styles.inspector}>
      <ul aria-label="Kategori risiko" className="space-y-1">
        {categories.map((category) => (
          <li key={category.key}>
            <button
              type="button"
              aria-pressed={selected.key === category.key}
              onClick={() => setSelected(category)}
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring aria-pressed:bg-sidebar-accent aria-pressed:font-semibold"
            >
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
              <span className="flex-1">{category.label}</span>
              <span className="shrink-0 tabular-nums">{category.total}</span>
            </button>
          </li>
        ))}
      </ul>
      <section aria-label="Rincian tingkat risiko" aria-live="polite" className="space-y-4 rounded-(--surface-radius) border border-border bg-workspace p-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{selected.label}</h3>
          <p className="text-xs text-muted-foreground">{selected.total} risiko · {formatShare(selected.total)} dari total</p>
        </div>
        <div aria-hidden="true" className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          {levels.map((level, index) => (
            <span key={level.label} style={{ flex: selected.counts[index], backgroundColor: level.color }} />
          ))}
        </div>
        <dl className="grid gap-2.5 text-sm">
          {levels.map((level, index) => (
            <div key={level.label} className="flex justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: level.color }} />
                {level.label}
              </dt>
              <dd className="tabular-nums">{selected.counts[index]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

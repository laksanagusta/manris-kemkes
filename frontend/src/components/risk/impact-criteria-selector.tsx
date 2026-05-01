"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import {
  ImpactCriteria,
  ImpactCriteriaCategory,
  ImpactCriteriaUPRLevel,
  impactLevelLabels,
} from "@/types/impact-criteria";
import { listImpactCriteria } from "@/lib/api/impact-criteria";

interface ImpactCriteriaSelectorProps {
  token: string;
  category: ImpactCriteriaCategory;
  uprLevel: ImpactCriteriaUPRLevel;
  value?: number; // selected impact level (1-5)
  onChange: (level: number, criteriaId: string) => void;
  disabled?: boolean;
}

export function ImpactCriteriaSelector({
  token,
  category,
  uprLevel,
  value,
  onChange,
  disabled,
}: ImpactCriteriaSelectorProps) {
  const [criteria, setCriteria] = useState<ImpactCriteria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!category || !uprLevel) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    listImpactCriteria(token, { category, uprLevel })
      .then((data) => {
        if (!cancelled) {
          setCriteria(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Gagal memuat kriteria dampak");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, category, uprLevel]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        Memuat kriteria dampak...
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">{error}</p>
    );
  }

  if (criteria.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada kriteria untuk kategori ini
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Pilih level dampak sesuai dengan kategori risiko dan tingkat UPR
      </p>
      <div className="grid gap-2">
        {criteria.map((c) => {
          const isSelected = value === c.impactLevel;
          return (
            <button
              key={c.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.impactLevel, c.id)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {c.impactLevel}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground">
                  {impactLevelLabels[c.impactLevel] || c.impactLabel}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {c.description}
                </div>
              </div>
              {isSelected && (
                <div className="shrink-0 text-primary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
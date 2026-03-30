"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface MitigationPickerProps {
  description: string;
  cause: string;
  impactDescription: string;
  onSelect: (action: string) => void;
  existingActions: string[];
  disabled?: boolean;
}


export function MitigationPicker({ description, cause, impactDescription, onSelect, existingActions, disabled }: MitigationPickerProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function handleGenerate() {
    setLoading(true);
    try {
      const payload = {
        title: description, // using description as proxy title if title isn't passed, wait, picker doesn't get title. Let me pass title down as well or use description. 
        description: description,
        cause: cause,
        impact: impactDescription,
      };
      
      const res = await api.post<string[]>("/ai/mitigations", payload, token || undefined);
      if (Array.isArray(res)) setSuggestions(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(s: string) {
    if (selected.has(s)) return;
    setSelected((prev) => new Set(prev).add(s));
    onSelect(s);
  }

  if (suggestions.length === 0) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={disabled || loading || !description.trim()}
        className="mt-2 gap-2 text-xs text-primary border-primary/20 hover:bg-primary/10"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {loading ? "AI sedang menganalisis..." : "AI Recommend Mitigasi"}
      </Button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/[0.03] p-3 space-y-2">
      <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
        <Sparkles className="size-3" /> Rekomendasi AI — Klik untuk menambahkan
      </p>
      {suggestions.map((s, i) => {
        const isUsed = selected.has(s) || existingActions.some((a) => a.includes(s));
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(s)}
            disabled={isUsed}
            className={`w-full text-left rounded-md border px-3 py-2 text-[11px] transition-all ${
              isUsed
                ? "border-primary/30 bg-primary/10 text-primary/70 cursor-default"
                : "border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              {isUsed && <Check className="size-3 text-primary shrink-0" />}
              {s}
            </span>
          </button>
        );
      })}
    </div>
  );
}

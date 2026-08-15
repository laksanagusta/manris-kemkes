"use client";

import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "@/components/ui/icons";
import { useState } from "react";
import { api } from "@/lib/api";
import { isAIFeaturesDisabled } from "@/lib/ai-feature-capability";
import { useAuth } from "@/contexts/auth-context";
import { AiSuggestionModal, type SuggestionItem } from "./ai-suggestion-modal";

interface MitigationPickerProps {
  title: string;
  description: string;
  cause: string;
  impactDescription: string;
  onSelect: (action: string) => void;
  existingActions: string[];
  disabled?: boolean;
}


export function MitigationPicker({ title, description, cause, impactDescription, onSelect, existingActions, disabled }: MitigationPickerProps) {
  const aiFeaturesDisabled = isAIFeaturesDisabled();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function handleGenerate() {
    if (aiFeaturesDisabled) return;
    setLoading(true);
    setModalOpen(true);
    try {
      const payload = {
        title: title || description,
        description: description,
        cause: cause,
        impact: impactDescription,
      };
      
      const res = await api.post<string[]>("/ai/mitigations", payload, token || undefined);
      if (Array.isArray(res)) {
        setSuggestions(res.map((text, idx) => ({
          id: `mitigation-suggestion-${Date.now()}-${idx}`,
          text,
        })));
      }
    } catch (err) {
      console.error(err);
      setModalOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const handleApply = (selectedItems: SuggestionItem[]) => {
    selectedItems.forEach((item) => {
      onSelect(item.text);
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={
          aiFeaturesDisabled ||
          disabled ||
          loading ||
          !description.trim() ||
          !title.trim()
        }
        className="mt-2 gap-2 text-xs text-primary border-primary/20 bg-primary/[0.03] hover:bg-primary/10"
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
        {loading ? "AI sedang menyiapkan opsi..." : "Minta rekomendasi mitigasi"}
      </Button>

      <AiSuggestionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Rekomendasi AI untuk Mitigasi"
        description="Gunakan saran ini sebagai titik awal, lalu lengkapi detail KMK seperti tahap aktivitas, output, dan sumber daya."
        suggestions={suggestions.filter((s) => !existingActions.some((a) => a.includes(s.text)))}
        isLoading={loading}
        onApply={handleApply}
      />
    </>
  );
}

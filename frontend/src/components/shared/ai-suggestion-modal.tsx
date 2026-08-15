"use client";

import { useState } from "react";
import { Check, Sparkles, Plus, Loader2 } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface SuggestionItem {
  id: string;
  text: string;
}

interface AiSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  suggestions: SuggestionItem[];
  isLoading?: boolean;
  onApply: (selectedItems: SuggestionItem[]) => void;
}

export function AiSuggestionModal({
  open,
  onOpenChange,
  title,
  description = "Pilih saran dari AI yang sesuai dengan konteks risiko Anda.",
  suggestions,
  isLoading = false,
  onApply,
}: AiSuggestionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when modal opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedIds(new Set());
    }
    onOpenChange(isOpen);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    const selectedItems = suggestions.filter((s) => selectedIds.has(s.id));
    onApply(selectedItems);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-none">{title}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1.5">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-[300px] max-h-[60vh] flex-col bg-background">
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 px-4 text-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium text-foreground">AI sedang menganalisis...</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Mohon tunggu sebentar, kami sedang menyusun rekomendasi terbaik untuk Anda.
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm font-medium text-foreground">Belum ada saran</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Pastikan Anda sudah melengkapi informasi yang dibutuhkan sebelum meminta saran AI.
              </p>
            </div>
          ) : (
            <ScrollArea className="min-h-0 flex-1 p-4">
              <div className="space-y-2.5 pb-8">
                {suggestions.map((suggestion) => {
                  const isSelected = selectedIds.has(suggestion.id);
                  return (
                    <div
                      key={suggestion.id}
                      onClick={() => toggleSelection(suggestion.id)}
                      className={cn(
                        "group relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all duration-200",
                        isSelected
                          ? "border-primary bg-primary/[0.03] ring-1 ring-primary/20"
                          : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background group-hover:border-primary/50"
                        )}
                      >
                        {isSelected ? (
                          <Check className="size-3.5" />
                        ) : (
                          <Plus className="size-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="flex-1 text-sm leading-relaxed text-foreground">
                        {suggestion.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="shrink-0 items-center bg-muted/10 sm:justify-between">
          <div className="text-xs text-muted-foreground font-medium hidden sm:block">
            {selectedIds.size} item terpilih
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none h-9"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={selectedIds.size === 0 || isLoading}
              className="flex-1 sm:flex-none h-9 gap-2"
            >
              <Check className="size-3.5" />
              Terapkan Pilihan
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

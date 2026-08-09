"use client";

export type AiSuggestion = {
  id: string;
  title: string;
  description: string;
};

export function AiSuggestionDropdown({
  label,
  suggestions,
  onSelect,
}: {
  label: string;
  suggestions: ReadonlyArray<AiSuggestion>;
  onSelect: (suggestion: AiSuggestion) => void;
}) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-background/95 shadow-lg shadow-black/5 ring-1 ring-border/60 backdrop-blur-md">
      <div className="flex items-center border-b border-border/60 px-4 py-6">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </p>
      </div>
      <div className="max-h-[300px] divide-y divide-border/40 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => onSelect(suggestion)}
            className="w-full p-3 text-left transition-colors hover:bg-muted/30"
          >
            <p className="text-sm font-medium text-foreground">
              {suggestion.title}
            </p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {suggestion.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

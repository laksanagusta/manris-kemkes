"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>{label}</CardTitle></CardHeader>
      <CardContent className="flex max-h-[300px] flex-col gap-1 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            type="button"
            onClick={() => onSelect(suggestion)}
            variant="ghost"
            className="h-auto w-full flex-col items-start whitespace-normal text-left"
          >
            <span>{suggestion.title}</span>
            <CardDescription className="line-clamp-2">
              {suggestion.description}
            </CardDescription>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

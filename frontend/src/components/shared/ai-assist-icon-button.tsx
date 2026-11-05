"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Sparkles } from "@/components/shared/icons";

export function AiAssistIconButton({ label, loading = false, disabled, onClick }: {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const description = loading ? `${label}: memproses...` : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button type="button" variant="outline" size="icon-sm" onClick={onClick}
            disabled={disabled || loading} aria-label={description} aria-busy={loading}>
            {loading ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Sparkles aria-hidden="true" />}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

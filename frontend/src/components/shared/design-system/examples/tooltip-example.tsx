"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shared/design-system";

export function TooltipExample() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" className="shadow-none">
          Hover me
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tooltip content here</p>
      </TooltipContent>
    </Tooltip>
  );
}

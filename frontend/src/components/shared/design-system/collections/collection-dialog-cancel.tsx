import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

import { ActionButton } from "../actions/action-button";

export function CollectionDialogCancel({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <ActionButton
      variant="outline"
      size="default"
      className={className}
      {...props}
    />
  );
}

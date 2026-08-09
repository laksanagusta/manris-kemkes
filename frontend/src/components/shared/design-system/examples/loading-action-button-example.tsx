import type { ReactNode } from "react";

import { LoadingActionButton } from "@/components/shared/design-system";

export function LoadingActionButtonExample({
  children,
  loading = false,
}: {
  children: ReactNode;
  loading?: boolean;
}) {
  return (
    <LoadingActionButton
      type="button"
      variant="outline"
      size="xs"
      className="h-7 gap-2 border-transparent bg-muted/40 px-2.5 text-xs text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"
      loading={loading}
    >
      {children}
    </LoadingActionButton>
  );
}

import { type ReactNode } from "react";
import { FormContainer } from "@/components/shared/design-system/layout/form-container";
import { description } from "./fields";

export function Terbuka({ children }: { children: ReactNode }) {
  return (
    <FormContainer
      title="Identifikasi Risiko"
      description={description}
      className="relative rounded-none bg-transparent
        before:pointer-events-none before:absolute before:inset-x-1 before:top-0 before:border-t-2 before:border-secondary-foreground
        [&>[data-slot=form-header]]:shadow-[inset_0_-1px_0_var(--border)]
        [&>[data-slot=form-panel]]:rounded-none
        [&>[data-slot=form-panel]]:bg-transparent
        [&>[data-slot=form-panel]]:shadow-[inset_0_-1px_0_var(--border)]"
    >
      {children}
    </FormContainer>
  );
}

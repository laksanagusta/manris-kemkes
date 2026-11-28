import { type ReactNode } from "react";
import { FormContainer } from "@/components/shared/design-system/layout/form-container";
import { description } from "./fields";

export function Bingkai({ children }: { children: ReactNode }) {
  return (
    <FormContainer
      title="Identifikasi Risiko"
      description={description}
      className="bg-card ring-1 ring-inset ring-border
        [&>[data-slot=form-header]]:shadow-[inset_0_-1px_0_var(--border)]
        [&>[data-slot=form-panel]]:shadow-none"
    >
      {children}
    </FormContainer>
  );
}

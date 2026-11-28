import { type ReactNode } from "react";
import { FormContainer } from "@/components/shared/design-system/layout/form-container";
import { description } from "./fields";

export function Inset({ children }: { children: ReactNode }) {
  return (
    <FormContainer title="Identifikasi Risiko" description={description}>
      {children}
    </FormContainer>
  );
}

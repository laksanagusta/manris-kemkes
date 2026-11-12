import type { ReactNode } from "react";

import { FormGroup } from "./form-container";

export { FormContainer as DocumentForm } from "./form-container";

export function DocumentFormSection({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <FormGroup className="space-y-2">
      <h3 id={titleId} className="text-sm font-medium text-foreground">
        {title}
      </h3>
      {children}
    </FormGroup>
  );
}

import type { ReactNode } from "react";

import { CollectionPageHeader, FormContainer, FormGroup } from "@/components/shared/design-system";
import { cn } from "@/lib/utils";

type FormPageProps = {
  children: ReactNode;
  className?: string;
};

type FormHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  showTitle?: boolean;
  badges?: ReactNode;
  actions?: ReactNode;
  actionsPlacement?: "header" | "title" | "top";
};

type FormSectionProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FormPage({ children, className }: FormPageProps) {
  return (
    <div
      data-motion-page
      className={cn(
        "w-full min-w-0 animate-fade-in space-y-6 pb-20 [&>header+*]:!mt-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormHeader({
  title,
  subtitle,
  showTitle = false,
  badges,
  actions,
  actionsPlacement = "top",
}: FormHeaderProps) {
  return (
    <CollectionPageHeader
      eyebrow={
        badges ? (
          <div className="flex flex-wrap items-center gap-2">{badges}</div>
        ) : undefined
      }
      title={title}
      subtitle={subtitle}
      showTitle={showTitle}
      actions={actions}
      actionsPlacement={actionsPlacement}
      className="pb-6"
    />
  );
}

export function FormSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  return (
    <FormContainer
      title={title}
      description={description}
      action={action}
      className={className}
    >
      <FormGroup className={cn("space-y-6", contentClassName)}>
        {children}
      </FormGroup>
    </FormContainer>
  );
}

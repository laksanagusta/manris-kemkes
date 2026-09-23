import type { ReactNode } from "react";

import { CollectionPageHeader } from "@/components/shared/design-system";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card
      className={cn(
        "rounded-[12px] bg-card transition-colors duration-200",
        className,
      )}
    >
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold text-foreground">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="max-w-2xl text-sm leading-6">
                {description}
              </CardDescription>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-6", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

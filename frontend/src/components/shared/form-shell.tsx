import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  description?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
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
        "mx-auto w-full animate-fade-in space-y-8 pb-20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function FormHeader({
  title,
  description,
  badges,
  actions,
  onBack,
  backLabel = "Kembali",
}: FormHeaderProps) {
  return (
    <div className="pt-3 pb-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {onBack ? (
            <Button
              type="button"
              variant="ghost"
              aria-label={backLabel}
              className="h-auto rounded-full border border-border/70 bg-background px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-sm transition-all hover:border-primary/25 hover:bg-primary/[0.05] hover:text-foreground"
              onClick={onBack}
            >
              <span className="flex size-6 items-center justify-center rounded-full border border-current/15 bg-muted/[0.55] text-current transition-transform duration-200 group-hover/button:-translate-x-0.5">
                <ArrowLeft className="size-3.5" />
              </span>
              <span className="truncate">{backLabel}</span>
            </Button>
          ) : null}
          <div className="h-px flex-1 bg-gradient-to-r from-border/80 via-border/35 to-transparent" />
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <div className="min-w-0 space-y-2">
              {badges ? (
                <div className="flex flex-wrap items-center gap-2">
                  {badges}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2 md:justify-end md:self-start md:pt-1">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
        "rounded-[24px] border border-border/20 bg-card transition-colors duration-200 focus-within:border-primary/30",
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

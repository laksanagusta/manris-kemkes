import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormFrame({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="form-frame"
      className={cn("min-w-0 rounded-[0.75rem] bg-card-subtle-surface p-1", className)}
      {...props}
    />
  );
}

export function FormPanel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="form-panel"
      className={cn(
        "min-w-0 divide-y divide-border rounded-md bg-card text-sm text-card-foreground shadow-(--surface-shadow-low)",
        className,
      )}
      {...props}
    />
  );
}

export function FormGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="form-group"
      className={cn("min-w-0 px-4 py-6 sm:px-5", className)}
      {...props}
    />
  );
}

export function FormContainer({
  title,
  titleId,
  description,
  action,
  children,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title?: ReactNode;
  titleId?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <FormFrame {...props}>
      {title || description || action ? (
        <div
          data-slot="form-header"
          className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5"
        >
          <div className="min-w-0 flex-1 basis-48">
            {title ? (
              <h2 id={titleId} className="text-base font-medium leading-snug text-foreground">
                {title}
              </h2>
            ) : null}
            {description ? (
              <div className="text-xs leading-5 text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {action ? <div className="min-w-0 max-w-full">{action}</div> : null}
        </div>
      ) : null}
      <FormPanel>{children}</FormPanel>
    </FormFrame>
  );
}

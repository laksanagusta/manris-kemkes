import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type FieldErrorMessageProps = ComponentProps<"p"> & {
  containerClassName?: string;
};

export function FieldErrorMessage({
  children,
  className,
  containerClassName,
  role = "alert",
  ...props
}: FieldErrorMessageProps) {
  if (!children) return null;

  return (
    <div
      data-slot="field-error-message"
      className={cn("field-error-message", containerClassName)}
    >
      <p
        data-slot="field-error-message-content"
        role={role}
        className={cn(
          "field-error-message__content text-xs font-medium leading-5 text-destructive",
          className,
        )}
        {...props}
      >
        {children}
      </p>
    </div>
  );
}

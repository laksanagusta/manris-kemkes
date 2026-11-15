import type { ComponentProps } from "react";
import { Info } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

/** Explain the outcome of a confirmation in the dialog body. */
export function ConfirmationConsequences({ children, className, variant = "default", ...props }: ComponentProps<"div"> & { variant?: "default" | "plain" }) {
  return (
    <div
      data-slot="confirmation-consequences"
      data-variant={variant}
      className={cn(variant === "plain" ? "text-sm font-normal leading-5 text-foreground" : "flex items-start gap-3 text-xs leading-normal text-muted-foreground", className)}
      {...props}
    >
      {variant !== "plain" && <Info aria-hidden="true" className="mt-px size-4 shrink-0" />}
      <div className="min-w-0 flex-1 wrap-anywhere">{children}</div>
    </div>
  );
}

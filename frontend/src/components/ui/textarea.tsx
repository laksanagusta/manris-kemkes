import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm transition-[background-color,border-color] outline-none placeholder:text-muted-foreground hover:border-foreground/15 disabled:hover:border-input focus:border-primary focus-visible:border-primary focus:ring-0 focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-disabled-surface disabled:text-disabled-foreground disabled:opacity-100 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

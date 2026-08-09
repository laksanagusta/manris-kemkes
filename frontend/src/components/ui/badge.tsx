import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-8 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border-0 px-3 py-0 text-sm font-semibold whitespace-nowrap tracking-tight transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-invalid:ring-[3px] aria-invalid:ring-destructive/30 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "border-0 bg-[#eeeeed] text-[#211d1c]",
        secondary: "border-0 bg-[#eeeeed] text-[#211d1c]",
        destructive:
          "border-0 bg-[#fbdedc] text-[#ad001b] focus-visible:ring-[#ad001b]/25",
        outline: "border-0 bg-[#eeeeed] text-[#211d1c]",
        ghost: "border-0 bg-transparent text-zinc-700",
        link: "border-0 bg-transparent text-primary underline-offset-4 hover:underline",
      },
      tone: {
        neutral: "border-0 bg-[#eeeeed] text-[#211d1c]",
        progress: "border-0 bg-[#c6f2fb] text-[#29449a]",
        success: "border-0 bg-[#c9f3df] text-[#006331]",
        warning: "border-0 bg-[#fbedb9] text-[#9b2f00]",
        danger: "border-0 bg-[#fbdedc] text-[#ad001b]",
        info: "border-0 bg-[#c6f2fb] text-[#29449a]",
      },
      size: {
        default: "",
        compact: "h-6 rounded-sm px-2 text-xs",
        micro: "h-5 rounded-sm px-1.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  tone,
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-tone={tone}
      data-size={size}
      className={cn(badgeVariants({ variant, tone, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

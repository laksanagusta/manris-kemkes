"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      richColors
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast border shadow-lg backdrop-blur-sm rounded-xl text-sm [&_[data-title]]:font-semibold [&_[data-description]]:text-xs [&_[data-description]]:leading-5",
          success:
            "bg-success/12 text-success border-success/25 [&_[data-description]]:text-muted-foreground",
          error:
            "bg-destructive/12 text-destructive border-destructive/25 [&_[data-description]]:text-muted-foreground",
          warning:
            "bg-warning/12 text-[color:var(--warning)] border-[color:color-mix(in_oklch,var(--warning)_35%,white)] [&_[data-description]]:text-muted-foreground",
          info:
            "bg-primary/10 text-primary border-primary/20 [&_[data-description]]:text-muted-foreground",
        },
      }}
      theme={undefined}
      {...props}
    />
  )
}

export { Toaster }

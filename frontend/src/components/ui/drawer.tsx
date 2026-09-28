"use client"

import * as React from "react"
import { cn } from "cn"
import { Drawer as DrawerPrimitive } from "vaul"

import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/shared/icons";

function Drawer({
  direction = "right",
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      direction={direction}
      shouldScaleBackground={shouldScaleBackground}
      data-slot="drawer"
      {...props}
    />
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "frosted-scrim fixed inset-0 z-[60] motion-reduce:animate-none motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

const DrawerContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    showCloseButton?: boolean
    dynamicHeight?: boolean
  }
>(function DrawerContent(
  {
    className,
    children,
    showCloseButton = true,
    dynamicHeight = false,
    style,
    ...props
  },
  ref,
) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        data-dynamic-height={dynamicHeight ? "true" : undefined}
        className={cn(
          "group/drawer-content fixed bottom-2 right-2 top-2 z-[70] flex w-[310px] max-w-[calc(100vw-1rem)] outline-none motion-reduce:animate-none motion-reduce:transition-none data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:right-auto data-[vaul-drawer-direction=bottom]:top-auto data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-1rem)] data-[vaul-drawer-direction=bottom]:rounded-t-[12px] data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:left-2 data-[vaul-drawer-direction=left]:right-auto data-[vaul-drawer-direction=left]:w-[310px] data-[vaul-drawer-direction=left]:max-w-[calc(100vw-1rem)]",
          className
        )}
        style={{
          "--initial-transform": "calc(100% + 8px)",
          ...style,
        } as React.CSSProperties}
        ref={ref}
        {...props}
      >
        <div className="relative flex h-full w-full grow flex-col overflow-hidden rounded-[12px] bg-card text-sm text-foreground smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30">
          <DrawerPrimitive.Handle
            data-slot="drawer-handle"
            className="mx-auto mt-4 hidden h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30 group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
          />
          {children}
          {showCloseButton ? (
            <DrawerPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-2 right-2 rounded-full shadow-none hover:bg-muted"
                aria-label="Tutup drawer"
              >
                <XIcon aria-hidden="true" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerPrimitive.Close>
          ) : null}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = DrawerPrimitive.Content.displayName

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1 border-b border-border/70 px-5 py-5 pr-12",
        className
      )}
      {...props}
    />
  )
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 no-scrollbar",
        className,
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto border-t border-border/70 px-5 py-4", className)}
      {...props}
    />
  )
}

function DrawerHandle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Handle>) {
  return (
    <DrawerPrimitive.Handle
      data-slot="drawer-handle"
      className={cn("mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted-foreground/30", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "text-base font-semibold tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm leading-5 text-secondary-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerBody,
  DrawerHandle,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}

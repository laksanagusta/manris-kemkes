"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { Button } from "@/components/ui/button";
import { XIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

function Drawer({
  direction = "right",
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      direction={direction}
      shouldScaleBackground={shouldScaleBackground}
      {...props}
    />
  );
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-[60] bg-black/40 motion-reduce:animate-none motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

const DrawerContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    showCloseButton?: boolean;
    dynamicHeight?: boolean;
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
          "fixed bottom-2 right-2 top-2 z-[70] flex w-[310px] max-w-[calc(100vw-1rem)] outline-none motion-reduce:animate-none motion-reduce:transition-none",
          className,
        )}
        style={
          {
            "--initial-transform": "calc(100% + 8px)",
            ...style,
          } as React.CSSProperties
        }
        ref={ref}
        {...props}
      >
        <div className="relative flex h-full w-full grow flex-col overflow-hidden rounded-[12px] bg-card p-5 text-sm text-foreground smooth-shadow-ring-xl shadow-black smooth-ring-neutral-300/30">
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
  );
});
DrawerContent.displayName = DrawerPrimitive.Content.displayName;

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1 pb-4 pr-9", className)}
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        "-mx-5 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/60 px-5 py-5 no-scrollbar",
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("-mx-5 -mb-5 mt-auto border-t border-border/60 p-5", className)}
      {...props}
    />
  );
}

function DrawerHandle({ className, ...props }: React.ComponentProps<typeof DrawerPrimitive.Handle>) {
  return (
    <DrawerPrimitive.Handle
      data-slot="drawer-handle"
      className={cn("mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted-foreground/30", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm leading-6 text-secondary-foreground", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};

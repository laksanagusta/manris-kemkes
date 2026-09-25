import * as React from "react";
import {
  Drawer as ShadcnDrawer,
  DrawerClose,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

export {
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

/** Inset bottom drawer used by short, multi-step forms. */
export const bottomFormDrawerClassName =
  "mx-auto w-auto max-w-3xl data-[vaul-drawer-direction=bottom]:inset-x-2 data-[vaul-drawer-direction=bottom]:bottom-2 data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-1rem)] data-[vaul-drawer-direction=bottom]:rounded-xl data-[vaul-drawer-direction=bottom]:border";

export function Drawer({
  direction = "right",
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof ShadcnDrawer>) {
  return <ShadcnDrawer direction={direction} shouldScaleBackground={shouldScaleBackground} {...props} />;
}

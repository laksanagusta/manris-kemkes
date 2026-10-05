"use client";

import { Toaster } from "@/components/ui/sonner";
import { Info, TriangleAlertIcon, OctagonXIcon, Loader2 } from "@/components/shared/icons";
import { MotionSuccessCheck } from "@/components/shared/design-system/motion/motion-primitives";

export function AppToaster() {
  return <Toaster icons={{
    success: <MotionSuccessCheck />,
    info: <Info className="size-4" />,
    warning: <TriangleAlertIcon className="size-4" />,
    error: <OctagonXIcon className="size-4" />,
    loading: <Loader2 className="size-4 animate-spin" />,
  }} />;
}

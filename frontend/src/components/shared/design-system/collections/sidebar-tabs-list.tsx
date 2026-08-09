import type { ComponentProps } from "react";

import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function SidebarTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        "h-9 bg-sidebar ring-1 ring-inset ring-sidebar-border",
        className,
      )}
      {...props}
    />
  );
}

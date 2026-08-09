import type { ComponentProps } from "react";

import { TabsTrigger } from "@/components/ui/tabs";

export function CollectionTabsTrigger(
  props: ComponentProps<typeof TabsTrigger>,
) {
  return (
    <TabsTrigger
      className="relative z-10 inline-flex !h-8 !w-auto !flex-none items-center justify-start gap-2 rounded-sm p-2 text-left text-xs font-medium leading-none tracking-normal text-muted-foreground transition-colors duration-200 hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:!shadow-none"
      {...props}
    />
  );
}

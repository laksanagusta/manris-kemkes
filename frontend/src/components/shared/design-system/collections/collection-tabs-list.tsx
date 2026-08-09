import type { ReactNode } from "react";

import { TabsList } from "@/components/ui/tabs";

export function CollectionTabsList({ children }: { children: ReactNode }) {
  return (
    <TabsList className="relative h-auto items-start gap-2 rounded-md bg-transparent p-0">
      {children}
    </TabsList>
  );
}

import type { ReactNode } from "react";

import { TabsList } from "@/components/shared/animated-tabs";

export function CollectionTabsList({ children }: { children: ReactNode }) {
  return (
    <TabsList className="relative h-auto items-start gap-2">
      {children}
    </TabsList>
  );
}

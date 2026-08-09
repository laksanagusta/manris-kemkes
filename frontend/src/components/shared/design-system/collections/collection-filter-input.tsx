import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

export function CollectionFilterInput(props: ComponentProps<typeof Input>) {
  return <Input className="h-9 border-0 bg-muted/50 text-sm" {...props} />;
}

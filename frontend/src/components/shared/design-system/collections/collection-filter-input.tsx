import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

export function CollectionFilterInput(props: ComponentProps<typeof Input>) {
  return <Input className="h-9 rounded-lg border border-input bg-card text-sm" {...props} />;
}

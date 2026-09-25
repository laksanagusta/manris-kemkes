import * as React from "react";

import { Input } from "@/components/ui/input";

/** Search semantics backed by the unmodified shadcn Input. */
export function SearchInput({ type = "search", ...props }: React.ComponentProps<"input">) {
  return <Input type={type} {...props} />;
}

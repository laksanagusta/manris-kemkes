import * as React from "react";

import { Input } from "@/components/ui/input";

/** Search semantics and shared search-surface styling on the stock Input. */
export function SearchInput({ type = "search", ...props }: React.ComponentProps<"input">) {
  return <Input data-search-field="" type={type} {...props} />;
}

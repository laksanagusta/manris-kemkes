import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

import { ActionButton } from "../actions/action-button";

export function CollectionDialogCancel(props: ComponentProps<typeof Button>) {
  return <ActionButton variant="ghost" size="sm" {...props} />;
}

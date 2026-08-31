import { Filter } from "@/components/ui/icons";

import { ActionButton } from "../actions/action-button";

export function CollectionFilterTrigger() {
  return (
    <ActionButton
      icon={<Filter className="size-3.5" strokeWidth={2.5} />}
      variant="outline"
      className="h-10"
    >
      Filter
    </ActionButton>
  );
}

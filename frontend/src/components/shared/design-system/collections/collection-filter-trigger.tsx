import { Filter } from "lucide-react";

import { ActionButton } from "../actions/action-button";

export function CollectionFilterTrigger() {
  return (
    <ActionButton
      icon={<Filter className="size-3.5" strokeWidth={2.5} />}
      variant="outline"
    >
      Filter
    </ActionButton>
  );
}

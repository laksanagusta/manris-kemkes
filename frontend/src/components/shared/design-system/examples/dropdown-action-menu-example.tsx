import { Archive, Trash2 } from "lucide-react";

import { DropdownActionMenu } from "@/components/shared/design-system";

export function DropdownActionMenuExample() {
  return (
    <DropdownActionMenu
      label="Buka menu aksi"
      items={[
        { id: "archive", icon: <Archive className="size-3.5" />, label: "Arsipkan", onSelect: () => undefined },
        { id: "delete", icon: <Trash2 className="size-3.5" />, label: "Hapus", tone: "danger", onSelect: () => undefined },
      ]}
    />
  );
}

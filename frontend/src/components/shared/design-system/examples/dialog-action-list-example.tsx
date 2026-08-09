import { Archive, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";

import { DialogActionList } from "@/components/shared/design-system";

export function DialogActionListExample() {
  return (
    <DialogActionList
      items={[
        { id: "continue", icon: <RefreshCcw className="size-3.5" />, label: "Lanjutkan Pemantauan", onSelect: () => undefined },
        { id: "archive", icon: <Archive className="size-3.5" />, label: "Arsipkan", onSelect: () => undefined },
        { id: "restore", icon: <RotateCcw className="size-3.5" />, label: "Pulihkan", onSelect: () => undefined },
        { id: "delete", icon: <Trash2 className="size-3.5" />, label: "Hapus Draft", tone: "danger", onSelect: () => undefined },
      ]}
    />
  );
}

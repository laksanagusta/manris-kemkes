import { DialogActionList } from "@/components/shared/design-system";

export function DialogActionListExample() {
  return (
    <DialogActionList
      items={[
        { id: "continue", label: "Lanjutkan Pemantauan", onSelect: () => undefined },
        { id: "archive", label: "Arsipkan", onSelect: () => undefined },
        { id: "restore", label: "Pulihkan", onSelect: () => undefined },
        { id: "delete", label: "Hapus Draft", tone: "danger", onSelect: () => undefined },
      ]}
    />
  );
}

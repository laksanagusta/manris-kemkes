import { DropdownActionMenu } from "@/components/shared/design-system";

export function DropdownActionMenuExample() {
  return (
    <DropdownActionMenu
      label="Buka menu aksi"
      items={[
        { id: "archive", label: "Arsipkan", onSelect: () => undefined },
        { id: "delete", label: "Hapus", tone: "danger", onSelect: () => undefined },
      ]}
    />
  );
}

import { ShieldCheck } from "@/components/ui/icons";

import {
  AccentButton,
  ActionButton,
  CollectionPageHeader,
} from "@/components/shared/design-system";

export function CollectionPageHeaderExample() {
  return (
    <CollectionPageHeader
      icon={<ShieldCheck className="size-7" strokeWidth={1.8} />}
      title="Daftar Risiko"
      subtitle="Kelola identifikasi, status, dan siklus pemantauan risiko."
      showTitle
      actions={
        <>
          <ActionButton>Import Risiko</ActionButton>
          <AccentButton>Tambah Risiko</AccentButton>
        </>
      }
    />
  );
}

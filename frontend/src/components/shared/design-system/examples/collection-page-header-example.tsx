import { Plus, ShieldCheck, Upload } from "@/components/ui/icons";

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
      description="Kelola dan pantau seluruh risiko organisasi."
      actions={
        <>
          <ActionButton icon={<Upload className="size-3.5" strokeWidth={2.5} />}>
            Import Risiko
          </ActionButton>
          <AccentButton icon={<Plus className="size-3.5" strokeWidth={2.5} />}>
            Tambah Risiko
          </AccentButton>
        </>
      }
    />
  );
}

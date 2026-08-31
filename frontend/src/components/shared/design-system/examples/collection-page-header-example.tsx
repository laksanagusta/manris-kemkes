import Link from "next/link";
import { ArrowLeft, Plus, ShieldCheck, Upload } from "@/components/ui/icons";

import {
  AccentButton,
  ActionButton,
  CollectionPageHeader,
} from "@/components/shared/design-system";

export function CollectionPageHeaderExample() {
  return (
    <CollectionPageHeader
      backAction={
        <ActionButton
          asChild
          variant="secondary"
          size="sm"
          className="border-0 text-sm font-normal"
        >
          <Link href="/risk/register">
            <ArrowLeft className="size-3.5" />
            Kembali
          </Link>
        </ActionButton>
      }
      icon={<ShieldCheck className="size-7" strokeWidth={1.8} />}
      title="Daftar Risiko"
      showTitle
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

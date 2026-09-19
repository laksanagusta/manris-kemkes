"use client";

import Link from "next/link";

import {
  AccentButton,
  ActionButton,
  ActionIconButton,
} from "@/components/shared/design-system";

export function ActionButtonsExample() {
  return (
    <div className="space-y-4 rounded-lg bg-card p-6 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton>Buat item</AccentButton>
        <ActionButton>Lanjutkan</ActionButton>
        <ActionButton loading>Memproses...</ActionButton>
        <ActionIconButton aria-label="Buka menu aksi contoh" />
        <ActionButton asChild>
          <Link href="/design-system">Buka halaman</Link>
        </ActionButton>
      </div>
    </div>
  );
}

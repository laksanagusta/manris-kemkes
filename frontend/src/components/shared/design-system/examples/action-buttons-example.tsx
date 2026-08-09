"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import {
  AccentButton,
  ActionButton,
} from "@/components/shared/design-system";

export function ActionButtonsExample() {
  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 shadow-none">
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton icon={<Plus className="size-3.5" strokeWidth={2.5} />}>
          Buat item
        </AccentButton>
        <ActionButton icon={<ArrowRight className="size-3.5" />}>
          Lanjutkan
        </ActionButton>
        <ActionButton loading>Memproses...</ActionButton>
        <ActionButton asChild>
          <Link href="/design-system">
            <ArrowRight className="size-3.5" />
            Buka halaman
          </Link>
        </ActionButton>
      </div>
    </div>
  );
}

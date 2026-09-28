"use client";

import {
  ChevronLeft,
  Filter,
  MoreHorizontal,
} from "@/components/shared/icons";

import { AccentButton, DestructiveButton, LoadingActionButton } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";

export function ButtonVariantsExample() {
  return (
    <div className="space-y-4 rounded-[12px] bg-card p-6 shadow-black">
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton>Primary</AccentButton>
        <Button variant="secondary" size="default">
          Secondary
        </Button>
        <Button variant="outline" size="default" className="">
          Outline
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          className=""
          aria-label="Filter"
          title="Filter"
        >
          <Filter className="size-3.5" />
        </Button>
        <Button variant="ghost" size="default" className="">
          Ghost
        </Button>
        <DestructiveButton>Hapus</DestructiveButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton>Ajukan review</AccentButton>
        <Button variant="outline" size="icon-xs" className="">
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button variant="outline" size="xs" className="min-w-10">
          1
        </Button>
        <Button variant="outline" size="xs" className="min-w-10">
          2
        </Button>
        <Button variant="ghost" size="icon-xs" className="">
          <MoreHorizontal className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LoadingActionButton
          variant="outline"
          size="xs"
          className="h-7 px-4 text-[14px] text-muted-foreground hover:text-foreground"
        >
          AI Button
        </LoadingActionButton>
        <LoadingActionButton
          variant="outline"
          size="xs"
          loading
          className="h-7 px-4 text-[14px] text-muted-foreground hover:text-foreground"
        >
          Memproses...
        </LoadingActionButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Semua kontrol yang dapat diklik memakai cursor pointer; kontrol
        disabled memakai cursor not-allowed.
      </p>
    </div>
  );
}

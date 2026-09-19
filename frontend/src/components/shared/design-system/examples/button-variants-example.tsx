"use client";

import {
  ChevronLeft,
  Filter,
  MoreHorizontal,
} from "@/components/ui/icons";

import { AccentButton, DestructiveButton, LoadingActionButton } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";

export function ButtonVariantsExample() {
  return (
    <div className="space-y-4 rounded-lg bg-card p-6 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton>Primary</AccentButton>
        <Button variant="secondary" size="md">
          Secondary
        </Button>
        <Button variant="outline" size="md" className="border-transparent shadow-none">
          Outline
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          className="border-transparent shadow-none"
          aria-label="Filter"
          title="Filter"
        >
          <Filter className="size-3.5" />
        </Button>
        <Button variant="ghost" size="md" className="shadow-none">
          Ghost
        </Button>
        <DestructiveButton>Hapus</DestructiveButton>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton>Ajukan review</AccentButton>
        <Button variant="outline" size="icon-xs" className="rounded-lg border-transparent bg-white shadow-none">
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button variant="outline" size="xs" className="min-w-10 rounded-lg border-transparent bg-white px-4 text-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          1
        </Button>
        <Button variant="outline" size="xs" className="min-w-10 rounded-lg border-transparent bg-white px-4 text-foreground/80 shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          2
        </Button>
        <Button variant="ghost" size="icon-xs" className="bg-white text-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
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

"use client";

import { ChevronLeft, Filter, MoreHorizontal, Plus, Save, Send, Trash2, WandSparkles } from "@/components/ui/icons";

import { AccentButton, LoadingActionButton } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";

export function ButtonVariantsExample() {
  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton icon={<Plus className="size-3.5" strokeWidth={2.5} />}>
          Primary
        </AccentButton>
        <Button variant="secondary" size="md">
          Secondary
        </Button>
        <Button variant="outline" size="md" className="border-transparent shadow-none">
          <Save className="size-3.5" />
          Outline
        </Button>
        <Button variant="outline" size="md" className="gap-2 border-transparent shadow-none">
          <Filter className="size-3.5" strokeWidth={2.5} />
          Filter
        </Button>
        <Button variant="ghost" size="md" className="shadow-none">
          Ghost
        </Button>
        <Button variant="destructive" size="sm" className="shadow-none">
          <Trash2 className="size-3.5" />
          Destructive
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <AccentButton icon={<Send className="size-3.5" />}>
          Ajukan review
        </AccentButton>
        <Button variant="outline" size="icon-xs" className="rounded-lg border-transparent bg-white shadow-none">
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button variant="outline" size="xs" className="min-w-10 rounded-lg border-transparent bg-white px-3 text-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          1
        </Button>
        <Button variant="outline" size="xs" className="min-w-10 rounded-lg border-transparent bg-white px-3 text-foreground/80 shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          2
        </Button>
        <Button variant="ghost" size="icon-xs" className="bg-white text-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <MoreHorizontal className="size-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <LoadingActionButton variant="outline" size="xs">
          <WandSparkles className="size-3" />
          AI Button
        </LoadingActionButton>
        <LoadingActionButton variant="outline" size="xs" loading>
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

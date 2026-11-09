"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CollectionSearchField } from "../collections/collection-search-field";
import { CollectionToolbar } from "../collections/collection-toolbar";

export function SurfaceDepthExample() {
  return (
    <div className="flex flex-col gap-4">
      <CollectionToolbar
        leading={<CollectionSearchField aria-label="Contoh search" placeholder="Contoh search…" />}
        actions={<Button variant="outline">Tombol outline</Button>}
      />
      <Card>
        <CardHeader><CardTitle>Kartu dan bingkai tabel</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Garis luar 1 px pada 6% hitam dan bayangan 0 2px 4px pada 3% hitam.</p>
          <div className="rounded-(--surface-radius) bg-card-subtle-surface p-4 text-sm text-muted-foreground">Isi inset tetap datar.</div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild data-slot="button"><Button variant="outline">Popover surface</Button></PopoverTrigger>
          <PopoverContent aria-label="Contoh surface popover"><p>Garis luar 1 px dan bayangan 0 4px 12px.</p></PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild data-slot="button"><Button variant="outline">Menu surface</Button></DropdownMenuTrigger>
          <DropdownMenuContent><DropdownMenuItem>Contoh pilihan</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild data-slot="button"><Button variant="outline">Tooltip surface</Button></TooltipTrigger>
            <TooltipContent>Tooltip mengikuti surface melayang.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Dialog>
          <DialogTrigger asChild data-slot="button"><Button variant="outline">Dialog surface</Button></DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Surface dialog</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Garis luar 1 px pada 8% hitam dan bayangan 0 6px 32px pada 7% hitam.</p>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild data-slot="button"><Button variant="outline">Sheet surface</Button></SheetTrigger>
          <SheetContent aria-describedby={undefined}>
            <SheetHeader><SheetTitle>Surface sheet</SheetTitle></SheetHeader>
            <p className="px-4 text-sm text-muted-foreground">Sheet mengikuti surface dialog.</p>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

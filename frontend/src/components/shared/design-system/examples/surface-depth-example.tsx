"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SurfaceDepthExample() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Surface rendah</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">Border 1px dengan shadow 0 1px 4px · 6% pada tema terang.</p>
          <div className="rounded-xl bg-card-subtle-surface p-4 text-sm text-muted-foreground">Isi inset tetap datar.</div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild><Button variant="outline">Popover surface</Button></PopoverTrigger>
          <PopoverContent aria-label="Contoh surface popover"><p>Surface melayang · border 1px dan shadow 0 4px 12px.</p></PopoverContent>
        </Popover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline">Menu surface</Button></DropdownMenuTrigger>
          <DropdownMenuContent><DropdownMenuItem>Contoh pilihan</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="outline">Tooltip surface</Button></TooltipTrigger>
            <TooltipContent>Tooltip mengikuti surface melayang.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Dialog>
          <DialogTrigger asChild><Button variant="outline">Dialog surface</Button></DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Surface dialog</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Border 1px dan shadow 0 8px 24px · 10% pada tema terang.</p>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger asChild><Button variant="outline">Sheet surface</Button></SheetTrigger>
          <SheetContent aria-describedby={undefined}>
            <SheetHeader><SheetTitle>Surface sheet</SheetTitle></SheetHeader>
            <p className="px-4 text-sm text-muted-foreground">Sheet mengikuti surface dialog.</p>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

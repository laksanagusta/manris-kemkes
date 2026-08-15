"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/design-system";

export function CardPatternsExample() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-0 overflow-hidden rounded-2xl bg-card p-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Standard Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Card standar dengan outline neutral yang terlihat jelas dan shadow tipis dekat edge.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl bg-card/80 p-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30 backdrop-blur-lg transition-colors duration-300">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Frosted Glass Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Digunakan di panel navigasi dan review side panel.
          </p>
        </CardContent>
      </Card>

      <Card className="relative gap-0 overflow-hidden rounded-2xl bg-card p-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Table Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 py-4 text-sm text-muted-foreground">
            Card table menggunakan elevation yang sama agar boundary dan shadow tetap satu lapisan.
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Inline Card
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Surface inline menggunakan elevation standar widget dan tetap hemat visual.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

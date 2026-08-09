"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/design-system";

export function CardPatternsExample() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-0 overflow-hidden rounded-2xl bg-card p-0 shadow-none ring-1 ring-inset ring-border">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Standard Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Card standar dengan rounded-2xl, ring-1 ring-inset ring-border, bg-card, shadow-none.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl bg-card/80 p-0 shadow-sm backdrop-blur-lg transition-colors duration-300 ring-1 ring-inset ring-border">
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

      <Card className="relative gap-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-card p-0 shadow-none ring-0">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Table Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 py-4 text-sm text-muted-foreground">
            Card khusus table dengan satu border seperti accordion item: border-zinc-200/80, bg-card, shadow-none, ring-0.
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
              Inline Card
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              ring-1 ring-inset ring-border sebagai ganti border, mengikuti shell overview.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

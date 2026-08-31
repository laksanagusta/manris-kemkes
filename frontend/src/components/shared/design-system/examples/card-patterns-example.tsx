"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/shared/design-system";

export function CardPatternsExample() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="gap-0 overflow-hidden rounded-2xl bg-card p-0">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-sm font-medium normal-case text-foreground">
            Standard Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Card standar memakai border-shadow berbasis shadow-custom untuk perimeter dan lift yang konsisten.
          </p>
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-2xl bg-card/80 p-0 backdrop-blur-lg transition-colors duration-300">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-sm font-medium normal-case text-foreground">
            Frosted Glass Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Digunakan di panel navigasi dan review side panel.
          </p>
        </CardContent>
      </Card>

      <Card className="relative gap-0 overflow-hidden rounded-2xl bg-card p-0">
        <CardHeader className="px-4 py-6 !pb-6">
          <CardTitle className="text-sm font-medium normal-case text-foreground">
            Table Card
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 py-4 text-sm text-muted-foreground">
            Card table menggunakan shadow-custom yang sama agar boundary dan lift tetap satu lapisan.
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-card">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium normal-case text-foreground">
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

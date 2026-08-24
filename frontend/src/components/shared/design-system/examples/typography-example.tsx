"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

export function TypographyExample() {
  return (
    <Card className="overflow-hidden rounded-2xl bg-card">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] text-muted-foreground">
            --font-sans: Plus Jakarta Sans
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            --font-mono: JetBrains Mono
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt=""
                width={20}
                height={20}
                className="size-5 object-contain"
              />
              <p className="text-base font-semibold text-foreground">Manris</p>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              Brand mark + wordmark · 4×4 dot grid · 20px mark · text-base font-semibold
            </p>
          </div>
          <div>
            <p className="page-title">
              Display / H1
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              page-title · 30px → 36px · semibold
            </p>
          </div>
          <div>
            <p className="text-xl font-semibold tracking-tight text-foreground">
              Section Title
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              text-xl font-semibold tracking-tight
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Label / Body</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              text-sm font-medium
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Helper / Caption</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              text-xs text-muted-foreground
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-foreground">Badge / Micro</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              text-[11px] font-medium
            </p>
          </div>
          <div>
            <p className="font-mono tabular-nums text-sm text-foreground">
              Monospace: 12345.67
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              font-mono tabular-nums
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

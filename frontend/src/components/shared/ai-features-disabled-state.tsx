"use client";

import Link from "next/link";
import { BotOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIFeaturesDisabledStateProps {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}

export function AIFeaturesDisabledState({
  title = "Fitur AI Dinonaktifkan",
  description = "Fitur AI pada frontend sedang dimatikan melalui konfigurasi environment. Hubungi admin bila fitur ini perlu diaktifkan kembali.",
  backHref = "/overview",
  backLabel = "Kembali ke dashboard",
}: AIFeaturesDisabledStateProps) {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Card className="w-full max-w-2xl border-border/60 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <BotOff className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

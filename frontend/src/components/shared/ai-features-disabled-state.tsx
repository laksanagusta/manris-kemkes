"use client";

import { BotOff } from "@/components/ui/icons";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface AIFeaturesDisabledStateProps {
  title?: string;
  description?: string;
}

export function AIFeaturesDisabledState({
  title = "Fitur AI Dinonaktifkan",
  description = "Fitur AI pada frontend sedang dimatikan melalui konfigurasi environment. Hubungi admin bila fitur ini perlu diaktifkan kembali.",
}: AIFeaturesDisabledStateProps) {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <BotOff className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm leading-6 text-secondary-foreground">
              {description}
            </p>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

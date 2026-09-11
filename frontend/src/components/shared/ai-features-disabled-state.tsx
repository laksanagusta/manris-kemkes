"use client";

import { BotOff } from "@/components/ui/icons";
import { FormBackAction } from "@/components/shared/design-system";
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <BotOff className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm leading-6 text-secondary-foreground">
              {description}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <FormBackAction href={backHref} label={backLabel} />
        </CardContent>
      </Card>
    </div>
  );
}

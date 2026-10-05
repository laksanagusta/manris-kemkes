"use client";

import { AlertCircle, ArrowUpRight } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function CollectionErrorState({
  title = "Gagal Memuat Data",
  message,
  onReload,
}: {
  title?: string;
  message?: string;
  onReload?: () => void;
}) {
  return (
    <Alert data-motion-feedback-state variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      {message ? <AlertDescription>{message}</AlertDescription> : null}
      {onReload ? (
        <Button onClick={onReload} variant="outline" size="sm">
          <ArrowUpRight data-icon="inline-start" />
          Coba lagi
        </Button>
      ) : null}
    </Alert>
  );
}

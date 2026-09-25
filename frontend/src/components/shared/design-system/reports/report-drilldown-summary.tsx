"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function ReportDrilldownSummary({
  children,
  onReset,
}: {
  children: ReactNode;
  onReset: () => void;
}) {
  return (
    <Alert>
      <AlertTitle>Drilldown aktif:</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-2">{children}</AlertDescription>
      <Button
        type="button"
        onClick={onReset}
        variant="ghost"
        size="sm"
        className="ml-auto"
      >
        Reset filter
      </Button>
    </Alert>
  );
}

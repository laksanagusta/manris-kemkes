"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { PillTabsList } from "@/components/shared/design-system/collections/pill-tabs";

export function RiskDetailTabs({
  enabled,
  overview,
  monitoring,
  treatment,
  value: controlledValue,
  onValueChange,
}: {
  enabled: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  overview: ReactNode;
  monitoring: ReactNode;
  treatment: ReactNode;
}) {
  const [localValue, setLocalValue] = useState("overview");
  const value = controlledValue ?? localValue;
  const setValue = onValueChange ?? setLocalValue;
  if (!enabled) return <>{overview}</>;
  return (
    <Tabs
      value={enabled ? value : "overview"}
      onValueChange={setValue}
      className="min-w-0 gap-6"
    >
      {enabled && (
        <PillTabsList aria-label="Bagian detail risiko">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="monitoring">Pemantauan</TabsTrigger>
          <TabsTrigger value="treatment">Penanganan</TabsTrigger>
        </PillTabsList>
      )}
      <TabsContent
        value="overview"
        forceMount
        className="min-w-0 data-[state=inactive]:hidden"
      >
        {overview}
      </TabsContent>
      {enabled && (
        <TabsContent
          value="monitoring"
          forceMount
          className="min-w-0 data-[state=inactive]:hidden"
        >
          {monitoring}
        </TabsContent>
      )}
      {enabled && (
        <TabsContent
          value="treatment"
          forceMount
          className="min-w-0 data-[state=inactive]:hidden"
        >
          {treatment}
        </TabsContent>
      )}
    </Tabs>
  );
}

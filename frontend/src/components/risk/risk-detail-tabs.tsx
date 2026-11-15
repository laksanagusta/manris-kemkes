"use client";

import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  return (
    <Tabs
      value={enabled ? value : "overview"}
      onValueChange={setValue}
      className="min-w-0 gap-6"
    >
      {enabled && (
        <TabsList data-risk-detail-segments="" data-active-tab={value} aria-label="Bagian detail risiko">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="treatment">Penanganan</TabsTrigger>
          <TabsTrigger value="monitoring">Pemantauan</TabsTrigger>
        </TabsList>
      )}
      <TabsContent
        value="overview"
        forceMount
        className={enabled ? "min-w-0 data-[state=inactive]:hidden" : "min-w-0 text-inherit"}
        {...(!enabled && { role: undefined, "aria-labelledby": undefined, tabIndex: undefined })}
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

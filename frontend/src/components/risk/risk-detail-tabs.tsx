"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHeaderTabPortalTarget } from "@/lib/header-actions-context";

export function RiskDetailTabs({
  enabled,
  overview,
  monitoring,
  treatment,
  value: controlledValue,
  onValueChange,
  portalToTopbar = false,
}: {
  enabled: boolean;
  portalToTopbar?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  overview: ReactNode;
  monitoring: ReactNode;
  treatment: ReactNode;
}) {
  const [localValue, setLocalValue] = useState("overview");
  const topbarTarget = useHeaderTabPortalTarget();
  const value = controlledValue ?? localValue;
  const setValue = onValueChange ?? setLocalValue;

  const tabsList = (
    <TabsList data-risk-detail-segments="" data-active-tab={value} aria-label="Bagian detail risiko">
      <TabsTrigger value="overview">Ringkasan</TabsTrigger>
      <TabsTrigger value="treatment">Penanganan</TabsTrigger>
      <TabsTrigger value="monitoring">Pemantauan</TabsTrigger>
    </TabsList>
  );

  return (
    <Tabs
      value={enabled ? value : "overview"}
      onValueChange={setValue}
      className="min-w-0 gap-6"
    >
      {enabled && (
        portalToTopbar
          ? topbarTarget ? createPortal(tabsList, topbarTarget) : null
          : tabsList
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

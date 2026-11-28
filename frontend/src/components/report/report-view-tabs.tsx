"use client";

import { TabsList, TabsTrigger } from "@/components/shared/animated-tabs";

export function ReportViewTabs() {
  return (
    <TabsList aria-label="Tampilan laporan risiko" className="self-start">
      <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
      <TabsTrigger value="perbandingan">Perbandingan</TabsTrigger>
    </TabsList>
  );
}

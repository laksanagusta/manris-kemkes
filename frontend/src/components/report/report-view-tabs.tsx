"use client";

import { createPortal } from "react-dom";
import { TabsList, TabsTrigger } from "@/components/shared/animated-tabs";

/** Render inside the report Tabs root so portaled triggers retain panel semantics. */
export function ReportViewTabs({ target }: { target: HTMLElement | null }) {
  if (!target) return null;
  return createPortal(
    <TabsList aria-label="Tampilan laporan risiko">
      <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
      <TabsTrigger value="perbandingan">Perbandingan</TabsTrigger>
    </TabsList>, target,
  );
}

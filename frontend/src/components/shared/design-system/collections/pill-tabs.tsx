"use client";

import type { ComponentProps } from "react";
import { TabsList } from "@/components/ui/tabs";

/** Separate rounded tabs; Radix retains selection, focus and arrow-key behavior. */
export function PillTabsList(props: ComponentProps<typeof TabsList>) {
  return <TabsList {...props} variant="default" data-pill-tabs="" />;
}

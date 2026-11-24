import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardPrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Dashboard · Manrisk" };

export default async function DashboardPreview({ searchParams }: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { v } = await searchParams;
  return <DashboardPrototype initialVariant={v === "2" ? 1 : v === "3" ? 2 : 0} />;
}

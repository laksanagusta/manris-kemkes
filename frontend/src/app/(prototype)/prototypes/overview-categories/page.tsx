import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OverviewCategoryPrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Kategori Risiko · Manrisk" };

export default async function OverviewCategoryPreview({ searchParams }: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  const initialVariant = v === "2" ? 1 : v === "3" ? 2 : 0;
  return <OverviewCategoryPrototype initialVariant={initialVariant} />;
}

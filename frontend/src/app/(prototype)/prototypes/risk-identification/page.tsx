import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdentificationPrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Identifikasi Risiko · Manrisk" };

export default async function IdentificationPreview({ searchParams }: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  return <IdentificationPrototype initialVariant={v === "2" ? 1 : v === "3" ? 2 : 0} />;
}

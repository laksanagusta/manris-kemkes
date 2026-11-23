import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MonitoringReviewPrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Hasil Pemantauan · Manrisk" };

export default async function MonitoringReviewPreview({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  return <MonitoringReviewPrototype initialVariant={typeof v === "string" ? Number(v) : 1} />;
}

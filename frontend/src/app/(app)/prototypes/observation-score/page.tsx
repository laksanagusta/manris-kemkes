import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ObservationScorePrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Skor Risiko Observasi · Manrisk" };

export default async function ObservationScorePreview({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  const choice = typeof v === "string" ? Number(v) : 1;
  return <ObservationScorePrototype initialIndex={Number.isInteger(choice) && choice >= 1 && choice <= 3 ? choice - 1 : 0} />;
}

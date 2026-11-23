import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RiskRegisterPrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Register Risiko · Manrisk" };

export default async function RiskRegisterPreview({ searchParams }: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  return <RiskRegisterPrototype initialVariant={typeof v === "string" ? Number(v) : 1} />;
}

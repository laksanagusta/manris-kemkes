import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkingPaperSignaturePrototype } from "./prototype";

export const metadata: Metadata = { title: "Prototipe Status Tanda Tangan · Manrisk" };

export default async function WorkingPaperSignaturePreview({
  searchParams,
}: {
  searchParams: Promise<{ v?: string | string[] }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  return <WorkingPaperSignaturePrototype initialVariant={typeof v === "string" ? Number(v) : 1} />;
}

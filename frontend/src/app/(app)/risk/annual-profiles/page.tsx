import { redirect } from "next/navigation";
import { AnnualProfileCollectionPage } from "@/components/upr/annual-profile-collection-page";
import { annualProfileHref, isAnnualProfileYear } from "@/lib/annual-profile";

export default async function AnnualProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string; versi?: string }>;
}) {
  const { tahun, versi } = await searchParams;
  const year = Number(tahun);
  if (tahun && isAnnualProfileYear(year))
    redirect(annualProfileHref(year, versi));
  return <AnnualProfileCollectionPage />;
}

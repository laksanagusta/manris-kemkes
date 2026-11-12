import { redirect } from "next/navigation";

export default async function RiskConditionReportPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.append(key, value);
    else if (value) value.forEach((entry) => query.append(key, entry));
  }
  query.set("tab", "perbandingan");
  redirect(`/reports?${query}`);
}

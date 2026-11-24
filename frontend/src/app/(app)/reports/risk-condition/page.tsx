import { redirect } from "next/navigation";

export default async function RiskConditionReportPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { rule, units } = await searchParams;
  const query = new URLSearchParams();
  if (typeof rule === "string" && rule) query.set("rule", rule);
  if (typeof units === "string" && units) query.set("units", units);
  redirect(`/reports${query.size ? `?${query}` : ""}`);
}

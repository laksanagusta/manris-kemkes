export const documentationGroups = [
  { title: "MULAI DI SINI", items: [
    { slug: "introduction", title: "Panduan penggunaan" },
    { slug: "account-access", title: "Akses akun" },
  ] },
  { title: "TATA KELOLA", items: [
    { slug: "risk-charter", title: "Piagam Manrisk" },
    { slug: "risk-escalation", title: "Eskalasi Risiko" },
  ] },
  { title: "MANAJEMEN RISIKO", items: [
    { slug: "risk-register", title: "Register Risiko" },
    { slug: "risk-treatment", title: "Penanganan" },
    { slug: "risk-monitoring", title: "Pemantauan" },
    { slug: "risk-events", title: "Kejadian Risiko" },
  ] },
  { title: "DOKUMEN & PELAPORAN", items: [
    { slug: "working-papers", title: "Kertas Kerja" },
    { slug: "signatures", title: "Tanda tangan" },
    { slug: "dashboard", title: "Dashboard" },
    { slug: "reports", title: "Laporan" },
  ] },
  { title: "OTOMASI", items: [
    { slug: "meeting-minutes", title: "MoM" },
  ] },
  { title: "INTEGRASI", items: [
    { slug: "api-key", title: "API key" },
  ] },
  { title: "ADMINISTRASI", items: [
    { slug: "organization-groups", title: "Grup" },
  ] },
  { title: "BANTUAN", items: [
    { slug: "glossary-and-troubleshooting", title: "Istilah & kendala" },
  ] },
] as const;

export const documentationItems = documentationGroups.flatMap((group) => [...group.items]);
export type DocumentationSlug = (typeof documentationItems)[number]["slug"];

export function documentationHref(slug: string) {
  return `/docs/${slug}`;
}

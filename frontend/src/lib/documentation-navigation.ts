export const documentationGroups = [
  { title: "MULAI DI SINI", items: [
    { slug: "pengenalan", title: "Panduan penggunaan" },
    { slug: "akses-akun", title: "Akses akun" },
  ] },
  { title: "TATA KELOLA", items: [
    { slug: "piagam-manris", title: "Piagam Manris" },
    { slug: "eskalasi-risiko", title: "Eskalasi Risiko" },
  ] },
  { title: "MANAJEMEN RISIKO", items: [
    { slug: "register-risiko", title: "Register Risiko" },
    { slug: "penanganan", title: "Penanganan" },
    { slug: "pemantauan", title: "Pemantauan" },
    { slug: "kejadian-risiko", title: "Kejadian Risiko" },
  ] },
  { title: "DOKUMEN & PELAPORAN", items: [
    { slug: "kertas-kerja", title: "Kertas Kerja" },
    { slug: "tanda-tangan", title: "Tanda tangan" },
    { slug: "dashboard", title: "Dashboard" },
    { slug: "laporan", title: "Laporan" },
  ] },
  { title: "OTOMASI", items: [
    { slug: "mom", title: "MoM" },
  ] },
  { title: "BANTUAN", items: [
    { slug: "istilah-dan-kendala", title: "Istilah & kendala" },
  ] },
] as const;

export const documentationItems = documentationGroups.flatMap((group) => [...group.items]);
export type DocumentationSlug = (typeof documentationItems)[number]["slug"];

export function documentationHref(slug: string) {
  return `/panduan/${slug}`;
}

import Link from "next/link";
import { ArticleContent, type DocumentationArticle } from "@/components/documentation/article-content";

export const documentationExampleArticle: DocumentationArticle = {
  slug: "example", title: "Mulai menggunakan Manrisk", category: "MULAI DI SINI",
  description: "Pelajari urutan kerja di Manrisk, dari pencatatan risiko hingga pemantauan dan pelaporan berkala.",
  access: "Menu yang tampil mengikuti hak akses dan cakupan organisasi akun Anda.",
  sections: [
    { id: "contoh-alur", title: "Pahami alur kerja", image: { src: "/documentation/screens/dashboard-start.png", alt: "Dashboard Manrisk dengan ringkasan risiko, grafik, dan peta risiko", caption: "Dashboard Manrisk menampilkan ringkasan dan tren untuk cakupan serta periode yang dipilih.", width: 3420, height: 1906 }, diagram: [
      { title: "Identifikasi", detail: "Catat profil dan nilai risiko." },
      { title: "Penanganan", detail: "Susun dan laporkan mitigasi." },
      { title: "Pemantauan", detail: "Nilai kondisi setiap periode." },
    ] },
    { id: "contoh-detail", title: "Tinjau detail dokumen", image: { src: "/documentation/screens/working-paper-detail.png", alt: "Detail Kertas Kerja dengan perubahan skor risiko, ringkasan, progres pemantauan dan histori tanda tangan", caption: "Screenshot yang diberikan pengguna merupakan snapshot. Nama, skor, periode, dan histori tanda tangan mengikuti dokumen serta akses akun.", width: 3420, height: 1904 } },
    { id: "contoh-video", title: "Video panduan", video: { youtubeId: "IXlINKzRdQk", title: "Video panduan penggunaan Manrisk", caption: "Video YouTube yang disediakan untuk panduan Manrisk." } },
    { id: "contoh-langkah", title: "Ikuti langkah penggunaan", steps: [
      { title: "Pilih panduan dari sidebar", detail: "Menu mengikuti tampilan navigasi aplikasi. Setiap topik memiliki alamat artikelnya sendiri. Panduan API key tersedia sebagai menu tersendiri dalam kelompok Integrasi." },
      { title: "Baca bagian yang diperlukan", detail: "Daftar isi di kanan membantu menemukan bagian artikel. Pada layar kecil, buka daftar isi Di halaman ini." },
    ], note: "Menu dan tindakan yang tersedia dalam aplikasi mengikuti hak akses serta organisasi akun Anda." },
  ],
};

export function DocumentationExample() {
  return <div className="space-y-4"><div className="max-w-3xl rounded-xl border border-border bg-card px-6 py-8"><ArticleContent article={documentationExampleArticle} /></div><Link href="/docs/introduction" className="text-sm underline underline-offset-4">Buka panduan pengguna</Link><Link href="/docs/api-key" className="block text-sm underline underline-offset-4">Buka panduan integrasi API key</Link></div>;
}

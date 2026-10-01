import Link from "next/link";
import { ArticleContent, type DocumentationArticle } from "@/components/documentation/article-content";

export const documentationExampleArticle: DocumentationArticle = {
  slug: "example", title: "Mulai menggunakan Manris", category: "MULAI DI SINI",
  description: "Pelajari urutan kerja di Manris, dari pencatatan risiko hingga pemantauan dan pelaporan berkala.",
  access: "Menu yang tampil mengikuti hak akses dan cakupan organisasi akun Anda.",
  sections: [
    { id: "contoh-alur", title: "Pahami alur kerja", image: { src: "/documentation/screens/dashboard-start.png", alt: "Dashboard Manris dengan ringkasan risiko, grafik, dan peta risiko", caption: "Dashboard Manris menampilkan ringkasan dan tren untuk cakupan serta periode yang dipilih.", width: 3420, height: 1906 }, diagram: [
      { title: "Identifikasi", detail: "Catat profil dan nilai risiko." },
      { title: "Penanganan", detail: "Susun dan laporkan mitigasi." },
      { title: "Pemantauan", detail: "Nilai kondisi setiap periode." },
    ] },
    { id: "contoh-langkah", title: "Ikuti langkah penggunaan", steps: [
      { title: "Pilih panduan dari sidebar", detail: "Menu mengikuti tampilan navigasi aplikasi. Setiap topik memiliki alamat artikelnya sendiri." },
      { title: "Baca bagian yang diperlukan", detail: "Daftar isi di kanan membantu menemukan bagian artikel. Pada layar kecil, buka daftar isi Di halaman ini." },
    ], note: "Menu dan tindakan yang tersedia dalam aplikasi mengikuti hak akses serta organisasi akun Anda." },
  ],
};

export function DocumentationExample() {
  return <div className="space-y-4"><div className="max-w-3xl rounded-xl border border-border bg-card px-6 py-8"><ArticleContent article={documentationExampleArticle} /></div><Link href="/panduan/pengenalan" className="text-sm underline underline-offset-4">Buka panduan pengguna</Link></div>;
}

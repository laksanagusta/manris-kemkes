import type { RiskCategory } from "@/types/risk";

export const organizations = ["Direktorat Test", "Direktorat Surveilans", "Balai Kekarantinaan Kesehatan"];
export const riskStatuses = { draft: "Draf", final: "Final" } as const;

export type RiskRow = {
  code: string;
  title: string;
  category: RiskCategory;
  organization: string;
  score: number | null;
  status: keyof typeof riskStatuses;
  created: string;
  description: string;
  mitigation: string;
};

export const sampleRisks: RiskRow[] = [
  { code: "R-259", title: "Keterlambatan verifikasi laporan surveilans", category: "operasional", organization: organizations[0], score: 9, status: "final", created: "2026-11-21T20:41:00+07:00", description: "Laporan dari fasilitas kesehatan terlambat diverifikasi saat volume pelaporan meningkat.", mitigation: "Tetapkan jadwal verifikasi harian dan siapkan petugas cadangan." },
  { code: "R-258", title: "Konflik kepentingan dalam seleksi penyedia", category: "fraud_korupsi", organization: organizations[0], score: 25, status: "final", created: "2026-11-21T19:35:00+07:00", description: "Hubungan antara petugas seleksi dan penyedia dapat memengaruhi penilaian penawaran.", mitigation: "Wajibkan deklarasi konflik kepentingan dan pemeriksaan oleh petugas kedua." },
  { code: "R-257", title: "Ketidaksesuaian stok logistik pemeriksaan", category: "operasional", organization: organizations[2], score: 18, status: "final", created: "2026-11-20T13:15:00+07:00", description: "Selisih stok fisik dan catatan menyebabkan bahan pemeriksaan sulit dialokasikan secara tepat.", mitigation: "Rekonsiliasi stok fisik dengan catatan persediaan setiap minggu." },
  { code: "R-256", title: "Keterlambatan distribusi bahan pemeriksaan", category: "operasional", organization: organizations[2], score: 12, status: "draft", created: "2026-11-20T11:12:00+07:00", description: "Pengiriman bahan pemeriksaan terlambat saat rute distribusi berubah.", mitigation: "Tetapkan rute alternatif dan titik persediaan penyangga." },
  { code: "R-255", title: "Penggunaan data surveilans tanpa persetujuan", category: "kepatuhan", organization: organizations[1], score: 16, status: "final", created: "2026-11-19T14:20:00+07:00", description: "Data dibagikan sebelum persetujuan penggunaan diterbitkan.", mitigation: "Catat persetujuan akses sebelum penerbitan data." },
  { code: "R-254", title: "Keterlambatan respons atas aduan masyarakat", category: "reputasi", organization: organizations[0], score: 6, status: "final", created: "2026-11-19T09:10:00+07:00", description: "Aduan di luar jam kerja menumpuk ketika penanggung jawab sedang bertugas di lapangan.", mitigation: "Jadwalkan petugas aduan cadangan dan pantau waktu respons." },
  { code: "R-253", title: "Ketidakjelasan alur eskalasi kejadian", category: "kebijakan", organization: organizations[1], score: null, status: "draft", created: "2026-11-17T15:40:00+07:00", description: "Tim penerima laporan belum memiliki kriteria eskalasi yang seragam.", mitigation: "Susun kriteria eskalasi dan uji melalui simulasi lintas tim." },
  { code: "R-252", title: "Dokumen pemeriksaan melewati masa simpan", category: "legal", organization: organizations[2], score: 4, status: "final", created: "2026-11-17T10:05:00+07:00", description: "Dokumen pemeriksaan tersimpan melewati batas retensi yang disetujui.", mitigation: "Audit retensi dan jadwalkan peninjauan dokumen bulanan." },
  { code: "R-251", title: "Ketidaklengkapan bukti tindak lanjut audit", category: "kepatuhan", organization: organizations[0], score: 14, status: "draft", created: "2026-11-16T14:18:00+07:00", description: "Bukti tindak lanjut tersebar di beberapa unit dan sulit diverifikasi saat audit.", mitigation: "Tetapkan satu tempat penyimpanan bukti dengan daftar pemeriksaan." },
  { code: "R-250", title: "Melemahnya koordinasi rujukan lintas wilayah", category: "operasional", organization: organizations[1], score: 17, status: "final", created: "2026-11-16T08:30:00+07:00", description: "Fasilitas rujukan tidak menerima informasi ketersediaan layanan secara berkala.", mitigation: "Perbarui direktori rujukan dan jadwalkan koordinasi lintas wilayah." },
  { code: "R-249", title: "Data kontak petugas lapangan kedaluwarsa", category: "operasional", organization: organizations[2], score: 8, status: "final", created: "2026-11-15T09:25:00+07:00", description: "Perubahan petugas belum diperbarui pada daftar komunikasi insiden.", mitigation: "Konfirmasi kontak petugas pada awal setiap bulan." },
  { code: "R-248", title: "Ketidakkonsistenan penerapan prosedur pemeriksaan", category: "kebijakan", organization: organizations[1], score: 11, status: "draft", created: "2026-11-14T10:15:00+07:00", description: "Versi prosedur pemeriksaan yang digunakan berbeda antarwilayah.", mitigation: "Publikasikan satu versi prosedur dan catat konfirmasi penerimaan." },
];

export const optionalColumns = [
  { id: "category", label: "Kategori" },
  { id: "organization", label: "Nama Organisasi" },
  { id: "score", label: "Skor" },
  { id: "status", label: "Status" },
  { id: "created", label: "Dibuat" },
] as const;
export type OptionalColumn = (typeof optionalColumns)[number]["id"];

const createdFormat = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export function formatCreated(date: string) {
  return createdFormat.format(new Date(date));
}

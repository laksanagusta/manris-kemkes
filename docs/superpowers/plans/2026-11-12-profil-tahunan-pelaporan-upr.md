# Implementasi profil tahunan dan pelaporan UPR

Alur penerimaan dan contoh data mengikuti [UML siklus UPR](../../specs/2026-11-12-siklus-profil-dan-pelaporan-upr.md).

- [x] Tambah migrasi profil tahunan, anggota profil, versi dokumen, dan kiriman. Ikat versi profil ke UPR dan tahun. Simpan versi risiko dan tanggal berlaku tiap anggota, beserta data baseline saat finalisasi.
- [x] Hubungkan kandidat pickup dengan profil tahun sebelumnya dan Register. Pakai ulang formulir asesmen dan finalisasi risiko. Validasi sasaran dari Perencanaan saat menetapkan profil. Saat membuat revisi, salin anggota dengan referensi asesmen semula sampai pengguna memilih perubahan.
- [x] Susun pratinjau dan versi final Laporan Semester dari cutoff dan sumber yang dipilih. Pisahkan baseline dan aktual. Simpan bagian KK dan Evaluasi yang belum lengkap. Ambil versi efektif per anggota untuk menangani revisi campuran.
- [x] Tambahkan pengiriman versi Laporan Semester, KK Selesai, dan Evaluasi Final ke induk UPR-T.I. Bekukan isi yang diterima. Catat penerimaan atau permintaan perbaikan atas versi yang dikirim dan tautkan pengiriman ulang.
- [x] Tambahkan menu Profil Risiko Tahunan dan Laporan, dengan tampilan daftar, versi, dan Laporan Masuk memakai komponen Manrisk.
- [x] Uji API dan UI dengan database uji. Cakup pickup, risiko aktif yang dilewati, revisi dengan tanggal Juni dan Juli, kelengkapan dokumen, isolasi organisasi, kirim ulang, penerimaan, dan pickup tahun berikutnya.

Hasil dan cakupan pengujian tersedia pada [catatan verifikasi](../../specs/2026-11-12-upr-workflow-verification.md).

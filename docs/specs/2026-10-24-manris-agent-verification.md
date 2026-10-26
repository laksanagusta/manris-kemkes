# Manris Agent — implementasi dan verifikasi

Tanggal: 24 Oktober 2026. Branch: `codex/agent-feature`.

## Hasil implementasi

- Tambahan komponen respons: detail risiko ringkas dengan disclosure, prioritas per risiko dari populasi lengkap sebelum paginasi, dan perbandingan antarkuartal. Tindakan kontekstual langsung melanjutkan chat dengan ID, organisasi, periode, serta skill yang relevan; draf composer dipertahankan. Penulisan bisnis tetap melalui Terapkan.

- Halaman `/agent` dan percakapan privat, mengikuti komposisi referensi Linear serta token aplikasi. Pola dan contoh komponen produksi tersinkron pada `DESIGN.md` dan `/design-system`.
- Empat skill bawaan dimuat sesuai kebutuhan: risiko, mitigasi, kejadian, laporan. Hasil memakai komponen tabel, metrik, grafik, dokumen dan klarifikasi yang ditentukan aplikasi.
- Pekerjaan persisten dengan checkpoint, lease, fencing, pembatalan, batas jumlah langkah dan waktu. Worker berjalan bersama backend.
- Paket perubahan dapat diedit/dikecualikan. Penyimpanan membutuhkan endpoint konfirmasi terpisah; transaksi bersama mencakup perubahan domain, audit dan bukti penerapan. Risiko final dipantau melalui transaksi pemantauan kanonis, bukan diubah langsung.
- Lampiran PDF/XLSX maksimal 1 MB, ekstraksi dan batas konteks ditampilkan. Snapshot percakapan tetap; refresh membuat hasil baru. Excel/PDF mengekspor jawaban tersimpan setelah pemeriksaan akses saat ini.
- Laporan ad hoc memakai perhitungan snapshot kanonis, populasi penuh sebelum pembatasan baris, cakupan unit eksplisit, serta pembeda nol/tidak tersedia. Filter tingkat tunggal ditolak pada metrik gabungan risiko tinggi agar tidak menghilangkan risiko sangat tinggi.
- Review memperbaiki batas konteks percakapan panjang, sumber laporan, otorisasi terkini, preservasi ID mitigasi, pemantauan kanonis, urutan lock lintas entitas dan alokasi kode numerik risiko. Progres pemantauan yang dihitung dari tugas tidak boleh ditimpa persentase manual.

## Verifikasi yang dijalankan

### Tambahan komponen respons — 24 Oktober 2026

- 24 tes frontend (termasuk lima tes komponen baru), lint terarah, pemeriksaan tipe produksi, dan build Next.js berhasil. Build pertama diblokir sandbox saat mengambil font Inter; pengulangan dengan akses font berhasil.
- Tes Agent/runtime, adapter dan ekspor berhasil. Seluruh tes integrasi agenttools berhasil dengan race detector pada PostgreSQL uji terisolasi, termasuk detail nyata, tugas prioritas, perbandingan kanonis, akses lintas unit, pencabutan akses, dan pembacaan tanpa penulisan bisnis.
- Tes prioritas memeriksa pengurutan seluruh populasi sebelum paginasi, deduplikasi, skor tidak tersedia, skor sama, keterlambatan dan batas hari Jakarta. Tes perbandingan membedakan nol dari data tidak lengkap serta mempertahankan cakupan/periode.
- Ekspor Excel/PDF memuat ketiga payload baru dari snapshot tersimpan. Tes tambahan memastikan rincian panjang diteruskan ke baris Excel berikutnya tanpa terpotong. Tidak ada panggilan uji baru ke provider AI eksternal.
- DESIGN.md dan contoh Agent pada design-system telah diselaraskan. Backend pengembangan lokal dimuat ulang dengan binary terbaru; pemeriksaan kesehatan mengembalikan status ok. Database utama tidak dimodifikasi untuk pengujian ini dan tidak memerlukan migrasi tambahan. Batas pemeriksaan browser di bawah tetap berlaku.

### Verifikasi fitur Agent sebelumnya

Semua uji data memakai PostgreSQL lokal khusus `manris_agent_test`, terpisah dari database aplikasi utama. Konfigurasi `.env` dan data utama tidak diubah.

- Build backend berhasil; pemeriksaan `go vet` pada package Agent/domain adapter/handler/ekspor berhasil.
- Tes runtime Agent, adapter domain dan PostgreSQL store berhasil dengan race detector dan tes integrasi. Meliputi rollback paket, idempotensi/receipt, satu koneksi database, akses lintas unit, target stale, pemulihan lease/fencing, kebijakan pemantauan, relasi kejadian, preservasi rencana/tugas dan laporan ad hoc.
- Handler HTTP dan renderer ekspor berhasil diuji: sesi, no-store, ekstraksi, spoof/ukuran lampiran, exact revision, akses unduhan dicabut, nilai nol, angka snapshot, string mirip formula tetap inert dan uraian Excel panjang.
- Pengujian API nyata: OpenAI memuat skill dan membaca modul, membuat usulan tanpa menyimpan bisnis, lalu konfirmasi menyimpan tepat satu risiko; retry mengembalikan receipt yang sama tanpa duplikasi. Endpoint PDF/XLSX menghasilkan berkas valid. PDF hasil uji dirender dan diperiksa secara visual.
- Frontend: 19 tes helper/validasi operasi/filter laporan berhasil; lint terarah dan pemeriksaan tipe source produksi berhasil. `npm run build` berhasil, termasuk pemeriksaan TypeScript dan pembuatan halaman.
- Full backend suite masih memiliki 20 kegagalan lama. Perbandingan terhadap arsip HEAD awal menghasilkan nama kegagalan identik dan tidak ada kegagalan baru: alur persetujuan lama, versi risiko dari transkrip, ekspektasi semester, dan rata-rata laporan. Tes handler penuh tanpa race berhasil; satu tes perubahan password lama sempat melewati timeout default 1 detik saat seluruh handler dijalankan dengan race.

## Batas verifikasi dan pengoperasian

- Pemeriksaan visual/interaksi browser terakhir tidak dapat dilanjutkan karena browser lokal dinonaktifkan di pengaturan Work. Tampilan desktop/mobile dan keyboard perlu ditinjau langsung pada aplikasi yang berjalan. Build dan validasi source tidak menggantikan pemeriksaan visual tersebut.
- Pengulangan terakhir analisis melalui OpenAI diblokir peninjauan otomatis karena berpotensi mengirim data fixture ke provider eksternal tanpa persetujuan payload yang spesifik. Pemeriksaan lokal setelah perbaikan tetap dijalankan; jangan menyatakan pengulangan provider terakhir telah lolos.
- PDF memakai font Arial/cp1252 sebagaimana jalur PDF lama; karakter di luar cakupan font belum dijamin. Excel mempertahankan teks Unicode. Angka tetap berasal dari snapshot, bukan dihitung model.
- Pada verifikasi awal, migrasi `000073_agent_runtime` hanya diterapkan pada database uji. Pada tindak lanjut pengujian manual, database pengembangan lokal juga diperbarui ke versi 73 (lihat di bawah). Lingkungan lain tetap perlu alur migrasi proyek, backend dengan `OPENAI_API_KEY` dan model yang tersedia. Pengaturan `ai.model.agent` atau `OPENAI_MODEL_AGENT` dapat memilih model khusus; batas worker/run dijelaskan pada kontrak.
- Perubahan source belum di-commit atau di-push. Tidak ada deployment produksi yang dilakukan.


## Perbaikan hasil uji manual — penyimpanan belum tersedia

Pengguna menemukan pesan “Agent belum tersedia. Periksa pengaturan AI”. Pemeriksaan terhadap backend lokal yang sedang berjalan menunjukkan database pengembangan `localhost:5439/manris` masih pada migrasi 71 dan kedua tabel Agent belum ada. Pesan umum sebelumnya mengubah kegagalan tabel yang belum tersedia menjadi error konfigurasi AI.

- Dua migrasi **up** 72/73 diperiksa sebagai perubahan tambahan saja, lalu dijalankan melalui `migrate up 2`. File down tidak dijalankan; tabel/data yang sudah ada tidak dihapus atau diganti.
- Verifikasi setelah migrasi: versi **73, clean**; tabel percakapan dan antrean tersedia serta query pembacaan berhasil. Konfigurasi model standar terbaca, pengaturan Agent kosong mengikuti model standar.
- PostgreSQL `undefined_table` kini dipetakan ke pesan penyimpanan yang meminta migrasi, terpisah dari masalah konfigurasi/provider AI. Detail SQL tetap tidak dikirim ke klien. Tes regresi mereproduksi pesan lama sebelum perbaikan dan berhasil setelah perbaikan, termasuk respons HTTP 503 yang sesuai.
- Migrasi berlaku langsung pada backend lokal yang sudah berjalan. Perubahan teks error baru akan termuat saat backend dibangun/dijalankan ulang. Pengujian ini tidak mengirim percakapan pengguna ke provider AI.

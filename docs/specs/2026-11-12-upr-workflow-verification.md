# Hasil verifikasi profil tahunan dan pelaporan UPR

Diuji pada 12 November 2026. Alur mengikuti [UML siklus UPR](2026-11-12-siklus-profil-dan-pelaporan-upr.md). Migrasi 83 diterapkan ke database pengembangan lokal. Backend lokal mengembalikan health 200, halaman Profil Risiko Tahunan dan Laporan mengembalikan 200, dan API profil tanpa sesi mengembalikan 401.

## Perilaku yang diuji

Pengujian memakai Chrome melalui Playwright, API Manrisk yang sebenarnya, PostgreSQL terisolasi, serta akun UPR-T.II pengirim, UPR-T.I penerima, dan organisasi lain. Waktu bisnis server uji disimulasikan pada 17 Juli 2026 agar kasus finalisasi terlambat dan koreksi semester bisa diulang.

| Skenario | Hasil |
| --- | --- |
| Pickup memakai Register akhir tahun saat profil tahun sebelumnya belum tersedia | Lulus |
| Pickup membuka draf pada formulir risiko, mempertahankan kode dan identitas risiko | Lulus |
| Profil belum bisa final saat asesmen anggota masih draf | Lulus |
| Memilih dan melepas anggota draf awal memakai API | Lulus |
| Dua permintaan pembuatan draf bersamaan mengembalikan draf yang sama | Lulus |
| Sasaran tanpa risiko mengizinkan finalisasi profil | Lulus |
| Sasaran bersama melalui RO seluruh satker tersedia untuk unit penerima | Lulus |
| Risiko yang dilewati tetap aktif dalam Register | Lulus |
| Profil pertama final Juli dapat mendasari Semester I setelah alasan penggunaan diisi | Lulus |
| KK Q2 dan Evaluasi belum lengkap tetap mengizinkan kirim Semester I dengan penanda | Lulus |
| Dokumen final yang belum dikirim hanya tersedia untuk organisasi pengirim | Lulus |
| Organisasi lain gagal membuka atau menerima kiriman | Lulus |
| Anggota UPR-T.I meminta perbaikan melalui UI dengan catatan | Lulus |
| Dua risiko awal menjadi tiga setelah koreksi skor satu risiko dan penambahan risiko Juli | Lulus |
| Anggota profil yang tidak berubah memakai versi asesmen dan baseline sebelumnya | Lulus |
| KK Selesai dan Evaluasi Final dikirim dan diterima secara terpisah | Lulus |
| Pengiriman ditolak untuk KK dan Evaluasi yang masih draf | Lulus |
| Membuka ulang dan mengubah Evaluasi mempertahankan isi versi yang sudah dikirim | Lulus |
| Perbaikan KK melalui dokumen sumber baru menghasilkan versi dan hubungan ke kiriman sebelumnya | Lulus |
| Pengulangan finalisasi dan pengiriman laporan dengan isi yang sama memakai versi yang sama | Lulus |
| Semester I v2 memakai koreksi Juni serta aktual Q1/Q2, dengan risiko Juli masuk Semester II | Lulus |
| Isi dokumen pendukung dalam laporan final tetap utuh setelah sumber Evaluasi dibuka ulang | Lulus |
| Anggota UPR-T.I dengan role unit dapat menerima laporan, dengan pelaku dan waktu tercatat | Lulus |
| Versi sebelumnya beserta catatan perbaikan tersedia lewat tautan UI | Lulus |
| Pickup tahun berikutnya menawarkan risiko aktif yang dilewati pada tahun sebelumnya | Lulus |
| Daftar lintas tahun, pembuatan draf dari Register dan pickup dari versi final yang dipilih | Lulus |
| Pickup mengecualikan risiko arsip, menolak akses lintas unit, dan membatalkan seluruh inisiasi bila salah satu pilihan tidak valid | Lulus |
| Halaman laporan pada viewport desktop dan mobile, tanpa error JavaScript dan tanpa overflow dokumen mobile | Lulus |

Skrip menggabungkan interaksi UI dan API. Data perencanaan, risiko warisan, hasil monitoring Q1/Q2, serta beberapa dokumen KK disiapkan sebagai fixture SQL pada database uji. Cakupan ini menguji konsumsi data tersebut oleh fitur baru. Pembuatan semua sumber monitoring dan KK melalui UI memiliki pengujian tersendiri di modul yang sudah ada.

## Pemeriksaan kode

- Go test pada repository PostgreSQL, handler HTTP, use case Risiko, Evaluasi, KK, dan migrasi lulus.
- Go vet pada repository PostgreSQL dan handler HTTP lulus.
- TypeScript untuk seluruh source aplikasi lulus dengan pemeriksaan source yang mengecualikan file tes lama dan validator route hasil generate.
- ESLint pada halaman serta komponen baru dan API client lulus.
- Git diff check lulus.

Suite Go penuh memiliki kegagalan pada paket AI, Approval, dan Report. Pengujian ulang tiga paket tersebut dari arsip HEAD sebelum perubahan menghasilkan kegagalan yang sama. Pemeriksaan TypeScript penuh juga masih melibatkan file tes lama dan validator route hasil generate yang sebelumnya bermasalah.

Bootstrap seluruh migrasi dari database kosong menemukan konflik lama pada tabel schema_migrations dan indeks di migrasi 57. Lingkungan E2E dibuat dari salinan skema pengembangan migrasi 82, lalu menerapkan migrasi 83. Migrasi 82 ke 83 juga berhasil pada database pengembangan yang digunakan aplikasi lokal.

## Mengulang pengujian

Sediakan PostgreSQL lokal terisolasi dengan nama database berawalan manrisk_upr_, skema yang sudah berada pada migrasi 84, serta backend dan frontend uji. Gunakan port terpisah agar pengujian memiliki konfigurasi waktu dan akun tersendiri. Skrip memeriksa nama dan host database sebelum membuat fixture.

Backend uji memakai waktu simulasi melalui build tag manris_simulation, pengaturan MANRIS_SIMULATED_NOW bernilai 2026-07-17T10:00:00+07:00, dan finalisasi langsung. Auth frontend dan backend uji perlu memakai kunci aplikasi fixture yang sama.

Jalankan [skrip E2E](../../scripts/upr-cycle.e2e.mjs) dengan variabel lingkungan berikut.

| Variabel | Isi |
| --- | --- |
| MANRISK_E2E_DATABASE_URL | Koneksi ke database PostgreSQL uji |
| MANRISK_E2E_ORIGIN | Origin frontend uji, default http://127.0.0.1:13083 |
| MANRISK_E2E_API | API backend uji, default http://127.0.0.1:18083/api/v1 |
| MANRIS_APP_KEY | Kunci aplikasi fixture yang disamakan dengan frontend uji |
| MANRISK_E2E_PLAYWRIGHT | Opsional, path modul Playwright jika dipasang di luar proyek |
| MANRISK_E2E_CHROME | Opsional, path executable Chrome lokal |
| MANRISK_E2E_OUTPUT | Opsional, direktori screenshot dan hasil JSON |

```sh
node scripts/upr-cycle.e2e.mjs
```

Data fixture dibuat pada database uji dan menggunakan ID acak untuk tiap siklus. Skrip memerlukan Playwright, psql, dan htpasswd.

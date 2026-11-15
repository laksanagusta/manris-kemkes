# QA siklus profil risiko — Direktorat Bayangan

Pengujian browser 15 November 2026, Chrome dengan sesi Manrisk yang sudah masuk di `localhost:3000`. Waktu bisnis awal **1 Juni 2027, 00.00 WIB**, lalu digeser ke **1 Desember 2027, 00.00 WIB** pada backend dan frontend. Sesi tetap masuk. Data uji memakai Profil 2027 v1 dan R-256 yang sudah ada. Pengujian dimulai dari draf pemantauan. Pembuatan risiko dan finalisasi awal profil belum diuji. Isian evaluasi dan judul laporan diberi label `[QA E2E]`.

| Tahap | Hasil di sesi aktif |
| --- | --- |
| Profil dan baseline | [Profil 2027 v1](http://localhost:3000/risk/annual-profiles/2027?versi=5267a25a-8e4d-473b-a323-7af01abc3318) sudah Final. R-256: baseline 6, berlaku 1 Juni 2027. |
| Pemantauan Semester I | [R-256](http://localhost:3000/risk/monitoring/88adfd75-5840-40e3-8d28-9560756fc414) disimpan dan difinalisasi. Observasi 1 Juni, skor 6 → 20, penanganan berstatus Dilaporkan. Profil menunjukkan Done dan baseline tetap 6. |
| Kertas kerja Semester I | [KK-2027-06-01-1](http://localhost:3000/risk/working-papers/1c848876-649f-4ea3-a2c9-ea33653e49b7): roster otomatis 1/1 pemantauan final, alur TTE lokal dimulai, satu tanda tangan tercatat, status Selesai. |
| Evaluasi Semester I | [EV-0001](http://localhost:3000/evaluations/256ede45-5962-42d4-a97f-068138a387bd): finalisasi kosong menampilkan “Jawab setiap butir evaluasi sebelum finalisasi”; 26/26 jawaban sintetis disimpan dan difinalisasi. |
| Laporan Semester I | [Laporan v1](http://localhost:3000/laporan/76108eea-5af2-40b9-9530-565fc574a324) menyimpan profil, KK, dan evaluasi. Status Terkirim ke UPR induk dengan riwayat pada 1 Juni 2027. Diterima/Perlu perbaikan belum diverifikasi dari akun penerima. |
| Pemantauan Semester II | [R-256](http://localhost:3000/risk/monitoring/9a4fbc9c-ec91-4fdc-9f87-ca1d17d9b869) Final pada 1 Desember, skor 20 → 20. Finalisasi diblokir sebelum laporan tindakan diisi. Laporan tindakan **Belum dilaksanakan** ditolak tanpa catatan dan diterima setelah alasan diisi. |
| Kertas kerja Semester II | [KK-2027-12-01-2](http://localhost:3000/risk/working-papers/92b6c893-6b5d-4b95-b799-87f715e22a61) memuat satu observasi final tanggal 1 Desember dan mencapai Selesai setelah 1/1 tanda tangan lokal. |
| Evaluasi Semester II | [EV-0002](http://localhost:3000/evaluations/362e8f0c-dc58-4f21-b857-8069e18e06db) Final dengan 26/26 jawaban sintetis. |
| Laporan Semester II | [Laporan v1](http://localhost:3000/laporan/2d3f3504-c197-4352-a29c-cc57b2376894) Terkirim ke UPR induk pada 1 Desember 2027 dengan Profil 2027 v1, KK-2027-12-01-2, dan EV-0002. Draf yang dipakai untuk uji salah periode dibersihkan dan digunakan kembali untuk pengiriman ini. |
| Pickup 2028 | Dialog Tambah profil menawarkan rules 2027 dan 2026. Pencarian eksplisit 2028 menunjukkan “Tidak ada rules yang cocok”. Pickup belum dapat dijalankan dari fixture ini. |

## Temuan yang terkonfirmasi

### QA-01 · Tinggi · Draf Semester II menerima KK dan evaluasi Semester I

1. Di **Laporan → Buat laporan**, pilih tahun 2027 dan Semester II.
2. Di pemilih dokumen, pilih KK-2027-06-01-1 dan EV-0001 dari Semester I, serta Profil 2027 v1.
3. Klik **Terapkan pilihan** dan **Simpan draf**. Draf hasil simpan masih memuat dua dokumen Semester I, dan tombol **Kirim** aktif. Pengiriman paket salah sengaja tidak dilakukan; validasi endpoint kirim belum diuji.

Perbaikan: saring pemilih berdasarkan unit, profil, tahun, dan periode yang dicakup. Tampilkan periode pada setiap opsi. Validasi ulang keterkaitan dokumen di server sebelum pengiriman dan saat periode draf diubah, termasuk aturan pemetaan untuk profil bulanan/triwulan.

### QA-02 · Tinggi · Rekap mitigasi bertentangan dengan hasil yang sudah dilaporkan

1. Buka **Control Tower → Rekap** untuk **Manajemen Risiko 2027 → Semester I**. Direktorat Bayangan menampilkan **0 dari 1 terlapor** setelah **Muat ulang**.
2. Klik **Lihat Pelaporan Mitigasi untuk Direktorat Bayangan**. Tindakan `hellooo`, tenggat 30 Juni 2027, berstatus **Belum dilaporkan**.
3. Buka tindakan yang sama melalui tautan detail: [Penanganan](http://localhost:3000/compliance/penanganan?taskId=0e9e6f79-e5c5-4a9f-8088-27683a3f97bb) menampilkan **Sedang dilaksanakan · Dilaporkan** pada baris dan dialog detail, tetapi kartu **Sudah dilaporkan** tetap 0. [Pemantauan final](http://localhost:3000/risk/monitoring/88adfd75-5840-40e3-8d28-9560756fc414) juga menampilkan tindakan itu sebagai Dilaporkan.

Perbaikan: samakan sumber dan definisi pelaporan per tindakan dan periode untuk baris, kartu, dan Control Tower. Bedakan status pelaksanaan kegiatan dari keberadaan laporan. Tambahkan regresi untuk tindakan yang masih berjalan tetapi sudah dilaporkan di pemantauan final.

Pengujian ulang Semester II menghasilkan **0 dari 1 terlapor** untuk tindakan Q4. Rincian Control Tower menandai tindakan itu **Dilewati**, sementara Penanganan menampilkan **Belum dilaksanakan · Dilaporkan** dan menyimpan alasannya. Jika rekap dimaksudkan menghitung tindakan terlaksana, ubah label agar tidak terbaca sebagai jumlah laporan yang masuk.

### QA-03 · Sedang · Versi hasil observasi disebut versi profil

1. Buka pemantauan final R-256 dari Profil 2027 v1.
2. Banner menampilkan “Profil versi 6 berlaku untuk transaksi ini”, sementara halaman profil dan sumber KK menunjukkan **Profil 2027 v1**, dan baris R-256 pada KK menunjukkan **v6**.

Perbaikan: tampilkan versi profil tahunan dan versi hasil pemantauan sebagai dua atribut bernama jelas. Tautkan keduanya bila pengguna perlu menelusuri sumber audit.

### QA-04 · Sedang · Aksi berikutnya tidak mengikuti status dokumen

- Detail Penanganan menampilkan **Isi laporan** setelah pemantauan dikunci; klik mengarah ke pemantauan Final untuk dibaca. Tidak ada bypass edit yang terbukti. Label yang tepat adalah **Lihat laporan**.
- Pemantauan Final masih menawarkan **Buat KK Pemantauan dan Reviu** setelah KK Semester I Selesai. Pemilih kemudian menonaktifkan Semester I (`Done`) dan Semester II (`Belum dibuka`). Ganti aksi dengan **Lihat KK Semester I** saat dokumennya sudah ada.

### QA-05 · Sedang · Alasan tindakan belum terlaksana tidak tampil dalam hasil pemantauan final

1. Dalam pemantauan Semester II, kirim laporan tindakan **Belum dilaksanakan** dengan alasan. Finalisasi pemantauan.
2. Buka ulang hasil final. Bagian **Laporan Penanganan** hanya menampilkan **Bukti periode ini**. Tindakan dan alasannya tidak terlihat.
3. Buka detail tindakan yang sama untuk `2027-Q4` di Penanganan. Status **Belum dilaksanakan · Dilaporkan** dan alasan yang ditulis tampil kembali.

Perbaikan: tampilkan tindakan, status pelaksanaan, dan alasan yang sudah dikunci di detail pemantauan final, termasuk ketika tidak ada tautan bukti.

## Perbedaan dengan dokumen rancangan

Rujukan: [siklus profil dan pelaporan UPR](../specs/2026-11-12-siklus-profil-dan-pelaporan-upr.md).

- Rancangan memperbolehkan laporan Semester I dikirim dengan KK/Evaluasi belum lengkap dan diberi penanda. Pada UI saat ini, **Kirim** dinonaktifkan jika belum ada minimal satu KK Selesai dan satu Evaluasi Final. Perlu keputusan produk: kembalikan pengiriman dengan penanda kelengkapan atau perbarui spesifikasi sesuai aturan wajib lampiran.
- Halaman draf dan detail kirim memperlihatkan judul, semester, riwayat, serta tautan sumber. Di sesi pengirim belum terlihat cutoff, pratinjau isi laporan dengan baseline vs aktual, atau ringkasan versi sumber yang sudah dikunci. Ini celah verifikasi UI; pengujian ini tidak membuktikan ada atau tidaknya snapshot di database.
- Waktu bisnis tercatat 1 Juni 2027 pada observasi/pengiriman, sedangkan “Dibuat pada” KK dan tanggal yang tampil di pemilih Evaluasi tercatat 15 November 2026. Jika yang terakhir memang waktu audit server, beri label eksplisit; pada pemilih lampiran, tampilkan semester/tahun bisnis agar pengguna tidak bergantung pada tanggal pembuatan.

## Cakupan yang masih terbuka

Penerimaan atau permintaan perbaikan oleh UPR induk, revisi laporan dan pembuktian isi versi lama, pickup 2028, serta pembentukan dan finalisasi profil baru dari nol masih belum diuji. Hasil TTE di atas mengonfirmasi status di alur Manrisk lokal. Sertifikat atau penyedia TTE eksternal belum diperiksa.

## Perbaikan dan pengujian ulang

Semua temuan QA-01 hingga QA-05 sudah diperbaiki pada source lokal. Browser diperiksa ulang pada sesi Chrome yang masih masuk. Fixture sebelumnya telah berganti menjadi Direktorat Test dengan Profil 2027 v1 dan dua risiko final. Waktu simulasi saat pemeriksaan ulang adalah 1 Juni 2027 pukul 09.00 WIB.

- Picker KK dan Evaluasi membawa tahun dan semester ke API. Opsi menampilkan periode yang dicakup. Semester II tidak menawarkan KK atau Evaluasi Semester I. Mengganti semester melepas kedua pilihan itu, sementara mengganti tahun juga melepas profil. Draf lama yang memuat pilihan tidak valid menampilkan pemberitahuan dan meminta pemilihan ulang.
- Save, preview, dan send memakai pemeriksaan dokumen yang sama berdasarkan unit, status final, tahun, dan cakupan kalender. Regresi database menolak draf salah semester dan kiriman dari draf lama yang disimpan sebelum validasi ini tersedia. Periode konfigurasi bulanan, triwulanan, semester, dan dokumen legacy diuji, termasuk jendela pengisian yang dibuka pada tahun berikutnya.
- Browser menunjukkan Control Tower **1 dari 1 terlapor** untuk tindakan yang masih berlangsung. Rincian memisahkan kolom Pelaksanaan dan Pelaporan. Kartu Penanganan menunjukkan **Sudah dilaporkan 1**. Rekap dihitung server sebelum pagination, dengan regresi untuk laporan tindakan pending dan skipped serta halaman kosong.
- Detail laporan tindakan dari pemantauan final sudah tidak menawarkan Isi laporan. Menu baris menggunakan Lihat laporan. Metadata pemantauan membedakan Versi risiko dari Profil Risiko Tahunan. Aksi KK langsung membuka dokumen periode yang sudah ada.
- Catatan pelaksanaan terlihat langsung di hasil pemantauan final dari evidence snapshot yang dikunci. Regresi render memastikan alasan tindakan belum terlaksana tetap terlihat tanpa URL bukti dan tanpa membuka disclosure.
- DESIGN.md dan katalog design system telah disinkronkan dengan pemilih lampiran, kolom pelaksanaan/pelaporan, identitas versi, dan tampilan catatan final.

Pemeriksaan yang lulus mencakup 16 tes frontend terarah, pemeriksaan tipe source produksi, ESLint tanpa error pada berkas terkait, Go vet pada paket terkait, paket entity/mitigation_task/HTTP/PostgreSQL, tes domain pelaporan dan usecase UnitProgress, serta regresi PostgreSQL pada database disposable. ESLint masih menunjukkan satu peringatan dependency useMemo yang sudah ada di annual-profile-content. Pemeriksaan TypeScript seluruh repository masih melibatkan error fixture tes lama. Paket usecase/report penuh masih gagal pada TestGenerateReportUseCase_ExecuteUsesEffectiveSemanticsForPrimaryOutputs, dengan AvgExposureScore 12.6667 dibanding harapan 12, sesuai keterbatasan suite yang tercatat sebelumnya.

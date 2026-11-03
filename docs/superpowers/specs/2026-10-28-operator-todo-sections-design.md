# To-Do operator dengan section yang dapat ditutup

Tanggal: 28 Oktober 2026
Status: disetujui pengguna untuk implementasi; implementasi diverifikasi pada 28 Oktober 2026.
Branch: codex/operator-risk-flow-local
Lokasi implementasi: /Users/dikalaksana/Engineering/manris-v2. Tidak membuat worktree baru.

## Tujuan dan keputusan

Operator menemukan pekerjaan berikutnya dan membuka tindakan yang tepat dari halaman Pekerjaan saya (/work). Gunakan tiga section dengan daftar ringkas, bukan kartu ringkasan yang hanya mengarahkan ke tabel. Setiap section dapat dibuka atau ditutup secara independen. Pertahankan pola visual DESIGN.md dan katalog /design-system.

Pendekatan yang dipilih menggabungkan daftar ringkas dengan aksi langsung dan tautan Lihat semua ke tabel entitas berfilter. Pendekatan yang hanya mengarahkan ke tabel menambah langkah pencarian; menampilkan seluruh daftar sekaligus membuat halaman terlalu panjang.

## Susunan dan isi

Urutan section tetap:
1. Laporan penanganan perlu diisi.
2. Risiko perlu dipantau.
3. Risiko masih draft.

Judul section menampilkan jumlah seluruh pekerjaan yang memenuhi syarat, bukan jumlah preview. Section berisi pekerjaan terbuka pada kunjungan awal. Header memakai kontrol disclosure yang jelas, dapat dioperasikan dengan keyboard, dan menyampaikan status expanded kepada pembaca layar. Beberapa section dapat terbuka bersamaan.

Maksimal lima pekerjaan terlihat per section. Lihat semua hanya tampil jika jumlah lebih dari lima. Section kosong menampilkan judul dan angka 0 tanpa panel kosong besar atau kontrol pembuka yang tidak berguna. Tidak ada statistik tambahan, pencarian, tab, filter baru di To-Do, atau animasi dekoratif.

Pertahankan tindakan Tambah risiko dan Catat kejadian yang sudah tersedia. Nama halaman dan navigasi tetap Pekerjaan saya.

## Laporan penanganan perlu diisi

Tenggat yang dimaksud adalah tenggat pengisian laporan, bukan tenggat pelaksanaan penanganan.

Gunakan tanggal kalender Asia/Jakarta. Masukkan tugas pelaporan yang belum dilaporkan dan sudah boleh diisi berdasarkan aturan periode yang ada, dengan due date paling lambat hari ini + 7 hari (inklusif). Tugas terlambat tetap masuk tanpa batas usia. Tugas tanpa tenggat valid tidak diklasifikasikan sebagai mendekati tenggat. Jangan mengubah aturan kapan laporan boleh diisi atau status pelaporan yang berlaku.

Urutan: terlambat, jatuh tempo hari ini, lalu tenggat terdekat. Di setiap kelompok urutkan due date naik, kemudian created_at dan ID sebagai pemecah seri agar hasil konsisten.

Baris menampilkan nama penanganan, risiko terkait, dan tanggal tenggat. Gunakan keterangan Terlambat N hari, Jatuh tempo hari ini, atau Tersisa N hari berdasarkan selisih tanggal kalender, bukan pembulatan jam. Nama penanganan diambil dari data sumber; jangan mengarang atau menggandakan judul risiko sebagai nama penanganan. Pertahankan keterangan tanggung jawab bila dibutuhkan untuk membedakan Untuk saya dan Perlu ditangani unit.

Isi laporan membuka formulir tugas dengan taskId yang tepat. Jika tugas sudah dilaporkan atau berubah sejak dimuat, gunakan perilaku detail/status terbaru yang sudah ada dan segarkan daftar; jangan membuat laporan baru atau membuka tugas lain.

## Risiko perlu dipantau

Masukkan pemantauan yang sudah boleh dimulai serta draft pemantauan yang perlu dilanjutkan, mengikuti aturan periode dan versi risiko yang berlaku. Draft lama yang masih valid tetap terlihat. Jangan membuat periode pemantauan baru atau menampilkan pekerjaan yang terblokir.

Baris menampilkan nama risiko, kode dan periode yang relevan, serta satu tindakan Mulai pemantauan atau Lanjutkan. Untuk draft, buka ID pemantauan yang tepat. Untuk memulai, gunakan endpoint yang ada dan buka ID hasilnya.

Gunakan urutan stabil berdasarkan tenggat yang tersedia (terdekat lebih dulu; tanpa tenggat di belakang), lalu waktu pembuatan dan ID.

## Risiko masih draft

Pertahankan cakupan draft milik operator sesuai kebijakan sekarang. Baris menampilkan nama/kode risiko dan tindakan Lengkapi. Buka draft yang tepat dengan konteks kembali ke /work. Urutkan waktu pembuatan naik, lalu ID.

## Revisi navigasi Lihat semua, 28 Oktober 2026

Atas koreksi pengguna, keputusan filter To-Do khusus di bawah digantikan: gunakan halaman entitas normal dan filter URL bawaannya. Draft menuju /risk/register?status=draft; pemantauan menuju /compliance/monitoring?status=needs_monitoring. Laporan menuju /compliance/penanganan?status=needs_reporting. Filter Perlu dipantau dan Perlu diisi (≤7 hari & terlambat) tersedia langsung pada kontrol status tabel entitas biasa. Jangan mengganti halaman entitas dengan tabel To-Do. Daftar entitas memakai cakupan normalnya dan dapat lebih luas dari preview pekerjaan pribadi.

### Rancangan navigasi sebelumnya (digantikan)

Lihat semua mengarah ke tabel terkait:
- Laporan penanganan: /compliance/penanganan.
- Pemantauan: /compliance/monitoring.
- Draft risiko: /risk/register.

Halaman tujuan harus benar-benar menerapkan filter yang mewakili section, termasuk cakupan pengguna/unit, eligibility, dan batas tujuh hari untuk laporan. Label atau parameter URL saja tidak cukup. Gunakan filter URL yang sudah ada bila mendukung; tambahkan konteks To-Do yang terarah bila belum ada. Jangan memperluas hak akses atau mengubah default tabel saat dibuka dari navigasi biasa.

Filter To-Do aktif harus terlihat dan dapat dilepas melalui pola filter yang sudah tersedia. Sediakan jalur kembali ke Pekerjaan saya. Tabel tujuan menampilkan seluruh hasil melalui pagination yang sudah ada, bukan hanya lima preview.

Simpan state buka/tutup dan posisi gulir untuk navigasi dalam sesi, dibatasi per akun. Saat kembali, muat status pekerjaan terbaru dan pulihkan posisi sejauh konten masih tersedia. Jangan menyimpan salinan data risiko atau laporan di penyimpanan browser untuk kebutuhan ini.

## Data dan batas komponen

Backend mengelompokkan pekerjaan setelah pembatasan akses dan eligibility, lalu menghitung total per section dan mengambil lima preview masing-masing. Jangan mengelompokkan satu halaman dari pagination global: cara itu dapat menghilangkan section dan membuat hitungan salah.

Gunakan kembali proyeksi pekerjaan yang ada dan sumber status/tenggat dari entitas asli. Tidak ada tabel antrean atau status tugas baru. Metadata penanganan harus ditambahkan ke proyeksi bila belum tersedia. Filter daftar penuh dan preview memakai kebijakan eligibility yang sama agar hasilnya konsisten. Perubahan kontrak API harus memperhitungkan seluruh pemakai endpoint yang ada.

Frontend terdiri dari halaman pengelola pengambilan data/state dan komponen section/daftar bersama. Komponen visual menerima judul, jumlah, item, state disclosure, dan aksi; tidak menentukan izin atau eligibility bisnis.

Kegagalan pengambilan data menampilkan pesan kegagalan dan Coba lagi yang sudah ada. Jangan menampilkan angka 0 sebagai pengganti data yang gagal dimuat. Saat refresh, hindari berkedipnya status kosong. Tolak hasil permintaan yang sudah tidak relevan setelah ganti akun atau navigasi.

## Design system dan aksesibilitas

Dokumentasikan pola section dan contoh produksinya di DESIGN.md serta /design-system sebelum atau bersamaan dengan implementasi fitur. Gunakan tipografi, warna, jarak, badge dan tombol yang ada. Judul/angka menjadi hierarki utama; warna merah hanya membantu penanda keterlambatan dan harus disertai teks.

Target disclosure mudah ditekan, focus terlihat, dan expanded/collapsed terhubung dengan panel yang sesuai. Jangan menyembunyikan pekerjaan mendesak saat kunjungan awal. Jika transisi dipakai, singkat, dapat dibalik, tanpa bounce; hormati reduced motion. Nama panjang membungkus dengan baik pada layar sempit.

## Verifikasi

- Batas kalender Jakarta: terlambat, hari ini, +7 hari masuk; +8 hari tidak masuk.
- Tugas belum eligible tidak masuk meskipun mendekati tenggat; tugas yang selesai dilaporkan keluar.
- Total dihitung sebelum preview dipotong; lebih dari lima memunculkan Lihat semua.
- Setiap section mendapat preview sendiri, termasuk ketika section lain memiliki banyak pekerjaan.
- Draft pemantauan lama tetap terlihat; cakupan akun/unit dan pembatasan lintas organisasi tetap berlaku.
- Item membuka draft risiko, tugas laporan, atau pemantauan yang sesuai.
- Lihat semua menghasilkan kumpulan yang sama dengan section, dengan pagination yang benar; filter normal tabel tetap bekerja setelah konteks To-Do dilepas.
- Section kosong, loading, kegagalan, refresh, dan perpindahan akun tidak menampilkan data/status menyesatkan.
- Kembali dari tugas memulihkan disclosure dan posisi gulir; keyboard dan layar sempit tetap dapat digunakan.
- Tinjau implementasi akhir dan sinkronisasi DESIGN.md/katalog sebelum menyatakan selesai.

## Di luar lingkup

Tidak menambah jenis pekerjaan, reminder/notifikasi, prioritas manual, bulk action, personalisasi susunan section, atau perubahan alur persetujuan. Pembaruan database fitur catatan kejadian/bukti pemantauan yang sebelumnya belum diterapkan merupakan pekerjaan terpisah dan tidak diperlukan untuk perubahan pengelompokan To-Do ini.

## Referensi

- Rancangan lifecycle awal: docs/superpowers/specs/2026-10-26-operator-risk-lifecycle-design.md.
- Apple HIG disclosure controls: https://developer.apple.com/design/human-interface-guidelines/disclosure-controls.
- Apple HIG lists and tables: https://developer.apple.com/design/human-interface-guidelines/lists-and-tables.

Rancangan ini menggantikan keputusan satu daftar tanpa section dari dokumen lifecycle awal hanya untuk presentasi To-Do serta batas laporan yang ditampilkan. Kebijakan akses, aturan periode dan aksi domain lainnya tetap mengikuti sistem yang berlaku.

## Revisi aturan pemantauan, 28 Oktober 2026

Permintaan terbaru menggantikan filter Perlu dipantau: Lihat semua menuju tabel Risiko dengan assessment_cycle=triwulan sebelumnya dan monitoring_status=not_monitored. Tabel menggunakan filter generik Semua pemantauan, Sudah dipantau, Belum dipantau. Sudah berarti transaksi Final; draft atau belum ada transaksi termasuk Belum. Untuk profil Final, periode filter mencakup keluarga risiko yang efektif saat periode terpilih serta hasil finalnya yang kini menjadi profil triwulan berikutnya; filter periode draft tetap tepat pada periodenya.

Pengisian pemantauan hanya pada bulan pertama triwulan setelahnya menurut Asia/Jakarta: Q1 April, Q2 Juli, Q3 Oktober, Q4 Januari tahun berikutnya. Mulai, lanjut, ubah, finalisasi dan hapus terkunci di luar bulan itu. Baca/ekspor tetap tersedia. Draft terkunci tidak menjadi To-Do aktif. Pengguna mengonfirmasi periode sebelumnya yang terlewat tidak menghalangi periode berikutnya; tidak ada pembukaan ulang periode terlewat. Tenggat laporan penanganan tidak berubah.

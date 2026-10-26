# Alur kerja operator: risiko, mitigasi, kejadian, dan pemantauan

Tanggal: 26 Oktober 2026

Status: spesifikasi disetujui pada 26 Oktober 2026; cakupan disederhanakan sesuai arahan pengguna untuk hanya menambahkan kebutuhan penting.

Pengguna utama: operator unit.

## 1. Hasil yang dituju

Operator mengetahui pekerjaan yang perlu dilakukan, konteks risikonya, periode yang relevan, dan akibat tindakan yang dipilih. Pengguna masuk melalui pekerjaan sehari-hari, lalu membuka halaman domain yang tepat tanpa mencari risiko dan periode kembali.

Keputusan yang telah disetujui dalam percakapan:

- Gunakan pendekatan berpusat pada pekerjaan operator.
- Jadikan **Pekerjaan saya** halaman pertama setelah operator login, menggantikan Dashboard sebagai tujuan awal operator.
- Pertahankan akses ke Dashboard analitis dan koleksi Risiko, Penanganan, Kejadian Risiko, serta Pemantauan.
- Bedakan **Sudah dilaporkan** dari penyelesaian kegiatan maupun efektivitas mitigasi.
- Jadikan kejadian masukan yang dapat dicatat kapan saja dan ditautkan ke risiko bila relevan.
- Tambahkan catatan koreksi/informasi tambahan kejadian dengan mempertahankan catatan awal.
- Saat pemantauan, tampilkan profil sebelumnya, laporan mitigasi, kejadian periode terkait, dan target risiko.
- Gunakan kesimpulan otomatis **Skor menurun/tetap/meningkat**. Efektivitas memerlukan pertimbangan berbasis bukti.

Dokumen ini menjadi dasar rencana implementasi. Pengguna meminta agar tambahan yang tidak penting dihilangkan supaya aplikasi tetap sederhana. Ketentuan penyederhanaan berikut menggantikan rincian versi awal yang lebih luas.

### Batas kesederhanaan yang disepakati

- Antrean awal berupa satu daftar prioritas dengan satu tindakan per item. Tanggung jawab pribadi/unit cukup menjadi keterangan pada item; tidak ditambahkan tab, filter jenis/periode, pencarian, KPI, atau kelompok Menunggu baru. Gunakan pagination bersama bila daftar panjang.
- Antrean hanya memuat pekerjaan yang sudah dapat dilakukan: draf risiko, laporan mitigasi, dan pemantauan. Pemetaan kejadian tetap tersedia secara kontekstual dan opsional, tanpa tugas wajib, keputusan penutupan, atau alur pembukaan kembali.
- Kejadian cukup memiliki satu tindakan Tambah catatan dan satu isian catatan untuk koreksi/informasi tambahan. Aktor dan waktu dicatat otomatis. Tidak ada pemilihan jenis catatan, field alasan terpisah, atau wizard baru.
- Ringkasan bukti pemantauan memakai satu disclosure dan komponen yang ada. Tidak ada grafik, skor efektivitas, notifikasi, atau sistem assignment baru.
- Aturan akses, deduplikasi transaksi, dan keutuhan histori tetap diperlukan walaupun UI disederhanakan.

## 2. Kondisi implementasi yang menjadi dasar

- Profil risiko mempunyai status draf/final, versi, organisasi, dan identitas pembuat. Profil final dikunci.
- `frontend/src/lib/risk-approval-capability.ts` saat ini menonaktifkan approval profil risiko secara eksplisit. Rancangan mempertahankan finalisasi langsung; tidak mengaktifkan reviewer atau rantai persetujuan. Tugas revisi hasil penolakan tidak dibuat tanpa workflow yang benar-benar aktif.
- Tugas mitigasi memiliki periode, tenggat, catatan, bukti, dan informasi pelapor. Pengiriman laporan melalui UI saat ini memberi status internal `done` dan label Selesai.
- Koleksi Pemantauan saat ini mengambil transaksi yang sudah ada. Mulai Pemantauan tersedia dari detail risiko final yang berlaku.
- Pemantauan kuartal berjalan tersedia mulai bulan ketiga dan mengikuti kelayakan periode sebelumnya serta periode efektif risiko.
- Kejadian boleh disimpan tanpa hubungan risiko. Isi dan hubungan yang sudah tersimpan saat ini bersifat permanen.
- Simpulan efektivitas saat ini hanya membandingkan skor lama dan baru.

Rujukan implementasi: `frontend/src/contexts/auth-context.tsx`, `frontend/src/lib/app-navigation.ts`, `frontend/src/lib/risk-cycle-options.ts`, `frontend/src/app/(app)/risk/register/new/page.tsx`, `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx`, `frontend/src/app/(app)/compliance/_components/monitoring-read-only-workspace.tsx`, `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`, `frontend/src/app/(app)/risk-events/_components/risk-event-form-sheet.tsx`, `frontend/src/lib/risk.ts`, dan `backend/internal/usecase/risk_event/service.go`.

## 3. Halaman awal dan navigasi

- Tambahkan rute `/work` dengan judul Pekerjaan saya. Operator menggunakan identitas peran unit yang dinormalisasi oleh sistem, bukan pemeriksaan string peran baru yang terpisah.
- Login penuh operator menuju `/work`. Sesi yang wajib mengganti kata sandi tetap menuju alur penggantian kata sandi; tujuan setelah alur tersebut mengikuti peran.
- Reviewer, pimpinan, dan superadmin mempertahankan tujuan awal sekarang. Mengunjungi URL Dashboard atau tautan detail secara langsung tidak memaksa pengalihan ke `/work`.
- Navigasi operator menempatkan Pekerjaan saya sebelum Dashboard. Tambahkan breadcrumb yang memakai bahasa pengguna.
- Nama Pekerjaan saya tidak boleh menyiratkan bahwa seluruh pekerjaan unit telah ditugaskan secara pribadi. Gunakan keterangan **Untuk saya** atau **Perlu ditangani unit** pada item dalam daftar yang sama. Pekerjaan yang secara eksplisit ditugaskan ke rekan unit tetap ditelusuri dari halaman domain yang sudah ada.
- Halaman menampilkan satu antrean prioritas. Detail risiko, periode, PIC/tanggung jawab, dan tenggat tetap terlihat tanpa membuka item. Pagination memakai komponen bersama, tanpa filter tambahan pada versi awal.
- **Tambah risiko** dan **Catat kejadian** tersedia sebagai tindakan eksplisit. Catat kejadian tidak bergantung pada penyelesaian antrean.

Tidak ada sistem penugasan baru, pengingat otomatis, email, atau notifikasi eksternal dalam ruang lingkup ini.

## 4. Aturan pembentukan antrean

Antrean merupakan hasil pembacaan keadaan domain. Item tidak mempunyai tombol Tandai selesai yang berdiri sendiri; item selesai atau hilang dari antrean aktif hanya setelah tindakan domain berhasil tersimpan.

| Jenis | Syarat muncul | Tindakan dan konteks |
| --- | --- | --- |
| Lengkapi risiko | Draf aktif yang belum difinalisasi | Buka draf yang sama; pertahankan identitas dan isian |
| Isi laporan | Tugas mitigasi belum dilaporkan dan jendela pelaporannya sudah tersedia, termasuk laporan terlambat yang masih diizinkan | Buka form mitigasi dan periode yang tepat |
| Mulai pemantauan | Profil final yang berlaku, efektif pada periode yang wajib dipantau, dan belum mempunyai transaksi pada periode tersebut | Buat atau dapatkan draf periode tersebut lalu buka workspace |
| Lanjutkan pemantauan | Transaksi pemantauan yang masih draf | Buka draf yang sama |

- Untuk saya menggunakan pembuat draf atau identitas PIC yang tersimpan, dengan pemeriksaan izin tindakan. Nama PIC bebas tidak dicocokkan ke akun berdasarkan kemiripan teks.
- Pemantauan mengikuti unit sebagai tanggung jawab bersama jika belum ada penanggung jawab eksplisit. Pembuat draf pemantauan menjadi konteks pribadi tanpa menghapus akses rekan unit yang berwenang.
- Pekerjaan tanpa PIC akun yang dapat diidentifikasi masuk Perlu ditangani unit; tampilkan PIC tekstual bila tersedia dan jelaskan bahwa tanggung jawabnya belum terhubung ke akun.
- Draf dan pekerjaan yang sudah memiliki PIC akun lain tidak masuk antrean pribadi; akses melalui koleksi domain tetap mengikuti izin yang berlaku.
- Profil arsip, versi yang digantikan, pemantauan final, serta tugas berstatus terminal tidak muncul sebagai pekerjaan aktif. Riwayat tetap dapat dibaca di tempat asalnya.
- Kunci item stabil: jenis pekerjaan + identitas domain + periode bila berlaku. Satu risiko/periode tidak menghasilkan tugas Mulai dan Lanjutkan sekaligus.
- Urutkan pekerjaan dengan tenggat sah yang telah lewat terlebih dahulu, kemudian tenggat terdekat. Item tanpa tenggat berada setelah item bertenggat dan diberi label Tanpa tenggat, bukan Terlambat. Gunakan tanggal pembuatan terlama dan kunci item sebagai pemecah urutan.
- Periode dan tanggal mengikuti Asia/Jakarta. Jangan menciptakan tenggat untuk draf, pemetaan kejadian, atau pemantauan apabila aturan domain belum menetapkannya.
- Tampilkan pekerjaan yang sudah dapat dilakukan. Pekerjaan yang masih terblokir aturan periode tidak ditampilkan sebagai tugas aktif. Bila keadaan berubah setelah halaman dibuka, aksi menjelaskan alasan penolakan dan menyegarkan daftar.
- Eligibility pemantauan berasal dari aturan domain yang sama dengan aksi Mulai Pemantauan: final dan berlaku, periode efektif, arsip, transaksi terdahulu, bulan ketiga, dan urutan kuartal. Tanggal hari ini saja tidak cukup.
- Kejadian yang belum dipetakan tetap dapat ditelusuri dari koleksi kejadian. Tidak ada kewajiban mencari hubungan risiko yang tidak relevan dan tidak ada tugas pemetaan yang harus ditutup.

## 5. Perjalanan kerja

### 5.1 Profil risiko

Pertahankan bagian identifikasi, analisis, evaluasi, rencana penanganan, dan target beserta aturan kelengkapannya. Simpan draf tetap tersedia sebelum seluruh bagian lengkap. Validasi menunjuk bagian dan field yang perlu diperbaiki.

Sesudah finalisasi, tampilkan hasil yang tetap dapat dibaca pada halaman tujuan, bukan hanya toast sesaat: identitas risiko, hasil finalisasi, PIC, dan tugas pelaporan pertama berikut periode/tenggatnya bila sudah tersedia. Beri tautan Lihat penanganan. Jika tugas belum terbentuk atau belum tersedia, jelaskan keadaan sebenarnya dan sediakan pemuatan ulang; jangan menampilkan tenggat rekaan.

### 5.2 Pelaporan mitigasi

Pisahkan makna status di seluruh permukaan yang terpengaruh, termasuk detail risiko, koleksi Penanganan, pemantauan, Agent, serta ekspor yang menampilkan status ini:

- `done` pada tugas laporan berarti **Sudah dilaporkan**, dengan label konteks Status pelaporan.
- Catatan pelaksanaan mendeskripsikan pencapaian atau kendala; Link bukti mengikuti validasi pelaporan yang berlaku.
- Label tindakan menjadi **Isi laporan** atau **Lapor pelaksanaan**, dan konfirmasi keberhasilan menyatakan laporan tersimpan.
- Persentase berbasis jumlah laporan dinamai **Kelengkapan pelaporan**. Angka 100% tidak menyatakan kegiatan selesai, target tercapai, atau risiko sehat.
- Belum dilaporkan, Terlambat, Tidak dilaporkan, dan Dilewati tetap mempunyai arti yang berbeda. Keadaan terminal Tidak dilaporkan tidak dibuka kembali oleh perubahan label.
- Perubahan ini tidak menambahkan persentase kemajuan kegiatan, status kegiatan baru, atau migrasi massal `done`. Status internal tetap kompatibel, sedangkan label dan agregasinya diperjelas.

Form dibuka dengan konteks tugas dan periode yang tepat. Kembali/Batal mengikuti perilaku form yang terdokumentasi. Item antrean diperbarui setelah server mengonfirmasi penyimpanan.

### 5.3 Kejadian dan anotasi

Pertahankan pencatatan fakta utama, dampak/penanganan, pemetaan opsional, detail tambahan, dan pemeriksaan sebelum menyimpan. Tanggal kejadian tidak menyiratkan bahwa operator memasukkan jam tertentu.

Tambahkan daftar catatan kronologis pada detail kejadian melalui satu tindakan Tambah catatan dan satu textarea. Bantuan singkat meminta operator menjelaskan koreksi atau informasi tambahan secara spesifik. Catatan memuat isi, aktor, organisasi, dan waktu server secara otomatis. Tidak ada field klasifikasi atau alasan terpisah. Catatan yang sudah tersimpan tidak ditimpa atau dihapus melalui UI; kesalahan pada catatan dijawab dengan catatan berikutnya.

Catatan awal dan hubungan risiko tetap utuh. Anotasi ditampilkan jelas sebagai keterangan tambahan, bukan diam-diam menggantikan field awal atau mengubah hitungan historis. Penonaktifan hubungan risiko yang salah dan penghitungan ulang berdasarkan fakta yang dikoreksi berada di luar tahap ini; pengguna tetap dapat mencatat kesalahan hubungan untuk ditinjau. Ekspor baru menyertakan anotasi yang berhak dibaca.

### 5.4 Pemantauan

Workspace dibuka dengan risiko dan periode yang benar. Sediakan ringkasan bukti yang dapat diperluas sebelum operator menetapkan skor:

- Profil, skor sebelumnya, dan target yang berlaku untuk periode tersebut.
- Laporan mitigasi periode tersebut, termasuk catatan kendala dan laporan yang belum tersedia.
- Kejadian bertanggal dalam periode tersebut yang terhubung ke keluarga versi risiko, bukan hanya ID versi terkini. Tampilkan anotasi relevan tanpa mengubah catatan awal.

Ketiadaan data dan kegagalan mengambil data memiliki tampilan berbeda. Tidak ada kejadian tercatat tidak berarti tidak ada kejadian di lapangan.

Operator memilih skor observasi, mengisi dasar penilaian, dan menyimpulkan kondisi serta tindak lanjut melalui field yang sudah ada. Hapus penetapan otomatis Efektif/Tidak Efektif dari perbandingan skor; gunakan Skor menurun/tetap/meningkat. Catatan bukti dan simpulan operator tetap diperlukan sesuai validasi domain; tidak ditambahkan pilihan efektivitas wajib baru.

Sebelum finalisasi, tampilkan periode, perubahan skor/substansi, versi hasil, laporan yang belum masuk, dan akibat penguncian. Pertahankan aturan bahwa finalisasi boleh memberi hasil terminal Tidak dilaporkan pada tugas yang belum dilaporkan, dengan penjelasan eksplisit sebelum konfirmasi.

Pemantauan final menyimpan konteks bukti yang dipakai saat finalisasi. Kejadian yang baru dicatat atau anotasi yang ditambahkan kemudian tidak mengubah hasil final lama secara diam-diam. Draf dapat menyegarkan bukti dengan penanda pembaruan; final menampilkan bukti saat finalisasi dan tautan ke sumber terkini.

Untuk hasil final lama yang belum memiliki snapshot bukti, tampilkan Bukti saat finalisasi belum tersedia. Sumber terkini boleh dibuka dengan label yang jelas, tetapi tidak boleh disajikan seolah-olah merupakan bukti yang tersedia saat finalisasi lama. Jangan membuat snapshot historis semu dari data hari ini.

## 6. Batas komponen dan aliran data

- **Layanan pekerjaan operator:** proyeksi baca di backend yang menggabungkan sumber risiko, tugas pelaporan, kejadian, dan pemantauan. Melakukan pembatasan organisasi/izin, deduplikasi, eligibility, pengurutan, dan pagination sebelum mengirim data. Tidak menyimpan salinan status tugas independen dan tidak menarik seluruh data organisasi ke browser untuk dihitung.
- **Halaman Pekerjaan saya:** menampilkan hasil proyeksi, keterangan tanggung jawab, pagination, pemuatan, kegagalan, dan tautan tindakan. Komponen daftar dan status memakai design system bersama.
- **Pembuka pekerjaan:** meneruskan identitas domain, periode, dan tujuan kembali ke halaman/form yang sudah ada. Konteks dari URL tetap divalidasi server. Menekan Mulai pemantauan dua kali membuka satu draf yang sama.
- **Pemetaan status laporan:** satu sumber label dan semantik untuk status pelaporan, digunakan ulang seluruh fitur yang terpengaruh tanpa mengubah kode status tersimpan.
- **Layanan anotasi kejadian:** operasi baca/tambah catatan yang melekat pada kejadian dan cakupan organisasi yang sama. Gunakan izin tulis kejadian yang berlaku untuk organisasi tersebut, bukan sekadar izin membaca catatan.
- **Penyusun bukti pemantauan:** mengumpulkan data sesuai keluarga versi dan periode, lalu menyimpan referensi serta isi relevan yang diperlukan agar hasil final dapat direproduksi.

Aliran utama: sesi penuh → tujuan sesuai peran → proyeksi pekerjaan → buka konteks → validasi/penyimpanan domain → pembacaan ulang sumber pekerjaan. Antrean bukan sumber kebenaran baru.

Kontrak API rinci dan migrasi ditempatkan pada rencana implementasi. Modul mengikuti Clean Architecture dan repository yang sudah digunakan.

## 7. Izin, kegagalan, dan kondisi khusus

- Halaman atau endpoint baru tidak memperluas hak akses. Cakupan default operator adalah organisasi sendiri; akses baca lintas organisasi tidak otomatis memberi hak menulis.
- Setiap tindakan memeriksa izin dan keadaan terbaru di backend, termasuk setelah pengguna membuka tautan lama atau kehilangan akses.
- Bila item sudah diselesaikan rekan unit, buka hasil yang tersimpan dan jelaskan pekerjaan telah ditangani. Jangan membuat transaksi pengganti atau menimpa hasil rekan.
- Pemuatan sebagian yang gagal ditandai Data belum lengkap dan menyebut sumber yang gagal. Jumlah total hanya dihitung dari respons lengkap; jangan menampilkan Nol pekerjaan atau Semua selesai pada kondisi tersebut.
- Kegagalan simpan mempertahankan isian dan menyediakan coba lagi. Kesalahan validasi berada di field terkait. Klik ganda tidak menciptakan catatan atau transaksi ganda.
- Pindah halaman dari form kotor meminta pilihan simpan atau tinggalkan sesuai pola aplikasi. Polling/pembaruan antrean tidak memindahkan fokus atau menghilangkan isian.
- Status pengiriman anotasi yang tidak pasti setelah putus koneksi diperiksa ulang melalui identitas permintaan sebelum mencoba menyimpan kembali.

## 8. Design system dan prinsip interaksi

Gunakan `DESIGN.md` dan halaman `/design-system` sebagai sumber visual: tipografi Inter, token netral, komponen shadcn yang sudah digunakan, ruang halaman, ikon, badge, pola form/dialog, serta reduced motion. Rancangan ini menyetujui pengecualian terarah terhadap aturan mempertahankan navigasi saat ini: penambahan Pekerjaan saya dan tujuan awal khusus operator.

Sebelum menerapkan tampilan fitur, dokumentasikan pola daftar pekerjaan dengan keterangan tanggung jawab, status pelaporan, catatan kejadian, ringkasan bukti, dan hasil penyimpanan di `DESIGN.md` serta katalog design system. Gunakan komponen produksi bersama di katalog, bukan salinan demonstrasi. Setelah implementasi, konfirmasikan sinkronisasi keduanya kepada pengguna.

Hierarki antrean mengutamakan pekerjaan dan satu tindakan kontekstual. Detail tambahan dibuka sesuai kebutuhan. Tanggal, label periode, status, alasan terblokir, dan kondisi kosong dapat dipahami tanpa hanya mengandalkan warna. Kontrol dapat digunakan dengan keyboard; tata letak sempit mempertahankan informasi penting dan tindakan yang dapat dijangkau.

Referensi pendekatan: [Apple Human Interface Guidelines — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/). Terapkan kejelasan hierarki, konteks yang terjaga, tindakan yang dapat diprediksi, dan pemulihan kesalahan melalui pola visual Manris.

## 9. Pembagian pekerjaan implementasi

Satu arah produk ini dibagi menjadi empat tahap yang dapat ditinjau tersendiri:

1. **Pintu masuk operator:** design system antrean sederhana, proyeksi pekerjaan, `/work`, navigasi, tujuan login, serta pembuka tugas yang menjaga konteks.
2. **Makna pelaporan dan hasil penyimpanan:** label Sudah dilaporkan, kelengkapan pelaporan, tindakan form, serta hasil setelah finalisasi risiko. Perubahan semantik diterapkan serentak di seluruh permukaan yang terpengaruh pada tahap ini.
3. **Catatan kejadian:** satu form catatan koreksi/tambahan dengan histori dan izin yang terjaga. Pemetaan tetap memakai aksi yang sudah ada.
4. **Pemantauan berbasis bukti:** kejadian serta laporan periode terkait, snapshot bukti final, dan kesimpulan perubahan skor yang tidak mengklaim efektivitas otomatis.

Setiap tahap memperbarui dokumentasi dan katalog sebelum tampilan fitur diselesaikan, serta melewati pengujian izin dan perjalanan pengguna yang relevan. Tahap pertama tidak mengklaim bahwa seluruh siklus baru telah selesai.

## 10. Kriteria penerimaan dan verifikasi

- Operator login normal mencapai Pekerjaan saya; alur ganti kata sandi, peran lain, tautan detail langsung, dan Dashboard tetap berfungsi.
- Keterangan Untuk saya dan Perlu ditangani unit membedakan PIC akun, PIC tekstual, pembuat draf, dan tanggung jawab unit tanpa penugasan palsu atau tab tambahan.
- Tugas datang dari seluruh sumber yang diizinkan, tidak berulang antarversi/periode, dan tidak memasukkan arsip atau hasil final sebagai tugas aktif.
- Antrean menampilkan terlambat dan tanpa tenggat secara jujur, serta mengecualikan tugas yang belum tersedia atau terminal tidak dilaporkan. Uji pergantian hari/kuartal menggunakan Asia/Jakarta.
- Risiko yang wajib dipantau tetap ditemukan walaupun belum ada transaksi. Uji profil efektif baru, kuartal belum bulan ketiga, pendahulu belum final, dan draf yang sudah dibuat rekan.
- Isi laporan membuka mitigasi/periode yang tepat. Pengiriman laporan menampilkan Sudah dilaporkan dan tidak mengklaim kegiatan selesai; angka agregat dilabeli sebagai kelengkapan pelaporan.
- Kejadian dapat dicatat tanpa risiko. Catatan tambahan mempertahankan catatan awal, aktor/waktu, izin unit, dan bebas duplikasi pada percobaan ulang. Pemetaan opsional tidak membentuk tugas wajib.
- Pemantauan menyatukan bukti periode yang tepat lintas versi; skor tetap tidak otomatis berarti mitigasi tidak efektif. Finalisasi menampilkan konsekuensi laporan kosong dan menjaga snapshot historis.
- Uji akses lintas unit melalui endpoint, tautan langsung, dan snapshot bukti. Data yang aksesnya dicabut tidak bocor melalui antrean atau ekspor.
- Uji sumber gagal sebagian, perubahan keadaan oleh rekan unit, koneksi putus saat simpan, klik ganda, form kotor, serta fokus keyboard.
- Jalankan pemeriksaan backend/frontend yang relevan dan review interaksi desktop/mobile terhadap design system. Lakukan uji tugas dengan operator: temukan pekerjaan berikutnya, isi laporan, catat kejadian, dan selesaikan pemantauan. Catat keberhasilan, salah pilih status, serta kebutuhan bantuan; dokumen ini tidak mengklaim hasil pengujian tersebut sudah tersedia.

## 11. Di luar ruang lingkup

Pengaktifan approval profil risiko, penggantian Dashboard analitis, sistem assignment baru, penilaian efektivitas otomatis/AI, pengingat eksternal, persentase kemajuan kegiatan, penghapusan record kejadian, penonaktifan relasi risiko, perubahan rumus skor, perubahan kalender pelaporan, filter/tab/KPI antrean tambahan, serta workflow keputusan pemetaan tidak termasuk rancangan ini.

## 12. Pemeriksaan spesifikasi

Spesifikasi diperiksa terhadap keputusan percakapan dan implementasi yang dibaca. Batas pelaporan/kegiatan, pekerjaan pribadi/unit, anotasi/fakta awal, periode, dan hasil historis dinyatakan secara terpisah. Tahapan implementasi mempunyai hasil dan dependensi eksplisit. Tidak ada placeholder kebutuhan; rincian kode, API, dan migrasi menjadi pekerjaan rencana implementasi setelah tinjauan pengguna.

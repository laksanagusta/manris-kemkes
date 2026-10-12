# Review siklus periode Manris

Tanggal: 11 Oktober 2026. Status: rekomendasi awal untuk wawancara grill-me; belum menjadi keputusan produk atau perubahan implementasi.

## Kesimpulan awal

Larangan finalisasi lintas kuartal untuk semua fitur tidak tepat. Profil risiko merupakan penilaian yang disahkan; pemantauan dan mitigasi merupakan bukti untuk periode tertentu; kejadian merupakan fakta dengan tanggal terjadinya sendiri. Semua memerlukan aturan penutupan laporan yang sama, tetapi tanggal pengelompokan berbeda.

Rekomendasi: periode pelaporan memiliki keadaan Terbuka → Penyelesaian → Ditutup. Setelah ditutup, hasil laporan tersimpan sebagai versi yang tetap. Pencatatan fakta terlambat tetap tersedia, tetapi perubahan terhadap laporan yang ditutup dilakukan melalui revisi dengan alasan, kewenangan, dan perbandingan perubahan. Perpindahan kuartal kalender tidak otomatis berarti semua transaksi harus ditolak.

## Temuan dari kode

| Temuan | Bukti | Implikasi |
|---|---|---|
| Finalisasi risiko menerima periode lama yang formatnya valid; tanggal efektif otomatis awal kuartal, bukan pilihan fakta terverifikasi | `backend/internal/usecase/risk/create.go`, `update.go`, `cycle.go` | Menambahkan syarat tanggal finalisasi hanya pada query laporan membuat transaksi berhasil tetapi hilang dari laporan periode pilihannya |
| Snapshot risiko baru mensyaratkan efektif dan Final sebelum akhir kuartal | `backend/internal/repository/postgres/risk_period_snapshot.go` | Ini merupakan sudut pandang data yang sudah disahkan saat batas kalender; belum mendukung masa penyelesaian atau revisi |
| Pemantauan memakai periode observasi; laporan mengambil hasil Final yang tersedia sekarang, tanpa cutoff finalisasi yang sama dengan profil | `backend/internal/repository/postgres/quarterly_report.go` | Laporan lama masih bisa berubah setelah finalisasi pemantauan terlambat |
| Pemantauan Final selalu menghasilkan profil untuk kuartal setelah periode pemantauan | `backend/internal/usecase/risk/monitoring_transaction.go`, `backend/internal/repository/postgres/risk_monitoring.go` | Pemantauan lama yang diselesaikan terlambat perlu dipisahkan dari aktivasi profil saat ini |
| Pemantauan hanya memeriksa transaksi Draft pada satu kuartal sebelumnya; ketiadaan transaksi tidak memblokir | `backend/internal/repository/postgres/risk_monitoring_periods.go` | Kuartal yang terlewat dan Draft lebih lama perlu kebijakan eksplisit |
| Pilihan UI lebih ketat dan membuka kuartal berjalan pada bulan ketiga | `frontend/src/lib/risk-cycle-options.ts` | Backend belum menjadi satu sumber keputusan kelayakan periode |
| Kewajiban pemantauan dimulai dari created/review-approved, sedangkan profil menggunakan effective_from | `backend/internal/usecase/risk/monitoring_transaction.go` | Risiko retrospektif dapat memiliki populasi dan kewajiban berbeda |
| Finalisasi pemantauan menutup tugas tanpa laporan menjadi not_reported | `backend/internal/repository/postgres/risk_monitoring.go` | Pencatatan laporan terlambat memerlukan jalur koreksi yang jelas |
| Submit laporan mitigasi menolak not_reported tetapi tidak memeriksa induk pemantauan Final; Update hanya WHERE id | `backend/internal/usecase/mitigation_task/usecases.go`, `backend/internal/repository/postgres/mitigation_task.go` | Tugas done masih dapat berubah setelah finalisasi; ada potensi balapan submit dan finalisasi |
| reported_at ditulis ulang saat laporan done disimpan; pending menghapusnya | `backend/internal/usecase/mitigation_task/usecases.go` | Waktu kirim pertama dan ketepatan waktu tidak stabil; perlu riwayat pengiriman/revisi |
| Tugas laporan masuk periode pemantauan atau kuartal period_end, bukan reported_at | `backend/internal/repository/postgres/quarterly_report.go` | Pelaporan terlambat tetap memengaruhi periode asal |
| Kejadian masuk periode occurred_at; validasi entitas tidak menolak waktu kejadian masa depan | `backend/internal/usecase/risk_event/service.go`, `backend/internal/domain/entity/risk_event.go`, `backend/internal/repository/postgres/quarterly_report.go` | Fakta terlambat memang berbeda dari Final risiko; future timestamp perlu pemeriksaan di jalur lengkap sebelum menyimpulkan perilaku API |
| Ringkasan periodik dihitung ulang dari data saat ini; hash bukan arsip laporan yang tetap | `backend/internal/usecase/report/quarterly.go` | Akhir kuartal belum berarti laporan terkunci |
| Laporan formal terpisah memakai upsert per unit/periode/jenis; sebagian sumber download diambil ulang | `backend/internal/repository/postgres/formal_report.go`, `backend/internal/usecase/formalreport/download.go` | Belum ada jaminan versi publikasi yang tetap pada jalur yang ditinjau |
| Zona waktu belum seragam: dashboard/laporan WIB, helper risiko/UI bergantung zona server/browser, beberapa helper tanggal UTC | `backend/internal/usecase/risk/cycle.go`, `frontend/src/lib/risk-cycle-options.ts`, `backend/internal/usecase/mitigation_task/usecases.go` | Perpindahan kuartal dapat berbeda pada tujuh jam pertama hari baru |
| DESIGN.md memuat aturan aktif akhir periode dan aturan lama aktif kapan pun dalam kuartal | `DESIGN.md` bagian Quarterly risk summary | Definisi stok risiko dan aktivitas sepanjang kuartal harus dipisah dan dokumentasi disatukan setelah keputusan |

Ini review statis jalur kode terkait. Kasus konkurensi dan perilaku seluruh endpoint belum dibuktikan melalui pengujian baru pada review ini. Riwayat data yang tidak pernah disimpan tidak dapat direkonstruksi dengan pasti.

## Model yang direkomendasikan

| Objek | Dasar periode bisnis | Waktu sistem yang tetap disimpan | Perilaku lewat batas penutupan |
|---|---|---|---|
| Profil risiko | Tanggal berlaku penilaian yang disahkan | Dibuat, difinalisasi, direvisi | Draft lama ditinjau ulang dan dilanjutkan ke periode berjalan; penilaian historis melalui koreksi berwenang |
| Pemantauan | Periode kondisi yang benar-benar diamati | Dimulai, dikirim, difinalisasi | Hasil tetap milik periode observasi; masuk revisi jika laporan asal sudah ditutup |
| Laporan mitigasi | Periode tugas/progres yang dilaporkan | Tenggat, kirim pertama, revisi | Tetap milik periode tugas, diberi status terlambat; laporan tertutup tidak ditimpa |
| Kejadian | Tanggal kejadian | Tanggal pencatatan dan pembaruan dampak | Tetap boleh dicatat; masuk periode kejadian dan calon revisi laporan terkait |

Pisahkan stok dan aliran. Jumlah risiko adalah profil Final aktif pada akhir periode; jumlah kejadian dan tugas adalah aktivitas yang termasuk dalam periode. Risiko yang diarsipkan sebelum akhir kuartal tidak masuk stok akhir, tetapi bukti kejadian dan tugasnya tetap ada. Tampilan harus menjelaskan perbedaan denominator ini.

Untuk laporan resmi, simpan period_end, batas penerimaan data, published_at, nomor versi, scope/unit, versi sumber, aturan metrik, alasan revisi, dan penerbit. Keadaan bisnis sampai akhir kuartal berbeda dari waktu informasi itu diterima. Kedua batas diperlukan jika ada masa penyelesaian.

Dashboard operasional memakai profil yang sudah disahkan dan berlaku saat ini. Hasil pemantauan historis tidak otomatis menimpa profil lebih baru. Jangan otomatis menganggap skor pengamatan lama sebagai kondisi terbaru; aktivasi profil hasilnya memerlukan aturan waktu yang jelas.

## Matriks edge case dan perilaku usulan

Semua perilaku berikut adalah usulan. Urutan keputusan: penutupan laporan → masa penyelesaian → finalisasi profil → pemantauan → mitigasi → kejadian → migrasi.

| # | Kasus | Perilaku usulan |
|---|---|---|
| 1 | Draft dibuat Q2, belum Final sampai Q4 | Riwayat identifikasi Q2 tetap; tinjau ulang dan lanjutkan profil ke Q4, tanpa mengganti waktu dibuat |
| 2 | Finalisasi Q2 pada awal Q3 saat penyelesaian masih terbuka | Boleh untuk penilaian Q2 yang sah; tampilkan waktu finalisasi sebenarnya, kebijakan efektif retrospektif perlu diputuskan |
| 3 | Finalisasi Q2 setelah laporan Q2 ditutup | Jalur normal menawarkan lanjut ke periode berjalan; koreksi historis hanya melalui revisi berwenang |
| 4 | Risiko dibuat pertengahan kuartal | Jangan otomatis membentuk kewajiban sebelum mulai berlaku; tanggal efektif perlu aturan eksplisit |
| 5 | Risiko baru berlaku kuartal mendatang | Boleh menyiapkan Draft; profil masa depan belum menjadi risiko operasional saat ini |
| 6 | Tanggal efektif dimundurkan setelah Final | Versi koreksi baru dengan alasan; tidak mengubah profil dan publikasi lama di tempat |
| 7 | Risiko Final Q2 masih aktif Q3/Q4 | Tetap ada pada stok periode berikutnya meski tidak membuat profil ulang |
| 8 | Risiko diarsipkan tengah Q3 | Keluar dari stok akhir Q3; kewajiban dan bukti sebelum arsip tetap ada |
| 9 | Risiko dipulihkan di Q4 | Aktif kembali mulai pemulihan; publikasi Q3 tetap |
| 10 | Arsip tepat awal Q3 pukul 00.00 WIB | Masih aktif pada akhir Q2; keluar mulai Q3 |
| 11 | Profil baru belum Final | Profil Final sebelumnya tetap operasional; Draft terpisah |
| 12 | Dua Final versi satu risiko/kuartal | Pilih satu versi sah menurut waktu berlaku; transaksi dan constraint mencegah dua aktivasi bersamaan |
| 13 | Pemantauan Q2 difinalisasi Q3 | Tetap hasil pengamatan Q2; ketepatan waktu pengiriman dinilai terpisah |
| 14 | Pemantauan Q2 difinalisasi Q4 setelah Q3 Final | Koreksi hasil Q2 tanpa menurunkan profil aktif atau menimpa Q3; evaluasi dampak lanjutan secara eksplisit |
| 15 | Pemantauan Q2 belum pernah dimulai, akan mulai Q3 | Tampilkan Q2 belum dilaporkan; jangan menganggap selesai. Izinkan pekerjaan berjalan dengan penyelesaian kekurangan yang jelas |
| 16 | Draft Q1 tertinggal, akan mulai Q3 | Jangan hanya memeriksa Q2; tampilkan seluruh tunggakan. Draft lama tidak boleh memblokir pekerjaan selamanya |
| 17 | Q3 Draft sudah dibuat, ingin melengkapi Q2 | Persiapan Draft masa depan tidak cukup untuk memblokir fakta historis; cegah aktivasi profil mundur |
| 18 | Pemantauan sebelum risiko berlaku | Tidak berlaku; tanpa kewajiban atau skor buatan |
| 19 | Finalisasi sebelum periode observasi selesai | Jika tetap diizinkan, perlu cara melengkapi observasi; rekomendasi awal simpan Draft sampai penilaian periode lengkap |
| 20 | Risiko diarsipkan saat pemantauan Draft | Riwayat tetap dapat dibaca; tawarkan pembatalan beralasan atau penyelesaian historis tanpa mengaktifkan kembali risiko |
| 21 | Sumber profil berubah saat pemantauan sedang diisi | Perlihatkan konflik dan perbedaan; observasi historis tidak hilang dan tidak otomatis memakai target baru |
| 22 | Pemantauan Final salah input | Koreksi sebagai versi baru; simpan hasil sebelumnya dan dampak pada laporan |
| 23 | Q4 → Q1 lintas tahun | Kewajiban, komparator, periode lanjutan dan masa penyelesaian mengikuti WIB lintas tahun |
| 24 | Tugas Q2, tenggat Q3 | Progres tetap Q2; ketepatan waktu menurut due_date, bukan akhir Q2 |
| 25 | Tugas Q2 dilaporkan Q4 | Tetap periode tugas Q2, terlambat; jika laporan sudah ditutup, masuk revisi |
| 26 | done diperbarui setelah tenggat | Simpan first_submitted_at dan waktu revisi; jangan membuat pengiriman tepat waktu menjadi terlambat hanya karena koreksi |
| 27 | Laporan done dikembalikan ke Draft | Riwayat kirim tetap; versi aktif belum valid dibedakan dari kirim pertama dan koreksi |
| 28 | Pemantauan Final dengan tugas belum terlapor | Simpan status belum terlapor saat pengesahan; laporan susulan tidak menimpa rekaman Final |
| 29 | Tugas done diubah setelah pemantauan Final | Tolak edit langsung; jalur revisi atau laporan tambahan yang terlacak |
| 30 | Tugas dilewati/dibatalkan | Alasan dan kewenangan wajib; jangan mengubahnya menjadi mitigasi terlaksana. Tentukan denominator yang konsisten |
| 31 | Laporan progres valid tetapi tindakan belum selesai | Bedakan “Terlapor” dari “Tindakan selesai”; keduanya tidak membuktikan risiko membaik |
| 32 | Perubahan mitigasi/PIC/jadwal tengah kuartal | Tugas yang sudah terbit mempertahankan riwayat; perubahan berlaku ke depan, cegah tugas ganda |
| 33 | Tugas mingguan/bulanan melintasi kuartal | Tetapkan satu aturan period_end atau pembagian eksplisit; due_date tidak menggeser periode kegiatan |
| 34 | Kejadian Q2 baru dicatat Q4 | Catat sekarang dengan occurred_at Q2; laporan Q2 yang ditutup hanya berubah melalui revisi |
| 35 | Kerugian belum diketahui saat kejadian | Unknown berbeda dari nol; nilai baru merupakan pembaruan dampak yang terlacak |
| 36 | Kerugian Q2 baru diketahui Q4 | Rekam waktu pengetahuan baru; tampilkan dampak historis terkini dan bedakan dari publikasi asli |
| 37 | Kejadian masih berlangsung lintas kuartal | Hitung kejadian sekali menurut awal kejadian; dampak lanjutan jangan digandakan, model periode dampak perlu diputuskan |
| 38 | Kejadian ditautkan ke risiko yang baru Final kemudian | Hubungan analitis boleh tersedia; tidak membuktikan risiko sudah terdaftar saat kejadian |
| 39 | Kejadian tidak terkait risiko atau risiko sudah arsip | Kejadian tetap dapat dicatat dalam scope unit; tidak wajib menghidupkan profil |
| 40 | Kejadian masa depan atau tanggal salah | Validasi tanggal faktual, arahkan perkiraan ke risiko; koreksi tanggal melacak perubahan periode |
| 41 | Satu kejadian ditautkan ke beberapa risiko | Jumlah kejadian dan kerugian tidak dikali jumlah hubungan |
| 42 | Import dokumen ulang | Identitas/idempotensi mencegah penggandaan; revisi dokumen dibedakan dari kejadian baru |
| 43 | Klik Final dua kali, submit bersamaan dengan penutupan | Pemeriksaan otorisasi dan periode di dalam transaksi yang sama; retry mengembalikan hasil yang konsisten |
| 44 | Submit tugas bersamaan dengan Final pemantauan | Serialisasi mutasi induk/anak; hasilnya seluruhnya sebelum atau sesudah Final, tidak terpotong |
| 45 | Browser/server beda zona, tengah malam, tahun kabisat | Satu kalender WIB, date-only untuk periode, timestamp UTC untuk aksi, interval start-inclusive/end-exclusive |
| 46 | Hak akses/unit/PIC berubah setelah publikasi | Scope historis dan penerbit tetap tersimpan; akses saat membuka tetap diperiksa, tanpa membocorkan unit lain |
| 47 | Unit terlambat sementara unit lain selesai | Penutupan per unit/periode; publikasi agregat merekam versi unit dan kelengkapan, tidak mencampur versi diam-diam |
| 48 | Ekspor PDF dan Excel saat ada edit | Keduanya memakai snapshot/version yang sama; metadata sumber dan waktu tampak |
| 49 | Data lama tanpa finalized_at/riwayat arsip | Tandai keterbatasan; jangan membuat waktu finalisasi palsu. Migrasi terpisah dengan keputusan eksplisit |
| 50 | Profil disupersede lewat koreksi setelah laporan terbit | Tampilan operasional mengikuti versi sah terbaru; laporan terbit tetap menunjuk versi sumber sebelumnya |

## Pengalaman pengguna yang mengambil prinsip Apple

Rujukan: [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles), [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo).

Penerapan berikut adalah rancangan Manris berdasarkan prinsip kejelasan, integritas data, feedback dan kendali pengguna; Apple tidak menentukan kebijakan penutupan laporan risiko.

- Aplikasi memilih periode yang layak secara otomatis. Header menunjukkan periode dan keadaan Terbuka/Penyelesaian/Ditutup secara konsisten.
- Pemilih periode mengambil keputusan kelayakan dari backend, termasuk alasan dan tindakan berikutnya. Tidak cukup menyembunyikan pilihan di UI.
- Draft tersimpan dan tidak hilang saat periode berubah. Tombol “Lanjutkan ke Q4” membuka tinjauan ulang dan mempertahankan asal Q2; jangan memindahkan diam-diam.
- Sebelum Final, tampilkan satu ringkasan konsekuensi: periode hasil, tanggal berlaku, tugas belum terlapor, perubahan skor/substansi, dan pengaruh pada profil aktif/laporan.
- Masalah rutin ditampilkan dekat field dengan tindakan perbaikan. Dialog dipakai hanya ketika pengesahan/penutupan memiliki konsekuensi yang perlu ditinjau.
- Laporan ditutup membuka tampilan versi resmi secara default. “Lihat pembaruan” menunjukkan catatan susulan; “Ajukan revisi” tersedia sesuai kewenangan.
- Koreksi dan undo berbeda: perubahan Draft mudah dibatalkan; Final tidak dihapus dari audit dan dikoreksi melalui versi baru.
- Copy konkret: “Q2 sudah ditutup. Lanjutkan penilaian ke Q4 atau ajukan koreksi Q2.” Hindari pesan teknis dan blokir tanpa jalan keluar.
- Status terlambat, tidak berlaku, belum terlapor, terlapor dan tindakan selesai tidak disamakan. Label bersama dipakai di dashboard, register, laporan dan ekspor.
- Motion mendukung feedback singkat dan menghormati reduced motion. Identitas visual tetap mengikuti DESIGN.md dan design system Manris.

## Tahap implementasi setelah keputusan

1. Sepakati penutupan, masa penyelesaian, pemilik penutupan/revisi dan scope unit.
2. Tetapkan tanggal bisnis setiap objek serta aturan profil hasil pemantauan historis.
3. Satukan kebijakan kelayakan di backend, endpoint individual/batch/import/working-paper, UI dan ekspor.
4. Simpan versi publikasi serta riwayat kirim/revisi; kunci mutasi langsung pada sumber yang Final.
5. Susun migrasi data lama tanpa mengarang riwayat; review contoh R-235 secara eksplisit.
6. Uji matriks ini pada batas waktu dan konkurensi. Bedakan tes aturan bisnis, transaksi database, UI serta kesetaraan laporan/ekspor.
7. Perbarui DESIGN.md dan design system terlebih dahulu sebelum membangun alur frontend baru.

Pertanyaan pertama wawancara: apakah laporan periode ditutup menjadi versi resmi yang tetap, dengan koreksi melalui revisi, atau hanya tampilan dinamis yang terus berubah? Rekomendasi: versi resmi tetap + pembaruan operasional terpisah.

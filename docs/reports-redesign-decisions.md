# Keputusan redesign halaman Laporan

Tanggal: 28 September 2026.

Status: keputusan produk dikonfirmasi melalui wawancara `grill-me`; belum diimplementasikan.

Halaman: `frontend/src/app/(app)/reports/page.tsx`.

## Tujuan dan cakupan

Halaman Laporan menyajikan evaluasi periode: perubahan risiko, pencapaian target, kelengkapan pelaporan mitigasi, kejadian aktual, dan unit yang perlu ditindaklanjuti.

Implementasi pertama mencakup sembilan widget utama, perbaikan perhitungan dan filter, endpoint yang diperlukan, ekspor lengkap, serta sinkronisasi `/design-system` dan `DESIGN.md`. Analisis tambahan sasaran/RO, TMPMR, pengesahan dokumen, pengendalian, cascading, dan biaya mitigasi berada di tahap berikutnya.

## Keputusan yang dikonfirmasi pengguna

| No. | Keputusan |
| --- | --- |
| 1 | Implementasi pertama hanya sembilan widget utama beserta pekerjaan pendukungnya. |
| 2 | Periode default adalah kuartal terakhir yang sudah selesai. Kuartal berjalan tetap dapat dipilih dengan penanda periode berjalan. |
| 3 | Laporan kuartal lama memakai data final terbaru untuk kuartal tersebut; laporan terlambat dan koreksi dapat memperbarui angka. Waktu pembaruan terlihat. File yang telah diekspor menjadi salinan saat ekspor, tanpa mekanisme penutupan kuartal pada tahap ini. |
| 4 | Penyebut KPI Target tercapai hanya risiko dengan target valid dan hasil pemantauan final. Risiko yang belum dapat dinilai disebutkan secara eksplisit. |
| 5 | KPI mitigasi mengukur Mitigasi terlapor, bukan penyelesaian pelaksanaan tindakan. Status `done` pada tugas tidak cukup untuk menyatakan pelaksanaan mitigasi selesai. |
| 6 | PDF mencakup ringkasan kinerja dan analisis utama. Excel memiliki sheet ringkasan, perbandingan unit, risiko, tugas mitigasi, dan kejadian. Keduanya mengikuti periode dan filter laporan aktif. |
| 7 | Target adalah patokan yang dibandingkan pada setiap kuartal, memakai target profil yang berlaku pada kuartal tersebut. Label Tercapai / Belum tercapai tidak menyatakan kegagalan memenuhi tenggat. |
| 8 | Tabel risiko default menampilkan risiko yang perlu perhatian, dengan pilihan Semua risiko dan pencarian pada tabel yang sama. |
| 9 | Pengarsipan pada kuartal berikutnya tidak mengeluarkan risiko dari laporan kuartal ketika risiko tersebut masih aktif. |
| 10 | Klik nama unit membuka drawer detail dari sisi kanan menggunakan Vaul. Drawer menampilkan risiko, mitigasi, dan kejadian unit tersebut; filter halaman dan ekspor tetap sama. |
| 11 | Semua unit dalam scope tetap tampil dalam tabel perbandingan, termasuk unit tanpa data. Gunakan Belum ada data dan tanda `—` untuk metrik yang belum dapat dihitung. |
| 12 | Pembanding default adalah kuartal sebelumnya. Pengguna dapat mengganti periode pembanding melalui toolbar. |
| 13 | Risiko yang pernah aktif selama kuartal tetap dihitung meskipun diarsipkan di tengah kuartal. Tampilkan penanda Diarsipkan dalam periode ini; riwayat pemantauan dan pelaporannya tetap dinilai. |

## Sembilan widget dalam enam blok

| Blok | Widget | Jumlah |
| --- | --- | ---: |
| Ringkasan kinerja | Risiko di atas selera risiko; Target tercapai; Mitigasi terlapor; Pemantauan final | 4 |
| Perubahan dan target | Satu panel gabungan perubahan risiko dan pencapaian target | 1 |
| Mitigasi | Pelaksanaan dan pelaporan mitigasi, dengan pemisahan status pelaporan dari hasil risiko | 1 |
| Kejadian | Kejadian dan dampak aktual | 1 |
| Unit | Tabel perbandingan unit | 1 |
| Risiko | Tabel risiko yang membutuhkan perhatian, dengan pilihan Semua risiko | 1 |
| Total | | 9 |

Toolbar, indikator cakupan data, drawer, dan pilihan tampilan di dalam panel tidak menjadi widget tambahan. Semua widget tetap pada halaman utama tanpa tab analisis tambahan pada tahap ini.

## Definisi metrik

### Populasi risiko dan waktu

- Gunakan profil final yang berlaku pada kuartal laporan, deduplikasi berdasarkan kelompok versi risiko.
- Populasi mencakup risiko yang aktif selama kuartal tersebut sesuai keputusan pengarsipan di atas. Perubahan versi akibat pemantauan tidak disamakan dengan pengarsipan manual yang mengakhiri risiko.
- Profil kuartal dan observasi pemantauan kuartal adalah dua data berbeda. Observasi Q1 dapat menjadi profil Q2; observasi tersebut tidak diam-diam menggantikan skor profil Q1.
- Koreksi final mengikuti kuartal yang dikoreksi. Target pembanding berasal dari profil yang berlaku pada kuartal tersebut, bukan target profil terbaru dari kuartal lain.
- Scope organisasi mengikuti hak akses aplikasi. Filter laporan tidak memperluas akses data.

### Risiko di atas selera risiko

- Gunakan klasifikasi selera risiko yang sudah berlaku dalam aplikasi untuk profil kuartal.
- Tampilkan jumlah, total populasi, dan persentase; hindari label Risiko kritis untuk gabungan Sedang, Tinggi, dan Sangat Tinggi.
- Perubahan terhadap pembanding memakai definisi dan scope yang sama pada kedua periode.

### Target tercapai

- Dapat dinilai: target valid dan observasi pemantauan final tersedia untuk kuartal tersebut.
- Tercapai: nilai hasil pemantauan tidak melebihi nilai target pada profil yang berlaku.
- Persentase: jumlah tercapai dibagi jumlah yang dapat dinilai, dikalikan 100.
- Risiko tanpa target valid atau tanpa observasi final masuk Belum dapat dinilai, tidak menjadi skor nol.
- Contoh yang disepakati: 10 risiko bertarget, 2 memiliki observasi final, dan keduanya mencapai target menghasilkan 100% (2 dari 2), disertai 8 risiko belum dapat dinilai.
- Penyebut nol menghasilkan `—`, bukan persentase keberhasilan atau kegagalan.
- Label Belum tercapai menyatakan posisi terhadap target, bukan pelanggaran tenggat yang belum dicatat.

### Mitigasi terlapor

- Pembilang adalah tugas dengan laporan progres valid sesuai aturan aplikasi; status `done` tanpa laporan valid tidak cukup.
- Penyebut adalah seluruh tugas wajib untuk periode tersebut. Atribusi periode mengikuti periode tugas/pemantauan; waktu pengiriman tidak memindahkan laporan terlambat ke kuartal lain.
- Pisahkan sudah terlapor, belum terlapor, melewati tenggat, tidak dilaporkan, dan dilewati sesuai data yang tersedia.
- Jika ketepatan waktu ditampilkan, beri label ketepatan pelaporan. Waktu pengiriman bukan bukti tanggal penyelesaian pelaksanaan tindakan.
- Pencapaian target risiko menyajikan hasil yang teramati; hubungan dengan laporan mitigasi tidak otomatis membuktikan sebab akibat.

### Pemantauan final dan cakupan data

- Pembilang adalah risiko dalam populasi yang memiliki observasi pemantauan final pada kuartal laporan.
- Penyebut adalah populasi risiko yang wajib dipantau pada periode tersebut menurut aturan aplikasi dan keputusan historis di atas.
- Tampilkan pembilang/penyebut, bukan persentase saja.
- Indikator cakupan data menyatu dengan ringkasan: observasi final, target tersedia, dan bukti laporan mitigasi bila tersedia.
- Unit tanpa data tidak diberi kesan berkinerja baik. Bedakan data tidak tersedia dari jumlah nol yang sudah diketahui.

### Kejadian dan dampak aktual

- Gunakan tanggal kejadian untuk atribusi periode.
- Sertakan tingkat keparahan, kondisi pascarespons yang tercatat, risiko terkait, dan kejadian yang belum terhubung ke register.
- Total kerugian hanya menjumlahkan nilai yang diketahui; jumlah kejadian dengan kerugian belum diketahui tetap terlihat.
- Deduplikasi kejadian yang terhubung ke beberapa risiko.

## Interaksi dan penyajian

- Toolbar memuat periode, pembanding, organisasi/grup, scope aktif, dan ekspor.
- Satu panel perubahan dan target mempertahankan risiko baru sebagai kategori tersendiri; risiko baru tidak masuk Stabil. Pengarsipan tidak disebut sebagai penurunan skor.
- Perbandingan unit menyajikan jumlah dan rasio yang relevan, bukan satu skor gabungan baru tanpa definisi bobot.
- Tabel perhatian menyoroti risiko memburuk, belum mencapai target, pemantauan belum final, dan mitigasi terlambat. Semua risiko tetap dapat dilihat pada tabel yang sama.
- Drawer unit menggunakan komponen Vaul yang sudah tersedia di Manris, dengan judul, deskripsi, body yang dapat digulir, dan kontrol tutup. Membuka atau menutup drawer tidak mengubah scope laporan atau ekspor.
- Gunakan Inter, komponen dan token Manris, label bersama warna semantik, dan komposisi Card/Table/Chart yang sudah ada. Tinggi konten mengikuti kebutuhan datanya.
- Loading, kegagalan pengambilan data, data kosong, dan penyebut nol harus berbeda. Sediakan retry untuk kegagalan, tanpa mengubahnya menjadi Belum ada data.
- Perubahan aturan visual bersama harus masuk ke `/design-system` dan `DESIGN.md` sesuai instruksi proyek; pembaruan design system dilaporkan di chat setelah implementasi.

## Verifikasi implementasi

- Cocokkan widget, drawer, PDF, dan Excel terhadap dataset dan scope yang sama.
- Periksa kasus risiko baru, risiko memburuk/membaik/tetap, revisi profil, pengarsipan setelah periode, dan pengarsipan di dalam periode.
- Periksa target tidak tersedia, observasi draft, observasi final, penyebut nol, dan contoh 2 dari 2 dengan 8 belum dapat dinilai.
- Periksa tugas `done` tanpa laporan valid, laporan valid, laporan terlambat, tugas tidak dilaporkan, dan tugas dilewati.
- Periksa unit tanpa data, kejadian tanpa risiko terkait, kerugian belum diketahui, pagination, dan batas akses organisasi.
- Periksa default Q1 yang perlu mundur ke Q4 tahun sebelumnya, pembanding lintas tahun, dan batas kuartal sesuai zona waktu aplikasi.
- Jangan mengarang riwayat lifecycle yang tidak tersimpan. Periksa ketersediaan riwayat arsip/pemulihan ketika merekonstruksi populasi historis; jika tidak cukup, ungkapkan keterbatasan data dan tangani secara eksplisit.

Dokumen ini mencatat keputusan dan acuan verifikasi. File sumber frontend/backend dan design system belum diubah dalam tahap wawancara ini.

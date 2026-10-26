# Komponen respons Manris Agent

Tanggal: 24 Oktober 2026

Status: diimplementasikan dan diverifikasi pada kode, renderer, ekspor, serta database uji terisolasi. Pemeriksaan visual/interaksi browser masih menunggu akses browser diaktifkan. Melengkapi spesifikasi dan kontrak Manris Agent yang sudah ada. Tetap memakai komponen Manris; tidak memakai OpenUI.

## Keputusan yang disepakati

Agent memilih tampilan secara otomatis berdasarkan maksud pertanyaan. Pengguna tidak perlu memilih jenis komponen. Respons membantu pengguna membaca hasil sekaligus melanjutkan pekerjaan.

| Komponen | Contoh pertanyaan | Isi utama |
| --- | --- | --- |
| Detail risiko | “Jelaskan risiko R-241” | Kode, judul, skor/tingkat, status, dan tindakan kontekstual. |
| Prioritas tindak lanjut | “Mana yang perlu perhatian?” | Satu item per risiko yang perlu perhatian, dengan tugas terkait di bawahnya. |
| Perbandingan periode | “Apa yang berubah?” | Ringkasan unit antarkuartal: total risiko, risiko tinggi, mitigasi terlambat, dan perubahan jumlah. |

Detail risiko tampil ringkas. Tombol **Lihat rincian** membuka penyebab, dampak, pengendalian, dan mitigasi yang tersedia. Jangan mengarang nilai atau menampilkan pembuat data sebagai penanggung jawab.

Daftar prioritas hanya berisi risiko yang perlu perhatian, seperti risiko tinggi/sangat tinggi atau risiko dengan mitigasi terlambat. Urutkan berdasarkan skor risiko tertinggi, lalu keterlambatan terlama untuk skor yang sama. Aturan aplikasi menentukan urutan; model tidak membuat peringkat sendiri.

Perbandingan berfokus pada ringkasan unit antarkuartal, bukan riwayat satu risiko. Heatmap, grafik tren tambahan, lini masa kejadian, dan lini masa progres mitigasi berada di luar cakupan tahap ini.

## Tindakan dalam percakapan

- **Lihat mitigasi** langsung mengirim pertanyaan lanjutan untuk risiko tersebut.
- **Telusuri kejadian** langsung mencari kejadian yang memiliki hubungan tersimpan dengan risiko tersebut.
- **Susun tindak lanjut** langsung meminta Agent menyiapkan usulan; tidak menyimpan perubahan bisnis.
- Hasil tindakan ditambahkan sebagai respons baru di percakapan. Hasil lama tetap menjadi snapshot.
- Perubahan bisnis tetap melalui panel tinjauan dengan tombol **Batal** dan **Terapkan**.

Tindakan harus membawa ID entitas, cakupan organisasi, dan periode asal yang relevan. Teks tombol bukan sumber otorisasi. Server memeriksa kembali akses saat tindakan dijalankan. Jika akses dicabut atau data tidak tersedia, tampilkan penjelasan dan jangan memperluas cakupan secara diam-diam.

Gunakan jalur pengiriman langsung yang sama dengan pesan biasa, termasuk penguncian saat proses berjalan dan pencegahan klik ganda. Jangan mengubah perilaku seluruh komponen klarifikasi yang saat ini mengisi composer.

## Aturan data

### Detail risiko

Gunakan hasil pembacaan detail yang telah diotorisasi dan skor/tingkat kanonis aplikasi. Pertahankan status dan periode sumber; jangan menyebut data draf sebagai Final. Bagian rincian kosong memiliki keterangan yang jujur. Tindakan lanjutan membaca data dengan akses terbaru tanpa menulis ulang snapshot sebelumnya.

### Daftar prioritas

Gunakan populasi risiko aktif dalam snapshot periode dan cakupan yang diizinkan. Gabungkan kriteria tingkat tinggi/sangat tinggi atau adanya tugas mitigasi terlambat, kemudian deduplikasi berdasarkan ID risiko. Tugas terlambat mengikuti aturan operasional aplikasi: status pending/overdue dengan tanggal jatuh tempo sebelum hari ini di Asia/Jakarta. Keterlambatan dan tugas yang ditampilkan harus relevan dengan periode/cakupan hasil.

Filter, agregasi tugas per risiko, dan pengurutan harus dilakukan sebelum paginasi. Menggabungkan dua halaman awal dari alat yang berbeda tidak menghasilkan peringkat populasi yang benar. Jumlah keseluruhan hanya ditampilkan jika dihitung dari populasi lengkap yang diizinkan. Jika sumber terbatas, nyatakan batas tersebut.

Skor yang tidak tersedia tidak dianggap nol atau tinggi. Keterlambatan tanpa tanggal valid tidak dibuat-buat. Gunakan kode/ID sebagai pengurutan akhir yang stabil setelah skor dan keterlambatan.

### Perbandingan periode

Gunakan agregasi laporan kuartalan kanonis agar definisi risiko aktif/Final, arsip, skor, dan tugas konsisten dengan halaman laporan. “Risiko tinggi” mencakup tinggi dan sangat tinggi. Bandingkan himpunan unit yang sama, dengan kedua periode terlihat jelas.

Tampilkan nilai kedua periode dan selisih absolut. Data pembanding yang tidak tersedia tetap tidak tersedia, bukan nol. Nol yang sah tetap ditampilkan sebagai nol. Pertahankan peringatan kualitas/ketersediaan data. Kenaikan jumlah risiko tidak otomatis berarti kondisi memburuk; label perubahan harus menjelaskan metriknya.

## Default implementasi yang direkomendasikan

Bagian ini merupakan default teknis yang direkomendasikan, bukan pilihan tambahan yang sudah dijawab pengguna:

- Tampilkan lima risiko prioritas terlebih dahulu; **Lihat lebih banyak** menambahkan halaman berikutnya dengan filter dan urutan yang sama.
- Untuk pertanyaan perbandingan tanpa periode eksplisit, gunakan kuartal Jakarta terakhir yang sudah selesai dibanding kuartal sebelumnya, mengikuti halaman laporan.
- Cakupan mengikuti aturan akses dan cakupan percakapan yang berlaku. Jangan memperluas ke unit turunan tanpa permintaan yang sesuai dan pemeriksaan akses.
- Jika maksud atau periode tidak cukup jelas, gunakan klarifikasi yang sudah tersedia, bukan memilih data secara sembarang.

## Integrasi dan desain

Kontrak widget saat ini memiliki table, metrics, bar_chart, document, dan clarification. Tambahkan tiga payload bertipe untuk komponen baru. Model hanya memilih presentasi yang diizinkan; data terstruktur diisi dari sumber yang telah divalidasi. Renderer tidak menjalankan HTML/kode dari model.

Pertahankan kompatibilitas percakapan lama dan fallback jenis widget yang tidak dikenal. Ekspor Excel/PDF harus memahami isi ketiga komponen baru, termasuk periode dan rincian relevan, tanpa hanya mengekspor narasi.

Pola baru sudah didokumentasikan di DESIGN.md dan dicontohkan pada bagian Hasil dan tinjauan di halaman design-system menggunakan komponen produksi yang sama. Perubahan berikutnya harus menjaga keduanya tetap sinkron.

Gunakan token, tombol, badge, disclosure, dan tata letak Manris yang sudah ada. Pertahankan canvas standar, tanggal mulai chat sekali di tengah, bubble pengguna, jarak composer, tautan tabel tanpa underline, serta label Batal/Terapkan. Jangan mengembalikan footer metadata widget atau timestamp setiap pesan.

Gunakan satu bagian hasil yang jelas; hindari kartu bersarang yang tidak diperlukan. Disclosure memiliki status expanded dan dapat dioperasikan dengan keyboard. Tombol mempunyai nama yang menjelaskan tindakannya; level risiko tidak bergantung pada warna. Pada layar kecil, isi dan tombol tetap terbaca tanpa membuat seluruh halaman bergulir horizontal.

## Kriteria penerimaan dan tinjauan

1. Pertanyaan detail, prioritas, dan perbandingan menghasilkan komponen yang sesuai dari data nyata yang diotorisasi, bukan hanya contoh katalog.
2. Detail ringkas dapat dibuka/tutup tanpa menghilangkan konteks atau fokus.
3. Prioritas menggabungkan tugas per risiko, tidak menggandakan risiko, dan benar saat skor sama, tugas banyak, nilai tidak tersedia, serta data melewati batas halaman.
4. Perbandingan cocok dengan agregasi laporan untuk periode/unit yang sama, termasuk nol sah, pembanding tidak tersedia, dan peringatan.
5. Tombol tindakan langsung memulai tindak lanjut dalam chat; klik ganda/proses aktif tidak menciptakan proses duplikat. Hasil historis tetap utuh.
6. Usulan tindak lanjut tidak menyimpan data sebelum Terapkan. Penerapan tetap melalui pemeriksaan akses, revisi, dan transaksi yang sudah ada.
7. Akses yang dicabut dan ID/cakupan/periode yang tidak sah ditolak server; tidak ada perluasan akses melalui payload tindakan.
8. Percakapan lama, fallback widget, ekspor, penggunaan keyboard, dan tampilan seluler tetap berfungsi.
9. DESIGN.md dan contoh design-system sesuai dengan implementasi akhir. Jalankan pemeriksaan terarah pada aturan data dan interaksi yang berubah, lalu tinjau diff sebelum menyatakan selesai.

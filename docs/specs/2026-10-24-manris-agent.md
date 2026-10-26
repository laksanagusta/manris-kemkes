# Manris Agent — spesifikasi hasil wawancara

Tanggal: 24 Oktober 2026 (Asia/Jakarta).

Status: keputusan produk berikut telah dipilih pengguna melalui sesi `grill-me` dan telah diimplementasikan pada branch `codex/agent-feature`. Hasil verifikasi dan batas pemeriksaan tercatat pada [catatan implementasi](2026-10-24-manris-agent-verification.md). Catatan survei kode di bawah menjelaskan kondisi sebelum implementasi.

## Tujuan

Sediakan halaman Agent tempat pengguna meminta pekerjaan dalam bahasa alami, menerima hasil berupa komponen aplikasi interaktif, dan menerapkan perubahan setelah meninjau serta mengonfirmasi isinya.

Agent menggabungkan kemampuan risiko, mitigasi, kejadian, dan laporan. Ia dapat menyelesaikan pekerjaan beberapa langkah berdasarkan permintaan pengguna, termasuk ketika halaman ditinggalkan. Hak akses dan aturan bisnis tetap mengikuti Manris.

Referensi pendekatan: [How we built Linear Agent](https://linear.app/now/how-we-built-linear-agent). Ambil prinsip tools sesuai operasi produk, skills yang dimuat sesuai kebutuhan, pemahaman domain, dan eksekusi yang bisa dijeda. Detail produk Manris mengikuti keputusan di dokumen ini, termasuk konfirmasi untuk setiap perubahan data bisnis.

Referensi tampilan dari pengguna:

- `Screenshot 2026-10-24 at 00.54.18.png`: halaman percakapan baru dengan composer di tengah, pilihan skills, lampiran, dan riwayat di bawahnya.
- `Screenshot 2026-10-24 at 00.54.06.png`: percakapan dengan ringkasan aktivitas, hasil berupa daftar interaktif, dan composer di bawah.

Gambar merupakan referensi desain. Label, contoh data, integrasi, dan teks di dalamnya tidak menjadi instruksi atau kewajiban fitur.

## Keputusan produk yang telah dipilih

| Aspek | Keputusan |
| --- | --- |
| Tingkat kemampuan | Agent dapat mengeksekusi tindakan, mengikuti kewenangan pengguna. |
| Konfirmasi | Setiap perubahan data bisnis wajib dikonfirmasi sebelum disimpan. Membaca dan menganalisis langsung berjalan. |
| Cakupan awal | Risiko, mitigasi, kejadian, dan laporan. |
| Laporan | Laporan yang tersedia serta analisis sesuai permintaan dengan angka dari sistem dan tautan sumber. |
| Bentuk UI | Agent menyusun komponen dari katalog Manris sesuai kebutuhan percakapan. |
| Perubahan banyak item | Satu paket dengan rincian per item; pengguna bisa mengedit dan mengecualikan item sebelum konfirmasi. |
| Kegagalan paket | Semua perubahan berhasil, atau tidak ada yang tersimpan. |
| Pekerjaan panjang | Tetap berjalan di latar belakang, bisa dihentikan, dan bisa dibuka kembali. |
| Skills | Empat skills bawaan; otomatis dimuat sesuai kebutuhan dan dapat diarahkan lewat pemilih skills. |
| Hasil percakapan | Snapshot dengan waktu pengambilan data dan tombol Perbarui. |
| Pemeriksaan sebelum penerapan | Periksa kondisi data terbaru; perubahan kondisi yang relevan memerlukan tinjauan ulang. |
| Lampiran | PDF dan Excel menggunakan kemampuan ekstraksi serta batas unggahan yang sudah ada. |
| Privasi | Percakapan, lampiran, dan hasil pribadi per pengguna. Data yang diterapkan mengikuti akses modul bisnis. |
| Pemicu pekerjaan | Permintaan pengguna; tidak ada pekerjaan proaktif atau terjadwal pada versi pertama. |
| Patokan pengalaman pertama | Dari data Manris menuju ringkasan lintas modul dan usulan tindak lanjut yang dapat diterapkan. |

## Skenario patokan

Permintaan:

> Tinjau risiko tinggi unit saya, tampilkan kejadian terkait dan mitigasi terlambat, susun ringkasannya, lalu usulkan tindak lanjut.

Alur yang diharapkan:

1. Tentukan unit dan konteks periode dari konteks pengguna serta aturan domain. Tampilkan cakupannya. Jika ada ambiguitas yang mengubah hasil secara material, minta pengguna memilih lewat komponen di percakapan.
2. Muat skills yang relevan dan ambil data melalui operasi aplikasi yang berwenang.
3. Tampilkan progres yang konkret, misalnya Membaca profil risiko, Memeriksa mitigasi, dan Menyusun ringkasan.
4. Tampilkan ringkasan, tabel risiko, kejadian terkait, dan mitigasi terlambat beserta waktu pengambilan serta tautan sumber. Hubungan yang tersimpan harus dibedakan dari dugaan hubungan hasil analisis.
5. Susun usulan tindak lanjut sebagai paket yang dapat diedit. Minta informasi wajib yang belum tersedia; jangan mengarang PIC, tanggal, skor, atau bukti.
6. Tunggu konfirmasi. Tidak ada perubahan data bisnis selama penyusunan atau peninjauan.
7. Setelah pengguna menekan Terapkan, validasi ulang pengguna, cakupan akses, kondisi data, dan paket yang disetujui.
8. Terapkan seluruh paket dalam satu transaksi. Tampilkan bukti hasil dengan tautan ke data yang tersimpan, atau jelaskan kegagalan tanpa penyimpanan sebagian.

Skenario dokumen tetap termasuk cakupan: unggah laporan, ekstrak temuan dengan referensi, cocokkan dengan data yang diizinkan, dan siapkan paket risiko/mitigasi untuk dikonfirmasi.

## Halaman dan perilaku UI

Usulan rute: `/agent` untuk percakapan baru dan `/agent/[conversationId]` untuk percakapan tersimpan. Tambahkan Agent ke navigasi utama, mengikuti kebijakan ketersediaan AI yang ada.

### Percakapan baru

- Gunakan sidebar dan canvas standar halaman Manris. Halaman awal hanya menampilkan judul pengantar, deskripsi, composer, catatan persetujuan, dan riwayat/saran, tanpa panel luar atau header Percakapan baru. Toolbar ringkas hanya tampil pada percakapan yang sudah berisi pesan.
- Tempatkan composer di tengah area kerja, dengan lebar baca yang nyaman dan ruang kosong seperti gambar pertama.
- Isi composer: input multiline, pilihan Skills, unggah lampiran, dan tombol kirim.
- Tampilkan riwayat pribadi di bawah composer: judul, aktivitas terakhir, dan status jika pekerjaan masih berlangsung atau menunggu konfirmasi.
- Gunakan riwayat nyata dan keadaan kosong yang jelas; jangan mengisi percakapan atau data contoh sebagai hasil seolah sudah tersimpan.

### Percakapan berjalan

- Header memuat judul percakapan dan akses ke riwayat/percakapan baru.
- Pesan pengguna rata kanan dengan permukaan netral yang ringan. Jawaban agent berisi teks ringkas dan komponen hasil.
- Progres dapat dibuka untuk melihat aktivitas, tools yang dijalankan, durasi, dan status. Jangan menampilkan proses penalaran internal model.
- Composer berada di bawah area percakapan dan tetap dapat dijangkau saat menggulir.
- Sediakan Hentikan ketika pekerjaan berlangsung. Pesan baru saat run aktif harus dikelola secara berurutan agar tidak ada dua run yang menerapkan usulan bertentangan.
- Pertahankan posisi gulir ketika pengguna membaca hasil lama; ikuti hasil baru hanya saat pengguna berada di bagian akhir.

### Katalog hasil agent

Gunakan komponen aplikasi dengan kontrak data terstruktur dan berversi:

- Daftar/tabel risiko dengan status, skor, unit, dan tautan detail.
- Daftar mitigasi serta tugas terlambat dengan PIC dan periode.
- Daftar/detail kejadian serta relasi risiko yang diketahui.
- Metrik, tabel perbandingan, dan grafik laporan dengan cakupan dan sumber.
- Kartu dokumen dengan referensi halaman, lembar, atau bagian bila tersedia.
- Pertanyaan klarifikasi berupa pilihan atau formulir terstruktur.
- Panel usulan perubahan, peninjauan paket, dan bukti penerapan.
- Status pekerjaan, kesalahan, serta kontrol coba ulang yang sesuai.

Model memilih komponen dan mengisi parameter yang tervalidasi. Ia tidak menghasilkan atau menjalankan kode antarmuka, HTML bebas, SQL, atau perintah sistem. Jenis komponen yang tidak dikenal menghasilkan fallback yang dapat dibaca tanpa mengeksekusi konten.

### Snapshot dan pembaruan

- Simpan hasil terstruktur, cakupan, waktu pengambilan, dan referensi sumber bersama pesan.
- Angka, tabel, dan uraian pada satu hasil harus konsisten. Jangan memperbarui tabel lama diam-diam sementara uraian masih memakai angka sebelumnya.
- Perbarui menghasilkan versi hasil baru yang dapat ditelusuri; snapshot lama tetap tersedia di riwayat.
- Snapshot tidak membekukan hak akses. Akses percakapan, hasil, lampiran, sumber, dan unduhan tetap diperiksa terhadap kewenangan pengguna saat ini; data yang tidak lagi berhak dilihat tidak disajikan kembali.

### Peninjauan paket

Panel menampilkan jumlah perubahan, tindakan per item, target, informasi sebelum/sesudah untuk pembaruan, dan alasan usulan dengan sumber yang relevan.

Pengguna dapat mengedit, mengecualikan item, atau membatalkan paket. Tombol memakai label Batal dan Terapkan. Jumlah perubahan yang dipilih tetap ditampilkan pada keterangan di atas tombol. Saat isi paket berubah, konfirmasi lama tidak berlaku untuk isi baru. Setelah diterapkan, panel menampilkan hasil tersimpan dan tidak menawarkan penerapan ulang.

Penyimpanan pesan, lampiran, progres, dan usulan adalah metadata percakapan yang diperlukan oleh fitur. Konfirmasi perubahan pada dokumen ini mengatur data bisnis Manris; pengiriman pesan atau pengeditan usulan tidak boleh secara diam-diam mengubah data bisnis.

### Desain dan aksesibilitas

- Adaptasikan komposisi Linear ke token, Inter, Hugeicons, dan komponen resmi Manris. Jangan menyalin merek, navigasi, logo watermark, atau integrasi GitHub dari gambar.
- Sebelum membangun tampilan fitur, dokumentasikan pola Agent dalam `DESIGN.md` dan tambahkan contoh pada `/design-system`. Contoh katalog menggunakan komponen produksi yang sama. Konfirmasikan pembaruan keduanya kepada pengguna setelah dilakukan.
- App shell menggunakan area utama sewarna sidebar dengan gutter halaman standar. Agent mengikuti canvas itu tanpa pengecualian padding atau panel putih pembungkus; heading pengantar menggantikan header per rute pada halaman awal.
- Pada ponsel, gunakan shell mobile yang ada, composer aman dari keyboard/safe area, kontrol yang tetap terjangkau, dan overflow horizontal di dalam tabel saja.
- Semua tindakan dapat dijalankan dengan keyboard, status pekerjaan diumumkan secara wajar, fokus tetap stabil saat hasil bertambah, dan grafik menyediakan representasi data yang dapat dibaca.
- Terapkan token transisi dan reduced motion yang sudah ada. Keadaan memuat, kosong, gagal, dihentikan, selesai, dan menunggu konfirmasi dibedakan.

## Skills dan tools

Setiap skill memuat metadata, penjelasan konsep domain, prinsip penggunaan, skema hasil UI, dan tools yang relevan. Pemilihan awal memanfaatkan permintaan serta konteks percakapan; skill tambahan dapat dimuat selama run tanpa memulai percakapan baru.

| Skill | Kemampuan |
| --- | --- |
| Risiko | Mencari dan membaca profil, memahami status/versi/periode, menganalisis, serta menyusun operasi perubahan risiko yang didukung aplikasi. |
| Mitigasi | Membaca rencana dan tugas, memeriksa keterlambatan/PIC/progres, serta menyusun perubahan yang sesuai tahap siklus risiko. |
| Kejadian | Mencari dan membaca kejadian serta relasinya, lalu menyusun pencatatan/pembaruan yang didukung aplikasi. |
| Laporan | Memakai laporan yang aktif dan analisis sesuai permintaan, dengan perhitungan deterministik serta referensi sumber. |

Pemilih Skills merupakan pengarahan tugas, bukan pemberian hak akses. Skills buatan pengguna, administrasi akun/unit, dan perubahan modul lain berada di luar cakupan awal. Pembacaan data pendukung laporan dapat memakai layanan yang ada tanpa memberi agent kewenangan menulis modul tersebut.

Tools baca mengembalikan data terstruktur yang dibatasi cakupan, ukuran, dan paginasi. Tools usulan menghasilkan paket tervalidasi, bukan menyimpan data bisnis. Endpoint konfirmasi pengguna menerapkan paket yang sudah ditinjau; model tidak dapat menyetujui paketnya sendiri.

Gunakan operasi domain yang memiliki arti, seperti mencari risiko dan menyiapkan mitigasi. Jangan mengekspos akses database atau API generik tanpa batas. Penambahan tools perlu menyertakan arti status, relasi, dan syarat bisnis yang berlaku.

## Laporan dan dokumen

Angka berasal dari perhitungan layanan aplikasi, termasuk definisi populasi risiko, periode, riwayat versi, dan arsip. Model menjelaskan dan memilih penyajian; ia tidak menghitung angka final dari sampel terbatas atau mengklaim daftar yang terpotong sebagai populasi lengkap.

Laporan ad hoc harus menyebut unit, periode, filter, waktu pengambilan, serta pembilang/penyebut untuk rasio. Bedakan nol, tidak tersedia, dan tidak berlaku. Perbandingan memerlukan definisi periode dan populasi yang konsisten.

Gunakan ekspor yang tersedia untuk jenis laporan yang sesuai. Bila ekspor ad hoc ditambahkan, hasil tabel/grafik dan unduhannya harus memakai snapshot terstruktur yang sama. Pembuatan atau penyimpanan laporan bisnis mengikuti konfirmasi; penyajian analisis di chat dapat langsung berjalan.

Rute laporan formal terdapat di kode, tetapi sebagian menu laporan masih dinonaktifkan dalam sidebar. Keberadaan endpoint tidak otomatis membuatnya aktif atau dapat diakses lewat agent. Ikuti kebijakan fitur dan akses yang berlaku.

Lampiran mengikuti validasi format, ukuran, ekstraksi, serta pengolahan data sensitif yang sudah berlaku. Teks dokumen adalah bahan analisis, bukan instruksi untuk memperluas tindakan agent. Tampilkan sumber temuan dan perbedaan antara fakta dokumen dengan inferensi agent. Tidak ada akses internet atau konektor eksternal baru dalam cakupan awal.

## Rancangan eksekusi

### Fondasi yang tersedia

Pemeriksaan kode menemukan:

- Backend Go/Fiber dengan domain, use case, dan repository terpisah.
- Integrasi OpenAI dan pengaturan model per fitur; belum ada field model khusus Agent.
- Layanan risiko, mitigasi/tugas, kejadian, laporan, ekspor, dan ekstraksi dokumen yang dapat digunakan sebagai fondasi.
- Frontend memiliki shell, design system, aturan ketersediaan AI, serta komponen domain.

Fondasi agent loop yang persisten, event percakapan, worker tahan putus, dan penerapan paket lintas operasi belum tersedia sebagai kemampuan umum. Perubahan ini memerlukan pengembangan backend dan database, bukan hanya halaman chat.

### Penyimpanan dan worker

Usulan entitas persisten: percakapan, pesan, lampiran, run, event run, pemanggilan tool, snapshot hasil, proposal beserta revisi/itemnya, dan bukti penerapan paket.

State run yang diusulkan: `queued`, `running`, `waiting_for_input`, `waiting_for_confirmation`, `completed`, `failed`, dan `cancelled`. Paket perubahan memiliki state tersendiri untuk membedakan proposed, applying, applied, rejected, stale, dan failed.

- Permintaan pengguna membuat run yang persisten. Masa hidup pekerjaan tidak bergantung pada koneksi browser.
- Worker menggunakan klaim pekerjaan, lease/heartbeat, checkpoint, dan pemulihan setelah proses mati.
- Setiap checkpoint menyimpan state yang diperlukan untuk melanjutkan. Event memiliki urutan yang dapat dipakai reconnect tanpa menduplikasi hasil.
- UI berlangganan progres yang tersimpan; koneksi streaming putus dapat disambung atau dipulihkan lewat pembacaan status.
- Pekerjaan yang menunggu input/konfirmasi tidak menahan transaksi database atau koneksi model yang aktif.
- Pengecekan akses memakai identitas pengguna dan kewenangan terkini. Jangan menyimpan token sesi mentah di pekerjaan latar belakang.
- Hentikan membatalkan langkah berikutnya dan upaya yang sedang dapat dibatalkan. Transaksi yang sudah committed tidak dibalik diam-diam; tampilkan status sebenarnya ketika pembatalan berpapasan dengan commit.
- Retry hanya untuk langkah yang aman diulang, dengan batas langkah, waktu, keluaran, dan pemakaian yang terkonfigurasi. Kegagalan tidak memicu loop tanpa batas.

### Penerapan paket secara atomik

1. Normalisasikan dan validasi usulan, cek akses, lalu simpan revisi paket beserta kondisi target yang relevan.
2. Konfirmasi terikat ke pengguna, revisi paket, isi lengkap, cakupan, dan kondisi data; bukan sekadar ID yang kemudian dapat diganti model.
3. Endpoint penerapan menggunakan sesi pengguna yang masih sah dan kunci idempotensi. Model tidak mengirim otorisasi atas nama pengguna.
4. Buka transaksi, kunci/validasi kondisi target yang relevan, dan cek kembali kewenangan serta seluruh aturan bisnis.
5. Terapkan operasi domain menggunakan repository yang berbagi transaksi tersebut. Catat bukti penerapan dan audit dalam transaksi yang sama.
6. Jika satu operasi gagal, rollback seluruh perubahan bisnis. Jangan mensimulasikan atomicity melalui beberapa API call mandiri atau penghapusan kompensasi.
7. Setelah commit, publikasikan hasil melalui mekanisme yang dapat dipulihkan. Klik ulang, retry jaringan, atau worker restart mengembalikan bukti yang sama tanpa menggandakan perubahan.

Paket yang stale tidak otomatis diregenerasi lalu diterapkan dengan konfirmasi lama. Pengguna meninjau revisi baru. Penambahan operasi oleh agent setelah konfirmasi membutuhkan paket dan konfirmasi baru.

Operasi yang tidak dapat ikut dalam transaksi database harus dipisahkan dari paket atomik atau distaging sebelum commit. Versi pertama tidak boleh mengklaim bahwa efek eksternal sudah di-rollback hanya karena perubahan database dibatalkan. Layanan yang belum bisa berbagi transaksi perlu diadaptasi sebelum didaftarkan sebagai tool penerapan paket.

## Urutan implementasi yang diusulkan

1. **Kontrak dan fondasi:** kontrak hasil UI/skills/tools, migrasi penyimpanan, model Agent pada pengaturan AI, otorisasi, dan state machine.
2. **Pekerjaan persisten:** agent loop, worker, event, reconnect, pembatalan, serta pemulihan setelah restart.
3. **Data ke hasil interaktif:** empat skills baca, definisi angka laporan, snapshot, dan sumber. Gunakan skenario patokan dengan data nyata yang diizinkan.
4. **Perubahan terkonfirmasi:** proposal berversi, peninjauan/edit item, penerapan atomik melalui operasi domain, kondisi stale, audit, dan idempotensi.
5. **Design system dan halaman:** dokumentasikan pola Agent dan contoh katalog lebih dahulu, lalu bangun halaman dari komponen yang sama mengikuti dua referensi.
6. **Dokumen dan laporan:** integrasikan unggahan/ekstraksi, pencocokan, sumber dokumen, dan keluaran laporan yang didukung.
7. **Verifikasi menyeluruh:** tes kebijakan eksekusi, transaksi, pemulihan pekerjaan, kebenaran data laporan, serta interaksi desktop/mobile dan aksesibilitas.

Tahapan ini merupakan urutan pengerjaan satu fitur; layar yang hanya menampilkan data contoh bukan penyelesaian fitur.

## Kriteria penerimaan dan review

- Skenario patokan menghasilkan ringkasan, komponen hasil dengan sumber, dan paket tindakan yang dapat ditinjau.
- Paket yang belum dikonfirmasi tidak mengubah data bisnis; jawaban teks dari model tidak dapat menggantikan konfirmasi.
- Pengeditan atau pengecualian item memperbarui isi dan jumlah yang akan diterapkan.
- Satu operasi gagal menghasilkan nol perubahan bisnis pada seluruh paket.
- Klik ganda, retry, restart worker, dan reconnect tidak menghasilkan penerapan ganda.
- Perubahan kondisi data atau pencabutan akses menghentikan penerapan dan meminta tinjauan ulang yang sesuai.
- Pengguna lain tidak dapat membaca percakapan, lampiran, hasil, atau menjalankan konfirmasi lewat ID yang diketahuinya.
- Snapshot lama tetap konsisten dengan uraiannya; Perbarui menghasilkan hasil baru yang bersumber jelas.
- Pekerjaan tetap berjalan ketika halaman ditutup dan pulih setelah proses worker dimulai ulang, tanpa perlu menyimpan token sesi mentah.
- Pembatalan dan kegagalan menampilkan hasil sebenarnya; pekerjaan selesai tidak diklaim dibatalkan.
- Ekstraksi PDF/Excel menjaga referensi, tidak mengikuti instruksi dalam dokumen sebagai otorisasi, dan tidak membuat duplikat lewat retry penerapan.
- Angka laporan cocok dengan layanan/halaman sumber untuk cakupan dan waktu yang sama, termasuk batas kuartal dan kondisi arsip/versi.
- Hak akses, aturan status/finalisasi, tanda tangan yang berlaku, serta kebijakan AI tetap diperiksa oleh aplikasi.
- Halaman mengikuti design system dan referensi pada desktop/mobile; komponen interaktif berfungsi dengan keyboard dan reduced motion.
- Review hasil mencakup perilaku nyata, kode, dan desain. Catat hasil pengujian serta keterbatasan yang masih tersisa sebelum menyatakan implementasi selesai.

## Di luar versi pertama

- Skills buatan pengguna dan pustaka skills bersama.
- Percakapan bersama unit atau kolaborasi lintas pengguna.
- Penjadwalan, pemantauan otomatis, dan pemicu proaktif.
- Perubahan administrasi akun, organisasi, atau pengaturan melalui agent.
- UI bebas hasil kode model, akses shell, SQL bebas, internet, dan integrasi eksternal baru.

## Review dokumen

Keputusan produk di atas telah dicocokkan dengan seluruh jawaban sesi wawancara. Rancangan membedakan kemampuan yang tersedia di kode dari fondasi baru, metadata percakapan dari perubahan bisnis, dan konfirmasi agent dari aturan domain yang tetap berlaku. Penyimpanan snapshot tidak menjadi jalan untuk mempertahankan akses setelah kewenangan dicabut. Rancangan paket atomik mensyaratkan transaksi bersama dan bukti idempotensi; beberapa penyimpanan independen tidak memenuhi keputusan pengguna.

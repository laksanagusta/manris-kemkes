# Desain Dokumen Laporan Analisis Hasil Kuesioner Aplikasi Manris

Tanggal: 2026-05-07
Topik: Laporan analisis formal berdasarkan hasil kuesioner evaluasi aplikasi Manris
Audiens utama: Campuran (pimpinan, tim pengembang, dan calon pengguna)
Sumber utama: Spreadsheet "Feedback Penilaian Aplikasi Manris P2 (Responses)" dan konteks produk pada `prd.md`

## 1. Latar Belakang

Manris v2 dikembangkan sebagai aplikasi untuk mendigitalisasi proses manajemen risiko dan insiden di lingkungan instansi pemerintah. Berdasarkan hasil sosialisasi dan demonstrasi aplikasi, telah dilakukan pengumpulan masukan melalui kuesioner untuk menilai kesan awal, kemudahan penggunaan, kesesuaian dengan kebutuhan instansi, serta saran pengembangan lebih lanjut.

Dokumen yang akan disusun bertujuan mengolah masukan tersebut menjadi laporan analitis yang formal, mudah dipahami, dan dapat digunakan sebagai dasar pengambilan keputusan maupun tindak lanjut pengembangan aplikasi.

## 2. Tujuan Dokumen

Dokumen akhir harus:

1. Merangkum persepsi umum responden terhadap aplikasi Manris secara objektif.
2. Mengidentifikasi permasalahan utama yang saat ini masih dirasakan pengguna.
3. Menjelaskan usulan pemecahan masalah yang realistis dan dapat ditindaklanjuti.
4. Menyusun roadmap pengembangan aplikasi secara bertahap untuk mendukung implementasi yang lebih matang.

## 3. Ruang Lingkup Analisis

Analisis difokuskan pada temuan yang muncul dari hasil kuesioner, terutama pada aspek berikut:

1. Penerimaan umum terhadap aplikasi
2. Kemudahan memahami tampilan dan alur penggunaan
3. Kesesuaian aplikasi dengan kebutuhan instansi
4. Bagian aplikasi yang paling diapresiasi pengguna
5. Bagian yang masih membingungkan atau perlu diperjelas
6. Saran pengguna terhadap penyempurnaan aplikasi dan dukungan implementasi

Analisis tidak akan masuk ke evaluasi teknis kode, pengukuran performa sistem, atau audit keamanan aplikasi, karena hal tersebut tidak tercakup dalam data kuesioner.

## 4. Ringkasan Temuan Utama

Berdasarkan pembacaan awal terhadap respons kuesioner, terdapat kecenderungan utama sebagai berikut:

1. Aplikasi diterima secara positif oleh mayoritas responden.
2. Fitur yang paling diapresiasi adalah bantuan AI, perhitungan otomatis, import data, kelengkapan menu, dan potensi pelaporan yang lebih rapi dibanding proses manual.
3. Tantangan utama belum berada pada penolakan terhadap konsep aplikasi, melainkan pada kesiapan pengguna untuk mengoperasikan aplikasi secara konsisten.
4. Masukan yang paling sering berulang adalah kebutuhan terhadap panduan penggunaan, tutorial, pelatihan lanjutan, dan penjelasan alur kerja yang lebih rinci.
5. Terdapat kebutuhan lanjutan untuk memperjelas beberapa fitur tertentu seperti penginputan risiko, analisis dan mitigasi, laporan, heatmap, penandatanganan, monev, dan pembagian akses pengguna.

## 5. Pendekatan Penulisan Laporan

Laporan akhir akan menggunakan pendekatan manajerial-analitis agar dapat dibaca dengan nyaman oleh audiens campuran. Pendekatan ini dipilih karena mampu menjaga keseimbangan antara bahasa formal untuk pimpinan dan rincian praktis untuk tim pelaksana.

Struktur laporan akhir:

1. Pendahuluan
2. Gambaran umum hasil kuesioner
3. Permasalahan saat ini
4. Analisis dan pemecahan masalah
5. Roadmap pengembangan aplikasi
6. Penutup

## 6. Desain Isi per Bagian

### 6.1 Pendahuluan

Bagian ini menjelaskan konteks penyusunan laporan, tujuan pengumpulan umpan balik, dan pentingnya hasil kuesioner sebagai masukan untuk penyempurnaan aplikasi dan strategi implementasi.

### 6.2 Gambaran Umum Hasil Kuesioner

Bagian ini menyampaikan bahwa secara umum aplikasi memperoleh penerimaan yang baik. Penyajian dilakukan dalam bentuk narasi ringkas yang menonjolkan pola umum, bukan daftar tanggapan satu per satu. Bila diperlukan, bagian ini dapat menampilkan beberapa contoh area yang paling diapresiasi, seperti AI, kemudahan digitalisasi proses, dan efisiensi pengolahan data risiko.

### 6.3 Permasalahan Saat Ini

Bagian ini akan mengelompokkan masalah ke dalam beberapa tema utama:

1. Belum tersedianya panduan penggunaan yang memadai
2. Alur pengisian dan penggunaan beberapa modul masih belum cukup jelas
3. Pengguna baru masih membutuhkan pendampingan implementasi
4. Beberapa fitur pelaporan, monitoring, dan dukungan pengguna masih perlu diperkuat
5. Tata kelola akses dan peran pengguna masih perlu dipertegas dalam implementasi

Masalah akan ditulis sebagai kondisi organisasi dan produk saat ini, bukan sebagai kritik personal terhadap pengguna atau tim pengembang.

### 6.4 Analisis dan Pemecahan Masalah

Untuk setiap masalah, pola penulisan yang digunakan adalah:

1. Kondisi saat ini
2. Dampak terhadap penggunaan dan adopsi aplikasi
3. Pemecahan masalah yang disarankan

Contoh arah analisis:

- Jika banyak pengguna meminta juknis dan video tutorial, maka akar masalah dibaca sebagai kebutuhan penguatan enablement, bukan semata kelemahan antarmuka.
- Jika beberapa pengguna masih bingung pada scoring, heatmap, mitigasi, atau laporan, maka solusi diarahkan pada kombinasi perbaikan UX, bantuan kontekstual, dan materi pelatihan.
- Jika ada harapan terhadap laporan formal, multi-user, helpdesk, atau chatbot, maka masukan tersebut diposisikan sebagai peluang pengembangan tahap berikutnya.

### 6.5 Roadmap Pengembangan Aplikasi

Roadmap akan dibagi dalam tiga horizon waktu agar realistis dan mudah ditindaklanjuti.

#### Jangka pendek (0-3 bulan)

Fokus:

1. Menyusun juknis, manual book, dan video tutorial
2. Menyederhanakan dan memperjelas alur penginputan
3. Menambahkan bantuan kontekstual pada fitur yang paling sering membingungkan
4. Menyiapkan skema sosialisasi, uji coba, dan dukungan awal pengguna

#### Jangka menengah (3-6 bulan)

Fokus:

1. Menyempurnakan modul laporan dan output formal
2. Memperkuat monitoring mitigasi dan visualisasi perkembangan risiko
3. Menata ulang peran pengguna dan skema kolaborasi per satker
4. Menyediakan mekanisme helpdesk atau kanal dukungan yang lebih responsif

#### Jangka panjang (6-12 bulan)

Fokus:

1. Mengembangkan asisten dalam aplikasi, termasuk bantuan AI atau chatbot
2. Memperluas analitik tren risiko lintas periode dan lintas unit
3. Mendorong integrasi data dan penguatan kematangan implementasi aplikasi
4. Membangun aplikasi sebagai platform manajemen risiko yang lebih stabil, terukur, dan berkelanjutan

### 6.6 Penutup

Bagian penutup menegaskan bahwa aplikasi Manris telah menunjukkan potensi dan penerimaan awal yang baik. Namun, agar implementasi berhasil secara luas, pengembangan aplikasi perlu berjalan beriringan dengan penguatan pemahaman pengguna, ketersediaan panduan, dan dukungan operasional yang memadai.

## 7. Prinsip Bahasa dan Gaya Penulisan

Dokumen akhir harus menggunakan bahasa Indonesia yang:

1. Formal tetapi tidak kaku
2. Mudah dipahami oleh pembaca nonteknis
3. Tetap cukup konkret untuk menjadi rujukan tim pengembang
4. Tidak berlebihan dalam klaim dan tetap berbasis pada pola masukan responden

Istilah teknis seperti AI, heatmap, mitigasi, monitoring, dan dashboard boleh digunakan, namun ditempatkan dalam kalimat yang mudah dipahami.

## 8. Batasan dan Keputusan Penulisan

1. Laporan akan menonjolkan pola umum hasil kuesioner, bukan mengutip semua jawaban responden.
2. Laporan tidak akan memasukkan statistik numerik rinci kecuali benar-benar diperlukan untuk memperkuat narasi.
3. Rekomendasi akan diprioritaskan pada tindakan yang realistis untuk implementasi aplikasi di lingkungan instansi.
4. Roadmap akan difokuskan pada pengembangan produk dan dukungan adopsi, bukan pada perubahan organisasi yang berada di luar cakupan aplikasi.

## 9. Kriteria Keberhasilan Dokumen

Dokumen akhir dianggap berhasil apabila:

1. Pimpinan dapat memahami kondisi umum, masalah utama, dan arah pengembangan tanpa harus membaca data mentah kuesioner.
2. Tim pengembang memperoleh daftar prioritas yang jelas untuk perbaikan produk.
3. Calon pengguna merasa bahwa masukan mereka diterjemahkan menjadi langkah tindak lanjut yang konkret.
4. Isi dokumen cukup formal untuk dijadikan bahan pelaporan internal atau bahan paparan lanjutan.

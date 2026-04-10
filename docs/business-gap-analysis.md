# Analisis Kesenjangan: Transformasi Digital Manajemen Risiko Ditjen P2P

## Ringkasan Eksekutif

Dokumen ini menganalisis kesenjangan antara kondisi saat ini (As-Is) dan kondisi yang diharapkan (To-Be) dalam implementasi manajemen risiko di Direktorat Jenderal Pencegahan dan Pengendalian Penyakit (Ditjen P2P). Kondisi saat ini menunjukkan proses yang masih manual, tersebar, dan kurang transparan, sementara Manris v2 dirancang sebagai solusi berbasis standar ISO 31000:2018 untuk mengatasi kesenjangan tersebut.

Analisis ini menjadi dasar pemahaman mengapa digitalisasi manajemen risiko menjadi kebutuhan strategis untuk meningkatkan akuntabilitas, transparansi, dan kecepatan pengambilan keputusan berbasis risiko di lingkungan Kementerian Kesehatan.

---

## Ruang Lingkup (Scope)

Dokumen ini secara spesifik menganalisis kesenjangan pada modul-modul berikut:

**Termasuk dalam Analisis:**
- Siklus Manajemen Risiko berbasis ISO 31000:2018 (Identifikasi, Analisis, Evaluasi, Perlakuan, Pemantauan)
- Executive Dashboard dan visualisasi risiko real-time
- Alur persetujuan digital (Approval Workflow)
- Suite Kecerdasan Buatan untuk analisis risiko

**Tidak Termasuk dalam Analisis:**
- **KRI (Key Risk Indicators)** - Modul pemantauan indikator risiko kunci
- **Incident Management** - Modul pencatatan dan penanganan insiden
- **CBA (Cost-Benefit Analysis)** - Modul analisis biaya-manfaat

Ketiga modul di atas merupakan bagian dari sistem Manris v2 secara keseluruhan namun sengaja dikecualikan dari analisis kesenjangan ini untuk menjaga fokus pada transformasi inti manajemen risiko.

---

## Kondisi Saat Ini (As-Is State)

### 1. Data Terfragmentasi dan Tidak Terstandardisasi

Proses manajemen risiko saat ini masih mengandalkan berbagai spreadsheet (Microsoft Excel) yang tersebar di masing-masing unit kerja. Setiap unit memiliki format berbeda untuk mencatat risiko, menyebabkan:
- Sulitnya konsolidasi data risiko secara nasional
- Inkonsistensi dalam penilaian tingkat risiko antar unit
- Risiko kehilangan data akibat file yang dikelola secara lokal
- Tidak adanya audit trail untuk perubahan data risiko

### 2. Siklus Penilaian Manual yang Kaku

Reviu risiko dilakukan secara periodik dengan siklus yang terbatas:
- Penilaian risiko hanya dilakukan satu atau dua kali dalam setahun (per semester)
- Proses reviu bersifat ad-hoc dan bergantung pada fasilitator eksternal
- Tidak ada mekanisme untuk memantau perubahan risiko secara dinamis
- Ketergantungan pada meeting tatap muka untuk identifikasi dan diskusi risiko

### 3. Kurangnya Visibilitas Real-Time untuk Pimpinan

Pimpinan (Eselon dan Direksi) menghadapi keterbatasan dalam memantau profil risiko organisasi:
- Tidak ada dashboard real-time yang menampilkan posisi risiko keseluruhan
- Laporan risiko disusun secara manual dan membutuhkan waktu berminggu-minggu
- Sulitnya melakukan deteksi dini terhadap risiko yang memerlukan perhatian khusus
- Tidak adanya heatmap visual untuk memahami distribusi risiko secara cepat

### 4. Proses Persetujuan Konvensional yang Lambat

Alur persetujuan risiko masih mengandalkan proses konvensional:
- Dokumen risiko diedarkan dalam bentuk fisik atau email berantai
- Tanda tangan persetujuan membutuhkan waktu yang tidak terprediksi
- Tidak ada sistem tracking untuk memantau status persetujuan
- Potensi dokumen tertinggal atau terjadi bottleneck pada level tertentu

### 5. Analisis Risiko yang Kurang Mendalam

Identifikasi dan analisis risiko seringkali bersifat repetitif dan kurang tajam:
- Analisis akar masalah (root cause analysis) dilakukan secara manual tanpa framework standar
- Ketergantungan pada keahlian individu dalam melakukan analisis fishbone
- Tidak adanya rekomendasi mitigasi yang terstruktur berdasarkan analisis akar masalah
- Kurangnya sistematisasi dalam mendokumentasikan lessons learned dari risiko yang telah ditangani

---

## Kondisi Harapan (To-Be State)

Manris v2 dirancang untuk mengatasi kesenjangan di atas melalui digitalisasi komprehensif berbasis standar ISO 31000:2018. Berikut adalah kondisi yang diharapkan setelah implementasi:

### 1. Formulir Risiko Digital 5 Bagian Berbasis ISO 31000

Setiap risiko dicatat dalam formulir digital yang terstruktur dengan 5 bagian utama:
- **Bagian 1 - Identifikasi**: Kode risiko, judul, deskripsi, penyebab, sumber risiko, kontrollabilitas, dan dampak
- **Bagian 2 - Analisis**: Kontrol yang ada, efektivitas kontrol, probabilitas (1-5), dampak (1-5), bobot, skor inheren, dan level risiko
- **Bagian 3 - Evaluasi**: Prioritas risiko, appetite risiko, dan opsi perlakuan (Hindari, Kurangi, Alihkan, Terima)
- **Bagian 4 - Rencana Perlakuan**: Tindakan mitigasi, penanggung jawab (PIC), tenggat waktu, frekuensi, dan estimasi biaya
- **Bagian 5 - Residual Target**: Target probabilitas, dampak, bobot, skor, dan level risiko setelah mitigasi

Format standar ini memastikan konsistensi data risiko di seluruh unit kerja Ditjen P2P.

### 2. Executive Dashboard Real-Time dengan Heatmap 5x5

Pimpinan memiliki akses ke dashboard yang menampilkan:
- **4 KPI Cards**: Total risiko, risiko tinggi/ekstrem, mitigasi yang overdue, dan tren risiko
- **Heatmap 5x5**: Visualisasi grid Probabilitas × Dampak dengan pewarnaan level risiko (Sangat Rendah hingga Sangat Tinggi)
- **Top Risks**: Daftar risiko dengan skor tertinggi yang memerlukan perhatian segera
- **Risk Trend Chart**: Grafik tren komposisi risiko per periode untuk analisis historis

Dashboard ini memberikan visibilitas real-time dan memungkinkan pengambilan keputusan berbasis data.

### 3. Alur Persetujuan Digital Berjenjang

Proses persetujuan risiko diotomatisasi dengan alur berjenjang:
- **Unit Kerja** mengisi dan memfinalisasi formulir risiko
- **Reviewer** (Tim Kerja Manajemen Risiko) melakukan review dan memberikan penilaian
- **Pimpinan** (Eselon/Direksi) memberikan persetujuan final dengan opsi Approve/Reject

Sistem mencatat setiap langkah persetujuan secara digital lengkap dengan timestamp dan komentar, menciptakan audit trail yang transparan.

### 4. Pemantauan Otomatis dengan Matriks Eskalasi

Sistem memantau progres mitigasi secara otomatis dengan matriks eskalasi:
- **H-7 s/d H**: Sistem mengirimkan reminder kepada PIC Unit Kerja
- **H+1 s/d H+3**: Status berubah menjadi merah (overdue ringan), notifikasi ke Kepala Unit
- **H+7+**: Eskalasi ke Tim Monev Pusat untuk penanganan lebih lanjut

Mekanisme ini memastikan tidak ada mitigasi yang tertinggal tanpa tindak lanjut.

### 5. Kecerdasan Buatan untuk Analisis Mendalam

Suite AI meningkatkan kualitas analisis risiko melalui:
- **Fishbone Generator**: Analisis akar masalah otomatis dengan framework 5 kategori (Manusia, Metode, Mesin, Material, Lingkungan)
- **Smart Mitigation**: Rekomendasi tindakan mitigasi yang terstruktur berdasarkan root cause yang teridentifikasi
- **Transcript Analyzer**: Ekstraksi risiko dan action items dari transkrip rapat secara otomatis
- **Predictive Scoring**: Prediksi tren level risiko masa depan berdasarkan data historis
- **Meeting Minutes Generator**: Transformasi transkrip rapat menjadi notulensi terstruktur dengan action items

Kecerdasan buatan ini mengurangi ketergantungan pada fasilitator eksternal dan meningkatkan konsistensi analisis.

### 6. Role-Based Access Control (RBAC) dengan Isolasi Data

Sistem mengimplementasikan 4 level akses yang berbeda:
- **Super Admin**: Akses penuh ke seluruh sistem dan data
- **Unit Kerja**: Hanya dapat melihat dan mengelola data unit sendiri (silo)
- **Reviewer**: Akses global ke semua unit untuk keperluan review dan monitoring
- **Pimpinan**: Akses global dengan view strategis untuk pengambilan keputusan

RBAC memastikan keamanan data sekaligus memfasilitasi kolaborasi lintas unit.

---

## Matriks Analisis Kesenjangan (Gap Analysis Matrix)

| Area Kapabilitas | Kondisi As-Is | Kondisi To-Be | Tingkat Kesenjangan | Fitur Solusi Manris v2 |
|------------------|---------------|---------------|---------------------|------------------------|
| **Standardisasi Data Risiko** | Data tersebar di spreadsheet Excel dengan format berbeda-beda antar unit | Data tersentralisasi dalam formulir digital standar ISO 31000 dengan 5 bagian terstruktur | Tinggi | Formulir Risiko Digital 5 Bagian |
| **Visibilitas Profil Risiko** | Tidak ada dashboard real-time; laporan manual membutuhkan waktu berminggu-minggu | Dashboard real-time dengan Heatmap 5×5, KPI Cards, dan Trend Chart yang dapat diakses kapan saja | Tinggi | Executive Dashboard Real-Time |
| **Alur Persetujuan** | Proses berbasis dokumen fisik/email dengan tracking manual dan bottleneck tidak terprediksi | Alur digital berjenjang (Unit → Reviewer → Pimpinan) dengan tracking otomatis dan audit trail lengkap | Sedang | Approval Workflow System |
| **Monitoring Mitigasi** | Pemantauan manual tanpa reminder; risiko mitigasi overdue tidak terdeteksi | Pemantauan otomatis dengan matriks eskalasi (H-7, H+3, H+7+) dan notifikasi proaktif | Tinggi | Automated Escalation Matrix |
| **Analisis Akar Masalah** | Analisis manual tanpa framework standar; ketergantungan pada fasilitator | Analisis otomatis dengan Fishbone Generator 5 kategori dan rekomendasi mitigasi cerdas | Sedang | AI Intelligence Suite |
| **Lessons Learned** | Pengetahuan tersimpan di dokumen terpisah; sulit diakses unit lain | Repositori terpusat yang dapat dicari dan diakses lintas unit | Sedang | Lessons Learned Repository |

---

## Kesimpulan

Analisis kesenjangan ini menunjukkan bahwa transformasi digital manajemen risiko melalui Manris v2 bukan sekadar modernisasi teknologi, tetapi merupakan kebutuhan strategis untuk mengatasi fundamental gaps dalam praktik manajemen risiko saat ini.

Tiga nilai tambah utama yang dihasilkan:

**1. Akuntabilitas**: Dengan audit trail digital yang lengkap dan alur persetujuan yang terstruktur, setiap tindakan dalam siklus manajemen risiko dapat ditelusuri dan dipertanggungjawabkan.

**2. Transparansi**: Executive Dashboard memberikan visibilitas real-time kepada pimpinan, memungkinkan deteksi dini dan pengambilan keputusan yang lebih cepat dan berbasis data.

**3. Efisiensi**: Otomatisasi pemantauan mitigasi dan analisis akar masalah dengan AI mengurangi beban kerja manual serta meningkatkan konsistensi dan kualitas analisis risiko.

Implementasi Manris v2 akan membawa Ditjen P2P dari kondisi manajemen risiko yang manual dan fragmentasi menuju praktik manajemen risiko berbasis standar internasional yang terintegrasi, transparan, dan proaktif.

---

*Dokumen ini disusun sebagai landasan pemahaman transformasi digital manajemen risiko berbasis standar ISO 31000:2018.*

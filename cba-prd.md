# 📄 Product Requirements Document (PRD)
**Nama Fitur:** Modul Advokasi & Analisis Ekonomi Kesehatan (CBA) Terintegrasi AI
**Produk Induk:** Sistem Manajemen Risiko P2P Kemenkes
**Status:** *Draft* (Fase 1)
**Target Rilis:** Q3/Q4 2026

## 1. Ringkasan Eksekutif (*Executive Summary*)
Sebagian besar program pencegahan penyakit di daerah (seperti eliminasi Malaria, STBM, atau pencegahan keracunan pangan MBG) gagal mendapat alokasi anggaran karena pimpinan daerah melihatnya sebagai "beban biaya" (*cost center*), bukan investasi pencegahan kerugian. 
Fitur ini mengadaptasi filosofi proyek TARA (otomatisasi penilaian kelayakan) ke dalam sektor kesehatan. Modul ini memungkinkan petugas P2P untuk dengan cepat mengubah data risiko lapangan (Excel/PDF) menjadi *Dashboard* Advokasi Ekonomi berbasis AI, yang menghitung *Cost of Inaction* (Kerugian jika diam) vs *Cost of Action* (Biaya Intervensi) menggunakan standar Evaluasi Ekonomi Kesehatan WHO dan Kemenkes.

## 2. Tujuan & Metrik Kesuksesan (*Objectives & KPIs*)
* **Tujuan Utama:** Membekali petugas kesehatan dengan alat advokasi berbasis data finansial (*Return on Investment* kesehatan) untuk meyakinkan pembuat kebijakan (Gubernur/Bupati/Bappeda).
* **Metrik Kesuksesan (KPI):**
  * Waktu pembuatan laporan CBA turun dari hitungan minggu menjadi < 15 menit per skenario risiko.
  * Tingkat adopsi fitur *AI Variable Recommender* oleh pengguna > 80% (mengurangi *input* manual dari nol).
  * Pengguna dapat mengunggah dan mengekstrak data dari minimal 1 format *file unstructured* (PDF/Excel) dengan akurasi OCR > 90%.

## 3. Target Pengguna (*User Personas*)
| Persona | Peran & Masalah | Kebutuhan Utama dari Fitur |
| :--- | :--- | :--- |
| **Petugas P2P Daerah / Dinkes** | Sering kesulitan merumuskan proposal anggaran yang "berbunyi" secara ekonomi. Kesulitan menginput data mentah ke sistem baru. | Kemudahan *upload* laporan lama (Excel/PDF), rekomendasi variabel biaya otomatis dari AI, dan antarmuka yang simpel. |
| **Pimpinan Daerah / Bappeda** | Tidak paham istilah medis. Butuh justifikasi kuat mengapa dana APBD harus dicairkan untuk program P2P. | *Dashboard* visual yang interaktif, angka kerugian Rupiah yang besar, dan simulasi dampak anggaran (*Stress-testing*). |

## 4. Cerita Pengguna (*User Stories*)
* **Sebagai Petugas P2P,** saya ingin mengunggah laporan rekap kasus malaria bentuk PDF/Excel, sehingga saya tidak perlu mengetik ulang data *baseline* populasi dan kasus secara manual.
* **Sebagai Petugas P2P,** saya ingin AI merekomendasikan variabel biaya tersembunyi (seperti kerugian hari kerja atau biaya operasional darurat) saat saya mengetik "Risiko Keracunan MBG", sehingga kalkulasi CBA saya komprehensif dan sesuai standar WHO/PTK.
* **Sebagai Pimpinan Bappeda,** saya ingin melihat grafik perbandingan antara "Anggaran yang Diminta" dengan "Kerugian Daerah yang Berhasil Dicegah", sehingga saya bisa menyetujui anggaran dengan keyakinan penuh.

## 5. Kebutuhan Fungsional (*Functional Requirements*)

### Fungsionalitas 1: *AI Variable Recommender* (Fitur Inti)
* Sistem menyediakan *text-box* agar pengguna dapat mendeskripsikan risiko (contoh: "Potensi KLB TB Resisten Obat").
* Sistem memanggil API LLM (Gemini/Claude) dengan *System Prompt* yang mewajibkan penggunaan *framework* Evaluasi Ekonomi Kesehatan (Perspektif Sosial).
* AI mengembalikan daftar *checklist* variabel yang dikelompokkan menjadi 3 kategori: Biaya Medis, Biaya Operasional/Respons, dan Biaya Produktivitas Sosial.
* **Human-in-the-Loop:** Pengguna HARUS menyetujui (*check/uncheck*) variabel AI tersebut, dan dapat menambahkan variabel manual sebelum masuk ke tahap kalkulasi.

### Fungsionalitas 2: *Unstructured Data Ingestion* (Otomatisasi Input)
* Sistem menyediakan area *drag-and-drop* untuk *file* Excel (.xlsx), PDF, atau Gambar (.jpg/.png).
* Modul *AI Vision / OCR* membaca dokumen untuk mengekstrak 3 data kunci: Nama Daerah, Populasi Rentan/Jumlah Kasus, dan Anggaran Eksisting.
* Sistem menampilkan layar **Validasi Data** (*Preview*) agar pengguna dapat mengoreksi hasil bacaan AI sebelum data dikunci.

### Fungsionalitas 3: Mesin Kalkulator & *Dashboard* Advokasi
* Sistem menyajikan *form* dinamis berdasarkan variabel yang disetujui di Fungsionalitas 1.
* Sistem memiliki nilai *default* (bawaan) yang ditarik dari *database* statis Kemenkes (seperti rata-rata UMK daerah untuk menghitung hilangnya produktivitas, atau tarif rata-rata klaim INA-CBG's).
* Menghasilkan *Output* Visual seketika:
  * **Kartu KPI Utama:** *Net Economic Benefit* (Hijau jika rasio positif, Merah jika negatif).
  * **Grafik Batang Komparatif:** *Cost of Inaction* (Kerugian) vs *Cost of Action* (Biaya Program).
  * **Slider Sensitivitas:** Pengguna dapat menggeser variabel "Efektivitas Program" atau "Cakupan Populasi" dan melihat perubahan angka kerugian secara *real-time*.

## 6. Kebutuhan Non-Fungsional (*Non-Functional Requirements*)
* **Transparansi & Auditabilitas:** Setiap variabel yang dihasilkan oleh AI atau menggunakan nilai *default* sistem harus memiliki *tooltip* (tanda tanya kecil) yang menjelaskan dari mana standar asumsi tersebut berasal (misal: "Asumsi nilai produktivitas harian berdasarkan data UMK BPS 2025").
* **Privasi Data:** Data laporan PDF/Excel yang diunggah ke sistem untuk diekstrak oleh AI **tidak boleh** digunakan untuk melatih (*training*) model bahasa eksternal. Harus menggunakan arsitektur *Zero-Data Retention* pada API LLM.
* **Performa:** Waktu tunggu dari mengunggah dokumen (Fungsionalitas 2) hingga ekstraksi data selesai tidak boleh melebihi 15 detik.
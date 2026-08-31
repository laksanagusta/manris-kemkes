# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD) — Manris 

**Nama Produk:** Manris  — AI-Driven Risk & Incident Management SaaS  
**Konteks:** Lingkungan Kementerian (Ditjen Penanggulangan Penyakit) / Proyek Aktualisasi Latsar CPNS  
**Tanggal:** 10 Maret 2026

---

## 1. Ringkasan Eksekutif & Visi

Platform SaaS untuk **mendigitalisasi seluruh siklus manajemen risiko dan pelaporan insiden** yang selama ini berjalan lambat karena proses manual dan tersebar di berbagai spreadsheet.

**Keunggulan Utama:**
- Proses manajemen risiko end-to-end berbasis **ISO 31000:2018**
- Integrasi **kecerdasan buatan (AI)** untuk analisis akar masalah, prediksi tren, dan ekstraksi dokumen otomatis
- **Role-Based Access Control** 4-level dengan visibilitas data terisolasi per unit
- **Executive Dashboard** real-time dengan Risk Heatmap 5×5
- Sistem **eskalasi otomatis** untuk mitigasi yang melewati tenggat waktu

---

## 2. Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Backend** | Golang + Fiber framework |
| **Database** | PostgreSQL (SQL migrations) |
| **Frontend** | Next.js 16 (React) + TailwindCSS v4 + shadcn/ui |
| **AI Service** | Integrasi API LLM |
| **Auth** | JWT (JSON Web Token) |
| **Report** | Excelize (spreadsheet generator) |

---

## 3. Role-Based Access Control (RBAC)

### 3.1 User Roles

| Role | Deskripsi | Visibilitas Data |
|------|-----------|------------------|
| **Super Admin** | Administrator sistem penuh | Global — semua data |
| **Unit Kerja** | Staf pelaksana & Kepala Unit | Hanya data unit sendiri (silo) |
| **Reviewer** | Tim Kerja Manajemen Risiko & Monev | Global — semua unit |
| **Pimpinan** | Eselon / Direksi / Pimpinan Puncak | Global — strategic view |

### 3.2 Matriks Akses Halaman

| Halaman | Super Admin | Unit | Reviewer | Pimpinan |
|---------|:-----------:|:----:|:--------:|:--------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Inbox Persetujuan | ✅ | ❌ | ❌ | ✅ |
| Risk Assessments | ✅ | ✅ | ✅ | ✅ |
| Control Library | ✅ | ✅ | ✅ | ❌ |
| Monitoring & Review | ✅ | ✅ | ✅ | ✅ |
| Lessons Learned | ✅ | ✅ | ✅ | ✅ |
| Reports & Extract | ✅ | ✅ | ✅ | ✅ |
| Incident Register | ✅ | ✅ | ❌ | ❌ |
| AI Tools (3 halaman) | ✅ | ✅ | ✅ | ✅ |
| Management (Users & Criteria) | ✅ | ❌ | ❌ | ❌ |

---

## 4. Fitur-Fitur Utama

---

### 4.1 🔐 Autentikasi & Manajemen Sesi

Sistem login menggunakan **username atau email** dengan password. Setelah login berhasil, sistem menghasilkan JWT token yang menyimpan informasi user (nama, role, unit). Token ini digunakan untuk otorisasi di semua halaman dan API.

**Halaman:** `/login`

---

### 4.2 📊 Executive Dashboard

Dashboard real-time yang menampilkan gambaran keseluruhan kondisi risiko organisasi.

**Komponen:**
- **4 KPI Cards:**
  - Total Risiko yang terdaftar
  - Jumlah Risiko Tinggi & Ekstrem
  - Jumlah Mitigasi Overdue (terlambat)
  - Jumlah Insiden Bulan Ini
- **Risk Heatmap 5×5:** Grid interaktif Probabilitas (1–5) × Dampak (1–5) yang menampilkan jumlah risiko di setiap sel, diwarnai berdasarkan level (Rendah/Sedang/Tinggi/Ekstrem)
- **Top Risks:** Daftar risiko dengan skor tertinggi
- **Risk Trend Chart:** Grafik tren komposisi risiko per periode (kuartalan) — menunjukkan apakah jumlah risiko tinggi/ekstrem cenderung naik atau turun

**Halaman:** `/dashboard`

---

### 4.3 ⚠️ Manajemen Risiko (Risk Register)

Modul inti untuk mendigitalisasi seluruh siklus manajemen risiko sesuai **ISO 31000:2018**. Form risiko terdiri dari 5 section yang mengikuti alur ISO:

#### Section 1 — Identifikasi Risiko
- **Kode Risiko** (e.g., R-001)
- **Judul & Deskripsi** kejadian risiko
- **Penyebab Risiko** (cause analysis)
- **Sumber Risiko** (internal/eksternal)
- **Controllability** — Apakah risiko bisa dikendalikan (Controllable) atau tidak (Uncontrollable)
- **Uraian Dampak** — Deskripsi naratif dampak potensial

#### Section 2 — Analisis Risiko
- **Pengendalian yang Sudah Ada** (existing control)
- **Efektivitas Pengendalian** — Efektif atau Tidak Efektif
- **Probabilitas** (skala 1–5)
- **Dampak** (skala 1–5)
- **Bobot** — Weighted factor
- **Inherent Score** = Probabilitas × Dampak
- **Level Risiko** — Otomatis dihitung: Rendah / Sedang / Tinggi / Ekstrem

#### Section 3 — Evaluasi Risiko
- **Prioritas Risiko** (ranking)
- **Risk Appetite** — Batas selera risiko organisasi
- **Opsi Perlakuan Risiko** — Avoid (Hindari), Mitigate (Kurangi), Transfer (Alihkan), atau Accept (Terima)

#### Section 4 — Rencana Penanganan Risiko (RPR)
- **Rencana Tindak Lanjut** — Apa yang akan dilakukan
- **PIC Mitigasi** — Siapa yang bertanggung jawab
- **Tenggat Waktu** — Deadline penyelesaian
- **Frekuensi:**
  - *Insidental* — Satu kali jalan
  - *Rutin* — Berulang (Harian / Mingguan / Bulanan)
- **Target Biaya** — Estimasi biaya mitigasi

#### Section 5 — Target Penurunan Risiko (Residual Risk)
- **Target Probabilitas** (1–5)
- **Target Dampak** (1–5)
- **Target Bobot & Skor** — Otomatis dihitung
- **Target Level** — Level risiko yang diharapkan setelah mitigasi

#### Fitur Tambahan:
- **Draft System:** Risiko bisa disimpan sebagai draft (hanya judul + deskripsi) untuk dilengkapi nanti
- **Finalisasi:** Draft bisa di-finalize menjadi status "final"
- **Risk Owner & Control Owner:** Penugasan PIC pemilik risiko dan pemilik kontrol
- **Lampiran Fishbone:** Hasil analisis AI Fishbone bisa dilampirkan langsung ke risiko
- **Jadwal Review Berikutnya** (`nextReviewDate`) untuk periodic review

**Halaman:**
- `/risk/register` — Tabel daftar semua risiko (filterable by unit)
- `/risk/new` — Form wizard pembuatan risiko baru (multi-section)
- `/risk/register/:id` — Detail & edit risiko

---

### 4.4 ✅ Approval Workflow (Inbox Persetujuan)

Alur persetujuan berjenjang untuk risiko yang sudah di-finalize:

1. **Unit Kerja** membuat dan memfinalisasi risiko
2. Risiko masuk ke **Inbox Persetujuan** Pimpinan
3. Pimpinan bisa:
   - **Approve** — Menyetujui risiko
   - **Reject** — Menolak dengan catatan

**Halaman:** `/inbox` (hanya untuk Pimpinan & Super Admin)

---

### 4.5 📌 Risk Versioning (Riwayat Perubahan)

Sistem snapshot periodik yang merekam keseluruhan state risiko pada satu titik waktu tertentu (misalnya per kuartal: "2025-Q1", "2025-Q2"). Berguna untuk:
- Melihat bagaimana risiko berevolusi dari waktu ke waktu
- Audit trail dan compliance
- Perbandingan antar-periode

**Halaman:** `/risk/history`

---

### 4.6 🚨 Manajemen Insiden (Incident Register)

Quick Incident Report untuk pelaporan kejadian di lapangan menggunakan formula **5W1H**:

- **What** — Apa yang terjadi
- **Who** — Siapa yang terlibat
- **When** — Kapan terjadi
- **Where** — Di mana terjadi
- **Why** — Mengapa terjadi
- **How** — Bagaimana itu bisa terjadi

Dilengkapi dengan:
- **CAPA (Corrective & Preventive Action):**
  - Tindakan Korektif — Perbaikan langsung
  - Tindakan Preventif — Pencegahan agar tidak terulang
  - PIC dan Target Date
- **Risk Linkage:** Setiap insiden bisa di-link ke risiko yang sudah ada, sehingga insiden memperkuat data analisis risiko tersebut

**Halaman:**
- `/incident` — Daftar insiden
- `/incident/new` — Form pelaporan insiden baru

---

---

### 4.8 🛡️ Control Library & Testing

Pustaka pengendalian/kontrol yang dikelola per unit kerja, dilengkapi dengan pencatatan hasil testing efektivitasnya.

**Control Library:**
- Nama & deskripsi kontrol
- PIC kontrol (owner)
- Frekuensi pelaksanaan kontrol

**Control Testing:**
- Tanggal testing
- Siapa yang melakukan testing
- Hasil testing (efektif / tidak efektif)
- Temuan defisiensi

**Halaman:** `/controls` — Control Library dengan nested testing records

---

### 4.9 📊 Mitigation Progress Tracking

Pencatatan progress implementasi rencana mitigasi untuk setiap risiko.

**Setiap entry progress berisi:**
- Tanggal progress
- **Persentase penyelesaian** (0–100%)
- **Biaya aktual** yang sudah dikeluarkan (vs target biaya di rencana mitigasi)
- **Link bukti/evidence** — URL atau path dokumen pendukung
- Catatan tambahan
- Siapa yang melaporkan

**Ditampilkan:** Sebagai bagian dari detail risiko, menunjukkan timeline progress menuju 100%.

---

### 4.10 ✅ Residual Risk Acceptance

Pencatatan formal penerimaan risiko residual (sisa risiko setelah mitigasi) oleh pejabat berwenang.

**Setiap acceptance record berisi:**
- Siapa yang menerima (user yang bertanggung jawab)
- **Justifikasi** — Alasan mengapa risiko residual diterima
- Timestamp penerimaan

Fitur ini penting untuk **governance & accountability** — memastikan ada jejak tertulis bahwa seseorang secara sadar menerima risiko yang tersisa.

---

### 4.11 💬 Communication & Consultation Log

Log pencatatan komunikasi dan konsultasi terkait risiko tertentu. Sesuai dengan prinsip ISO 31000 bahwa **Communication & Consultation** harus berjalan paralel di semua tahapan manajemen risiko.

**Setiap log berisi:**
- Tanggal komunikasi
- Metode (email, rapat, telepon, dsb.)
- Dengan siapa (stakeholder)
- Catatan hasil komunikasi

**Ditampilkan:** Sebagai tab/section di halaman detail risiko.

---

### 4.12 📚 Lessons Learned Repository

Repository terpusat untuk mencatat pembelajaran berharga dari risiko atau insiden yang telah terjadi.

**Setiap lessons learned berisi:**
- Sumber (dari Risiko atau Insiden tertentu)
- Judul & deskripsi pembelajaran
- **Faktor Keberhasilan** — Apa yang berhasil dilakukan
- **Faktor Kegagalan** — Apa yang tidak berjalan baik
- **Rekomendasi** — Saran untuk masa depan
- Tags untuk kategorisasi

**Tujuan:** Membangun knowledge base organisasi agar kesalahan yang sama tidak terulang dan praktik baik bisa direplikasi.

**Halaman:** `/lessons` — Repository Lessons Learned (CRUD lengkap)

---

### 4.13 🔍 Monitoring & Review (Overdue Monitoring)

Halaman monitoring yang menampilkan semua rencana mitigasi yang sudah melewati tenggat waktu (**overdue**).

**Informasi per item overdue:**
- Kode & judul risiko
- Unit kerja & PIC mitigasi
- Tanggal jatuh tempo
- **Jumlah hari keterlambatan**
- Level risiko
- **Tier eskalasi** — Menunjukkan tingkat keparahan keterlambatan

**Matriks Eskalasi Otomatis:**

| Tahap | Timeframe | Aksi |
|-------|-----------|------|
| **Reminder** | H-7 s.d. Hari H | Reminder ke PIC Unit Kerja |
| **Overdue Ringan** | H+1 s.d. H+3 | Status merah, notifikasi ke Kepala Unit |
| **Overdue Berat** | H+7 ke atas | Eskalasi ke Tim Monev pusat dengan deep link ke form |

**Halaman:** `/monitoring/overdue`

---

### 4.14 📑 Reports & Export

Fitur untuk menghasilkan laporan dan export data:

- **Export Risk Register CSV/Excel** — Download rekapitulasi seluruh risiko dalam format spreadsheet
- **Risk Trend Report** — Grafik tren komposisi risiko per periode (tersedia juga di Dashboard)

**Halaman:** `/reports`

---

### 4.15 ⚙️ Management — User Management

Halaman khusus Super Admin untuk mengelola pengguna sistem:

- **Buat user baru** dengan nama, role, organisasi, username, email, dan password
- **Lihat daftar user** beserta role dan organisasinya
- **Organisasi Management** — Mengelola hierarki organisasi (Direktorat Jenderal → Direktorat)

**Halaman:** `/management/users`

---

### 4.16 ⚙️ Management — Scope, Context & Criteria

Halaman khusus Super Admin untuk mengonfigurasi parameter dasar manajemen risiko sesuai **ISO 31000 Step 1 (Scope, Context, Criteria)**:

- **Objek & Ruang Lingkup** — Jenis dan nama objek yang dikelola risikonya
- **Pernyataan Ruang Lingkup** (Scope Statement)
- **Konteks Internal & Eksternal** — Faktor-faktor lingkungan organisasi
- **Risk Appetite** — Batas selera risiko yang bisa diterima
- **Risk Tolerance** — Batas toleransi penyimpangan dari appetite
- **Skala Probabilitas** — Definisi skala 1–5 (masing-masing level beserta deskripsinya)
- **Skala Dampak** — Definisi skala 1–5 (masing-masing level beserta deskripsinya)

Parameter ini menjadi "fondasi" untuk seluruh proses manajemen risiko di organisasi.

**Halaman:** `/management/criteria`

---

### 4.17 📝 Audit Trail

Sistem pencatatan otomatis setiap perubahan data di sistem:

- **Apa yang berubah** — Jenis entitas (risiko, insiden, dll.) dan ID-nya
- **Jenis aksi** — CREATE, UPDATE, atau DELETE
- **State sebelum & sesudah** — Snapshot data sebelum dan sesudah perubahan
- **Siapa yang melakukan**
- **Kapan**

Audit trail berjalan di background tanpa perlu intervensi user. Berguna untuk compliance, investigasi, dan akuntabilitas.

---

## 5. Modul AI-Driven (Advanced)

Semua fitur AI menggunakan integrasi Large Language Model (LLM) yang menerima prompt terstruktur dan menghasilkan output yang langsung actionable.

---

### 5.1 🐟 AI Root Cause Analysis (Fishbone / Ishikawa Generator)

AI membaca deskripsi masalah/risiko/insiden dan secara **otomatis menghasilkan Diagram Ishikawa** yang memecah akar masalah ke dalam 5 kategori:

| Kategori | Deskripsi |
|----------|-----------|
| 🧑 **Manusia** | Faktor SDM (kompetensi, kelalaian, dsb.) |
| 📋 **Metode** | Faktor prosedur/SOP |
| 🖥️ **Mesin** | Faktor teknologi/infrastruktur |
| 📦 **Material** | Faktor bahan/data/dokumen |
| 🌍 **Lingkungan** | Faktor lingkungan kerja/regulasi |

**Alur Penggunaan:**
1. User mengetik atau paste deskripsi masalah
2. Klik "Generate Fishbone"
3. AI menghasilkan draf diagram dengan poin-poin penyebab di setiap kategori
4. User bisa mengedit, menambah, atau menghapus poin
5. Fishbone bisa dilampirkan langsung ke form pembuatan risiko

**Halaman:** `/ai/fishbone`

---

### 5.2 💡 AI Smart Mitigation Recommendations

Setelah Fishbone dihasilkan, user bisa **memilih salah satu root cause** dan AI akan memberikan rekomendasi rencana mitigasi yang relevan.

**Output:**
- Daftar saran tindakan mitigasi + alasan di balik setiap saran
- Tips umum penanganan

**Bisa dipanggil dari:** Halaman Fishbone + Form Risiko

---

### 5.3 📄 AI Transcript Analyzer (Ekstraksi Risiko dari Dokumen)

Fitur NLP yang **mengekstrak draf risiko dari teks transkrip/notulensi rapat**. AI membaca seluruh teks dan mengidentifikasi:

- **Risiko baru** yang perlu didaftarkan (ACTION: CREATE)
- **Risiko existing** yang perlu di-update berdasarkan pembahasan (ACTION: UPDATE)
- **Risiko** yang sebaiknya dihapus/tidak relevan lagi (ACTION: DELETE)

**Untuk setiap saran, AI menghasilkan:**
- Judul & deskripsi risiko yang disarankan
- Kutipan dari transkrip yang menjadi dasar saran
- Reasoning — Alasan mengapa AI menyarankan ini
- **Pre-filled fields:** AI mencoba mengisi semua field form risiko (kode, penyebab, sumber, probabilitas, dampak, rencana mitigasi, dll.)

**Alur:**
1. User paste transkrip rapat
2. Klik "Analyze"
3. AI menampilkan daftar saran (CREATE/UPDATE/DELETE)
4. User review setiap saran → Approve → Otomatis membuat draft risiko baru atau update risiko existing

**Halaman:** `/ai/transcript`

---

### 5.4 📊 AI Predictive Scoring

AI menganalisis data historis risiko dan memprediksi **tren level risiko di masa depan**.

**Output per risiko:**
- Level saat ini vs. Level prediksi
- Tren: **Naik** / **Turun** / **Stabil**
- **Confidence score** (0–100%) — Tingkat keyakinan prediksi
- Reasoning — Penjelasan mengapa AI memprediksi tren tersebut

Ditampilkan dalam bentuk tabel + ringkasan eksekutif di bagian atas.

**Halaman:** `/ai/predictive`

---

### 5.5 📝 AI Meeting Minutes Generator

AI mentransformasi **transkrip rapat mentah** menjadi **notulensi rapat terstruktur** secara otomatis.

**Output notulensi berisi:**
- **Judul rapat** (auto-generated)
- **Tanggal**
- **Daftar peserta**
- **Agenda pembahasan**
- **Ringkasan** rapat
- **Poin-poin diskusi**
- **Keputusan yang diambil**
- **Action Items** — Tabel tindak lanjut dengan:
  - Deskripsi tugas
  - PIC (Person In Charge)
  - Deadline
  - Prioritas (High / Medium / Low)
  - Catatan tambahan

**Fitur Penyimpanan:** Notulensi yang sudah di-generate bisa disimpan ke database dan diakses kembali kapan saja.

**Halaman:**
- `/ai/minutes` — Daftar notulensi tersimpan
- `/ai/minutes/:id` — Detail notulensi

---

### 5.6 🤖 AI Per-Field Generators (Inline AI Assistants)

Saat mengisi form pembuatan/edit risiko, setiap field yang kompleks memiliki tombol **"✨ AI Generate"** di sebelahnya. AI akan menghasilkan isi field berdasarkan konteks risiko yang sudah diisi.

**Field yang didukung:**

| Tombol AI | Input Context | Output |
|-----------|---------------|--------|
| Generate Impact | Deskripsi risiko | Uraian dampak terstruktur |
| Generate Existing Control | Deskripsi + Penyebab | Saran kontrol yang sudah ada |
| Generate Risk Source | Deskripsi risiko | Identifikasi sumber risiko |
| Generate Mitigation Action | Deskripsi + Penyebab + Dampak | Saran rencana mitigasi |

Ini mempercepat proses pengisian form secara drastis, terutama untuk user yang belum familiar dengan terminologi manajemen risiko.

---

## 6. Alur Kerja Berbasis ISO 31000:2018

Berikut mapping lengkap antara tahapan ISO 31000 dengan fitur MANRIS:

| Tahap ISO 31000 | Fitur MANRIS |
|------------------|-------------|
| **1. Scope, Context, Criteria** | Management → Scope Criteria (pengaturan skala, appetite, tolerance) |
| **2. Risk Identification** | Form Risiko Section 1 (kode, penyebab, sumber, controllability, dampak) |
| **3. Risk Analysis** | Form Risiko Section 2 (scoring: Probabilitas × Dampak → Level) |
| **4. Risk Evaluation** | Heatmap 5×5, Prioritas, Appetite, Treatment Option |
| **5. Risk Treatment** | Rencana Mitigasi (action, owner, due date, frequency, target cost) |
| **6. Monitoring & Review** | Overdue Monitoring, Periodic Review, Risk Versioning |
| **7. Communication & Consultation** | Communication Log per risiko |
| **8. Recording & Reporting** | Audit Trail, CSV Export, Risk Trend Reports, Lessons Learned |

---

## 7. Navigasi Aplikasi

```
📱 Sidebar (fixed)
│
├── 🏠 MAIN MENU
│   ├── Dashboard ─────────── Executive Dashboard (KPI, Heatmap, Trends)
│   ├── Inbox Persetujuan ─── Approval queue untuk Pimpinan
│   ├── Risk Assessments ──── Risk Register + CRUD
│   ├── Control Library ───── Pustaka kontrol + Testing
│   ├── Monitoring & Review ─ Overdue monitoring + eskalasi
│   ├── Lessons Learned ───── Repository pembelajaran
│   ├── Reports & Extract ─── Export dan laporan
│   └── Incident Register ─── Pelaporan insiden (5W1H + CAPA)
│
├── 🤖 AI TOOLS
│   ├── Transcript Analyzer ── Ekstraksi risiko dari transkrip rapat
│   ├── Meeting Minutes ────── Generator & repository notulensi
│   └── Predictive Scoring ─── Prediksi tren risiko
│
└── ⚙️ MANAGEMENT (Super Admin only)
    ├── Users ─────────────── Manajemen pengguna
    └── Scope Criteria ────── Parameter dasar manajemen risiko
```

---

## 8. Checklist Replikasi (Priority Order)

### Fase 1 — Foundation
- [ ] Setup backend (Golang + Fiber + PostgreSQL)
- [ ] Setup frontend (Next.js + TailwindCSS + shadcn/ui)
- [ ] Implementasi autentikasi (JWT login)
- [ ] Implementasi RBAC (4 roles + access matrix)
- [ ] Bangun navigation shell (sidebar + header)

### Fase 2 — Core Risk Management
- [ ] Form input risiko (5 section sesuai ISO 31000)
- [ ] Risk Register (listing + CRUD + draft system)
- [ ] Executive Dashboard (KPI + Heatmap + Trends)
- [ ] Monitoring & Review (overdue + eskalasi)

### Fase 3 — Supporting Modules
- [ ] Incident Register (5W1H + CAPA)
- [ ] Mitigation Progress Tracking
- [ ] Risk Versioning (periodic snapshots)
- [ ] Approval Workflow (Inbox Persetujuan)

### Fase 4 — Advanced ISO 31000 Compliance
- [ ] Control Library & Testing
- [ ] Communication & Consultation Log
- [ ] Residual Risk Acceptance
- [ ] Lessons Learned Repository
- [ ] Scope, Context & Criteria Management
- [ ] Audit Trail

### Fase 5 — AI Features
- [ ] AI Fishbone Generator (Root Cause Analysis)
- [ ] AI Smart Mitigation Recommendations
- [ ] AI Transcript Analyzer
- [ ] AI Predictive Scoring
- [ ] AI Meeting Minutes Generator
- [ ] AI Per-Field Generators (inline assistants)

### Fase 6 — Reports & Polish
- [ ] Export CSV/Excel
- [ ] Risk Trend Reports
- [ ] User Management (Super Admin)
- [ ] Organization Management

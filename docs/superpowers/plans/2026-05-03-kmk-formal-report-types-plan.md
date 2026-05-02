# KMK Formal Report Types Plan

> **For agentic workers:** Dokumen ini adalah plan dan spesifikasi konten untuk diferensiasi seluruh `formal report type` di Manris. Gunakan dokumen ini sebagai acuan sebelum memecah renderer, aggregator data, dan UI download/generate.

**Goal:** Menetapkan spesifikasi konten yang berbeda untuk setiap `formal report type` agar keluaran PDF tidak lagi memakai template yang sama, tetap konsisten dengan [kmk.md](/Users/dikalaksana/Engineering/manris-v2/kmk.md), dan tetap realistis terhadap data yang sudah tersedia di Manris.

**Architecture:** Setiap tipe laporan akan memakai kerangka PDF yang berbeda di layer renderer, dengan aggregator data formal report yang juga dibedakan per tipe. Semua laporan tetap berbagi fondasi metadata umum, tetapi section, tabel, indikator, dan narasi utama ditentukan oleh tujuan pelaporan yang dirujuk langsung dari KMK.

**Tech Stack:** Backend Go + Fiber + Clean Architecture + Maroto PDF renderer; Frontend Next.js + TypeScript untuk pemicu generate/download; referensi regulasi dari `kmk.md`.

---

## 1. Latar Belakang

Saat ini seluruh formal report di-generate lewat jalur yang sama:

- `GenerateFormalReportUseCase` menyimpan `reportType`, tetapi summary dan metadata yang dikumpulkan masih generik.
- `BuildKMKFormalReportData(...)` membentuk payload formal yang sama untuk semua tipe.
- `RenderFormal(...)` selalu merender urutan section yang sama tanpa `switch` per `reportType`.

Akibatnya, perbedaan antar laporan saat ini baru muncul di:

- label judul report;
- nama file PDF; dan
- metadata `reportType`.

Isi dokumen belum dibedakan sesuai tujuan pelaporan pada KMK.

## 2. Dasar KMK

Dokumen ini mengacu pada butir-butir berikut di [kmk.md](/Users/dikalaksana/Engineering/manris-v2/kmk.md):

- **Profil risiko tahunan**: [kmk.md:2813](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2813) sampai [kmk.md:2819](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2819)
- **Laporan penerapan manajemen risiko semesteran**: [kmk.md:2820](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2820) sampai [kmk.md:2835](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2835)
- **Laporan pengawasan manajemen risiko semesteran**: [kmk.md:2836](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2836) sampai [kmk.md:2844](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2844)
- **Pemantauan risiko berkala**: [kmk.md:2625](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2625) sampai [kmk.md:2692](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2692)
- **Rencana mitigasi risiko**: [kmk.md:2364](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2364) sampai [kmk.md:2423](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2423)
- **Keterkaitan dengan profil risiko periode sebelumnya**: [kmk.md:727](/Users/dikalaksana/Engineering/manris-v2/kmk.md:727) sampai [kmk.md:740](/Users/dikalaksana/Engineering/manris-v2/kmk.md:740)
- **TMPMR / penilaian maturitas**: [kmk.md:2708](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2708) sampai [kmk.md:2715](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2715)
- **Pencatatan dan pelaporan per tahap proses**: [kmk.md:2717](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2717) sampai [kmk.md:2801](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2801)

## 3. Prinsip Desain Report

Semua formal report harus mengikuti prinsip ini:

1. **Tiap report type punya tujuan tunggal yang jelas.**
2. **Report type menentukan isi utama**, bukan hanya judul.
3. **Data kosong harus ditampilkan eksplisit sebagai gap**, bukan membuat generator gagal.
4. **PDF harus bisa dibaca sebagai dokumen resmi**, bukan sekadar dump data.
5. **Setiap section harus punya dasar di KMK**, atau dinyatakan sebagai turunan operasional yang diperlukan untuk mewujudkan butir KMK.

## 4. Formal Report Types

### 4.1 `annual_risk_profile`

**Nama dokumen:** Profil Risiko Tahunan

**Dasar KMK:**

- [kmk.md:2813](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2813) sampai [kmk.md:2819](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2819)
- [kmk.md:727](/Users/dikalaksana/Engineering/manris-v2/kmk.md:727) sampai [kmk.md:740](/Users/dikalaksana/Engineering/manris-v2/kmk.md:740)
- [kmk.md:2759](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2759) sampai [kmk.md:2776](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2776)

**Tujuan dokumen:**

Menjadi dokumen tahunan yang merangkum risiko kunci organisasi, nilai risiko, prioritas, dan rencana mitigasi risiko pada tahun/periode berjalan.

**Section wajib:**

1. Sampul dan metadata organisasi/periode
2. Ringkasan eksekutif profil risiko
3. Daftar risiko kunci
4. Peringkat/nilai risiko
5. Prioritas risiko
6. Rencana mitigasi risiko
7. Keterkaitan dengan profil risiko periode sebelumnya
8. Lampiran distribusi kategori/heatmap

**Data Manris yang dipakai:**

- approved risks
- risk score inherent/residual/effective
- kategori risiko
- mitigations
- cycle comparison / previous cycle

**Konten yang harus ditekankan:**

- mana risiko kunci teratas;
- perubahan dibanding periode sebelumnya;
- risiko mana yang masih harus dimitigasi;
- rencana mitigasi beserta owner dan jadwal.

**Konten yang tidak wajib jadi fokus utama:**

- detail komunikasi-konsultasi;
- audit findings;
- TMPMR.

### 4.2 `semiannual_mr_implementation`

**Nama dokumen:** Laporan Penerapan Manajemen Risiko Semesteran

**Dasar KMK:**

- [kmk.md:2820](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2820) sampai [kmk.md:2835](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2835)
- [kmk.md:2752](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2752) sampai [kmk.md:2785](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2785)
- [kmk.md:2440](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2440) sampai [kmk.md:2692](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2692)

**Tujuan dokumen:**

Menjelaskan bagaimana proses manajemen risiko benar-benar diterapkan selama 6 bulan, mencakup seluruh tahap proses dan evidence pelaksanaannya.

**Section wajib:**

1. Sampul dan metadata organisasi/periode
2. Status umum penerapan MR semester berjalan
3. Komunikasi dan konsultasi
4. Lingkup, konteks, dan kriteria
5. Penilaian risiko
6. Perlakuan risiko
7. Pemantauan dan reviu
8. Pencatatan dan pelaporan
9. Ringkasan gap implementasi

**Data Manris yang dipakai:**

- risk charter
- risk objectives / sasaran
- risk register per cycle
- mitigations dan progress
- KRI dan KRI report
- meeting minutes / consultation evidence
- working papers / monitoring data
- approval/workflow records

**Konten yang harus ditekankan:**

- bukti bahwa setiap tahap proses MR berjalan;
- coverage implementasi per unit/per sasaran;
- progres mitigasi dan monitoring;
- area proses yang belum lengkap.

**Catatan desain:**

Laporan ini harus terasa seperti **laporan proses/implementasi**, bukan sekadar profil risiko ulang.

### 4.3 `semiannual_mr_supervision`

**Nama dokumen:** Laporan Pengawasan Manajemen Risiko Semesteran

**Dasar KMK:**

- [kmk.md:2836](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2836) sampai [kmk.md:2844](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2844)
- [kmk.md:2693](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2693) sampai [kmk.md:2715](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2715)
- [kmk.md:2777](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2777) sampai [kmk.md:2785](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2785)

**Tujuan dokumen:**

Menyajikan hasil pengawasan terhadap profil risiko, kualitas penerapan MR, permasalahan yang ditemukan, dan saran perbaikan untuk periode semester berjalan.

**Section wajib:**

1. Sampul dan metadata organisasi/periode
2. Ringkasan pengawasan
3. Profil risiko yang diawasi
4. Penilaian kualitas penerapan MR
5. Permasalahan manajemen risiko
6. Temuan pengawasan per area
7. Saran perbaikan manajemen risiko
8. Status tindak lanjut temuan sebelumnya

**Data Manris yang dipakai:**

- annual/semiannual risk profile snapshot
- approval bottlenecks
- overdue mitigations
- monitoring trends
- KRI breaches
- evidence completeness per tahap
- TMPMR jika tersedia sebagai indikator kualitas penerapan

**Konten yang harus ditekankan:**

- gap antara desain proses dan pelaksanaan aktual;
- masalah evidence/compliance;
- saran perbaikan yang actionable.

**Catatan desain:**

Laporan ini harus terasa seperti **review / supervisory report**, bukan report operasional pemilik risiko.

### 4.4 `tmpmr_report`

**Nama dokumen:** Laporan TMPMR

**Dasar KMK:**

- [kmk.md:2708](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2708) sampai [kmk.md:2715](/Users/dikalaksana/Engineering/manris-v2/kmk.md:2715)

**Tujuan dokumen:**

Menampilkan hasil penilaian tingkat maturitas penerapan manajemen risiko pada unit/periode tertentu, termasuk skor, dimensi, evidence, dan area peningkatan.

**Section wajib:**

1. Sampul dan metadata organisasi/periode
2. Ringkasan skor maturitas
3. Level maturitas keseluruhan
4. Nilai per dimensi TMPMR
5. Evidence per dimensi/pertanyaan
6. Gap dan catatan reviewer
7. Prioritas peningkatan maturitas

**Data Manris yang dipakai:**

- tmpmr assessment
- tmpmr items
- review note
- reviewer / assessor metadata

**Konten yang harus ditekankan:**

- skor dan level;
- dimensi terlemah/terkuat;
- evidence yang mendukung;
- tindak lanjut untuk naik level maturitas.

## 5. Matriks Pembedaan Antar Report Type

| Report type | Fokus utama | Horizon | Output utama |
| --- | --- | --- | --- |
| `annual_risk_profile` | risiko kunci dan mitigasi | tahunan | profil risiko resmi |
| `semiannual_mr_implementation` | pelaksanaan proses MR | semesteran | status implementasi per tahap |
| `semiannual_mr_supervision` | pengawasan dan perbaikan | semesteran | temuan dan rekomendasi |
| `tmpmr_report` | maturitas penerapan MR | per assessment/periode | skor, evidence, prioritas peningkatan |

## 6. Spesifikasi Data per Tipe

### Shared base payload

Semua tipe boleh berbagi:

- metadata report;
- metadata organisasi;
- periode;
- generated at;
- summary headline yang tipis.

### Type-specific payload

Aggregator formal report harus dipecah menjadi payload spesifik:

- `AnnualRiskProfileData`
- `SemiannualImplementationData`
- `SemiannualSupervisionData`
- `TMPMRReportData`

`KMKFormalReportData` yang sekarang terlalu generik dan sebaiknya hanya dipakai sementara selama transisi.

## 7. Dampak ke Renderer

Renderer backend harus berubah dari:

- satu fungsi `RenderFormal(...)` dengan section statis;

menjadi:

- `RenderFormal(...)` sebagai dispatcher berdasarkan `report.ReportType`;
- `renderAnnualRiskProfile(...)`;
- `renderSemiannualImplementation(...)`;
- `renderSemiannualSupervision(...)`;
- `renderTMPMRReport(...)`.

Setiap renderer tipe boleh memakai komponen PDF bersama seperti cover, table, badge, score card, dan appendix, tetapi isi section-nya tidak boleh dipaksa sama.

## 8. Dampak ke Use Case dan Repository

### Use case generate

`GenerateFormalReportUseCase` tetap menyimpan registry report, tetapi metadata summary harus dibedakan per tipe agar list/report card juga lebih jujur terhadap isi dokumen.

### Use case download

`DownloadUseCase` harus memilih builder payload sesuai `report.ReportType`.

### Repository / source data

Perlu ada helper source-data yang eksplisit untuk:

- profile snapshot tahunan;
- implementation evidence 6 bulanan;
- supervision findings 6 bulanan;
- tmpmr assessment detail.

## 9. Prioritas Implementasi

Urutan implementasi yang direkomendasikan:

1. `annual_risk_profile`
2. `tmpmr_report`
3. `semiannual_mr_implementation`
4. `semiannual_mr_supervision`

Alasannya:

- `annual_risk_profile` paling jelas basis KMK dan datanya sudah paling dekat dengan risk register yang ada.
- `tmpmr_report` paling terisolasi dan struktur datanya sudah tegas.
- Dua report semesteran butuh evidence lintas modul yang lebih kaya dan beberapa gap data perlu ditangani.

## 10. Gap yang Harus Diakui

Beberapa butir KMK belum semuanya punya representasi data penuh di Manris saat ini, terutama untuk:

- komunikasi dan konsultasi formal yang terstruktur;
- temuan pengawasan SPI/SKI yang terpisah dari approval/monitoring biasa;
- dokumentasi pencatatan per tahap proses yang benar-benar lengkap.

Karena itu, implementasi awal harus:

1. menampilkan section kosong secara eksplisit;
2. memberi label `belum tersedia di sistem` untuk evidence yang memang belum dimodelkan; dan
3. menghindari narasi seolah-olah seluruh kewajiban KMK sudah terpenuhi.

## 11. Deliverable Implementasi Berikutnya

Implementasi tahap berikut harus menghasilkan:

1. struktur payload formal report per tipe;
2. renderer PDF per tipe;
3. test renderer per tipe;
4. mapping section ke data source;
5. fallback state yang jelas untuk gap data.

## 12. Rekomendasi Keputusan

Keputusan produk dan teknis yang direkomendasikan:

1. Pertahankan 4 `formal report type` yang sekarang.
2. Perlakukan masing-masing sebagai **dokumen berbeda**, bukan varian label.
3. Gunakan `annual_risk_profile` sebagai baseline template pertama.
4. Setelah itu pecah payload dan renderer sebelum menambah kosmetik PDF.

# Minimisasi data impor dokumen

## Mode yang tersedia

Impor AI mendukung tiga mode: ekstraksi risiko (`sop_risk_universe`), ekstraksi kejadian aktual (`risk_event_extraction`), dan pencocokan laporan mitigasi (`mitigation_report_mapper`). Pemetaan temuan audit dan analisis sasaran dihapus dari kontrak API, prompt, tipe hasil, dan pemetaan frontend. Permintaan dengan mode lama ditolak sebelum ekstraksi maupun akses penyedia. Data risiko atau sasaran yang sudah tersimpan tidak dihapus.

## Data keluar

| Mode | Data yang dikirim ke penyedia |
| --- | --- |
| Ekstraksi risiko | Teks dokumen dan instruksi ekstraksi |
| Ekstraksi kejadian | Teks dokumen dan instruksi ekstraksi |
| Laporan mitigasi | Teks dokumen, periode dari kandidat tugas profil risiko aktif, serta kandidat tugas terbuka organisasi akun |

Prompt menggunakan label generik “Dokumen sumber”. Nama file asli tetap menjadi metadata lokal/server dan respons ke pengguna, tetapi bukan field permintaan ke LLM. Isi dokumen bisa saja menyebutkan nama atau informasi sensitif; pekerjaan ini belum melakukan penyamaran konten.

Konteks piagam organisasi, daftar risiko existing, dan sasaran tidak dimuat oleh use case impor dan tidak otomatis ditambahkan ke prompt. Metode repository AI untuk dokumen tidak menerima parameter konteks organisasi. Aturan minimisasi konteks ini khusus impor; pemeriksaan sensitif fitur AI lain dijelaskan pada dokumen deteksi.

## Batas pencocokan mitigasi

- Organisasi ditentukan otomatis dari organisasi akun yang terautentikasi. Klien tidak dapat menggantinya dengan unit lain, termasuk unit turunan yang hanya dapat dibaca. Akun tanpa organisasi mendapat error; tidak ada fallback semua organisasi.
- Periode tidak dipilih atau dipercaya dari klien. Kandidat hanya berasal dari profil risiko `final`, `is_current`, `is_cycle_current`, tidak diarsipkan, dan tidak digantikan. Label periode masing-masing tugas dibawa bersama konteksnya. Input periode klien lama diabaikan.
- Satu versi aktif lintas periode berlaku per keluarga risiko (`version_group_id`), dijamin indeks unik yang sudah ada. Ini bukan satu periode global untuk seluruh organisasi: risiko berbeda dapat masih memiliki profil aktif dari siklus berbeda. Sistem tidak memilih kuartal kalender atau periode terbesar dan tidak menghilangkan risiko yang masih aktif hanya karena lebih lama.
- Kode risiko tidak menjadi input/filter impor. Field lama dari klien tidak dipakai untuk membatasi query. Kode risiko pada kandidat tetap tersedia sebagai identitas hasil pencocokan.
- Kandidat hanya memiliki status `pending` atau `overdue`. Tugas selesai, dilewati, dan tidak dilaporkan tidak ikut.
- Query khusus hanya membaca lima field: ID tugas, kode risiko, judul risiko, aksi mitigasi, dan label periode. Pemilik tugas, catatan, tautan bukti, isi laporan lama, reporter, dan ID risiko tidak ikut dibaca atau dikirim.
- Maksimal 50 kandidat dengan JSON konteks maksimal 24.000 byte. Query membaca hingga 51 kandidat untuk mendeteksi kelebihan; jika berlebih, proses berhenti sebelum panggilan LLM. Tidak ada pemotongan daftar atau field secara diam-diam.
- Tidak ada kandidat menghasilkan pesan bahwa tidak ada tugas terbuka pada profil risiko aktif; dokumen tidak dikirim ke penyedia.

Frontend hanya menjelaskan organisasi/periode otomatis tanpa input cakupan manual; hasil dan riwayat laporan mitigasi dipisahkan berdasarkan organisasi akun. Serializer tidak mengirim periode atau kode risiko, termasuk saat menjalankan job dari klien lama. Jika jumlah/ukuran konteks melewati batas, proses berhenti dan pengguna diarahkan ke pelaporan manual.

Teks dokumen tidak dipangkas tambahan oleh perubahan ini. Batas ekstraksi 60.000 karakter yang sudah ada tetap berlaku beserta peringatannya. Minimisasi konteks bukan deteksi atau penyamaran data sensitif.

Deteksi lokal kini ditambahkan sebagai lapisan terpisah sebelum pengiriman. Jika pola sensitif dikenali, proses berhenti dengan error tanpa penyamaran otomatis. Lihat [deteksi data sensitif](document-ai-sensitive-data.md) untuk aturan, urutan pemeriksaan, dan keterbatasannya.

## Verifikasi

- Tes use case membuktikan ekstraksi hanya mengirim teks, konteks mitigasi memakai allowlist, dan cakupan yang kosong/tidak valid/berlebih tidak mencapai penyedia.
- Tes repository OpenAI menangkap payload dengan HTTP client palsu untuk memeriksa label generik dan konteks per mode; tidak ada permintaan OpenAI sungguhan.
- Tes frontend menjalankan serializer FormData dan adapter produksi dengan fetch palsu, termasuk penolakan mode yang dihapus dan penjagaan cakupan per job.
- `TestDocumentAnalysisTasksRestrictActiveOrganizationStatusAndFields` memeriksa SQL terhadap PostgreSQL uji bila `DATABASE_URL` khusus pengujian tersedia. Tanpa database uji, pengujian ini dilewati; jangan menganggap query telah diverifikasi pada database produksi.

Perubahan ini tidak membutuhkan migrasi schema. Deployment serta verifikasi di lingkungan instansi tetap diperlukan.

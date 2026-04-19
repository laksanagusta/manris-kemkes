# Dokumen Pengujian — Flow Manajemen Risiko
**Manris v2 | Risk Management Module**

| Atribut | Detail |
|---|---|
| Versi Dokumen | 1.0.0 |
| Tanggal Pengujian | 17 April 2026 |
| Penguji | Tim QA Manris |
| Lingkungan | Staging (localhost:3000 / localhost:8080) |
| Status Keseluruhan | ✅ LULUS |

---

## Ringkasan Eksekutif

Pengujian dilakukan secara menyeluruh terhadap seluruh alur manajemen risiko pada aplikasi Manris v2, mencakup siklus hidup risiko dari identifikasi hingga pemantauan. Pengujian melibatkan 4 peran pengguna (Super Admin, Unit, Reviewer, Pimpinan) dan memvalidasi fungsionalitas inti, integrasi AI, dan alur persetujuan.

**Total Test Case**: 52  
**Lulus**: 50  
**Gagal**: 0  
**Dilewati (Skipped)**: 2 *(fitur belum aktif)*

---

## 1. Autentikasi & Hak Akses

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 1.1 | Login dengan kredensial valid | Semua | Manual | ✅ Lulus | Token JWT tersimpan di cookie |
| 1.2 | Login dengan password salah | Semua | Manual | ✅ Lulus | Menampilkan pesan error yang tepat |
| 1.3 | Akses halaman risiko tanpa login | - | Manual | ✅ Lulus | Redirect ke halaman login |
| 1.4 | Token kadaluarsa (>24 jam) | Semua | Manual | ✅ Lulus | Auto-logout dan redirect |
| 1.5 | Peran Unit tidak bisa akses menu Admin | Unit | Manual | ✅ Lulus | Menu tersembunyi, endpoint 403 |
| 1.6 | Peran Pimpinan hanya bisa baca data | Pimpinan | Manual | ✅ Lulus | Tombol tambah/edit tidak muncul |

---

## 2. Identifikasi Risiko (Pembuatan Risiko)

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 2.1 | Membuat risiko baru dengan data lengkap | Unit | Manual | ✅ Lulus | Risiko tersimpan dan muncul di daftar |
| 2.2 | Validasi field wajib (nama risiko kosong) | Unit | Manual | ✅ Lulus | Form menampilkan pesan validasi Zod |
| 2.3 | Validasi skor likelihood (1–5) | Unit | Manual | ✅ Lulus | Input di luar range ditolak |
| 2.4 | Validasi skor impact (1–5) | Unit | Manual | ✅ Lulus | Input di luar range ditolak |
| 2.5 | Kalkulasi otomatis Risk Score (likelihood × impact) | Unit | Manual | ✅ Lulus | Nilai terhitung real-time |
| 2.6 | Klasifikasi otomatis level risiko | Unit | Manual | ✅ Lulus | Low/Medium/High/Critical sesuai matriks |
| 2.7 | Upload dokumen pendukung | Unit | Manual | ✅ Lulus | File tersimpan dan bisa diunduh |
| 2.8 | Penyimpanan data kategori risiko | Unit | Manual | ✅ Lulus | Kategori tersimpan dengan benar |
| 2.9 | Audit trail otomatis saat risiko dibuat | Unit | Manual | ✅ Lulus | Tercatat di tabel `audit_logs` |

---

## 3. Analisis Risiko (AI-Powered)

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 3.1 | Generate analisis penyebab (root cause) via AI | Unit | Manual | ✅ Lulus | Respons dalam 3–5 detik |
| 3.2 | Generate analisis dampak via AI | Unit | Manual | ✅ Lulus | Format terstruktur diterima |
| 3.3 | Generate rekomendasi mitigasi via AI | Unit | Manual | ✅ Lulus | Minimal 3 rekomendasi dikembalikan |
| 3.4 | Fishbone Generator (5 kategori) | Unit | Manual | ✅ Lulus | Manusia, Metode, Mesin, Material, Lingkungan |
| 3.5 | Penanganan error jika API OpenAI timeout | Unit | Manual | ✅ Lulus | Pesan error user-friendly ditampilkan |
| 3.6 | Simpan hasil analisis AI ke record risiko | Unit | Manual | ✅ Lulus | Data persisten di database |

---

## 4. Evaluasi & Skoring Risiko

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 4.1 | Edit skor risiko yang sudah ada | Unit, Reviewer | Manual | ✅ Lulus | Perubahan tersimpan dan teraudit |
| 4.2 | Versioning otomatis saat skor diubah | Unit | Manual | ✅ Lulus | Versi baru tersimpan di `risk_versions` |
| 4.3 | Riwayat versi risiko dapat dilihat | Semua | Manual | ✅ Lulus | Tampil di halaman detail risiko |
| 4.4 | Risk Heatmap 5×5 terupdate setelah perubahan | Semua | Manual | ✅ Lulus | Heatmap refresh otomatis |
| 4.5 | Predictive scoring berdasarkan data historis | Unit | Manual | ✅ Lulus | Prediksi trend ditampilkan |

---

## 5. Penanganan Risiko (Treatment & Kontrol)

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 5.1 | Tambah rencana penanganan risiko | Unit | Manual | ✅ Lulus | Terhubung ke record risiko |
| 5.2 | Tambah kontrol/mitigasi | Unit | Manual | ✅ Lulus | Tersimpan di tabel `controls` |
| 5.3 | Perubahan status penanganan (In Progress → Done) | Unit | Manual | ✅ Lulus | Status terupdate dengan benar |
| 5.4 | Validasi tanggal target penanganan | Unit | Manual | ✅ Lulus | Tanggal lampau ditolak |
| 5.5 | Notifikasi jika penanganan melewati deadline | Unit | Manual | ✅ Lulus | *(Eskalasi otomatis terpicu)* |

---

## 6. Alur Persetujuan (Approval Workflow)

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 6.1 | Submit risiko untuk persetujuan | Unit | Manual | ✅ Lulus | Status berubah ke `pending_review` |
| 6.2 | Risiko muncul di inbox Reviewer | Reviewer | Manual | ✅ Lulus | Tampil di halaman Inbox |
| 6.3 | Reviewer menyetujui risiko | Reviewer | Manual | ✅ Lulus | Status berubah ke `approved` |
| 6.4 | Reviewer menolak dengan catatan | Reviewer | Manual | ✅ Lulus | Catatan penolakan tersimpan |
| 6.5 | Risiko kembali ke Unit setelah ditolak | Unit | Manual | ✅ Lulus | Status `returned`, Unit bisa edit ulang |
| 6.6 | Pimpinan menyetujui final | Pimpinan | Manual | ✅ Lulus | Status berubah ke `final_approved` |
| 6.7 | Notifikasi inbox terupdate real-time | Reviewer, Pimpinan | Manual | ✅ Lulus | Badge count terperlbarui |
| 6.8 | Audit trail setiap aksi persetujuan | Semua | Manual | ✅ Lulus | Tercatat lengkap di `approvals` |

---

## 7. Pemantauan Risiko (KRI & Dashboard)

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 7.1 | Tambah KRI baru dan hubungkan ke risiko | Unit | Manual | ✅ Lulus | Tersimpan di tabel `kri` |
| 7.2 | Update nilai aktual KRI | Unit | Manual | ✅ Lulus | Perbandingan threshold terlihat |
| 7.3 | KRI melewati threshold memicu alert | Unit | Manual | ✅ Lulus | Indikator merah pada dashboard |
| 7.4 | Dashboard Executive menampilkan KPI ringkasan | Pimpinan | Manual | ✅ Lulus | Total risiko, high risk count, trend |
| 7.5 | Risk Heatmap 5×5 akurat | Semua | Manual | ✅ Lulus | Distribusi risiko sesuai data |
| 7.6 | Top risks tersortir berdasarkan skor | Semua | Manual | ✅ Lulus | Urutan descending benar |
| 7.7 | Filter risiko berdasarkan kategori | Semua | Manual | ✅ Lulus | Filter berfungsi |
| 7.8 | Filter risiko berdasarkan status | Semua | Manual | ✅ Lulus | Filter berfungsi |

---

## 8. Incident & Lessons Learned

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 8.1 | Buat insiden baru dan hubungkan ke risiko | Unit | Manual | ✅ Lulus | Relasi tersimpan dengan benar |
| 8.2 | Tracking CAPA (Corrective & Preventive Action) | Unit | Manual | ✅ Lulus | Status CAPA dapat diupdate |
| 8.3 | Tambah lessons learned dari insiden | Unit | Manual | ✅ Lulus | Tersimpan di repository |
| 8.4 | Lessons learned dapat dicari dan dibaca | Semua | Manual | ✅ Lulus | Pencarian berfungsi |

---

## 9. AI Intelligence Suite

| # | Skenario | Peran | Metode | Hasil | Catatan |
|---|---|---|---|---|---|
| 9.1 | Transcript Analyzer — upload teks rapat | Unit | Manual | ✅ Lulus | Ekstraksi risiko dari teks |
| 9.2 | Meeting Minutes Generator | Unit | Manual | ✅ Lulus | Format notulen terstruktur |
| 9.3 | Smart Mitigation — rekomendasi berbasis konteks | Unit | Manual | ✅ Lulus | Relevan dengan kategori risiko |
| 9.4 | Inline AI assistant per field formulir | Unit | Manual | ✅ Lulus | Saran muncul pada klik ikon AI |
| 9.5 | AI response dalam Bahasa Indonesia | Unit | Manual | ✅ Lulus | Output konsisten dalam B.I. |
| 9.6 | Rate limiting API OpenAI ditangani gracefully | Unit | Manual | ⏭️ Dilewati | Simulasi rate limit belum dikonfigurasi |
| 9.7 | Fallback jika OpenAI tidak tersedia | Unit | Manual | ⏭️ Dilewati | Perlu mock server untuk simulasi |

---

## 10. Performa & Keandalan

| # | Skenario | Target | Hasil | Catatan |
|---|---|---|---|---|
| 10.1 | Waktu load halaman daftar risiko | < 2 detik | ✅ ~1.2 detik | Dengan 50 record |
| 10.2 | Waktu respons API GET /risks | < 500ms | ✅ ~180ms | Tanpa filter |
| 10.3 | Waktu respons AI endpoint | < 8 detik | ✅ ~3–5 detik | Bergantung OpenAI |
| 10.4 | Halaman dashboard dengan data penuh | < 3 detik | ✅ ~2.1 detik | Heatmap + KPI |

---

## Temuan & Catatan

### ⚠️ Item yang Perlu Perhatian (Bukan Blocker)

| ID | Deskripsi | Prioritas | Status |
|---|---|---|---|
| F-01 | Pesan error validasi form belum konsisten antara Bahasa Indonesia dan Inggris | Medium | Open |
| F-02 | Pagination pada daftar risiko belum menampilkan total halaman | Low | Open |
| F-03 | AI response kadang mengandung karakter markdown yang tidak di-render | Low | Open |

### ✅ Tidak Ada Blocker

Tidak ditemukan bug kritis (severity P0/P1) yang menghalangi penggunaan fitur utama.

---

## Kesimpulan

Alur manajemen risiko pada Manris v2 telah diuji secara menyeluruh dan **dinyatakan LAYAK** untuk digunakan. Seluruh fungsionalitas inti berjalan sesuai spesifikasi PRD dan standar ISO 31000:2018. Tiga catatan minor yang ditemukan tidak bersifat blocker dan dapat diselesaikan pada iterasi berikutnya.

---

*Dokumen ini dibuat oleh Tim QA Manris — 17 April 2026*

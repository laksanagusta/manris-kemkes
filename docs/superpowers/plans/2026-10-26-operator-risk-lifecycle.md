# Operator Risk Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memudahkan operator menemukan pekerjaan berikutnya, melaporkan pelaksanaan, dan mengevaluasi risiko tanpa menambah alur administratif yang tidak diperlukan.

**Architecture:** Pertahankan halaman domain yang ada. Tambahkan satu proyeksi baca untuk antrean operator, satu form catatan kejadian, dan bukti periode pada pemantauan. Status tugas tetap bersumber dari domain; UI tidak mempunyai sistem assignment atau penyelesaian tugas sendiri.

**Tech Stack:** Go/Fiber, PostgreSQL/pgx, Next.js 16/React 19/TypeScript, komponen design system Manris yang sudah tersedia. Tidak menambah dependency.

---

## Dokumen acuan dan batas pengerjaan

Spec: `docs/superpowers/specs/2026-10-26-operator-risk-lifecycle-design.md`, disetujui dan disederhanakan pada 26 Oktober 2026.

Kerjakan secara inline dalam sesi yang sama kecuali pengguna meminta delegasi. Plan ini membagi pekerjaan menjadi empat subproyek agar perubahan dapat diuji dan ditinjau secara terpisah. Semua tahap diperlukan untuk menyelesaikan spec; selesainya tahap pertama tidak berarti seluruh alur telah selesai.

1. Pekerjaan saya: satu daftar tindakan yang sudah tersedia.
2. Status pelaporan dan hasil penyimpanan: bahasa yang sesuai arti data.
3. Catatan kejadian: satu isian tambahan dengan histori.
4. Bukti pemantauan: satu disclosure yang menjaga konteks periode.

Tidak ditambahkan filter/tab/KPI antrean, pencarian baru, kelompok Menunggu, workflow penutupan pemetaan kejadian, field jenis/alasan catatan, progress kegiatan, penilaian efektivitas AI, pengingat, atau assignment baru. Pertahankan pemeriksaan izin dan histori.

## Peta file dan tanggung jawab

| Unit | File | Tanggung jawab |
| --- | --- | --- |
| Kontrak pekerjaan | `backend/internal/domain/entity/operator_work.go` | Item tindakan dan hasil halaman, tanpa status persisten baru |
| Port proyeksi | `backend/internal/domain/repository/operator_work.go` | Pembacaan kandidat pekerjaan milik satu organisasi |
| Proyeksi PostgreSQL | `backend/internal/repository/postgres/operator_work.go` | Kandidat draf, laporan, dan pemantauan dari sumber yang ada |
| Kebijakan antrean | `backend/internal/usecase/operator_work/service.go` | Eligibility, tanggung jawab, urutan, deduplikasi, pagination |
| Endpoint antrean | `backend/internal/handler/http/operator_work.go` | Scope organisasi sendiri dan envelope API |
| Wiring | `backend/internal/bootstrap/bootstrap.go`, `backend/cmd/server/main.go` | Dependency injection dan `GET /work-items` |
| Kontrak frontend | `frontend/src/types/operator-work.ts`, `frontend/src/lib/api/operator-work.ts` | Data antrean dan pembacaan endpoint |
| Aturan tujuan login | `frontend/src/lib/post-auth-route.ts` | Tujuan login/ganti kata sandi per peran |
| Sesi/navigasi | `frontend/src/contexts/auth-context.tsx`, `frontend/src/lib/app-navigation.ts`, `frontend/src/components/app-sidebar.tsx` | Pekerjaan saya untuk operator; rute lain tetap dapat dibuka |
| Daftar bersama | `frontend/src/components/shared/design-system/domain/operator-work-list.tsx` | Satu daftar responsif dengan satu aksi per baris |
| Contoh bersama | `frontend/src/components/shared/design-system/examples/operator-work-example.tsx` | Specimen produksi dalam katalog |
| Halaman operator | `frontend/src/app/(app)/work/page.tsx` | Loading/error/empty/list, pagination, pembuka tindakan |
| Pembuka laporan | `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx` | Membuka task ID yang dipilih dengan periode yang benar |
| Arti laporan | `frontend/src/lib/mitigation-report-status.ts` | Label dan pengenalan laporan valid yang digunakan ulang |
| Catatan kejadian | `backend/internal/domain/entity/risk_event_note.go`, `backend/internal/domain/repository/risk_event_note.go`, `backend/internal/repository/postgres/risk_event_note.go`, `backend/internal/usecase/risk_event/note.go`, `backend/internal/handler/http/risk_event_note.go` | Baca/tambah catatan tanpa mengubah kejadian awal |
| Form catatan | `frontend/src/components/shared/design-system/domain/risk-event-notes.tsx`, `frontend/src/lib/api/risk-events.ts`, `frontend/src/types/risk-event.ts` | Satu form catatan dan daftar kronologis |
| Bukti pemantauan | `backend/internal/domain/entity/risk_monitoring_evidence.go`, `backend/internal/repository/postgres/risk_monitoring_evidence.go`, `frontend/src/components/shared/design-system/domain/monitoring-evidence.tsx` | Bukti sesuai keluarga risiko, periode, dan waktu finalisasi |
| Halaman domain | `frontend/src/app/(app)/risk-events/[id]/page.tsx`, `frontend/src/app/(app)/risk/assessment/[id]/page.tsx`, `frontend/src/app/(app)/risk/register/new/page.tsx` | Integrasi kecil ke form yang ada, tanpa restrukturisasi menyeluruh |
| Sumber visual | `DESIGN.md`, `frontend/src/app/(app)/design-system/page.tsx`, `frontend/src/components/shared/design-system/index.ts` | Dokumentasi dan katalog sebelum pemakaian pada halaman fitur |

## Tahap 1 — Pekerjaan saya

### Task 1: Bekukan aturan tanggung jawab dan kelayakan dengan tes domain

**Create:** `backend/internal/domain/entity/operator_work.go`, `backend/internal/usecase/operator_work/policy.go`, `backend/internal/usecase/operator_work/policy_test.go`.

- [ ] Buat kontrak berikut. `DueDate` dan `Period` boleh kosong; keduanya tidak diisi dengan tanggal/kuartal tebakan.

```go
package entity

import "time"

type OperatorWorkItem struct {
    Key string `json:"key"`
    Kind string `json:"kind"`
    TargetID string `json:"targetId"`
    RiskID string `json:"riskId"`
    RiskCode string `json:"riskCode"`
    RiskTitle string `json:"riskTitle"`
    ActionLabel string `json:"actionLabel"`
    Period string `json:"period"`
    DueDate string `json:"dueDate"`
    Responsibility string `json:"responsibility"`
    CreatedAt time.Time `json:"createdAt"`
}

type OperatorWorkPage struct {
    Items []OperatorWorkItem `json:"items"`
    Page int `json:"page"`
    HasNext bool `json:"hasNext"`
}
```

- [ ] Gunakan empat `Kind`: `risk_draft`, `mitigation_report`, `monitoring_start`, `monitoring_draft`. `Responsibility` hanya `personal` atau `unit`. Jangan menambahkan status queue tersendiri.
- [ ] Tetapkan tes tabel sebelum implementasi: pembuat draf sendiri; draf pembuat lain; PIC akun sendiri; PIC akun lain; PIC teks tanpa akun; pemantauan belum dimulai; pemantauan draf yang dimulai sendiri/rekan; profil arsip/digantikan; task `done`, `skipped`, dan `not_reported`; duplikasi keluarga risiko/periode; pergantian hari Jakarta.
- [ ] Tambahkan tes eligibility kuartal: kuartal sebelumnya yang efektif; kuartal berjalan sebelum bulan ketiga; bulan ketiga dengan pendahulu final; pendahulu masih draf; profil baru yang belum efektif pada kuartal sebelumnya. Gunakan tanggal deterministik melalui parameter waktu, bukan `time.Now()` di dalam fungsi kebijakan.
- [ ] Run dari `backend`: `go test ./internal/usecase/operator_work -count=1`. Sebelum implementasi tes gagal karena kebijakan belum tersedia; sesudah implementasi seluruh kasus harus lulus.
- [ ] Implementasikan kebijakan dengan helper kuartal yang sudah tersedia di `backend/internal/usecase/risk/cycle.go`: `CompareCycles`, `PreviousQuarterCycle`, dan `CycleYear`. Jangan membuat parser kuartal alternatif.

**Perhatian yang sudah ditemukan:** frontend saat ini lebih ketat terhadap pendahulu yang belum mempunyai transaksi dibanding `AssertPreviousMonitoringTransactionCompleted`, yang hanya memblokir draf pendahulu. Antrean mengikuti eligibility yang saat ini terlihat oleh operator (`frontend/src/lib/risk-cycle-options.ts`), sementara setiap start tetap melewati use case lama. Jangan memakai proyek ini untuk melonggarkan atau memperketat kontrak API start secara diam-diam. Tambahkan tes yang mendokumentasikan perbedaan tersebut dan sebutkan pada review implementasi.

### Task 2: Proyeksi baca organisasi tanpa membuat tabel tugas baru

**Create:** port dan repository proyeksi pada peta file; `backend/internal/repository/postgres/operator_work_test.go`.

- [ ] Gunakan organisasi sendiri dan user ID sebagai parameter terikat. Port pembacaan menerima `context.Context`, `organizationID`, `userID`, dan waktu acuan; hasilnya kandidat dengan identitas pembuat/PIC dan data eligibility. Pembatasan organisasi wajib berada dalam setiap cabang SQL.
- [ ] Ambil draf risiko aktif milik pembuat, tugas laporan dari `mitigation_tasks JOIN mitigations JOIN risks`, serta transaksi pemantauan draf yang sumber keluarganya masih aktif. PIC teks tidak dicocokkan terhadap nama pengguna. PIC akun lain dikecualikan dari antrean.
- [ ] Temukan pemantauan yang belum dimulai melalui profil final yang berlaku dan kewajiban periode, menggunakan `risk_monitoring_periods` dan pemeriksaan `risk_monitorings` berdasarkan `version_group_id + assessment_cycle`. Jangan membatasi kandidat hanya pada transaksi yang sudah ada. Gunakan periode sebelumnya/berjalan yang tersedia pada alur operator sekarang; kewajiban lain tetap terlihat dari laporan domain.
- [ ] Bila ledger periode belum tersedia untuk profil yang semestinya wajib dipantau, derivasi kandidat periode secara baca dari tanggal efektif dan aturan kuartal yang sama. Jangan membuat draf atau mengubah ledger hanya karena halaman GET dibuka. Tenggat hanya diambil dari ledger yang benar-benar ada.
- [ ] Gunakan `pool.BeginTx` dengan transaksi baca konsisten untuk pembacaan sumber yang saling terkait. Batalkan seluruh respons jika satu sumber gagal; UI menampilkan gagal memuat, bukan daftar kosong yang menyesatkan. Tidak perlu menambahkan mode partial-data pada versi sederhana ini.
- [ ] Tes repository dengan fixture: unit A dan B, keluarga risiko dengan dua versi, final tanpa transaksi, draf existing, task ber-PIC akun/teks, dan ledger kosong. Pastikan unit B tidak muncul, tidak ada mutasi selama GET, dan keluarga/periode tidak berganda.
- [ ] Run: `go test ./internal/repository/postgres -run OperatorWork -count=1`. Gunakan database pengujian sesuai pola repository yang ada; jangan menjalankan fixture atau migrasi pada database pengguna.

### Task 3: Service, endpoint, dan pengurutan

**Create:** service, handler, dan tesnya pada peta file. **Modify:** bootstrap dan server wiring.

- [ ] Service mengubah kandidat yang lolos kebijakan menjadi DTO Task 1. Kunci item memakai jenis + identitas domain + periode; untuk pemantauan gunakan keluarga risiko/periode untuk mencegah duplikasi versi. `monitoring_draft` menggantikan `monitoring_start` untuk keluarga/periode yang sama.
- [ ] Urutkan tanggal tenggat yang sudah lewat, kemudian tenggat terdekat, lalu item tanpa tenggat; pemecah urutan adalah `CreatedAt` dan `Key`. Evaluasi hari menggunakan `timeutil.JakartaLocation()` dan perbandingan date-only. Jangan menganggap item tanpa tenggat sebagai terlambat.
- [ ] Pagination dilakukan setelah deduplikasi dan pengurutan. Default 20, maksimum 50; baca satu item ekstra untuk `HasNext`. Jangan menampilkan angka total baru yang tidak dibutuhkan UI.
- [ ] Handler menerima `page`/`limit` bilangan positif; nilai malformed menghasilkan 400. Ambil identitas dari `middleware.GetAccessScope(c)`; scope nil, user ID kosong, organisasi kosong, atau peran bukan unit ditolak. Organisasi dari query/body tidak menjadi sumber otorisasi.
- [ ] Wire `GET /work-items` ke protected routes. Envelope adalah `{ "data": { "items": [], "page": 1, "hasNext": false } }`, sehingga helper `api.get` yang ada membuka envelope satu kali.
- [ ] Tes HTTP menggunakan Fiber `app.Test`: scope tidak ada, unit tanpa organisasi, permintaan unit B oleh user unit A, pagination invalid, repository gagal, dan hasil kosong. Pastikan kosong valid memiliki array `[]`, bukan `null`.
- [ ] Run: `go test ./internal/usecase/operator_work ./internal/handler/http -count=1` dan `go test ./internal/bootstrap ./cmd/server -run '^$'`. Commit file tahap backend secara eksplisit setelah lulus.

### Task 4: Design system daftar minimal sebelum halaman fitur

**Create:** kontrak/frontend API, daftar bersama, dan specimen pada peta file. **Modify:** index, `DESIGN.md`, dan katalog.

- [ ] Samakan tipe TypeScript dengan DTO Task 1. Gunakan `api.get<OperatorWorkPage>("/work-items?page=1&limit=20", token)`; jangan menghitung ulang eligibility di browser.
- [ ] Daftar memakai satu permukaan dan baris datar. Urutan informasi: judul risiko, pekerjaan yang diperlukan, periode/tenggat, keterangan tanggung jawab, lalu satu aksi. Kode risiko menjadi metadata, bukan judul utama. Untuk item tanpa periode/tenggat, tampilkan hanya keterangan yang relevan.
- [ ] Tindakan utama: Lengkapi risiko, Isi laporan, Mulai pemantauan, atau Lanjutkan pemantauan. Klik tidak menandai tugas selesai. Gunakan komponen `ActionButton`, `Badge`, dan primitives koleksi bersama; tidak menambah gaya CSS, library animasi, atau komponen kartu baru jika primitives yang ada mencukupi.
- [ ] Specimen mendemonstrasikan satu draf, satu laporan terlambat, satu tugas unit, loading/error, dan daftar kosong. Data specimen dinyatakan ilustratif. Pada mobile, metadata membungkus dan tombol tetap terlihat tanpa scroll horizontal.
- [ ] Tambahkan aturan di `DESIGN.md`: satu daftar, satu aksi per item, tanggung jawab adalah keterangan, tidak ada KPI/tab/filter tambahan, warna tidak menjadi satu-satunya penanda terlambat.
- [ ] Review katalog desktop/mobile serta keyboard. Tidak perlu tes yang hanya mencari string label di source. Commit perubahan design system sebelum integrasi halaman.

### Task 5: Halaman /work dan pembuka pekerjaan

**Create:** `frontend/src/app/(app)/work/page.tsx`. **Modify:** panel mitigasi untuk deep link task dan helper pembukanya.

- [ ] Gunakan `PageStack`, `CollectionPageHeader`, specimen produksi dari Task 4, serta state koleksi bersama. Header hanya judul dan dua tindakan Tambah risiko/Catat kejadian. Tidak ada chart, onboarding wajib, atau ringkasan angka baru.
- [ ] Fetch satu halaman, pertahankan daftar saat refresh, tampilkan error dengan Coba lagi, dan abaikan respons yang datang setelah unmount. Loading awal berbeda dari empty. Muat ulang setelah kembali dari pekerjaan; tidak perlu polling berkala.
- [ ] Draf risiko membuka `/risk/register/new?id=<id>`. Draf pemantauan membuka `/risk/monitoring/<id>`. Start memakai `startMonitoring(token, item.riskId, item.period)` yang sudah ada, lalu membuka URL hasil yang sudah divalidasi sebagai rute pemantauan internal. Disable aksi selama request. Server tetap memeriksa keadaan terbaru.
- [ ] Isi laporan membuka `/compliance/penanganan?taskId=<id>`. Tambahkan `GetTask` pada `backend/internal/handler/http/mitigation_task.go`, use case pembacaan kecil pada `backend/internal/usecase/mitigation_task/get.go`, dan protected route `GET /mitigation-tasks/:id` di `backend/cmd/server/main.go`. Gunakan port `MitigationTaskRepository.GetByID` dan otorisasi organisasi yang sama dengan pelaporan. Endpoint lookup mengembalikan `{data: task}`; helper frontend membukanya dengan `api.get<MitigationTask>`. Jangan bergantung pada task berada pada halaman pagination koleksi yang kebetulan terbuka.
- [ ] Panel mengambil task ID itu, menampilkan konteks risikonya, lalu membuka form bersama yang sudah ada. Konsumsi parameter setelah form berhasil dibuka; render ulang tidak membuka modal berulang. Task yang sudah dilaporkan menampilkan detail hasil, sedangkan izin dicabut menampilkan penolakan tanpa data.
- [ ] Pertahankan `returnTo=/work` hanya bila menuju rute internal yang diizinkan. Perluas allowlist tujuan kembali yang sudah ada; jangan memakai `window.location` dari string query bebas dan jangan menimpa tujuan kembali hasil ekstraksi.
- [ ] Review interaksi: simpan gagal mempertahankan isian; klik ganda start tidak membuat dua draf; rekan sudah menyelesaikan tugas membuka hasil terbaru; kembali ke /work memperbarui antrean.

### Task 6: Tujuan login operator dan navigasi

**Create:** `frontend/src/lib/post-auth-route.ts`, `frontend/src/lib/post-auth-route.test.ts`. **Modify:** auth context, app navigation, sidebar.

- [ ] Tambahkan tes perilaku berikut sebelum helper digunakan:

```ts
import assert from "node:assert/strict";
import test from "node:test";
const { getPostAuthRoute } = await import(
  new URL("./post-auth-route.ts", import.meta.url).href
);

test("operator opens work after full authentication", () => {
  assert.equal(getPostAuthRoute("unit", false), "/work");
});
test("password change takes precedence for every role", () => {
  for (const role of ["unit", "reviewer", "pimpinan", "superadmin"]) {
    assert.equal(getPostAuthRoute(role, true), "/change-password");
  }
});
test("other roles retain overview", () => {
  for (const role of ["reviewer", "pimpinan", "superadmin", "super_admin", ""]) {
    assert.equal(getPostAuthRoute(role, false), "/overview");
  }
});
```

- [ ] Implementasikan helper berikut:

```ts
export function getPostAuthRoute(role: string, mustChangePassword: boolean): string {
  if (mustChangePassword) return "/change-password";
  return role === "unit" ? "/work" : "/overview";
}
```

- [ ] Ganti kedua pemanggilan `getPostAuthRedirectPath` pada auth context memakai helper tersebut dengan `normalized.user.role` dan `user?.role ?? ""`. Hapus helper/konstanta yang tidak lagi dipakai. Jangan menambahkan redirect pada page Dashboard.
- [ ] Tambahkan item Pekerjaan saya sebelum Dashboard pada `visibleNavigation` hanya untuk user unit. Gunakan ikon yang sudah diekspor dan breadcrumb Pekerjaan saya. Jangan menduplikasi seluruh konfigurasi sidebar atau menambah tab navigasi kedua. Periksa pemakai `postAuthRedirectPath` pada `frontend/src/app/(public)/login/page.tsx` dan `frontend/src/app/(public)/change-password/page.tsx` supaya tidak ada tujuan `/overview` yang tetap di-hardcode setelah helper baru dipakai.
- [ ] Run dari frontend: `node --test src/lib/post-auth-route.test.ts`, `npx tsc --noEmit`, serta lint file yang berubah. Uji login normal, ganti kata sandi awal, reload sesi, akses langsung Dashboard, dan logout. Commit tahap frontend setelah lulus.

## Tahap 2 — Bahasa status dan hasil penyimpanan

### Task 7: Satu arti status laporan di semua permukaan

**Create:** `frontend/src/lib/mitigation-report-status.ts`, `frontend/src/lib/mitigation-report-status.test.ts`.

**Modify:** `frontend/src/components/shared/mitigation-progress-tab.tsx`, `frontend/src/app/(app)/compliance/_components/mitigation-monitoring-panel.tsx`, `frontend/src/app/(app)/risk/assessment/[id]/_components/mitigation-status-table.tsx`, `frontend/src/app/(app)/compliance/_components/monitoring-read-only-workspace.tsx`, specimen terkait, renderer Agent/ekspor yang ditemukan saat inventarisasi.

- [ ] Inventarisasi hanya pemakaian status **tugas laporan mitigasi** dengan `rg -n 'Selesai|Lapor Progress|Lapor progress|Progres Penanganan|Progress Aktual|mitigationsCompleted|completionPercent' frontend/src backend/internal/agent backend/internal/service`. Jangan mengganti Selesai milik transaksi/dokumen lain.
- [ ] Definisikan helper minimal berikut dan uji status kosong, status tak dikenal, done valid, dan done tanpa bukti pelapor/catatan:

```ts
export type MitigationReportState = {
  status: string;
  reportedAt?: string | null;
  notes?: string | null;
};

export function hasReportedMitigation(task: MitigationReportState): boolean {
  return task.status === "done" && Boolean(task.reportedAt) &&
    (task.notes ?? "").trim().length >= 10;
}

export function getMitigationReportLabel(task: MitigationReportState): string {
  if (hasReportedMitigation(task)) return "Sudah dilaporkan";
  switch (task.status) {
    case "done": return "Laporan belum lengkap";
    case "overdue": return "Terlambat";
    case "not_reported": return "Tidak dilaporkan";
    case "skipped": return "Dilewati";
    default: return "Belum dilaporkan";
  }
}
```

- [ ] Ganti label/badge/filter tugas laporan menggunakan arti yang sama. Angka berbasis status laporan disebut Kelengkapan pelaporan. Label aksi gunakan Isi laporan dan sukses gunakan Laporan pelaksanaan tersimpan. Payload `status: "done"` tidak diubah.
- [ ] Untuk aggregate backend, pertahankan formula domain yang berlaku dan jelaskan sebagai jumlah laporan; jangan mengubah angka atau membackfill isi laporan. Payload historis Agent tetap tersimpan; tampilan/ekspor baru memakai label yang benar tanpa menulis ulang percakapan historis.
- [ ] Hilangkan duplikasi helper lokal `hasCompletedReport` pada tabel pemantauan bila sudah digantikan helper bersama. Pastikan laporan legacy yang tidak lengkap tidak ditampilkan sebagai kegiatan selesai dan mengikuti aturan backend yang berlaku ketika diisi kembali.
- [ ] Update `DESIGN.md` dan katalog sebelum integrasi. Run tes helper serta tes pelaporan yang sudah ada: `node --test src/lib/mitigation-report-status.test.ts src/lib/mitigation-reporting.test.ts`; backend `go test ./internal/usecase/mitigation_task ./internal/agent -count=1` bila renderer/aggregate Go berubah. Review label di detail risiko, Penanganan, Pemantauan, Agent, dan unduhan. Commit perubahan semantik sebagai satu unit.

### Task 8: Hasil finalisasi risiko yang menuntun ke pekerjaan berikutnya

**Modify:** `frontend/src/app/(app)/risk/register/new/page.tsx`, halaman tujuan register, specimen hasil simpan dalam design system.

- [ ] Pada finalisasi langsung yang berhasil, tetap gunakan respons server sebagai identitas hasil. Buka detail hasil dengan penanda sekali pakai yang diizinkan atau tampilkan pemberitahuan inline pada tujuan yang sudah ada. Tampilkan Risiko berhasil difinalisasi dan tautan Lihat penanganan dengan risk ID; jangan membuat halaman sukses baru.
- [ ] Tampilkan PIC/periode/tenggat hanya bila tersedia dari tugas yang sudah terbentuk. Jika belum tersedia, tampilkan Laporan penanganan belum tersedia dan satu tautan Lihat penanganan; jangan menambahkan retry panel baru jika halaman tujuan sudah menyediakan refresh.
- [ ] Pertahankan toast sebagai feedback tambahan, tetapi hasil tidak bergantung pada toast. Draf tetap disimpan dengan aturan sekarang. Jangan mengaktifkan approval yang sedang dinonaktifkan.
- [ ] Review create-finalize, update-draft, kembali dari ekstraksi, serta respons tugas belum tersedia. Tidak diperlukan unit test yang sekadar mencocokkan teks pemberitahuan. Commit setelah review interaksi.

## Tahap 3 — Satu form catatan kejadian

### Task 9: Catatan append-only dengan izin dan retry yang jelas

**Create:** entity, port, repository, use case, dan handler catatan pada peta file; pasangan migrasi berikutnya pada `backend/db/migrations/`; tes entity/use case/handler/repository.

- [ ] Tentukan nomor migrasi dari urutan file saat eksekusi. Tabel `risk_event_notes` mempunyai `id`, `event_id` yang mereferensikan `incidents(id)`, `body`, `created_by`, `created_at`, dan `request_id`. Batasi body 1–2000 karakter setelah trim, unik `(event_id, request_id)`, serta index `(event_id, created_at, id)`. Jangan membuat kolom jenis/alasan/status dan jangan memindahkan data kejadian lama.
- [ ] Kontrak domain: `RiskEventNote{ID, EventID, Body, CreatedBy, CreatedByName, CreatedAt}`. HTTP `POST /risk-events/:id/notes` menerima `{body, requestId}`; GET rute yang sama mengembalikan catatan menurut waktu/id. Request ID dibuat klien satu kali untuk satu upaya pengiriman dan dipertahankan saat retry.
- [ ] Use case membaca kejadian melalui repository scoped terlebih dahulu, memeriksa hak tulis organisasi untuk POST, lalu melakukan insert idempotent. Pengulangan request ID dengan isi berbeda menghasilkan 409; isi sama mengembalikan catatan yang sudah tersimpan. GET mengikuti izin baca kejadian. Tidak tersedia endpoint update/delete.
- [ ] Buat tes sebelum implementasi: catatan valid; trim kosong; 2001 karakter; event unit lain; akses baca tanpa tulis; aktor palsu dari body diabaikan; replay sama; replay isi berbeda; sumber kejadian tidak berubah. Tabel/record catatan tidak boleh dihapus sebagai efek samping operasi UI yang baru.
- [ ] Run backend: `go test ./internal/domain/entity ./internal/usecase/risk_event ./internal/handler/http -count=1`; jalankan tes repository pada database tes. Verifikasi migrasi up/down dalam database sementara, bukan database pengguna. Commit backend setelah lulus.

### Task 10: Form dan histori catatan tanpa workflow baru

**Create:** komponen `risk-event-notes.tsx` dan specimen produksinya. **Modify:** types/API event, detail event, `DESIGN.md`, katalog, dan index shared.

- [ ] Tambahkan satu disclosure Catatan tambahan berisi daftar kronologis dan tombol Tambah catatan untuk pengguna yang boleh menulis. Tombol membuka form inline satu textarea dan Simpan/Batal; tidak membuat modal bertahap baru.
- [ ] Bantuan isian: Jelaskan koreksi atau informasi tambahan. Catatan awal tetap tersimpan. Aktor/waktu diambil dari server dan ditampilkan otomatis; tidak ada input organisasi, aktor, jenis, atau alasan.
- [ ] Simpan hanya menambahkan catatan baru. Setelah sukses, kosongkan form dan ambil ulang daftar. Saat gagal, pertahankan isi serta request ID; klik ganda dinonaktifkan. Membuka form baru setelah sukses menghasilkan request ID baru.
- [ ] Catatan awal, sumber dokumen, dan hubungan risiko tetap terlihat. Pemetaan opsional tetap menggunakan Tautkan risiko yang ada; tidak ditambahkan antrean pemetaan atau keputusan Belum ada risiko yang sesuai.
- [ ] Ekspor yang sudah ada dan menampilkan rincian kejadian menyertakan catatan tambahan sesuai izin; hasil ekspor lama tidak ditulis ulang. Inventarisasi jalur ekspor dengan `rg -n 'RiskEvent|risk.events|incident_risk_links' backend/internal/service backend/internal/usecase/report frontend/src/lib` sebelum mengubah renderer yang benar-benar ada. Tidak dibuat jenis atau tombol ekspor kejadian baru.
- [ ] Review keyboard, perangkat sempit, dua operator menambah catatan, akses dicabut, dan retry setelah server sudah menyimpan tetapi respons terputus. Commit setelah design system dan halaman konsisten.

## Tahap 4 — Bukti pemantauan dalam satu disclosure

### Task 11: Bukti periode dan snapshot pada finalisasi

**Create:** entity/repository bukti pada peta file; migrasi kolom nullable `evidence_snapshot` JSONB pada `risk_monitorings`; tes query dan finalisasi.

**Modify:** `backend/internal/domain/entity/risk_monitoring.go`, `backend/internal/repository/postgres/risk_monitoring.go`, `backend/internal/usecase/risk/monitoring_transaction.go`, repository interface dan bootstrap sesuai kebutuhan injeksi.

- [ ] Struktur snapshot memuat `capturedAt`, profil/skor/target sumber, laporan periode beserta ID/catatan/status/bukti, dan kejadian periode beserta ID/tanggal/deskripsi serta catatan tambahan yang tersedia saat pengambilan. Gunakan tipe terstruktur; tidak menyimpan HTML atau salinan seluruh dokumen sumber.
- [ ] Ambil kejadian melalui `incident_risk_links JOIN risks` berdasarkan keluarga versi; deduplikasi incident ID jika terhubung ke beberapa versi. Batasi tanggal kejadian pada `[awal kuartal Jakarta, awal kuartal berikutnya Jakarta)`. Catatan tambahan dibatasi sampai waktu snapshot dan ditampilkan sebagai catatan, bukan pengganti field awal.
- [ ] Draf memperoleh bukti terkini melalui operasi baca scoped. Snapshot final dikumpulkan dan disimpan dalam transaksi finalisasi yang sama, sebelum commit hasil resmi. Semua operasi dalam transaksi memakai koneksi transaksi tersebut. Jika pengumpulan bukti gagal, finalisasi gagal tanpa hasil sebagian.
- [ ] Final yang sudah memiliki snapshot menggunakan isi snapshot; final lama dengan snapshot null mengembalikan keadaan unavailable dan penjelasan Bukti saat finalisasi belum tersedia. Jangan membackfill bukti lama dari data saat ini. Semua sumber/link tetap diperiksa aksesnya saat dibuka/diunduh.
- [ ] Tes mencakup: kejadian di batas tanggal Jakarta, beberapa versi satu keluarga, incident tertaut dua kali, catatan setelah finalisasi, laporan berubah setelah finalisasi, akses unit lain, kegagalan pengambilan bukti rollback, dan final legacy tanpa snapshot.
- [ ] Run: `go test ./internal/usecase/risk ./internal/repository/postgres -run 'Monitoring|Evidence' -count=1` menggunakan konfigurasi database tes yang berlaku. Commit snapshot backend setelah lulus.

### Task 12: Bukti dan kesimpulan yang tidak menyesatkan

**Create:** `monitoring-evidence.tsx` dan specimen. **Modify:** frontend types monitoring, workspace assessment, `simpulan-card.tsx`, `DESIGN.md`, dan katalog.

- [ ] Tambahkan satu disclosure Bukti periode ini sebelum skor observasi: profil/skor/target sumber, laporan mitigasi, lalu kejadian terkait. Gunakan daftar dan tautan sumber yang ada, dengan ringkasan dan detail opsional. Tidak menambah grafik, KPI, tab, atau input baru.
- [ ] Tampilkan Tidak ada kejadian tercatat untuk respons kosong yang berhasil; tampilkan gagal memuat dengan Coba lagi jika request gagal. Ketiadaan bukti tidak diberi angka nol atau klaim aman.
- [ ] Pada `SimpulanCard`, pertahankan perbandingan skor yang sudah ada. Hapus baris badge Efektif/Tidak Efektif yang hanya memakai `getSimpulanEfektifitas`. Pakai label Skor menurun, Skor tetap, atau Skor meningkat sesuai hasil `resolveAssessmentScoreComparison`. Jangan mengubah rumus skor, helper efektivitas yang masih dipakai konteks lain, atau memasukkan pilihan efektivitas wajib baru.
- [ ] Ringkasan finalisasi yang ada tetap menjelaskan laporan kosong menjadi Tidak dilaporkan dan hasil dikunci. Draf menampilkan waktu bukti diambil serta satu refresh bila diperlukan; final menampilkan waktu snapshot dan sumber terkini secara terpisah. Final legacy memakai keadaan unavailable Task 11.
- [ ] Run frontend typecheck/lint file berubah dan backend tes finalisasi yang relevan. Review dengan dataset: mitigasi dilaporkan tetapi skor naik, skor tetap dengan kendala, tidak ada kejadian, serta bukti tidak tersedia. Commit tahap pemantauan setelah konsisten dengan katalog.

## Verifikasi akhir dan review mandiri

- [ ] Cocokkan setiap butir spec ke Task 1–12. Catat ketidaksesuaian kalender frontend/backend dari Task 1 sebagai batas yang dipertahankan, bukan hasil perbaikan baru.
- [ ] Run `git diff --check`. Dari backend jalankan `go test ./...` dan `go vet ./...`; dari frontend jalankan tes domain yang berubah, `npx tsc --noEmit`, lint yang sesuai, lalu build produksi sekali setelah seluruh tahap terintegrasi. Jangan mengulang build penuh tanpa perubahan atau temuan baru.
- [ ] Lakukan review interaksi dengan akun operator: login → antrean → laporan → kembali; catat kejadian tanpa risiko → tambah catatan; mulai pemantauan → baca bukti → finalisasi. Ulangi jalur izin dengan unit berbeda dan peran lain. Jika akun/runtime tidak tersedia, laporkan jalur yang belum diuji secara eksplisit.
- [ ] Review kesederhanaan: satu daftar tugas, satu aksi per baris, satu form catatan, satu disclosure bukti, tanpa menu/filter/status/field baru di luar spec. Hapus elemen yang tidak diperlukan untuk tugas tersebut.
- [ ] Pastikan `DESIGN.md` dan katalog memakai komponen produksi yang sama. Konfirmasikan sinkronisasi keduanya kepada pengguna dalam laporan hasil implementasi.
- [ ] Commit hanya file pekerjaan ini. Laporan akhir membedakan tahap yang selesai, hasil tes, batas pengujian interaksi, dan perubahan perilaku pengguna. Jangan menyatakan usability terbukti sebelum diuji dengan operator.

## Pemeriksaan rencana

Peta cakupan: halaman awal/navigasi → Task 4–6; tanggung jawab/eligibility/izin → Task 1–3; konteks dan hasil simpan → Task 5/8; arti pelaporan → Task 7; koreksi kejadian → Task 9–10; bukti/histori/perubahan skor → Task 11–12. Semua tahap mempertahankan batas kesederhanaan pengguna. Plan disusun untuk implementasi bertahap; belum ada kode aplikasi atau migrasi yang diterapkan saat penulisan dokumen ini.


## Hasil pelaksanaan — 26 Oktober 2026

- Tahap 1–4 telah diimplementasikan pada branch `codex/operator-risk-flow` dalam worktree terisolasi.
- Implementasi mengikuti bentuk UI sederhana: satu antrean, satu form catatan, satu disclosure bukti, tanpa tab/filter/KPI tambahan.
- Query kandidat memakai satu statement SQL dengan snapshot baca yang konsisten; tidak diperlukan transaksi baca multi-query atau tabel tugas baru. Draf pemantauan yang sudah ada dibaca lintas periode, sedangkan calon pemantauan baru mengikuti periode yang dapat dipilih.
- Catatan belum disimpan dan identitas retry dipulihkan dari penyimpanan tab yang dipisahkan per pengguna/kejadian. Simpan/Batal menghapus draf; tautan keluar dan unload memberi peringatan. Browser Back/Forward telah diuji dengan draf catatan.
- Migrasi `000075_operator_lifecycle_evidence` menambahkan catatan dan snapshot. Migrasi up/down/up diuji pada database sementara berisi salinan skema tanpa data pengguna; database aplikasi utama tidak dimigrasikan. Server dan database fixture dibersihkan sesudah uji.
- Tes backend pada paket operator_work, risk_event, risk, mitigation_task, handler/http, service/pdfreport, dan repository/postgres lulus. Tes integrasi terisolasi lulus untuk eligibility, organisasi, retry catatan, konflik isi, bukti final, serta draf pemantauan lama.
- Sebanyak 17 tes frontend terkait lulus. Pemeriksaan tipe kode produksi dan lint komponen baru/diubah lulus. Build produksi diverifikasi memakai webpack karena Turbopack menolak symlink dependency lintas checkout.
- Pemeriksaan browser dengan akun fixture: tujuan login operator, membuka draf dari antrean, mencatat kejadian tanpa risiko, menyimpan catatan tambahan, pemulihan draf melalui Back/Forward, mulai pemantauan dari antrean, serta finalisasi sampai bukti terkunci telah diperiksa.
- Review independen menemukan tiga P2 (draf lama hilang, link hasil simpan tidak spesifik, dan catatan belum disimpan dapat hilang); ketiganya diperbaiki dan diperiksa ulang tanpa temuan material baru.
- Suite Go menyeluruh masih gagal pada pengujian lama AI/approval/report; kegagalan yang sama dikonfirmasi pada checkout awal. `go vet ./...` juga melaporkan unreachable code lama di approval. Pemeriksaan tipe seluruh proyek mencakup fixture tes lama yang masih memiliki error. Perbaikan modul tersebut berada di luar perubahan ini.
- `DESIGN.md` dan katalog menggunakan komponen produksi untuk antrean, hasil finalisasi, catatan kejadian, dan bukti pemantauan.

- Build juga menemukan empat forwarder `.mjs` lama yang merujuk kembali ke modulnya sendiri. Referensi dibuat eksplisit ke `.ts`; smoke test ekspor modul lulus tanpa menambah dependency.

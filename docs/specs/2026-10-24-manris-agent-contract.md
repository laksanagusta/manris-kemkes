# Kontrak implementasi Manris Agent

Kontrak internal implementasi; melengkapi spesifikasi produk pada tanggal yang sama.

## HTTP

Semua rute di bawah prefix API `/agent`, terautentikasi sebagai pengguna Manris. Respons memakai envelope `{data: ...}`. Semua akses privat dan `Cache-Control: no-store`.

| Metode | Rute | Input | Data respons |
| --- | --- | --- | --- |
| GET | `/skills` | — | `Skill[]` |
| GET | `/conversations` | — | `Conversation[]` |
| POST | `/conversations` | `{title?: string}` | `Conversation` |
| GET | `/conversations/:id` | — | `ConversationDetail` |
| POST | `/conversations/:id/messages` | `{content: string, skills: string[], attachmentIds: string[], idempotencyKey?: string}` | `Run` |
| GET | `/conversations/:id/messages/:messageId/export` | `format=xlsx atau pdf` | berkas snapshot jawaban setelah pemeriksaan akses terkini |
| POST | `/conversations/:id/attachments` | multipart `file`, `idempotencyKey?` | `Attachment` |
| POST | `/conversations/:id/runs/:runId/cancel` | `{}` | 204 |
| PUT | `/conversations/:id/proposals/:proposalId` | `{revision: number, operations: Operation[]}` | `Proposal` |
| POST | `/conversations/:id/proposals/:proposalId/apply` | `{revision: number, idempotencyKey: string}` | `Proposal` |
| POST | `/conversations/:id/proposals/:proposalId/reject` | `{revision: number}` | `Proposal` |

Kode error mengikuti HTTP: 400/422 input, 401 sesi, 403 akses, 404 objek privat tidak ditemukan, 409 run aktif/paket stale/revisi berubah, 503 AI belum tersedia. Jangan membocorkan error provider atau SQL ke klien.

## DTO (JSON camelCase)

```
Skill {id, name, description} // IDs: risks, mitigations, incidents, reports
Conversation {id, title, status, createdAt, updatedAt}
ConversationDetail {conversation, messages: Message[], runs: Run[], proposals: Proposal[]}
Message {id, conversationId, runId?, role, content, widgets: Widget[], attachments: Attachment[], createdAt}
Attachment {id, name, mimeType, size, warnings?: string[], createdAt}
Run {id, conversationId, status, events: Activity[], startedAt?, finishedAt?, error?}
Activity {id, label, status, createdAt}
Widget {id, type, title, description?, snapshotAt, scopeLabel?, columns?: Column[], rows?: Row[], metrics?: Metric[], sourceIds?: string[]}
Column {key, label}
Row = Record<string, string | number | boolean | null> // optional href, validated application-relative link
Metric {label, value: string | number, description?}
Proposal {id, conversationId, runId, revision, status, title, operations: Operation[], createdAt, appliedAt?, receipt?: ReceiptItem[]}
Operation {id, kind, targetId?, title, reason?, included, before?, after: Record<string, unknown>, expectedUpdatedAt?, organizationId?}
ReceiptItem {operationId, title, href?}
```

`Widget.type`: `table`, `metrics`, `bar_chart`, `document`, `clarification`. `role`: `user`, `assistant`. `Run.status`: `queued`, `running`, `waiting_for_input`, `waiting_for_confirmation`, `completed`, `failed`, `cancelled`. `Proposal.status`: `proposed`, `applying`, `applied`, `rejected`, `stale`, `failed`.

Klien membaca detail aktif setiap 2 detik, menghentikan polling jika tidak ada run queued/running, membersihkan timer, dan mengabaikan respons dari rute/sesi lama. Hasil historis tidak diganti diam-diam. Perbarui mengirim permintaan baru dengan konteks percakapan yang sama. Kunci idempotensi pesan/unggahan dipertahankan saat retry; kunci yang sama dengan isi berbeda ditolak.

## Backend boundaries

Package application `backend/internal/agent`: DTO, store interface, service, persistent run worker, skill registry, bounded model/tool loop. Concrete PostgreSQL store separate. Domain tools in `backend/internal/agenttools`, implemented against existing domain services/repos. Handler and dependency wiring owned separately.

Toolkit contract (diimplementasikan domain adapter):

```go
type Toolkit interface {
    Context(ctx context.Context, actor uuid.UUID) (string, error)
    Authorize(ctx context.Context, actor uuid.UUID, organizationIDs []uuid.UUID) error
    Definitions(skills []string) []ToolDefinition
    Execute(ctx context.Context, actor uuid.UUID, name string, args json.RawMessage) (ToolResult, error)
    ValidateOperations(ctx context.Context, actor uuid.UUID, operations []Operation) ([]Operation, error)
    Apply(ctx context.Context, tx pgx.Tx, actor uuid.UUID, operations []Operation) ([]ReceiptItem, error)
}
type ToolDefinition struct {Name, Description string; Parameters json.RawMessage}
type ToolResult struct {Content string; Widgets []Widget; Operations []Operation; OrganizationIDs []uuid.UUID}
```

Tool results persist organization scope internally for current-access checks; this internal scope is not user-editable. Every run rechecks current actor access. Store apply transaction owns proposal row lock, revision binding, idempotency, state/audit consistency, and all toolkit writes through the supplied pgx.Tx. Toolkit does not expose generic database/API writes to the model.

Attachment extraction validates the existing PDF/XLSX 1 MB policy and stores private extracted text as conversation metadata. Application service exposes private attachment insertion/retrieval for the handler; raw credentials are never persisted. No business changes before apply endpoint.


## Operasi dan analisis yang tersedia

- Risiko: `create_risk`, `patch_risk` (draf), `reassess_risk` (memulai transaksi pemantauan kanonis).
- Mitigasi: `add_mitigation`, `patch_mitigation`, `report_mitigation_task`. Laporan tugas mengikuti Penanganan: `after` hanya memuat `notes` (wajib 10–1000 karakter) dan `evidenceUrl` (opsional, satu URL HTTP/HTTPS). Status otomatis `done` saat penerapan; tidak ada isian terpisah untuk output, hambatan, atau status. Catatan dapat menjelaskan pencapaian maupun kendala. Usulan lama dengan bidang tambahan perlu disusun ulang.
- Pemantauan: `get_risk_monitoring`, `patch_monitoring` pada draf aktif; finalisasi/tanda tangan tetap di halaman aplikasi. `values` menggabungkan bidang yang disebut dengan draf tersimpan; semua ID mitigasi aktual harus dipertahankan. Persentase penyelesaian tidak boleh ditimpa manual jika sudah dihitung dari tugas.
- Kejadian: `create_risk_event`, `link_risk_event` untuk menambah relasi; isi kejadian tetap immutable.
- Laporan: `quarterly_report`, `list_report_units`, `analyze_report`. Analisis ad hoc memakai seluruh snapshot kanonis dan perhitungan aplikasi. Pengelompokan organisasi/kategori/tingkat; metrik jumlah profil, risiko tinggi, di atas selera, tugas terlambat, dan kejadian. Metrik tugas/kejadian hanya per organisasi; nilai pembanding kejadian yang tidak dimuat tetap tidak tersedia. `high_risks` mencakup tinggi dan sangat tinggi, sehingga tidak menerima filter `level` tambahan; satu tingkat spesifik menggunakan `risks` + `level`.

Ekspor memakai jawaban dan widget tersimpan; tidak menghitung ulang data bisnis. Refresh membuat pesan dan snapshot baru. Hak akses percakapan dan organisasi diperiksa kembali saat membaca atau mengunduh.

## Batas dan konfigurasi

Maksimal 100 pesan atau 50 pekerjaan per percakapan; 20 lampiran sepanjang percakapan, 5 per pesan, masing-masing PDF/XLSX maksimal 1 MB. Teks pesan maksimal 16.000 byte, paket maksimal 30 operasi. Pembatasan ekstraksi/konteks diberitahukan kepada pengguna dan model. Riwayat lengkap tetap disimpan; konteks model dibatasi dengan menjaga permintaan pertama/terbaru serta batasan terkini.

Migrasi `000073_agent_runtime` menambahkan penyimpanan percakapan, antrean worker, dan pengaturan `ai.model.agent`. Model mengikuti pengaturan khusus Agent, lalu `OPENAI_MODEL_AGENT`, lalu model standar aplikasi. `OPENAI_API_KEY` tetap di server. Batas bawaan: `AGENT_WORKERS=2`, `AGENT_MAX_STEPS=12`, `AGENT_MAX_TOOLS=32`, `AGENT_TIMEOUT_SECONDS=300`; konfigurasi memiliki batas atas.


## Konteks piagam untuk draf risiko

Setiap run memuat proyeksi piagam risiko aktif, versi saat ini, organisasi akun, dan tahun Jakarta berjalan melalui usecase Piagam yang sama. Proyeksi memuat ruang lingkup, dasar hukum, konteks internal/eksternal, dan pemangku kepentingan; struktur personal UPR dan identitas pembuat/pengesah tidak dikirim. Akses tetap organisasi asal, termasuk superadmin. Konten ditempatkan sebagai data aplikasi tidak tepercaya, terpisah dari instruksi sistem.

Skill risiko menyediakan `get_risk_charter_context(year)` untuk tahun berbeda atau penyegaran. Konteks dibatasi 100 piagam dalam pembacaan dan 16 KB JSON; data berlebih tidak dipotong diam-diam, melainkan ditandai `too_large`. Jika tidak ada piagam aktif tahun terkait, status `unavailable` disertai penjelasan. Agent tidak boleh menganggap piagam draf/arsip/tahun lain sebagai landasan aktif.

Saat pengguna meminta Agent merumuskan sejumlah draf baru, Agent menggunakan konteks piagam dan menjaga jumlah yang diminta, tanpa mewajibkan judul dari pengguna. Hubungan draf dengan piagam dijelaskan singkat pada alasan usulan. Hasil tetap kandidat risiko yang perlu ditinjau, bukan kejadian faktual atau data yang sudah disimpan.

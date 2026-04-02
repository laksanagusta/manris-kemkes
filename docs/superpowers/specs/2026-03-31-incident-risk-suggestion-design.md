# Incident Risk Suggestion Design

## Goal

Menambahkan fitur `Generate suggestion` pada form insiden manual agar user bisa mendapatkan daftar risiko existing yang paling terkait atau terdampak berdasarkan data insiden, lalu memilih risiko yang akan ditautkan ke insiden.

## Scope

- Berlaku untuk mode input manual di `frontend/src/app/(app)/incidents/new/page.tsx`.
- Input minimum untuk generate suggestion: `what`, `who`, `where`, `when`, `severity`.
- Input opsional yang ikut dikirim untuk meningkatkan kualitas match: `title`, `whyHow`, `organizationId`.
- Output memakai struktur suggestion yang sama dengan flow batch extraction: `riskId`, `riskCode`, `riskTitle`, `reason`, `confidence`.
- AI hanya memberi saran; user tetap memilih risiko final yang akan ditautkan.

## Backend Design

- Tambah request entity baru untuk manual incident risk suggestion.
- Tambah method baru di `AIRepository` untuk menghasilkan suggestion dari satu insiden manual.
- Tambah use case baru di `backend/internal/usecase/ai/` untuk:
  - validasi field minimum,
  - normalisasi severity,
  - meneruskan request ke repository AI.
- Tambah endpoint baru di `backend/internal/handler/http/ai.go` dan registrasi route di `backend/cmd/server/main.go`.
- Repository OpenAI memuat daftar risiko existing non-draft untuk organisasi terkait, lalu meminta model memilih top match dengan alasan dan confidence.

## Frontend Design

- Tambah state baru untuk form manual:
  - `manualRiskSuggestions`
  - `isGeneratingRiskSuggestions`
  - `manualSuggestionStale`
- Tambah tombol `Generate suggestion` di panel `Risiko terkait`.
- Tombol hanya aktif jika field minimum sudah lengkap.
- Hasil suggestion ditampilkan di atas pencarian risiko manual dan bisa ditoggle ke `manualLinkedRiskIds`.
- Jika field inti berubah setelah suggestion dibuat, hasil lama tetap tampil tetapi diberi status stale agar user tahu perlu generate ulang.

## Error Handling

- Jika AI gagal, tampilkan toast dan biarkan flow manual search tetap bisa dipakai.
- Jika tidak ada suggestion relevan, tampilkan empty state yang jelas.
- Perubahan pada field manual tidak menghapus risiko yang sudah dipilih user.

## Verification

- Tambah unit test backend untuk validasi input dan normalisasi request.
- Jalankan `go test` pada package AI use case.
- Jalankan verifikasi frontend lewat `npm run build` agar perubahan TypeScript tervalidasi.

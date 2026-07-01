# Working Papers Page Gap Alignment

## Goal

Samakan jarak vertikal utama halaman Kertas Kerja dengan halaman Register Risiko.

## Scope

- Ubah wrapper utama `frontend/src/app/(app)/risk/working-papers/page.tsx` dari `space-y-8` menjadi `space-y-4`.
- Pertahankan `max-w-7xl`, `mx-auto`, dan `animate-fade-in`.
- Jangan mengubah gap internal pada header, kartu ringkasan, filter, tabel, dialog, atau pagination.

## Expected Result

Jarak antarseksi utama halaman Kertas Kerja menggunakan skala 1rem yang sama dengan halaman Register Risiko, tanpa perubahan perilaku atau struktur komponen.

## Verification

- Pastikan wrapper utama kedua halaman memakai `space-y-4`.
- Jalankan pemeriksaan lint frontend untuk memastikan perubahan TSX tidak menimbulkan masalah.

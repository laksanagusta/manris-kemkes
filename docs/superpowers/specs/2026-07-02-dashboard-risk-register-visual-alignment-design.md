# Dashboard and Risk Register Visual Alignment

## Goal

Selaraskan bahasa visual Dashboard dengan halaman Daftar Risiko tanpa mengubah data, visualisasi, atau perilaku dashboard.

## Scene and Register

Dashboard digunakan staf kementerian pada layar kerja terang untuk memantau kondisi risiko organisasi. Register yang digunakan adalah `product` dengan strategi warna restrained: permukaan terang, neutral bertint teal, dan warna kuat hanya untuk status atau tren bermakna.

## Page Shell

- Gunakan wrapper `space-y-4` yang sama dengan Daftar Risiko.
- Gunakan judul `text-2xl font-semibold tracking-tight`.
- Pertahankan deskripsi dashboard, status Live, dan waktu pembaruan.
- Gunakan token tema, tanpa warna putih/zinc hard-coded atau animasi dekoratif.

## KPI Cards

- Pertahankan empat KPI, nilai, tren, dan perbandingan siklus.
- Gunakan grid empat kolom dengan gap 4.
- Setiap KPI memakai container visual yang sama dengan KpiCard Daftar Risiko: tinggi minimum 96px, `rounded-2xl`, `bg-card`, `shadow-none`, dan `ring-border`.
- Tren tetap terlihat sebagai metadata ringkas; hilangkan menu ellipsis yang tidak memiliki aksi.

## Dashboard Panels

- Pertahankan Multi-Phase Heatmap dan Unit Total Risk Score Chart.
- Selaraskan outer card menjadi `rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border`.
- Gunakan judul `text-base font-medium`, deskripsi `text-sm text-muted-foreground`, dan padding 4.
- Hilangkan `backdrop-blur`, opacity card, dan border treatment yang berbeda dari Daftar Risiko.
- Pertahankan warna data chart dan heatmap karena warna tersebut membawa makna.

## CTA Panel

- Pertahankan tautan Monitoring dan Reports.
- Gunakan card datar yang sama dengan Daftar Risiko.
- Gunakan tombol outline dan primary dengan `shadow-none`.
- Pertahankan copy dan route saat ini.

## Loading and Responsive Behavior

- Pertahankan alur loading saat ini, tetapi gunakan token tema dan spacing halaman yang konsisten.
- KPI menjadi satu kolom pada mobile, dua pada layar kecil, dan empat pada layar besar.
- Header serta CTA harus dapat wrap tanpa overflow.

## Files

- `frontend/src/app/(app)/overview/page.tsx`
- `frontend/src/app/(app)/overview/_components/unit-total-risk-score-chart.tsx`
- `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`

## Functional Constraints

- Tidak mengubah endpoint, state, perhitungan KPI, chart data, heatmap data, route, atau handler.
- Tidak menambah visualisasi atau card baru.
- Tidak mengubah komponen di halaman lain yang tidak dirender langsung oleh Dashboard.

## Verification

- Jalankan ESLint pada ketiga file.
- Jalankan full frontend lint dan pastikan tidak ada error baru.
- Periksa diff untuk memastikan perubahan bersifat presentasional.

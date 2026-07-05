# Working Papers and Risk Register Visual Alignment

## Goal

Samakan layout dan bahasa visual halaman Kertas Kerja dengan halaman Register Risiko tanpa mengubah data, fungsi, atau konten khusus Kertas Kerja.

## Layout

- Wrapper utama Kertas Kerja memakai `space-y-4` tanpa `max-w-7xl mx-auto`, sehingga lebar dan gap kiri-kanannya mengikuti container aplikasi yang sama dengan Register Risiko.
- Header halaman mempertahankan judul, deskripsi, dan tombol Buat Kertas Kerja.
- Tombol menggunakan treatment tanpa shadow dekoratif agar konsisten dengan tombol utama Register Risiko.

## KPI Cards

- Pertahankan lima KPI: Total, Draft, Proses TTE, Selesai, dan Dibatalkan.
- Gunakan grid responsif yang tetap menampilkan lima kartu pada layar lebar.
- Terapkan visual KpiCard Register Risiko: tone putih, `gap-4`, tinggi minimum 96px, label normal, dan angka medium.

## List Card and Toolbar

- Pindahkan search dan tombol filter dari luar card ke header card Daftar Kertas Kerja.
- Header card berisi judul dan deskripsi di kiri, toolbar search/filter di kanan.
- Jumlah kertas kerja tetap tersedia sebagai metadata ringkas tanpa mengganggu toolbar.
- Gunakan container `rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border`.

## Table and States

- Pertahankan seluruh kolom dan data Kertas Kerja.
- Selaraskan header, row, cell spacing, warna border, warna teks, hover, dan badge dengan tabel Register Risiko.
- Pertahankan card list mobile, tetapi gunakan token warna tema (`border`, `background`, `muted`, `foreground`) agar konsisten.
- Loading, empty, dan error state tetap berfungsi dan mengikuti token visual Register Risiko.

## Pagination

- Gunakan border dan token warna tema.
- Samakan selector jumlah baris serta tombol halaman aktif/sebelumnya/berikutnya dengan pagination Register Risiko.
- Pertahankan perhitungan halaman dan handler saat ini.

## Functional Constraints

- Tidak mengubah API, query, filter state, dialog, route, atau data mapping.
- Tidak mengubah jumlah KPI atau kolom tabel.
- Search dan filter harus tetap mengatur ulang halaman ke halaman pertama.

## Verification

- Jalankan ESLint pada file Kertas Kerja.
- Jalankan full frontend lint dan pastikan tidak ada error baru.
- Periksa diff untuk memastikan perubahan terbatas pada presentasi halaman Kertas Kerja dan dokumentasi.

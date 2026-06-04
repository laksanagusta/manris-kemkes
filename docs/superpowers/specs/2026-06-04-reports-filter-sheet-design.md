# Reports Filter Sheet Design

## Summary

Redesign filter scope pada halaman Analisis Risiko (`/reports`) agar tidak selalu
memakan ruang vertikal halaman. Filter dibuka melalui tombol `Filter`, ditampilkan
dalam shadcn `Sheet` dari kanan, dan baru diterapkan setelah user menekan
`Terapkan Filter`.

Perubahan ini hanya berlaku untuk halaman Analisis Risiko. Halaman report lain
yang menggunakan `ReportScopePicker` tidak ikut berubah.

## Goals

- Mengurangi kepadatan tampilan awal halaman Analisis Risiko.
- Menyediakan area yang cukup untuk pemilihan group dan multiple unit.
- Mencegah request report berulang selama user masih menyusun pilihan filter.
- Menampilkan scope aktif secara ringkas setelah Sheet ditutup.

## Non-Goals

- Tidak mengubah endpoint atau kontrak backend report.
- Tidak mengubah filter pada halaman report lain.
- Tidak memindahkan state filter ke URL query.
- Tidak mengubah behavior pencarian group dan unit yang sudah memakai debounce
  500ms.

## Interaction Model

### Closed State

- Card filter yang selalu terlihat dihapus dari halaman.
- Di bawah header halaman terdapat tombol outline `Filter`.
- Tombol menampilkan badge jumlah unit aktif, misalnya `12 unit`.
- Badge menampilkan `0 unit` jika belum ada unit aktif.

### Open State

- Klik tombol `Filter` membuka shadcn `Sheet` dari sisi kanan.
- Sheet memiliki title `Filter Laporan` dan deskripsi singkat bahwa filter baru
  diterapkan setelah user menekan tombol penerapan.
- Field disusun vertical dengan urutan:
  1. `Group`
  2. `Unit`
- Field `Unit` tetap menggunakan multiple combobox dengan chips.
- Memilih group mengganti seluruh draft unit dengan anggota group tersebut.
- Mengganti group membuang seluruh draft unit dari group sebelumnya.
- User dapat menghapus sebagian unit dari pilihan group sebelum menerapkan
  filter.

### Footer Actions

- `Reset`: mengembalikan draft ke scope default user.
- `Batal`: menutup Sheet dan membuang seluruh perubahan draft.
- `Terapkan Filter`: menyalin draft menjadi filter aktif, menutup Sheet, lalu
  memuat ulang data report.

## State Model

Halaman mempertahankan dua lapisan state:

- **Applied state**: state yang digunakan untuk membangun query dan memuat data
  report.
- **Draft state**: state sementara yang hanya digunakan di dalam Sheet.

Saat Sheet dibuka, draft disalin dari applied state. Perubahan group atau unit
hanya mengubah draft. Applied state hanya berubah ketika `Terapkan Filter`
diklik.

Saat `Batal` atau close button Sheet digunakan, draft dibuang. Saat Sheet dibuka
lagi, draft kembali disalin dari applied state.

## Default Scope Reset

`Reset` harus mengikuti aturan akses user:

- User global: group kosong dan unit kosong, sehingga report menggunakan seluruh
  scope yang dapat diakses.
- User non-global dengan default organization yang valid: group kosong dan unit
  berisi organization default user.
- User yang wajib memilih scope tetapi tidak memiliki default valid: group dan
  unit kosong.

Reset hanya mengubah draft. User tetap harus menekan `Terapkan Filter` untuk
memperbarui report.

## Component Design

### Page-Level Filter Trigger

`reports/page.tsx` bertanggung jawab atas:

- applied filter state;
- draft filter state;
- open/close state Sheet;
- reset, cancel, dan apply behavior;
- badge jumlah unit aktif;
- query report berdasarkan applied unit IDs.

### Sheet Content

Sheet menggunakan komponen shadcn:

- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`,
  `SheetDescription`, dan `SheetFooter`;
- `Button` untuk aksi footer;
- `Badge` untuk jumlah unit aktif pada tombol filter;
- `Separator` bila dibutuhkan antara content dan footer.

`ReportScopePicker` digunakan di dalam Sheet dengan orientasi vertical. Untuk
menjaga scope perubahan tetap sempit, komponen menerima opsi layout vertical
atau dibungkus melalui konfigurasi layout yang eksplisit, tanpa mengubah default
layout pada consumer lain.

## Data Flow

1. Halaman selesai memuat organisasi dan group.
2. Applied state diinisialisasi mengikuti aturan default scope yang sudah ada.
3. User membuka Sheet.
4. Applied state disalin ke draft state.
5. User mengubah group dan unit secara vertical di Sheet.
6. Tidak ada query report baru selama draft berubah.
7. User menekan `Terapkan Filter`.
8. Draft state disalin ke applied state.
9. Sheet ditutup.
10. Existing report effects berjalan ulang menggunakan applied unit IDs.

## Error Handling

- Jika organisasi dan group gagal dimuat, tombol filter tetap terlihat tetapi
  disabled ketika tidak ada pilihan yang tersedia.
- Sheet tidak mengubah applied state ketika ditutup tanpa penerapan.
- Existing error handling untuk request report tetap digunakan.

## Responsive Behavior

- Sheet muncul dari kanan pada desktop dan mobile.
- Lebar desktop cukup untuk multiple combobox chips, dengan batas maksimum yang
  tidak menutup seluruh halaman.
- Field Group dan Unit selalu vertical di semua breakpoint.
- Footer actions dapat wrap atau stack pada layar sempit.

## Accessibility

- Tombol trigger memiliki label jelas `Filter`.
- `SheetTitle` selalu tersedia.
- Badge jumlah unit tidak menjadi satu-satunya informasi tentang fungsi tombol.
- Tombol footer menggunakan label teks eksplisit.
- Close button Sheet mengikuti behavior bawaan shadcn.

## Testing

- Verifikasi Sheet tertutup pada render awal.
- Verifikasi klik tombol membuka Sheet.
- Verifikasi perubahan draft tidak langsung mengubah applied query.
- Verifikasi `Batal` membuang draft.
- Verifikasi `Reset` mengembalikan draft ke default scope user.
- Verifikasi `Terapkan Filter` memperbarui applied state dan menutup Sheet.
- Verifikasi Group dan Unit tersusun vertical.
- Jalankan ESLint, TypeScript check, dan production build frontend.

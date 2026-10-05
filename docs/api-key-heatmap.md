# Integrasi heatmap dengan API key

MVP menggunakan endpoint yang sudah ada: `GET /api/v1/dashboard/heatmap`.
Autentikasi JWT untuk aplikasi Manris tetap tersedia. Integrasi antarserver
mengirim header `X-API-Key`. Key hanya berlaku untuk endpoint GET ini.

## Pengelolaan

Di **Pengaturan → API key**, setiap pengguna aktif dengan sesi penuh dapat
mengelola satu key bersama untuk organisasinya sendiri. Super admin dapat
memilih organisasi. Data tidak mencakup organisasi turunan.

- **Generate** hanya berhasil jika organisasi belum mempunyai key.
- **Regenerate** mengganti key secara atomik; key lama langsung ditolak untuk
  permintaan berikutnya. Permintaan yang telah diautentikasi dapat selesai.
- Key lengkap hanya dikirim pada respons generate/regenerate dan ditampilkan
  sekali. Simpan di server integrasi. Server Manris menyimpan hash SHA-256
  dari secret acak 256-bit, bukan secret yang bisa dibaca kembali.
- Setelah menutup pengaturan, berpindah menu/organisasi, atau memilih
  **Sudah disimpan**, hanya prefix tersamarkan yang ditampilkan.
- Tidak ada kedaluwarsa otomatis. Perubahan key dicatat bersama pelakunya.
- Generate bersamaan dan regenerate atas versi key yang sudah berubah
  menghasilkan `409`; muat ulang sebelum mencoba kembali.

## Permintaan

```sh
curl 'https://<HOST_MANRIS>/api/v1/dashboard/heatmap?cycle=2026-Q1' \
  -H 'X-API-Key: <API_KEY_ORGANISASI>'
```

`cycle` opsional, dengan format `YYYY-Q1` sampai `YYYY-Q4`. Tanpa `cycle`,
perhitungan heatmap yang sudah ada menggunakan triwulan berjalan berdasarkan
UTC. Parameter organisasi tidak dapat memperluas akses yang dikunci pada key.
Jika header JWT dan `X-API-Key` keduanya dikirim, autentikasi API key berlaku.

Respons mempertahankan format endpoint yang ada:

```json
{"data": [[0,0,0,0,0],[0,2,0,0,0],[0,0,1,0,0],[0,0,0,3,0],[0,0,0,0,0]]}
```

`data[probabilitas - 1][dampak - 1]` adalah jumlah risiko. Matriks selalu 5×5,
termasuk sel nol. Kriteria pemilihan risiko dan snapshot mengikuti query
dashboard Manris yang sudah ada.

## Batas dan kesalahan

Batas **60 permintaan per menit per organisasi** menggunakan jendela tetap
60 detik di PostgreSQL, dibagi seluruh server dan integrasi organisasi.
Regenerate tidak mereset kuota. Permintaan terautentikasi, termasuk permintaan
dengan periode tidak valid, memakai kuota. Key tidak valid tidak memakai kuota.

| Status | Arti |
| --- | --- |
| 400 | Format periode tidak valid |
| 401 | Key tidak valid atau telah diganti |
| 429 | Batas tercapai; tunggu sesuai header `Retry-After` (detik) |
| 500 | Kesalahan internal; jangan melakukan retry terus-menerus |

Respons key dan heatmap integrasi memakai `Cache-Control: no-store`.

## Endpoint Pengaturan (JWT sesi penuh)

- `GET /api/v1/organization-api-key` → metadata atau `{"data": null}`.
- `POST /api/v1/organization-api-key/generate` → `{"data":{"key":{...},"secret":"..."}}`.
- `POST /api/v1/organization-api-key/regenerate`, body
  `{"expectedKeyId":"<id dari metadata>"}` → metadata dan secret baru.

Query `organizationId=<uuid>` diterima hanya untuk organisasi pengguna sendiri
atau organisasi yang dipilih super admin. Keanggotaan dan status pengguna
diperiksa dari database pada setiap operasi Pengaturan.

Jalankan migration **000069_organization_api_keys** sebelum menjalankan backend
yang memuat fitur ini. Tidak ada dependensi runtime baru.

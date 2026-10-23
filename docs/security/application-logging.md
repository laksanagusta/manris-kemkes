# Pengamanan log impor AI

## Aturan kode

- Jangan mencatat dokumen, prompt, respons AI, objek risiko, nama file, header autentikasi, atau pesan error mentah.
- Log permintaan AI hanya memuat fitur, model yang dikonfigurasi, ID korelasi UUID, durasi, status, dan kode error tetap.
- `ai_request_completed` menandai selesainya permintaan ke penyedia, bukan keberhasilan validasi hasil analisis. Kegagalan parsing menghasilkan `ai_analysis_failed` dengan `invalid_json`.
- Error HTTP dicatat sekali melalui helper respons bersama. Metadata dibatasi pada status, kode `http_<status>`, metode, pola route terdaftar, dan ID korelasi.
- Access logger memakai pola route (`/risks/:id`), bukan path atau query aktual. Middleware mengganti ID korelasi yang bukan UUID dengan UUID baru.
- Jangan memasukkan pesan provider/parser sebagai field error log, karena pesan tersebut dapat mengandung ulang input pengguna.

Perubahan ini mengatur pencatatan aplikasi, bukan retensi penyedia LLM. Payload dan respons API tidak diubah. Pesan error pada respons HTTP juga tidak diubah oleh pekerjaan ini; penyamaran error untuk klien memerlukan peninjauan terpisah.

## Verifikasi sebelum rilis

Pengujian regresi memakai HTTP client palsu tanpa mengirim permintaan ke OpenAI. Dokumen, respons, kredensial dummy, dan error diberi penanda sintetis. Pengujian memeriksa bahwa penanda tidak muncul di log pada skenario berhasil, gagal parsing, kegagalan penyedia, kegagalan transport, respons kosong, respons terpotong, dan filter konten.

Pengujian HTTP memeriksa detail error, data terstruktur, body, header, query, dan parameter path sintetis. Status dan format respons harus tetap kompatibel, sementara log hanya berisi metadata.

## Tindak lanjut operator setelah deployment

Perbaikan kode tidak menghapus log historis dan tidak membuktikan konfigurasi infrastruktur produksi.

1. Inventarisasi penyimpanan log: stdout/stderr container, runtime/container host, reverse proxy, pengumpul log, APM, ekspor, dan backup. Pastikan request/response body dan header sensitif tidak dicatat pada lapisan tersebut.
2. Batasi akses log ke operator yang memerlukannya dan catat perubahan izin.
3. Tentukan masa simpan, rotasi, dan penghapusan sesuai klasifikasi data serta kebijakan instansi. Catat kebutuhan preservasi bukti sebelum menghapus log.
4. Identifikasi rentang log yang dibuat sebelum perbaikan. Lakukan peninjauan di lingkungan berwenang tanpa menyalin isinya ke chat, tiket, atau repositori. Hapus hanya setelah otorisasi dan kebijakan preservasi dipenuhi.
5. Setelah versi perbaikan diterapkan, gunakan dokumen sintetis untuk memeriksa log aplikasi dan pengumpul log. Pastikan ID korelasi dapat ditelusuri dan penanda sintetis tidak muncul.
6. Simpan bukti berupa versi deployment, waktu pemeriksaan, lokasi log, hasil verifikasi, serta penanggung jawab; jangan simpan isi dokumen sebagai bukti.

Status tindakan operator harus diverifikasi pada lingkungan deployment; langkah tersebut tidak otomatis selesai melalui perubahan repositori.

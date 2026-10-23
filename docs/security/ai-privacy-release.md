# Status pengamanan AI dan persiapan rilis

## Sudah diterapkan di kode

- Logging aplikasi memakai metadata, tanpa dump prompt/respons.
- Impor menampilkan pemberitahuan layanan AI eksternal.
- Tiga mode impor tersisa memakai konteks minimum; dua mode yang dihapus tidak dapat dipanggil. Impor mitigasi otomatis memakai organisasi akun dan tugas profil risiko aktif; tidak ada input organisasi, periode, atau kode risiko.
- Impor memeriksa seluruh teks hasil ekstraksi sebelum pemotongan panjang dan memeriksa konteks tugas.
- Sembilan fitur AI selain impor memeriksa field masukan dan konteks yang dikirim. Kandidat risiko diperiksa sebelum encoding; pesan akhir diperiksa kembali pada batas pengiriman bersama.
- Penolakan merupakan error validasi HTTP 422 dengan kategori dan instruksi perbaikan. Nilai sensitif tidak dimasukkan ke error/log. Tidak ada masking, deteksi melalui LLM, atau opsi melewati pemeriksaan.
- Form risiko, picker penanganan, notulensi/transkrip, dan prediksi menampilkan pesan deteksi melalui Sonner yang sudah digunakan. Detail error penyedia lain tidak diteruskan oleh helper pesan deteksi.
- Batas pengiriman bersama selalu mengatur `Store = false`, termasuk bila pemanggil mencoba mengaktifkannya. SDK yang dipakai menghilangkan nilai false dari JSON; Chat Completions memakai default false. Ini bukan aktivasi Zero Data Retention.

Aturan masih memiliki false positive dan false negative; lihat [batas deteksi](document-ai-sensitive-data.md). Tidak ada panggilan OpenAI sungguhan dalam pengujian lokal.

## Pengaturan penyedia: belum diverifikasi pada akun

Data API tidak digunakan untuk training secara default, kecuali organisasi memilih membagikannya. `store=false` hanya mengatur stored completions; itu tidak mematikan opt-in sharing atau retensi abuse monitoring. Retensi abuse monitoring biasanya hingga 30 hari, dengan pengecualian. Zero Data Retention/Modified Abuse Monitoring memerlukan persetujuan dan memiliki batas endpoint/model. [Sumber kebijakan](https://developers.openai.com/api/docs/guides/your-data), [parameter Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).

Admin perlu mencocokkan organisasi/project pemilik API key aplikasi, memeriksa **Settings → Organization → Data controls**, memastikan opt-in sharing nonaktif, dan mencatat bukti tanpa menyalin secret. Jika sudah disetujui untuk kontrol retensi, periksa pengaturan organisasi serta override project di tab Data Retention. Kebijakan umum bukan bukti pengaturan akun aktual.

Tidak ada perubahan akun penyedia yang telah dilakukan dari workspace ini. Jangan menambahkan flag lokal seperti `TRAINING_DISABLED=true` untuk menyatakan kondisi akun yang belum diverifikasi.

## Pemeriksaan lokal sebelum rilis

Jalankan dari `backend/` dengan toolchain sesuai `go.mod`:

```sh
go test ./internal/repository/openai ./internal/service/sensitivedata -count=1
go test ./internal/service/documenttext ./internal/handler/http ./internal/usecase/ai -run 'Sensitive|Document|RiskEventExtraction|RiskEventMode' -count=1
go vet ./internal/repository/openai ./internal/service/sensitivedata ./internal/service/documenttext ./internal/usecase/ai ./internal/handler/http
go build ./cmd/server
```

Dari `frontend/`:

```sh
node --test src/lib/ai-error.test.mjs src/lib/document-processing/document-minimization.test.mjs
```

Pemeriksaan terarah ini bukan bukti seluruh suite proyek bersih. Suite penuh memiliki kegagalan lama yang terpisah; berkas test TypeScript lama juga memiliki error tipe. Typecheck sumber produksi diperiksa terpisah.

## Deployment: belum dilakukan

Compose saat ini mengambil image registry dengan tag `latest`; menjalankan ulang container saja tidak memasukkan perubahan workspace. Tentukan environment tujuan dan identitas image baru yang memuat perubahan ini, lalu build/push image melalui alur rilis yang berlaku. Catat digest image sebelumnya untuk rollback dan cocokkan digest yang benar-benar berjalan.

Sesudah rilis, gunakan akun uji dan data sintetis:

1. Jalankan satu permintaan biasa pada impor, formulir AI, dan notulensi; hasil normal tetap tersedia.
2. Gunakan email sintetis pada tiap alur tersebut; harapkan HTTP 422 dan pesan kategori tanpa nilai email.
3. Periksa log aplikasi dan pencatatan egress penyedia tanpa mencatat body: permintaan yang diblokir tidak boleh dikirim ke penyedia. Jangan memakai data nyata untuk membuktikan deteksi.
4. Uji konteks database sintetis yang sensitif, pastikan permintaan berhenti; hapus fixture setelah verifikasi.
5. Verifikasi pengaturan provider pada project produksi dan pembatasan akses aplikasi secara terpisah. Lulus deteksi tidak membuktikan semua kontrol tersebut aktif.

Rilis dinyatakan terverifikasi setelah identitas image, hasil uji, konfigurasi akun penyedia, dan pemeriksa dicatat. Dokumen ini belum menyatakan deployment produksi berhasil.

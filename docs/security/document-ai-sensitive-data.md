# Deteksi data sensitif sebelum impor AI

## Perilaku

Ketiga mode impor AI memakai pemeriksaan lokal berbasis aturan. Jika ada indikasi data sensitif yang didukung, backend menghentikan proses dan mengembalikan error validasi HTTP 422. Dokumen tidak disamarkan atau diperbaiki otomatis, tidak ada opsi melewati deteksi, dan tidak ada permintaan ke LLM untuk menentukan sensitivitasnya.

Frontend memakai keadaan gagal yang sudah tersedia. Pesan menjelaskan kategori yang terdeteksi dan langkah perbaikan, tanpa menampilkan kutipan, nilai, atau lokasi sensitif. Contoh:

> Dokumen terindikasi memuat data sensitif (email). Hapus data tersebut dari dokumen, lalu unggah kembali.

Jika sumbernya konteks database, pesan meminta pengguna memeriksa data tugas atau mempersempit cakupan, bukan mengubah dokumen yang sudah bersih. Error menggunakan kode domain `SENSITIVE_DATA_DETECTED` dan rantai validasi yang dipetakan ke HTTP 422; frontend saat ini membaca `detail` dari respons Problem Details yang sudah ada.

## Aturan awal

| Kategori | Indikasi yang diperiksa |
| --- | --- |
| Nomor identitas | Angka 16/18 digit, kelompok empat digit untuk identitas 16 digit, atau nomor dengan label NIK, NIP, NPWP, BPJS/KIS, KTP, paspor, dan KK |
| Email | Alamat email berbentuk umum; tidak ada pengecualian otomatis untuk alamat kantor atau domain publik |
| Telepon | Pola nomor seluler Indonesia, telepon tetap, serta nomor dengan label telepon/ponsel/WhatsApp, termasuk beberapa penulisan dengan pemisah |
| Rekening/kartu | Angka dengan label rekening atau kartu kredit/debit |
| Identitas pribadi/pasien | Field berisi nilai seperti nama lengkap/pasien, tanggal/tempat lahir, alamat rumah/domisili/pasien, rekam medis, diagnosis pasien; header tabel pasien tertentu juga dianggap indikasi |
| Kredensial | Field password, API key, secret/token, PIN, OTP, CVV/CVC; pola token tertentu, private key, bearer token, dan URL yang memuat username/password |
| Kerahasiaan | Penanda eksplisit seperti header RAHASIA/CONFIDENTIAL atau field klasifikasi rahasia; pembahasan umum tentang kerahasiaan tidak otomatis ditolak |

Pemeriksaan menormalkan karakter lebar penuh, beberapa set digit Unicode, spasi Unicode, serta karakter zero-width/bidi tertentu hanya untuk pencocokan. Teks asli tidak diubah. Nilai field yang kosong, berupa tanda penyamaran, atau placeholder tertentu tidak diperlakukan sama dengan nilai terisi.

## Lokasi pemeriksaan

1. Setelah ekstraksi PDF/XLSX, sebelum batas panjang teks diterapkan. Indikasi pada bagian akhir dokumen tetap dapat memblokir impor walaupun bagian itu tidak akan masuk ke prompt.
2. Pada use case impor, sebelum memuat konteks tugas dan sebelum memanggil repository AI. Pemanggil internal tidak dapat melewati deteksi hanya dengan menyediakan teks langsung.
3. Pada lima field konteks mitigasi yang diizinkan. ID tugas diverifikasi sebagai UUID teknis; judul/kode risiko, aksi, dan periode diperiksa sebagai teks. Tidak ada pemuatan kembali catatan atau pemilik tugas yang sudah dikecualikan oleh minimisasi.
4. Di batas repository OpenAI sebelum panggilan eksternal. JSON konteks harus sesuai schema, tidak memiliki field tidak dikenal, dan tidak memiliki data tambahan setelah array. Seluruh token string dibaca dalam bentuk terurai, termasuk nilai awal pada key JSON duplikat, agar nilai ter-escape atau tertimpa tidak luput sementara masih ada di prompt asli.

Tidak ada nilai hasil pencocokan yang disimpan di error atau log. Log error HTTP tetap hanya berisi metadata sesuai kebijakan logging aplikasi.

## Batas kemampuan

Deteksi ini bukan klasifikasi semantik menyeluruh atau jaminan bahwa semua data sensitif akan dikenali. Nama dalam kalimat bebas, informasi medis tanpa penanda identitas, penulisan yang belum didukung, data terenkode, serta kegagalan ekstraksi/OCR dapat luput. Dokumen pindai tanpa teks tetap mengikuti penolakan dokumen tidak terbaca yang sudah ada; fitur ini tidak menambahkan OCR atau mengirim gambar untuk analisis.

False positive juga mungkin terjadi, misalnya angka panjang yang bukan identitas, kontak kantor yang memang boleh dibagikan, contoh kredensial, atau header tabel pasien kosong. Pengguna perlu memeriksa dan memperbaiki sumber; aturan tidak menyatakan bahwa nomor yang terdeteksi valid atau benar-benar milik seseorang.

Pemeriksaan impor berlaku pada dokumen dan konteks yang dikirim olehnya. Fitur AI lain kini juga memeriksa field sumber, konteks organisasi, dan field kandidat risiko yang dikirim sebelum penyusunan prompt, serta pesan akhir pada batas pengiriman bersama. Fitur tersebut mencakup penyebab, dampak, mitigasi, notulensi, transkrip, prediksi, saran risiko, ekstraksi insiden, dan saran risiko insiden. Penolakan memakai pesan “Permintaan AI terindikasi memuat data sensitif”, tanpa meminta unggah ulang untuk masukan formulir. Ini tidak menggantikan kebijakan klasifikasi data, pembatasan akses, atau pengaturan retensi penyedia.

Pemeriksaan tambahan tidak menyamakan minimisasi konteks semua fitur dengan impor. Cakupan query database dan kebutuhan konteks fitur lama tetap perlu ditinjau tersendiri; pemeriksaan pola tidak membuktikan bahwa akses lintas organisasi atau semua informasi bisnis sudah aman.

## Pengujian

Gunakan data sintetis. Tes mencakup pola positif/negatif, variasi Unicode, field kosong, teks setelah batas panjang, konteks tugas sensitif, JSON ter-escape/duplikat, dan nol panggilan penyedia pada penolakan. Tes unggahan XLSX memeriksa HTTP 422 serta tidak adanya nilai sensitif dalam respons/log; tes adapter frontend memeriksa pesan menjadi keadaan gagal tanpa temuan. Tidak ada panggilan OpenAI sungguhan.

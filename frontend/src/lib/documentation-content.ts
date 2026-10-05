import type { DocumentationArticle } from "@/components/documentation/article-content";

export const documentationArticles: DocumentationArticle[] = [
  {
    slug: "pengenalan", title: "Panduan penggunaan Manrisk", category: "MULAI DI SINI",
    description: "Kenali fungsi utama Manrisk dan ikuti alur risiko dari identifikasi hingga pelaporan.", access: "Menu yang tampil mengikuti hak akses dan cakupan organisasi akun Anda.",
    sections: [
      { id: "alur-manris", title: "Ikuti alur pengelolaan risiko", paragraphs: ["Manrisk membantu Anda mencatat risiko, menilai tingkatnya, merencanakan penanganan, lalu memantau perubahan dalam setiap siklus. Catat kejadian nyata secara terpisah dan gunakan laporan untuk meninjau hasil.", "Menu Dashboard, Risiko, Kejadian Risiko, Penanganan, Pemantauan, Kertas Kerja, Tanda tangan, Laporan, Tata Kelola, dan Otomasi tersedia sesuai hak akses Anda.", "Angka dan baris pada screenshot adalah snapshot saat dokumentasi disusun. Tampilan aktual mengikuti akun, organisasi, dan periode yang dipilih."], image: { src: "/documentation/screens/dashboard-start.png", alt: "Dashboard Manrisk dengan ringkasan risiko, grafik, dan peta risiko", caption: "Dashboard Manrisk menampilkan ringkasan dan tren untuk cakupan serta periode yang dipilih.", width: 3420, height: 1904 }, diagram: [
        { title: "Identifikasi", detail: "Catat profil, penyebab, dampak, dan skor risiko." },
        { title: "Penanganan", detail: "Susun rencana dan catat progres mitigasi." },
        { title: "Pemantauan", detail: "Perbarui penilaian pada siklus berjalan." },
        { title: "Pelaporan", detail: "Tinjau hasil dan catat kejadian aktual." },
      ] },
      { id: "mulai-kerja", title: "Mulai pekerjaan", steps: [
        { title: "Masuk dengan akun unit kerja", detail: "Gunakan NIP dan password untuk membuka aplikasi. Jika akun belum ada, daftar lalu tunggu persetujuan administrator." },
        { title: "Pilih menu sesuai tugas", detail: "Buka Risiko untuk mengelola profil, Penanganan untuk melaporkan progres mitigasi, atau Pemantauan untuk meninjau risiko pada periode berjalan." },
        { title: "Ikuti status pada setiap halaman", detail: "Baca status sebelum melanjutkan. Draft masih dapat disunting; finalisasi mengaktifkan atau mengunci sebagian catatan sesuai jenis datanya." },
      ] },
      { id: "beda-alur", title: "Bedakan finalisasi, persetujuan, dan tanda tangan", paragraphs: ["Finalisasi risiko langsung mengaktifkan profil pada alur saat ini. Persetujuan pada menu Tanda tangan adalah proses terpisah untuk permintaan persetujuan dan dokumen tertentu. TTE kertas kerja mengikuti urutan penandatangan yang dipilih saat kertas kerja dibuat."], note: "Menu dapat berbeda menurut peran, organisasi, dan izin yang diberikan. Hubungi administrator jika fitur yang diperlukan tidak tampak." },
    ],
  },
  {
    slug: "akses-akun", title: "Masuk dan akses akun", category: "MULAI DI SINI",
    description: "Masuk memakai NIP dan password, daftar akun unit kerja, atau ubah password setelah masuk.", access: "Akun Manrisk; registrasi baru harus menunggu persetujuan administrator.",
    sections: [
      { id: "masuk", title: "Masuk ke Manrisk", steps: [
        { title: "Buka halaman Masuk", detail: "Masukkan NIP dan password akun Manrisk Anda." },
        { title: "Tampilkan password bila perlu", detail: "Pilih ikon mata di samping kolom password untuk memeriksa teks yang dimasukkan. Pilih lagi untuk menyembunyikannya." },
        { title: "Pilih Masuk", detail: "Jika kredensial benar, Manrisk membuka halaman yang sesuai dengan status akun. Ikuti instruksi perubahan password jika layar tersebut muncul." },
      ], image: { src: "/documentation/screens/akses-akun-login.png", alt: "Halaman masuk Manrisk dengan kolom NIP, password, dan tombol Masuk", caption: "Screenshot halaman masuk. Masukkan NIP dan password; tampilan aktual dapat mengikuti konfigurasi akun.", width: 3420, height: 1900 } },
      { id: "daftar-akun", title: "Daftar akun unit kerja", steps: [
        { title: "Buka Daftar akun dari halaman Masuk", detail: "Isi nama lengkap, email, unit kerja, NIP, dan password. Jabatan dan pangkat dapat diisi bila diminta." },
        { title: "Cari dan pilih unit kerja", detail: "Gunakan pencarian pada pilihan Unit kerja, lalu pilih organisasi yang sesuai dengan tempat Anda bertugas." },
        { title: "Kirim registrasi dan tunggu aktivasi", detail: "Password harus memiliki minimal 8 karakter dan kolom konfirmasi harus cocok. Setelah registrasi berhasil, administrator perlu menyetujui akun sebelum Anda dapat masuk." },
      ], image: { src: "/documentation/screens/registrasi-akun-desktop.png", alt: "Form pendaftaran akun Manrisk dengan kolom nama, email, unit kerja, NIP, jabatan, pangkat, dan password", caption: "Screenshot form pendaftaran. Kolom dan status aktivasi dapat mengikuti konfigurasi akun dan aturan registrasi yang aktif.", width: 3420, height: 1902 }, note: "Jangan bagikan password melalui email atau chat. Jika password perlu diatur ulang, hubungi administrator." },
      { id: "ubah-password", title: "Ubah password", paragraphs: ["Jika aplikasi meminta Anda membuat password baru, selesaikan perubahan sebelum membuka halaman kerja. Untuk mengganti password setelah masuk, buka Pengaturan lalu pilih Keamanan."], steps: [
        { title: "Masukkan password saat ini", detail: "Buka kolom password saat ini dan isi kredensial yang digunakan untuk masuk." },
        { title: "Buat dan konfirmasi password baru", detail: "Ikuti aturan yang ditampilkan dan pastikan kedua kolom password baru sama." },
        { title: "Simpan perubahan", detail: "Masuk kembali menggunakan password baru bila aplikasi meminta Anda mengautentikasi ulang." },
      ] },
      { id: "gagal-masuk", title: "Jika tidak bisa masuk", paragraphs: ["Periksa kembali penulisan NIP dan password serta pastikan Caps Lock sesuai. Akun yang baru didaftarkan belum dapat dipakai sebelum administrator menyetujui aktivasi. Jika masih gagal, gunakan bantuan administrator dari unit kerja Anda."] },
    ],
  },
  {
    slug: "piagam-manris", title: "Membuat dan memperbarui Piagam Manrisk", category: "TATA KELOLA",
    description: "Susun piagam manajemen risiko untuk tahun berjalan, lalu jaga riwayat revisinya.", access: "Pengguna dengan akses Tata Kelola Risiko pada organisasi yang dipilih.",
    sections: [
      { id: "daftar-piagam", title: "Buka daftar Piagam Manrisk", steps: [
        { title: "Pilih Piagam Manrisk", detail: "Daftar menampilkan piagam yang dapat Anda akses, beserta organisasi, periode, dan statusnya." },
        { title: "Periksa piagam aktif", detail: "Pastikan organisasi dan periode pada piagam yang akan ditinjau sudah sesuai." },
      ], image: { src: "/documentation/screens/piagam-list.png", alt: "Daftar Piagam Manrisk dengan status dan periode", caption: "Snapshot daftar piagam menampilkan organisasi, periode, status aktif, dan waktu pembaruan.", width: 3420, height: 1904 } },
      { id: "buat-piagam", title: "Buat draf Piagam", steps: [
        { title: "Buka Piagam Manrisk", detail: "Pilih Piagam Manrisk pada kelompok Tata Kelola Risiko." },
        { title: "Pilih Buat Piagam", detail: "Masukkan judul piagam. Judul membantu membedakan piagam organisasi dan tahun berlakunya." },
        { title: "Buka draf dan lengkapi isinya", detail: "Lengkapi bagian piagam, antara lain dasar hukum, stakeholder, dan struktur Unit Pengelola Risiko (UPR). Simpan perubahan selama status masih Draf." },
      ], image: { src: "/documentation/screens/piagam-create-dialog.png", alt: "Dialog Buat Piagam untuk memulai draf", caption: "Masukkan judul untuk membuat draf Piagam pada tahun berjalan.", width: 3420, height: 1904 } },
      { id: "lengkapi-piagam", title: "Tinjau kelengkapan", paragraphs: ["Gunakan penanda kelengkapan pada halaman untuk memeriksa bagian yang belum terisi. Pastikan nama organisasi, struktur UPR, dan stakeholder sudah sesuai sebelum memfinalisasi."], fields: [
        { name: "Dasar hukum", description: "Peraturan atau dasar yang menjadi acuan penerapan manajemen risiko." },
        { name: "Stakeholder", description: "Pihak terkait beserta hubungan atau kepentingannya terhadap manajemen risiko." },
        { name: "Struktur UPR", description: "Anggota dan peran yang mengelola manajemen risiko pada organisasi." },
      ] },
      { id: "finalisasi-piagam", title: "Finalisasi dan buat revisi", steps: [
        { title: "Tinjau seluruh isi draf", detail: "Pastikan informasi wajib lengkap. Tombol Finalisasi tetap nonaktif ketika masih ada bagian yang harus diperbaiki." },
        { title: "Pilih Finalisasi dan konfirmasi", detail: "Piagam yang telah difinalisasi menjadi aktif dan terkunci." },
        { title: "Buat revisi jika isi berubah", detail: "Gunakan tindakan Revisi dan tulis alasan sedikitnya 10 karakter. Revisi baru menjadi aktif setelah difinalisasi; piagam aktif sebelumnya tetap berlaku sampai itu terjadi." },
      ], image: { src: "/documentation/screens/piagam-list-alt.png", alt: "Daftar Piagam Manrisk sebelum membuka piagam aktif", caption: "Gunakan daftar Piagam Manrisk untuk membuka piagam yang perlu ditinjau atau direvisi.", width: 3420, height: 1902 }, note: "Simpan perubahan draf sebelum memilih Finalisasi." },
      { id: "status-piagam", title: "Pahami status Piagam", fields: [
        { name: "Draf", description: "Piagam sedang disusun dan dapat disunting oleh pengguna berizin." },
        { name: "Aktif", description: "Piagam sudah difinalisasi dan menjadi acuan yang berlaku." },
        { name: "Draf revisi", description: "Draf perubahan beserta alasan. Piagam aktif tetap berlaku sampai revisi tersebut difinalisasi." },
      ], image: { src: "/documentation/screens/piagam-list-status.png", alt: "Daftar Piagam Manrisk dengan penanda status Aktif", caption: "Status Aktif menandai piagam yang berlaku untuk organisasi dan periode tersebut; isi daftar adalah snapshot.", width: 3420, height: 1904 } },
    ],
  },
  {
    slug: "eskalasi-risiko", title: "Mengelola eskalasi risiko", category: "TATA KELOLA",
    description: "Tinjau usulan hubungan risiko antarunit dan tindak lanjutnya.", access: "Pengguna yang memiliki akses ke organisasi sumber atau sasaran eskalasi.",
    sections: [
      { id: "alur-eskalasi", title: "Pahami alur eskalasi", paragraphs: ["Eskalasi menghubungkan risiko lintas organisasi agar unit yang memerlukan koordinasi dapat meninjaunya. Catatan eskalasi menyimpan risiko sumber, organisasi sasaran, jenis eskalasi, analisis, keputusan, dan status."], image: { src: "/documentation/screens/eskalasi-risiko.png", alt: "Halaman Eskalasi Risiko dari aplikasi Manrisk", caption: "Daftar Eskalasi Risiko dari aplikasi Manrisk; isi daftar mengikuti akses akun Anda.", width: 1145, height: 760 }, diagram: [
        { title: "Usulkan", detail: "Pilih risiko sumber dan organisasi sasaran." },
        { title: "Tinjau", detail: "Organisasi sasaran menganalisis usulan." },
        { title: "Putuskan", detail: "Terima atau tolak dengan konteks yang tersedia." },
        { title: "Tindak lanjuti", detail: "Perbarui status ketika tindak lanjut dijalankan." },
      ] },
      { id: "buat-eskalasi", title: "Buat usulan eskalasi", steps: [
        { title: "Buka form dari menu Eskalasi Risiko", detail: "Pilih tombol Eskalasi di atas daftar untuk membuka dialog pengajuan." },
        { title: "Pilih jenis dan risiko sumber", detail: "Form ini menyediakan jenis Bottom-up. Pilih profil risiko yang perlu diteruskan untuk koordinasi lintas organisasi." },
        { title: "Tentukan organisasi tujuan", detail: "Untuk Bottom-up, pilih organisasi di atas dalam struktur organisasi sebagai penerima usulan." },
        { title: "Tambahkan alasan lalu simpan", detail: "Tuliskan konteks yang membantu organisasi tujuan memahami pengajuan. Alasan bersifat opsional. Tombol Simpan eskalasi aktif setelah risiko sumber dan organisasi tujuan dipilih." },
      ], fields: [
        { name: "Jenis eskalasi", description: "Menentukan arah pengajuan. Pada form ini, jenis yang tersedia adalah Bottom-up." },
        { name: "Risiko sumber", description: "Profil risiko yang diajukan untuk ditinjau organisasi tujuan. Wajib dipilih." },
        { name: "Organisasi tujuan", description: "Organisasi penerima usulan. Untuk Bottom-up, pilih organisasi di atas. Wajib dipilih." },
        { name: "Alasan eskalasi", description: "Ringkasan alasan risiko perlu diteruskan, misalnya karena temuan atau kebutuhan koordinasi. Opsional, tetapi membantu peninjau memahami konteks." },
      ], image: { src: "/documentation/screens/eskalasi-risiko-create.png", alt: "Dialog Buat eskalasi risiko dengan jenis Bottom-up, pemilih risiko sumber dan organisasi tujuan, serta kolom alasan", caption: "Form pengajuan Bottom-up. Pilih risiko sumber dan organisasi di atas; alasan dapat ditambahkan sebagai konteks.", width: 3420, height: 1904 } },
      { id: "tinjau-eskalasi", title: "Tinjau dan tindak lanjuti", steps: [
        { title: "Buka baris usulan", detail: "Gunakan pencarian berdasarkan kode, judul risiko, nama unit, analisis, keputusan, atau status." },
        { title: "Periksa konteks dan dampak lintas unit", detail: "Tinjau organisasi asal dan sasaran serta catatan pada usulan sebelum memberikan keputusan." },
        { title: "Terima atau tolak", detail: "Pilih keputusan yang sesuai dan isi catatan tindak lanjut bila diperlukan. Usulan yang diterima dapat dilanjutkan sampai status selesai." },
      ] },
      { id: "status-eskalasi", title: "Status eskalasi", fields: [
        { name: "Menunggu Tinjauan", description: "Usulan baru menunggu tindakan organisasi sasaran." },
        { name: "Sedang Ditinjau", description: "Analisis atas usulan sedang berlangsung." },
        { name: "Disetujui", description: "Usulan diterima untuk koordinasi lintas organisasi." },
        { name: "Ditolak / Selesai", description: "Usulan tidak diterima atau tindak lanjut yang disepakati telah selesai." },
      ], note: "Tindakan tinjau hanya tersedia bagi pengguna yang memiliki akses ke organisasi sasaran dan usulan yang masih dapat ditinjau." },
    ],
  },
  {
    slug: "register-risiko", title: "Mencatat dan memfinalisasi risiko", category: "MANAJEMEN RISIKO",
    description: "Buat profil risiko, isi asesmen awal, rencanakan penanganan, dan tentukan targetnya.", access: "Pengguna yang memiliki akses tulis pada organisasi terkait risiko.",
    sections: [
      { id: "daftar-risiko", title: "Tinjau daftar dan ringkasan risiko", steps: [
        { title: "Buka menu Risiko", detail: "Ringkasan pemantauan kuartal ini dan tabel risiko tampil sesuai organisasi serta izin akun Anda." },
        { title: "Pilih risiko yang akan dikerjakan", detail: "Gunakan kolom pencarian atau filter untuk menemukan profil sebelum membuka atau membuat risiko." },
      ], image: { src: "/documentation/screens/risiko-overview.png", alt: "Halaman Risiko dengan ringkasan pemantauan kuartal dan daftar risiko", caption: "Snapshot halaman Risiko menggabungkan ringkasan kuartal dengan daftar profil sesuai cakupan akun.", width: 3420, height: 1904 } },
      { id: "impor-risiko", title: "Impor risiko dengan template", paragraphs: ["Gunakan Import Risiko untuk memasukkan beberapa profil sekaligus dari file template. Template diunduh dari halaman ini; setelah diisi dan diunggah, Manrisk mem-parsing serta memvalidasi baris di backend. Periksa hasilnya sebelum mengirim risiko."], steps: [
        { title: "Unduh dan isi template", detail: "Pilih Download template, lalu isi lembar kerja mengikuti kolom yang disediakan." },
        { title: "Unggah file ke Import Risiko", detail: "Dari menu Risiko, buka Import Risiko dan pilih file template. Manrisk menampilkan status serta catatan validasi untuk setiap baris." },
        { title: "Periksa baris yang siap dikirim", detail: "Tinjau nama risiko, status, dan catatan. Baris yang bermasalah perlu diperbaiki di file lalu diunggah kembali; hanya baris valid yang dapat dikirim." },
        { title: "Kirim dan periksa hasil", detail: "Pilih Submit Risiko setelah ada baris valid. Ringkasan hasil menunjukkan jumlah yang berhasil dibuat dan yang gagal." },
      ], image: { src: "/documentation/screens/import-risiko.png", alt: "Halaman Import Risiko dengan tombol unduh template, area unggah, dan keadaan review kosong", caption: "Tampilan awal sebelum file diunggah. Tabel review muncul setelah parsing, dan Submit Risiko aktif ketika tersedia baris valid.", width: 3420, height: 1904 } },
      { id: "ekstraksi-sop", title: "Ekstrak kandidat risiko dari SOP", paragraphs: ["Ekstraksi SOP membantu menemukan kandidat risiko, kontrol, dan langkah proses beserta rujukan dokumennya. Hasil ekstraksi adalah bahan untuk ditinjau; cocokkan temuan dengan isi SOP sebelum membuat draf risiko."], steps: [
        { title: "Buka Ekstrak risiko dari SOP", detail: "Dari menu Risiko, pilih Ekstrak risiko dari SOP. Unggah satu dokumen berformat PDF atau XLSX dengan ukuran maksimal 1 MB." },
        { title: "Tinjau temuan dan keyakinannya", detail: "Periksa ringkasan temuan, tingkat risiko, dan nilai keyakinan. Nilai ini membantu meninjau hasil, tetapi tetap perlu dicocokkan dengan dokumen sumber." },
        { title: "Periksa kutipan sumber", detail: "Buka bagian Sumber untuk melihat nama dokumen, halaman, dan kutipan yang mendukung temuan." },
        { title: "Buat draf dari temuan yang relevan", detail: "Pilih Buat draf risiko pada temuan yang sesuai, lalu periksa dan lengkapi profil sebelum menyimpannya." },
      ], image: { src: "/documentation/screens/ekstraksi-sop.png", alt: "Hasil ekstraksi SOP dengan temuan kandidat risiko, nilai keyakinan, sumber, dan tindakan Buat draf risiko", caption: "Contoh hasil ekstraksi dari satu SOP. Temuan, tingkat risiko, dan nilai keyakinan bergantung pada dokumen; verifikasi kutipan sumber sebelum membuat draf.", width: 3420, height: 1904 } },
      { id: "buat-risiko", title: "Mulai pencatatan risiko", steps: [
        { title: "Buka Risiko lalu pilih Risiko Baru", detail: "Form baru dimulai sebagai draf dan menampilkan tindakan Simpan draft serta Finalisasi." },
        { title: "Jelaskan peristiwa yang berisiko", detail: "Isi nama atau pernyataan risiko, deskripsi kejadian, kategori, sebab, sumber, tingkat kendali, serta dampak." },
        { title: "Simpan draf bila masih perlu ditinjau", detail: "Pilih Simpan draft. Anda dapat kembali melengkapi profil selama statusnya Draf." },
      ], image: { src: "/documentation/screens/register-risiko-form.png", alt: "Form Tambah Risiko dengan bagian identifikasi dan properti", caption: "Form risiko baru dimulai sebagai draf. Periksa nilai awal sebelum menyimpan atau memfinalisasi.", width: 3420, height: 1904 } },
      { id: "analisis-risiko", title: "Lengkapi analisis dan evaluasi", steps: [
        { title: "Catat pengendalian yang sudah ada", detail: "Jelaskan kontrol yang saat ini dilakukan dan pilih efektivitasnya." },
        { title: "Tinjau probabilitas dan dampak", detail: "Skor awal terisi otomatis. Buka kartu skor untuk menilai probabilitas dan dampak berdasarkan informasi yang tersedia." },
        { title: "Tentukan prioritas dan pilihan penanganan", detail: "Bandingkan skor dengan selera risiko organisasi. Pilih opsi penanganan yang sesuai, lalu isi rencana mitigasi bila diperlukan." },
        { title: "Tentukan target penurunan", detail: "Target awal juga terisi otomatis. Sesuaikan target dengan hasil yang realistis setelah penanganan." },
      ] },
      { id: "kolom-risiko", title: "Arti kolom utama", fields: [
        { name: "Sumber risiko", description: "Menunjukkan sumber Internal atau Eksternal." },
        { name: "Tingkat kendali", description: "Menjelaskan apakah faktor pemicu berada dalam kendali organisasi." },
        { name: "Probabilitas dan dampak", description: "Dua nilai asesmen yang membentuk skor risiko pada heatmap." },
        { name: "Pilihan penanganan", description: "Tindakan yang dipilih terhadap risiko, misalnya Mitigasi." },
        { name: "Target penurunan", description: "Skor risiko residual yang dituju setelah rencana penanganan dijalankan." },
      ] },
      { id: "finalisasi-risiko", title: "Finalisasi dan perbarui profil", steps: [
        { title: "Periksa bagian wajib", detail: "Lengkapi identifikasi, analisis, pilihan penanganan, serta target yang diwajibkan pada form." },
        { title: "Pilih Finalisasi", detail: "Setelah finalisasi berhasil, profil berstatus Disetujui dan menjadi risiko aktif. Alur risiko saat ini tidak membuat permintaan persetujuan reviewer terpisah." },
        { title: "Mulai pemantauan untuk mengubah profil aktif", detail: "Profil aktif dikunci untuk menjaga riwayat. Gunakan menu Pemantauan dan buat draf siklus baru untuk memperbarui penilaiannya." },
      ], note: "Skor dan target bawaan hanyalah titik awal. Tinjau keduanya berdasarkan asesmen organisasi sebelum memfinalisasi." },
      { id: "status-risiko", title: "Pahami status dan riwayat versi", fields: [
        { name: "Draf", description: "Profil belum difinalisasi dan masih dapat dilengkapi." },
        { name: "Disetujui / Final", description: "Profil aktif setelah finalisasi risiko." },
        { name: "Digantikan", description: "Versi lama yang disimpan dalam riwayat setelah profil baru menjadi aktif." },
      ] },
      { id: "catatan-komunikasi", title: "Catat komunikasi terkait risiko", paragraphs: ["Catatan komunikasi menyimpan ringkasan pembahasan dengan stakeholder yang berkaitan dengan profil risiko. Catatan yang berhasil disimpan akan muncul pada linimasa Catatan di panel samping."], steps: [
        { title: "Buka profil risiko yang sudah difinalisasi", detail: "Pilih risiko dengan status selain Draf agar tindakan tambah catatan tersedia." },
        { title: "Pilih tambah catatan pada panel Catatan", detail: "Gunakan tombol tambah di samping judul Catatan untuk membuka form komunikasi." },
        { title: "Isi detail dan simpan", detail: "Lengkapi tanggal, metode, stakeholder atau unit, serta ringkasan komunikasi. Semua kolom bertanda bintang wajib diisi." },
      ], fields: [
        { name: "Tanggal", description: "Tanggal komunikasi berlangsung. Form mengisi tanggal hari ini sebagai nilai awal." },
        { name: "Metode", description: "Pilih Meeting, Email, Telepon, atau Chat/Pesan." },
        { name: "Stakeholder", description: "Nama pihak atau unit yang terlibat dalam komunikasi." },
        { name: "Catatan", description: "Ringkasan komunikasi atau hasil diskusi yang relevan dengan risiko." },
      ], image: { src: "/documentation/screens/catatan-komunikasi.png", alt: "Dialog Tambah Catatan Komunikasi pada profil risiko", caption: "Form komunikasi risiko meminta tanggal, metode, stakeholder, dan ringkasan diskusi.", width: 3420, height: 1900 } },
    ],
  },
  {
    slug: "penanganan", title: "Mengelola dan melaporkan penanganan", category: "MANAJEMEN RISIKO",
    description: "Susun rencana mitigasi, tetapkan PIC, dan catat pelaksanaan sesuai jadwalnya.", access: "Pengguna yang memiliki akses ke risiko dan tindakan terkait pada unitnya.",
    sections: [
      { id: "rencana-mitigasi", title: "Susun rencana penanganan", steps: [
        { title: "Buka risiko yang perlu dimitigasi", detail: "Rencana penanganan menjadi bagian dari evaluasi risiko dan dapat ditambahkan saat membuat atau memantau profil." },
        { title: "Tambahkan rencana", detail: "Jelaskan aksi, PIC, dan jenis mitigasi. Buka rincian jika perlu mengisi tahapan kegiatan, keluaran, target, sumber daya, atau kendala." },
        { title: "Simpan draf risiko atau pemantauan", detail: "Periksa kembali PIC dan jadwal pelaksanaan. Jika profil sudah final, buat atau lanjutkan draf pemantauan sesuai akses." },
      ], image: { src: "/documentation/screens/penanganan-list.png", alt: "Daftar rencana Penanganan dengan PIC, tenggat, dan status", caption: "Snapshot Daftar Penanganan menampilkan PIC, periode, tenggat, dan status tiap rencana.", width: 3420, height: 1904 } },
      { id: "lapor-progres", title: "Laporkan progres mitigasi", steps: [
        { title: "Buka menu Penanganan", detail: "Cari rencana menurut risiko, PIC, atau status. Periksa filter periode bila Anda menangani beberapa siklus." },
        { title: "Pilih aksi penanganan", detail: "Pada rencana yang dapat dilaporkan, buka menu aksi lalu pilih Lapor progress. Jika tenggat terlewati, gunakan tindakan laporan terlambat bila tersedia." },
        { title: "Isi kegiatan dan hasilnya", detail: "Catat kegiatan yang sudah dilakukan serta keluaran atau progres yang bisa diverifikasi. Tambahkan bukti bila form memintanya." },
        { title: "Simpan laporan", detail: "Status dan tanggal laporan membantu tim membedakan rencana yang menunggu, sudah dilaporkan, dilewati, atau terlambat." },
      ] },
      { id: "kolom-penanganan", title: "Arti status dan informasi", fields: [
        { name: "PIC", description: "Pengguna yang bertanggung jawab atas pelaksanaan rencana." },
        { name: "Pending", description: "Belum ada progres yang dilaporkan untuk jadwal tersebut." },
        { name: "Selesai", description: "Progres penanganan sudah dicatat sebagai selesai." },
        { name: "Dilewati", description: "Tugas tidak dilakukan pada periode itu. Status ini tetap terlihat dalam cakupan laporan." },
        { name: "Overdue", description: "Jadwal telah melewati tenggat dan masih perlu tindak lanjut." },
      ] },
      { id: "masalah-penanganan", title: "Jika tindakan laporan tidak tersedia", paragraphs: ["Aksi laporan tidak ditampilkan untuk tindakan yang sudah selesai atau tidak dilaporkan. Pengiriman laporan juga dapat dibatasi bila belum tersedia pada periode yang aktif. Periksa status, periode, dan tenggat terlebih dahulu; minta penanggung jawab risiko memeriksa penugasan jika rencana tidak tampil."] },
    ],
  },
  {
    slug: "pemantauan", title: "Melakukan pemantauan risiko", category: "MANAJEMEN RISIKO",
    description: "Mulai siklus pemantauan, perbarui asesmen, lalu finalisasi pengamatan untuk periodenya.", access: "Pengguna dengan akses pemantauan pada organisasi dan profil risiko terkait.",
    sections: [
      { id: "mulai-pemantauan", title: "Mulai siklus pemantauan", steps: [
        { title: "Buka Pemantauan", detail: "Tinjau risiko aktif dan siklus berjalan. Data profil mengikuti organisasi dan periode yang tersedia untuk akun Anda." },
        { title: "Pilih risiko dan mulai pemantauan", detail: "Sistem membuat draf baru dari profil aktif agar Anda dapat menilai kondisinya dalam siklus ini." },
        { title: "Periksa salinan profil", detail: "Pastikan penyebab, dampak, skor, rencana penanganan, dan target masih sesuai dengan keadaan terbaru." },
      ], image: { src: "/documentation/screens/pemantauan-list.png", alt: "Halaman Pemantauan dengan ringkasan draf, final, dan daftar risiko", caption: "Snapshot ringkasan dan daftar pemantauan; angka aktual mengikuti periode yang dipilih.", width: 3420, height: 1904 }, diagram: [
        { title: "Pilih risiko", detail: "Buka profil yang aktif." },
        { title: "Mulai draf", detail: "Gunakan siklus asesmen berjalan." },
        { title: "Perbarui nilai", detail: "Catat skor dan alasan perubahan." },
        { title: "Finalisasi", detail: "Kunci pengamatan untuk siklus itu." },
      ] },
      { id: "perbarui-pemantauan", title: "Perbarui penilaian", steps: [
        { title: "Tinjau probabilitas dan dampak", detail: "Ubah skor ketika keadaan pemicu, peluang, atau dampak berubah." },
        { title: "Catat alasan perubahan skor", detail: "Gunakan catatan perubahan untuk menjelaskan informasi baru atau alasan tetap mempertahankan skor." },
        { title: "Perbarui penanganan dan target bila perlu", detail: "Sesuaikan rencana dengan perubahan kondisi. Simpan draf secara berkala sebelum finalisasi." },
      ] },
      { id: "finalisasi-pemantauan", title: "Finalisasi pemantauan", steps: [
        { title: "Periksa skor dan catatan", detail: "Pastikan nilai hasil pemantauan, alasan, dan rencana tindak lanjut sudah sesuai." },
        { title: "Pilih Finalisasi Pemantauan", detail: "Pengamatan menjadi Final untuk siklus tersebut. Perubahan periode selanjutnya dibuat melalui draf pemantauan baru." },
        { title: "Periksa progres ringkasan", detail: "Dashboard dan daftar pemantauan menunjukkan jumlah draf dan final pada cakupan periode yang dipilih." },
      ], note: "Finalisasi pemantauan juga menjadi prasyarat penyusunan roster Kertas Kerja untuk risiko yang masuk dalam roster." },
      { id: "status-pemantauan", title: "Status pemantauan", fields: [
        { name: "Draft", description: "Pengamatan untuk siklus saat ini masih dalam penyusunan." },
        { name: "Final", description: "Pengamatan untuk periode ini telah diselesaikan." },
        { name: "Belum tersedia", description: "Belum ada pengamatan untuk risiko pada periode yang ditampilkan." },
      ], image: { src: "/documentation/screens/pemantauan-list-alt.png", alt: "Tabel risiko pada halaman Pemantauan beserta status siklus", caption: "Gunakan kolom status dan perubahan skor untuk meninjau hasil pemantauan tiap risiko; nilainya merupakan snapshot.", width: 3420, height: 1904 } },
    ],
  },
  {
    slug: "kejadian-risiko", title: "Mencatat kejadian risiko", category: "MANAJEMEN RISIKO",
    description: "Catat kejadian yang benar-benar berlangsung sebagai rekam LED dan hubungkan dengan risiko terkait.", access: "Pengguna dengan izin membuat catatan kejadian pada organisasi terkait.",
    sections: [
      { id: "daftar-kejadian", title: "Tinjau daftar kejadian", steps: [
        { title: "Buka Kejadian Risiko", detail: "Daftar menampilkan kejadian yang dapat diakses akun Anda." },
        { title: "Cari catatan yang diperlukan", detail: "Gunakan kode, uraian kejadian, risiko terkait, tingkat, atau tanggal untuk menemukan catatan." },
      ], image: { src: "/documentation/screens/kejadian-risiko-list.png", alt: "Daftar Kejadian Risiko dengan tingkat, kode, dan tanggal", caption: "Snapshot daftar kejadian memuat ringkasan peristiwa, risiko terkait, pencatat, dan tanggal.", width: 3420, height: 1904 } },
      { id: "buat-kejadian", title: "Catat fakta utama", steps: [
        { title: "Buka Kejadian Risiko lalu pilih Tambah kejadian", detail: "Isi tanggal kejadian, deskripsi, jenis dampak, dan tingkat kejadian. Pilih tanggal kejadian; form tidak meminta jam." },
        { title: "Catat kerugian bila dampak finansial", detail: "Pilih Nilai diketahui bila nominalnya dapat dipastikan. Isi jumlah dalam rupiah. Jika nominal belum dapat diketahui, catat keadaan tersebut tanpa memperkirakan nilai." },
        { title: "Tautkan risiko bila sudah diketahui", detail: "Cari kode atau judul risiko yang sesuai. Tautan ini opsional dan dapat ditambahkan dari detail setelah kejadian disimpan." },
      ], image: { src: "/documentation/screens/kejadian-risiko-form.png", alt: "Langkah pertama form Catat Kejadian", caption: "Mulai dengan tanggal, fakta kejadian, dan jenis dampak. Isi berdasarkan informasi yang sudah terverifikasi.", width: 3420, height: 1904 } },
      { id: "detail-kejadian", title: "Lengkapi dampak dan tindak lanjut", steps: [
        { title: "Tinjau detail opsional", detail: "Tambahkan dampak aktual, penanganan langsung, kondisi setelah penanganan, lokasi, pihak terdampak, dugaan penyebab, durasi, dan bukti yang tersedia." },
        { title: "Berikan alasan untuk tingkat ekstrem", detail: "Jika tingkat kejadian Ekstrem, tulis alasan yang mendukung penetapan tersebut." },
        { title: "Simpan catatan", detail: "Periksa fakta dan tanggal sebelum menyimpan. Record dikunci setelah tersimpan permanen dalam LED." },
      ] },
      { id: "kolom-kejadian", title: "Informasi yang perlu dicatat", fields: [
        { name: "Tanggal kejadian", description: "Tanggal peristiwa benar-benar terjadi, bukan waktu Anda membuat laporan." },
        { name: "Jenis dampak", description: "Pilih dampak yang sesuai dengan peristiwa aktual." },
        { name: "Jumlah kerugian", description: "Nominal finansial yang diketahui. Bedakan nilai belum diketahui dari kerugian nol." },
        { name: "Kondisi setelah penanganan", description: "Gambaran apakah keadaan pulih, masih berlangsung, atau memburuk." },
        { name: "Risiko tertaut", description: "Profil yang berkaitan dengan kejadian; opsional ketika hubungan belum dapat dipastikan." },
      ] },
      { id: "status-kejadian", title: "Jika detail kejadian berubah", paragraphs: ["Record kejadian yang telah disimpan tidak dapat disunting langsung. Jika perlu memperbaiki informasi, hubungi pengelola LED atau ikuti prosedur pencatatan yang berlaku di unit kerja Anda."] },
    ],
  },
  {
    slug: "kertas-kerja", title: "Membuat dan meninjau Kertas Kerja", category: "DOKUMEN & PELAPORAN",
    description: "Buat dokumen berkala dari roster risiko, lalu tinjau kesiapan pemantauan dan penandatangan.", access: "Pengguna yang diizinkan menyusun Kertas Kerja untuk organisasi dan siklus terkait.",
    sections: [
      { id: "buat-kertas-kerja", title: "Siapkan roster", steps: [
        { title: "Buka Kertas Kerja Baru", detail: "Periksa unit kerja dan siklus asesmen yang ditampilkan." },
        { title: "Tinjau daftar risiko roster", detail: "Periksa keputusan penyertaan untuk setiap kelompok versi risiko. Gunakan pencarian atau pilihan semua risiko bila tersedia." },
        { title: "Pilih penandatangan secara berurutan", detail: "Cari dan pilih pengguna yang akan menandatangani. Tambahkan atau susun ulang penandatangan untuk mengatur urutan." },
        { title: "Buat kertas kerja", detail: "Periksa kembali cakupan roster dan daftar penandatangan sebelum menyimpan." },
      ], image: { src: "/documentation/screens/kertas-kerja-list.png", alt: "Daftar Kertas Kerja dengan periode, status, dan jumlah risiko", caption: "Snapshot daftar Kertas Kerja memperlihatkan periode, status dokumen, jumlah risiko, dan progres TTE.", width: 3420, height: 1904 } },
      { id: "status-roster", title: "Pahami status roster", fields: [
        { name: "Belum dimulai", description: "Risiko belum memulai pemantauan pada siklus kertas kerja." },
        { name: "Dalam proses", description: "Pemantauan telah dimulai, tetapi belum final." },
        { name: "Final", description: "Risiko telah memiliki pengamatan final untuk siklus yang diperlukan." },
      ] },
      { id: "tinjau-kertas-kerja", title: "Tinjau progres dokumen", steps: [
        { title: "Buka Kertas Kerja yang dibuat", detail: "Periksa siklus, roster, skor dan pengamatan tiap risiko, serta urutan penandatangan." },
        { title: "Selesaikan pemantauan yang tertinggal", detail: "Jika ada risiko dengan pemantauan belum final, buka profilnya dan finalisasi pemantauan terlebih dahulu." },
        { title: "Mulai TTE ketika siap", detail: "Setelah semua risiko dalam roster berstatus final dan tidak ada blocker, pembuat dokumen dapat memulai proses tanda tangan elektronik." },
      ], image: { src: "/documentation/screens/kertas-kerja-progress.png", alt: "Daftar Kertas Kerja dengan panel progres yang dapat dibuka", caption: "Panel Progres Kertas Kerja dapat dibuka untuk memeriksa finalisasi risiko per organisasi; angka di gambar merupakan snapshot.", width: 3420, height: 1904 }, note: "Kertas Kerja mengambil snapshot dari roster periode. Tinjau keputusan penyertaan dan urutan penandatangan sebelum menyimpannya." },
      { id: "status-kertas-kerja", title: "Status Kertas Kerja", fields: [
        { name: "Draf", description: "Dokumen sedang disusun atau menunggu persiapan proses tanda tangan." },
        { name: "Menunggu penandatangan", description: "Dokumen sedang mengikuti urutan TTE; tindakan menunggu penandatangan yang gilirannya tiba." },
        { name: "Selesai", description: "Tanda tangan telah tuntas, atau dokumen selesai dengan pilihan melewati TTE." },
        { name: "Dibatalkan", description: "Proses dihentikan dan dokumen tidak dapat dilanjutkan." },
      ] },
    ],
  },
  {
    slug: "tanda-tangan", title: "Meninjau persetujuan dan TTE", category: "DOKUMEN & PELAPORAN",
    description: "Tinjau permintaan pada inbox dan selesaikan tanda tangan sesuai urutan serta kewenangan Anda.", access: "Reviewer atau penandatangan yang ditetapkan untuk permintaan tertentu.",
    sections: [
      { id: "persetujuan-inbox", title: "Tinjau permintaan pada Tanda tangan", steps: [
        { title: "Buka Tanda tangan", detail: "Gunakan tab Semua atau Persetujuan Saya untuk menemukan permintaan yang terkait dengan Anda." },
        { title: "Cari atau filter permintaan", detail: "Cari berdasarkan kode, judul, unit, atau nama pemohon. Gunakan tab Disetujui dan Ditolak untuk meninjau riwayat keputusan." },
        { title: "Buka permintaan dan tinjau dokumen", detail: "Baca materi dan konteks lengkap sebelum memberikan keputusan." },
        { title: "Setujui atau tolak", detail: "Pilih tindakan yang sesuai pada permintaan. Penolakan atau catatan review memengaruhi status dokumen mengikuti alur permintaan." },
      ] },
      { id: "tte-kertas-kerja", title: "Tandatangani Kertas Kerja", steps: [
        { title: "Buka Kertas Kerja pada giliran Anda", detail: "Urutan penandatangan tampil pada timeline. Anda hanya dapat menandatangani ketika menjadi penandatangan aktif." },
        { title: "Periksa isi dan roster", detail: "Bacalah dokumen dan pastikan profil risiko serta pengamatan untuk siklus tersebut sudah final." },
        { title: "Tandatangani", detail: "Pilih tindakan tanda tangan pada halaman dokumen. Setelah tercatat, giliran berpindah ke penandatangan berikutnya." },
      ], image: { src: "/documentation/screens/tanda-tangan.png", alt: "Halaman Persetujuan dan TTE dari aplikasi Manrisk", caption: "Halaman Persetujuan & TTE dari aplikasi Manrisk saat tidak ada permintaan yang sesuai filter.", width: 1145, height: 760 } },
      { id: "blocker-tte", title: "Jika tindakan TTE belum tersedia", paragraphs: ["Pembuat kertas kerja hanya dapat memulai TTE jika semua risiko di roster telah final dan tidak ada pemantauan yang tertinggal. Penandatangan dapat menandatangani setelah proses dimulai, urutannya tiba, dan ia adalah akun penandatangan yang ditunjuk."], note: "TTE Kertas Kerja memiliki urutan dan prasyarat sendiri. Proses ini terpisah dari finalisasi profil risiko." },
      { id: "status-tte", title: "Status permintaan dan penandatangan", fields: [
        { name: "Persetujuan saya", description: "Permintaan yang menunggu tindakan review dari akun Anda." },
        { name: "Giliran Anda", description: "Anda penandatangan aktif dan dapat meninjau lalu menandatangani." },
        { name: "Sedang ditinjau", description: "Penandatangan aktif lain sedang bertindak." },
        { name: "Sudah ditandatangani", description: "Tahap TTE tersebut telah selesai dan tercatat." },
      ] },
    ],
  },
  {
    slug: "dashboard", title: "Membaca Dashboard", category: "DOKUMEN & PELAPORAN",
    description: "Baca ringkasan jumlah, tingkat, kategori, tren, dan distribusi risiko pada periode aktif.", access: "Pengguna yang memiliki akses Dashboard sesuai organisasi yang dicakup akunnya.",
    sections: [
      { id: "ringkasan-dashboard", title: "Mulai dari ringkasan utama", paragraphs: ["Kartu ringkasan menunjukkan total risiko, jumlah yang memerlukan perhatian berdasarkan tingkat, mitigasi yang belum dilaporkan, dan tugas mitigasi yang melewati tenggat. Baca label dan keterangan setiap angka bersama-sama."], image: { src: "/documentation/screens/dashboard-start.png", alt: "Dashboard Manrisk dengan kartu ringkasan, tren, kategori, dan peta risiko", caption: "Dashboard Manrisk menampilkan ringkasan, grafik, distribusi kategori, komposisi level, dan peta risiko.", width: 3420, height: 1904 } },
      { id: "tren-dashboard", title: "Baca grafik tren dan kategori", fields: [
        { name: "Tren jumlah risiko", description: "Perubahan total risiko dari satu kuartal ke kuartal berikutnya." },
        { name: "Distribusi kategori", description: "Pembagian risiko menurut kategori. Pilih kategori untuk memusatkan ringkasan sesuai interaksi yang tersedia." },
        { name: "Komposisi level", description: "Jumlah risiko pada masing-masing tingkat risiko untuk setiap snapshot kuartal." },
      ], paragraphs: ["Arah tren mengacu pada sumbu dan rentang waktu yang ditampilkan. Sebuah skor risiko menggambarkan asesmen profil, bukan jumlah kejadian aktual."] },
      { id: "heatmap-dashboard", title: "Gunakan peta risiko", paragraphs: ["Heatmap menempatkan risiko berdasarkan probabilitas dan dampak. Baca label pada kedua sumbu dan legenda tingkat risiko. Sel berisi angka menunjukkan jumlah profil pada kombinasi nilai tersebut."], steps: [
        { title: "Periksa tingkat dengan jumlah terbesar", detail: "Gunakan legenda dan label angka agar warna tidak menjadi satu-satunya petunjuk." },
        { title: "Bandingkan periode atau fase", detail: "Jika kontrol perbandingan fase tersedia, pilih fase yang ingin ditinjau bersama." },
        { title: "Buka detail risiko bila perlu", detail: "Lanjutkan ke halaman Risiko untuk memeriksa profil penyusun nilai tersebut." },
      ] },
      { id: "angka-dashboard", title: "Jika angka ringkasan berbeda", paragraphs: ["Dashboard mengikuti organisasi, periode, dan definisi metrik yang ditampilkan di setiap kartu. Laporan kuartalan menyusun dataset dan filter tersendiri. Bandingkan periode dan cakupan organisasi sebelum menyimpulkan bahwa angkanya tidak sesuai."] },
    ],
  },
  {
    slug: "laporan", title: "Membaca dan mengekspor Laporan", category: "DOKUMEN & PELAPORAN",
    description: "Bandingkan hasil antarperiode dan ekspor ringkasan laporan sesuai cakupan organisasi.", access: "Pengguna dengan hak akses laporan untuk organisasi yang dicakup akun mereka.",
    sections: [
      { id: "periode-laporan", title: "Pilih periode dan organisasi", steps: [
        { title: "Buka Laporan", detail: "Laporan menampilkan periode kuartal yang sudah selesai secara bawaan." },
        { title: "Pilih periode dan pembanding", detail: "Gunakan pemilih Periode untuk menentukan kuartal laporan serta Pembanding untuk memilih periode yang ingin dibandingkan." },
        { title: "Batasi unit bila diperlukan", detail: "Gunakan filter organisasi untuk melihat unit atau kelompok yang termasuk cakupan Anda." },
      ], image: { src: "/documentation/screens/laporan-q3.png", alt: "Laporan kuartalan Manrisk dengan metrik, tren, mitigasi, dan kejadian", caption: "Snapshot laporan kuartal yang membandingkan indikator risiko, target, mitigasi, pemantauan, dan kejadian.", width: 3420, height: 1904 } },
      { id: "baca-laporan", title: "Baca komponen laporan", fields: [
        { name: "Risiko di atas selera risiko", description: "Profil yang skornya melampaui batas selera organisasi pada periode terpilih." },
        { name: "Target tercapai", description: "Hasil observasi akhir yang dibandingkan dengan target penurunan yang berlaku." },
        { name: "Mitigasi terlapor", description: "Laporan progres penanganan dalam periode. Angka ini mengukur pelaporan, bukan berarti setiap tugas selesai." },
        { name: "Pemantauan final", description: "Profil dalam cakupan yang memiliki hasil pengamatan final pada kuartal tersebut." },
        { name: "Kejadian dan kerugian", description: "Ringkasan kejadian berdasarkan tanggal kejadian serta nilai finansial yang diketahui." },
      ], image: { src: "/documentation/screens/laporan-q2.png", alt: "Laporan kuartalan Manrisk dengan cakupan data berbeda", caption: "Snapshot periode lain untuk membandingkan ringkasan. Isi aktual mengikuti periode serta cakupan organisasi yang dipilih.", width: 3420, height: 1904 } },
      { id: "detail-unit", title: "Periksa unit dan risiko", steps: [
        { title: "Bandingkan unit", detail: "Tabel unit mencakup organisasi yang berada dalam cakupan izin Anda. Unit tanpa data pada periode itu ditandai Belum ada data." },
        { title: "Buka detail unit", detail: "Pilih unit untuk melihat daftar risiko, mitigasi, dan kejadian terkait tanpa mengubah filter utama." },
        { title: "Tinjau perhatian risiko", detail: "Perluas daftar risiko untuk memeriksa masalah status, target, pengamatan, atau tenggat. Daftar ini dimuat saat panel dibuka." },
      ] },
      { id: "ekspor-laporan", title: "Ekspor laporan", steps: [
        { title: "Tetapkan periode dan cakupan", detail: "Periode, periode pembanding, serta filter unit yang sedang dipilih berlaku untuk kedua jenis ekspor." },
        { title: "Pilih format ekspor", detail: "Pilih Excel untuk lembar kerja analisis atau PDF untuk dokumen laporan yang dapat dibaca." },
        { title: "Periksa tanggal dan filter", detail: "Pastikan kuartal dan cakupan organisasi benar sebelum membagikan hasil laporan." },
      ], note: "Jika suatu nilai ditampilkan sebagai tanda pisah, angka pembanding atau penyebut mungkin belum tersedia pada periode yang dipilih." },
    ],
  },
  {
    slug: "mom", title: "Membuat notulen dan mengolah transkrip", category: "OTOMASI",
    description: "Gunakan MoM untuk menyiapkan notulen, mencari catatan, dan mengubah pembahasan menjadi tindak lanjut.", access: "Akses MoM bergantung pada izin akun dan pengaktifan fitur di lingkungan Manrisk.",
    sections: [
      { id: "daftar-mom", title: "Cari dan kelola notulen", steps: [
        { title: "Buka menu MoM", detail: "Daftar menampilkan notulen yang berada dalam cakupan akses akun Anda." },
        { title: "Cari judul atau ringkasan", detail: "Gunakan kolom pencarian untuk menemukan notulen menurut judul, ringkasan, pembuat, atau peserta." },
        { title: "Buka atau hapus notulen", detail: "Buka baris untuk membaca isi. Gunakan menu tindakan untuk menghapus hanya ketika catatan yang dipilih memang tidak lagi diperlukan." },
      ], image: { src: "/documentation/screens/mom-list.png", alt: "Daftar notulen MoM dengan judul, tanggal, peserta, dan pembuat", caption: "Snapshot daftar MoM membantu mencari notulen berdasarkan judul, tanggal, jumlah peserta, atau pembuat.", width: 3420, height: 1904 } },
      { id: "buat-mom", title: "Buat notulen", steps: [
        { title: "Pilih Buat Notulen", detail: "Masukkan judul rapat serta waktu dan peserta sesuai isian form." },
        { title: "Tambahkan hasil pembahasan", detail: "Susun ringkasan, keputusan, serta tindak lanjut dan PIC agar rapat dapat ditinjau kembali." },
        { title: "Simpan notulen", detail: "Buka daftar MoM untuk memastikan catatan muncul dengan judul yang dapat dicari." },
      ], image: { src: "/documentation/screens/mom.png", alt: "Form Buat Notulen pada MoM Manrisk", caption: "Form Buat Notulen untuk mencatat hasil rapat dan tindak lanjut.", width: 1145, height: 760 } },
      { id: "detail-mom", title: "Baca detail notulen", steps: [
        { title: "Buka notulen dari daftar MoM", detail: "Pilih notulen yang ingin ditinjau untuk membuka halaman detailnya." },
        { title: "Tinjau properti dan ringkasan", detail: "Periksa judul, pembuat, tanggal rapat, peserta, serta ringkasan agar konteks rapat terbaca dengan jelas." },
        { title: "Baca agenda rapat", detail: "Gunakan bagian Agenda untuk meninjau pokok bahasan rapat." },
      ], image: { src: "/documentation/screens/mom-detail.png", alt: "Halaman detail notulen MoM dengan properti, ringkasan, dan agenda", caption: "Detail notulen menampilkan properti, ringkasan, dan agenda. Nama, peserta, tanggal, serta isi rapat pada screenshot merupakan snapshot dan dapat berubah sesuai notulen dan akses akun.", width: 3420, height: 1904 } },
      { id: "analisis-transkrip", title: "Gunakan MoM Intelligence", steps: [
        { title: "Buka MoM Intelligence", detail: "Fitur ini dapat diakses dari kelompok Intelligence jika aktif di lingkungan akun Anda." },
        { title: "Masukkan transkrip", detail: "Tinjau dan hilangkan informasi rapat yang tidak perlu sebelum menggunakan teks sebagai bahan analisis." },
        { title: "Tinjau hasil AI", detail: "Periksa saran ringkasan, risiko, dan tindak lanjut dengan peserta rapat sebelum menyimpan atau menerapkannya." },
      ], note: "Keluaran AI adalah saran. Verifikasi nama, angka, konteks risiko, dan PIC terhadap catatan rapat asli." },
      { id: "fitur-mom-nonaktif", title: "Jika menu MoM tidak tersedia", paragraphs: ["Jika menu MoM atau MoM Intelligence tidak tampak, fitur tersebut mungkin dinonaktifkan untuk lingkungan Anda. Hubungi administrator sistem untuk memeriksa akses dan ketersediaan fitur."] },
    ],
  },
  {
    slug: "istilah-dan-kendala", title: "Istilah dan kendala umum", category: "BANTUAN",
    description: "Gunakan arti status yang konsisten dan langkah berikut untuk memeriksa kendala penggunaan Manrisk.", access: "Terbuka untuk pengguna Manrisk.",
    sections: [
      { id: "istilah-status", title: "Istilah status", fields: [
        { name: "Draf / Draft", description: "Data sedang disusun dan belum difinalisasi." },
        { name: "Final / Disetujui", description: "Data sudah difinalisasi. Pada profil risiko, status Disetujui menandai profil aktif." },
        { name: "Digantikan", description: "Versi profil yang tersimpan dalam riwayat setelah versi yang lebih baru diaktifkan." },
        { name: "Overdue", description: "Tenggat tindakan penanganan telah lewat." },
        { name: "TTE", description: "Tanda tangan elektronik yang berjalan menurut urutan penandatangan pada Kertas Kerja." },
        { name: "LED", description: "Laporan Evaluasi Diri; kejadian yang disimpan sebagai record LED terkunci setelah disimpan." },
      ] },
      { id: "kendala-akun", title: "Kendala akun", fields: [
        { name: "Registrasi masih menunggu", description: "Administrator belum menyetujui aktivasi. Hubungi administrator unit untuk memeriksa status registrasi." },
        { name: "Password tidak dapat digunakan", description: "Periksa NIP dan password. Hubungi administrator jika perlu reset atau akses masih gagal." },
        { name: "Diminta mengatur ulang password", description: "Selesaikan alur perubahan password sebelum melanjutkan ke halaman aplikasi." },
      ] },
      { id: "kendala-data", title: "Data atau tindakan belum tampil", fields: [
        { name: "Profil risiko tidak dapat diedit", description: "Profil aktif dikunci. Buat draf pemantauan untuk menilai dan memperbarui profil pada siklus baru." },
        { name: "Finalisasi belum tersedia", description: "Periksa kolom wajib, kelengkapan bagian, dan status data yang sedang dibuka." },
        { name: "TTE belum dapat dimulai", description: "Pastikan risiko roster dan pengamatan pemantauan sudah final serta seluruh prasyarat terpenuhi." },
        { name: "Unit atau menu tidak tampil", description: "Periksa organisasi yang dipilih dan cakupan izin akun. Minta administrator memeriksa keanggotaan jika perlu." },
        { name: "Halaman menampilkan error atau loading berkepanjangan", description: "Muat ulang halaman dan periksa koneksi. Jika kendala berulang, catat nama halaman serta pesan error untuk administrator." },
      ] },
      { id: "minta-bantuan", title: "Informasi saat meminta bantuan", paragraphs: ["Saat menghubungi administrator atau tim dukungan, sebutkan nama halaman, jenis tindakan, waktu terjadinya kendala, status yang terlihat, serta pesan error. Jangan kirim password, OTP, atau data rahasia dalam laporan kendala."] },
    ],
  },
];

export function getDocumentationArticle(slug: string) {
  return documentationArticles.find((article) => article.slug === slug);
}

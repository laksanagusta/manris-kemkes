export const riskGuideStepTitles = [
  "Daftar Risiko",
  "Finalisasi",
  "Risiko Aktif",
  "Mulai Pemantauan",
  "Lanjutkan Pemantauan",
  "Selesai Pemantauan",
] as const;

export type RiskGuideStepTitle = (typeof riskGuideStepTitles)[number];

export type RiskGuideStep = {
  title: RiskGuideStepTitle;
  summary: string;
  description: string;
  actions: readonly string[];
  status: string;
  statusLabel: string;
};

export type RiskGuideFaqItem = {
  question: string;
  answer: string;
};

export type RiskGuideContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    summary: string;
  };
  flow: {
    title: string;
    phase1: string;
    phase2: string;
  };
  overview: {
    title: string;
    description: string;
  };
  steps: readonly [
    RiskGuideStep,
    RiskGuideStep,
    RiskGuideStep,
    RiskGuideStep,
    RiskGuideStep,
    RiskGuideStep,
  ];
  faq: {
    title: string;
    items: readonly RiskGuideFaqItem[];
  };
};

export const riskGuideContent: RiskGuideContent = {
  hero: {
    eyebrow: "Panduan",
    title: "Panduan penggunaan aplikasi",
    description:
      "Pahami alur pemantauan risiko di aplikasi - dari pendaftaran, persetujuan, hingga pemantauan berkala.",
    summary:
      "Setiap risiko melewati dua fase utama: (1) Fase Pendaftaran - dari draft hingga disetujui, dan (2) Fase Pemantauan - siklus penilaian ulang berkala untuk memastikan risiko terkontrol.",
  },
  flow: {
    title: "Alur Proses Risiko",
    phase1: "Fase Pendaftaran",
    phase2: "Fase Pemantauan",
  },
  overview: {
    title: "Enam langkah dalam dua fase",
    description:
      "Fase pertama mendaftarkan risiko baru (langkah 1-3). Fase kedua memantau risiko secara berkala melalui siklus penilaian ulang (langkah 4-6).",
  },
  steps: [
    {
      title: riskGuideStepTitles[0],
      summary: "Isi formulir risiko di menu Daftar Risiko",
      description:
        "Risiko baru dimulai sebagai draft. Isi 5 bagian: (1) Identifikasi - penyebab, sumber, dampak; (2) Analisis - probabilitas, dampak, skor; (3) Evaluasi - prioritas, appetite, opsi penanganan; (4) Penanganan - aksi mitigasi; (5) Target - target penurunan risiko.",
      actions: [
        "Buka menu Daftar Risiko → klik 'Tambah Risiko'.",
        "Isi bagian Identifikasi: judul, kategori, penyebab, sumber, dampak.",
        "Lengkapi Analisis: kontrol yang ada, efektivitas, probabilitas, dampak → skor otomatis terhitung.",
        "Pilih Evaluasi: opsi penanganan (Menghindari risiko/Berbagi Risko/Mitigasi/Menerima Risiko), prioritas, & Selera risiko.",
        "Tambahkan rencana penanganan: aksi, penanggung jawab, tenggat, frekuensi.",
        "Tentukan target penurunan dan tanggal review berikutnya, lalu klik 'Simpan Draft'.",
      ],
      status: "assessment_draft",
      statusLabel: "Draft",
    },
    {
      title: riskGuideStepTitles[1],
      summary: "Klik 'Finalisasi' untuk mengaktifkan risiko",
      description:
        "Setelah draft lengkap, klik 'Finalisasi'. Sistem langsung mengubah status menjadi 'Disetujui'. Risiko baru langsung aktif.",
      actions: [
        "Pastikan semua bagian formulir sudah terisi dengan benar.",
        "Klik tombol 'Finalisasi'.",
        "Sistem langsung mengubah status menjadi 'Disetujui'.",
        "Risiko terkunci dan tidak bisa diedit langsung - harus melalui proses pemantauan.",
      ],
      status: "approved",
      statusLabel: "Disetujui",
    },
    {
      title: riskGuideStepTitles[2],
      summary: "Risiko berstatus 'Disetujui' dan siap dipantau",
      description:
        "Risiko yang sudah disetujui menjadi versi aktif. Muncul di Dashboard dan daftar risiko. Pemantauan bisa dimulai kapan saja sesuai jadwal yang ditentukan.",
      actions: [
        "Risiko aktif dengan status 'Disetujui'.",
        "Lihat di menu Daftar Risiko dan Dashboard.",
        "Siapkan rencana penanganan sesuai jadwal yang sudah ditentukan.",
        "Buka menu Pemantauan Risiko untuk memulai siklus penilaian ulang.",
      ],
      status: "approved",
      statusLabel: "Disetujui",
    },
    {
      title: riskGuideStepTitles[3],
      summary: "Mulai siklus pemantauan - sistem membuat draft baru",
      description:
        "Di awal semester (H1/H2) atau sesuai jadwal, mulai pemantauan untuk menilai kembali risiko. Sistem membuat draft pemantauan baru yang memuat data terakhir risiko. Draft ini terhubung ke versi sebelumnya.",
      actions: [
        "Buka menu Pemantauan Risiko.",
        "Pilih risiko yang akan dipantau.",
        "Klik 'Mulai Pemantauan'.",
        "Sistem membuat draft pemantauan baru (status: Draft) yang terhubung ke versi aktif.",
        "Draft otomatis berisi data terakhir: penyebab, mitigasi, target, probabilitas, dampak.",
      ],
      status: "assessment_draft",
      statusLabel: "Draft",
    },
    {
      title: riskGuideStepTitles[4],
      summary: "Perbarui data pemantauan di draft - simpan berkala",
      description:
        "Isi draft pemantauan dengan data terbaru. Perbarui probabilitas, dampak, dan rencana penanganan bila ada perubahan. Selama status masih 'Draft', data bisa diedit dan disimpan.",
      actions: [
        "Perbarui probabilitas dan/atau dampak bila kondisi risiko berubah.",
        "Tulis alasan perubahan skor sebagai catatan.",
        "Tambahkan atau perbarui rencana penanganan bila diperlukan.",
        "Simpan draft secara berkala dengan klik 'Simpan Draft'.",
        "Bila sudah siap, klik 'Finalisasi Pemantauan'.",
      ],
      status: "assessment_draft",
      statusLabel: "Draft",
    },
    {
      title: riskGuideStepTitles[5],
      summary: "Klik 'Finalisasi' - versi lama diarsipkan, versi baru aktif",
      description:
        "Setelah draft lengkap, klik 'Finalisasi'. Sistem langsung menyetujui dan mengaktifkan versi baru. Versi sebelumnya diarsipkan. Pemantauan selesai",
      actions: [
        "Pastikan data pemantauan sudah lengkap dan akurat.",
        "Klik tombol 'Finalisasi Pemantauan'.",
        "Sistem langsung menyetujui dan mengaktifkan versi baru.",
        "Versi pemantauan sebelumnya diarsipkan.",
        "Siklus pemantauan selesai. Mulai pemantauan baru bila perlu.",
      ],
      status: "approved",
      statusLabel: "Disetujui",
    },
  ],
  faq: {
    title: "Pertanyaan yang sering muncul",
    items: [
      {
        question: "Berapa lama satu siklus pemantauan?",
        answer:
          "Siklus pemantauan mengikuti periode organisasi, misalnya setiap semester (H1 dan H2).",
      },
      {
        question:
          "Apakah risiko bisa dipantau lebih dari sekali dalam satu siklus?",
        answer:
          "Ya. Jika ada informasi baru di tengah siklus, bisa dilakukan pemantauan di luar jadwal (ad-hoc) selain pemantauan berkala.",
      },
      {
        question: "Kenapa risiko terkunci setelah disetujui?",
        answer:
          "Risiko dikunci untuk menjaga integritas data. Perubahan bisa dilakukan melalui form pemantauan untuk memastikan perubahan setiap versi dicatat.",
      },
    ],
  },
};

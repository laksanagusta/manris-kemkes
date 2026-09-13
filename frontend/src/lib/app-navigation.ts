export type MainMenuItem = {
  label: string;
  href: string;
  icon: string;
  matchHrefs?: string[];
  adminOnly?: boolean;
};

export type MainMenuGroup = {
  title: string;
  items: MainMenuItem[];
};

export const mainMenuItems: MainMenuGroup[] = [
  {
    title: "TATA KELOLA RISIKO",
    items: [
      {
        label: "Piagam Manris",
        href: "/management/charters",
        icon: "ClipboardPenLine",
        matchHrefs: ["/management/charters"],
      },
      {
        label: "Eskalasi Risiko",
        href: "/risk/cascading",
        icon: "GitBranch",
        matchHrefs: ["/risk/cascading"],
      },
      // {
      //   label: "TMPMR",
      //   href: "/management/tmpmr",
      //   icon: "ClipboardList",
      //   matchHrefs: ["/management/tmpmr"],
      // },
    ],
  },
  {
    title: "MANAJEMEN RISIKO",
    items: [
      { label: "Dashboard", href: "/overview", icon: "LayoutDashboard" },
      { label: "Risiko", href: "/risk/register", icon: "ClipboardList" },
      {
        label: "Penanganan",
        href: "/compliance/penanganan",
        icon: "ClipboardCheck",
      },
      {
        label: "Pemantauan",
        href: "/compliance/monitoring",
        icon: "MonitorDot",
        matchHrefs: ["/compliance/monitoring"],
      },
      {
        label: "Kertas Kerja",
        href: "/risk/working-papers",
        icon: "FileText",
      },
      { label: "Persetujuan & TTE", href: "/inbox", icon: "FileSignature" },
      { label: "Laporan", href: "/reports", icon: "FileBarChart" },
    ],
  },
];

export const adminMenuGroup: MainMenuGroup = {
  title: "ADMINISTRASI",
  items: [
    {
      label: "Pengguna",
      href: "/admin/users",
      icon: "Users",
      adminOnly: true,
    },
    {
      label: "Organisasi",
      href: "/admin/organizations",
      icon: "Building2",
      adminOnly: true,
    },
    {
      label: "Grup",
      href: "/settings/groups",
      icon: "Settings2",
    },
  ],
};

export const breadcrumbMap: Record<string, string> = {
  "/overview": "Dashboard",
  "/design-system": "Design System",
  "/inbox": "Persetujuan",
  "/panduan": "Panduan",
  "/panduan/risiko": "Panduan",
  "/compliance": "Compliance",
  "/compliance/monitoring": "Pemantauan",
  "/compliance/penanganan": "Penanganan",
  "/compliance/controls": "Control Library",
  "/risk": "Risk Assessments",
  "/risk/register": "Risiko",
  "/risk/new": "New Risk",
  "/risk/history": "Risk History",
  "/risk/working-papers": "Kertas Kerja",
  "/risk/working-papers/new": "Buat Kertas Kerja",
  "/controls": "Control Library",
  "/monitoring/overdue": "Overdue",
  "/reports": "Laporan",
  "/evaluations": "Evaluasi",
  "/evaluations/new": "Evaluasi",
  "/reports/formal": "Laporan Formal",
  "/reports/cycle-detail": "Detail Siklus Risiko",
  "/account": "Account",
  "/intelligence": "Inteligensi",
  "/intelligence/transcript": "MoM",
  "/intelligence/minutes": "MoM",
  "/intelligence/minutes/new": "Buat Notulen",
  "/intelligence/document": "Document Intelligence",
  "/minutes": "MoM",
  "/minutes/new": "Buat Notulen",
	"/intelligence/predictive": "Predictive Scoring",
	"/admin": "Administrasi",
  "/admin/users": "Pengguna",
  "/admin/users/new": "Tambah Pengguna",
  "/admin/organizations": "Organisasi",
  "/admin/settings": "Pengaturan",
  "/settings": "Pengaturan",
  "/settings/groups": "Grup",
  "/management": "Tata Kelola Risiko",
  "/management/charters": "Piagam Manris",
  "/management/charters/new": "Buat Piagam Manris",
  "/risk/cascading": "Eskalasi Risiko",
  "/management/planning": "Struktur Kinerja & RO",
  "/management/tmpmr": "TMPMR",
  "/management/tmpmr/new": "Buat TMPMR",
  "/management/criteria": "Scope & Criteria",
};

export type AppPageMeta = {
  title: string;
  subtitle: string;
};

export const appPageMeta: Record<string, AppPageMeta> = {
  "/overview": {
    title: "Dashboard",
    subtitle: "Pantau ringkasan risiko dan prioritas tindak lanjut.",
  },
  "/design-system": {
    title: "Design System",
    subtitle: "Rujukan komponen, pola, dan token visual aplikasi.",
  },
  "/account": {
    title: "Akun Saya",
    subtitle: "Kelola informasi profil dan akses akun Anda.",
  },
  "/admin/organizations": {
    title: "Organisasi",
    subtitle: "Kelola struktur unit kerja dan hubungan antarorganisasi.",
  },
  "/admin/settings": {
    title: "Pengaturan Admin",
    subtitle: "Atur scope, konteks, dan kriteria penilaian risiko.",
  },
  "/admin/users": {
    title: "Pengguna",
    subtitle: "Kelola akun, peran, dan akses pengguna aplikasi.",
  },
  "/admin/users/new": {
    title: "Tambah Pengguna",
    subtitle: "Buat akun baru dengan identitas dan kewenangan yang tepat.",
  },
  "/compliance/controls": {
    title: "Pustaka Kontrol",
    subtitle: "Kelola kontrol yang mendukung pengendalian risiko.",
  },
  "/compliance/controls/new": {
    title: "Tambah Kontrol",
    subtitle: "Tambahkan kontrol dan tetapkan pola pelaksanaannya.",
  },
  "/compliance/monitoring": {
    title: "Pemantauan",
    subtitle: "Tinjau perkembangan risiko dan hasil pemantauan terbaru.",
  },
  "/compliance/penanganan": {
    title: "Penanganan",
    subtitle: "Kelola rencana mitigasi dan tindak lanjut risiko.",
  },
  "/evaluations": {
    title: "Evaluasi",
    subtitle: "Tinjau hasil evaluasi dan tetapkan tindak lanjut yang diperlukan.",
  },
  "/evaluations/new": {
    title: "Buat Evaluasi",
    subtitle: "Siapkan evaluasi untuk menilai perkembangan risiko.",
  },
  "/inbox": {
    title: "Persetujuan & TTE",
    subtitle: "Tinjau pengajuan dan selesaikan proses persetujuan.",
  },
  "/intelligence/document": {
    title: "Document Intelligence",
    subtitle: "Analisis dokumen untuk menemukan risiko dan tindak lanjut.",
  },
  "/intelligence/minutes": {
    title: "MoM",
    subtitle: "Kelola notulen dan hasil tindak lanjut rapat.",
  },
  "/intelligence/minutes/new": {
    title: "Buat Notulen",
    subtitle: "Susun notulen rapat dari transkrip dan hasil pembahasan.",
  },
  "/intelligence/predictive": {
    title: "Predictive Scoring",
    subtitle: "Gunakan pola historis untuk membaca arah perubahan risiko.",
  },
  "/intelligence/transcript": {
    title: "MoM Intelligence",
    subtitle: "Ubah transkrip rapat menjadi risiko dan tindak lanjut terstruktur.",
  },
  "/management/charters": {
    title: "Piagam Manris",
    subtitle: "Tetapkan arah, mandat, dan ruang lingkup manajemen risiko.",
  },
  "/management/charters/new": {
    title: "Buat Piagam Manris",
    subtitle: "Susun piagam sebagai dasar pelaksanaan manajemen risiko.",
  },
  "/management/planning": {
    title: "Struktur Kinerja",
    subtitle: "Kelola struktur kinerja dan sasaran unit kerja.",
  },
  "/management/tmpmr": {
    title: "TMPMR",
    subtitle: "Kelola penilaian tingkat kematangan manajemen risiko.",
  },
  "/management/tmpmr/new": {
    title: "Buat TMPMR",
    subtitle: "Siapkan penilaian kematangan untuk organisasi dan periode yang dipilih.",
  },
  "/minutes": {
    title: "MoM",
    subtitle: "Kelola notulen dan hasil tindak lanjut rapat.",
  },
  "/minutes/new": {
    title: "Buat Notulen",
    subtitle: "Susun notulen rapat dari transkrip dan hasil pembahasan.",
  },
  "/panduan/risiko": {
    title: "Panduan Risiko",
    subtitle: "Pelajari tahapan dan prinsip pengelolaan risiko di Manris.",
  },
  "/reports": {
    title: "Laporan",
    subtitle: "Bandingkan paparan risiko dan perkembangan antarperiode.",
  },
  "/reports/formal": {
    title: "Laporan Formal",
    subtitle: "Gunakan halaman Evaluasi untuk proses pelaporan formal terbaru.",
  },
  "/reports/cycle-detail": {
    title: "Detail Siklus Risiko",
    subtitle: "Tinjau ringkasan risiko dalam satu siklus penilaian.",
  },
  "/risk/cascading": {
    title: "Eskalasi Risiko",
    subtitle: "Kelola hubungan risiko antarunit dan jalur eskalasinya.",
  },
  "/risk/history": {
    title: "Riwayat Risiko",
    subtitle: "Tinjau perubahan risiko dan jejak versi secara berurutan.",
  },
  "/risk/register": {
    title: "Risiko",
    subtitle: "Kelola identifikasi, status, dan siklus pemantauan risiko.",
  },
  "/risk/register/bulk": {
    title: "Import Risiko",
    subtitle: "Tambahkan beberapa risiko melalui template yang telah disiapkan.",
  },
  "/risk/register/new": {
    title: "Tambah Risiko",
    subtitle: "Identifikasi konteks, penyebab, dampak, dan penanganan risiko.",
  },
  "/risk/working-papers": {
    title: "Kertas Kerja",
    subtitle: "Kelola roster risiko dan progres penyusunan kertas kerja.",
  },
  "/risk/working-papers/new": {
    title: "Buat Kertas Kerja Baru",
    subtitle: "Pilih risiko dan penandatangan untuk memulai kertas kerja.",
  },
  "/settings": {
    title: "Pengaturan",
    subtitle: "Kelola preferensi dan konfigurasi aplikasi.",
  },
  "/settings/groups": {
    title: "Grup",
    subtitle: "Kelola pengelompokan organisasi dan pengguna.",
  },
};

const dynamicAppPageMeta: Array<[string, AppPageMeta]> = [
  ["/evaluations/", {
    title: "Form Evaluasi",
    subtitle: "Nilai perkembangan risiko dan tetapkan keputusan evaluasi.",
  }],
  ["/management/charters/", {
    title: "Detail Piagam",
    subtitle: "Tinjau mandat dan ruang lingkup piagam manajemen risiko.",
  }],
  ["/management/planning/", {
    title: "Detail Struktur Kinerja",
    subtitle: "Tinjau sasaran, indikator, dan hubungan struktur kinerja.",
  }],
  ["/management/tmpmr/", {
    title: "Detail TMPMR",
    subtitle: "Tinjau hasil penilaian kematangan manajemen risiko.",
  }],
  ["/minutes/", {
    title: "Detail Notulen",
    subtitle: "Tinjau isi notulen dan tindak lanjut rapat.",
  }],
  ["/risk/assessment/", {
    title: "Monitoring Risiko",
    subtitle: "Catat hasil pemantauan dan perubahan profil risiko.",
  }],
  ["/risk/monitoring/", {
    title: "Pemantauan",
    subtitle: "Catat hasil pemantauan dan perubahan profil risiko.",
  }],
  ["/risk/register/", {
    title: "Detail Risiko",
    subtitle: "Tinjau informasi, penilaian, dan riwayat risiko.",
  }],
  ["/risk/working-papers/", {
    title: "Detail Kertas Kerja",
    subtitle: "Tinjau roster risiko, status, dan proses tanda tangan.",
  }],
];

export function getAppPageMeta(pathname: string): AppPageMeta {
  const exactMeta = appPageMeta[pathname];
  if (exactMeta) {
    return exactMeta;
  }

  const dynamicMeta = dynamicAppPageMeta.find(([path]) =>
    pathname.startsWith(path),
  )?.[1];
  if (dynamicMeta) {
    return dynamicMeta;
  }

  const inheritedMeta = Object.entries(appPageMeta)
    .filter(([path]) => pathname.startsWith(`${path}/`))
    .sort(([left], [right]) => right.length - left.length)
    .map(([, meta]) => meta)[0];

  return inheritedMeta ?? {
    title: breadcrumbMap[pathname] ?? "Manajemen Risiko",
    subtitle: "Kelola proses manajemen risiko secara terstruktur.",
  };
}

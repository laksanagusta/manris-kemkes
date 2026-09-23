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

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export const mainMenuItems: MainMenuGroup[] = [
  {
    title: "TATA KELOLA RISIKO",
    items: [
      {
        label: "Piagam Manris",
        href: "/management/charters",
        icon: "Certificate01",
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
      { label: "Risiko", href: "/risk/register", icon: "Folder01" },
      {
        label: "Kejadian Risiko",
        href: "/risk-events",
        icon: "Alert02",
      },
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
        icon: "Agreement03",
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

type BreadcrumbSearchParams = {
  get(name: string): string | null;
};

function parentBreadcrumb(label: string, href: string): BreadcrumbItem {
  return { label, href };
}

function detailBreadcrumb(
  parent: BreadcrumbItem,
  label: string,
): BreadcrumbItem[] {
  return [parent, { label }];
}

/**
 * Resolves the visible hierarchy for the authenticated application shell.
 *
 * Route segments are implementation details (for example `register` or
 * `working-papers`) and should not leak into the breadcrumb. The resolver
 * keeps each module's collection route as the parent and each form/detail
 * route as the current page.
 */
export function getBreadcrumbItems(
  pathname: string,
  searchParams?: BreadcrumbSearchParams,
  dynamicLabel?: string,
): BreadcrumbItem[] {
  const route = pathname.replace(/\/+$/, "") || "/";
  const riskParent = parentBreadcrumb("Risiko", "/risk/register");

  if (route === "/overview") return [{ label: "Dashboard" }];
  if (route === "/account") return [{ label: "Akun" }];
  if (route === "/design-system") return [{ label: "Design System" }];
  if (route === "/inbox") return [{ label: "Persetujuan & TTE" }];

  if (route === "/risk/register") return [riskParent];
  if (route === "/risk/register/new") {
    return detailBreadcrumb(
      riskParent,
      searchParams?.get("id") ? dynamicLabel ?? "Detail Risiko" : "Tambah Risiko",
    );
  }
  if (route === "/risk/register/bulk") {
    return detailBreadcrumb(riskParent, "Import Risiko");
  }
  if (route === "/risk/register/import-sop") {
    return detailBreadcrumb(riskParent, "Ekstrak Risiko dari SOP");
  }
  if (/^\/risk\/register\/[^/]+$/.test(route)) {
    return detailBreadcrumb(riskParent, dynamicLabel ?? "Detail Risiko");
  }
  if (route === "/risk/history") {
    return detailBreadcrumb(riskParent, "Riwayat Risiko");
  }
  if (route === "/risk/cascading") return [{ label: "Eskalasi Risiko" }];
  if (/^\/risk\/(assessment|monitoring)\/[^/]+$/.test(route)) {
    return detailBreadcrumb(
      parentBreadcrumb("Pemantauan", "/compliance/monitoring"),
      dynamicLabel ?? "Monitoring Risiko",
    );
  }

  const workingPaperParent = parentBreadcrumb("Kertas Kerja", "/risk/working-papers");
  if (route === "/risk/working-papers") return [workingPaperParent];
  if (route === "/risk/working-papers/new") {
    return detailBreadcrumb(workingPaperParent, "Buat Kertas Kerja");
  }
  if (/^\/risk\/working-papers\/[^/]+$/.test(route)) {
    return detailBreadcrumb(workingPaperParent, dynamicLabel ?? "Detail Kertas Kerja");
  }

  const riskEventParent = parentBreadcrumb("Kejadian Risiko", "/risk-events");
  if (route === "/risk-events") return [riskEventParent];
  if (/^\/risk-events\/[^/]+$/.test(route)) {
    return detailBreadcrumb(riskEventParent, dynamicLabel ?? "Detail Kejadian");
  }

  const handlingParent = parentBreadcrumb("Penanganan", "/compliance/penanganan");
  if (route === "/compliance/penanganan") return [handlingParent];
  if (route === "/compliance/penanganan/impor") {
    return detailBreadcrumb(handlingParent, "Impor Laporan Mitigasi");
  }
  if (route === "/compliance/monitoring") return [{ label: "Pemantauan" }];
  if (route === "/compliance/controls") return [{ label: "Control Library" }];
  if (route === "/compliance/controls/new") {
    return detailBreadcrumb(
      parentBreadcrumb("Control Library", "/compliance/controls"),
      "Tambah Kontrol",
    );
  }

  const charterParent = parentBreadcrumb("Piagam Manris", "/management/charters");
  if (route === "/management/charters") return [charterParent];
  if (route === "/management/charters/new") {
    return detailBreadcrumb(charterParent, "Buat Piagam Manris");
  }
  if (/^\/management\/charters\/[^/]+$/.test(route)) {
    return detailBreadcrumb(charterParent, dynamicLabel ?? "Detail Piagam");
  }

  const planningParent = parentBreadcrumb("Struktur Kinerja", "/management/planning");
  if (route === "/management/planning") return [planningParent];
  if (/^\/management\/planning\/[^/]+$/.test(route)) {
    return detailBreadcrumb(planningParent, "Detail Struktur Kinerja");
  }

  const tmpmrParent = parentBreadcrumb("TMPMR", "/management/tmpmr");
  if (route === "/management/tmpmr") return [tmpmrParent];
  if (route === "/management/tmpmr/new") return detailBreadcrumb(tmpmrParent, "Buat TMPMR");
  if (/^\/management\/tmpmr\/[^/]+$/.test(route)) {
    return detailBreadcrumb(tmpmrParent, "Detail TMPMR");
  }

  const evaluationParent = parentBreadcrumb("Evaluasi", "/evaluations");
  if (route === "/evaluations") return [evaluationParent];
  if (route === "/evaluations/new") return detailBreadcrumb(evaluationParent, "Buat Evaluasi");
  if (/^\/evaluations\/[^/]+$/.test(route)) {
    return detailBreadcrumb(evaluationParent, dynamicLabel ?? "Detail Evaluasi");
  }

  const reportParent = parentBreadcrumb("Laporan", "/reports");
  if (route === "/reports") return [reportParent];
  if (route === "/reports/formal") return detailBreadcrumb(reportParent, "Laporan Formal");
  if (route === "/reports/cycle-detail") {
    return detailBreadcrumb(reportParent, "Detail Siklus Risiko");
  }

  const minutesParent = parentBreadcrumb("MoM", "/minutes");
  if (route === "/minutes") return [minutesParent];
  if (route === "/minutes/new") return detailBreadcrumb(minutesParent, "Buat Notulen");
  if (/^\/minutes\/[^/]+$/.test(route)) {
    return detailBreadcrumb(minutesParent, dynamicLabel ?? "Detail Notulen");
  }
  if (route === "/intelligence/transcript") {
    return detailBreadcrumb(parentBreadcrumb("Intelligence", "/intelligence/minutes"), "MoM Intelligence");
  }
  if (route === "/intelligence/minutes") {
    return detailBreadcrumb(parentBreadcrumb("Intelligence", "/intelligence/minutes"), "MoM");
  }
  if (route === "/intelligence/minutes/new") {
    return detailBreadcrumb(parentBreadcrumb("MoM", "/minutes"), "Buat Notulen");
  }
  if (route === "/intelligence/predictive") {
    return detailBreadcrumb(parentBreadcrumb("Intelligence", "/intelligence/minutes"), "Predictive Scoring");
  }

  if (route === "/admin/users") return [{ label: "Pengguna" }];
  if (route === "/admin/users/new") {
    return detailBreadcrumb(parentBreadcrumb("Pengguna", "/admin/users"), "Tambah Pengguna");
  }
  if (route === "/admin/organizations") return [{ label: "Organisasi" }];
  if (route === "/admin/settings") {
    return detailBreadcrumb(parentBreadcrumb("Administrasi", "/admin/users"), "Pengaturan Admin");
  }
  if (route === "/settings") return [{ label: "Pengaturan" }];
  if (route === "/settings/groups") {
    return detailBreadcrumb(parentBreadcrumb("Pengaturan", "/settings"), "Grup");
  }
  if (route === "/panduan/risiko") {
    return [{ label: "Panduan Risiko" }];
  }

  const fallbackSegments = route.split("/").filter(Boolean);
  return fallbackSegments.map((segment, index) => ({
    label: segment.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase()),
    href: index === fallbackSegments.length - 1 ? undefined : `/${fallbackSegments.slice(0, index + 1).join("/")}`,
  }));
}

export const breadcrumbMap: Record<string, string> = {
  "/overview": "Dashboard",
  "/design-system": "Design System",
  "/inbox": "Persetujuan",
  "/panduan": "Panduan",
  "/panduan/risiko": "Panduan",
  "/compliance": "Compliance",
  "/compliance/monitoring": "Pemantauan",
  "/compliance/penanganan": "Penanganan",
  "/compliance/penanganan/impor": "Impor Laporan Mitigasi",
  "/compliance/controls": "Control Library",
  "/risk": "Risk Assessments",
  "/risk/register": "Risiko",
  "/risk/register/import-sop": "Ekstrak Risiko dari SOP",
  "/risk-events": "Kejadian Risiko",
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
  "/compliance/penanganan/impor": {
    title: "Impor Laporan Mitigasi",
    subtitle: "Gunakan dokumen untuk mengisi laporan penanganan yang masih terbuka.",
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
  "/risk-events": {
    title: "Kejadian Risiko",
    subtitle: "Catat kejadian aktual dan hubungkan dengan risiko terkait.",
  },
  "/risk/register/bulk": {
    title: "Import Risiko",
    subtitle: "Tambahkan beberapa risiko melalui template yang telah disiapkan.",
  },
  "/risk/register/import-sop": {
    title: "Ekstrak Risiko dari SOP",
    subtitle: "Temukan kandidat risiko dari dokumen SOP untuk ditinjau dan dibuat sebagai draf.",
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
  ["/risk-events/", {
    title: "Detail Kejadian Risiko",
    subtitle: "Tinjau record LED dan hubungan risikonya.",
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

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
        label: "Struktur Kinerja",
        href: "/management/planning",
        icon: "Goal",
        matchHrefs: ["/management/planning"],
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
      { label: "Daftar Risiko", href: "/risk/register", icon: "ShieldAlert" },
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
      {
        label: "Evaluasi",
        href: "/evaluations",
        icon: "FileText",
        matchHrefs: ["/evaluations", "/reports/formal"],
      },
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
  "/risk/register": "Register Risiko",
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
  "/intelligence/transcript": "Meeting",
  "/intelligence/minutes": "Meeting",
  "/intelligence/minutes/new": "Buat Notulen",
  "/intelligence/document": "Document Intelligence",
  "/minutes": "Meeting",
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

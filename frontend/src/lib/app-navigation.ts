export type MainMenuItem = {
  label: string;
  href: string;
  icon: string;
  matchHrefs?: string[];
};

export type MainMenuGroup = {
  title: string;
  items: MainMenuItem[];
};

export const mainMenuItems: MainMenuGroup[] = [
  {
    title: "RISK GOVERNANCE",
    items: [
      {
        label: "Piagam Manris",
        href: "/management/charters",
        icon: "ClipboardPenLine",
        matchHrefs: ["/management/charters"],
      },
      // {
      //   label: "Eskalasi Risiko",
      //   href: "/risk/cascading",
      //   icon: "GitBranch",
      //   matchHrefs: ["/risk/cascading"],
      // },
      {
        label: "Struktur Kinerja",
        href: "/management/planning",
        icon: "Goal",
        matchHrefs: ["/management/planning"],
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
        label: "Kertas Kerja",
        href: "/risk/working-papers",
        icon: "FileSignature",
      },
      { label: "Persetujuan & TTE", href: "/inbox", icon: "Inbox" },
      {
        label: "Penanganan",
        href: "/compliance/penanganan",
        icon: "ClipboardCheck",
      },
      {
        label: "Monitoring",
        href: "/compliance/monitoring",
        icon: "ClipboardCheck",
        matchHrefs: ["/compliance/monitoring", "/compliance/kri"],
      },
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
  title: "MASTER",
  items: [
    { label: "Users", href: "/admin/users", icon: "Users" },
    {
      label: "Organizations",
      href: "/admin/organizations",
      icon: "Building2",
    },
    // { label: "Settings", href: "/admin/settings", icon: "Settings2" },
  ],
};

export const settingsMenuGroup: MainMenuGroup = {
  title: "PENGATURAN",
  items: [
    {
      label: "Grup",
      href: "/settings/groups",
      icon: "Settings2",
    },
  ],
};

export const breadcrumbMap: Record<string, string> = {
  "/overview": "Dashboard",
  "/inbox": "Persetujuan",
  "/panduan": "Panduan",
  "/panduan/risiko": "Panduan",
  "/compliance": "Compliance",
  "/compliance/monitoring": "Monitoring",
  "/compliance/penanganan": "Penanganan",
  "/compliance/kri": "Monitoring",
  "/compliance/controls": "Control Library",
  "/risk": "Risk Assessments",
  "/risk/register": "Register Risiko",
  "/risk/new": "New Risk",
  "/risk/history": "Risk History",
  "/risk/working-papers": "Kertas Kerja",
  "/risk/working-papers/new": "Buat Kertas Kerja",
  "/controls": "Control Library",
  "/monitoring/overdue": "Overdue",
  "/reports": "Analisis Risiko",
  "/evaluations": "Evaluasi",
  "/evaluations/new": "Evaluasi",
  "/reports/performance-risk": "Analisis Kinerja & Risiko",
  "/reports/formal": "Laporan Formal",
  "/reports/compliance-monitoring": "Monitoring Kepatuhan",
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
  "/intelligence/cba": "Cost Benefit Analysis",
  "/admin": "Administrasi",
  "/admin/users": "Pengguna",
  "/admin/users/new": "Tambah Pengguna",
  "/admin/organizations": "Organisasi",
  "/admin/settings": "Pengaturan",
  "/settings": "Pengaturan",
  "/settings/groups": "Grup",
  "/management": "Risk Governance",
  "/management/charters": "Piagam Manris",
  "/management/charters/new": "Buat Piagam Manris",
  "/risk/cascading": "Eskalasi Risiko",
  "/management/planning": "Struktur Kinerja & RO",
  "/management/tmpmr": "TMPMR",
  "/management/tmpmr/new": "Buat TMPMR",
  "/management/criteria": "Scope & Criteria",
};

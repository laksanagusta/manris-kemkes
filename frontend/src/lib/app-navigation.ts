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
        label: "Piagam MR",
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
      {
        label: "Sasaran & IKU",
        href: "/management/objectives",
        icon: "Goal",
        matchHrefs: ["/management/objectives"],
      },
      {
        label: "TMPMR",
        href: "/management/tmpmr",
        icon: "ClipboardList",
        matchHrefs: ["/management/tmpmr"],
      },
    ],
  },
  {
    title: "MANAJEMEN RISIKO",
    items: [
      { label: "Dashboard", href: "/overview", icon: "LayoutDashboard" },
      { label: "Register Risiko", href: "/risk/register", icon: "ShieldAlert" },
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
    {
      label: "Context",
      href: "/admin/settings/organization-context",
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
  "/reports/formal": "Laporan Formal",
  "/reports/compliance-monitoring": "Monitoring Kepatuhan",
  "/reports/cycle-detail": "Detail Siklus Risiko",
  "/account": "Account",
  "/incident": "Insiden",
  "/incident/new": "New Incident",
  "/incidents": "Insiden",
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
  "/admin/settings/organization-context": "Konteks Organisasi",
  "/management": "Risk Governance",
  "/management/charters": "Piagam MR",
  "/management/charters/new": "Buat Piagam MR",
  "/risk/cascading": "Eskalasi Risiko",
  "/management/objectives": "Sasaran & IKU",
  "/management/objectives/new": "Buat Sasaran",
  "/management/tmpmr": "TMPMR",
  "/management/tmpmr/new": "Buat TMPMR",
  "/management/criteria": "Scope & Criteria",
  "/admin/forms": "Form Builder",
  "/admin/forms/new": "New Form",
  "/forms": "My Forms",
};

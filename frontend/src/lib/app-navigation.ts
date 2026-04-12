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
    title: "MAIN MENU",
    items: [
      { label: "Dashboard", href: "/overview", icon: "LayoutDashboard" },
      { label: "Persetujuan", href: "/inbox", icon: "Inbox" },
      { label: "Risk Register", href: "/risk/register", icon: "ShieldAlert" },
      { label: "Insiden", href: "/incidents", icon: "AlertTriangle" },
      {
        label: "Kertas Kerja",
        href: "/risk/working-papers",
        icon: "FileSignature",
      },
      {
        label: "Monitoring & Updates",
        href: "/compliance/monitoring",
        icon: "ClipboardCheck",
        matchHrefs: ["/compliance/monitoring", "/compliance/kri"],
      },
      { label: "Reports & Export", href: "/reports", icon: "FileBarChart" },
      // { label: "My Forms", href: "/forms", icon: "ClipboardList" },
    ],
  },
];

export const adminMenuGroup: MainMenuGroup = {
  title: "ADMINISTRATION",
  items: [
    { label: "Users", href: "/admin/users", icon: "Users" },
    {
      label: "Organizations",
      href: "/admin/organizations",
      icon: "Building2",
    },
    { label: "Settings", href: "/admin/settings", icon: "Settings2" },
  ],
};

export const breadcrumbMap: Record<string, string> = {
  "/overview": "Dashboard",
  "/inbox": "Persetujuan",
  "/compliance": "Compliance",
  "/compliance/monitoring": "Monitoring & Updates",
  "/compliance/kri": "Monitoring & Updates",
  "/compliance/controls": "Control Library",
  "/risk": "Risk Assessments",
  "/risk/register": "Risk Register",
  "/risk/new": "New Risk",
  "/risk/history": "Risk History",
  "/risk/working-papers": "Kertas Kerja",
  "/risk/working-papers/new": "Buat Kertas Kerja",
  "/controls": "Control Library",
  "/monitoring/overdue": "Overdue",
  "/lessons": "Lessons Learned",
  "/reports": "Reports & Export",
  "/incident": "Insiden",
  "/incident/new": "New Incident",
  "/incidents": "Insiden",
  "/incidents/new": "Laporan Insiden Baru",
  "/incidents/lessons": "Lessons Learned",
  "/intelligence": "Inteligensi",
  "/intelligence/transcript": "Meeting",
  "/intelligence/minutes": "Meeting",
  "/intelligence/minutes/new": "Buat Notulen",
  "/minutes": "Meeting",
  "/minutes/new": "Buat Notulen",
  "/intelligence/predictive": "Predictive Scoring",
  "/intelligence/cba": "Cost Benefit Analysis",
  "/admin": "Administrasi",
  "/admin/users": "Pengguna",
  "/admin/users/new": "Tambah Pengguna",
  "/admin/organizations": "Organisasi",
  "/admin/settings": "Pengaturan",
  "/management/criteria": "Scope & Criteria",
  "/admin/forms": "Form Builder",
  "/admin/forms/new": "New Form",
  "/forms": "My Forms",
};

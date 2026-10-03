export const designSystemBadgeVariants = [
  { label: "Default", variant: "default" },
  { label: "Sekunder", variant: "secondary" },
  { label: "Outline", variant: "outline" },
  { label: "Destruktif", variant: "destructive" },
  { label: "Ghost", variant: "ghost" },
  { label: "Link", variant: "link" },
] as const;

export const designSystemStatusMapping = [
  { status: "Draft", variant: "secondary" },
  { status: "Dalam Review", variant: "outline" },
  { status: "Disetujui", variant: "default" },
  { status: "Finalized", variant: "default" },
  { status: "Diarsipkan", variant: "secondary" },
  { status: "Overdue", variant: "destructive" },
  { status: "Pending", variant: "default" },
  { status: "Ongoing", variant: "default" },
] as const;

export const designSystemRiskLevels = [
  { label: "Sangat Rendah", level: "sangat_rendah", variant: "outline" },
  { label: "Rendah", level: "rendah", variant: "outline" },
  { label: "Sedang", level: "sedang", variant: "outline" },
  { label: "Tinggi", level: "tinggi", variant: "outline" },
  { label: "Sangat Tinggi", level: "sangat_tinggi", variant: "outline" },
] as const;

export const designSystemBadgePalette = [
  { label: "Total", className: "bg-secondary" },
  { label: "Berhasil", className: "bg-green-50" },
  { label: "Ditolak", className: "bg-red-50" },
  { label: "Scope Excel Mingguan", className: "bg-sky-50" },
  { label: "Kuning", className: "bg-yellow-50" },
  { label: "Amber", className: "bg-amber-50" },
  { label: "Oranye", className: "bg-orange-50" },
  { label: "Ungu", className: "bg-violet-50" },
  { label: "Pink", className: "bg-pink-50" },
  { label: "Cyan", className: "bg-cyan-50" },
] as const;

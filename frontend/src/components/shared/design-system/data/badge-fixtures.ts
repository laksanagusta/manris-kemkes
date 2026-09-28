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
  { label: "Sangat Rendah", variant: "default" },
  { label: "Rendah", variant: "default" },
  { label: "Sedang", variant: "default" },
  { label: "Tinggi", variant: "destructive" },
  { label: "Sangat Tinggi", variant: "destructive" },
] as const;

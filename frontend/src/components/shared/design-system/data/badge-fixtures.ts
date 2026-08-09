export const designSystemBadgeTones = [
  { label: "Neutral", tone: "neutral" },
  { label: "Progress", tone: "progress" },
  { label: "Success", tone: "success" },
  { label: "Warning", tone: "warning" },
  { label: "Danger", tone: "danger" },
  { label: "Info", tone: "info" },
] as const;

export const designSystemStatusMapping = [
  { status: "Draft", tone: "neutral" },
  { status: "Dalam Review", tone: "progress" },
  { status: "Disetujui", tone: "success" },
  { status: "Finalized", tone: "success" },
  { status: "Diarsipkan", tone: "neutral" },
  { status: "Overdue", tone: "danger" },
  { status: "Pending", tone: "warning" },
  { status: "Ongoing", tone: "info" },
] as const;

export const designSystemRiskLevels = [
  { label: "Sangat Rendah", tone: "success" },
  { label: "Rendah", tone: "success" },
  { label: "Sedang", tone: "warning" },
  { label: "Tinggi", tone: "danger" },
  { label: "Sangat Tinggi", tone: "danger" },
] as const;

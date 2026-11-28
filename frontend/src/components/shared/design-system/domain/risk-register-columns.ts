export const riskRegisterColumns = [
  { id: "code", label: "Kode risiko", width: 156, locked: true },
  { id: "risk", label: "Risiko", width: 320, locked: true },
  { id: "category", label: "Kategori", width: 160 },
  { id: "organization", label: "Nama Organisasi", width: 180 },
  { id: "score", label: "Skor", width: 80 },
  { id: "status", label: "Status", width: 104 },
  { id: "created", label: "Dibuat", width: 184 },
] as const;

export const riskRegisterActionsWidth = 60;

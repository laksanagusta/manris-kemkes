import type { CreateMonitoringRuleInput, MonitoringRuleFrequency } from "./api/monitoring-rules";

export const monitoringRuleFrequencyLabels: Record<MonitoringRuleFrequency, string> = {
  monthly: "Bulanan",
  quarterly: "Kuartalan",
  semester: "Semesteran",
};

const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const quarters = ["I", "II", "III", "IV"];
const periodCounts = { monthly: 12, quarterly: 4, semester: 2 };

export function createMonitoringRulePeriods(year: number, frequency: MonitoringRuleFrequency): CreateMonitoringRuleInput["periods"] {
  const count = periodCounts[frequency];
  const width = 12 / count;
  return Array.from({ length: count }, (_, index) => {
    const firstMonth = index * width + 1;
    const lastMonth = firstMonth + width - 1;
    const day = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate();
    return {
      label: frequency === "monthly" ? months[index] : `${frequency === "quarterly" ? "Kuartal" : "Semester"} ${quarters[index]}`,
      ordinal: index + 1,
      opensOn: `${year}-${String(firstMonth).padStart(2, "0")}-01`,
      closesOn: `${year}-${String(lastMonth).padStart(2, "0")}-${day}`,
    };
  });
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateMonitoringRuleInput(input: CreateMonitoringRuleInput): string | null {
  if (!input.name.trim() || input.name.trim().length > 120) return "Nama aturan wajib diisi, maksimal 120 karakter.";
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 9998) return "Tahun profil harus berupa tahun antara 1900 dan 9998.";
  const count = periodCounts[input.frequency];
  if (!count || input.periods.length !== count) return `Frekuensi ini memerlukan ${count ?? "jumlah"} periode.`;
  for (const [index, period] of input.periods.entries()) {
    if (period.ordinal !== index + 1 || !period.label.trim()) return "Label dan urutan periode harus lengkap dan berurutan.";
    if (!isCalendarDate(period.opensOn) || !isCalendarDate(period.closesOn)) return `Lengkapi tanggal yang valid untuk ${period.label}.`;
    if (period.opensOn < `${input.year}-01-01` || period.closesOn > `${input.year + 1}-12-31`) return `Jadwal ${period.label} harus berada pada tahun profil atau tahun berikutnya.`;
    if (period.opensOn > period.closesOn) return `Tanggal tutup ${period.label} tidak boleh sebelum tanggal buka.`;
    if (index && period.opensOn <= input.periods[index - 1].closesOn) return `Jadwal ${period.label} tumpang tindih atau mendahului periode sebelumnya.`;
  }
  return null;
}

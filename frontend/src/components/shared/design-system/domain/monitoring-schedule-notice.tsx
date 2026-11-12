import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "@/components/shared/icons";
import { formatDisplayDate } from "@/lib/display-date";
import { getMonitoringWindow } from "@/lib/monitoring-window";

export function MonitoringScheduleNotice({ cycle, locked }: { cycle: string; locked: boolean }) {
  const schedule = getMonitoringWindow(cycle);
  if (!schedule) return null;

  const deadline = formatDisplayDate(new Date(schedule.end.getTime() - 60_000), {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });

  return (
    <Alert role="note" className="border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle aria-hidden="true" />
      <AlertTitle>{locked ? "Draf terkunci" : `Tenggat Pemantauan ${cycle}`}</AlertTitle>
      <AlertDescription className="text-current">
        {locked
          ? `Pengisian ${cycle} ditutup pada ${deadline} WIB. Isian tersimpan tersedia untuk dibaca.`
          : `Simpan dan finalisasi paling lambat ${deadline} WIB.`}
      </AlertDescription>
    </Alert>
  );
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "@/components/shared/icons";
import { getWorkMonitoringPeriod } from "@/lib/operator-work-monitoring-period";

export function OperatorMonitoringPeriod({ today }: { today: string }) {
  const period = getWorkMonitoringPeriod(today);
  if (!period) return null;

  return (
    <Alert variant="info" data-operator-monitoring-period="" role="note" aria-label="Periode pemantauan">
      <AlertCircle aria-hidden="true" />
      <AlertDescription className="flex min-w-0 flex-wrap gap-x-8 gap-y-3" aria-label="Jadwal pemantauan">
        <div className="min-w-0 flex-[1_1_16rem] space-y-1">
          <AlertTitle className="text-muted-foreground">Periode pemantauan</AlertTitle>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong className="font-medium text-foreground">{period.label}</strong>
            <Badge variant="secondary">Pencatatan kapan saja</Badge>
          </div>
          <div className="text-muted-foreground">Kelompok laporan <span data-date-time="">{period.windowLabel}</span> (WIB). Tanggal pengamatan menentukan periode laporan.</div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "@/components/shared/icons";
import { getWorkMonitoringPeriod } from "@/lib/operator-work-monitoring-period";

export function OperatorMonitoringPeriod({ today }: { today: string }) {
  const period = getWorkMonitoringPeriod(today);
  if (!period) return null;

  return (
    <Alert variant="info" role="note" aria-label="Periode pemantauan">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Periode pemantauan</AlertTitle>
      <AlertDescription className="space-y-1" aria-label="Jadwal pemantauan">
        <p>
          <strong className="font-medium">{period.label}</strong> · {period.isOpen ? "Pengisian dibuka" : "Pengisian ditutup"}. Periode {period.windowLabel} (WIB).
        </p>
        {period.next ? (
          <p>
            Periode berikutnya: <strong className="font-medium">{period.next.label}</strong>. Periode {period.next.windowLabel} (WIB).
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

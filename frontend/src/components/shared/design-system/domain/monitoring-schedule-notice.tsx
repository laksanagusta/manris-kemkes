import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "@/components/shared/icons";

export function MonitoringScheduleNotice({ cycle, locked }: { cycle: string; locked: boolean }) {
  // Compatibility specimen for callers of the former calendar-window notice.
  void locked;

  return (
    <Alert variant="info" role="note">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>Pencatatan pemantauan</AlertTitle>
      <AlertDescription className="text-current">
        Tanggal pengamatan menentukan kelompok laporan {cycle}. Pemantauan dapat dicatat kapan saja dan hasil final tersimpan sebagai riwayat.
      </AlertDescription>
    </Alert>
  );
}

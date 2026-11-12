import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDisplayDate } from "@/lib/display-date";

export function SimulatedTimeNotice({ date }: { date: Date }) {
  return (
    <Alert variant="info" role="note">
      <AlertDescription>
        Waktu simulasi · {formatDisplayDate(date, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })} WIB
      </AlertDescription>
    </Alert>
  );
}

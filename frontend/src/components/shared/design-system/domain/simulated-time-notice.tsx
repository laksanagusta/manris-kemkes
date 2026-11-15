import { AlertTriangle } from "@/components/shared/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDisplayDate } from "@/lib/display-date";

export function SimulatedTimeNotice({ date }: { date: Date }) {
  return (
    <Alert
      role="note"
      className="w-fit max-w-full rounded-md border-[var(--badge-amber-foreground)]/20 bg-[var(--badge-amber-surface)] px-2.5 py-1.5 text-[var(--badge-amber-foreground)]"
    >
      <AlertTriangle className="size-3.5 translate-y-px" aria-hidden="true" />
      <AlertDescription className="text-xs leading-4 text-current">
        Waktu simulasi · {formatDisplayDate(date, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })} WIB
      </AlertDescription>
    </Alert>
  );
}

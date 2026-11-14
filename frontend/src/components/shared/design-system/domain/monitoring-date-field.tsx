"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { todayMonitoringDate } from "@/lib/monitoring-date";

export function MonitoringDateField({ id, value, onChange, disabled, min }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Tanggal pemantauan</Label>
      <Input id={id} type="date" value={value} min={min} max={todayMonitoringDate()}
        onChange={(event) => onChange(event.target.value)} disabled={disabled} required
        aria-describedby={`${id}-help`} />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        Isi tanggal kondisi risiko diamati. Jadwal dan jumlah pemantauan mengikuti aturan profil yang dipilih.
      </p>
    </div>
  );
}

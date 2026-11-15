"use client";

import { FieldHeading } from "@/components/ui/field";
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
      <FieldHeading>
        <Label htmlFor={id}>Tanggal pemantauan</Label>
        <p id={`${id}-help`} className="leading-4 text-xs text-muted-foreground">
          Isi tanggal kondisi risiko diamati. Jadwal dan jumlah pemantauan mengikuti aturan profil yang dipilih.
        </p>
      </FieldHeading>
      <Input id={id} type="date" value={value} min={min} max={todayMonitoringDate()}
        onChange={(event) => onChange(event.target.value)} disabled={disabled} required
        aria-describedby={`${id}-help`} />
    </div>
  );
}

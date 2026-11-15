"use client";

import { FieldHeading } from "@/components/ui/field";
import { useId } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type MitigationExecution = "pending" | "done" | "skipped";

export function MitigationExecutionField({ value, onChange, disabled }: {
  value: MitigationExecution;
  onChange: (value: MitigationExecution) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldHeading>
        <Label htmlFor={id}>Pelaksanaan mitigasi</Label>
        <p id={`${id}-hint`} className="leading-4 text-xs text-muted-foreground">Catat hasil pelaksanaan atau alasan jika belum dilaksanakan.</p>
      </FieldHeading>
      <Select value={value} onValueChange={(next) => onChange(next as MitigationExecution)} disabled={disabled}>
        <SelectTrigger id={id} className="w-full" aria-describedby={`${id}-hint`}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Sedang dilaksanakan</SelectItem>
          <SelectItem value="done">Selesai</SelectItem>
          <SelectItem value="skipped">Belum dilaksanakan</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

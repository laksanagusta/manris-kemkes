"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listRiskObjectives } from "@/lib/api/risk-objectives";
import type { RiskObjective } from "@/types/risk-objective";

type ObjectivePickerProps = {
  token: string;
  organizationId?: string;
  period?: string;
  value?: string;
  disabled?: boolean;
  onChange: (objectiveId: string, summary?: Pick<RiskObjective, "tujuan" | "sasaran" | "indikatorKinerjaUtama" | "target" | "program" | "kegiatan">) => void;
};

export function ObjectivePicker({ token, organizationId, period, value, disabled, onChange }: ObjectivePickerProps) {
  const [options, setOptions] = useState<RiskObjective[]>([]);

  useEffect(() => {
    if (!token || !organizationId) {
      setOptions([]);
      return;
    }

    listRiskObjectives(token, {
      organizationId,
      ...(period ? { period } : {}),
      limit: 100,
      page: 1,
    })
      .then((response) => setOptions(response.data ?? []))
      .catch(() => setOptions([]));
  }, [organizationId, period, token]);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Sasaran / IKU terkait</Label>
      <Select
        value={value || undefined}
        onValueChange={(nextValue) => {
          const selected = options.find((item) => item.id === nextValue);
          onChange(nextValue, selected);
        }}
        disabled={disabled || !organizationId}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={organizationId ? "Pilih sasaran/IKU" : "Pilih unit kerja terlebih dahulu"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item.id} value={item.id} className="text-sm">
              {item.sasaran}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Pilih sasaran organisasi yang terdampak langsung oleh risiko ini sesuai KMK.
      </p>
    </div>
  );
}

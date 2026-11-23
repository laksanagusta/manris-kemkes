"use client";

import { useId, type ComponentProps } from "react";
import { RemoteUserPicker } from "@/components/risk/remote-user-picker";
import { Field, FieldDescription, FieldHeading } from "@/components/ui/field";
import { Label } from "@/components/ui/label";

type RiskOwnerFieldProps = Pick<
  ComponentProps<typeof RemoteUserPicker>,
  "disabled" | "loadOptions" | "onSelect" | "value"
> & {
  hasOrganization: boolean;
  onClear: () => void;
};

export function RiskOwnerField({ disabled, hasOrganization, loadOptions, onSelect, onClear, value }: RiskOwnerFieldProps) {
  const id = useId();
  return (
    <Field>
      <FieldHeading>
        <Label htmlFor={id}>Pemilik Risiko</Label>
        <FieldDescription>
          {hasOrganization ? "Pilih pengguna aktif di unit pemilik risiko." : "Unit pemilik risiko diperlukan untuk memilih pengguna."}
        </FieldDescription>
      </FieldHeading>
      <RemoteUserPicker
        presentation="assignee"
        triggerId={id}
        title="Pemilik Risiko"
        description="Cari pengguna aktif di unit pemilik risiko."
        placeholder="Pilih pemilik risiko"
        searchPlaceholder="Cari pengguna"
        emptyMessage="Pengguna aktif tidak ditemukan di unit ini."
        value={value}
        onSelect={onSelect}
        clearSelection={{ label: "Kosongkan pemilik risiko", onSelect: onClear }}
        loadOptions={loadOptions}
        disabled={disabled || !hasOrganization}
      />
    </Field>
  );
}

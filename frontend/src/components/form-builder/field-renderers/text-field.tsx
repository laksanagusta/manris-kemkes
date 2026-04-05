"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { FieldRendererProps } from "./index";

export function TextField({
  field,
  value,
  onChange,
  error,
  disabled,
}: FieldRendererProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={field.id}>
        {field.label}
        {field.isRequired && (
         <span className="text-destructive ml-0.5">*</span>
        )}
      </Label>
      <Input
        id={field.id}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? undefined}
        disabled={disabled}
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

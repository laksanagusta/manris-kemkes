"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import type { FieldRendererProps } from "./index";

export function RadioField({
  field,
  value,
  onChange,
  error,
  disabled,
}: FieldRendererProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label>
        {field.label}
        {field.isRequired && (
          <span className="text-destructive ml-0.5">*</span>
        )}
      </Label>
      <RadioGroup
        value={(value as string) ?? ""}
        onValueChange={onChange}
        disabled={disabled}
        aria-invalid={!!error}
      >
        {field.options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
            <Label htmlFor={`${field.id}-${option.value}`} className="font-normal">
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

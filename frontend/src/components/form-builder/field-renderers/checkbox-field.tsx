"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { FieldRendererProps } from "./index";

export function CheckboxField({
  field,
  value,
  onChange,
  error,
  disabled,
}: FieldRendererProps) {
  const selected = (value as string[]) ?? [];

  function handleToggle(optionValue: string, checked: boolean) {
    const next = checked
      ? [...selected, optionValue]
      : selected.filter((v) => v !== optionValue);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>
        {field.label}
        {field.isRequired && (
         <span className="text-destructive ml-0.5">*</span>
        )}
      </Label>
      <div className="flex flex-col gap-2">
        {field.options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`${field.id}-${option.value}`}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) =>
                handleToggle(option.value, checked === true)
              }
              disabled={disabled}
            />
            <Label
              htmlFor={`${field.id}-${option.value}`}
              className="font-normal"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

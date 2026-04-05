"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { FieldRendererProps } from "./index";

export function TextareaField({
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
      <Textarea
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

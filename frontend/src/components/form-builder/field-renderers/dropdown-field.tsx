"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FieldRendererProps } from "./index";

export function DropdownField({
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
      <Select
        value={(value as string) ?? ""}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger id={field.id} aria-invalid={!!error}>
          <SelectValue placeholder={field.placeholder ?? "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  );
}

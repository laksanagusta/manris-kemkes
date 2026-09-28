"use client";

import { Textarea } from "@/components/shared/design-system";

interface EditableListProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}

export function EditableList({
  id,
  ariaLabel,
  value,
  onChange,
  placeholder,
  disabled,
  invalid = false,
}: EditableListProps) {
  return (
    <Textarea
      id={id}
      aria-label={ariaLabel}
      aria-invalid={invalid}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="resize-none"
    />
  );
}

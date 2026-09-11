"use client";

import { Textarea } from "@/components/shared/design-system";

interface EditableListProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableList({
  id,
  ariaLabel,
  value,
  onChange,
  placeholder,
  disabled,
}: EditableListProps) {
  return (
    <Textarea
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="min-h-[80px] text-xs bg-muted/20 resize-none leading-relaxed"
    />
  );
}

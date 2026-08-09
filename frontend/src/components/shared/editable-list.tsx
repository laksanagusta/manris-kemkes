"use client";

import { Textarea } from "@/components/ui/textarea";

interface EditableListProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EditableList({ value, onChange, placeholder, disabled }: EditableListProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="min-h-[80px] text-xs bg-muted/20 border-border/50 resize-none leading-relaxed"
    />
  );
}

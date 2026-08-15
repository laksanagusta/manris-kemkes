import { Type, AlignLeft, CheckSquare, Circle, ChevronDown } from "@/components/ui/icons";

import type { FormFieldType } from "@/types/form";

export interface FieldTypeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPlaceholder: string;
  hasOptions: boolean;
}

export const FIELD_TYPE_CONFIG: Record<FormFieldType, FieldTypeConfig> = {
  text: {
    label: "Text Box",
    icon: Type,
    defaultPlaceholder: "Enter text...",
    hasOptions: false,
  },
  textarea: {
    label: "Text Area",
    icon: AlignLeft,
    defaultPlaceholder: "Enter detailed response...",
    hasOptions: false,
  },
  radio: {
    label: "Radio Button",
    icon: Circle,
    defaultPlaceholder: "Select one option",
    hasOptions: true,
  },
  checkbox: {
    label: "Checkbox",
    icon: CheckSquare,
    defaultPlaceholder: "Select multiple options",
    hasOptions: true,
  },
  dropdown: {
    label: "Dropdown",
    icon: ChevronDown,
    defaultPlaceholder: "Choose from list",
    hasOptions: true,
  },
};

export const FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "radio",
  "checkbox",
  "dropdown",
];

export function getFieldTypeConfig(
  type: FormFieldType
): FieldTypeConfig {
  return FIELD_TYPE_CONFIG[type];
}

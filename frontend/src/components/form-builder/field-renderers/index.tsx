import type { FormField, FormFieldType } from "@/types/form";

import { CheckboxField } from "./checkbox-field";
import { DropdownField } from "./dropdown-field";
import { RadioField } from "./radio-field";
import { TextField } from "./text-field";
import { TextareaField } from "./textarea-field";

export interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

const FIELD_RENDERER_MAP: Record<
  FormFieldType,
  React.ComponentType<FieldRendererProps>
> = {
  text: TextField,
  textarea: TextareaField,
  radio: RadioField,
  checkbox: CheckboxField,
  dropdown: DropdownField,
};

export function FieldRenderer(props: FieldRendererProps) {
  const Renderer = FIELD_RENDERER_MAP[props.field.fieldType];
  if (!Renderer) return null;
  return <Renderer {...props} />;
}

export type FormFieldType = "text" | "textarea" | "radio" | "checkbox" | "dropdown";

export type FormField = {
  id: string;
  fieldKey: string;
  type?: FormFieldType;
  conditionalLogic?: {
    sourceFieldId: string;
    value: string;
  } | null;
};

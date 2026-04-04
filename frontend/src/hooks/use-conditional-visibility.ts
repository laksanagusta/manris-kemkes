import { useMemo } from "react";
import type { FormField } from "@/types/form";

/**
 * Returns a Set of visible field IDs based on conditional logic evaluation.
 * Fields without conditionalLogic are always visible.
 * Fields with conditionalLogic are visible only when sourceField value === condition value.
 */
export function useConditionalVisibility(
  fields: FormField[],
  formValues: Record<string, unknown>,
): Set<string> {
  return useMemo(() => {
    const idToKey = new Map<string, string>();
    for (const field of fields) {
      idToKey.set(field.id, field.fieldKey);
    }

    const visible = new Set<string>();

    for (const field of fields) {
      const logic = field.conditionalLogic;

      if (!logic) {
        visible.add(field.id);
        continue;
      }

      const sourceKey = idToKey.get(logic.sourceFieldId);
      if (!sourceKey) continue;

      const currentValue = formValues[sourceKey];

      if (Array.isArray(currentValue)) {
        if (currentValue.includes(logic.value)) {
          visible.add(field.id);
        }
      } else if (String(currentValue ?? "") === logic.value) {
        visible.add(field.id);
      }
    }

    return visible;
  }, [fields, formValues]);
}

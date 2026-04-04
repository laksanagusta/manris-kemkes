import { useReducer } from "react";
import type {
  FormFieldType,
  FormFieldOption,
  Form,
  TargetAudience,
} from "@/types/form";

// ── Builder Types ─────────────────────────────────────────────────────────────

export interface BuilderField {
  id: string;
  fieldType: FormFieldType;
  label: string;
  placeholder: string;
  isRequired: boolean;
  options: FormFieldOption[];
  conditionSourceFieldId: string | null;
  conditionValue: string;
}

export interface BuilderSection {
  id: string;
  title: string;
  description: string;
  fields: BuilderField[];
}

export interface FormBuilderState {
  title: string;
  description: string;
  targetAudience: TargetAudience;
  organizationIds: string[];
  sections: BuilderSection[];
  selectedFieldId: string | null;
  isDirty: boolean;
  isSubmitting: boolean;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export type FormBuilderAction =
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_DESCRIPTION"; payload: string }
  | { type: "SET_TARGET_AUDIENCE"; payload: TargetAudience }
  | { type: "SET_ORG_IDS"; payload: string[] }
  | { type: "ADD_SECTION"; payload: { id: string } }
  | { type: "REMOVE_SECTION"; payload: { sectionId: string } }
  | {
      type: "UPDATE_SECTION_TITLE";
      payload: { sectionId: string; title: string };
    }
  | {
      type: "UPDATE_SECTION_DESCRIPTION";
      payload: { sectionId: string; description: string };
    }
  | {
      type: "ADD_FIELD";
      payload: { sectionId: string; fieldId: string; fieldType: FormFieldType };
    }
  | { type: "REMOVE_FIELD"; payload: { sectionId: string; fieldId: string } }
  | {
      type: "UPDATE_FIELD";
      payload: {
        sectionId: string;
        fieldId: string;
        updates: Partial<BuilderField>;
      };
    }
  | { type: "SELECT_FIELD"; payload: string | null }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "LOAD_FORM"; payload: FormBuilderState }
  | { type: "MARK_CLEAN" };

// ── Initial State ─────────────────────────────────────────────────────────────

export const initialFormBuilderState: FormBuilderState = {
  title: "",
  description: "",
  targetAudience: "all",
  organizationIds: [],
  sections: [],
  selectedFieldId: null,
  isDirty: false,
  isSubmitting: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function createDefaultField(
  fieldId: string,
  fieldType: FormFieldType,
): BuilderField {
  const needsOptions =
    fieldType === "radio" || fieldType === "checkbox" || fieldType === "dropdown";
  return {
    id: fieldId,
    fieldType,
    label: "",
    placeholder: "",
    isRequired: false,
    options: needsOptions
      ? [
          { value: "option_1", label: "Opsi 1" },
          { value: "option_2", label: "Opsi 2" },
        ]
      : [],
    conditionSourceFieldId: null,
    conditionValue: "",
  };
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function formBuilderReducer(
  state: FormBuilderState,
  action: FormBuilderAction,
): FormBuilderState {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.payload, isDirty: true };

    case "SET_DESCRIPTION":
      return { ...state, description: action.payload, isDirty: true };

    case "SET_TARGET_AUDIENCE":
      return {
        ...state,
        targetAudience: action.payload,
        organizationIds:
          action.payload === "all" ? [] : state.organizationIds,
        isDirty: true,
      };

    case "SET_ORG_IDS":
      return { ...state, organizationIds: action.payload, isDirty: true };

    case "ADD_SECTION":
      return {
        ...state,
        sections: [
          ...state.sections,
          {
            id: action.payload.id,
            title: "",
            description: "",
            fields: [],
          },
        ],
        isDirty: true,
      };

    case "REMOVE_SECTION": {
      const removedFields = state.sections
        .find((s) => s.id === action.payload.sectionId)
        ?.fields.map((f) => f.id) ?? [];
      const newSelectedId =
        state.selectedFieldId && removedFields.includes(state.selectedFieldId)
          ? null
          : state.selectedFieldId;
      // Clear conditional references to removed fields
      const newSections = state.sections
        .filter((s) => s.id !== action.payload.sectionId)
        .map((s) => ({
          ...s,
          fields: s.fields.map((f) =>
            f.conditionSourceFieldId &&
            removedFields.includes(f.conditionSourceFieldId)
              ? { ...f, conditionSourceFieldId: null, conditionValue: "" }
              : f,
          ),
        }));
      return {
        ...state,
        sections: newSections,
        selectedFieldId: newSelectedId,
        isDirty: true,
      };
    }

    case "UPDATE_SECTION_TITLE":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.sectionId
            ? { ...s, title: action.payload.title }
            : s,
        ),
        isDirty: true,
      };

    case "UPDATE_SECTION_DESCRIPTION":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.sectionId
            ? { ...s, description: action.payload.description }
            : s,
        ),
        isDirty: true,
      };

    case "ADD_FIELD": {
      const newField = createDefaultField(
        action.payload.fieldId,
        action.payload.fieldType,
      );
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.sectionId
            ? { ...s, fields: [...s.fields, newField] }
            : s,
        ),
        selectedFieldId: newField.id,
        isDirty: true,
      };
    }

    case "REMOVE_FIELD": {
      const removedId = action.payload.fieldId;
      const newSelectedId =
        state.selectedFieldId === removedId ? null : state.selectedFieldId;
      // Clear conditional references to removed field
      return {
        ...state,
        sections: state.sections.map((s) => ({
          ...s,
          fields: s.fields
            .filter(
              (f) =>
                !(
                  s.id === action.payload.sectionId && f.id === removedId
                ),
            )
            .map((f) =>
              f.conditionSourceFieldId === removedId
                ? { ...f, conditionSourceFieldId: null, conditionValue: "" }
                : f,
            ),
        })),
        selectedFieldId: newSelectedId,
        isDirty: true,
      };
    }

    case "UPDATE_FIELD":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.payload.sectionId
            ? {
                ...s,
                fields: s.fields.map((f) =>
                  f.id === action.payload.fieldId
                    ? { ...f, ...action.payload.updates }
                    : f,
                ),
              }
            : s,
        ),
        isDirty: true,
      };

    case "SELECT_FIELD":
      return { ...state, selectedFieldId: action.payload };

    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.payload };

    case "LOAD_FORM":
      return { ...action.payload, isDirty: false, isSubmitting: false };

    case "MARK_CLEAN":
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFormBuilder(initial?: FormBuilderState) {
  return useReducer(formBuilderReducer, initial ?? initialFormBuilderState);
}

// ── Serialization ─────────────────────────────────────────────────────────────

import type { CreateFormDTO, CreateFieldDTO, ConditionalLogic } from "@/types/form";

function generateFieldKey(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return slug || `field_${index + 1}`;
}

export function serializeFormState(state: FormBuilderState): CreateFormDTO {
  // Build a map from client field ID → generated fieldKey for cross-references
  const fieldKeyMap = new Map<string, string>();
  const usedKeys = new Set<string>();

  state.sections.forEach((s) => {
    s.fields.forEach((f, fIdx) => {
      let key = generateFieldKey(f.label, fIdx);
      let counter = 2;
      while (usedKeys.has(key)) {
        key = `${generateFieldKey(f.label, fIdx)}_${counter}`;
        counter++;
      }
      usedKeys.add(key);
      fieldKeyMap.set(f.id, key);
    });
  });

  return {
    title: state.title,
    description: state.description || null,
    targetAudience: state.targetAudience,
    sections: state.sections.map((s, sIdx) => ({
      title: s.title || `Bagian ${sIdx + 1}`,
      description: s.description || null,
      position: sIdx,
      fields: s.fields.map((f, fIdx) => {
        let conditionalLogic: ConditionalLogic | null = null;
        if (f.conditionSourceFieldId && f.conditionValue) {
          conditionalLogic = {
            sourceFieldId: f.conditionSourceFieldId,
            value: f.conditionValue,
          };
        }

        const field: CreateFieldDTO = {
          fieldType: f.fieldType,
          fieldKey: fieldKeyMap.get(f.id) ?? `field_${fIdx}`,
          label: f.label || `Field ${fIdx + 1}`,
          placeholder: f.placeholder || null,
          isRequired: f.isRequired,
          options: f.options,
          position: fIdx,
          conditionalLogic,
        };
        return field;
      }),
    })),
  };
}

// ── Deserialization ───────────────────────────────────────────────────────────

export function deserializeForm(form: Form): FormBuilderState {
  return {
    title: form.title,
    description: form.description ?? "",
    targetAudience: form.targetAudience,
    organizationIds: [],
    sections: (form.sections ?? [])
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? "",
        fields: (s.fields ?? [])
          .sort((a, b) => a.position - b.position)
          .map((f) => ({
            id: f.id,
            fieldType: f.fieldType,
            label: f.label,
            placeholder: f.placeholder ?? "",
            isRequired: f.isRequired,
            options: f.options ?? [],
            conditionSourceFieldId:
              f.conditionalLogic?.sourceFieldId ?? null,
            conditionValue: f.conditionalLogic?.value ?? "",
          })),
      })),
    selectedFieldId: null,
    isDirty: false,
    isSubmitting: false,
  };
}

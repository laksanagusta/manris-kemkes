# Decisions — Dynamic Form Builder

## Architecture
- Hybrid DB: normalized tables for form structure, JSONB for responses (`answers`) and field options (`options`)
- GIN index with `jsonb_path_ops` on `form_responses.answers` for analytics queries
- `useReducer` for form builder state (no Zustand)
- React Hook Form + dynamic Zod schema for form filler
- `@dnd-kit/react` new API: `DragDropProvider`, `useSortable` — NOT `@dnd-kit/core`
- Recharts for analytics charts (already in project)
- No unit tests — agent QA via curl + psql + playwright

## Database
- `form_fields.options` JSONB (not a separate table)
- `form_responses.answers` JSONB (key = field_key, value = answer)
- `form_assignments.organization_id` references organizations table
- UNIQUE constraint: `(form_id, respondent_id)` on `form_responses`
- UNIQUE constraint: `(form_id, organization_id)` on `form_assignments`

## Business Rules
- Only "equals" conditional logic (no NOT, AND, OR)
- Checkbox cannot be conditional source
- Hidden required fields: skip validation + omit from answers
- Empty form cannot be published (need ≥1 section with ≥1 field)
- Options-based fields (radio/checkbox/dropdown) need ≥2 options
- Form locked after first response (use HasResponses check before any edit)
- Closed form cannot be reopened
- 1 response per user per form

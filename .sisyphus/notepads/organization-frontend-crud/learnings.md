## Learnings

- Organization tree building can stay simple with a two-pass map + parent-link approach; it preserves input order and avoids mutating source data.
- Parent selector blocking should use a descendant walk from the current org ID so self-references and nested cycles are excluded consistently.
- Backend request payloads for this flow need PascalCase keys (`Name`, `ParentID`) even though API responses are snake_case.
- Error-copy mapping is best handled with message-pattern checks layered on top of action-specific fallbacks.
- Delete confirmation dialogs follow the approval-modal pattern: async state management, toast notifications, and preventing dialog close during submission.
- Destructive action buttons use semantic design tokens: `bg-destructive text-destructive-foreground hover:bg-destructive/90` for consistent danger styling.
- Error handling for delete operations uses `getOrganizationActionErrorMessage()` helper which maps backend constraint errors to user-friendly Indonesian messages.
- Dialog close button visibility is controlled via `showCloseButton={!isSubmitting}` to prevent users from dismissing during async operations.

## Organization Form Dialog Component

### Pattern: Shared Create/Edit Dialog
- Use single dialog component with `mode` prop ("create" | "edit")
- Reset form state via `useEffect` when `open`, `mode`, or `initialOrganization` changes
- Prevent closing while submitting with guard in `handleOpenChange`

### State Management
- Local state for form fields (name, parentValue)
- Local state for UI state (isSubmitting, errorMessage)
- Use `"__ROOT__"` sentinel value for "no parent" selection

### Parent Selector Logic
- Use `getAvailableParentOptions()` helper to exclude invalid parents
- In edit mode, exclude current org and its descendants from parent options
- Always include "Tanpa parent (root)" option with `"__ROOT__"` value

### Form Reset Pattern
```typescript
useEffect(() => {
  if (open) {
    setErrorMessage(null);
    setIsSubmitting(false);
    
    if (mode === "create") {
      setName("");
      setParentValue("__ROOT__");
    } else if (mode === "edit" && initialOrganization) {
      setName(initialOrganization.name);
      setParentValue(initialOrganization.parent_id || "__ROOT__");
    }
  }
}, [open, mode, initialOrganization]);
```

### API Integration
- Use `toOrganizationRequestBody()` helper to map form data to backend format
- Backend expects PascalCase: `{ Name: string, ParentID: string | null }`
- Use `getOrganizationActionErrorMessage()` for user-friendly error messages

### Accessibility
- Use `htmlFor` and `id` attributes for label-input association
- Use `aria-invalid` for error state
- Use `showCloseButton` prop to hide close button during submission
- Indonesian labels: "Nama organisasi", "Parent unit", "Simpan organisasi", "Perbarui organisasi"

## Task 5: Harden Mutation UX, Route Hygiene, and QA Selectors

### QA Selectors/Accessibility Names
- All QA-critical controls have proper aria-labels:
  - Create trigger button: `aria-label="Tambah Organisasi"`
  - Row action button: `aria-label={`Aksi untuk ${organization.name}`}`
  - Form dialog submit: "Simpan organisasi" (create) / "Perbarui organisasi" (edit)
  - Delete dialog button: "Hapus"

### Inline Validation for Blank Name
- Validation shows "Nama organisasi wajib diisi" when name is empty
- Error clears automatically when user starts typing
- Submit button is disabled when name is empty (`disabled={isSubmitting || !name.trim()}`)

### Support Clearing Parent on Edit
- "Tanpa parent (root)" option with `__ROOT__` value in Select
- Parent can be changed to root in edit mode
- Parent is set to `initialOrganization.parent_id || "__ROOT__"` in edit mode

### Backend Error Messages
- Error mapping function `getOrganizationActionErrorMessage()` handles all cases:
  - Invalid parent: "Parent unit tidak valid. Pilih unit lain yang bukan dirinya sendiri atau turunannya."
  - Child org delete: "Organisasi ini tidak bisa dihapus karena masih memiliki sub-unit."
  - FK/reference: "Organisasi ini tidak bisa dihapus karena masih dipakai di data lain."

### Route Hygiene
- No dependency on `/admin/organizations/new` route
- Create button uses onClick handler instead of Link component
- All mutations handled through dialogs

### React Hooks Best Practices
- Avoid calling setState directly in useEffect body
- Use eslint-disable-next-line for intentional dependency omissions
- Remove unused imports (useCallback) to keep code clean

### Unescaped Entities
- Use HTML entities for quotes in JSX: `&ldquo;` and `&rdquo;` instead of `"`
- ESLint rule: react/no-unescaped-entities

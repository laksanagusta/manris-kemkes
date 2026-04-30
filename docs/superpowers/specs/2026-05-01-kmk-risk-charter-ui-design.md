# KMK Risk Charter UI Design

**Date:** 2026-05-01
**Scope:** Task 3 — frontend Risk Charter list and detail/form pages

## Goal

Build Risk Charter frontend pages that feel visually and behaviorally consistent with the existing risk register experience, while keeping charter-specific content and workflows distinct.

## Design Decision

Use the risk register's visual language and interaction patterns, but do not clone risk-specific components or copy risk-specific language. The charter feature should look like part of the same product family.

## Pages

### 1. Risk Charter List Page

**Path:** `frontend/src/app/(app)/management/charters/page.tsx`

#### Layout
- Use the same page-shell rhythm as risk register pages.
- Keep a strong page header with title, description, and primary CTA.
- Place filters in a dedicated container below the header.
- Render data inside a table/card surface with the same density and spacing style as the risk register list.

#### Main UI Elements
- Header title: `Piagam MR`
- Supporting description for governance/context module
- Primary CTA on the top-right to open or create charter flow
- Search/filter area styled consistently with risk register filter bars
- Main data table with row actions aligned right
- Empty state, loading state, and error state using existing product patterns

#### Table Columns
- Organization
- UPR level
- Period
- Risk owner
- Status
- Updated at
- Actions

#### Filters
- Period
- Status
- Search input

If backend search capability is limited, the UI may still present the search field but should only send supported parameters through the API client.

#### Interaction Pattern
- Clicking primary row action opens detail/edit page
- Status shown using familiar badge treatment
- Filters and actions should visually match the risk register table toolbar

### 2. Risk Charter Detail/Form Page

**Path:** `frontend/src/app/(app)/management/charters/[id]/page.tsx`

#### Layout
- Use the same structured form shell used by the risk register create/edit experience.
- Organize content into accordion-based sections.
- Keep the page readable in both view/edit modes.
- Use familiar action placement for save/update/navigation.

#### Sections
1. Identitas Piagam
2. Ruang Lingkup
3. Dasar Hukum
4. Konteks Internal
5. Konteks Eksternal
6. Ringkasan Stakeholder
7. Struktur UPR

#### Field Treatment
- Short metadata fields use input/select controls
- Narrative/context fields use textarea blocks
- `uprStructure` uses repeatable structured rows, not raw JSON exposure in UI
- Save/update actions should remain prominent and consistent with existing form pages

#### UX Rules
- Match risk register spacing, borders, typography rhythm, and badge style
- Use section status/progress badges only if practical with current page state
- Do not introduce risk-only widgets such as scoring heat visuals or approval-line UI unless supported by the charter feature itself

## Consistency Rules

The following must align with the risk register experience:
- Page shell spacing
- Header hierarchy
- Filter toolbar rhythm
- Table density and border treatment
- Badge appearance
- Button priority and placement
- Section card/accordion styling
- Empty/loading/error surfaces

The following must remain charter-specific:
- Text copy
- Field semantics
- Section naming
- Domain interactions

## Implementation Guidance

- Reuse existing frontend shell/layout primitives where possible.
- Prefer matching visual grammar over abstracting shared components prematurely.
- Keep charter pages maintainable; do not over-extract shared components in Task 3 unless duplication is clearly harmful.

## Verification

### Build Verification
```bash
cd frontend
npm run build
```

### Manual Verification
- Open `/management/charters`
- Confirm list page visually aligns with risk register patterns
- Open `/management/charters/[id]`
- Confirm form/detail page uses sectioned/accordion layout consistent with risk register
- Confirm no risk-specific copy or widgets appear in charter UI

## Recommendation

Proceed with visual parity approach: match risk register layout grammar closely for both list and form pages, while keeping charter logic and content distinct.

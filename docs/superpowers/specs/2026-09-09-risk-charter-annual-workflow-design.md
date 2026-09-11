# Annual Risk Charter Workflow Design

## Outcome

Refine Piagam Manris into a desktop-first annual document workflow that follows the KMK context-setting model while preserving Manris design-system conventions.

## Domain model

- One current charter per organization, UPR level, and fiscal year.
- The charter period is a four-digit fiscal year, not an H1/H2 assessment cycle.
- A new charter starts as `draft`; finalization moves it to `active` and locks its content.
- An active charter can produce a revision draft. Finalizing the revision atomically marks the previous current version `superseded` and promotes the revision.
- Version history remains queryable. Collection views show only the current version.
- Statuses are `draft`, `active`, `superseded`, and `archived`.
- Drafts are hard-deleted. Only the creator or a superadmin may delete a draft.
- All users with write access to the charter organization may create, save, finalize, revise, archive, and restore, except for the draft deletion restriction above.
- Archived current charters may be restored only when no conflicting current charter exists.

## Data

- Add a required `title` field. New-title input is empty; existing records are backfilled as `Piagam Penerapan Manajemen Risiko — {organization} — {year}`.
- Keep scope and internal/external context as document narrative.
- Replace the legacy legal-basis string with ordered legal-basis items containing a reference and relevant provision.
- Replace stakeholder summary with ordered external-stakeholder items containing name and relationship to the UPR.
- Structure UPR is an ordered list of members with role, name, position, and optional user ID snapshot link. Finalization requires one chair, one secretary, at least one member, and one supervisor.
- Sasaran Organisasi is intentionally omitted while its product module is hidden. This means the current implementation is not a complete digital reproduction of every KMK field.
- Finalization also requires title, scope, at least one legal basis, both contexts, at least one external stakeholder, and the minimum UPR structure.

## Creation route

- Use Next.js App Router parallel and intercepting routes.
- Client-side navigation from the charter collection to `/management/charters/new` renders a quick-create modal above the collection.
- Direct navigation or refresh renders a standalone quick-create fallback at the same canonical URL.
- Both surfaces reuse one quick-create component and contain only the required Title input.
- Organization, UPR level, and fiscal year come from the signed-in user's organization context. Every role uses its own organization context for creation.
- If a current charter already exists, show a contextual action to continue its draft or open its active charter.
- The create action waits for the API. On success, close with the shared 200ms exit motion and navigate to the new charter. On failure, preserve the title and show an inline error.

## Editor

- Desktop-first, one-column document editor on a `max-w-5xl` `FormPage`.
- A large borderless title input leads the document. Identity is a separate compact, read-only metadata block.
- Narrative and structured sections live on one continuous document surface separated by spacing and quiet dividers, implemented through a documented shared `FormSection` document variant.
- Section guidance is one persistent sentence; duplicate visible field labels are removed while accessible labels remain.
- Narrative textareas auto-grow from approximately six lines and avoid internal scrolling in normal use.
- Manual save only. The action label is `Simpan draf`.
- A compact desktop sticky action bar appears only while the form is dirty and contains unsaved status, keyboard shortcut hint, and save action.
- Command/Ctrl+S runs the same save validation. Finalization is disabled while changes are dirty and instructs the user to save first.
- Back navigation from the route prompts before discarding dirty changes.
- Finalization has an explicit confirmation and never silently saves dirty content.
- Active, superseded, and archived versions are read-only.

## Collection and history

- The first collection column is charter title with organization as secondary text.
- Search includes title. The list shows one current row per annual charter group.
- Version history opens in a right-side panel. Selecting a version opens a dedicated read-only version URL.
- Active charters expose `Buat revisi`; revision creation requires a reason of at least 10 characters.

## Motion and polish

- No staged page-load animation.
- Press feedback uses scale `0.96` where supported by shared actions.
- Sticky bar uses an interruptible 200ms ease-out opacity plus 8px translation transition.
- Modal and panel entry/exit paths are symmetric and reuse shared motion.
- Reduced motion replaces translation with a short cross-fade.
- Use structural borders only, restrained shadow, balanced headings, pretty body wrapping, and tabular numeric version/year values.

## Design-system synchronization

- Add and document the continuous document-section variant and dirty action bar as shared primitives.
- Update the Design System catalogue and `DESIGN.md` before considering the feature complete.


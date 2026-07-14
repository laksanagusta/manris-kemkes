# Design System Reusable Component Architecture

## Objective

Refactor `frontend/src/components/shared/design-system/` into the canonical home for Manris composed reusable components. Split the current `collection-primitives.tsx` module into focused files inside that folder, migrate every production consumer to one public import surface, and make the `/design-system` catalogue render the same production components with fixture data.

This is an architecture-only refactor. Existing visual appearance, responsive behavior, accessibility behavior, routes, data fetching, permissions, and business logic must remain unchanged.

## Current State

The Design System folder currently mixes three responsibilities:

- reusable production components;
- preview components that contain production-worthy patterns;
- catalogue-only examples, fixture data, and token visualizations.

Collection components are also concentrated in `frontend/src/components/shared/collection-primitives.tsx`, a large module used directly by many feature pages. Production consumers currently use a mixture of root-barrel imports, deep Design System imports, and imports from the standalone collection module.

## Chosen Approach

Use a contract-first, repository-wide migration. Define the target public API first, move and extract components in bounded categories, migrate every consumer, then delete the old collection module and stale import paths.

No compatibility re-export will remain at `components/shared/collection-primitives.tsx`. The implementation may proceed through small verified checkpoints, but the completed refactor exposes only the new canonical API.

## Target Architecture

`frontend/src/components/shared/design-system/` will use responsibility-based internal folders:

```text
design-system/
├── actions/
├── collections/
├── feedback/
├── layout/
├── reports/
├── domain/
├── examples/
├── data/
└── index.ts
```

Responsibilities:

- `actions/`: composed buttons and action controls such as `ActionButton`, `ActionIconButton`, and `AccentButton`.
- `collections/`: collection toolbars, search and filter controls, tabs, table shells, pagination, badges, notices, and collection states.
- `feedback/`: reusable loading, empty, error, progress, archived, and related feedback surfaces that are not collection-specific.
- `layout/`: shared page, metric, card, and surface geometry.
- `reports/`: shared analytical and report composition primitives.
- `domain/`: domain-aware components that remain reusable across multiple pages, including risk, mitigation, and overview patterns.
- `examples/`: catalogue-only consumers that render production components using fixture props.
- `data/`: fixture and token data used only by the catalogue.
- `index.ts`: the only public production import surface.

Low-level shadcn primitives remain in `frontend/src/components/ui/`. They are foundations used by the composed Manris Design System and are not moved by this refactor.

## Module and Import Contracts

- Each public component has one source file.
- A type used only by one component stays with that component. Shared public types receive a focused type file in the relevant category.
- Private helpers stay with their owning component unless they are independently reused.
- Production pages and feature components import Design System components only from `@/components/shared/design-system`.
- Production consumers must not deep-import internal category folders.
- `design-system/index.ts` exports production components and their public types only.
- Catalogue previews, fixture data, and catalogue scaffolding are not exported from the production root barrel.
- The `/design-system` page consumes catalogue examples through a separate catalogue barrel such as `@/components/shared/design-system/examples`.
- Examples may import internal production components to assemble demonstrations, but they must not duplicate the component's structural styling or behavior.

The category folders are internal organization, not public API. Their layout may change later without forcing production consumers to rewrite imports.

## Component Classification and Extraction

Every existing Design System file belongs to one of three classes.

### Existing reusable production components

Components such as action buttons, page layout components, report primitives, overview states, dashboard cards, and mitigation form components retain their behavior and public names when those names remain accurate. They move to the appropriate category and receive focused public props where necessary.

### Preview files containing production patterns

When a preview currently owns a reusable pattern, extract that pattern into a production component. The preview becomes a thin example that supplies fixture data and callbacks.

Expected extractions include:

- archived banner;
- AI suggestion dropdown;
- inline empty state;
- progress meter;
- version timeline;
- form container;
- dialog and dialog-action compositions;
- accordion compositions;
- table, tabs, pagination, search, and filter patterns.

The exact production component name should describe the pattern rather than the catalogue. A production component must not use a `Preview` suffix.

### Catalogue-only documentation

Typography specimens, radius visualization, color swatches, section labels, and fixture presentation remain under `examples/` or `data/`. They may compose low-level UI primitives and production Design System components, but they do not become production exports merely because the catalogue needs them.

## Collection Module Decomposition

Move every public export from `frontend/src/components/shared/collection-primitives.tsx` into a focused file under `design-system/collections/`. This includes:

- collection loading, empty, and error states;
- tabs list and tabs trigger;
- search field and expandable search field;
- filter trigger, filter grid, and filter input;
- toolbar and notice;
- status badge and dialog cancel action;
- sidebar tabs list;
- table card, header, header row, and table head;
- pagination.

Preserve existing public names unless a name is misleading or collides with another production component. Any rename must be explicit in the implementation plan, migrate every consumer atomically, and preserve behavior.

After all consumers use the root Design System barrel, delete `frontend/src/components/shared/collection-primitives.tsx`. Do not leave a compatibility shim or secondary re-export path.

## Domain Reusability Contract

Domain-aware components such as mitigation progress, risk summaries, and overview risk cards may remain in the Design System when they are reusable across pages.

They must:

- receive view data through typed props;
- receive actions through callbacks;
- expose optional labels, children, or slots only where real consumers require customization;
- remain independent of a particular route or page module;
- avoid data fetching, navigation, permission checks, endpoint response parsing, and page-owned business state.

Pages and feature containers retain those business responsibilities and map their data into the component's view props.

## Data Flow

The standard flow is:

```text
API and page state
→ page or feature-container mapping
→ reusable Design System props
→ local presentational interaction
→ callbacks to the owning page or container
```

Examples:

- Search components receive controlled value, change callback, labels, and placeholder.
- Pagination receives page, page size, total, disabled state, and change callbacks.
- Table shells receive structural children while data rows and sorting state remain consumer-owned.
- Forms and dialogs receive initial display values, validation/loading state, and callbacks; business submission remains consumer-owned.
- Error components receive display messages and retry callbacks without knowing the failed endpoint.
- Domain components receive explicit view models rather than raw API responses.

Keep client boundaries narrow. Components that require hooks or event handlers declare their own client boundary. Barrel files and purely presentational modules must not become client components by default.

## Behavior Preservation

This refactor must preserve:

- rendered spacing, typography, colors, borders, shadows, and component geometry;
- responsive layouts, local table overflow, and sticky behavior;
- loading, empty, error, disabled, and submitting states;
- controlled component behavior and callbacks;
- keyboard behavior, focus treatment, labels, and ARIA semantics;
- routes, navigation outcomes, permissions, data fetching, and business rules.

No visual redesign is included. If extraction reveals a visual inconsistency, record it separately instead of silently changing the component during this refactor.

## Migration Sequence

1. Add architecture contract tests and define the intended production barrel.
2. Split collection primitives into focused files and export them from the root barrel.
3. Move existing reusable production components into their responsibility folders.
4. Extract reusable production components from previews.
5. Convert every catalogue preview into a fixture-driven consumer.
6. Migrate all pages and feature components to the root Design System barrel.
7. Remove the old collection module, stale paths, and redundant implementations.
8. Update `/design-system` and synchronize the component contracts in `DESIGN.md`.
9. Run focused tests, architecture checks, lint, build, and representative visual/behavior QA.

The implementation should use small checkpoints so failures can be attributed to one category even though the completed migration exposes no legacy import path.

## Testing Strategy

### Architecture contract tests

Tests or static source checks must verify:

- no import references `components/shared/collection-primitives`;
- production consumers do not deep-import Design System category folders;
- the production root barrel does not export examples, fixtures, or catalogue scaffolding;
- every public component has a single implementation file;
- collection primitives contain no route or feature-specific ownership;
- examples consume production components rather than reproducing their structural contracts.

### Focused component tests

Cover behavior with the highest regression risk:

- pagination range, page boundaries, disabled state, and page-size callbacks;
- expandable search opening, blur handling, Escape handling, and controlled values;
- tabs and sortable table-header semantics;
- loading, empty, and error rendering and retry callbacks;
- dialog and form callbacks, validation display, and loading state;
- accessible labels, `aria-current`, `aria-sort`, focus, and keyboard interaction.

### Consumer and build regression checks

- Run existing focused tests and update only import-path expectations or architecture contracts affected by the move.
- Run frontend lint.
- Run the production frontend build for TypeScript and Next.js integration.
- Search for the removed module, stale deep imports, preview exports, and duplicated structural class contracts.

### Visual and behavior QA

Compare `/design-system` before and after the refactor and inspect representative consumers:

- risk register;
- monitoring;
- reports;
- overview;
- management;
- inbox;
- admin.

Check desktop and narrow viewports. The completed refactor must not intentionally change appearance, keyboard behavior, responsive overflow, or state presentation.

## Acceptance Criteria

1. `frontend/src/components/shared/collection-primitives.tsx` no longer exists.
2. Production consumers import composed reusable components through `@/components/shared/design-system` only.
3. Production components are split into focused files within responsibility-based folders.
4. Domain-aware Design System components are reusable and contain no page-owned business responsibilities.
5. Catalogue examples render production components with fixture props and do not duplicate implementation contracts.
6. Catalogue-only examples and fixture data are absent from the root production barrel.
7. `/design-system` retains its existing appearance and demonstrates the real production components.
8. `DESIGN.md` documents the new ownership, import, example, and synchronization rules.
9. Architecture tests, focused tests, lint, and the production frontend build pass.
10. Representative feature pages retain their existing visual and business behavior.

## Out of Scope

- Redesigning any component or feature page.
- Moving low-level `components/ui` primitives into the composed Design System.
- Changing API endpoints, backend behavior, data models, routes, or permissions.
- Adding speculative component configurability without an existing consumer requirement.
- Fixing unrelated inconsistencies found outside the migration surface.

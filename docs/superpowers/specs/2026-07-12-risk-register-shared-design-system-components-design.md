# Risk Register Shared Design-System Components

## Objective

Refactor the active Risk Register experience so `/design-system` and `/risk/register` render the same reusable production components. Visual changes made to those shared components must propagate to both pages without copying class strings or importing a route page.

## Scope

Included:

- Daftar Risiko tab.
- Pemantauan tab.
- Register tabs and count badge.
- Search and filter controls.
- Register table shell, table geometry, row actions, empty/loading states, and pagination.
- Dialog and AlertDialog action styling used by the active flows.
- Corresponding examples on `/design-system`.
- `DESIGN.md` component contracts.

Removed because they are no longer used:

- Draft tab, its table, state, fetch paths, helpers, actions, and delete dialog.
- History tab, its selector, table, state, fetch paths, helpers, and related UI.

Out of scope:

- Backend API changes.
- Changes to the risk creation or risk detail pages.
- Redesigning the MonitoringTransactionsTable data model.

## Architecture

The route page must not be a component dependency. Reusable visual ownership moves into production modules under `frontend/src/components`:

- Low-level visual primitives remain in `components/ui`.
- Register-specific composed primitives live in `components/shared` or a focused register component module.
- `/design-system/page.tsx` becomes a catalogue consumer of those components.
- `/risk/register/page.tsx` becomes a production consumer of the same components.

Shared components own stable visual contracts such as card shell, table frame, tabs, filter trigger, pagination controls, and compact dialog actions. Route pages own data loading, filtering state, navigation, permissions, and domain-specific cell content.

## Behavior Preservation

- Keep URL-backed active-tab, query, filter, sorting, and pagination behavior for Daftar Risiko and Pemantauan.
- Keep permission checks, archive/restore actions, navigation, loading states, and error handling.
- Keep responsive table overflow and sticky row actions.
- Preserve accessibility semantics including `aria-sort`, labels, focus behavior, and status cues.
- Removing Draft and History must not leave unreachable state, effects, imports, query parameters, or dialogs.

## Design-System Propagation

The design-system page must demonstrate the actual shared components with fixture data. It must not recreate their shells with parallel JSX. Future visual edits should be made in the shared component implementation; both catalogue and production consumers then update automatically.

`DESIGN.md` will document which aspects are owned by the shared component and which remain consumer-provided.

## Verification

- Add or update focused tests for shared register primitives and removal of Draft/History.
- Verify tab switching, search/filter inputs, sortable headers, row actions, pagination, loading, and empty states.
- Run targeted ESLint and tests for changed files.
- Run the frontend build to catch TypeScript and Next.js integration issues.
- Search for remaining Draft/History JSX and stale imports/state in the register page.
- Search for duplicated catalogue JSX that should use the extracted components.

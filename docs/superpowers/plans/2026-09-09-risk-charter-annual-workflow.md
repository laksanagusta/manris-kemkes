# Annual Risk Charter Workflow Implementation Plan

1. Add contract and domain tests for annual identity, draft creation, finalization validation, revisions, permissions, and migration shape.
2. Add a reversible PostgreSQL migration for title, structured content, version metadata, annual normalization, status normalization, and current-version uniqueness.
3. Extend the risk-charter entity and repository contract, then implement repository transactions for create, finalize, revision, archive/restore, delete, and version history.
4. Add focused clean-architecture use cases and HTTP endpoints with organization-scope authorization and actor identity.
5. Update frontend API types and helpers for the annual workflow.
6. Implement the reusable quick-create surface plus canonical parallel/intercepting `/new` routes.
7. Refine the collection to open quick-create, surface title, search it, and show state-appropriate actions.
8. Refine the detail editor into the continuous document surface with structured legal bases, stakeholders, UPR members, dirty action bar, keyboard save, guarded back navigation, finalization, revision, archive/restore, deletion, and version history.
9. Add shared document-section and dirty-action-bar primitives; update the Design System catalogue and `DESIGN.md`.
10. Run focused frontend and backend tests, lint, format, migration checks, build/type checks, and authenticated browser smoke checks where credentials are available.


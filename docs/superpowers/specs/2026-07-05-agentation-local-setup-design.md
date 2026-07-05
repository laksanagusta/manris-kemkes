# Agentation Local Setup Design

## Goal

Enable Agentation in the Manris frontend for local visual feedback without
introducing an Agent Sync service or exposing the tool in production.

## Design

- Add `agentation` to the frontend development dependencies.
- Import `Agentation` in the Next.js root layout.
- Render `<Agentation />` after the application content, gated by
  `process.env.NODE_ENV === "development"`.
- Use Agentation's default local annotation and clipboard behavior.
- Do not add endpoints, session configuration, webhooks, or environment
  variables.

## Scope

The change is limited to the frontend package manifest, lockfile, and root
layout. Existing application providers and UI behavior remain unchanged.

## Verification

- Run the frontend linter.
- Run the frontend production build to verify Next.js and React compatibility.
- Confirm the Agentation package is present as a development dependency and
  the component is guarded by the development environment check.


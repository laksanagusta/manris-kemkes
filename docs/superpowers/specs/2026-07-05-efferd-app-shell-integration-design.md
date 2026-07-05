# Efferd App Shell Integration Design

## Objective

Adopt the visual structure of `@efferd/app-shell-4` for authenticated Manris pages without replacing Manris navigation, authentication, authorization, or application data behavior.

## Scope

The integration will update only the authenticated application shell and its visual composition:

- Sidebar framing, spacing, responsive behavior, and collapse presentation.
- Header structure and its relationship to the sidebar inset.
- Main content inset, width, and page padding.
- Efferd shell primitives already installed through the shadcn registry.

The integration will preserve:

- Authentication redirects and session checks in `src/app/(app)/layout.tsx`.
- Existing Manris routes and route matching.
- Role-based navigation visibility.
- Pending approval and working-paper inbox counts.
- User identity, logout, settings, and organization behavior.
- Existing page content and feature-specific layouts.
- Manris branding, language, and application terminology.

## Architecture

`src/app/(app)/layout.tsx` remains the authentication boundary and renders `AppShell` only for a complete authenticated session.

`src/components/app-shell.tsx` remains the composition root. It owns the sidebar provider, tooltip provider, Manris inbox-count loading, header, sidebar, and main content inset.

`src/components/app-sidebar.tsx` continues to derive its navigation from Manris configuration and authorization state. Efferd structure is applied around that data rather than replacing it with registry demo data.

`src/components/app-header.tsx` continues to expose Manris account actions while adopting the Efferd header geometry and responsive trigger placement.

Shared Efferd components may be reused when they are presentation-only. Demo content, hard-coded routes, sample account data, billing widgets, and dashboard-specific registry examples will not enter the production shell.

## Behavior and Data Flow

1. The authenticated route layout validates the current session.
2. A valid session renders `AppShell`.
3. `AppShell` fetches pending counts through the existing API client.
4. Manris navigation and account state are passed into the visually updated sidebar and header.
5. The current route content renders inside the Efferd-style sidebar inset.

API failures for pending counts remain non-blocking and resolve to zero, matching current behavior.

## Compatibility

- Preserve Next.js App Router client boundaries.
- Preserve the configured `@/` aliases and Lucide icon library.
- Use existing semantic design tokens and shadcn components.
- Avoid overwriting locally customized shadcn primitives unless a specific upstream structural change is required.
- Maintain mobile sidebar behavior and keyboard-accessible controls.

## Verification

- Add or update focused tests for shell geometry and preserved application behavior where practical.
- Run the relevant frontend tests.
- Run `npm run build`.
- Confirm authenticated pages still render through the shell and public routes remain outside it.

## Non-Goals

- Replacing Manris navigation with Efferd demo navigation.
- Reworking authentication, authorization, or API contracts.
- Redesigning individual dashboard or feature pages.
- Importing unrelated Efferd demo widgets.
- Changing global branding or typography.

# App Header Separator Alignment Design

## Goal

Center the vertical separator between the sidebar trigger and header title on
desktop and mobile layouts.

## Root Cause

The shared `Separator` component applies `data-vertical:self-stretch` to every
vertical separator. The header adds an unconditional `self-center`, but the
orientation-specific stretch rule remains active and wins for the vertical
state, leaving the fixed-height line aligned incorrectly.

## Design

Change only the `AppHeader` separator classes to use the same orientation-aware
variant as the shared component:

```tsx
className="data-vertical:h-4 data-vertical:self-center"
```

This overrides the shared vertical stretch behavior locally without changing
separator behavior elsewhere or adding wrapper markup.

## Verification

- Run ESLint against `src/components/app-header.tsx`.
- Run the frontend production build.
- Verify `/risk/register` at the reported 1710×952 viewport when the local
  development server is available.


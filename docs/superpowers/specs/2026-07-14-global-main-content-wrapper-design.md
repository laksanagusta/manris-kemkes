# Global Main Content Wrapper Design

## Goal

Make every authenticated application page use the same content geometry as the design-system catalogue: centered content, a `1200px` maximum width, full available width below that limit, and `32px` vertical padding.

## Scope

- Apply `mx-auto w-full max-w-[1200px] py-8` once in the shared authenticated app shell.
- Keep the existing responsive outer shell padding (`p-4 md:p-6`) around the shared content wrapper.
- Remove the duplicate geometry classes (`mx-auto max-w-[1200px] py-8`) from the design-system page.
- Keep `space-y-12` on the design-system page because it controls catalogue section rhythm rather than global page padding.
- Preserve page-specific internal layout, spacing, cards, tables, and responsive behavior.
- Do not change public routes outside the authenticated `(app)` route group.

## Architecture

`AppShell` remains responsible for the outer application frame. Its `<main>` element will contain one shared wrapper around `children`:

```tsx
<main className="flex min-w-0 flex-1 flex-col gap-4">
  <div className="mx-auto w-full max-w-[1200px] py-8">{children}</div>
</main>
```

The design-system page will retain only its catalogue rhythm:

```tsx
<div className="space-y-12">...</div>
```

This keeps width and edge spacing centralized while leaving page composition under each route's control.

## Responsive Behavior

- Below `1200px`, the wrapper uses all available width inside the shell's existing responsive padding.
- At and above `1200px`, content is centered and capped at `1200px`.
- Wide tables continue to own horizontal scrolling inside their local table containers.
- The global shell continues clipping page-level horizontal overflow.

## Verification

- Add a source-level regression test asserting that `AppShell` owns the canonical wrapper classes.
- Assert that the design-system page no longer duplicates the geometry wrapper and still retains `space-y-12`.
- Run the targeted test, ESLint on changed frontend files, and `git diff --check`.
- Run TypeScript checking and report unrelated pre-existing failures separately if they remain.

## Design-System Documentation

Update `DESIGN.md` to identify `mx-auto w-full max-w-[1200px] py-8` as the canonical authenticated main-content wrapper. The design-system route remains the visual reference, but geometry is implemented once in `AppShell` so feature pages cannot drift.

# 006 — Add shared easing tokens to globals.css

- **Status**: TODO
- **Commit**: da9c60d3
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, ~5 lines

## Problem

The project has **no shared easing or duration tokens**. Every sidebar transition hardcodes `ease-linear` (sidebar.tsx:220, 232, 404) or omits easing entirely (sidebar.tsx:469, 556, 424). The `fadeIn` keyframe in globals.css uses `ease-out` bare. There is no single source of truth for motion curves — making it impossible to adjust the feel globally and encouraging drift.

This impacts the sidebar's mechanical feel (`ease-linear` is flat and unresponsive) and prevents cohesion across the app.

## Target

Add custom easing CSS variables to `@theme inline` in `globals.css`, following the strong curves from the animation audit:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);       /* strong ease-out for UI entrances */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* strong ease-in-out for on-screen movement */
```

These become available as Tailwind utilities: `ease-(--ease-out)` and `ease-(--ease-in-out)`.

## Repo conventions to follow

- Tokens live in `@theme inline` block in `src/app/globals.css:7-80` alongside existing `--color-*`, `--radius-*`, and `--font-*` tokens.
- Naming follows the existing `--kebab-case` pattern used by all other theme variables.
- Add a comment grouping them (e.g., `/* Easing tokens */`) so they're discoverable.

## Steps

1. Open `frontend/src/app/globals.css`.
2. In the `@theme inline` block (line 7), add after the existing `--radius-*` tokens and before the `/* MANRIS custom colors */` comment (around line 51):

   ```css
   /* Easing tokens */
   --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
   --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
   ```

   Resulting insertion point — between `--radius-4xl` (line 49) and `/* MANRIS custom colors */` (line 52):

   ```css
   --radius-4xl: calc(var(--radius) * 2.6);

   /* Easing tokens */
   --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
   --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);

   /* MANRIS custom colors */
   ```

3. Verify the file parses by running `npm run lint` (see Verification).

## Boundaries

- Do NOT modify any other file.
- Do NOT remove existing `ease-linear` or other easing classes — that is covered by plans 001 and 003.
- Do NOT add duration tokens unless explicitly asked — they use `tw-animate-css`'s existing `--duration-*` tokens.

## Verification

- **Lint**: `npm run lint` (from `frontend/`) passes without errors.
- **Build**: `npm run build` completes successfully.
- **Feel check**: Not directly observable yet — this plan only creates tokens. After plan 001 or 003 is applied, open DevTools, inspect any sidebar element with `transition`, and confirm the computed easing shows `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Done when**: `grep --ease-out frontend/src/app/globals.css` returns the two token lines.

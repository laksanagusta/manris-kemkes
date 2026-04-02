# MANRIS Logo Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current 3D bitmap MANRIS logo with a minimal icon-first SVG mark and wire it into the sidebar and public entry surfaces without broad layout changes.

**Architecture:** Keep the implementation intentionally small. Add a single SVG asset in `frontend/public` as the source of truth, then update the three existing `next/image` usages to point to it and remove bitmap-specific shadow styling. Leave `favicon.ico` and the existing wordmark treatment unchanged in this phase.

**Tech Stack:** Next.js 16, React 19, TypeScript, `next/image`, Tailwind CSS v4, static SVG assets in `public/`

---

## File Map

- Create: `frontend/public/logo.svg` - the new flat shield-pulse brand mark source of truth.
- Modify: `frontend/src/components/app-sidebar.tsx:216-224` - swap the sidebar brand image to the SVG and quiet the wrapper styling.
- Modify: `frontend/src/app/page.tsx:64-66` - swap the root login brand image to the SVG and remove bitmap-only shadow styling.
- Modify: `frontend/src/app/(public)/login/page.tsx:64-66` - apply the same logo update on the public login route.
- Keep unchanged: `frontend/public/logo.png` - leave in place as a legacy fallback until a separate cleanup task explicitly removes it.
- Keep unchanged: `frontend/src/app/favicon.ico` - favicon refresh is out of scope for this plan.

### Task 1: Add The New SVG Asset

**Files:**
- Create: `frontend/public/logo.svg`

- [ ] **Step 1: Create the approved shield-pulse SVG asset**

```svg
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="manrisLogoTitle manrisLogoDesc">
  <title id="manrisLogoTitle">MANRIS logo</title>
  <desc id="manrisLogoDesc">Rounded shield with a soft pulse sweep representing protection and insight.</desc>
  <path d="M32 6C39.54 6 46.82 7.72 53 10.98V29.26C53 41.86 45.53 52.21 32 57.5C18.47 52.21 11 41.86 11 29.26V10.98C17.18 7.72 24.46 6 32 6Z" fill="#2B7A74"/>
  <path d="M18.5 35.5H24.1C25.3 35.5 26.39 34.78 26.85 33.66L29.86 26.22C30.25 25.26 31.62 25.32 31.93 26.32L35.13 36.66C35.45 37.7 36.89 37.84 37.41 36.89L40.03 32.16C40.52 31.26 41.47 30.7 42.5 30.7H45.5" stroke="#E7F1EF" stroke-width="4.25" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M32 11.25C37.93 11.25 43.67 12.57 48.63 15.08V28.41C48.63 38.21 42.86 46.32 32 50.6C21.14 46.32 15.37 38.21 15.37 28.41V15.08C20.33 12.57 26.07 11.25 32 11.25Z" stroke="#0F4E49" stroke-opacity="0.18" stroke-width="1.5"/>
</svg>
```

- [ ] **Step 2: Verify the new static asset does not break the frontend build**

Run from `frontend/`: `npm run build`

Expected: Next.js completes successfully from `frontend/` with no parse errors referencing `public/logo.svg`.

- [ ] **Step 3: Commit the asset addition**

```bash
git add frontend/public/logo.svg
git commit -m "feat: add minimal MANRIS logo asset"
```

### Task 2: Replace Existing Logo Usage With The SVG

**Files:**
- Modify: `frontend/src/components/app-sidebar.tsx:216-224`
- Modify: `frontend/src/app/page.tsx:64-66`
- Modify: `frontend/src/app/(public)/login/page.tsx:64-66`

- [ ] **Step 1: Update the sidebar brand mark to use the SVG and remove bitmap-heavy chrome**

```tsx
<div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border/60 bg-primary/10 p-1.5">
  <Image
    src="/logo.svg"
    alt="MANRIS logo"
    width={24}
    height={24}
    className="object-contain"
  />
</div>
```

- [ ] **Step 2: Update the root login page (`/`) to the SVG and remove the bitmap drop shadow**

```tsx
<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 p-2.5">
  <Image
    src="/logo.svg"
    alt="MANRIS logo"
    width={64}
    height={64}
    className="object-contain"
  />
</div>
```

- [ ] **Step 3: Apply the same logo change to the public login route**

```tsx
<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 p-2.5">
  <Image
    src="/logo.svg"
    alt="MANRIS logo"
    width={64}
    height={64}
    className="object-contain"
  />
</div>
```

- [ ] **Step 4: Run the production build after all references point at the SVG**

Run from `frontend/`: `npm run build`

Expected: build succeeds, `next/image` accepts `/logo.svg`, and there are no type or route errors introduced by the JSX changes.

- [ ] **Step 5: Commit the usage updates**

```bash
git add frontend/src/components/app-sidebar.tsx frontend/src/app/page.tsx "frontend/src/app/(public)/login/page.tsx"
git commit -m "feat: adopt the new MANRIS logo"
```

### Task 3: Verify Small-Size And Theme Behavior

**Files:**
- No new files
- No planned code changes unless verification reveals a regression that must be corrected before shipping

- [ ] **Step 1: Start the development server for visual QA**

Run from `frontend/`: `npm run dev`

Expected: Next.js starts locally, usually on `http://localhost:3000`.

- [ ] **Step 2: Check the root login page and public login page in light mode**

Open: `/` and `/login`

Expected: the new mark looks crisp at `64px`, is centered in its container, and no longer shows fuzzy bitmap edges or 3D-style shadow treatment.

- [ ] **Step 3: Check the authenticated sidebar in both expanded and collapsed states**

Open: `/overview`

Expected: the mark remains identifiable around `24px`, stays centered inside the sidebar badge, and does not clip when the sidebar collapses to icon-only mode.

- [ ] **Step 4: Check dark mode contrast using the existing theme control or by temporarily adding `class="dark"` to the root `<html>` element in browser devtools**

Expected: the teal shield and light pulse remain readable on dark surfaces, especially in the sidebar and login logo containers.

- [ ] **Step 5: Commit the verified final state**

```bash
git add frontend/public/logo.svg frontend/src/components/app-sidebar.tsx frontend/src/app/page.tsx "frontend/src/app/(public)/login/page.tsx"
git commit -m "feat: refresh the MANRIS brand mark"
```

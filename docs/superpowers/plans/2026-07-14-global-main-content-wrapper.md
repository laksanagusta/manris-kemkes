# Global Main Content Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every authenticated page use the design-system catalogue's centered `1200px` main-content wrapper and `32px` vertical padding.

**Architecture:** `AppShell` will own one canonical geometry wrapper around route children. The design-system page will retain only its catalogue-specific section rhythm, while `DESIGN.md` records the global wrapper contract.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Node.js test runner.

---

## File Structure

- `frontend/src/components/app-shell.tsx`: Own the authenticated application frame and canonical main-content wrapper.
- `frontend/src/app/(app)/design-system/page.tsx`: Remove duplicated wrapper geometry while retaining catalogue spacing.
- `frontend/src/components/linear-shell-surfaces.test.ts`: Verify the shared wrapper contract and prevent design-system duplication.
- `DESIGN.md`: Document the canonical authenticated main-content geometry.

### Task 1: Centralize Main-Content Geometry

**Files:**
- Modify: `frontend/src/components/linear-shell-surfaces.test.ts`
- Modify: `frontend/src/components/app-shell.tsx:48-53`
- Modify: `frontend/src/app/(app)/design-system/page.tsx:41-45`

- [ ] **Step 1: Write the failing regression test**

Add the design-system page source and a test that requires the wrapper to live in `AppShell` only:

```ts
const designSystemPage = readFileSync(
  new URL("../app/(app)/design-system/page.tsx", import.meta.url),
  "utf8",
);

test("authenticated pages share the design-system main-content wrapper", () => {
  assert.match(
    shell,
    /<div className="mx-auto w-full max-w-\[1200px\] py-8">\{children\}<\/div>/,
  );
  assert.match(designSystemPage, /<div className="space-y-12">/);
  assert.doesNotMatch(
    designSystemPage,
    /mx-auto max-w-\[1200px\][^\"]*py-8/,
  );
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/linear-shell-surfaces.test.ts
```

Expected: FAIL in `authenticated pages share the design-system main-content wrapper` because `AppShell` does not yet contain the canonical child wrapper.

- [ ] **Step 3: Add the canonical wrapper to `AppShell`**

Replace the current direct child rendering inside `<main>` with:

```tsx
<main className="flex min-w-0 flex-1 flex-col gap-4">
  <div className="mx-auto w-full max-w-[1200px] py-8">{children}</div>
</main>
```

- [ ] **Step 4: Remove duplicate geometry from the design-system page**

Change the design-system root wrapper from:

```tsx
<div className="mx-auto max-w-[1200px] space-y-12 py-8">
```

to:

```tsx
<div className="space-y-12">
```

- [ ] **Step 5: Run the targeted test and verify GREEN**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/linear-shell-surfaces.test.ts
```

Expected: all tests in `linear-shell-surfaces.test.ts` PASS.

- [ ] **Step 6: Commit the layout change**

```bash
git add frontend/src/components/linear-shell-surfaces.test.ts frontend/src/components/app-shell.tsx 'frontend/src/app/(app)/design-system/page.tsx'
git commit -m "style: unify authenticated content wrapper"
```

### Task 2: Synchronize and Verify the Design System

**Files:**
- Modify: `DESIGN.md`

- [ ] **Step 1: Document the canonical wrapper**

Add this rule under `### Navigation` after the responsive shell rule:

```markdown
- **Main content wrapper:** Every authenticated route uses one shared `mx-auto w-full max-w-[1200px] py-8` wrapper inside `AppShell`. Feature pages must not duplicate this outer geometry; they own only their internal section spacing. The design-system catalogue keeps `space-y-12` as a page-specific rhythm.
```

- [ ] **Step 2: Run focused lint**

Run:

```bash
cd frontend
npm run lint -- src/components/app-shell.tsx src/components/linear-shell-surfaces.test.ts 'src/app/(app)/design-system/page.tsx'
```

Expected: exit code `0` with no ESLint errors.

- [ ] **Step 3: Run TypeScript validation**

Run:

```bash
cd frontend
npx tsc --noEmit
```

Expected: exit code `0`. If pre-existing unrelated test errors remain, confirm none reference the three changed frontend files and report those existing failures explicitly.

- [ ] **Step 4: Run final regression and diff checks**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node src/components/linear-shell-surfaces.test.ts
cd ..
git diff --check -- DESIGN.md frontend/src/components/app-shell.tsx frontend/src/components/linear-shell-surfaces.test.ts 'frontend/src/app/(app)/design-system/page.tsx'
```

Expected: targeted tests PASS and `git diff --check` exits `0` without output.

- [ ] **Step 5: Commit the documentation update**

```bash
git add DESIGN.md
git commit -m "docs: standardize authenticated content geometry"
```

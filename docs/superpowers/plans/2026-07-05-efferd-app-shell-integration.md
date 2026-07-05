# Efferd App Shell Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the visual structure of `@efferd/app-shell-4` to authenticated Manris pages while preserving Manris authentication, navigation, authorization, inbox counts, and user actions.

**Architecture:** Keep `src/app/(app)/layout.tsx` as the unchanged authentication boundary. Adapt only the composition and presentation classes in `AppShell`, `AppHeader`, and `AppSidebar`; continue sourcing navigation and user state from existing Manris code rather than Efferd demo data.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui sidebar primitives, Lucide React, Node test runner.

---

## File Structure

- Modify `frontend/src/components/app-shell.tsx`: adopt Efferd's padded inset and flex content structure while retaining pending-count data flow.
- Modify `frontend/src/components/app-header.tsx`: adopt Efferd's inset header geometry while retaining Manris account actions.
- Modify `frontend/src/components/app-sidebar.tsx`: switch to Efferd's floating sidebar frame while retaining all Manris navigation derivation and authorization.
- Create `frontend/src/components/app-shell-structure.test.ts`: source-level regression tests for shell geometry and preserved behavior.
- Modify `frontend/src/components/app-header-alignment.test.ts`: update the header geometry assertions to match the adopted shell.

No changes are planned for `frontend/src/app/(app)/layout.tsx`, `frontend/src/contexts/auth-context.tsx`, API clients, route definitions, or feature pages.

### Task 1: Lock the integration boundary with failing tests

**Files:**
- Create: `frontend/src/components/app-shell-structure.test.ts`
- Modify: `frontend/src/components/app-header-alignment.test.ts`
- Test: `frontend/src/components/app-shell-structure.test.ts`
- Test: `frontend/src/components/app-header-alignment.test.ts`

- [ ] **Step 1: Write the shell structure regression test**

Create `frontend/src/components/app-shell-structure.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shellSource = readFileSync(
  new URL("./app-shell.tsx", import.meta.url),
  "utf8",
);
const sidebarSource = readFileSync(
  new URL("./app-sidebar.tsx", import.meta.url),
  "utf8",
);

test("uses the Efferd floating and padded shell geometry", () => {
  assert.match(sidebarSource, /variant="floating"/);
  assert.match(shellSource, /<SidebarInset className="p-4 md:p-6">/);
  assert.match(
    shellSource,
    /<main className="flex flex-1 flex-col gap-4">\s*\{children\}\s*<\/main>/,
  );
});

test("preserves Manris shell behavior", () => {
  assert.match(shellSource, /api\s*\.get<\{ Count: number \}>/);
  assert.match(shellSource, /api\s*\.get<\{ count: number \}>/);
  assert.match(shellSource, /<AppSidebar inboxBadge=/);
  assert.match(sidebarSource, /useAuth\(\)/);
  assert.match(sidebarSource, /user\?\.role === "superadmin"/);
  assert.match(sidebarSource, /isAIFeaturesDisabled\(\)/);
  assert.doesNotMatch(sidebarSource, /Efferd/);
  assert.doesNotMatch(sidebarSource, /Add product/);
});
```

- [ ] **Step 2: Update the header geometry test**

Replace `frontend/src/components/app-header-alignment.test.ts` with:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./app-header.tsx", import.meta.url),
  "utf8",
);

test("uses inset shell header geometry", () => {
  assert.match(
    source,
    /className="font-display mb-6 flex items-center justify-between gap-2 md:px-2"/,
  );
  assert.doesNotMatch(source, /sticky top-0/);
  assert.doesNotMatch(source, /border-b/);
});

test("keeps the Manris account menu behavior", () => {
  assert.match(source, /const \{ logout, user \} = useAuth\(\)/);
  assert.match(source, /router\.push\("\/account"\)/);
  assert.match(source, /logout\(\)/);
  assert.match(source, /router\.push\("\/login"\)/);
});

test("vertical header separator keeps compact alignment", () => {
  assert.match(
    source,
    /className="mr-2 data-vertical:h-4 data-vertical:self-center"/,
  );
});
```

- [ ] **Step 3: Run the focused tests and verify they fail for geometry only**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/components/app-shell-structure.test.ts \
  src/components/app-header-alignment.test.ts
```

Expected: FAIL because the current sidebar uses `variant="sidebar"`, the inset lacks Efferd padding, and the header is sticky with a bottom border. The assertions preserving API calls, authorization, and account actions should pass.

- [ ] **Step 4: Commit the failing tests**

```bash
git add frontend/src/components/app-shell-structure.test.ts \
  frontend/src/components/app-header-alignment.test.ts
git commit -m "test: define Efferd shell integration boundary"
```

### Task 2: Apply Efferd shell geometry without replacing Manris behavior

**Files:**
- Modify: `frontend/src/components/app-shell.tsx`
- Modify: `frontend/src/components/app-header.tsx`
- Modify: `frontend/src/components/app-sidebar.tsx`
- Test: `frontend/src/components/app-shell-structure.test.ts`
- Test: `frontend/src/components/app-header-alignment.test.ts`

- [ ] **Step 1: Move padding and content flow onto the sidebar inset**

In `frontend/src/components/app-shell.tsx`, keep the hooks, API requests, `TooltipProvider`, `SidebarProvider`, and `inboxBadge` unchanged. Replace only the `SidebarInset` subtree with:

```tsx
<SidebarInset className="p-4 md:p-6">
  <AppHeader />
  <main className="flex flex-1 flex-col gap-4">
    {children}
  </main>
</SidebarInset>
```

This deliberately removes the existing centered `max-w-[90rem]` wrapper because Efferd's shell uses the entire inset as the page canvas.

- [ ] **Step 2: Adopt the inset header structure**

In `frontend/src/components/app-header.tsx`, keep `useRouter`, `useAuth`, `scopeLabel`, `normalizedScopeLabel`, the dropdown menu, and all click handlers unchanged.

Change the header opening element to:

```tsx
<header className="font-display mb-6 flex items-center justify-between gap-2 md:px-2">
```

Change the left cluster and separator to:

```tsx
<div className="flex items-center gap-3">
  <SidebarTrigger />
  <Separator
    orientation="vertical"
    className="mr-2 data-vertical:h-4 data-vertical:self-center"
  />
  <span className="text-sm font-medium text-muted-foreground">
    Manajemen Risiko
  </span>
</div>
```

Keep the existing right-side account trigger and dropdown. Do not add Efferd's fake notification action or sample user.

- [ ] **Step 3: Switch the sidebar frame to Efferd's floating variant**

In `frontend/src/components/app-sidebar.tsx`, keep the navigation constants, active-route logic, hash handling, feature-flag filtering, role filtering, inbox badge, `Link` usage, and footer links unchanged.

Replace the `Sidebar` opening element with:

```tsx
<Sidebar
  className={cn(
    "*:data-[slot=sidebar-inner]:bg-sidebar",
    "**:data-[slot=sidebar-menu-button]:[&>span]:text-sidebar-foreground/75",
  )}
  collapsible="icon"
  variant="floating"
>
```

Update `SidebarHeader` to remove the edge-to-edge shell border:

```tsx
<SidebarHeader className="h-14 justify-center px-2">
```

Update `SidebarFooter` to:

```tsx
<SidebarFooter>
```

Retain `SidebarRail` because it provides the existing desktop resize/collapse affordance.

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd frontend
node --test --experimental-specifier-resolution=node \
  src/components/app-shell-structure.test.ts \
  src/components/app-header-alignment.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run all frontend tests**

Run:

```bash
cd frontend
npm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the shell integration**

```bash
git add frontend/src/components/app-shell.tsx \
  frontend/src/components/app-header.tsx \
  frontend/src/components/app-sidebar.tsx
git commit -m "feat: apply Efferd shell geometry"
```

### Task 3: Verify route boundaries and production compilation

**Files:**
- Verify: `frontend/src/app/(app)/layout.tsx`
- Verify: `frontend/src/components/app-shell.tsx`
- Verify: `frontend/src/components/app-sidebar.tsx`
- Verify: `frontend/src/components/app-header.tsx`

- [ ] **Step 1: Confirm the authentication boundary is unchanged**

Run:

```bash
git diff c2bb065f -- 'frontend/src/app/(app)/layout.tsx'
```

Expected: no output. The authenticated route layout must still redirect unauthenticated users to `/login`, redirect password-change sessions to `/change-password`, and render `<AppShell>{children}</AppShell>` only for a full session.

- [ ] **Step 2: Confirm no Efferd demo behavior entered production files**

Run:

```bash
rg -n "Efferd|Add product|Search store|Shaban Haider|seller-help|store-settings" \
  frontend/src/components/app-shell.tsx \
  frontend/src/components/app-header.tsx \
  frontend/src/components/app-sidebar.tsx
```

Expected: no output.

- [ ] **Step 3: Run lint on the modified source and tests**

Run:

```bash
cd frontend
npx eslint \
  src/components/app-shell.tsx \
  src/components/app-header.tsx \
  src/components/app-sidebar.tsx \
  src/components/app-shell-structure.test.ts \
  src/components/app-header-alignment.test.ts
```

Expected: exit code 0 with no errors.

- [ ] **Step 4: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: build, TypeScript checking, and static page generation succeed. The existing non-blocking Google Sans Flex fallback-metrics warning may remain.

- [ ] **Step 5: Review the final scoped diff**

Run:

```bash
git diff c2bb065f -- \
  frontend/src/components/app-shell.tsx \
  frontend/src/components/app-header.tsx \
  frontend/src/components/app-sidebar.tsx \
  frontend/src/components/app-shell-structure.test.ts \
  frontend/src/components/app-header-alignment.test.ts
```

Expected: only the specified shell geometry, focused regression tests, and no authentication, route, API contract, or navigation-data changes.

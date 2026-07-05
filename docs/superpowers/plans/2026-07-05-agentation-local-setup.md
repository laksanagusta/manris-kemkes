# Agentation Local Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable local-only Agentation visual feedback in the Manris Next.js frontend.

**Architecture:** Install Agentation as a frontend development dependency and mount its React component in the existing root layout. A compile-time `NODE_ENV` guard keeps the component disabled outside development without adding synchronization infrastructure or configuration.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, npm, Agentation

---

## File Structure

- Modify `frontend/package.json`: declare Agentation as a development dependency.
- Modify `frontend/package-lock.json`: lock the installed Agentation package and transitive dependencies.
- Modify `frontend/src/app/layout.tsx`: mount Agentation inside the root body in development.

### Task 1: Install Agentation

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

- [ ] **Step 1: Install the package as a development dependency**

Run:

```bash
cd frontend
npm install --save-dev agentation
```

Expected: npm exits successfully; `agentation` appears under `devDependencies`
and the lockfile records the resolved package.

- [ ] **Step 2: Verify the installed package**

Run:

```bash
cd frontend
npm ls agentation
```

Expected: the dependency tree contains one resolved `agentation` version and
exits successfully.

### Task 2: Mount Agentation in Development

**Files:**
- Modify: `frontend/src/app/layout.tsx`

This is a configuration-only integration, so the TDD skill's configuration
exception applies. Verification is performed by static checks and a production
compile instead of adding a test coupled to layout source text.

- [ ] **Step 1: Import and render Agentation**

Add the package import:

```tsx
import { Agentation } from "agentation";
```

Render the component after the existing providers' application UI:

```tsx
{process.env.NODE_ENV === "development" && <Agentation />}
```

Keep the existing `AuthProvider`, `Toaster`, and `SuppressRadixWarnings`
structure unchanged.

- [ ] **Step 2: Run lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: ESLint exits successfully with no errors introduced by the
Agentation integration.

- [ ] **Step 3: Run the production build**

Run:

```bash
cd frontend
npm run build
```

Expected: Next.js completes the production build successfully, confirming the
package is compatible and the development-only branch compiles.

- [ ] **Step 4: Review the scoped diff**

Run:

```bash
git diff -- frontend/package.json frontend/package-lock.json frontend/src/app/layout.tsx
```

Expected: only the dependency records, Agentation import, and guarded component
mount are added relative to the pre-existing working-tree state.


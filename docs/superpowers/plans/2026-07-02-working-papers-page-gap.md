# Working Papers Page Gap Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Samakan jarak vertikal utama halaman Kertas Kerja dengan halaman Register Risiko.

**Architecture:** Pertahankan struktur halaman yang ada dan ubah hanya utility class spacing pada wrapper utama. Tidak ada perubahan pada state, data flow, komponen anak, atau gap internal.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4

---

### Task 1: Align Main Page Spacing

**Files:**
- Modify: `frontend/src/app/(app)/risk/working-papers/page.tsx:608`

- [ ] **Step 1: Verify the current mismatch**

Run:

```bash
rg -n 'max-w-7xl mx-auto space-y-' frontend/src/app/\(app\)/risk/working-papers/page.tsx
rg -n '<div className="space-y-4">' frontend/src/app/\(app\)/risk/register/page.tsx
```

Expected: working papers reports `space-y-8`, while risk register reports `space-y-4`.

- [ ] **Step 2: Apply the minimal implementation**

Change:

```tsx
<div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
```

to:

```tsx
<div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
```

- [ ] **Step 3: Verify the class alignment**

Run:

```bash
rg -n 'max-w-7xl mx-auto space-y-4 animate-fade-in' frontend/src/app/\(app\)/risk/working-papers/page.tsx
```

Expected: exactly one match on the main page wrapper.

- [ ] **Step 4: Run frontend lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: command exits successfully with no new lint errors.

- [ ] **Step 5: Review the scoped diff**

Run:

```bash
git diff --check
git diff -- frontend/src/app/\(app\)/risk/working-papers/page.tsx
```

Expected: no whitespace errors and one class change from `space-y-8` to `space-y-4`.

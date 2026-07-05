# Working Papers and Risk Register Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selaraskan layout dan komponen presentasional halaman Kertas Kerja dengan halaman Register Risiko, termasuk menempatkan search dan filter di header card.

**Architecture:** Pertahankan seluruh state, handler, query, dialog, dan mapping data. Perubahan hanya dilakukan pada struktur JSX presentasional dan utility class di halaman Kertas Kerja, menggunakan token tema serta pola komponen yang sudah dipakai halaman Register Risiko.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui

---

### Task 1: Align Page Shell and KPI Cards

**Files:**
- Modify: `frontend/src/app/(app)/risk/working-papers/page.tsx:608-637`

- [ ] **Step 1: Remove the local width constraint**

Replace:

```tsx
<div className="max-w-7xl mx-auto space-y-4 animate-fade-in">
```

with:

```tsx
<div className="space-y-4">
```

- [ ] **Step 2: Align page header and primary action**

Use `font-semibold` for the page title and remove decorative button shadow:

```tsx
<h1 className="text-2xl font-semibold tracking-tight">Kertas Kerja</h1>
```

```tsx
<Button className="relative gap-2 overflow-hidden shadow-none after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-primary-foreground/20">
```

- [ ] **Step 3: Align KPI cards**

Use a responsive five-column grid and pass Register-compatible KpiCard classes:

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
  {summaryCards.map((card) => (
    <KpiCard
      key={card.label}
      label={card.label}
      value={card.value}
      tone="white"
      className="flex min-h-[96px] flex-col"
      labelClassName="capitalize tracking-normal"
      valueClassName="font-medium"
      valueWrapClassName="mt-auto"
    />
  ))}
</div>
```

### Task 2: Move Search and Filter into the List Card

**Files:**
- Modify: `frontend/src/app/(app)/risk/working-papers/page.tsx:636-705`

- [ ] **Step 1: Remove the standalone toolbar wrapper**

Keep the error state outside the list card, but remove `WorkingPaperFiltersToolbar` from above it.

- [ ] **Step 2: Use the Register card container**

Use:

```tsx
<div className="overflow-hidden rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border">
```

- [ ] **Step 3: Build the card header**

Place the title and description on the left. Place the count plus the existing `WorkingPaperFiltersToolbar` on the right:

```tsx
<div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
  <div className="min-w-0">
    <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
      Daftar Kertas Kerja
    </h2>
    <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
      Dokumen risiko dan progres penandatanganan
    </p>
  </div>
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
    <span className="text-xs text-muted-foreground tabular-nums">
      {visiblePaperCount} kertas kerja
    </span>
    <WorkingPaperFiltersToolbar ... />
  </div>
</div>
```

Reuse every existing toolbar prop and handler unchanged.

### Task 3: Align List, Table, States, and Pagination

**Files:**
- Modify: `frontend/src/app/(app)/risk/working-papers/page.tsx:706-961`

- [ ] **Step 1: Replace hard-coded zinc/white presentation tokens**

Use theme tokens consistently:

```tsx
border-border
bg-background
bg-muted/30
text-foreground
text-muted-foreground
hover:bg-muted/50
```

Do not change semantic status badge helpers.

- [ ] **Step 2: Align table density and headings**

Use Register conventions:

```tsx
<TableHeader className="[&_tr]:border-b [&_tr]:border-border">
  <TableRow className="h-11 hover:bg-transparent">
```

Use `text-xs font-medium capitalize text-muted-foreground/70` for headings and `px-3 py-3` for cells.

- [ ] **Step 3: Align pagination**

Use the Register selector:

```tsx
<SelectTrigger className="h-7 w-[65px] border-none bg-muted/30 text-xs">
```

Use `size="icon-xs"` for previous and next buttons and show the current page in a disabled `size="xs"` primary-tinted button.

- [ ] **Step 4: Preserve responsive behavior**

Keep the mobile card list under `md:hidden` and desktop table under `hidden md:table`. Ensure toolbar controls wrap on narrow screens.

### Task 4: Verify

**Files:**
- Verify: `frontend/src/app/(app)/risk/working-papers/page.tsx`

- [ ] **Step 1: Run targeted lint**

Run:

```bash
cd frontend
npx eslint 'src/app/(app)/risk/working-papers/page.tsx'
```

Expected: exit code 0.

- [ ] **Step 2: Run full frontend lint**

Run:

```bash
cd frontend
npm run lint
```

Expected: exit code 0 with no new errors. Existing warnings may remain.

- [ ] **Step 3: Review scoped diff**

Run:

```bash
git diff --check
git diff -- frontend/src/app/\(app\)/risk/working-papers/page.tsx
```

Expected: no whitespace errors; functional handlers and data mapping remain unchanged.

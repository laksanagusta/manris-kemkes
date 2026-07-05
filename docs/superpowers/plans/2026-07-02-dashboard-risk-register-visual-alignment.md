# Dashboard and Risk Register Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selaraskan shell, KPI, panel, dan CTA Dashboard dengan bahasa visual Daftar Risiko.

**Architecture:** Pertahankan semua data fetching, state, kalkulasi, dan chart configuration. Ubah hanya JSX presentasional dan utility class pada halaman Dashboard serta dua panel langsungnya.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui

---

### Task 1: Align Dashboard Shell and KPI

**Files:**
- Modify: `frontend/src/app/(app)/overview/page.tsx`

- [ ] Gunakan wrapper `space-y-4`, header responsif, dan judul `font-semibold`.
- [ ] Ganti KPI strip dengan grid `grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4`.
- [ ] Gunakan card datar `rounded-2xl bg-card shadow-none ring-1 ring-inset ring-border`.
- [ ] Pertahankan nilai dan metadata tren, hapus ellipsis tanpa aksi.
- [ ] Samakan CTA card dan tombol dengan treatment Daftar Risiko.

### Task 2: Align Direct Dashboard Panels

**Files:**
- Modify: `frontend/src/app/(app)/overview/_components/unit-total-risk-score-chart.tsx`
- Modify: `frontend/src/app/(app)/compliance/_components/multi-phase-heatmap-compare.tsx`

- [ ] Ganti card blur/transparan dengan card datar dan inset ring.
- [ ] Samakan padding, title weight, description size, dan empty/loading states.
- [ ] Pertahankan chart, heatmap, filter, badge, dan data semantics.

### Task 3: Verify

**Files:**
- Verify all three modified TSX files.

- [ ] Jalankan targeted ESLint pada ketiga file.
- [ ] Jalankan `npm run lint`.
- [ ] Jalankan `git diff --check` dan review diff terbatas.

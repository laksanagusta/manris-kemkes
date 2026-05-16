# MANRIS Folded Mark Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current MANRIS shield logo with a minimalist black-and-white abstract Folded Mark and show it beside the `M A N R I S` wordmark.

**Architecture:** Keep the source of truth as `frontend/public/logo.svg` so existing `Image src="/logo.svg"` usage continues to work. Update only branding surfaces that currently show the MANRIS wordmark or logo, and keep layout changes compact by reusing the existing Next.js `Image` component and Tailwind utilities.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, SVG asset in `frontend/public`.

---

## File Structure

- Modify: `frontend/public/logo.svg`
  - Responsibility: primary vector logo asset for the app.
- Modify: `frontend/src/components/app-header.tsx`
  - Responsibility: authenticated app header brand lockup, collapsed icon state, and expanded icon + wordmark state.
- Modify: `frontend/src/components/app-shell.tsx`
  - Responsibility: keep main content offset aligned with the currently configured compact sidebar widths.
- Modify: `frontend/src/components/login-screen.tsx`
  - Responsibility: public login brand presentation.
- Modify: `frontend/src/components/register-screen.tsx`
  - Responsibility: public registration brand presentation.
- Modify: `frontend/src/app/(public)/change-password/page.tsx`
  - Responsibility: password/setup brand presentation using the shared logo asset.

---

### Task 1: Replace The Primary SVG Asset

**Files:**
- Modify: `frontend/public/logo.svg`

- [ ] **Step 1: Replace the SVG with the Folded Mark**

Replace the full file contents with:

```svg
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="manrisLogoTitle manrisLogoDesc">
  <title id="manrisLogoTitle">MANRIS logo</title>
  <desc id="manrisLogoDesc">Abstract folded black-and-white mark for MANRIS.</desc>
  <rect width="64" height="64" rx="16" fill="white"/>
  <path d="M15 45.5L30.6 12.5C31.1 11.4 32.7 11.4 33.2 12.5L49 45.5C49.6 46.8 48.1 48 47 47.1L34.5 37.6C33.4 36.8 31.9 36.8 30.8 37.6L17 47.2C15.8 48 14.4 46.8 15 45.5Z" fill="#09090B"/>
  <path d="M23.8 38.2L31.1 22.8C31.5 21.9 32.8 21.9 33.2 22.8L40.3 38.2L34.5 33.8C33.1 32.7 31.1 32.7 29.6 33.8L23.8 38.2Z" fill="white"/>
  <path d="M31.9 13.6L32.1 35.8" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 2: Verify the SVG is available**

Run: `sed -n '1,20p' frontend/public/logo.svg`

Expected: output starts with `<svg width="64" height="64"` and includes `Abstract folded black-and-white mark for MANRIS.`

- [ ] **Step 3: Commit the asset change**

```bash
git add frontend/public/logo.svg
git commit -m "feat: add manris folded mark logo"
```

---

### Task 2: Restore Logo In The App Header

**Files:**
- Modify: `frontend/src/components/app-header.tsx`
- Modify: `frontend/src/components/app-shell.tsx`

- [ ] **Step 1: Update the header brand lockup**

In `frontend/src/components/app-header.tsx`, replace the current logo wrapper block inside the header with:

```tsx
      <div
        className={cn(
          "flex h-full shrink-0 items-center gap-2.5 transition-all duration-300",
          collapsed ? "w-14 justify-center" : "w-60 pl-5 pr-2",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background p-1.5">
          <Image
            src="/logo.svg"
            alt="MANRIS logo"
            width={22}
            height={22}
            className="object-contain"
            priority
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden whitespace-nowrap">
            <span className="text-md font-bold tracking-tight text-foreground">
              M A N R I S
            </span>
          </div>
        )}
      </div>
```

- [ ] **Step 2: Align the main content offset with the compact sidebar**

In `frontend/src/components/app-shell.tsx`, replace the `main` class width offsets with:

```tsx
          <main
            className={cn(
              "flex-1 px-18 py-6 transition-all duration-300 animate-fade-in",
              collapsed ? "ml-14" : "ml-60",
            )}
          >
            {children}
          </main>
```

- [ ] **Step 3: Run TypeScript-aware lint**

Run: `cd frontend && npm run lint`

Expected: command exits successfully. If it reports unrelated existing lint failures, record the exact files and confirm `app-header.tsx` and `app-shell.tsx` have no new failures.

- [ ] **Step 4: Commit the header and shell changes**

```bash
git add frontend/src/components/app-header.tsx frontend/src/components/app-shell.tsx
git commit -m "feat: show folded mark in app header"
```

---

### Task 3: Add The Logo To Public Auth Branding

**Files:**
- Modify: `frontend/src/components/login-screen.tsx`
- Modify: `frontend/src/components/register-screen.tsx`
- Modify: `frontend/src/app/(public)/change-password/page.tsx`

- [ ] **Step 1: Import `Image` on login and register screens**

In `frontend/src/components/login-screen.tsx`, add this import after the `Link` import:

```tsx
import Image from "next/image";
```

In `frontend/src/components/register-screen.tsx`, add this import after the `Link` import:

```tsx
import Image from "next/image";
```

- [ ] **Step 2: Update the login brand block**

In `frontend/src/components/login-screen.tsx`, replace the current `<div className="mb-8 text-center">...</div>` brand block with:

```tsx
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-2">
            <Image
              src="/logo.svg"
              alt="MANRIS logo"
              width={26}
              height={26}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-medium tracking-tight">
            <span className="gradient-text">M A N R I S</span>
          </h1>
        </div>
```

- [ ] **Step 3: Update the register brand block**

In `frontend/src/components/register-screen.tsx`, replace the current `<div className="mb-8 text-center">...</div>` brand block with:

```tsx
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-2">
              <Image
                src="/logo.svg"
                alt="MANRIS logo"
                width={26}
                height={26}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-medium tracking-tight">
              <span className="gradient-text">M A N R I S</span>
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Registrasi mandiri untuk pengguna unit kerja
          </p>
        </div>
```

- [ ] **Step 4: Update the change-password brand block**

In `frontend/src/app/(public)/change-password/page.tsx`, replace the logo and heading block with:

```tsx
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-2">
              <Image
                src="/logo.svg"
                alt="MANRIS logo"
                width={26}
                height={26}
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="gradient-text">MANRIS</span>
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSetupFlow
              ? "Aktivasi akun pada login pertama"
              : "Kelola keamanan akun Anda"}
          </p>
        </div>
```

- [ ] **Step 5: Run lint**

Run: `cd frontend && npm run lint`

Expected: command exits successfully. If unrelated existing lint failures appear, record them and confirm the three modified auth files have no new failures.

- [ ] **Step 6: Commit the auth branding changes**

```bash
git add frontend/src/components/login-screen.tsx frontend/src/components/register-screen.tsx 'frontend/src/app/(public)/change-password/page.tsx'
git commit -m "feat: apply folded mark to auth branding"
```

---

### Task 4: Verify Build And Visual Placement

**Files:**
- Verify: `frontend/public/logo.svg`
- Verify: `frontend/src/components/app-header.tsx`
- Verify: `frontend/src/components/login-screen.tsx`
- Verify: `frontend/src/components/register-screen.tsx`
- Verify: `frontend/src/app/(public)/change-password/page.tsx`

- [ ] **Step 1: Run production build**

Run: `cd frontend && npm run build`

Expected: Next.js build exits successfully. If the build fails because of unrelated existing errors, capture the first failing file and error message.

- [ ] **Step 2: Start the frontend dev server**

Run: `cd frontend && npm run dev`

Expected: dev server prints a local URL such as `http://localhost:3000`.

- [ ] **Step 3: Check the public pages**

Open these routes in the browser:

```text
http://localhost:3000/login
http://localhost:3000/register
http://localhost:3000/change-password
```

Expected: each public route shows the black-and-white folded mark near the MANRIS wordmark, with no text overlap or clipped icon.

- [ ] **Step 4: Check the app header**

Log in and open:

```text
http://localhost:3000/overview
```

Expected: expanded header shows folded mark beside `M A N R I S`; collapsed header shows the folded mark alone; the main content aligns with the compact sidebar.

- [ ] **Step 5: Commit any verification-only fixes**

If visual verification required small spacing fixes, commit only those touched files:

```bash
git add frontend/src/components/app-header.tsx frontend/src/components/app-shell.tsx frontend/src/components/login-screen.tsx frontend/src/components/register-screen.tsx 'frontend/src/app/(public)/change-password/page.tsx'
git commit -m "fix: polish folded mark placement"
```

If no fixes were needed, skip this commit.


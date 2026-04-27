# Public Risk Guide Page

## TL;DR
> **Summary**: Add a public-facing guide page that explains the Manris risk flow from registration through monitoring in plain Indonesian, then expose it from login surfaces and the authenticated sidebar without requiring backend changes.
> **Deliverables**:
> - Public guide route with concise landing-style content
> - Shared guide UI reused in public and authenticated contexts
> - Login-surface entry link and authenticated sidebar entry
> - FAQ section and login CTA
> **Effort**: Medium
> **Parallel**: YES - 2 waves
> **Critical Path**: Task 1 → Task 2 + Task 3 → Task 4 → Task 5

## Context
### Original Request
Create one public page for a guide on using the application, no login required. Focus only on the process from registering a risk through risk monitoring. Keep the UI modern, minimalist, intuitive, and the language easy for non-experts.

### Interview Summary
- The page must be public.
- The content format is a landing-style guide, not dense documentation.
- The guide stays concise and uses plain Indonesian.
- The content structure is: summary flow, core step sections, short FAQ, final CTA.
- The final CTA points to login.
- The page must be linked from the login surface and from the authenticated app sidebar.
- Manual QA is preferred over adding new automated tests.

### Metis Review (gaps addressed)
- Resolved the sidebar-shell risk by planning one canonical public experience plus an authenticated in-shell wrapper route that reuses the same guide content, so sidebar navigation does not eject logged-in users out of app chrome.
- Locked scope to risk registration through monitoring only, with no spillover into incidents, controls, AI features, or a broader help center.
- Locked verification to lint, build, and agent-executed browser QA, with no new UI test harness.
- Applied a default that both existing login surfaces (`/` and `/login`) should expose the guide link because both currently function as login entry points.

## Work Objectives
### Core Objective
Ship a decision-complete guide experience that teaches the risk lifecycle from registration to monitoring in plain Indonesian and is reachable both before and after login.

### Deliverables
- Shared guide content/data module for the risk lifecycle
- Shared guide page component with minimalist informational layout
- Public route at `/panduan-risiko`
- Authenticated wrapper route that renders the same guide inside the app shell
- Login entry link on both existing login surfaces
- Sidebar navigation item for authenticated users

### Definition of Done (verifiable conditions with commands)
- `npm run lint` succeeds from `frontend/`
- `npm run build` succeeds from `frontend/`
- Visiting `/panduan-risiko` while logged out loads the guide and does not redirect
- Visiting the authenticated guide route from the sidebar keeps the app shell visible and shows the same guide content
- Login surfaces expose a visible entry labeled `Panduan Risiko`
- The page contains the agreed sections: hero summary, five lifecycle steps, FAQ, login CTA

### Must Have
- Plain Indonesian copy written for non-experts
- Light-first visual direction aligned to `PRODUCT.md`
- Minimalist hierarchy with strong readability on mobile and desktop
- Shared content between public and authenticated render paths
- Public login CTA labeled `Masuk ke MANRIS`

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No backend, API, or database changes
- No new test harness setup such as Playwright, Cypress, or RTL
- No broad help center, no incident guide, no compliance deep-dive
- No gradient text, no side-accent card stripes, no generic repeated card grid
- No auth-aware personalization inside the guide itself

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: none for new automated tests; use existing lint/build scripts plus browser QA
- QA policy: Every task includes agent-executed scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Authenticated QA prerequisite: executor must use any valid local non-admin or admin account already available in the environment; do not create new seed/auth work as part of this feature

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: shared guide content/component foundation, public route, authenticated wrapper route

Wave 2: login entry points, sidebar navigation, full QA and polish

### Dependency Matrix (full, all tasks)
| Task | Depends On | Unlocks |
|---|---|---|
| 1 | None | 2, 3, 4 |
| 2 | 1 | 5 |
| 3 | 1 | 4, 5 |
| 4 | 2, 3 | 5 |
| 5 | 2, 3, 4 | F1-F4 |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → visual-engineering
- Wave 2 → 2 tasks → visual-engineering
- Final Verification → 4 tasks → oracle / unspecified-high / deep

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Build the shared risk-guide foundation

  **What to do**: Create one shared content module and one shared presentational component that define the guide once and allow two wrappers to reuse it. The content must stay concise, in Indonesian, and limited to these sections in order: hero summary, step overview, five lifecycle steps, short FAQ. Use exact step titles: `Kenali Risiko`, `Catat Risiko`, `Nilai Risiko`, `Tentukan Penanganan`, `Pantau Tindak Lanjut`. Keep the component server-safe by default; do not add client-only hooks unless a route wrapper truly needs them.
  **Must NOT do**: Do not fetch data, do not read auth state inside the shared guide component, do not introduce a new global layout, and do not create a generic CMS-like guide system.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is a UI structure and copy hierarchy task with strong UX constraints
  - Skills: [`impeccable`] - Reason: needed for minimalist information design and plain-language layout choices
  - Omitted: [`react-expert`] - Reason: interactivity is minimal and the stronger need is visual and information architecture discipline

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `frontend/src/app/(public)/login/page.tsx:56-189` - public-facing light-first page language, centered composition, restrained background treatment
  - Pattern: `frontend/src/app/page.tsx:50-177` - duplicate login surface that also needs content parity later
  - Pattern: `frontend/src/app/(app)/compliance/monitoring/page.tsx:1-5` - thin wrapper route importing a reusable workspace/component
  - API/Type: `frontend/src/lib/app-navigation.ts:1-11` - navigation item/group type shapes that later route labels must align with
  - External: `PRODUCT.md:3-17` - calm, credible, decisive tone; plain directive copy; light-first aesthetic

  **Acceptance Criteria** (agent-executable only):
  - [ ] Shared content exists in a dedicated module, with exactly five ordered steps and three to five FAQ items
  - [ ] Shared page UI exists in a reusable component file that can be imported by both public and authenticated route wrappers
  - [ ] The component contains no client hooks and no direct auth dependency

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Shared files compile under type-aware build flow
    Tool: Bash
    Steps: Run `npm run build` from `frontend/` after creating the shared files
    Expected: Build succeeds and the new shared component/module compile without hook or import errors
    Evidence: .sisyphus/evidence/task-1-risk-guide-foundation-build.txt

  Scenario: Content scope stays within risk lifecycle only
    Tool: Playwright / interactive_bash
    Steps: Open the local guide route once wired or inspect rendered page after later tasks; confirm headings mention only risk lifecycle topics and do not include incident or AI workflow sections
    Expected: Only the agreed five step headings and FAQ are present; no sections for incidents, approvals, controls, or AI tools appear
    Evidence: .sisyphus/evidence/task-1-risk-guide-foundation-scope.png
  ```

  **Commit**: YES | Message: `feat(frontend): add risk guide foundation` | Files: `frontend/src/components/guides/risk-guide-page.tsx`, `frontend/src/lib/risk-guide-content.ts`

- [x] 2. Add the public risk-guide route at `/panduan-risiko`

  **What to do**: Create `frontend/src/app/(public)/panduan-risiko/page.tsx` as the canonical public route. Export static metadata with title `Panduan Risiko | MANRIS` and a plain-language description about learning the risk process from registration through monitoring. Render the shared guide component with a public CTA area that includes a primary button labeled `Masuk ke MANRIS` linking to `/login` and a secondary text link labeled `Kembali ke halaman masuk` only if it improves scanning without clutter. Keep the page public and server-rendered.
  **Must NOT do**: Do not wrap the page in the authenticated shell, do not require session state, and do not make `/panduan-risiko` redirect anywhere.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: public route composition and minimal CTA design are the key concerns
  - Skills: [`impeccable`] - Reason: route needs polished, non-generic UI and plain-language CTA hierarchy
  - Omitted: [`vercel-react-best-practices`] - Reason: this route is mostly static and does not need special data-fetching optimization guidance

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5 | Blocked By: 1

  **References**:
  - Pattern: `frontend/src/app/(public)/login/page.tsx:57-187` - public surface spacing, visual restraint, footer tone
  - Pattern: `frontend/src/app/page.tsx:69-174` - root login surface language parity that later entry links must match
  - External: `PRODUCT.md:6-17` - plain, human wording and restrained meaning-driven color use

  **Acceptance Criteria** (agent-executable only):
  - [ ] Visiting `/panduan-risiko` returns the guide page without redirecting to auth
  - [ ] The browser title is `Panduan Risiko | MANRIS`
  - [ ] The page visibly includes the H1 `Panduan Risiko di MANRIS` and the primary CTA `Masuk ke MANRIS`

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Logged-out visitor opens the public guide directly
    Tool: Playwright
    Steps: Start the app, navigate to `/panduan-risiko`, wait for `h1` containing `Panduan Risiko di MANRIS`
    Expected: URL stays `/panduan-risiko`, the H1 is visible, and no login redirect occurs
    Evidence: .sisyphus/evidence/task-2-public-guide-direct.png

  Scenario: Public CTA returns the user to login
    Tool: Playwright
    Steps: From `/panduan-risiko`, click the button labeled `Masuk ke MANRIS`
    Expected: Browser navigates to `/login` and the login heading `Masuk ke Akun Anda` is visible
    Evidence: .sisyphus/evidence/task-2-public-guide-cta.png
  ```

  **Commit**: YES | Message: `feat(frontend): add public risk guide route` | Files: `frontend/src/app/(public)/panduan-risiko/page.tsx`

- [x] 3. Add the authenticated in-shell guide wrapper at `/panduan/risiko`

  **What to do**: Create `frontend/src/app/(app)/panduan/risiko/page.tsx` as a thin authenticated wrapper that reuses the shared guide component so sidebar access stays inside app chrome. The wrapper may swap the footer action area to a neutral in-app action such as a button or link back to `/overview`, while preserving the same core content and section order as the public route. Update breadcrumb labels so the in-app route resolves cleanly to `Panduan Risiko`.
  **Must NOT do**: Do not duplicate guide copy into a second standalone component, do not make this route public, and do not alter the authenticated layout behavior.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this task is mostly shell integration and route-level UX consistency
  - Skills: [`impeccable`] - Reason: needs judgment on in-shell action placement without bloating the design
  - Omitted: [`react-expert`] - Reason: wrapper pattern is simple and follows existing import-only route style

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4, 5 | Blocked By: 1

  **References**:
  - Pattern: `frontend/src/app/(app)/compliance/monitoring/page.tsx:1-5` - thin route wrapper around a reusable component
  - Pattern: `frontend/src/lib/app-navigation.ts:60-99` - breadcrumb map structure for adding the in-app route label
  - Pattern: `frontend/src/components/app-sidebar.tsx:147-175` - sidebar links use direct `href` navigation and simple labels

  **Acceptance Criteria** (agent-executable only):
  - [ ] Visiting `/panduan/risiko` while authenticated renders the guide inside the app shell
  - [ ] The in-app page shows the same five step titles and FAQ as the public route
  - [ ] Breadcrumb mapping includes `Panduan Risiko` for the in-app route

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Authenticated route preserves app shell
    Tool: Playwright
    Steps: Log in with a valid QA account, navigate directly to `/panduan/risiko`, observe the header/sidebar shell and the guide heading
    Expected: The shell remains visible and the page shows `Panduan Risiko di MANRIS`
    Evidence: .sisyphus/evidence/task-3-in-app-guide-shell.png

  Scenario: In-app wrapper preserves content parity
    Tool: Playwright
    Steps: Compare `/panduan-risiko` and `/panduan/risiko` by checking the five agreed step headings and FAQ heading text
    Expected: Both routes show the same core guide sections in the same order
    Evidence: .sisyphus/evidence/task-3-in-app-guide-parity.txt
  ```

  **Commit**: YES | Message: `feat(frontend): add in-app risk guide route` | Files: `frontend/src/app/(app)/panduan/risiko/page.tsx`, `frontend/src/lib/app-navigation.ts`

- [x] 4. Add discoverability from login surfaces and the authenticated sidebar

  **What to do**: Add a visible, low-noise entry labeled `Panduan Risiko` to both login surfaces, `frontend/src/app/page.tsx` and `frontend/src/app/(public)/login/page.tsx`, because both function as public login entry points today. Place the entry near the existing explanatory/footer area so it reads as help, not as the primary auth action. Add one sidebar item labeled `Panduan Risiko` pointing to `/panduan/risiko` in `frontend/src/lib/app-navigation.ts`, with icon mapping that reuses an existing icon already imported in `app-sidebar.tsx` if possible to avoid unnecessary icon churn.
  **Must NOT do**: Do not replace the main login CTA, do not add multiple redundant guide links in the same screen, and do not point the sidebar directly to the public route.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is navigation and entry-point placement work with UX nuance
  - Skills: [`impeccable`] - Reason: link placement and visual weight must remain calm and non-disruptive
  - Omitted: [`frontend-design`] - Reason: the task follows existing UI language rather than inventing a new visual system

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5 | Blocked By: 2, 3

  **References**:
  - Pattern: `frontend/src/app/(public)/login/page.tsx:171-186` - small supporting text zone below the main form where a guide link can sit without competing with login
  - Pattern: `frontend/src/app/page.tsx:159-173` - equivalent supporting zone on the root login surface
  - Pattern: `frontend/src/lib/app-navigation.ts:13-40` - main menu item structure and ordering
  - Pattern: `frontend/src/components/app-sidebar.tsx:63-100` - nav groups derive from `mainMenuItems` and existing icon map

  **Acceptance Criteria** (agent-executable only):
  - [ ] `/login` visibly includes one entry labeled `Panduan Risiko` that links to `/panduan-risiko`
  - [ ] `/` visibly includes one matching entry labeled `Panduan Risiko` that links to `/panduan-risiko`
  - [ ] Authenticated sidebar includes one item labeled `Panduan Risiko` that links to `/panduan/risiko`

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Public login surfaces expose the guide entry
    Tool: Playwright
    Steps: Visit `/login`, confirm a link or button labeled `Panduan Risiko`, click it, then repeat from `/`
    Expected: Both surfaces navigate to `/panduan-risiko` and show the guide H1
    Evidence: .sisyphus/evidence/task-4-login-entry-points.png

  Scenario: Authenticated sidebar route stays in-app
    Tool: Playwright
    Steps: Log in with a QA account, click the sidebar item labeled `Panduan Risiko`
    Expected: Browser navigates to `/panduan/risiko`, sidebar remains visible, and the guide heading loads
    Evidence: .sisyphus/evidence/task-4-sidebar-entry.png
  ```

  **Commit**: YES | Message: `feat(frontend): link risk guide from login and sidebar` | Files: `frontend/src/app/page.tsx`, `frontend/src/app/(public)/login/page.tsx`, `frontend/src/lib/app-navigation.ts`

- [ ] 5. Run bounded verification and responsive polish for the guide experience

  **What to do**: Verify the complete experience with the repo’s existing tools only. Run lint and build from `frontend/`, then execute browser QA covering direct public access, both login entry points, sidebar entry, mobile viewport readability, and content parity between the public and in-app routes. Fix only issues that block the agreed scope: broken navigation, build/lint failures, severe spacing issues, or horizontal overflow.
  **Must NOT do**: Do not introduce fresh features during QA, do not add new sections, and do not broaden the page into a multi-topic documentation hub.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: the work is UI verification and polish against a design brief
  - Skills: [`impeccable`] - Reason: responsive rhythm and copy clarity adjustments may be needed after QA
  - Omitted: [`verification-before-completion`] - Reason: the plan already prescribes exact verification commands and evidence artifacts

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: F1-F4 | Blocked By: 2, 3, 4

  **References**:
  - Test: `frontend/package.json:5-11` - authoritative lint/build/test scripts available in this repo
  - Pattern: `frontend/src/lib/risk-register-query.test.ts` - reminder that current automated test style is logic-level only, not browser-level
  - External: `PRODUCT.md:12-17` - keep copy plain and supportive under operational pressure

  **Acceptance Criteria** (agent-executable only):
  - [ ] `npm run lint` exits with code `0` from `frontend/`
  - [ ] `npm run build` exits with code `0` from `frontend/`
  - [ ] Browser QA evidence exists for direct public access, login-surface access, authenticated sidebar access, and mobile viewport smoke check

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Repository verification passes
    Tool: Bash
    Steps: Run `npm run lint && npm run build` from `frontend/`
    Expected: Both commands exit successfully with no lint or build errors
    Evidence: .sisyphus/evidence/task-5-risk-guide-verification.txt

  Scenario: Mobile viewport remains readable
    Tool: Playwright
    Steps: Open `/panduan-risiko` at 390x844, confirm `Panduan Risiko di MANRIS`, the five step headings, FAQ heading, and `Masuk ke MANRIS` are reachable without horizontal scrolling
    Expected: No horizontal overflow appears, text remains legible, and the CTA is accessible
    Evidence: .sisyphus/evidence/task-5-risk-guide-mobile.png
  ```

  **Commit**: NO | Message: `n/a` | Files: verification only unless bug fixes are required

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit 1: `feat(frontend): add risk guide foundation`
- Commit 2: `feat(frontend): add public and in-app risk guide routes`
- Commit 3: `feat(frontend): link risk guide from login and sidebar`

## Success Criteria
- A first-time visitor can understand the risk process without logging in.
- A logged-in user can open the same guide from the sidebar without leaving app chrome.
- The implementation stays fully within frontend route/navigation concerns.

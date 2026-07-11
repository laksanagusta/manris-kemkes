# Apple Liquid Glass Review Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, evaluate, validate, and globally install a transcript-only Codex skill that reviews web frontend code against Apple's WWDC25 Liquid Glass design-system guidance.

**Architecture:** Stage the skill under `/private/tmp/reviewing-apple-liquid-glass-build`, using a concise `SKILL.md` plus two directly linked reference files. Establish a baseline with a fresh agent before authoring, repeat the same bounded Manris review with the finished skill, then install the validated directory at `~/.codex/skills/reviewing-apple-liquid-glass`.

**Tech Stack:** Markdown Agent Skill, YAML `agents/openai.yaml`, Skill Creator scripts, Codex subagent evaluations, shell validation

---

## File Map

- Create: `/private/tmp/reviewing-apple-liquid-glass-evaluation/baseline.md` — verbatim RED-phase output and failure notes.
- Create: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/SKILL.md` — review workflow and output contract.
- Create: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/references/transcript-principles.md` — timestamped transcript-only rules.
- Create: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/references/review-rubric.md` — finding validity, priority, confidence, false-positive guards, and report template.
- Generate: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/agents/openai.yaml` — UI metadata.
- Create: `/private/tmp/reviewing-apple-liquid-glass-evaluation/forward-test.md` — GREEN-phase output and comparison notes.
- Install: `/Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass/` — final global skill.

## Task 1: Establish the RED Baseline

**Files:**
- Read: `/Users/dikalaksana/Engineering/manris-v2/AGENTS.md`
- Read: `/Users/dikalaksana/Engineering/manris-v2/DESIGN.md`
- Read: `/Users/dikalaksana/Engineering/manris-v2/frontend/src/components/app-header.tsx`
- Read: `/Users/dikalaksana/Engineering/manris-v2/frontend/src/components/app-sidebar.tsx`
- Read: `/Users/dikalaksana/Engineering/manris-v2/frontend/src/components/app-shell.tsx`
- Create: `/private/tmp/reviewing-apple-liquid-glass-evaluation/baseline.md`

- [ ] **Step 1: Create the evaluation directory**

Run:

```bash
mkdir -p /private/tmp/reviewing-apple-liquid-glass-evaluation
```

Expected: directory exists and no files in the repository are modified.

- [ ] **Step 2: Dispatch a fresh agent without the new skill**

Use this exact prompt and do not reveal the planned rubric or desired findings:

```text
Review only these Manris frontend files against the Apple Liquid Glass design system described in the WWDC25 “Get to know the new design system” transcript:
- frontend/src/components/app-header.tsx
- frontend/src/components/app-sidebar.tsx
- frontend/src/components/app-shell.tsx

Read AGENTS.md and DESIGN.md first. Return actionable findings in tables with Before, After, and Why columns plus improvement suggestions. Do not edit files.
```

Expected: a review response based on the agent's unaided behavior.

- [ ] **Step 3: Record the baseline verbatim**

Write `/private/tmp/reviewing-apple-liquid-glass-evaluation/baseline.md` with this exact structure and paste the raw response under `Raw output`:

```markdown
# Baseline Evaluation

## Prompt

Review only these Manris frontend files against the Apple Liquid Glass design system described in the WWDC25 “Get to know the new design system” transcript:
- frontend/src/components/app-header.tsx
- frontend/src/components/app-sidebar.tsx
- frontend/src/components/app-shell.tsx

Read AGENTS.md and DESIGN.md first. Return actionable findings in tables with Before, After, and Why columns plus improvement suggestions. Do not edit files.

## Raw output
```

Append the agent response unchanged after the `## Raw output` heading, then add:

```markdown

## Observed failures

- [yes/no] Used subjective “Apple-like” language without evidence.
- [yes/no] Omitted transcript timestamps.
- [yes/no] Invented numeric blur, opacity, radius, or spacing requirements.
- [yes/no] Ignored AGENTS.md, DESIGN.md, or shared-component ownership.
- [yes/no] Failed to label native-to-web translation.
- [yes/no] Published visually unverified claims as certain findings.
- [yes/no] Produced vague Before, After, or Why cells.
```

Expected: every failure is marked `yes` or `no` with a short supporting excerpt.

- [ ] **Step 4: Verify RED is meaningful**

Run:

```bash
rg -n "\[yes/no\]" /private/tmp/reviewing-apple-liquid-glass-evaluation/baseline.md
```

Expected: no output. If the baseline has no material failures, add a second bounded test using `frontend/src/components/ui/button.tsx` and `frontend/src/components/ui/sidebar.tsx` before authoring the skill.

## Task 2: Initialize the Skill Skeleton

**Files:**
- Create: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/`
- Generate: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/agents/openai.yaml`

- [ ] **Step 1: Run the Skill Creator initializer**

Run:

```bash
/usr/bin/python3 /Users/dikalaksana/.codex/skills/.system/skill-creator/scripts/init_skill.py reviewing-apple-liquid-glass --path /private/tmp/reviewing-apple-liquid-glass-build --resources references --interface 'display_name=Apple Liquid Glass Reviewer' --interface 'short_description=Review web UI against WWDC25 Apple design' --interface 'default_prompt=Use $reviewing-apple-liquid-glass to review this frontend against the supplied WWDC25 Apple design-system transcript.'
```

Expected: initializer reports successful creation of the skill directory, `SKILL.md`, `agents/openai.yaml`, and `references/`.

- [ ] **Step 2: Verify the generated file set**

Run:

```bash
find /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass -maxdepth 2 -type f -print
```

Expected files:

```text
/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/SKILL.md
/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/agents/openai.yaml
```

## Task 3: Author the Transcript-Only Principles Reference

**Files:**
- Create: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/references/transcript-principles.md`

- [ ] **Step 1: Write the source boundary and terminology**

Create the file with these opening sections:

```markdown
# WWDC25 Transcript Principles

## Source boundary

Use only the user-supplied transcript of Apple’s WWDC25 session “Get to know the new design system.” Treat every timestamp below as a source locator. Do not import later HIG revisions, other WWDC talks, or numeric values that the transcript does not state.

## Normative strength

- **Direct:** The transcript explicitly instructs or recommends the behavior.
- **Contextual:** The transcript describes platform-specific behavior that may guide analysis but is not universal.
- **Web translation:** A reasoned mapping to web UI. Always label this mapping in a finding.
```

- [ ] **Step 2: Add Design Language rules**

Add a `## Design Language` section containing all of these timestamped rules and limits:

```markdown
- **2:35–2:49 — Adaptive system colors (Direct):** Preserve hue differentiation and harmony across light, dark, and increased-contrast appearances. Do not infer a mandatory palette.
- **2:52–2:58 — Typography (Direct):** Use stronger weight and left alignment in key clarity moments such as alerts and onboarding. Do not apply bold text indiscriminately.
- **3:03–3:41 — Concentric geometry (Direct):** Align curvature, size, proportion, radii, and margins around a shared center; allow optical offsets when mathematical centering looks wrong.
- **3:42–3:59 — Shape vocabulary (Direct):** Distinguish fixed-radius shapes, capsules, and concentric shapes whose inner radius follows parent radius minus padding.
- **4:04–4:43 — Control density (Direct):** Capsules support touch-friendly or emphasized large controls; compact macOS-style controls retain rounded rectangles. Do not flag every non-capsule control.
- **4:49–5:41 — Nested balance (Direct):** Avoid pinched or flared nested corners; artwork and inner containers should remain concentric with parents.
- **5:44–5:59 — Device-edge balance (Contextual):** Phone actions use capsule treatment with breathing room; iPad and Mac surfaces align concentrically with window edges. Web reviews must label breakpoint mapping as Web translation.
- **6:00–6:14 — Standalone fallback radius (Direct):** Components that work both nested and standalone need adaptive concentric behavior plus a stable fallback radius.
```

- [ ] **Step 3: Add Structure rules**

Add a `## Structure` section covering:

```markdown
- **6:24–6:41 — Functional layer (Direct):** Keep controls available when needed and unobtrusive otherwise; navigation and controls float above content without becoming the content layer.
- **6:42–7:22 — Source relationship (Direct):** Menus, sheets, and custom controls remain spatially connected to their trigger. Apply material to the control surface, not arbitrary inner views.
- **7:25–8:11 — Focus depth (Direct):** Pair interrupting modal tasks with dimming; separate parallel tasks without breaking flow; express deeper engagement through material change rather than unrelated decoration.
- **8:14–9:17 — Navigation hierarchy (Direct):** Remove redundant custom bar backgrounds and borders. Express hierarchy through layout, grouping, and correct component relationships.
- **9:22–10:05 — Bar organization (Direct):** Remove unnecessary items, move secondary actions into overflow, group by function and frequency, do not visually merge text and symbol actions, and isolate/tint primary actions.
- **10:10–10:52 — Persistent versus contextual actions (Direct):** Keep persistent navigation distinct from screen-specific actions. Search may deserve persistent access when content is not visible upfront.
- **11:02–12:30 — Scroll-edge separation (Direct):** Maintain legibility between floating UI and content. Use one consistent edge effect per view and do not add it where no floating UI overlaps content. Web blur/gradient implementation is Web translation.
- **12:34–13:32 — Extended sidebars (Contextual):** Allow expansive visual content to extend behind inset sidebars while keeping text and controls above distortion; preserve alignment across panes.
```

- [ ] **Step 4: Add Continuity rules**

Add a `## Continuity` section covering:

```markdown
- **13:34–14:16 — Continue the task (Direct):** Preserve the user's task, hierarchy, and interaction meaning across device changes and window resizing.
- **14:24–14:51 — Device context (Contextual):** Treat narrow phone, adaptive tablet, and expansive desktop layouts as expressions of one anatomy, not unrelated designs.
- **14:54–15:17 — Persistent grouping and symbols (Direct):** Keep intentionally grouped content together and reuse the same symbols across contexts.
- **15:19–16:14 — Icon clarity (Direct):** Prefer text when a symbol is ambiguous. In related menu groups, use a symbol to introduce the group rather than repeating or slightly changing it for every action.
- **16:17–17:03 — Shared anatomy (Direct):** Preserve component parts and familiar placement even when platform presentation changes.
- **17:03–17:33 — Shared behavior (Direct):** Preserve core selection, navigation, state, and feedback behavior across tab bars, segmented controls, sidebars, and related component forms.
```

- [ ] **Step 5: Check timestamp coverage and prohibited sources**

Run:

```bash
rg -n "HIG|WWDC26|iOS 27|macOS 27|backdrop-filter:[^`]" /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/references/transcript-principles.md
```

Expected: only the source-boundary sentence mentioning later HIG revisions may match; no external rule or invented numeric CSS value appears.

## Task 4: Author the Review Rubric

**Files:**
- Create: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/references/review-rubric.md`

- [ ] **Step 1: Write the finding validity contract**

Create the file with:

```markdown
# Apple Transcript Review Rubric

## Valid finding gate

Publish a finding only when it has all seven items:

1. A real file/line or rendered element.
2. Observable current code or behavior.
3. A materially different target state.
4. A transcript category and timestamp.
5. An impact on hierarchy, legibility, spatial relationship, adaptation, or continuity.
6. A feasible implementation recommendation.
7. High or Medium confidence.

Move Low-confidence candidates to `Needs visual verification` or omit them.
```

- [ ] **Step 2: Add priority, confidence, and evidence definitions**

Add:

```markdown
## Priority

- **P1:** Legibility failure, misleading grouping, broken navigation continuity, or severe responsive failure.
- **P2:** Materially weakened hierarchy, source relationship, adaptive structure, or shared-component consistency.
- **P3:** Localized craft issue with direct transcript support and measurable user benefit.

## Confidence

- **High:** Directly visible in code or rendered output and directly supported by the transcript.
- **Medium:** Strong code evidence, but an interaction, responsive state, or visual result still needs confirmation.
- **Low:** Do not publish as a finding.

## Evidence type

- **Direct code:** Markup, styles, state, or responsive logic proves the issue.
- **Rendered UI:** A screenshot or live state proves the issue.
- **Web translation:** The recommendation maps platform guidance to web behavior; state the mapping explicitly.
```

- [ ] **Step 3: Add false-positive guards**

Add:

```markdown
## Reject these false positives

- “This does not look Apple-like.”
- Invented blur, opacity, radius, or spacing numbers.
- Missing `backdrop-filter` by itself.
- Rounded rectangles on compact desktop controls.
- Icon-only UI before checking whether the symbol is ambiguous.
- A feature-level symptom whose correct owner is a shared component or token.
- A local design-system constraint that remains compatible with the transcript.
- A visual claim inferred only from static class names when rendering could change the result.
```

- [ ] **Step 4: Add the exact output template**

Add:

```markdown
## Output template

Start with one sentence naming the reviewed scope. Sort findings by priority.

### [P1/P2/P3] Finding title

Location: `path/to/file.tsx:line`
Principle: Design Language | Structure | Continuity — `timestamp`
Evidence type: Direct code | Rendered UI | Web translation
Confidence: High | Medium

| Before | After | Why |
|---|---|---|
| Current code or behavior | Recommended target state | Transcript-backed reason plus user impact |

Saran perbaikan:
Give concrete implementation guidance. Name the shared component or design token when it owns the fix.

Finish with:
- **Inspected paths**
- **Needs visual verification** (omit when empty)
- **Remediation order**

Use the user's language. Keep the table headers `Before`, `After`, and `Why` unless the user requests alternatives.
```

## Task 5: Author the Main Skill

**Files:**
- Modify: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/SKILL.md`
- Verify: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/agents/openai.yaml`

- [ ] **Step 1: Replace the generated `SKILL.md`**

Use this content:

```markdown
---
name: reviewing-apple-liquid-glass
description: Use when reviewing React, Next.js, CSS, Tailwind, navigation, responsive layouts, or shared UI components against the Apple design-system principles in the supplied WWDC25 “Get to know the new design system” transcript.
---

# Reviewing Apple Liquid Glass

## Overview

Review web frontend code against the supplied WWDC25 transcript, using evidence rather than aesthetic imitation. Keep direct transcript guidance separate from web translation.

## Required references

Read both files completely before reviewing:

- `references/transcript-principles.md` — the only normative Apple source.
- `references/review-rubric.md` — finding validity and exact output contract.

Do not browse for newer Apple guidance or import rules from another Apple-design skill.

## Workflow

1. Confirm the requested review boundary; do not silently widen it.
2. Read repository instructions, `DESIGN.md`, design-system pages, relevant shared components, and target files.
3. Review Design Language, Structure, and Continuity using the timestamped reference.
4. Trace repeated feature symptoms to their shared component or token owner.
5. Validate each candidate against every item in the rubric's valid-finding gate.
6. Remove subjective, duplicated, unsupported, or visually unverified claims.
7. Report only P1–P3 findings using the exact `Before | After | Why` table and `Saran perbaikan` format.
8. List inspected paths, verification gaps, and remediation order.

## Guardrails

- Never claim web CSS recreates Apple's native Liquid Glass material.
- Label platform-to-web reasoning as `Web translation`.
- Never invent numeric design tokens from the transcript.
- Use `Needs visual verification` when code cannot prove the rendered result.
- Review only unless the user explicitly asks for implementation.
- If no finding passes the rubric, say so and state the reviewed scope.
```

- [ ] **Step 2: Verify generated UI metadata**

Run:

```bash
sed -n '1,80p' /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/agents/openai.yaml
```

Expected:

```yaml
interface:
  display_name: "Apple Liquid Glass Reviewer"
  short_description: "Review web UI against WWDC25 Apple design"
  default_prompt: "Use $reviewing-apple-liquid-glass to review this frontend against the supplied WWDC25 Apple design-system transcript."
```

- [ ] **Step 3: Check concision and links**

Run:

```bash
wc -l -w /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/SKILL.md
rg -n "references/transcript-principles.md|references/review-rubric.md" /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/SKILL.md
```

Expected: under 500 lines; both direct references present.

## Task 6: Validate the Skill Folder

**Files:**
- Validate: `/private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass/`

- [ ] **Step 1: Run the official quick validator**

Run:

```bash
/usr/bin/python3 /Users/dikalaksana/.codex/skills/.system/skill-creator/scripts/quick_validate.py /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass
```

Expected: `Skill is valid!`

- [ ] **Step 2: Run content-integrity checks**

Run:

```bash
rg -n "TBD|TODO|FIXME|implement later|fill in" /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass
```

Expected: no output.

Run:

```bash
rg -n "Before \| After \| Why|Saran perbaikan|Needs visual verification|Web translation" /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass
```

Expected: every required contract term appears in `SKILL.md` or `review-rubric.md`.

## Task 7: Forward-Test the Skill (GREEN)

**Files:**
- Read: staged skill and bounded Manris review files.
- Create: `/private/tmp/reviewing-apple-liquid-glass-evaluation/forward-test.md`

- [ ] **Step 1: Dispatch a fresh agent with the staged skill**

Use this exact prompt:

```text
Use $reviewing-apple-liquid-glass at /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass to review only:
- frontend/src/components/app-header.tsx
- frontend/src/components/app-sidebar.tsx
- frontend/src/components/app-shell.tsx

Read AGENTS.md and DESIGN.md first. Do not edit files.
```

Expected: the agent reads both references and produces only evidence-backed findings.

- [ ] **Step 2: Record and score the forward test**

Create `/private/tmp/reviewing-apple-liquid-glass-evaluation/forward-test.md` with the raw output followed by this checklist:

```markdown
## Acceptance score

- [pass/fail] Every finding has a real location.
- [pass/fail] Every finding has a category and transcript timestamp.
- [pass/fail] Every finding uses Before, After, and Why.
- [pass/fail] Every finding has Saran perbaikan.
- [pass/fail] Web translations are labeled.
- [pass/fail] No invented numeric Apple requirements.
- [pass/fail] No subjective “Apple-like” claims.
- [pass/fail] Visual uncertainty is separated from findings.
- [pass/fail] Shared-component ownership and local design authority are respected.
```

Expected: all items marked `pass` with supporting excerpts.

- [ ] **Step 3: Refactor if any item fails**

For each failed item, add the smallest explicit guardrail to `SKILL.md` or `references/review-rubric.md`, rerun `quick_validate.py`, and repeat the same forward-test prompt. Do not weaken the transcript-only boundary.

- [ ] **Step 4: Compare RED and GREEN**

Run:

```bash
rg -n "yes|fail|pass" /private/tmp/reviewing-apple-liquid-glass-evaluation/baseline.md /private/tmp/reviewing-apple-liquid-glass-evaluation/forward-test.md
```

Expected: baseline failures are visible and every forward-test criterion is `pass`.

## Task 8: Install and Verify the Global Skill

**Files:**
- Install: `/Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass/`

- [ ] **Step 1: Confirm the destination does not already contain an unrelated skill**

Run:

```bash
test ! -e /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass
```

Expected: exit code 0. If it already exists, inspect it and stop for user direction rather than overwriting.

- [ ] **Step 2: Copy the validated skill to the global directory**

Run with required filesystem approval:

```bash
cp -R /private/tmp/reviewing-apple-liquid-glass-build/reviewing-apple-liquid-glass /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass
```

Expected: the destination contains only `SKILL.md`, `agents/openai.yaml`, and the two reference files.

- [ ] **Step 3: Validate the installed copy**

Run:

```bash
/usr/bin/python3 /Users/dikalaksana/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass
```

Expected: `Skill is valid!`

- [ ] **Step 4: Verify global discovery metadata**

Run:

```bash
sed -n '1,12p' /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass/SKILL.md
sed -n '1,20p' /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass/agents/openai.yaml
```

Expected: name is `reviewing-apple-liquid-glass`, description contains the intended trigger, and `default_prompt` explicitly contains `$reviewing-apple-liquid-glass`.

## Task 9: Final Verification and Handoff

**Files:**
- Read: global skill directory and evaluation artifacts.

- [ ] **Step 1: Run final evidence commands**

Run:

```bash
find /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass -maxdepth 2 -type f -print
wc -l /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass/SKILL.md
/usr/bin/python3 /Users/dikalaksana/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/dikalaksana/.codex/skills/reviewing-apple-liquid-glass
```

Expected: four files listed, `SKILL.md` under 500 lines, and `Skill is valid!`.

- [ ] **Step 2: Report completion**

Report:

- global installation path;
- validator result;
- RED baseline failure categories;
- GREEN forward-test score;
- exact example invocation: `Use $reviewing-apple-liquid-glass to review frontend/src/components/app-header.tsx.`

Do not claim completion without the fresh validator output from Step 1.

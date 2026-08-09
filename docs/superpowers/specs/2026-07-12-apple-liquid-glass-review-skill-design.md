# Apple Liquid Glass Review Skill Design

## Goal

Create a global Codex skill named `reviewing-apple-liquid-glass` that reviews web frontend codebases against the Apple design-system principles explicitly stated in the supplied WWDC25 transcript, **Get to know the new design system**.

The skill produces evidence-backed findings with `Before`, `After`, and `Why` columns plus concrete implementation advice. It does not claim equivalence between web CSS effects and Apple's native Liquid Glass material.

## Source Boundary

The supplied WWDC25 transcript is the only normative design source.

- Do not introduce requirements from later Apple HIG revisions, later WWDC sessions, community articles, or the existing `apple-design` skill.
- Treat the transcript timestamps as stable source identifiers.
- Label any translation from Apple-platform guidance to React, Next.js, CSS, or Tailwind as **Web translation**, not as a direct Apple requirement.
- If the transcript does not support a conclusion, omit the finding.

This makes the skill a versioned WWDC25 review rubric rather than a claim about Apple's current design system.

## Intended Scope

Primary targets:

- React and Next.js components
- CSS, CSS modules, Tailwind classes, and design tokens
- Navigation shells, toolbars, tab bars, sidebars, sheets, menus, and overlays
- Responsive behavior across narrow, intermediate, and wide layouts
- Shared component anatomy, icon usage, labels, grouping, hierarchy, and material treatment

The skill reviews code by default. It may use rendered screenshots when available, but must mark visually unverified observations as `Needs visual verification`.

The skill reviews and recommends. It edits code only when the user explicitly requests implementation.

## Skill Structure

```text
reviewing-apple-liquid-glass/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
    ├── transcript-principles.md
    └── review-rubric.md
```

No executable scanner is included. The transcript contains contextual design judgments that cannot be reliably reduced to regex checks without creating misleading false positives.

### `SKILL.md`

Keep the main skill concise. Define the review workflow, evidence requirements, output contract, stopping conditions, and links to both references.

### `references/transcript-principles.md`

Distill the transcript into three normative sections:

1. **Design Language** — colors and contrast appearances, bolder left-aligned typography, fixed/capsule/concentric shapes, nested radii, device-edge treatment, and restrained shape use in dense desktop layouts.
2. **Structure** — functional layer above content, source-anchored surfaces, material applied to controls rather than inner views, modality and dimming, hierarchy through layout/grouping, bar item organization, tab-bar boundaries, scroll-edge effects, and extended sidebars.
3. **Continuity** — shared anatomy across device contexts, persistent content grouping, consistent symbols, text when icon meaning is ambiguous, stable core behavior, and responsive continuity.

Each rule includes its transcript timestamp, normative strength, and explicit limits.

### `references/review-rubric.md`

Define the evidence rubric, priority model, confidence model, review categories, false-positive guards, and exact output schema.

## Review Workflow

1. **Establish scope.** Identify the requested pages, components, or repository boundary. Do not silently expand a targeted review into a repository-wide audit.
2. **Read local design authority.** Read `AGENTS.md`, `DESIGN.md`, design-system pages, shared components, and relevant local instructions before judging feature code.
3. **Load the transcript rubric.** Read both bundled reference files completely.
4. **Collect evidence.** Locate concrete component markup, styles, tokens, responsive variants, and interaction state. Prefer reusable component sources over isolated call sites when the cause is shared.
5. **Evaluate by category.** Review Design Language, Structure, and Continuity. Record compliant patterns as context, but report only actionable mismatches.
6. **Validate every candidate.** Require a specific location, current behavior, desired behavior, transcript principle and timestamp, user impact, confidence, and feasible recommendation.
7. **Remove weak findings.** Drop subjective “not Apple-like” opinions, unsupported native-to-web assumptions, duplicates, and issues already enforced correctly by the local design system.
8. **Report findings.** Sort by priority, then present the required finding table and implementation advice.
9. **State coverage and limits.** List inspected paths and anything that needs rendered-state verification.

## Finding Validity

A finding is valid only when all conditions hold:

- It identifies a real local file or rendered element.
- It describes observable current code or behavior.
- It proposes a materially different target state.
- The reason traces to a transcript timestamp.
- The mismatch affects hierarchy, legibility, spatial relationship, adaptive behavior, or continuity.
- The recommendation is specific enough to implement.

Do not create findings solely because:

- a component does not visually resemble an Apple screenshot;
- a value differs from an invented radius, opacity, blur, or spacing token;
- the code lacks `backdrop-filter`;
- a desktop application uses rounded rectangles for compact controls;
- an icon is used without first checking whether its meaning is unambiguous;
- a local design-system rule intentionally constrains the feature and does not violate the transcript.

## Priority and Confidence

- **P1:** Blocks legibility, causes misleading interaction grouping, breaks navigation continuity, or creates a severe responsive failure.
- **P2:** Materially weakens hierarchy, source relationship, adaptive structure, or component consistency.
- **P3:** Localized craft issue with a clear transcript basis and measurable improvement.

Confidence:

- **High:** Directly visible in code or rendered output and directly supported by the transcript.
- **Medium:** Code strongly suggests the issue, but an interaction or responsive state needs confirmation.
- **Low:** Do not publish as a finding; move it to `Needs visual verification` or omit it.

## Output Contract

Start with a short scope statement. For each finding, use:

```markdown
### [P1/P2/P3] Finding title

Location: `path/to/file.tsx:line`
Principle: Structure — 8:33–9:17
Evidence type: Direct code | Rendered UI | Web translation
Confidence: High | Medium

| Before | After | Why |
|---|---|---|
| Current code or behavior | Recommended target state | Transcript-backed reason and user impact |

Saran perbaikan:
Concrete implementation guidance, including the shared component or token to change when applicable.
```

Finish with:

- inspected paths;
- `Needs visual verification`, if any;
- a concise remediation order.

Use the user's language. Preserve `Before`, `After`, and `Why` as the table headers unless the user requests otherwise.

## Integration With Manris

When reviewing Manris:

- Treat the root `AGENTS.md`, `DESIGN.md`, and the design-system page as local authority.
- Trace repeated feature-page issues back to shared components or tokens.
- Do not recommend one-off feature styling when the correct fix belongs in the design system.
- If implementation is later requested and a direct feature change alters the system, synchronize the design-system page and `DESIGN.md` as required by the repository instructions.

## Evaluation Strategy

Follow RED–GREEN–REFACTOR for skill authoring.

### RED

Give a fresh agent a bounded Manris frontend review request without the new skill. Check whether it:

- produces subjective “Apple-like” feedback;
- omits transcript timestamps;
- invents numeric Liquid Glass values;
- ignores local design authority;
- fails to distinguish direct Apple guidance from web translation;
- produces a table that lacks actionable `Before`, `After`, and `Why` content.

### GREEN

Create the minimal skill and references that address observed baseline failures. Repeat the same review with the skill loaded.

### REFACTOR

Tighten instructions for any new failure, especially unsupported claims, vague locations, duplicate findings, and unverified visual assumptions. Re-run until the output satisfies the validity rubric.

## Acceptance Criteria

- The skill is installed globally at `~/.codex/skills/reviewing-apple-liquid-glass`.
- `quick_validate.py` passes.
- `SKILL.md` remains under 500 lines and links directly to both reference files.
- The reference is transcript-only and contains timestamps for every normative rule.
- A forward-test against a bounded Manris frontend surface produces prioritized, evidence-backed findings.
- Every published finding uses the required `Before`, `After`, and `Why` table plus `Saran perbaikan`.
- The result clearly separates direct transcript guidance, web translation, and visual uncertainty.

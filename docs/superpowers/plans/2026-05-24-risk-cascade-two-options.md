# Risk Cascade Two-Option Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify risk escalation selection to two user-facing options, `Top-down` and `Bottom-up`, while preserving backward compatibility for existing `recommended_top_down` records.

**Architecture:** The frontend will collapse the current 3-label selector into 2 options and map `Top-down` to the existing mandatory top-down create flow. The data model stays backward compatible by keeping the `recommended_top_down` enum value in the type system and mapping it to the `Top-down` label in list/detail views, so existing records remain readable without a migration.

**Tech Stack:** Next.js 16, React 19, TypeScript, Fiber API, Go use cases, PostgreSQL schema already in place.

---

### Task 1: Simplify the frontend create dialog and list labels

**Files:**
- Modify: `frontend/src/components/risk/risk-cascade-action-dialog.tsx`
- Modify: `frontend/src/app/(app)/risk/cascading/page.tsx`

- [ ] **Step 1: Write the label mapping change**

```ts
const cascadeTypeLabels: Record<RiskCascadeType, string> = {
  mandatory_top_down: "Top-down",
  recommended_top_down: "Top-down",
  bottom_up_escalation: "Bottom-up",
};
```

- [ ] **Step 2: Limit the create selector to 2 visible options**

```tsx
const createCascadeOptions = [
  { value: "mandatory_top_down", label: "Top-down" },
  { value: "bottom_up_escalation", label: "Bottom-up" },
] as const;
```

- [ ] **Step 3: Keep bottom-up routing and default state intact**

```ts
const [createCascadeType, setCreateCascadeType] =
  useState<RiskCascadeType>("mandatory_top_down");
```

```ts
if (initialMode === "bottom-up") {
  setCreateCascadeType("bottom_up_escalation");
}
```

- [ ] **Step 4: Run the app-level TypeScript build check**

Run:

```bash
cd frontend
npm run build
```

Expected: build completes without TypeScript errors from the cascade components.

### Task 2: Keep backend compatibility and verify the old enum still renders

**Files:**
- Modify: `frontend/src/types/risk-cascade.ts`
- Modify: `frontend/src/components/risk/risk-cascade-action-dialog.tsx`
- Modify: `frontend/src/app/(app)/risk/cascading/page.tsx`

- [ ] **Step 1: Preserve the enum value so old records still parse**

```ts
export type RiskCascadeType =
  | "mandatory_top_down"
  | "recommended_top_down"
  | "bottom_up_escalation";
```

- [ ] **Step 2: Render `recommended_top_down` as `Top-down` everywhere in the UI**

```ts
const cascadeTypeLabels: Record<RiskCascadeType, string> = {
  mandatory_top_down: "Top-down",
  recommended_top_down: "Top-down",
  bottom_up_escalation: "Bottom-up",
};
```

- [ ] **Step 3: Verify the risk cascade list still groups top-down records correctly**

```ts
const bottomUp = items.filter(
  (item) => item.cascadeType === "bottom_up_escalation",
).length;
```

- [ ] **Step 4: Run targeted frontend tests/build again if any UI type changes were needed**

Run:

```bash
cd frontend
npm run build
```

Expected: pass.

